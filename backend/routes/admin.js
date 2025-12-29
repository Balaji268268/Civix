const express = require('express');
const router = express.Router();
const { getAdminStats, findDuplicatesForIssue } = require('../controllers/adminController');
// const { verifyToken, isAdmin } = require('../middlewares/validate'); // Uncomment when ready to protect

router.get('/stats', getAdminStats);
router.get('/check-duplicates/:id', findDuplicatesForIssue);
const { getAllUsers, getUserDetails } = require('../controllers/adminController');
router.get('/users', getAllUsers);
router.get('/users/:id', getUserDetails);

module.exports = router;
