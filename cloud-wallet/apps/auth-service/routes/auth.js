const express = require('express');
const AuthService = require('../services/AuthService');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Register route
router.post('/register', registerLimiter, async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🔐 REGISTERING NEW USER`);
  console.log(`[${timestamp}] Request received: email=${req.body.email}`);
  
  try {
    const { email, password, firstName, lastName, phoneNumber, country, city } = req.body;

    console.log(`[${timestamp}] ⏳ Starting registration process...`);
    const result = await AuthService.register({
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      country,
      city,
    });

    console.log(`[${timestamp}] ✓ Registration successful for user: ${result.user?.id}`);
    res.status(201).json(result);
  } catch (error) {
    console.error(`[${timestamp}] ✗ Registration failed: ${error.message}`);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Login route
router.post('/login', loginLimiter, async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🔓 USER LOGIN ATTEMPT`);
  console.log(`[${timestamp}] Request received: email=${req.body.email}`);
  
  try {
    const { email, password, deviceName, deviceType } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    console.log(`[${timestamp}] ⏳ Processing login...`);
    const result = await AuthService.login(
      email,
      password,
      ipAddress,
      userAgent,
      deviceName,
      deviceType
    );

    console.log(`[${timestamp}] ✓ Login successful for user: ${result.user?.id}`);
    res.status(200).json(result);
  } catch (error) {
    console.error(`[${timestamp}] ✗ Login failed: ${error.message}`);
    res.status(401).json({
      success: false,
      message: error.message,
    });
  }
});

// Refresh token route
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    const result = await AuthService.refreshToken(refreshToken);

    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message,
    });
  }
});

// Verify token route
router.post('/verify-token', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phoneNumber: user.phone_number,
        country: user.country,
        city: user.city,
        kycStatus: user.kyc_status,
        accountNumber: user.account_number,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message,
    });
  }
});

// Search users by name or email
router.get('/users/search', authenticateToken, async (req, res) => {
  try {
    const queryText = String(req.query.q || '').trim();
    const users = await User.searchUsers(queryText, req.user.userId);

    res.status(200).json({
      success: true,
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
      })),
    });
  } catch (error) {
    console.error('User search error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Logout route
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.userId;

    const result = await AuthService.logout(sessionId, userId);

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Logout from all devices
router.post('/logout-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await AuthService.logoutAllDevices(userId);

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Verify email route
router.post('/verify-email', async (req, res) => {
  try {
    const { userId, token } = req.body;

    const result = await AuthService.verifyEmail(userId, token);

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Request password reset
router.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;

    const result = await AuthService.requestPasswordReset(email);

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { userId, token, newPassword } = req.body;

    const result = await AuthService.resetPassword(userId, token, newPassword);

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Get active sessions
router.get('/sessions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const sessions = await AuthService.getActiveSessions(userId);

    res.status(200).json({
      success: true,
      sessions,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Revoke specific device session
router.post('/sessions/:sessionId/revoke', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.userId;

    const result = await AuthService.revokeDeviceSession(sessionId, userId);

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Verify token (check if token is valid)
router.post('/verify-token', authenticateToken, async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Token is valid',
      user: req.user,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Get full user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phoneNumber: user.phone_number,
        country: user.country,
        city: user.city,
        avatarUrl: user.avatar_url,
        kycStatus: user.kyc_status,
        accountStatus: user.account_status,
        emailVerified: user.email_verified,
        tier: user.tier,
        preferredCurrency: user.preferred_currency,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { firstName, lastName, phoneNumber, country, city, preferredCurrency } = req.body;

    const updates = {};
    if (firstName !== undefined) updates.first_name = firstName;
    if (lastName !== undefined) updates.last_name = lastName;
    if (phoneNumber !== undefined) updates.phone_number = phoneNumber;
    if (country !== undefined) updates.country = country;
    if (city !== undefined) updates.city = city;
    if (preferredCurrency !== undefined) updates.preferred_currency = preferredCurrency;

    const updatedUser = await User.updateProfile(userId, updates);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        phoneNumber: updatedUser.phone_number,
        country: updatedUser.country,
        city: updatedUser.city,
        preferredCurrency: updatedUser.preferred_currency,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Change password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current and new password are required',
      });
    }

    const result = await AuthService.changePassword(userId, currentPassword, newPassword);

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Update avatar
router.put('/avatar', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { avatarUrl } = req.body;

    if (!avatarUrl) {
      return res.status(400).json({
        success: false,
        message: 'Avatar URL is required',
      });
    }

    const updatedUser = await User.updateProfile(userId, { avatar_url: avatarUrl });

    res.status(200).json({
      success: true,
      message: 'Avatar updated successfully',
      user: {
        id: updatedUser.id,
        avatarUrl: updatedUser.avatar_url,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Enable 2FA
router.post('/2fa/enable', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { method } = req.body; // 'email', 'sms', or 'totp'

    if (!method || !['email', 'sms', 'totp'].includes(method)) {
      return res.status(400).json({
        success: false,
        message: 'Valid 2FA method (email, sms, totp) is required',
      });
    }

    const result = await AuthService.enableTwoFactor(userId, method);

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Disable 2FA
router.post('/2fa/disable', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { verificationCode } = req.body;

    const result = await AuthService.disableTwoFactor(userId, verificationCode);

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Get 2FA status
router.get('/2fa/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    res.status(200).json({
      success: true,
      twoFactorEnabled: user.two_factor_enabled || false,
      twoFactorMethod: user.two_factor_method || null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
  
});

// Verify 2FA code
router.post('/verify-2fa', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required',
      });
    }

    const result = await AuthService.verifyTwoFactorCode(email, code);

    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
