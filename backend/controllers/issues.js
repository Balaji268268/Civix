const mongoose = require('mongoose');
const Issue = require('../models/issues');
const User = require('../models/userModel');
const Notification = require('../models/notification');
const sendEmail = require('../utils/sendEmail');
const { asyncHandler } = require('../utils/asyncHandler');
const { uploadOnCloudinary } = require("../utils/cloudinary.js");
const { callGemini, callGeminiVision } = require("../utils/gemini");
const axios = require('axios');

// Helper: Smart Assignment Algorithm
const assignIssueToOfficer = async (issue, category) => {
  try {
    // Find officers in this department, sorted by least active tasks
    const officer = await User.findOne({
      role: 'officer',
      department: category
    }).sort({ activeTasks: 1 });

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
  const { title, description, phone, email, notifyByEmail, issueType, isPrivate, location, category } = req.body;

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
      axios.post('http://localhost:8000/api/predict-priority/', mlPayload),
      axios.post('http://localhost:8000/api/detect-fake/', mlPayload),
      axios.post('http://localhost:8000/api/categorize/', mlPayload),
      axios.post('http://localhost:8000/api/get-embedding/', { text: title + " " + description })
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

  if (fileUrl) {
    try {
      // Analyze tags separately if needed
      // const imgRes = await axios.post('http://localhost:8000/api/analyze-image/', { imageUrl: fileUrl });
      // mlData.tags = imgRes.data.tags; 
    } catch (e) {
      console.warn("ML Image analysis failed:", e.message);
    }
  }

  // 3. Pro Duplicate Detection (Using Retrievers)
  if (mlData.isFake === false) {
    try {
      const activeIssues = await Issue.find({ status: { $in: ['Pending', 'In Progress'] } })
        .sort({ createdAt: -1 })
        .limit(100)
        .select('title description complaintId _id');

      const duplicateCheck = await axios.post('http://localhost:8000/api/find-duplicates/', {
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
  if (['High', 'Medium'].includes(issue.priority)) {
    try {
      await Notification.create({
        recipient: 'admin',
        title: `${issue.priority} Priority Alert`,
        message: `${issue.priority === 'High' ? '🚨' : '⚠️'} New Issue: "${issue.title}" (${issue.category})`,
        type: issue.priority === 'High' ? 'warning' : 'info',
        relatedId: issue._id
      });
    } catch (notifError) {
      // ignore
    }
  }

  return res.status(201).json({
    message: 'Issue submitted successfully',
    issue,
    warning: warningMessage,
    aiFeedback: warningMessage ? "We noticed slight inconsistency or duplication. Accepted, but flagged." : "AI Verified ✓"
  });
});

const getAllIssues = asyncHandler(async (req, res) => {
  const issues = await Issue.find().sort({ createdAt: -1 });
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
  console.log("GetMyIssues Called - Email:", email); // LOG 3
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  // Case-insensitive search using regex
  const issues = await Issue.find({
    email: { $regex: new RegExp(`^${email}$`, 'i') }
  }).sort({ createdAt: -1 });

  console.log(`Found ${issues.length} issues for ${email} (case-insensitive)`);
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

    const response = await axios.post('http://localhost:8000/api/find-duplicates/', {
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
  // 1. Get Clerk ID from token (sub)
  const clerkId = req.user.sub || req.user.id;

  if (!clerkId) {
    return res.status(401).json({ error: "Invalid token: User ID missing" });
  }

  // 2. Find MongoDB User
  const user = await User.findOne({ clerkUserId: clerkId }); // or findByClerkId if available

  if (!user) {
    return res.status(404).json({ error: "User profile not found. Complete profile set up." });
  }

  // 3. Query using MongoDB _id
  const issues = await Issue.find({ assignedOfficer: user._id }).sort({ createdAt: -1 });
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
};
