/**
 * Text Scoring Worker
 * Consumes: { issueId, title, description, category }
 * Executes: Category classification, spam detection, priority classification
 */

const axios = require('axios');
const Issue = require('../models/issues');
const User = require('../models/userModel');
const { mlBreaker } = require('../lib/circuitBreaker');
const { invalidate } = require('../lib/cache');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

async function handleTextScoring(payload, context) {
  const { issueId, title, description, category } = payload;
  const start = Date.now();

  const issue = await Issue.findById(issueId);
  if (!issue) return;

  if (mlBreaker.isOpen()) {
    console.warn(`[TextScoringWorker] ML Breaker is OPEN. Skipping scoring for issue ${issueId}`);
    issue.aiAnalysis = issue.aiAnalysis || {};
    issue.aiAnalysis.jobs = issue.aiAnalysis.jobs || [];
    issue.aiAnalysis.jobs.push({
      job: 'text_scoring',
      state: 'breaker_open',
      processedAt: new Date(),
      durationMs: 0
    });
    await issue.save();
    return;
  }

  try {
    const mlPayload = { title, description, category };

    // Parallel calls to FastAPI ML microservice with timeout
    const [catRes, spamRes, prioRes] = await Promise.all([
      axios.post(`${ML_URL}/v1/predict/category`, mlPayload, { timeout: 2500 }),
      axios.post(`${ML_URL}/v1/score/spam-text`, mlPayload, { timeout: 2500 }),
      axios.post(`${ML_URL}/v1/predict/priority`, mlPayload, { timeout: 2500 })
    ]);

    mlBreaker.recordSuccess();

    const catData = catRes.data;
    const spamData = spamRes.data;
    const prioData = prioRes.data;

    // Update Issue Document
    if (issue.category === 'other' || !issue.category || issue.category === 'General') {
      issue.category = catData.category;
    }
    
    issue.priority = prioData.priority;
    issue.isFake = spamData.is_fake;
    issue.fakeConfidence = spamData.confidence;
    issue.needsReview = spamData.needsReview || catData.needsReview;

    // If Auto-Spam policy triggered
    if (spamData.action === 'AUTO_SPAM') {
      issue.status = 'Spam';
      issue.closeReason = spamData.reason_code;
      issue.timeline.push({
        status: 'Spam',
        message: `Auto-flagged as spam: ${spamData.reason}`,
        byUser: 'AI System'
      });
    }

    issue.aiAnalysis = {
      priority: prioData.priority,
      isFake: spamData.is_fake,
      fakeConfidence: spamData.confidence,
      category: catData.category,
      reasoning: spamData.reason,
      analyzedAt: new Date(),
      jobs: (issue.aiAnalysis?.jobs || []).concat([{
        job: 'text_scoring',
        state: 'completed',
        processedAt: new Date(),
        durationMs: Date.now() - start,
        result: {
          category: catData.category,
          p_spam: spamData.p_spam,
          priority: prioData.priority
        }
      }])
    };
    issue.isAnalyzed = true;

    await issue.save();

    // Cache Invalidation
    await invalidate(`issue:${issue._id}`);
    if (issue.h3_8) {
      await invalidate(`map:${issue.h3_8}`);
    }

    console.log(`[TextScoringWorker] Issue ${issue.complaintId} processed in ${Date.now() - start}ms: Cat=${catData.category}, Spam=${spamData.is_fake}, Prio=${prioData.priority}`);
  } catch (err) {
    mlBreaker.recordFailure();
    console.error(`[TextScoringWorker] Failed for issue ${issueId}:`, err.message);
    throw err;
  }
}

module.exports = {
  handleTextScoring
};
