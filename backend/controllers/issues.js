const mongoose = require('mongoose');
const Issue = require('../models/issues');
const User = require('../models/userModel');
const Notification = require('../models/notification');
const sendEmail = require('../utils/sendEmail');
const { asyncHandler } = require('../utils/asyncHandler');
const { uploadOnCloudinary } = require("../utils/cloudinary.js");
const Post = require('../models/post');
const { awardPoints } = require('./gamificationController');
const queue = require('../lib/queue');
const { getCached, setCached, invalidate, CACHE_TTLS } = require('../lib/cache');

// Helper: Smart Assignment Algorithm (runs in background)
const assignIssueToOfficer = async (issue, category) => {
  try {
    const officer = await User.findOne({
      role: 'officer',
      department: category,
      isAvailable: true,
      activeTasks: { $lte: 3 }
    }).sort({ trustScore: -1, activeTasks: 1 });

    if (officer) {
      issue.assignedOfficer = officer._id;
      issue.status = 'Assigned';
      issue.timeline.push({
        status: 'Assigned',
        message: `Auto-assigned to Officer ${officer.name} (Load: ${officer.activeTasks})`,
        byUser: 'System'
      });

      officer.activeTasks = (officer.activeTasks || 0) + 1;
      await officer.save();

      await Notification.create({
        recipient: officer._id.toString(),
        title: "New Task Assigned",
        message: `You have been assigned a new ${issue.priority} priority issue: "${issue.title}".`,
        type: 'info',
        relatedId: issue._id
      });
    }
  } catch (err) {
    console.error("[Smart Assignment] Error:", err.message);
  }
};

/**
 * Fast, Non-Blocking Save-Then-Enqueue Write Path
 * Target Latency: < 600 ms response time
 */
const createIssue = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    phone,
    email,
    notifyByEmail,
    issueType = 'Public',
    isPrivate = false,
    location,
    category = 'other',
    lat,
    lng,
    fileUrl: directFileUrl,
    website // Honeypot field for spam detection
  } = req.body;

  // 1. Validation
  if (!title || !description || !email || !phone) {
    return res.status(400).json({ error: "Title, description, email, and phone are required" });
  }

  // 2. Honeypot check
  const isHoneypotTriggered = !!website;

  // 3. Handle File (either direct pre-uploaded URL or multipart upload)
  let fileUrl = directFileUrl || null;
  if (!fileUrl && req.file) {
    const localFilePath = req.file?.path;
    const cloudinaryResponse = await uploadOnCloudinary(localFilePath);
    if (cloudinaryResponse) fileUrl = cloudinaryResponse.secure_url;
  }

  // Parse Coordinates
  let coordinates = undefined;
  if (lat != null && lng != null && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
    coordinates = { lat: Number(lat), lng: Number(lng) };
  } else if (location && location.includes(',')) {
    const parts = location.split(',').map(p => parseFloat(p.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      coordinates = { lat: parts[0], lng: parts[1] };
    }
  }

  // 4. Create Issue Object immediately
  const complaintId = `CIV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

  const issue = new Issue({
    title,
    description,
    phone,
    email,
    fileUrl,
    notifyByEmail: notifyByEmail === 'true' || notifyByEmail === true,
    issueType,
    isPrivate: isPrivate === 'true' || isPrivate === true,
    location,
    coordinates,
    category: category || 'other',
    priority: 'Medium',
    status: isHoneypotTriggered ? 'Spam' : 'Received',
    closeReason: isHoneypotTriggered ? 'FAKE_TEXT' : null,
    isFake: isHoneypotTriggered,
    complaintId,
    timeline: [{
      status: isHoneypotTriggered ? 'Spam' : 'Received',
      message: isHoneypotTriggered ? 'Honeypot spam detected' : 'Issue Reported & Queued for AI Verification',
      byUser: 'Citizen'
    }],
    aiAnalysis: {
      jobs: []
    }
  });

  // Save to MongoDB
  await issue.save();

  // 5. Asynchronous Queue Dispatch (Post-Commit, Idempotent)
  if (!isHoneypotTriggered) {
    // A. Enqueue Text ML Scoring (Category, Spam, Priority)
    queue.enqueue('text_scoring', {
      issueId: issue._id,
      title,
      description,
      category: issue.category
    }, { idempotencyKey: `issue:${issue._id}:text_scoring` });

    // B. Enqueue Image Analysis & Cross-Modal Match
    if (fileUrl) {
      queue.enqueue('image_analysis', {
        issueId: issue._id,
        fileUrl,
        title,
        description,
        category: issue.category,
        coordinates
      }, { idempotencyKey: `issue:${issue._id}:image_analysis` });
    }

    // C. Enqueue Geospatial & Semantic Duplicate Screening
    queue.enqueue('duplicate_check', {
      issueId: issue._id,
      title,
      description,
      category: issue.category,
      coordinates
    }, { idempotencyKey: `issue:${issue._id}:duplicate_check` });

    // D. Smart assignment & gamification in background
    setImmediate(async () => {
      await assignIssueToOfficer(issue, issue.category);
      try {
        const reporter = await User.findOne({ email });
        if (reporter) {
          await awardPoints(reporter._id, 'REPORT_ISSUE');
        }
        if (!issue.isPrivate) {
          await Post.create({
            content: `🚨 **New Issue Reported**: ${title}\n\n${description}\n\n📍 ${location || 'Coordinates provided'}\n\nHelp verify this by upvoting! #CivicDuty`,
            image: fileUrl || null,
            author: reporter ? reporter._id : null,
            type: 'post',
            linkedIssue: issue._id
          });
        }
      } catch (err) {
        // Non-blocking
      }
    });
  }

  // 6. Invalidate map and issue caches
  await invalidate(`issue:${issue._id}`);

  // 7. Instant Response (<600ms)
  return res.status(201).json({
    message: 'Issue submitted successfully',
    complaintId: issue.complaintId,
    issueId: issue._id,
    status: issue.status,
    aiStatus: 'queued',
    notice: 'AI verification runs in background — you will be notified of status updates.'
  });
});

