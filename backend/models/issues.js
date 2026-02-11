const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  title: String,
  description: String,
  phone: String,
  email: String,
  fileUrl: String,
  location: String,
  coordinates: {
    lat: Number,
    lng: Number
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    default: 'Pending'
  },
  notifyByEmail: {
    type: Boolean,
    default: false, // Default to false if not specified
  },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low', 'Pending'],
    default: 'Pending'
  },
  category: {
    type: String,
    default: 'General'
  },
  isFake: {
    type: Boolean,
    default: false
  },
  fakeConfidence: {
    type: Number,
    default: 0
  },
  duplicateAnalysis: {
    isDuplicate: Boolean,
    similarId: String,
    confidence: Number,
    reasoning: String,
    analyzedAt: { type: Date, default: Date.now }
  },
  aiAnalysis: {
    priority: String,
    isFake: Boolean,
    fakeConfidence: Number,
    category: String,
    reasoning: String,
    analyzedAt: { type: Date }
  },
  isAnalyzed: {
    type: Boolean,
    default: false
  },
  tags: [String],
  issueType: {
    type: String,
    enum: ['Public', 'Personal'],
    default: 'Public'
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  embedding: {
    type: [Number],  // For Vector Search (optional/future proofing)
    select: false    // Don't return by default
  },
  complaintId: {
    type: String,
    unique: true,
    required: true,
  },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  downvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  priorityScore: {
    type: Number,
    default: 0
  },
  assignedOfficer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  department: {
    type: String,
    default: 'General'
  },
  timeline: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    message: String,
    byUser: String // Name or Role
  }],
  // New Resolution Tracking Fields
  resolution: {
    proofUrl: String,
    officerNotes: String,
    submittedAt: Date,
    moderatorApproval: {
      isApproved: { type: Boolean, default: false },
      reviewedBy: String,
      reviewedAt: Date,
      remarks: String
    },
    userAcknowledgement: {
      status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Disputed'],
        default: 'Pending'
      },
      acknowledgedAt: Date,
      remarks: String
    }
  },
  // Post-Resolution Feedback Loop
  feedbacks: [{
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    givenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Citizen or Moderator
    role: { type: String, enum: ['user', 'moderator'] },
    sentimentScore: Number, // AI Analysis (-1 to 1)
    sentimentLabel: String, // 'Positive', 'Neutral', 'Negative'
    createdAt: { type: Date, default: Date.now }
  }],
  feedbackTimeline: {
    lastAnalyzed: Date,
    checks: {
      h24: { type: Boolean, default: false },
      d3: { type: Boolean, default: false },
      d7: { type: Boolean, default: false },
      d30: { type: Boolean, default: false },
      d90: { type: Boolean, default: false }
    }
  }
});

module.exports = mongoose.model('Issue', issueSchema);
