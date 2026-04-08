const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const { verifyToken } = require('../../middlewares/validate');

// GET /api/v1/uploads/preset — Generates a signed upload preset for direct client upload
router.get('/preset', verifyToken, (req, res) => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = 'civix_citizen_reports';

    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder
      },
      process.env.CLOUDINARY_API_SECRET || 'dev_secret'
    );

    return res.json({
      timestamp,
      folder,
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY || 'dev_key',
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'dev_cloud'
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to generate upload signature", details: err.message });
  }
});

module.exports = router;
