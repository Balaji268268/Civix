const express = require('express');
const router = express.Router();
const { getAdminStats, findDuplicatesForIssue } = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middlewares/validate');

router.get('/stats', verifyToken, isAdmin, getAdminStats);
router.get('/check-duplicates/:id', verifyToken, isAdmin, findDuplicatesForIssue);
const { getAllUsers, getUserDetails } = require('../controllers/adminController');
router.get('/users', verifyToken, isAdmin, getAllUsers);
router.get('/users/:id', verifyToken, isAdmin, getUserDetails);

module.exports = router;
