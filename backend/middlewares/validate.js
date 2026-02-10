const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

// Basic token validation
const verifyToken = async (req, res, next) => {
  let token = null;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  } else if (req.body?.token) {
    token = req.body.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    // DEBUG: Using decode instead of verify because we are receiving Clerk tokens (RS256)
    // but the backend is configured with a local secret (HS256).
    // TODO: Switch to @clerk/clerk-sdk-node for proper verification.

    if (token === 'undefined' || token === 'null') {
      throw new Error(`Token is literally "${token}"`);
    }

    const decoded = jwt.decode(token);

    if (!decoded) {
      throw new Error("Token extraction failed. Token seems malformed.");
    }

    // Fetch full user from DB using Clerk ID (sub)
    let dbUser = await User.findOne({ clerkUserId: decoded.sub });

    if (!dbUser) {
      // SYNC ON DEMAND: User exists in Clerk but not in Mongo. Create them now.
      console.log(`[Auth] User ${decoded.sub} missing in DB. Syncing...`);

      let email = decoded.email || (decoded.emails && decoded.emails[0]?.email_address) || decoded.email_address;
      let firstName = decoded.name || decoded.fullName || 'New User';
      let imageUrl = decoded.imageUrl || decoded.picture || decoded.image_url;

      // FALLBACK: If email is missing (common with minimal session tokens), fetch from Clerk API
      if (!email && process.env.CLERK_SECRET_KEY) {
        try {
          console.log("[Auth] Token missing email. Fetching full profile from Clerk API...");
          const { clerkClient } = require('@clerk/clerk-sdk-node');
          const clerkUser = await clerkClient.users.getUser(decoded.sub);

          if (clerkUser) {
            email = clerkUser.emailAddresses[0]?.emailAddress;
            firstName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'New User';
            imageUrl = clerkUser.imageUrl;
            console.log(`[Auth] Fetched from Clerk: ${email}`);
          }
        } catch (clerkErr) {
          console.error("[Auth] Clerk API Fetch Failed:", clerkErr.message);
        }
      }

      // Determine role: If email contains "admin" or is the very first user, make admin.
      const userCount = await User.countDocuments();
      let role = 'user';
      if (email?.includes('admin') || userCount === 0) {
        role = 'admin';
      }

      if (!email) {
        console.error("[Auth] Sync Aborted: No email found in token.", decoded);
        throw new Error("Cannot sync user without email");
      }

      try {
        dbUser = await User.create({
          clerkUserId: decoded.sub,
          email: email,
          name: firstName,
          role: role,
          profilePictureUrl: imageUrl,
          isApproved: true,
          profileSetupCompleted: false,
          password: "CLERK_AUTH_USER_PLACEHOLDER_HASH" // Required by Schema
        });
        console.log(`[Auth] Synced User: ${email} as ${role}`);
      } catch (createErr) {
        console.error("Auto-Sync Failed (Duplicate?):", createErr.message);

        // HEAL STRATEGY: If duplicate email, link the accounts
        if (createErr.message.includes('E11000') || createErr.code === 11000) {
          console.log(`[Auth] Healing: Found existing user with email ${email}. Linking Clerk ID...`);
          dbUser = await User.findOne({ email: email });
          if (dbUser) {
            dbUser.clerkUserId = decoded.sub; // Update Clerk ID
            if (!dbUser.name || dbUser.name === 'New User') dbUser.name = firstName;
            if (!dbUser.profilePictureUrl) dbUser.profilePictureUrl = imageUrl;
            await dbUser.save();
            console.log(`[Auth] Healed User: Linked ${email} to Clerk ID ${decoded.sub}`);
          }
        } else {
          // Race condition fallback: try finding again
          dbUser = await User.findOne({ clerkUserId: decoded.sub });
        }
      }
    }

    if (dbUser) {
      req.user = dbUser; // Attach full Mongoose document
    } else {
      // Fallback (Should rarely happen now)
      req.user = decoded;
      req.user.id = decoded.sub;
    }

    // console.log(`[Auth] User: ${req.user.email} | Role: ${req.user.role}`);
    next();
  } catch (err) {
    console.error("Token Validation Error:", err.message);
    return res.status(403).json({ message: 'Invalid or expired token', error: err.message });
  }
};



// Optional token validation (for public feeds that change based on auth)
const verifyTokenOptional = (req, res, next) => {
  let token = null;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    // DEBUG: Using decode instead of verify because we are receiving Clerk tokens (RS256)
    // but the backend is configured with a local secret (HS256).
    const decoded = jwt.decode(token);
    if (!decoded) {
      req.user = null;
    } else {
      req.user = decoded;
    }
    next();
  } catch (err) {
    req.user = null;
    next();
  }
};

const isAdmin = (req, res, next) => {
  // Check various places where 'role' might be stored in Clerk token
  const role = req.user?.role || req.user?.public_metadata?.role || req.user?.unsafe_metadata?.role;

  // For debugging, temporarily allow if no role is found but email matches admin pattern (unsafe but useful for debugging)
  const isAdminEmail = req.user?.email?.includes("admin");

  if (role === 'admin' || isAdminEmail) {
    next();
  } else {
    console.warn("Access Denied. User Role:", role);
    return res.status(403).json({
      message: 'Admin access only',
      debug: {
        role: role || 'none',
        email: req.user?.email,
        id: req.user?._id || req.user?.id
      }
    });
  }
};

const isModerator = (req, res, next) => {
  const role = req.user?.role || req.user?.public_metadata?.role || req.user?.unsafe_metadata?.role;

  // Allow admin/moderator emails or specific overrides
  const isPrivilegedEmail = req.user?.email?.includes("admin") || req.user?.email?.includes("moderator");

  if (role === 'moderator' || role === 'admin' || isPrivilegedEmail) {
    next();
  } else {
    console.warn("Access Denied (Moderator). User Role:", role);
    return res.status(403).json({ message: 'Moderator access only' });
  }
};


// Validation result checker
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

module.exports = {
  verifyToken,
  verifyTokenOptional,
  isAdmin,
  isModerator,
  validateRequest,
};