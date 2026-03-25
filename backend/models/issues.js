const mongoose = require('mongoose');

const issueSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  phone: String,
  email: String,
  fileUrl: String,
  location: String,
  coordinates: {
    lat: Number,
    lng: Number
  },
  // GeoJSON field for high-performance geospatial 2dsphere queries (only when coordinates exist)
  geo: {
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: {
      type: [Number] // [lng, lat] per GeoJSON standard
    }
  },
  // H3 Spatial Indexing
  h3_9: { type: String, index: true }, // ~165m hexagon (same-place)
  h3_8: { type: String, index: true }, // ~500m hexagon (region)
  clusterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IssueCluster',
    index: true,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  status: {
    type: String,
    enum: ['Received', 'Assigned', 'In Progress', 'Pending Review', 'Resolved', 'Closed', 'Rejected', 'Spam', 'Pending'],
    default: 'Received',
    index: true
  },
  closeReason: {
    type: String,
    enum: [
      'DUPLICATE',
      'FAKE_TEXT',
      'FAKE_IMAGE',
      'MISMATCH',
      'OUT_OF_AREA',
      'UNACTIONABLE',
      'RESOLVED_CONFIRMED',
      'RESOLVED_AUTO',
      'OTHER'
    ],
    default: null
  },
  notifyByEmail: {
    type: Boolean,
    default: false,
  },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low', 'Pending'],
    default: 'Medium',
    index: true
  },
  category: {
    type: String,
    default: 'other',
    index: true
  },
  category_legacy: String,
  isFake: {
    type: Boolean,
    default: false
  },
  fakeConfidence: {
    type: Number,
    default: 0
  },
  needsReview: {
    type: Boolean,
    default: false,
    index: true
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
    matchVerdict: String,
    matchScore: Number,
    geo_mismatch_km: Number,
    analyzedAt: { type: Date },
    jobs: [{
      job: String,
      state: String,
      processedAt: Date,
      durationMs: Number,
      result: mongoose.Schema.Types.Mixed
    }]
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
    default: false,
    index: true
  },
  embedding: {
    type: [Number],
    select: false
  },
  complaintId: {
    type: String,
    unique: true,
    required: true,
    index: true
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
    default: null,
    index: true
  },
  department: {
    type: String,
    default: 'General'
  },
  timeline: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    message: String,
    byUser: String
  }],
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
  feedbacks: [{
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    givenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['user', 'moderator'] },
    sentimentScore: Number,
    sentimentLabel: String,
    createdAt: { type: Date, default: Date.now }
  }],
  sla: {
    breached: { type: Boolean, default: false },
    escalatedAt: Date,
    deadline: Date
  }
});

// --- Pre-save Hook: Sync GeoJSON point and Coordinates ---
issueSchema.pre('save', function (next) {
  if (
    this.coordinates &&
    this.coordinates.lat != null &&
    this.coordinates.lng != null &&
    !isNaN(Number(this.coordinates.lat)) &&
    !isNaN(Number(this.coordinates.lng))
  ) {
    this.geo = {
      type: 'Point',
      coordinates: [Number(this.coordinates.lng), Number(this.coordinates.lat)] // [lng, lat]
    };
  } else {
    this.geo = undefined;
  }
  next();
});

// --- High-Performance Compound & Geospatial Indexes ---
issueSchema.index({ geo: '2dsphere' }, { sparse: true });
issueSchema.index({ "coordinates.lat": 1, "coordinates.lng": 1 });
issueSchema.index({ h3_8: 1, status: 1, createdAt: -1 });
issueSchema.index({ h3_9: 1, category: 1 });
issueSchema.index({ status: 1, createdAt: -1 });
issueSchema.index({ email: 1, createdAt: -1 });
issueSchema.index({ category: 1, createdAt: -1 });

module.exports = mongoose.model('Issue', issueSchema);
