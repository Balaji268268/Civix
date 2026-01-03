const express = require('express');
const router = express.Router();
<<<<<<< HEAD
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
=======
const { getAdminStats, findDuplicatesForIssue } = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middlewares/validate');

router.get('/stats', verifyToken, isAdmin, getAdminStats);
router.get('/check-duplicates/:id', verifyToken, isAdmin, findDuplicatesForIssue);
const { getAllUsers, getUserDetails } = require('../controllers/adminController');
router.get('/users', verifyToken, isAdmin, getAllUsers);
router.get('/users/:id', verifyToken, isAdmin, getUserDetails);
>>>>>>> 6dfaa0f0271f642bfb702ab31aa972d1c7f0668a

module.exports = router;
