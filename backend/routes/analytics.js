const express = require('express');
const router = express.Router();
const { getAdminAnalytics } = require('../controllers/analyticsController');
const { verifyToken, isAdmin } = require('../middlewares/validate');

// Admin only
router.use(verifyToken);
router.use(isAdmin);

router.get('/analytics', getAdminAnalytics);

module.exports = router;
