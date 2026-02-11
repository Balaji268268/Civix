const mongoose = require('mongoose');
const Issue = require('../models/issues');
const User = require('../models/userModel');
const Notification = require('../models/notification');
const sendEmail = require('../utils/sendEmail');
const { asyncHandler } = require('../utils/asyncHandler');
const { uploadOnCloudinary } = require("../utils/cloudinary.js");
const { callGemini, callGeminiVision } = require("../utils/gemini");
const Post = require('../models/post');
const { awardPoints } = require('./gamificationController');
const axios = require('axios');

// Helper: ML Service Config
const ML_URL = process.env.ML_SERVICE_URL || (process.env.NODE_ENV === 'production' ? 'https://civix-ml.onrender.com' : 'http://localhost:8000');
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

// Helper: Smart Assignment Algorithm
const assignIssueToOfficer = async (issue, category) => {
  try {
    // Find officers in this department, sorted by least active tasks
    // Intelligent Auto-Assignment:
    // Only assign if officer has <= 3 active tasks
    // Otherwise, leave unassigned for manual intervention
    const officer = await User.findOne({
      role: 'officer',
      department: category,
      isAvailable: true,
      activeTasks: { $lte: 3 }
    }).sort({ trustScore: -1, activeTasks: 1 }); // BEST OFFICER STRATEGY: High Trust > Low Load

    if (officer) {
      issue.assignedOfficer = officer._id;
      issue.status = 'Assigned';
      issue.timeline.push({
        status: 'Assigned',
        message: `Auto-assigned to Officer ${officer.name} (Load: ${officer.activeTasks})`,
        byUser: 'System'
      });

      // Update Officer Load
      officer.activeTasks += 1;
      await officer.save();

      // ALERT: Notify the Officer
      await Notification.create({
        recipient: officer._id.toString(), // or officer.email if using email-based notifications
        title: "New Task Assigned",
        message: `You have been assigned a new ${issue.priority} priority issue: "${issue.title}".`,
        type: 'info',
        relatedId: issue._id
      });

      console.log(`[Smart Assignment] Issue ${issue.complaintId} assigned to ${officer.name}`);
    } else {
      console.log(`[Smart Assignment] No officer found for department: ${category}`);
    }
  } catch (err) {
    console.error("Assignment Error:", err);
  }
};

