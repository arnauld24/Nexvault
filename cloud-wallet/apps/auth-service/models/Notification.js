const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Notification {
  // Create a notification
  static async create(notificationData) {
    const { userId, type, title, message, data, priority } = notificationData;
    const notificationId = uuidv4();

    try {
      const result = await query(
        `INSERT INTO notifications (id, user_id, type, title, message, data, priority, is_read)
         VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)
         RETURNING id, user_id, type, title, message, is_read, created_at`,
        [notificationId, userId, type, title, message, data ? JSON.stringify(data) : null, priority || 'normal']
      );
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating notification: ${error.message}`);
    }
  }

  // Get user notifications
  static async getUserNotifications(userId, limit = 50, offset = 0) {
    try {
      const result = await query(
        `SELECT id, type, title, message, data, is_read, priority, created_at
         FROM notifications
         WHERE user_id = $1 AND is_archived = FALSE
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error getting notifications: ${error.message}`);
    }
  }

  // Get unread notification count
  static async getUnreadCount(userId) {
    try {
      const result = await query(
        `SELECT COUNT(*) as count FROM notifications
         WHERE user_id = $1 AND is_read = FALSE AND is_archived = FALSE`,
        [userId]
      );
      return parseInt(result.rows[0].count) || 0;
    } catch (error) {
      throw new Error(`Error getting unread count: ${error.message}`);
    }
  }

  // Mark as read
  static async markAsRead(notificationId) {
    try {
      const result = await query(
        `UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id, is_read`,
        [notificationId]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error marking notification as read: ${error.message}`);
    }
  }

  // Mark all as read
  static async markAllAsRead(userId) {
    try {
      const result = await query(
        `UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND is_read = FALSE AND is_archived = FALSE
         RETURNING id`,
        [userId]
      );
      return result.rows.length;
    } catch (error) {
      throw new Error(`Error marking all as read: ${error.message}`);
    }
  }

  // Delete notification
  static async delete(notificationId, userId) {
    try {
      const result = await query(
        `DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id, user_id, type, title, message, data, is_read, priority, created_at`,
        [notificationId, userId]
      );
      if (result.rowCount === 0) {
        throw new Error('Notification not found');
      }
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error deleting notification: ${error.message}`);
    }
  }

  // Get notifications by type
  static async getByType(userId, type, limit = 50) {
    try {
      const result = await query(
        `SELECT id, type, title, message, data, is_read, priority, created_at
         FROM notifications
         WHERE user_id = $1 AND type = $2 AND is_archived = FALSE
         ORDER BY created_at DESC
         LIMIT $3`,
        [userId, type, limit]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Error getting notifications by type: ${error.message}`);
    }
  }
}

module.exports = Notification;
