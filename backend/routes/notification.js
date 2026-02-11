const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, clearAll } = require('../controllers/notificationController');
const { verifyToken } = require('../middlewares/validate');

// All routes require authentication
router.use(verifyToken);

router.get('/unread-count', verifyToken, require('../controllers/notificationController').getUnreadCount);
router.get('/', getNotifications);
router.put('/:id/read', markAsRead);
router.delete('/clear-all', clearAll);

module.exports = router;
