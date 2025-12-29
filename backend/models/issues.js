const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  title: String,
  description: String,
  phone: String,
  email: String,
  fileUrl: String,
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
  }]
});

module.exports = mongoose.model('Issue', issueSchema);
