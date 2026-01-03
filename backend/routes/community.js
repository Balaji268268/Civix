const express = require('express');
const router = express.Router();
const { getAllCommunities, createCommunity, joinCommunity } = require('../controllers/communityController');
const { verifyToken, verifyTokenOptional } = require('../middlewares/validate');

router.get('/', verifyTokenOptional, getAllCommunities);
router.post('/', verifyToken, createCommunity);
router.post('/:id/join', verifyToken, joinCommunity);

module.exports = router;
