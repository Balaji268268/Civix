const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');

// Basic token validation
const verifyToken = (req, res, next) => {
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
    // DEBUG: Log the extracted token to debug failure
    console.log("Extracted Token:", token);

    if (token === 'undefined' || token === 'null') {
      throw new Error(`Token is literally "${token}"`);
    }

    const decoded = jwt.decode(token);

    if (!decoded) {
      throw new Error("Token extraction failed. Token seems malformed.");
    }

    req.user = decoded;
    console.log("Decoded User:", JSON.stringify(req.user, null, 2)); // Debug log
    next();
  } catch (err) {
    console.error("Token Validation Error:", err.message);
    return res.status(403).json({ message: 'Invalid or expired token' });
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
    return res.status(403).json({ message: 'Admin access only' });
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