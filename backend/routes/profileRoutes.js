const express = require('express');
const router = express.Router();
const {
  getUserByClerkId,
  updateUserProfile,
  createOrUpdateUserProfile,
  uploadProfilePicture,
  updateGuideStatus
} = require('../controllers/profileControllers.js');
const upload = require('../middlewares/upload');
const { verifyToken } = require('../middlewares/validate');

// Get user profile by Clerk ID (Public for now, or protect if needed)
router.get('/:clerkUserId', getUserByClerkId);

// Update user profile
router.put('/:clerkUserId', verifyToken, updateUserProfile);

// Update Guide Seen Status
router.put('/:clerkUserId/guide-seen', verifyToken, updateGuideStatus);

// Create or update user profile (for Clerk integration)
router.post('/create-or-update', verifyToken, createOrUpdateUserProfile);

// Upload optional profile picture
router.post('/:clerkUserId/profile-picture', verifyToken, upload.single('image'), uploadProfilePicture);

module.exports = router;
