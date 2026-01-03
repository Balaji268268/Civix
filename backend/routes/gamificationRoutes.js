const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/validate');
const { updateProgress, getStats, getLeaderboard, getUserStats } = require('../controllers/gamificationController');

// Middleware to bridge verifyToken (req.user) to Clerk-style (req.auth)
const authShim = (req, res, next) => {
    if (req.user) {
        req.auth = {
            userId: req.user.clerkUserId || req.user.id || req.user.sub
        };
    }
    next();
};

// All routes are protected
router.use(verifyToken, authShim);

router.post('/progress', updateProgress);
router.get('/stats', getStats);

// Public Leaderboard
router.get('/leaderboard', getLeaderboard);

// User Specific Stats
router.get('/stats/:userId', getUserStats);

module.exports = router;