/**
 * Keyset-paginated issue feed with projection & read performance
 */
const getAllIssues = asyncHandler(async (req, res) => {
  const { limit = 50, before, status, category } = req.query;
  const parsedLimit = Math.min(parseInt(limit) || 50, 100);

  const query = {};
  if (status && status !== 'All') {
    query.status = status;
  }
  if (category && category !== 'All') {
    query.category = category;
  }
  if (before) {
    query.createdAt = { $lt: new Date(before) };
  }

  const issues = await Issue.find(query)
    .sort({ createdAt: -1 })
    .limit(parsedLimit)
    .select('title description location coordinates status priority category createdAt complaintId fileUrl upvotes downvotes needsReview closeReason')
    .lean();

  const nextCursor = issues.length === parsedLimit ? issues[issues.length - 1].createdAt : null;

  if (req.originalUrl?.includes('/v1/') || req.baseUrl?.includes('/v1')) {
    return res.json({
      issues,
      nextCursor,
      count: issues.length
    });
  }

  // Legacy format for backward compatibility with components expecting array
  return res.json(issues);
});

const getIssueById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid issue ID format' });
  }

  const cacheKey = `issue:${id}`;
  const cached = await getCached(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  const issue = await Issue.findById(id).lean();
  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }

  await setCached(cacheKey, issue, CACHE_TTLS.ISSUE_DETAIL);
  return res.json(issue);
});

const updateIssueStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newStatus, remarks, closeReason } = req.body;

  const issue = await Issue.findById(id);
  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }

  issue.status = newStatus;
  if (closeReason) {
    issue.closeReason = closeReason;
  }

  issue.timeline.push({
    status: newStatus,
    message: remarks || `Status transitioned to ${newStatus}${closeReason ? ` [${closeReason}]` : ''}`,
    byUser: 'Officer / Moderator'
  });

  await issue.save();

  // Invalidate cache
  await invalidate(`issue:${issue._id}`);
  if (issue.h3_8) {
    await invalidate(`map:${issue.h3_8}`);
  }

  if (issue.notifyByEmail && issue.email) {
    sendEmail(
      issue.email,
      `Civix Status Update: ${issue.complaintId}`,
      `<p>Your issue <strong>${issue.title}</strong> is now marked as <strong>${newStatus}</strong>.</p>`
    ).catch(() => {});
  }

  return res.json({ message: 'Status updated successfully', issue });
});

