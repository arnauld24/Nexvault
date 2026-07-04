const jwt = require('jsonwebtoken');
const config = require('../config/config');

// Verify JWT token
const verifyToken = (token, secret = config.JWT_SECRET) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    // Return a structured object so caller can detect expiration vs invalid signature
    console.error('[auth] JWT verify failed:', error.name, error.message);
    return { __jwtError: true, name: error.name, message: error.message };
  }
};

// Generate JWT token
const generateToken = (payload, secret = config.JWT_SECRET, expiresIn = config.JWT_EXPIRY) => {
  return jwt.sign(payload, secret, { expiresIn });
};

// Generate refresh token
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, config.REFRESH_TOKEN_SECRET, { 
    expiresIn: config.REFRESH_TOKEN_EXPIRY 
  });
};

// Middleware to verify JWT token in headers
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
  }

  const decoded = verifyToken(token);
  
  if (!decoded || decoded.__jwtError) {
    // Helpful debug for local development: indicate whether header was present and token length
    try {
      const tokenPreview = token && token.length ? `${token.slice(0,6)}...(${token.length} chars)` : 'none';
      console.warn('[auth] Token verification result:', decoded && decoded.__jwtError ? decoded.name : 'no-token', 'Authorization header present:', !!authHeader, 'tokenPreview:', tokenPreview);
    } catch (e) { /* ignore */ }

    // If token expired, return 401 so clients can attempt refresh
    if (decoded && decoded.__jwtError && decoded.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Access token expired' });
    }

    return res.status(403).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }

  req.user = decoded;
  next();
};

const authorizeRole = (role) => (req, res, next) => {
  if (!req.user || req.user.role !== role) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: insufficient permissions',
    });
  }
  next();
};

module.exports = {
  verifyToken,
  generateToken,
  generateRefreshToken,
  authenticateToken,
  authorizeRole,
};
