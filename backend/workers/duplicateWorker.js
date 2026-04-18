/**
 * Duplicate Check & Cluster Worker
 * Consumes: { issueId, title, description, category, coordinates }
 * Executes: Geospatial & Semantic duplicate resolution, IssueCluster assignment
 */

const axios = require('axios');
const Issue = require('../models/issues');
const IssueCluster = require('../models/issueCluster');
const { invalidate } = require('../lib/cache');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

async function handleDuplicateCheck(payload, context) {
  const { issueId, title, description, category, coordinates } = payload;
  const start = Date.now();

  const issue = await Issue.findById(issueId);
  if (!issue) return;

  try {
    // 1. Fetch nearby active issues within the same category / area
    const nearbyIssues = await Issue.find({
      _id: { $ne: issue._id },
      status: { $in: ['Received', 'Assigned', 'In Progress', 'Pending'] }
    })
      .sort({ createdAt: -1 })
      .limit(40)
      .select('title description complaintId coordinates category _id')
      .lean();

    if (nearbyIssues.length === 0) return;

    // 2. Call ML Service duplicate indexer
    const dupRes = await axios.post(`${ML_URL}/v1/find-duplicates`, {
      candidate: {
        id: issue._id,
        complaintId: issue.complaintId,
        title,
        description,
        coordinates,
        category
      },
      existing_issues: nearbyIssues
    }, { timeout: 2500 });

    const dupData = dupRes.data;

    if (dupData.is_duplicate && dupData.top_match) {
      const match = dupData.top_match;
      issue.duplicateAnalysis = {
        isDuplicate: true,
        similarId: match.issue_id,
        confidence: match.score,
        reasoning: match.reasoning,
        analyzedAt: new Date()
      };
      issue.needsReview = true;

      // Find or create IssueCluster
      const existingIssue = await Issue.findById(match.issue_id);
      let cluster;
      if (existingIssue?.clusterId) {
        cluster = await IssueCluster.findById(existingIssue.clusterId);
        if (cluster) {
          cluster.memberIssueIds.addToSet(issue._id);
          cluster.memberCount = cluster.memberIssueIds.length;
          cluster.lastReportedAt = new Date();
          await cluster.save();
        }
      }

      if (!cluster && issue.coordinates?.lat && issue.coordinates?.lng) {
        // Create new cluster
        cluster = await IssueCluster.create({
          h3_9: issue.h3_9 || 'h3_res9_default',
          h3_8: issue.h3_8 || 'h3_res8_default',
          categoryId: issue.category || 'other',
          centroid: {
            lat: issue.coordinates.lat,
            lng: issue.coordinates.lng
          },
          memberIssueIds: [existingIssue ? existingIssue._id : issue._id, issue._id],
          memberCount: 2,
          status: 'open'
        });

        if (existingIssue) {
          existingIssue.clusterId = cluster._id;
          await existingIssue.save();
        }
      }

      if (cluster) {
        issue.clusterId = cluster._id;
      }

      await issue.save();
      await invalidate(`issue:${issue._id}`);
      if (issue.h3_8) await invalidate(`map:${issue.h3_8}`);

      console.log(`[DuplicateWorker] Issue ${issue.complaintId} matched as duplicate of ${match.complaintId} (score=${match.score}) in ${Date.now() - start}ms`);
    }
  } catch (err) {
    console.error(`[DuplicateWorker] Error checking duplicates for issue ${issueId}:`, err.message);
  }
}

module.exports = {
  handleDuplicateCheck
};
