const jwt = require('jsonwebtoken');
const config = require('../config/config');

// Verify JWT token
const verifyToken = (token, secret = config.JWT_SECRET) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
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
  
  if (!decoded) {
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }

  req.user = decoded;
  next();
};

module.exports = {
  verifyToken,
  generateToken,
  generateRefreshToken,
  authenticateToken,
};
