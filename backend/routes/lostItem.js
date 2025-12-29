const express = require('express');
const router = express.Router();
const { reportLostItem, getLostItems } = require('../controllers/lostItemController');
// const { verifyToken } = require('../middlewares/validate'); // Optional: Uncomment to protect

router.post('/', reportLostItem);
router.get('/', getLostItems);

module.exports = router;
