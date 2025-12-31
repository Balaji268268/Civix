const User = require('../models/userModel');
const asyncHandler = require('express-async-handler');

// @desc    Update user gamification progress
// @route   POST /api/gamification/progress
// @access  Private
const updateProgress = asyncHandler(async (req, res) => {
    const { xpGained, scenarioId, badgeEarned } = req.body;
    const userId = req.auth.userId; // Clerk ID

    const user = await User.findOne({ clerkUserId: userId });

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    if (!user.gamification) {
        user.gamification = { xp: 0, level: 1, badges: [], streak: 0, completedScenarios: [] };
    }

    // Update XP
    user.gamification.xp += xpGained;

    // Level Calculation (Simple: Level = 1 + floor(XP / 100))
    const newLevel = 1 + Math.floor(user.gamification.xp / 100);
    if (newLevel > user.gamification.level) {
        user.gamification.level = newLevel;
        // Could add "Level Up" notification here
    }

    // Add Scenario
    if (scenarioId && !user.gamification.completedScenarios.includes(scenarioId)) {
        user.gamification.completedScenarios.push(scenarioId);
    }

    // Add Badge
    if (badgeEarned && !user.gamification.badges.includes(badgeEarned)) {
        user.gamification.badges.push(badgeEarned);
    }

    user.gamification.lastActivity = new Date();

    await user.save();

    res.status(200).json(user.gamification);
});

// @desc    Get user gamification stats
// @route   GET /api/gamification/stats
// @access  Private
const getStats = asyncHandler(async (req, res) => {
    const userId = req.auth.userId;
    const user = await User.findOne({ clerkUserId: userId });

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    res.status(200).json(user.gamification || { xp: 0, level: 1, badges: [] });
});

module.exports = {
    updateProgress,
    getStats
};
