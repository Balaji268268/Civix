const express = require('express');
const router = express.Router();
const { getAdminStats, findDuplicatesForIssue, getAllUsers, getUserDetails, approveUser, getCommunityInsights, getSettings, updateSettings, exportSystemData } = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middlewares/validate');

router.get('/stats', getAdminStats);
router.get('/check-duplicates/:id', findDuplicatesForIssue);
router.get('/users', getAllUsers);
router.get('/users/:id', getUserDetails);
router.patch('/users/:id/approve', approveUser);

router.get('/community-insights', verifyToken, isAdmin, getCommunityInsights);

// Settings & Export
router.get('/settings', getSettings);
router.patch('/settings', updateSettings);
router.get('/export', exportSystemData);

module.exports = router;
