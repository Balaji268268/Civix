const mongoose = require('mongoose');

const issueClusterSchema = new mongoose.Schema({
  h3_9: { type: String, required: true, index: true },
  h3_8: { type: String, required: true, index: true },
  categoryId: { type: String, required: true, index: true },
  centroid: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  memberIssueIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Issue'
  }],
  memberCount: { type: Number, default: 1 },
  upvoteCount: { type: Number, default: 0 },
  firstReportedAt: { type: Date, default: Date.now },
  lastReportedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open',
    index: true
  },
  embeddingMean: {
    type: [Number],
    default: []
  }
}, { timestamps: true });

issueClusterSchema.index({ h3_8: 1, categoryId: 1 });
issueClusterSchema.index({ "centroid.lat": 1, "centroid.lng": 1 });

module.exports = mongoose.model('IssueCluster', issueClusterSchema);
