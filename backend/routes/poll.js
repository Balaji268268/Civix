const express = require('express');
const router = express.Router();
const pollController = require('../controllers/pollController');
const { verifyToken } = require('../middlewares/validate');

// Public/Authenticated
router.get('/', verifyToken, pollController.getActivePolls); // Optional auth done in controller via middleware presence

// Authenticated Routes
router.post('/create', verifyToken, pollController.createPoll);
router.post('/:pollId/vote', verifyToken, pollController.votePoll);

module.exports = router;
