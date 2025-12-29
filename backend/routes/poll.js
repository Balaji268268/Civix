const express = require('express');
const router = express.Router();
const { getPolls, createPoll, votePoll } = require('../controllers/pollController');
const { verifyToken } = require('../middlewares/validate');

// Public read (users can see polls), but voting/creating requires auth
// For simplicity, requiring auth for all for now as per app design
router.use(verifyToken);

router.get('/', getPolls);
router.post('/', createPoll);
router.post('/:id/vote', votePoll);

module.exports = router;