const getMyIssues = asyncHandler(async (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const issues = await Issue.find({
    email: { $regex: new RegExp(`^${email.trim()}$`, 'i') }
  })
    .sort({ createdAt: -1 })
    .select('title description location coordinates status priority category createdAt complaintId fileUrl needsReview closeReason')
    .lean();

  return res.json(issues);
});

const deleteIssue = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid issue ID format" });
  }

  const issue = await Issue.findByIdAndDelete(id);
  if (!issue) return res.status(404).json({ error: "Issue not found" });

  await invalidate(`issue:${id}`);
  return res.json({ message: "Issue deleted successfully" });
});

const submitResolution = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { officerNotes } = req.body;

  let proofUrl = null;
  if (req.file) {
    const cloudinaryResponse = await uploadOnCloudinary(req.file.path);
    if (cloudinaryResponse) proofUrl = cloudinaryResponse.secure_url;
  }

  const issue = await Issue.findById(id);
  if (!issue) return res.status(404).json({ error: "Issue not found" });

  issue.status = 'Pending Review';
  issue.resolution = {
    proofUrl,
    officerNotes,
    submittedAt: new Date(),
    moderatorApproval: { isApproved: false }
  };
  issue.timeline.push({
    status: 'Pending Review',
    message: 'Resolution proof submitted by Officer. Awaiting Moderator review.',
    byUser: 'Officer'
  });

  await issue.save();
  await invalidate(`issue:${id}`);
  return res.json({ message: "Resolution proof submitted", issue });
});

const reviewResolution = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isApproved, remarks } = req.body;

  const issue = await Issue.findById(id);
  if (!issue) return res.status(404).json({ error: "Issue not found" });

  if (isApproved) {
    issue.status = 'Resolved';
    issue.closeReason = 'RESOLVED_CONFIRMED';
    issue.resolution.moderatorApproval = {
      isApproved: true,
      reviewedAt: new Date(),
      remarks
    };
    issue.timeline.push({
      status: 'Resolved',
      message: remarks || 'Resolution approved by Moderator.',
      byUser: 'Moderator'
    });
  } else {
    issue.status = 'In Progress';
    issue.timeline.push({
      status: 'In Progress',
      message: `Resolution rejected by Moderator: ${remarks || 'Needs additional work'}.`,
      byUser: 'Moderator'
    });
  }

  await issue.save();
  await invalidate(`issue:${id}`);
  return res.json({ message: "Resolution reviewed", issue });
});

const acknowledgeResolution = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, remarks } = req.body; // 'Confirmed' or 'Disputed'

  const issue = await Issue.findById(id);
  if (!issue) return res.status(404).json({ error: "Issue not found" });

  if (status === 'Confirmed') {
    issue.status = 'Closed';
    issue.timeline.push({
      status: 'Closed',
      message: 'Citizen confirmed resolution. Issue closed.',
      byUser: 'Citizen'
    });
  } else if (status === 'Disputed') {
    issue.status = 'In Progress';
    issue.needsReview = true;
    issue.timeline.push({
      status: 'In Progress',
      message: `Citizen disputed resolution: ${remarks || 'Problem persists'}`,
      byUser: 'Citizen'
    });
  }

  await issue.save();
  await invalidate(`issue:${id}`);
  return res.json({ message: "Resolution acknowledged", issue });
});

const getAssignedIssues = asyncHandler(async (req, res) => {
  const { officerId } = req.query;
  const filter = officerId ? { assignedOfficer: officerId } : { status: { $in: ['Assigned', 'In Progress'] } };
  const issues = await Issue.find(filter).sort({ priority: -1, createdAt: -1 }).lean();
  return res.json(issues);
});

