const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

class Session {
  // Create a new session
  static async create(sessionData) {
    const { userId, userAgent, ipAddress, deviceName, deviceType, refreshToken } = sessionData;
    const sessionId = uuidv4();
    const sessionToken = uuidv4();
    
    // Calculate expiry (default 24 hours)
    const expiresAt = new Date(Date.now() + config.SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

    try {
      const result = await query(
        `INSERT INTO sessions (id, user_id, session_token, refresh_token, user_agent, ip_address, device_name, device_type, expires_at, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
         RETURNING id, session_token, refresh_token, expires_at, created_at`,
        [sessionId, userId, sessionToken, refreshToken || null, userAgent || null, ipAddress || null, deviceName || null, deviceType || null, expiresAt]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating session: ${error.message}`);
    }
  }

  // Find active session by token
  static async findByToken(token) {
    try {
      const result = await query(
        `SELECT s.*, u.id as user_id, u.email 
         FROM sessions s
         JOIN users u ON s.user_id = u.id
         WHERE s.session_token = $1 AND s.is_active = TRUE AND s.expires_at > CURRENT_TIMESTAMP`,
        [token]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding session: ${error.message}`);
    }
  }

  // Get all active sessions for a user
  static async getActiveSessions(userId) {
    try {
      const result = await query(
        `SELECT id, device_name, device_type, ip_address, last_activity, created_at, expires_at
         FROM sessions
         WHERE user_id = $1 AND is_active = TRUE AND expires_at > CURRENT_TIMESTAMP
         ORDER BY last_activity DESC, created_at DESC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error getting active sessions: ${error.message}`);
    }
  }

  // Update session activity
  static async updateActivity(sessionId) {
    try {
      const result = await query(
        `UPDATE sessions SET last_activity = CURRENT_TIMESTAMP WHERE id = $1
         RETURNING id, last_activity`,
        [sessionId]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error updating session activity: ${error.message}`);
    }
  }

  // Revoke specific session
  static async revoke(sessionId) {
    try {
      const result = await query(
        `UPDATE sessions SET is_active = FALSE WHERE id = $1
         RETURNING id`,
        [sessionId]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error revoking session: ${error.message}`);
    }
  }

  // Revoke all user sessions except current one
  static async revokeAllOtherSessions(userId, excludeSessionId) {
    try {
      const result = await query(
        `UPDATE sessions SET is_active = FALSE 
         WHERE user_id = $1 AND id != $2 AND is_active = TRUE
         RETURNING id`,
        [userId, excludeSessionId]
      );
      return result.rows.length;
    } catch (error) {
      throw new Error(`Error revoking sessions: ${error.message}`);
    }
  }

  // Revoke all user sessions
  static async revokeAllSessions(userId) {
    try {
      const result = await query(
        `UPDATE sessions SET is_active = FALSE 
         WHERE user_id = $1 AND is_active = TRUE
         RETURNING id`,
        [userId]
      );
      return result.rows.length;
    } catch (error) {
      throw new Error(`Error revoking all sessions: ${error.message}`);
    }
  }

  // Clean up expired sessions
  static async cleanupExpiredSessions() {
    try {
      const result = await query(
        `UPDATE sessions SET is_active = FALSE 
         WHERE expires_at <= CURRENT_TIMESTAMP AND is_active = TRUE`
      );
      return result.rowCount;
    } catch (error) {
      throw new Error(`Error cleaning up sessions: ${error.message}`);
    }
  }

  // Get session count for a user
  static async getActiveSessionCount(userId) {
    try {
      const result = await query(
        `SELECT COUNT(*) as count FROM sessions
         WHERE user_id = $1 AND is_active = TRUE AND expires_at > CURRENT_TIMESTAMP`,
        [userId]
      );
      return parseInt(result.rows[0].count) || 0;
    } catch (error) {
      throw new Error(`Error getting session count: ${error.message}`);
    }
  }
}

module.exports = Session;
