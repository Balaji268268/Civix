const express = require('express');
const router = express.Router();
const { reportLostItem, getLostItems } = require('../controllers/lostItemController');
const { verifyToken } = require('../middlewares/validate');

router.post('/', verifyToken, reportLostItem);
router.get('/', verifyToken, getLostItems);

module.exports = router;
