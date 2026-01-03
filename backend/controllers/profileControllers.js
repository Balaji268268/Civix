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

  res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    location: user.location,
    profilePictureUrl: user.profilePictureUrl || null,
    isProfileComplete: user.isProfileComplete(),
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
      name: sanitizedName,
      email: sanitizedEmail,
      location: sanitizedLocation,
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
    isProfileComplete: user.isProfileComplete(),
    message: 'Profile updated successfully'
  });
});

// Create or update user profile (for Clerk integration)
const createOrUpdateUserProfile = asyncHandler(async (req, res) => {
  const { clerkUserId, email, name, location, profilePictureUrl } = req.body;

  if (!clerkUserId || !email) {
    return res.status(400).json({
      error: 'Clerk user ID and email are required'
    });
  }

  // Try to find existing user by Clerk ID
  let user = await User.findByClerkId(clerkUserId);

  if (user) {
    // Update existing user
    user.email = email;
    if (name) user.name = name;
    if (location) user.location = location;
    if (profilePictureUrl) user.profilePictureUrl = profilePictureUrl;
    await user.save();
  } else {
    // Check if user exists by email first (Account Linking)
    const existingUserByEmail = await User.findOne({ email });

    if (existingUserByEmail) {
      // Link Clerk ID to existing user
      user = existingUserByEmail;
      user.clerkUserId = clerkUserId;
      if (name) user.name = name;
      if (location) user.location = location;
      if (profilePictureUrl) user.profilePictureUrl = profilePictureUrl;
      await user.save();
    } else {
      // Create brand new user
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
        }
      });
      await user.save();
    }
  }

  res.json({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    location: user.location,
    profilePictureUrl: user.profilePictureUrl || null,
    isProfileComplete: user.isProfileComplete(),
    message: user.isProfileComplete() ? 'Profile complete' : 'Profile incomplete'
  });
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
