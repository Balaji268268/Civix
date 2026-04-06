const express = require('express');
const router = express.Router();

const issuesRouter = require('../issues');
const mapRouter = require('./map');
const uploadsRouter = require('./uploads');

router.get('/healthz', (req, res) => {
  res.json({ status: 'ok', version: 'v1.0.0', uptime: process.uptime() });
});

router.use('/issues', issuesRouter);
router.use('/map', mapRouter);
router.use('/uploads', uploadsRouter);

module.exports = router;