const createIssue = asyncHandler(async (req, res) => {
  const { title, description, phone, email, notifyByEmail, issueType, isPrivate, location, category, lat, lng } = req.body;

  console.log("Creating Issue - Request Body:", { title, description, email, phone }); // LOG 1

  // 1. Backend Validation
  if (!title || !description || !email || !phone) {
    return res.status(400).json({ error: "Title, description, email, and phone are required" });
  }

  let fileUrl = null;
  if (req.file) {
    const localFilePath = req.file?.path;
    const cloudinaryResponse = await uploadOnCloudinary(localFilePath);
    if (cloudinaryResponse) fileUrl = cloudinaryResponse.secure_url;
  }

  let warningMessage = null;

  // --- 2. Cross-Modal Validation (Active AI) ---
  if (fileUrl) {
    console.log("Validating Image Alignment...");
    const validationPrompt = `Analyze if this image matches the user's description: "${title} - ${description}". 
    Return a JSON object: { "matches": boolean, "reason": "short explanation" }. 
    If the image is completely unrelated (e.g. a selfie for a pothole complaint) or blurry/black, set matches: false.`;

    try {
      const visionResultRaw = await callGeminiVision(validationPrompt, fileUrl);

      // Parse JSON safely (Gemini can be chatty)
      const jsonMatch = visionResultRaw?.match(/\{.*\}/s);
      if (jsonMatch) {
        const visionData = JSON.parse(jsonMatch[0]);
        if (visionData.matches === false) {
          // Penalty Logic
          const user = await User.findOne({ email }); // Assuming email is linked to user
          if (user) {
            user.trustScore = Math.max(0, user.trustScore - 5);
            await user.save();
          }
          warningMessage = "Our AI suggests the image might not strictly match the description. This helps us prioritize eco-impact!";
        }
      }
    } catch (visionError) {
      console.warn("Vision Validation Failed (Non-blocking):", visionError.message);
    }
  }

  // --- ML Service Integration (Hybrid Engine) ---
  let mlData = {
    priority: 'Pending',
    category: 'General',
    isFake: false,
    fakeConfidence: 0,
    tags: [],
    embedding: []
  };

  try {
    console.log("Calling ML Service...");
    const mlPayload = { title, description };

    // 2. Generate Embedding & Predictions
    // We run parallel requests for maximum speed
    const [pRes, fRes, cRes, eRes] = await Promise.allSettled([
      axios.post(`${ML_URL}/api/predict-priority/`, mlPayload),
      axios.post(`${ML_URL}/api/detect-fake/`, mlPayload),
      axios.post(`${ML_URL}/api/categorize/`, mlPayload),
      axios.post(`${ML_URL}/api/get-embedding/`, { text: title + " " + description })
    ]);

    if (pRes.status === 'fulfilled') mlData.priority = pRes.value.data.priority;
    if (fRes.status === 'fulfilled') {
      mlData.isFake = fRes.value.data.is_fake;
      mlData.fakeConfidence = fRes.value.data.confidence;
    }
    if (cRes.status === 'fulfilled') mlData.category = cRes.value.data.category; // Auto-Categorization
    if (eRes.status === 'fulfilled') mlData.embedding = eRes.value.data.embedding;

  } catch (error) {
    console.error("ML Service Error (Non-Blocking):", error.message);
  }

  // Use ML Category if user didn't specify or if it's 'General'
  const finalCategory = (category === 'General' || !category) ? mlData.category : category;

  // 3. Create Issue
  const issue = new Issue({
    title,
    description,
    phone,
    email,
    fileUrl,
    notifyByEmail,
    issueType,
    isPrivate,
    location,
    coordinates: { lat, lng },
    category: finalCategory,
    // ML Data
    priority: mlData.priority,
    isFake: mlData.isFake,
    fakeConfidence: mlData.fakeConfidence,
    tags: mlData.tags,
    embedding: mlData.embedding,
    complaintId: `CIV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timeline: [{ status: 'Pending', message: 'Issue Reported', byUser: 'User' }]
  });

  // 4. Smart Assignment
  await assignIssueToOfficer(issue, finalCategory);

  await issue.save();
  console.log("Issue Saved with AI Data");

  // === ASYNC IMAGE VALIDATION (Background) ===
  // Validate image spam/relevance in background without blocking user
  if (fileUrl) {
    validateImageAsync(issue._id, fileUrl, finalCategory).catch(err =>
      console.error('[BG Validation] Silent error:', err.message)
    );
  }

  // 3. Pro Duplicate Detection (Using Retrievers)
  if (mlData.isFake === false) {
    try {
      const activeIssues = await Issue.find({ status: { $in: ['Pending', 'In Progress'] } })
        .sort({ createdAt: -1 })
        .limit(100)
        .select('title description complaintId _id');

      const duplicateCheck = await axios.post(`${ML_URL}/api/find-duplicates/`, {
        candidate: { title, description },
        existing_issues: activeIssues
      });

      if (duplicateCheck.data.duplicates && duplicateCheck.data.duplicates.length > 0) {
        const match = duplicateCheck.data.duplicates[0];
        if (match.score > 0.6) {
          warningMessage = warningMessage || `Potential duplicate of ${match.issue_id || match.complaintId}`;
        }
      }
    } catch (mlError) {
      console.error("Duplicate check skipped:", mlError.message);
    }
  }

  // --- NOTIFICATION LOGIC ---
  // trigger for all priorities for now
  try {
    await Notification.create({
      recipient: 'admin',
      title: `${issue.priority || 'New'} Issue Alert`,
      message: `${issue.priority === 'High' ? '🚨' : '📢'} New Issue: "${issue.title}" (${issue.category})`,
      type: issue.priority === 'High' ? 'warning' : 'info',
      relatedId: issue._id
    });
  } catch (notifError) {
    console.warn("Failed to create admin notification for issue:", notifError.message);
  }

  // --- 5. GAMIFICATION & COMMUNITY INTEGRATION ---
  try {
    // A. Award Points to Reporter
    const reporter = await User.findOne({ email });
    if (reporter) {
      await awardPoints(reporter._id, 'REPORT_ISSUE');
      console.log(`[Gamification] Awarded points to ${reporter.email} for reporting`);
    }

    // B. Auto-Create Community Post
    if (!isPrivate) {
      let postAuthor = reporter ? reporter._id : null;

      // If anonymous reporting (no user found), maybe assign to a "System" or "Civix Bot" user?
      // For now, only post if we have a valid user author, otherwise it breaks Post schema.
      if (postAuthor) {
        const newPost = await Post.create({
          content: `🚨 **New Issue Reported**: ${title}\n\n${description}\n\n📍 ${location || 'No location provided'}\n\nHelp verify this by upvoting! #CivicDuty #${finalCategory.replace(/\s+/g, '')}`,
          image: fileUrl || null,
          author: postAuthor,
          type: 'post',
          linkedIssue: issue._id
        });
        console.log(`[Community] Auto-posted issue to feed: ${newPost._id}`);
      }
    }
  } catch (gameError) {
    console.error("Gamification/Post Error (Non-blocking):", gameError.message);
  }

  return res.status(201).json({
    message: 'Issue submitted successfully',
    issue,
    warning: warningMessage,
    aiFeedback: warningMessage ? "We noticed slight inconsistency or duplication. Accepted, but flagged." : "AI Verified ✓"
  });
});

