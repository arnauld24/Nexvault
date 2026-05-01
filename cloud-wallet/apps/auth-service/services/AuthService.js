const bcrypt = require('bcryptjs');
const { generateToken, generateRefreshToken } = require('../middleware/auth');
const User = require('../models/User');
const Session = require('../models/Session');
const Notification = require('../models/Notification');
const { publishEvent } = require('../config/rabbitmq');
const config = require('../config/config');
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
//const uuid = require('uuid');
// const uuidv4 = uuid.v4;
class AuthService {
  // Register new user
  static async register(userData) {
    const timestamp = new Date().toISOString();
    const { email, password, firstName, lastName, phoneNumber, country, city } = userData;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      throw new Error('Email, password, first name, and last name are required');
    }

    if (password.length < config.PASSWORD_MIN_LENGTH) {
      throw new Error(`Password must be at least ${config.PASSWORD_MIN_LENGTH} characters long`);
    }

    console.log(`[${timestamp}] 🔍 Checking if user already exists in database...`);
    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      console.log(`[${timestamp}] ✗ User already exists: ${email}`);
      throw new Error('Email already registered');
    }
    console.log(`[${timestamp}] ✓ User does not exist, proceeding...`);

    console.log(`[${timestamp}] 🔐 Hashing password...`);
    // Hash password
    const salt = await bcrypt.genSalt(config.BCRYPT_ROUNDS);
    const passwordHash = await bcrypt.hash(password, salt);
    console.log(`[${timestamp}] ✓ Password hashed successfully`);

    console.log(`[${timestamp}] ✍️  Writing new user to database...`);
    // Create user
    const newUser = await User.create({
      email,
      passwordHash,
      firstName,
      lastName,
      phoneNumber,
      country,
      city,
    });
    console.log(`[${timestamp}] ✓ User created in database with ID: ${newUser.id}`);

    console.log(`[${timestamp}] ✍️  Creating welcome notification in database...`);
    // Create welcome notification
    await Notification.create({
      userId: newUser.id,
      type: 'system',
      title: 'Welcome to NexVault!',
      message: 'Thank you for registering. Please verify your email to get started.',
      priority: 'high',
    });
    console.log(`[${timestamp}] ✓ Welcome notification created`);

    console.log(`[${timestamp}] ✍️  Publishing user.registered event to RabbitMQ...`);
    // Publish event to RabbitMQ
    await publishEvent('nexvault.events', 'user.registered', {
      userId: newUser.id,
      email: newUser.email,
      timestamp: new Date(),
    });
    console.log(`[${timestamp}] ✓ Event published successfully`);

    console.log(`[${timestamp}] ✍️  Creating email verification token in database...`);
    // Generate email verification token
    const verificationToken = uuidv4();
    await query(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '24 hours')`,
      [newUser.id, verificationToken]
    );
    console.log(`[${timestamp}] ✓ Verification token created`);

    console.log(`[${timestamp}] ✅ Registration complete for user: ${newUser.id}`);
    return {
      success: true,
      message: 'User registered successfully. Please verify your email.',
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
      },
      verificationToken,
    };
  }

  // Login user
  static async login(email, password, ipAddress, userAgent, deviceName, deviceType) {
    const timestamp = new Date().toISOString();
    
    // Validate input
    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    console.log(`[${timestamp}] 🔍 Reading from database: Finding user by email...`);
    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      console.log(`[${timestamp}] ✗ User not found in database: ${email}`);
      // Log failed attempt
      console.log(`[${timestamp}] ✍️  Writing failed login attempt to database...`);
      await query(
        `INSERT INTO login_attempts (email, ip_address, success) VALUES ($1, $2, FALSE)`,
        [email, ipAddress]
      );
      console.log(`[${timestamp}] ✓ Failed login attempt recorded`);
      throw new Error('Invalid email or password');
    }
    console.log(`[${timestamp}] ✓ User found in database: ${user.id}`);

    console.log(`[${timestamp}] 🔐 Verifying password...`);
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      console.log(`[${timestamp}] ✗ Password verification failed`);
      // Log failed attempt
      console.log(`[${timestamp}] ✍️  Writing failed login attempt to database...`);
      await query(
        `INSERT INTO login_attempts (email, ip_address, success) VALUES ($1, $2, FALSE)`,
        [email, ipAddress]
      );
      console.log(`[${timestamp}] ✓ Failed login attempt recorded`);
      throw new Error('Invalid email or password');
    }
    console.log(`[${timestamp}] ✓ Password verified successfully`);

    console.log(`[${timestamp}] 🔍 Checking account status in database...`);
    // Check if account is active
    if (user.account_status !== 'active') {
      console.log(`[${timestamp}] ✗ Account is not active: ${user.account_status}`);
      throw new Error('Account is not active. Please contact support.');
    }
    console.log(`[${timestamp}] ✓ Account is active`);

    // Check if 2FA is enabled
    if (user.two_factor_enabled) {
      console.log(`[${timestamp}] 🔐 2FA is enabled, generating verification code...`);

      // Generate 6-digit code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Store code in database
      await query(
        `INSERT INTO two_factor_codes (user_id, code, expires_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '10 minutes')`,
        [user.id, verificationCode]
      );

      // Send code via email (for now, we'll just log it - in production this would send email)
      console.log(`[${timestamp}] 📧 2FA Code for ${user.email}: ${verificationCode}`);

      // Publish event for email sending
      await publishEvent('nexvault.notifications', 'email', {
        userId: user.id,
        email: user.email,
        type: '2fa_code',
        verificationCode,
        timestamp: new Date(),
      });

      return {
        success: true,
        message: 'Please check your email for the verification code',
        requiresTwoFactor: true,
        twoFactorMethod: user.two_factor_method,
        email: user.email,
      };
    }

    console.log(`[${timestamp}] ✍️  Writing successful login attempt to database...`);
    // Log successful login
    await query(
      `INSERT INTO login_attempts (email, ip_address, success) VALUES ($1, $2, TRUE)`,
      [email, ipAddress]
    );
    console.log(`[${timestamp}] ✓ Successful login attempt recorded`);

    console.log(`[${timestamp}] 🔐 Generating JWT tokens...`);
    // Generate tokens
    const accessToken = generateToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id });
    console.log(`[${timestamp}] ✓ Tokens generated`);

    console.log(`[${timestamp}] ✍️  Creating session in database...`);
    // Create session
    const session = await Session.create({
      userId: user.id,
      userAgent,
      ipAddress,
      deviceName,
      deviceType,
      refreshToken,
    });
    console.log(`[${timestamp}] ✓ Session created: ${session.id}`);

    console.log(`[${timestamp}] ⏳ Running background tasks...`);
    // Run non-critical side effects in the background so login responds quickly
    void Promise.allSettled([
      User.updateLastLogin(user.id).catch((err) => console.error('Last login update failed:', err)),
      publishEvent('nexvault.events', 'user.login', {
        userId: user.id,
        email: user.email,
        timestamp: new Date(),
        ipAddress,
      }).catch((err) => console.error('Login event publish failed:', err)),
      Notification.create({
        userId: user.id,
        type: 'security',
        title: 'New login detected',
        message: `New login from ${deviceName || 'Unknown device'} at ${new Date().toLocaleString()}`,
        data: { ipAddress, deviceName, deviceType },
        priority: 'normal',
      }).catch((err) => console.error('Login notification creation failed:', err)),
    ]);

    return {
      success: true,
      message: 'Login successful',
      accessToken,
      refreshToken,
      sessionId: session.id,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        kycStatus: user.kyc_status,
        emailVerified: user.email_verified,
        tier: user.tier,
      },
      expiresIn: '24h',
    };
  }

  // Refresh access token
  static async refreshToken(refreshToken) {
    if (!refreshToken) {
      throw new Error('Refresh token is required');
    }

    // Verify refresh token
    const decoded = require('../middleware/auth').verifyToken(
      refreshToken,
      config.REFRESH_TOKEN_SECRET
    );

    if (!decoded) {
      throw new Error('Invalid or expired refresh token');
    }

    // Generate new access token
    const newAccessToken = generateToken({
      userId: decoded.userId,
      email: decoded.email,
    });

    return {
      success: true,
      accessToken: newAccessToken,
      expiresIn: '24h',
    };
  }

  // Logout - revoke session
  static async logout(sessionId, userId) {
    try {
      await Session.revoke(sessionId);

      // Publish logout event
      await publishEvent('nexvault.events', 'user.logout', {
        userId,
        timestamp: new Date(),
      });

      return {
        success: true,
        message: 'Logged out successfully',
      };
    } catch (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  // Logout from all devices
  static async logoutAllDevices(userId) {
    try {
      const revokedCount = await Session.revokeAllSessions(userId);

      // Publish event
      await publishEvent('nexvault.events', 'user.logout.all', {
        userId,
        timestamp: new Date(),
      });

      // Create notification
      await Notification.create({
        userId,
        type: 'security',
        title: 'Logged out from all devices',
        message: 'You have been logged out from all devices for security purposes.',
        priority: 'high',
      });

      return {
        success: true,
        message: `Logged out from ${revokedCount} device(s)`,
      };
    } catch (error) {
      throw new Error(`Logout from all devices failed: ${error.message}`);
    }
  }

  // Verify email
  static async verifyEmail(userId, token) {
    try {
      // Check token validity
      const result = await query(
        `SELECT id FROM email_verification_tokens 
         WHERE user_id = $1 AND token = $2 AND expires_at > CURRENT_TIMESTAMP AND used_at IS NULL`,
        [userId, token]
      );

      if (result.rows.length === 0) {
        throw new Error('Invalid or expired verification token');
      }

      // Mark token as used
      await query(
        `UPDATE email_verification_tokens SET used_at = CURRENT_TIMESTAMP WHERE token = $1`,
        [token]
      );

      // Verify user email
      const user = await User.verifyEmail(userId);

      // Create notification
      await Notification.create({
        userId,
        type: 'system',
        title: 'Email verified',
        message: 'Your email has been successfully verified!',
        priority: 'normal',
      });

      return {
        success: true,
        message: 'Email verified successfully',
      };
    } catch (error) {
      throw new Error(`Email verification failed: ${error.message}`);
    }
  }

  // Request password reset
  static async requestPasswordReset(email) {
    try {
      const user = await User.findByEmail(email);

      if (!user) {
        // Don't reveal if email exists (security best practice)
        return {
          success: true,
          message: 'If the email exists, a password reset link has been sent',
        };
      }

      const resetToken = uuidv4();

      // Create reset token
      await query(
        `INSERT INTO password_reset_tokens (user_id, token, expires_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '1 hour')`,
        [user.id, resetToken]
      );

      // Publish event - notification service will handle email
      await publishEvent('nexvault.notifications', 'email', {
        userId: user.id,
        email: user.email,
        type: 'password_reset',
        resetToken,
        timestamp: new Date(),
      });

      return {
        success: true,
        message: 'If the email exists, a password reset link has been sent',
      };
    } catch (error) {
      throw new Error(`Password reset request failed: ${error.message}`);
    }
  }

  // Reset password
  static async resetPassword(userId, token, newPassword) {
    try {
      if (newPassword.length < config.PASSWORD_MIN_LENGTH) {
        throw new Error(`Password must be at least ${config.PASSWORD_MIN_LENGTH} characters long`);
      }

      // Verify token
      const result = await query(
        `SELECT id FROM password_reset_tokens 
         WHERE user_id = $1 AND token = $2 AND expires_at > CURRENT_TIMESTAMP AND used_at IS NULL`,
        [userId, token]
      );

      if (result.rows.length === 0) {
        throw new Error('Invalid or expired password reset token');
      }

      // Hash new password
      const salt = await bcrypt.genSalt(config.BCRYPT_ROUNDS);
      const passwordHash = await bcrypt.hash(newPassword, salt);

      // Update password
      await User.updatePassword(userId, passwordHash);

      // Mark token as used
      await query(
        `UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE token = $1`,
        [token]
      );

      // Revoke all sessions for security
      await Session.revokeAllSessions(userId);

      // Create notification
      await Notification.create({
        userId,
        type: 'security',
        title: 'Password changed',
        message: 'Your password has been changed successfully. You have been logged out from all devices.',
        priority: 'high',
      });

      return {
        success: true,
        message: 'Password reset successfully. Please log in with your new password.',
      };
    } catch (error) {
      throw new Error(`Password reset failed: ${error.message}`);
    }
  }

  // Get active sessions
  static async getActiveSessions(userId) {
    try {
      return await Session.getActiveSessions(userId);
    } catch (error) {
      throw new Error(`Failed to get sessions: ${error.message}`);
    }
  }

  // Revoke specific device session
  static async revokeDeviceSession(sessionId, userId) {
    try {
      await Session.revoke(sessionId);

      // Create notification
      await Notification.create({
        userId,
        type: 'security',
        title: 'Device session revoked',
        message: 'A device session has been revoked.',
        priority: 'normal',
      });

      return {
        success: true,
        message: 'Device session revoked',
      };
    } catch (error) {
      throw new Error(`Failed to revoke session: ${error.message}`);
    }
  }

  // Change password
  static async changePassword(userId, currentPassword, newPassword) {
    try {
      if (newPassword.length < config.PASSWORD_MIN_LENGTH) {
        throw new Error(`Password must be at least ${config.PASSWORD_MIN_LENGTH} characters long`);
      }

      // Get user with password hash for verification
      const userResult = await query(
        `SELECT id, password_hash FROM users WHERE id = $1 AND deleted_at IS NULL`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const salt = await bcrypt.genSalt(config.BCRYPT_ROUNDS);
      const passwordHash = await bcrypt.hash(newPassword, salt);

      // Update password
      await User.updatePassword(userId, passwordHash);

      // Revoke all sessions for security
      await Session.revokeAllSessions(userId);

      // Create notification
      await Notification.create({
        userId,
        type: 'security',
        title: 'Password changed',
        message: 'Your password has been changed successfully. You have been logged out from all devices.',
        priority: 'high',
      });

      // Publish event
      await publishEvent('nexvault.events', 'user.password_changed', {
        userId,
        timestamp: new Date(),
      });

      return {
        success: true,
        message: 'Password changed successfully. Please log in again.',
      };
    } catch (error) {
      throw new Error(`Password change failed: ${error.message}`);
    }
  }

  // Enable two-factor authentication
  static async enableTwoFactor(userId, method) {
    try {
      if (!['email', 'sms', 'totp'].includes(method)) {
        throw new Error('Invalid 2FA method');
      }

      // Update user
      const result = await query(
        `UPDATE users SET two_factor_enabled = TRUE, two_factor_method = $1 WHERE id = $2
         RETURNING id, two_factor_enabled, two_factor_method`,
        [method, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Failed to enable 2FA');
      }

      // Create notification
      await Notification.create({
        userId,
        type: 'security',
        title: '2FA enabled',
        message: `Two-factor authentication has been enabled using ${method}.`,
        priority: 'high',
      });

      // Publish event
      await publishEvent('nexvault.events', '2fa.enabled', {
        userId,
        method,
        timestamp: new Date(),
      });

      return {
        success: true,
        message: `Two-factor authentication enabled via ${method}`,
        twoFactorEnabled: true,
        twoFactorMethod: method,
      };
    } catch (error) {
      throw new Error(`Failed to enable 2FA: ${error.message}`);
    }
  }

  // Disable two-factor authentication
  static async disableTwoFactor(userId, verificationCode) {
    try {
      // For development, accept any code. In production, verify the code properly
      // This should verify against the actual 2FA method

      // Update user
      const result = await query(
        `UPDATE users SET two_factor_enabled = FALSE, two_factor_method = NULL WHERE id = $1
         RETURNING id, two_factor_enabled, two_factor_method`,
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Failed to disable 2FA');
      }

      // Create notification
      await Notification.create({
        userId,
        type: 'security',
        title: '2FA disabled',
        message: 'Two-factor authentication has been disabled.',
        priority: 'high',
      });

      // Publish event
      await publishEvent('nexvault.events', '2fa.disabled', {
        userId,
        timestamp: new Date(),
      });

      return {
        success: true,
        message: 'Two-factor authentication disabled',
        twoFactorEnabled: false,
      };
    } catch (error) {
      throw new Error(`Failed to disable 2FA: ${error.message}`);
    }
  }

  // Verify two-factor authentication code
  static async verifyTwoFactorCode(email, code) {
    try {
      console.log(`[${new Date().toISOString()}] 🔍 Verifying 2FA code for email: ${email}, code: ${code}`);

      // Check if there's a valid 2FA code for this email
      const result = await query(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.two_factor_enabled, u.two_factor_method, u.kyc_status, u.email_verified, u.tier, t.code, t.expires_at
         FROM users u
         LEFT JOIN two_factor_codes t ON u.id = t.user_id AND t.used_at IS NULL AND t.expires_at > CURRENT_TIMESTAMP
         WHERE u.email = $1 AND u.two_factor_enabled = TRUE
         ORDER BY t.created_at DESC
         LIMIT 1`,
        [email]
      );

      console.log(`[${new Date().toISOString()}] 📊 Query result:`, result.rows);

      if (result.rows.length === 0) {
        console.log(`[${new Date().toISOString()}] ❌ No user found with 2FA enabled for email: ${email}`);
        throw new Error('2FA not enabled or invalid email');
      }

      const user = result.rows[0];
      console.log(`[${new Date().toISOString()}] 👤 Found user: ${user.email}, 2FA enabled: ${user.two_factor_enabled}`);

      if (!user.code) {
        console.log(`[${new Date().toISOString()}] ❌ No active verification code found for user: ${user.email}`);
        throw new Error('No active verification code found');
      }

      console.log(`[${new Date().toISOString()}] 🔢 Stored code: "${user.code}", Entered code: "${code}"`);
      console.log(`[${new Date().toISOString()}] 🔢 Code types - Stored: ${typeof user.code}, Entered: ${typeof code}`);
      console.log(`[${new Date().toISOString()}] 🔢 Code lengths - Stored: ${user.code.length}, Entered: ${code.length}`);

      // Trim both codes to avoid whitespace issues
      const trimmedStoredCode = user.code.trim();
      const trimmedEnteredCode = code.trim();

      console.log(`[${new Date().toISOString()}] 🔢 Trimmed codes - Stored: "${trimmedStoredCode}", Entered: "${trimmedEnteredCode}"`);

      if (trimmedStoredCode !== trimmedEnteredCode) {
        console.log(`[${new Date().toISOString()}] ❌ Code mismatch after trimming!`);
        throw new Error('Invalid verification code');
      }

      console.log(`[${new Date().toISOString()}] ✅ Code verified successfully`);

      // Mark code as used
      await query(
        `UPDATE two_factor_codes SET used_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND code = $2`,
        [user.id, trimmedStoredCode]
      );

      console.log(`[${new Date().toISOString()}] ✅ Code marked as used`);

      // Generate tokens and create session
      const accessToken = generateToken({ userId: user.id, email: user.email });
      const refreshToken = generateRefreshToken({ userId: user.id });

      const session = await Session.create({
        userId: user.id,
        userAgent: 'Web Browser',
        ipAddress: '127.0.0.1', // Will be overridden by actual IP
        deviceName: 'Web Browser',
        deviceType: 'desktop',
        refreshToken,
      });

      // Update last login
      await User.updateLastLogin(user.id);

      // Create notification
      await Notification.create({
        userId: user.id,
        type: 'security',
        title: 'Login with 2FA',
        message: 'Successfully logged in with two-factor authentication.',
        priority: 'normal',
      });

      return {
        success: true,
        message: '2FA verification successful',
        accessToken,
        refreshToken,
        sessionId: session.id,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          kycStatus: user.kyc_status,
          emailVerified: user.email_verified,
          tier: user.tier,
        },
        expiresIn: '24h',
      };
    } catch (error) {
      throw new Error(`2FA verification failed: ${error.message}`);
    }
  }
}

module.exports = AuthService;
