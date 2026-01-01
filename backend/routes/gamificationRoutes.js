const express = require('express');
const router = express.Router();
<<<<<<< HEAD
const { verifyToken } = require('../middlewares/validate');
const { updateProgress, getStats } = require('../controllers/gamificationController');

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
=======
const gamificationController = require('../controllers/gamificationController');

// Public Leaderboard
router.get('/leaderboard', gamificationController.getLeaderboard);

// User Specific Stats
router.get('/stats/:userId', gamificationController.getUserStats);
>>>>>>> bd191549b4d1acf566f2f903976e623962773d66

module.exports = router;
