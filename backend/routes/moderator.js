const express = require('express');
const router = express.Router();
const { analyzeIssue, getCommunityInsights, detectDuplicates } = require('../controllers/moderator.controller');
const { verifyToken, isModerator } = require('../middlewares/validate');

// Protect all moderator routes
router.use(verifyToken, isModerator);

// POST /api/moderator/analyze - Run AI on a specific issue text
router.post('/analyze', analyzeIssue);

// POST /api/moderator/duplicates - Check for duplicates
router.post('/duplicates', detectDuplicates);

// GET /api/moderator/insights - Get global community insights
router.get('/insights', getCommunityInsights);

module.exports = router;
