const User = require('../models/userModel');
<<<<<<< HEAD
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
=======

// Points System Configuration
const POINTS_MAP = {
    REPORT_ISSUE: 10,
    VOTE_POLL: 5,
    ISSUE_RESOLVED: 50,
    VERIFIED_REPORT: 20
};

// Badges Configuration
const BADGES_MAP = {
    FIRST_REPORT: { id: 'first_report', name: 'Citizen Journalist', icon: 'medal' },
    VOTER: { id: 'voter', name: 'Voice of City', icon: 'vote' },
    PRO_CITIZEN: { id: 'pro_citizen', name: 'Civix Legend', icon: 'crown' } // > 500 points
};

/**
 * Get Global Leaderboard (Top 10)
 */
const getLeaderboard = async (req, res) => {
    try {
        const leaderboard = await User.find({ 'gamification.points': { $gt: 0 } })
            .sort({ 'gamification.points': -1 })
            .limit(10)
            .select('name profilePictureUrl gamification.points gamification.badges gamification.level');

        res.status(200).json(leaderboard);
    } catch (error) {
        console.error('Leaderboard Fetch Error:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
};

/**
 * Get User Gamification Stats
 */
const getUserStats = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findOne({ clerkUserId: userId })
            .select('gamification');

        if (!user) return res.status(404).json({ error: 'User not found' });

        // Calculate Rank (expensive operation, simplified for now)
        const rank = await User.countDocuments({ 'gamification.points': { $gt: user.gamification.points } }) + 1;

        res.status(200).json({ ...user.gamification, rank });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};

/**
 * Internal Helper: Award Points & Badges
 */
const awardPoints = async (userId, actionType) => {
    try {
        const pointsToAdd = POINTS_MAP[actionType];
        if (!pointsToAdd) return;

        const user = await User.findOne({ _id: userId }) || await User.findOne({ clerkUserId: userId });
        if (!user) return;

        // Add Points
        user.gamification.points += pointsToAdd;

        // Level Up Logic (Simple: 100 points per level)
        const newLevel = Math.floor(user.gamification.points / 100) + 1;
        if (newLevel > user.gamification.level) {
            user.gamification.level = newLevel;
        }

        // Badge Logic (Example)
        if (actionType === 'REPORT_ISSUE' && !user.gamification.badges.find(b => b.id === 'first_report')) {
            user.gamification.badges.push(BADGES_MAP.FIRST_REPORT);
        }
        if (user.gamification.points >= 500 && !user.gamification.badges.find(b => b.id === 'pro_citizen')) {
            user.gamification.badges.push(BADGES_MAP.PRO_CITIZEN);
        }

        await user.save();
        return user.gamification;
    } catch (error) {
        console.error(`Failed to award points for ${userId}:`, error);
    }
};

module.exports = {
    getLeaderboard,
    getUserStats,
    awardPoints // Exported for use in other controllers
>>>>>>> bd191549b4d1acf566f2f903976e623962773d66
};
