const express = require('express');
const router = express.Router();
const { submitQuery, getQueries } = require('../controllers/contactController');
const { verifyToken, isAdmin } = require('../middlewares/validate');

router.post('/', submitQuery);
router.get('/', verifyToken, isAdmin, getQueries);

module.exports = router;
