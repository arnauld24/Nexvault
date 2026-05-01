const rateLimit = require('express-rate-limit');
const config = require('../config/config');

// Login rate limiter
const loginLimiter = rateLimit({
  windowMs: config.LOGIN_RATE_LIMIT_WINDOW_MS,
  max: config.LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.user, // Skip if already authenticated
});

// Register rate limiter
const registerLimiter = rateLimit({
  windowMs: config.REGISTER_RATE_LIMIT_WINDOW_MS,
  max: config.REGISTER_RATE_LIMIT_MAX_ATTEMPTS,
  message: 'Too many registration attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  loginLimiter,
  registerLimiter,
  apiLimiter,
};
