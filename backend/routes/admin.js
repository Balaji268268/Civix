const express = require('express');
const router = express.Router();
const { getAdminStats, findDuplicatesForIssue, getAllUsers, getUserDetails, approveUser, getCommunityInsights, getSettings, updateSettings, exportSystemData } = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middlewares/validate');

router.get('/stats', verifyToken, isAdmin, getAdminStats);
router.get('/check-duplicates/:id', verifyToken, isAdmin, findDuplicatesForIssue);

router.get('/users', verifyToken, isAdmin, getAllUsers);
router.get('/users/:id', verifyToken, isAdmin, getUserDetails);
router.patch('/users/:id/approve', verifyToken, isAdmin, approveUser);

router.get('/community-insights', verifyToken, isAdmin, getCommunityInsights);

// Settings & Export
router.get('/settings', verifyToken, isAdmin, getSettings);
router.patch('/settings', verifyToken, isAdmin, updateSettings);
router.get('/export', verifyToken, isAdmin, exportSystemData);

module.exports = router;
