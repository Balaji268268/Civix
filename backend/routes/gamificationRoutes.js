const express = require('express');
const router = express.Router();
const gamificationController = require('../controllers/gamificationController');

// Public Leaderboard
router.get('/leaderboard', gamificationController.getLeaderboard);

// User Specific Stats
router.get('/stats/:userId', gamificationController.getUserStats);

module.exports = router;