const upvoteIssue = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id || req.body.userId;

  const issue = await Issue.findById(id);
  if (!issue) return res.status(404).json({ error: "Issue not found" });

  if (userId) {
    if (issue.upvotes.includes(userId)) {
      issue.upvotes.pull(userId);
    } else {
      issue.upvotes.addToSet(userId);
      issue.downvotes.pull(userId);
    }
  } else {
    issue.priorityScore = (issue.priorityScore || 0) + 1;
  }

  await issue.save();
  await invalidate(`issue:${id}`);
  return res.json({ message: "Upvoted", upvotes: issue.upvotes.length });
});

const downvoteIssue = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id || req.body.userId;

  const issue = await Issue.findById(id);
  if (!issue) return res.status(404).json({ error: "Issue not found" });

  if (userId) {
    if (issue.downvotes.includes(userId)) {
      issue.downvotes.pull(userId);
    } else {
      issue.downvotes.addToSet(userId);
      issue.upvotes.pull(userId);
    }
  }

  await issue.save();
  await invalidate(`issue:${id}`);
  return res.json({ message: "Downvoted", downvotes: issue.downvotes.length });
});

const findDuplicatesForIssue = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const issue = await Issue.findById(id).lean();
  if (!issue) return res.status(404).json({ error: "Issue not found" });

  return res.json({
    duplicateAnalysis: issue.duplicateAnalysis,
    clusterId: issue.clusterId
  });
});

const manualAssignIssue = asyncHandler(async (req, res) => {
  const { issueId, officerId } = req.body;
  const issue = await Issue.findById(issueId);
  const officer = await User.findById(officerId);
  if (!issue || !officer) return res.status(404).json({ error: "Issue or Officer not found" });

  issue.assignedOfficer = officer._id;
  issue.status = 'Assigned';
  issue.timeline.push({
    status: 'Assigned',
    message: `Manually assigned to Officer ${officer.name}`,
    byUser: 'Admin / Moderator'
  });

  await issue.save();
  await invalidate(`issue:${issue._id}`);
  return res.json({ message: "Officer assigned", issue });
});

const getOfficersByDepartment = asyncHandler(async (req, res) => {
  const { department } = req.query;
  const filter = { role: 'officer' };
  if (department) filter.department = department;

  const officers = await User.find(filter).select('name email department isAvailable activeTasks trustScore').lean();
  return res.json(officers);
});

const suggestOfficer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const issue = await Issue.findById(id);
  if (!issue) return res.status(404).json({ error: "Issue not found" });

  const officer = await User.findOne({
    role: 'officer',
    department: issue.category,
    isAvailable: true
  }).sort({ activeTasks: 1, trustScore: -1 }).select('name email department activeTasks trustScore').lean();

  return res.json({ suggestedOfficer: officer });
});

const addResolutionFeedback = asyncHandler(async (req, res) => {
  const { issueId, rating, comment } = req.body;
  const issue = await Issue.findById(issueId);
  if (!issue) return res.status(404).json({ error: "Issue not found" });

  issue.feedbacks.push({
    rating,
    comment,
    createdAt: new Date()
  });

  await issue.save();
  return res.json({ message: "Feedback recorded" });
});

const analyzeIssueImage = asyncHandler(async (req, res) => {
  return res.json({ message: "Image analysis endpoint active", status: "ok" });
});

const generateCaption = asyncHandler(async (req, res) => {
  return res.json({ caption: "Civic infrastructure issue photograph" });
});

module.exports = {
  createIssue,
  getAllIssues,
  getIssueById,
  updateIssueStatus,
  deleteIssue,
  getMyIssues,
  submitResolution,
  reviewResolution,
  acknowledgeResolution,
  getAssignedIssues,
  upvoteIssue,
  downvoteIssue,
  findDuplicatesForIssue,
  manualAssignIssue,
  getOfficersByDepartment,
  suggestOfficer,
  addResolutionFeedback,
  analyzeIssueImage,
  generateCaption
};
