const express = require('express');
const router = express.Router();
const { getMapIssues } = require('../../controllers/mapController');

// GET /api/v1/map/issues — Public, High-Performance Viewport Endpoint
router.get('/issues', getMapIssues);

module.exports = router;
