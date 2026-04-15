/**
 * Image Analysis & Cross-Modal Matching Worker
 * Consumes: { issueId, fileUrl, title, description, category, coordinates }
 * Executes: YOLO object extraction, OpenCV quality analysis, EXIF-GPS verification, Image-Text matching
 */

const axios = require('axios');
const Issue = require('../models/issues');
const User = require('../models/userModel');
const { mlBreaker } = require('../lib/circuitBreaker');
const { invalidate } = require('../lib/cache');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

async function handleImageAnalysis(payload, context) {
  const { issueId, fileUrl, title, description, category, coordinates } = payload;
  const start = Date.now();

  const issue = await Issue.findById(issueId);
  if (!issue || !fileUrl) return;

  if (mlBreaker.isOpen()) {
    console.warn(`[ImageWorker] ML Breaker is OPEN. Skipping image analysis for ${issueId}`);
    return;
  }

  try {
    // 1. Fetch image extraction from ML Service
    const extractRes = await axios.post(`${ML_URL}/v1/extract/objects`, null, {
      params: {
        lat: coordinates?.lat,
        lng: coordinates?.lng,
        category: category
      },
      timeout: 4000
    });

    const cvData = extractRes.data;
    const detectedObjects = cvData.objects || [];

    // 2. Perform Cross-Modal Image-Text Match
    const matchRes = await axios.post(`${ML_URL}/v1/match/image-text`, {
      text: `${title} - ${description}`,
      detected_objects: detectedObjects,
      image_embedding: cvData.embedding,
      category: category
    }, { timeout: 2500 });

    const matchData = matchRes.data;

    // Apply Penalties / Trust Adjustments if Mismatch
    if (matchData.match === 'MISMATCH') {
      const user = await User.findOne({ email: issue.email });
      if (user) {
        user.trustScore = Math.max(0, user.trustScore - 5);
        await user.save();
      }
      issue.needsReview = true;
      issue.timeline.push({
        status: issue.status,
        message: `Image verification flagged: ${matchData.reason}`,
        byUser: 'AI Verification'
      });
    }

    issue.aiAnalysis = issue.aiAnalysis || {};
    issue.aiAnalysis.matchVerdict = matchData.match;
    issue.aiAnalysis.matchScore = matchData.score;
    issue.aiAnalysis.geo_mismatch_km = cvData.geo_mismatch_km;
    issue.aiAnalysis.detectedObjects = detectedObjects;
    issue.aiAnalysis.imageQuality = cvData.quality;
    issue.aiAnalysis.jobs = (issue.aiAnalysis.jobs || []).concat([{
      job: 'image_analysis',
      state: 'completed',
      processedAt: new Date(),
      durationMs: Date.now() - start,
      result: {
        matchVerdict: matchData.match,
        matchScore: matchData.score,
        detectedCount: detectedObjects.length,
        geo_mismatch_km: cvData.geo_mismatch_km
      }
    }]);

    await issue.save();
    await invalidate(`issue:${issue._id}`);

    console.log(`[ImageWorker] Issue ${issue.complaintId} image analysis complete in ${Date.now() - start}ms: Match=${matchData.match} (${matchData.score})`);
  } catch (err) {
    console.error(`[ImageWorker] Error processing image for issue ${issueId}:`, err.message);
  }
}

module.exports = {
  handleImageAnalysis
};