const getAllIssues = asyncHandler(async (req, res) => {
  const issues = await Issue.find().sort({ createdAt: -1 }).lean();
  return res.json(issues);
});

const updateIssueStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newStatus, remarks } = req.body;

  console.log(`[UpdateStatus] Request for ID: ${id}, New Status: ${newStatus}`);

  try {
    const issue = await Issue.findById(id);
    if (!issue) {
      console.warn(`[UpdateStatus] Issue not found: ${id}`);
      return res.status(404).json({ error: 'Issue not found' });
    }

    // Data integrity fix: Ensure complaintId exists
    if (!issue.complaintId) {
      issue.complaintId = `CIV-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
      console.log(`[UpdateStatus] Generated missing complaintId: ${issue.complaintId}`);
    }

    issue.status = newStatus;

    if (newStatus === 'Escalated') {
      issue.priority = 'High';
    }

    issue.timeline.push({
      status: newStatus,
      message: remarks || `Status updated to ${newStatus}`,
      byUser: 'Moderator'
    });

    await issue.save();
    console.log(`[UpdateStatus] Status updated to ${newStatus}`);

    // Update User Trust Score based on status
    if (["Resolved", "In Progress", "Rejected"].includes(newStatus)) {
      if (issue.email) {
        try {
          const user = await User.findOne({ email: issue.email });
          if (user) {
            let scoreChange = 0;
            if (newStatus === "Resolved") scoreChange = 5;
            else if (newStatus === "In Progress") scoreChange = 2;
            else if (newStatus === "Rejected") scoreChange = -5;

            user.trustScore = (user.trustScore || 100) + scoreChange;
            await user.save();
            console.log(`[UpdateStatus] User ${user.email} trust score updated by ${scoreChange}`);
          } else {
            console.log(`[UpdateStatus] No registered user found for email: ${issue.email}`);
          }
        } catch (scoreError) {
          console.error(`[UpdateStatus] Failed to update trust score: ${scoreError.message}`);
          // Non-blocking error
        }
      }
    }

    if (issue.notifyByEmail && issue.email) {
      try {
        await sendEmail(
          issue.email,
          'Civix - Issue Status Update',
          `<p>Your issue <strong>${issue.title}</strong> is now <strong>${newStatus}</strong>.</p>`
        );
        console.log(`[UpdateStatus] Notification email sent to ${issue.email}`);
      } catch (emailError) {
        console.warn("[UpdateStatus] Failed to send status update email:", emailError.message);
      }
    }

    return res.json({ message: 'Status updated successfully.' });
  } catch (error) {
    console.error("[UpdateStatus] CRITICAL ERROR:", error);
    return res.status(500).json({ error: "Internal Server Error during status update", details: error.message });
  }
});

const getIssueById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Optional: Validate MongoDB ObjectId format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid issue ID format' });
  }

  const issue = await Issue.findById(id);

  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }

  return res.json(issue);
});

const deleteIssue = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate MongoDB ObjectId format
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid issue ID format" });
  }

  const issue = await Issue.findByIdAndDelete(id);

  if (!issue) {
    return res.status(404).json({ error: "Issue not found" });
  }

  return res.json({ message: "Issue deleted successfully", issue });
});

const updateIssue = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid issue ID format" });
  }

  const { title, description, phone, email, notifyByEmail, location, category, issueType } = req.body;

  let fileUrl;
  if (req.file) {
    const localFilePath = req.file?.path;
    const cloudinaryResponse = await uploadOnCloudinary(localFilePath);

    if (cloudinaryResponse) {
      fileUrl = cloudinaryResponse.secure_url;
    } else {
      console.warn("Issue update: Cloudinary upload failed. Proceeding without image.");
      // fail gracefully
    }
  }

  const updatedIssue = await Issue.findByIdAndUpdate(
    id,
    {
      ...(title && { title }),
      ...(description && { description }),
      ...(phone && { phone }),
      ...(email && { email }),
      ...(notifyByEmail !== undefined && { notifyByEmail: notifyByEmail === 'true' }),
      ...(fileUrl && { fileUrl })
    },
    { new: true }
  );

  if (!updatedIssue) {
    return res.status(404).json({ error: "Issue not found" });
  }

  // 🔔 Send email if notifyByEmail is true and email exists
  if (updatedIssue.notifyByEmail && updatedIssue.email) {
    try {
      await sendEmail(
        updatedIssue.email,
        "Civix - Issue Updated",
        `<p>Your issue <strong>${updatedIssue.title}</strong> has been updated successfully.</p>
         <p>You can check the latest details in the system.</p>`
      );
    } catch (emailError) {
      console.warn("Failed to send update email:", emailError.message);
    }
  }

  return res.json({ message: "Issue updated successfully", issue: updatedIssue });
});

const getMyIssues = asyncHandler(async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  // Case-insensitive search using regex
  const issues = await Issue.find({
    email: { $regex: new RegExp(`^${email}$`, 'i') }
  }).sort({ createdAt: -1 }).lean();

  res.json(issues);
});

const findDuplicatesForIssue = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const issue = await Issue.findById(id);
  if (!issue) return res.status(404).json({ error: "Issue not found" });

  try {
    // Fetch other active issues to compare against
    const activeIssues = await Issue.find({
      _id: { $ne: id }, // Exclude self
      status: { $in: ['Pending', 'In Progress'] }
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .select('title description complaintId _id priority status');

    const response = await axios.post(`${ML_URL}/api/find-duplicates/`, {
      candidate: { title: issue.title, description: issue.description },
      existing_issues: activeIssues
    });

    res.json({
      matches: response.data.duplicates || [], // ML service returns { duplicates: [...] }
      count: response.data.duplicates?.length || 0
    });

  } catch (error) {
    console.error("Manual Duplicate Check Failed:", error.message);
    res.status(500).json({ error: "Failed to perform duplicate check" });
  }
});

const getAssignedIssues = asyncHandler(async (req, res) => {
  // 1. Get Clerk ID and Email from token
  const clerkId = req.user.sub || req.user.id;
  const tokenEmail = req.user.email; // verifyToken middleware must populate this

  if (!clerkId) {
    return res.status(401).json({ error: "Invalid token: User ID missing" });
  }

  // 2. Find MongoDB User (Smart Lookup)
  // First try by Clerk ID
  let user = await User.findOne({ clerkUserId: clerkId });

  // If not found, try by Email (Self-Healing for manually created officers)
  if (!user && tokenEmail) {
    console.log(`[Officer Dashboard] User not found by ClerkId. Trying email: ${tokenEmail}`);
    user = await User.findOne({ email: tokenEmail });

    // If found by email, LINK the Clerk ID for future logins
    if (user) {
      user.clerkUserId = clerkId;
      await user.save();
      console.log(`[Officer Dashboard] Auto-linked Clerk ID ${clerkId} to user ${user.email}`);
    }
  }

  // Fallback: If still not found, check if frontend sent email query (less secure, but useful for dev)
  if (!user && req.query.email) {
    // additional check: only if token email matches or is admin? 
    // For now, let's stick to secure token email.
  }

  if (!user) {
    console.warn(`[Officer Dashboard] Profile not found for ClerkID: ${clerkId}`);
    return res.status(404).json({ error: "User profile not found. Please contact Admin." });
  }

  const issues = await Issue.find({
    assignedOfficer: user._id,
    status: { $nin: ['Resolved', 'Rejected'] }
  }).sort({ createdAt: -1 }).lean();

  res.json(issues);
});

// AI Officer Suggestions
const suggestOfficer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const issue = await Issue.findById(id);

  if (!issue) return res.status(404).json({ error: "Issue not found" });

  const department = issue.category || 'General';

  // Fetch officers in department
  const officers = await User.find({
    role: 'officer',
    department: department,
    isAvailable: true
  });

  if (officers.length === 0) {
    // Fallback to general officers if specific department empty
    if (department !== 'General') {
      const generalOfficers = await User.find({ role: 'officer', isAvailable: true });
      if (generalOfficers.length === 0) return res.json({ suggestions: [] });

      // Use general officers but mark logic
      const scored = generalOfficers.map(off => {
        const score = Math.max(0, 100 - (off.activeTasks * 10)); // Simple load score
        return {
          _id: off._id,
          name: off.name,
          activeTasks: off.activeTasks,
          score,
          reason: "Cross-department backup"
        };
      }).sort((a, b) => b.score - a.score);
      return res.json({ suggestions: scored });
    }
    return res.json({ suggestions: [] });
  }

  // Scoring Algorithm
  const scoredOfficers = officers.map(officer => {
    // 1. Load Factor: Start at 100, deduct 10 per active task.
    let loadScore = 100 - (officer.activeTasks * 15);

    // 2. Logic: If tasks > 5, heavily penalize
    if (officer.activeTasks > 5) loadScore -= 50;

    // 3. Trust Bonus (Optional, implies reliability)
    const trustBonus = Math.max(0, (officer.trustScore - 100) / 2);

    const totalScore = Math.max(0, Math.ceil(loadScore + trustBonus));

    return {
      _id: officer._id,
      name: officer.name,
      activeTasks: officer.activeTasks,
      score: totalScore,
      isOverloaded: officer.activeTasks >= 5,
      reason: officer.activeTasks === 0 ? "Currently idle" : "Balanced workload"
    };
  });

  // Sort by Score Descending
  scoredOfficers.sort((a, b) => b.score - a.score);

  res.json({ suggestions: scoredOfficers });
});

/* --- Moderator Tools --- */

// Manual override for Moderators
const manualAssignIssue = asyncHandler(async (req, res) => {
  const { issueId, officerId } = req.body;

  const issue = await Issue.findById(issueId);
  const officer = await User.findById(officerId);

  if (!issue || !officer) {
    return res.status(404).json({ error: "Issue or Officer not found" });
  }

  // Update Issue
  issue.assignedOfficer = officer._id;
  issue.status = 'Assigned';
  issue.timeline.push({
    status: 'Assigned',
    message: `Manually assigned to Officer ${officer.name} by Moderator`,
    byUser: 'Moderator'
  });
  await issue.save();

  // Update Officer Load
  officer.activeTasks = (officer.activeTasks || 0) + 1;
  await officer.save();

  // ALERT: Notify the Officer (Fixed: Was missing in manual assignment)
  await Notification.create({
    recipient: officer._id.toString(),
    title: "New Manual Assignment",
    message: `Moderator assigned you: "${issue.title}". Check your dashboard.`,
    type: 'info',
    relatedId: issue._id
  });

  return res.json({ message: "Assignment successful", issue });
});

// Fetch officers filtered by department
const getOfficersByDepartment = asyncHandler(async (req, res) => {
  const { department } = req.query;
  const query = { role: 'officer' };

  if (department && department !== 'General') {
    query.department = department;
  }

  const officers = await User.find(query)
    .select('name email department activeTasks isAvailable')
    .sort({ activeTasks: 1 }); // Least busy first

  res.json(officers);
});

// --- Computer Vision Pre-Check ---
const analyzeIssueImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image file provided" });
  }

  let fileUrl = null;
  // 1. Try Cloudinary Upload
  try {
    const cloudinaryResponse = await uploadOnCloudinary(req.file.path);
    if (cloudinaryResponse) fileUrl = cloudinaryResponse.secure_url;
  } catch (err) {
    console.warn("Cloudinary upload failed for analysis:", err.message);
  }

  // 2. Fallback to Local URL if Cloudinary fails or is not setup
  if (!fileUrl) {
    // Assuming server is running on localhost:5000
    fileUrl = `${BACKEND_URL}/uploads/${req.file.filename}`;
  }

  try {
    // 3. Call ML Service
    const mlResponse = await axios.post(`${ML_URL}/api/analyze-image/`, { imageUrl: fileUrl });

    // 4. Return Tags
    return res.json({
      tags: mlResponse.data.tags || [],
      confidence: mlResponse.data.confidence || 0,
      detected_category: mlResponse.data.tags?.[0] || 'General',
      message: "Image analyzed successfully"
    });

  } catch (error) {
    console.error("ML Analysis Failed:", error.message);
    return res.json({ tags: [], message: "AI Analysis unavailable" });
  }
});

// --- GenAI Captioning (BLIP) ---
const generateCaption = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image file provided" });
  }

  let fileUrl = null;
  try {
    const cloudinaryResponse = await uploadOnCloudinary(req.file.path);
    if (cloudinaryResponse) fileUrl = cloudinaryResponse.secure_url;
  } catch (err) {
    console.warn("Cloudinary upload failed for analysis:", err.message);
  }

  if (!fileUrl) {
    fileUrl = `${BACKEND_URL}/uploads/${req.file.filename}`;
  }

  try {
    const mlResponse = await axios.post(`${ML_URL}/api/generate-caption/`, { imageUrl: fileUrl });
    return res.json({
      description: mlResponse.data.description || "",
      message: "Caption generated successfully"
    });
  } catch (error) {
    console.error("Caption Generation Failed:", error.message);
    return res.json({ description: "", message: "AI Captioning unavailable" });
  }
});

// --- Resolution Verification Flow ---

// 1. Officer Submits Resolution Proof
const submitResolution = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { officerNotes } = req.body;

  // Image upload (optional but recommended)
  let proofUrl = null;
  if (req.file) {
    // Use existing Cloudinary logic or local
    const cldRes = await uploadOnCloudinary(req.file.path);
    if (cldRes) proofUrl = cldRes.secure_url;
  }

  const issue = await Issue.findById(id);
  if (!issue) return res.status(404).json({ message: "Issue not found" });

  // Update issue
  issue.resolution = issue.resolution || {};
  issue.resolution.proofUrl = proofUrl || issue.resolution.proofUrl;
  issue.resolution.officerNotes = officerNotes;
  issue.resolution.submittedAt = new Date();
  issue.status = "Pending Review"; // Moves to Moderator queue

  issue.timeline.push({
    status: "Pending Review",
    message: "Officer submitted resolution proof. Waiting for Moderator approval.",
    byUser: "Officer"
  });

  await issue.save();
  res.status(200).json(issue);
});

// 2. Moderator Reviews Resolution
const reviewResolution = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isApproved, remarks, reviewedBy } = req.body;

  const issue = await Issue.findById(id);
  if (!issue) return res.status(404).json({ message: "Issue not found" });

  issue.resolution = issue.resolution || {};
  issue.resolution.moderatorApproval = {
    isApproved,
    reviewedBy,
    reviewedAt: new Date(),
    remarks
  };

  if (isApproved === true || isApproved === "true") {
    issue.status = "Resolved";
    issue.timeline.push({
      status: "Resolved",
      message: "Moderator approved resolution. Waiting for User acknowledgement.",
      byUser: `Moderator (${reviewedBy})`
    });
    // TODO: Send Notification to User
  } else {
    issue.status = "In Progress"; // Send back to officer
    issue.timeline.push({
      status: "In Progress",
      message: `Moderator rejected resolution: ${remarks}`,
      byUser: `Moderator (${reviewedBy})`
    });
  }

  await issue.save();
  res.status(200).json(issue);
});

// 3. User Acknowledges Resolution
const acknowledgeResolution = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, remarks } = req.body; // status: 'Confirmed' or 'Disputed'

  const issue = await Issue.findById(id);
  if (!issue) return res.status(404).json({ message: "Issue not found" });

  issue.resolution = issue.resolution || {};
  issue.resolution.userAcknowledgement = {
    status,
    acknowledgedAt: new Date(),
    remarks
  };

  if (status === 'Confirmed') {
    issue.status = 'Closed'; // Final state
    issue.timeline.push({
      status: "Closed",
      message: "User confirmed resolution. Case Closed.",
      byUser: "User"
    });

    // --- OFFICER RATING LOGIC ---
    // If feedback is provided immediately with acknowledgement, it can be handled here or via addResolutionFeedback
  } else if (status === 'Disputed') {
    issue.status = 'Dispute'; // Flag for moderator
    issue.timeline.push({
      status: "Dispute",
      message: `User disputed resolution: ${remarks}`,
      byUser: "User"
    });
  }

  await issue.save();
  res.status(200).json(issue);
});

// 4. Time-Based Feedback & Quality Assurance
const { analyzeSentiment } = require('../utils/feedbackBot');

const addResolutionFeedback = asyncHandler(async (req, res) => {
  const { issueId, rating, comment } = req.body;

  if (!issueId || !rating) {
    return res.status(400).json({ error: "Issue ID and Rating are required" });
  }

  const issue = await Issue.findById(issueId);
  if (!issue) return res.status(404).json({ error: "Issue not found" });

  if (issue.status !== 'Resolved' && issue.status !== 'Closed') {
    return res.status(400).json({ error: "Can only add feedback to Resolved/Closed issues." });
  }

  // AI Sentiment Analysis (Real-time)
  let sentimentData = { score: 0, label: 'Neutral' };
  if (comment && comment.length > 5) {
    sentimentData = await analyzeSentiment(comment);
  }

  // Add Feedback
  issue.feedbacks = issue.feedbacks || [];
  issue.feedbacks.push({
    rating: Number(rating),
    comment,
    givenBy: req.user?._id, // Verified User
    role: req.user?.role || 'user',
    sentimentScore: sentimentData.score,
    sentimentLabel: sentimentData.sentimentLabel || sentimentData.label // Handle potential inconsistency
  });

  await issue.save();

  res.json({
    message: "Feedback submitted successfully.",
    aiAnalysis: sentimentData
  });
});

// Upvote Issue
const upvoteIssue = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let user = req.user;
  if (!user._id) {
    user = await User.findOne({ clerkUserId: req.user.id || req.user.sub });
  }
  if (!user) return res.status(404).json({ message: "User not found" });

  const issue = await Issue.findById(id);
  if (!issue) return res.status(404).json({ message: "Issue not found" });

  const upvoteIndex = issue.upvotes.findIndex(uid => uid.toString() === user._id.toString());
  const downvoteIndex = issue.downvotes.findIndex(uid => uid.toString() === user._id.toString());

  if (upvoteIndex !== -1) {
    issue.upvotes.splice(upvoteIndex, 1);
  } else {
    if (downvoteIndex !== -1) {
      issue.downvotes.splice(downvoteIndex, 1);
    }
    issue.upvotes.push(user._id);
  }

  // Recalculate priority score
  const netVotes = issue.upvotes.length - issue.downvotes.length;
  const statusWeight = {
    'Pending': 0,
    'Low': 10,
    'Medium': 30,
    'High': 60
  }[issue.priority] || 0;

  issue.priorityScore = netVotes + statusWeight;

  // Auto-upgrade priority if net votes exceed thresholds
  if (netVotes >= 20 && issue.priority === 'Medium') {
    issue.priority = 'High';
    issue.timeline.push({
      status: issue.status,
      message: `Priority upgraded to High due to community votes (${netVotes} net votes).`,
      byUser: 'System'
    });
  } else if (netVotes >= 10 && issue.priority === 'Low') {
    issue.priority = 'Medium';
    issue.timeline.push({
      status: issue.status,
      message: `Priority upgraded to Medium due to community votes (${netVotes} net votes).`,
      byUser: 'System'
    });
  }

  await issue.save();
  res.json(issue);
});

// Downvote Issue
const downvoteIssue = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let user = req.user;
  if (!user._id) {
    user = await User.findOne({ clerkUserId: req.user.id || req.user.sub });
  }
  if (!user) return res.status(404).json({ message: "User not found" });

  const issue = await Issue.findById(id);
  if (!issue) return res.status(404).json({ message: "Issue not found" });

  const upvoteIndex = issue.upvotes.findIndex(uid => uid.toString() === user._id.toString());
  const downvoteIndex = issue.downvotes.findIndex(uid => uid.toString() === user._id.toString());

  if (downvoteIndex !== -1) {
    issue.downvotes.splice(downvoteIndex, 1);
  } else {
    if (upvoteIndex !== -1) {
      issue.upvotes.splice(upvoteIndex, 1);
    }
    issue.downvotes.push(user._id);
  }

  // Recalculate priority score
  const netVotes = issue.upvotes.length - issue.downvotes.length;
  const statusWeight = {
    'Pending': 0,
    'Low': 10,
    'Medium': 30,
    'High': 60
  }[issue.priority] || 0;

  issue.priorityScore = netVotes + statusWeight;

  await issue.save();
  res.json(issue);
});

module.exports = {
  createIssue,
  getAllIssues,
  updateIssueStatus,
  getIssueById,
  deleteIssue,
  updateIssue,
  getMyIssues,
  findDuplicatesForIssue,
  getAssignedIssues,
  manualAssignIssue,
  getOfficersByDepartment,
  suggestOfficer,
  analyzeIssueImage,
  generateCaption,
  submitResolution,
  reviewResolution,
  acknowledgeResolution,
  addResolutionFeedback,
  upvoteIssue,
  downvoteIssue
};
module.exports = {
  createIssue,
  getAllIssues,
  updateIssueStatus,
  getIssueById,
  deleteIssue,
  updateIssue,
  getMyIssues,
  findDuplicatesForIssue,
  getAssignedIssues,
  manualAssignIssue,
  getOfficersByDepartment,
  suggestOfficer,
  analyzeIssueImage,
  generateCaption,
  submitResolution,
  reviewResolution,
  acknowledgeResolution,
  addResolutionFeedback,
  upvoteIssue,
  downvoteIssue,
  deleteIssue
};

// === ASYNC IMAGE VALIDATION (Background) ===
// This function runs AFTER issue is created to validate images without blocking user
async function validateImageAsync(issueId, imageUrl, category) {
  try {
    const response = await axios.post(
      `${ML_URL}/api/validate-issue-image/`,
      { imageUrl, category: category || 'General' },
      { timeout: 10000 }
    );

    const { is_valid, confidence, reason } = response.data;

    // If spam detected with high confidence
    if (!is_valid && confidence > 0.7) {
      const issue = await Issue.findById(issueId);
      if (!issue) return;

      // Update issue status to Spam
      issue.status = 'Spam';
      issue.timeline.push({
        status: 'Spam',
        message: `Spam detected: ${reason}`,
        byUser: 'System',
        timestamp: new Date()
      });
      await issue.save();

      // Send notification to user
      await Notification.create({
        recipient: issue.reporter.toString(),
        title: 'Issue Flagged as Spam',
        message: `Your reported issue "${issue.title}" was flagged as spam. Reason: ${reason}. If this is a mistake, please contact support.`,
        type: 'warning',
        relatedId: issueId
      });

      console.log(`[SPAM DETECTED] Issue ${issueId} flagged: ${reason}`);
    }

    // If uncertain, flag for moderator review (no notification to user)
    else if (confidence < 0.6) {
      const issue = await Issue.findById(issueId);
      if (!issue) return;

      issue.timeline.push({
        status: 'Flagged',
        message: `Auto-flagged for review: ${reason || 'Low validation confidence'}`,
        byUser: 'System',
        timestamp: new Date()
      });
      await issue.save();

      console.log(`[FLAGGED] Issue ${issueId} flagged for review (confidence: ${confidence})`);
    }

  } catch (error) {
    // Silently log errors - don't break the user flow
    console.error(`[VALIDATION ERROR] Issue ${issueId}:`, error.message);
  }
}
