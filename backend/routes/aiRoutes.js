const express = require('express');
const router = express.Router();
const { suggestResolution } = require('../controllers/aiController');
// const { verifyToken } = require('../middlewares/validate'); // Add auth later

router.post('/suggest-resolution', suggestResolution);

module.exports = router;
