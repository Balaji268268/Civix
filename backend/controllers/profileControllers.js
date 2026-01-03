const User = require('../models/userModel.js');
const Issue = require('../models/issues.js');
const xss = require('xss');
const { asyncHandler } = require('../utils/asyncHandler.js');
const { uploadOnCloudinary } = require('../utils/cloudinary.js');

// Get user profile by Clerk ID
const getUserByClerkId = asyncHandler(async (req, res) => {
  const { clerkUserId } = req.params;

  const user = await User.findByClerkId(clerkUserId);
  console.log(`[Profile] Fetching for ClerkID: ${clerkUserId}`);

  if (user) {
    console.log(`[Profile] Found User: ${user.email} | Trust: ${user.trustScore}`);
  } else {
    console.log(`[Profile] User NOT FOUND in MongoDB`);
  }

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Fetch stats separately (Case Insensitive)
  const complaintsCount = await Issue.countDocuments({
    email: { $regex: new RegExp(`^${user.email}$`, 'i') }
  });

  // Ensure profile status is up to date
  const computedStatus = user.isProfileComplete();
  if (user.profileSetupCompleted !== computedStatus) {
    user.profileSetupCompleted = computedStatus;
    await user.save();
  }

  res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    location: user.location,
    profilePictureUrl: user.profilePictureUrl || null,
    isProfileComplete: user.profileSetupCompleted,
    trustScore: user.trustScore,
    gamification: user.gamification,
    complaints: complaintsCount
  });
});

// Update user profile
const updateUserProfile = asyncHandler(async (req, res) => {
  const { clerkUserId } = req.params;
  const { name, email, location, profilePictureUrl } = req.body;

  // Validate required fields
  if (!name || !email || !location) {
    return res.status(400).json({
      error: 'Name, email, and location are required'
    });
  }

  // AUTHORIZATION CHECK: Ensure user is updating their own profile
  // req.user is set by verifyToken middleware
  const requesterId = req.user.sub || req.user.id;
  if (requesterId !== clerkUserId) {
    // Allow admins to override? For now, strict ownership.
    // Check if admin
    const isAdmin = req.user.role === 'admin' || req.user.public_metadata?.role === 'admin';
    if (!isAdmin) {
      return res.status(403).json({ error: "Unauthorized: You can only update your own profile." });
    }
  }

  // Sanitize inputs
  const sanitizedName = xss(name);
  const sanitizedEmail = xss(email);
  const sanitizedLocation = xss(location);

  // Check if email is already taken by another user
  const existingUser = await User.findOne({
    email: sanitizedEmail,
    clerkUserId: { $ne: clerkUserId }
  });

  if (existingUser) {
    return res.status(409).json({ error: 'Email already taken by another user' });
  }

  // Find and update user
  const user = await User.findOneAndUpdate(
    { clerkUserId },
    {
      email: sanitizedEmail,
      location: sanitizedLocation,
      ...(req.body.coordinates ? { coordinates: req.body.coordinates } : {}),
      profileSetupCompleted: true, // If we are here, required fields are present (validated above)
      ...(profilePictureUrl ? { profilePictureUrl: xss(profilePictureUrl) } : {})
    },
    { new: true, runValidators: true }
  );

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    location: user.location,
    profilePictureUrl: user.profilePictureUrl || null,
    profilePictureUrl: user.profilePictureUrl || null,
    isProfileComplete: user.profileSetupCompleted,
    message: 'Profile updated successfully'
  });
});

// Create or update user profile (for Clerk integration)
const createOrUpdateUserProfile = asyncHandler(async (req, res) => {
  console.log("--> createOrUpdateUserProfile HIT");
  console.log("Request Body:", req.body);
  const { clerkUserId, email, name, location, profilePictureUrl } = req.body;

  if (!clerkUserId || !email) {
    console.log("Error: Missing clerkUserId or email");
    return res.status(400).json({
      error: 'Clerk user ID and email are required'
    });
  }

  try {
    // 1. Check if email is already taken by a DIFFERENT user (sanity check)
    // We only care if we find a user by email, but they have a DIFFERENT Clerk ID than the one provided (and it's not just null)
    // Actually, simpler: check if email exists.
    const conflictingUser = await User.findOne({ email, clerkUserId: { $ne: clerkUserId } });
    if (conflictingUser) {
      // If the conflicting user has NO clerk ID, we might want to link (handled below). 
      // But if they HAVE a different Clerk ID, it's a conflict.
      if (conflictingUser.clerkUserId) {
        return res.status(409).json({ error: 'Email already currently in use by another account.' });
      }
    }

    // 2. Try to find existing user by Clerk ID
    let user = await User.findByClerkId(clerkUserId);

    if (user) {
      // UPDATE EXISTING USER
      user.email = email;
      if (name) user.name = name;
      if (location) user.location = location;
      if (req.body.coordinates) user.coordinates = req.body.coordinates;
      if (profilePictureUrl) user.profilePictureUrl = profilePictureUrl;
      // Re-evaluate completion
      user.profileSetupCompleted = user.isProfileComplete();
      await user.save();
    } else {
      // Create brand new user
      // Default approval logic
      let isApproved = true;
      const userRole = email.endsWith(process.env.DOMAIN_NAME || '@admin.com') ? 'admin' : 'user';
      if (userRole === 'officer') {
        isApproved = false;
      }

      user = new User({
        clerkUserId,
        email,
        name: name || null,
        location: location || null,
        profilePictureUrl: profilePictureUrl || null,
        password: 'clerk-auth', // Placeholder since Clerk handles auth
        role: userRole,
        isApproved: isApproved, // Officers need approval
        gamification: {
          points: 100, // Welcome bonus
          level: 1,
          badges: []
        },
        coordinates: req.body.coordinates || null
      });
      user.profileSetupCompleted = user.isProfileComplete();
      await user.save();
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      location: user.location,
      profilePictureUrl: user.profilePictureUrl || null,
      isProfileComplete: user.profileSetupCompleted,
      message: user.profileSetupCompleted ? 'Profile complete' : 'Profile incomplete'
    });
  } catch (error) {
    console.error("Profile Save Error:", error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

module.exports = {
  getUserByClerkId,
  updateUserProfile,
  createOrUpdateUserProfile,
  // Upload and set user's profile picture
  uploadProfilePicture: asyncHandler(async (req, res) => {
    const { clerkUserId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const localFilePath = req.file.path;
    const cloudinaryResponse = await uploadOnCloudinary(localFilePath);

    if (!cloudinaryResponse) {
      return res.status(500).json({ error: 'Failed to upload image' });
    }

    const imageUrl = cloudinaryResponse.secure_url;

    const user = await User.findOneAndUpdate(
      { clerkUserId },
      { profilePictureUrl: imageUrl },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ profilePictureUrl: imageUrl });
  })
};
