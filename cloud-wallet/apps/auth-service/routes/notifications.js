const express = require('express');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 50, offset = 0 } = req.query;
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] 📬 Loading notifications for user: ${userId} (limit: ${limit}, offset: ${offset})`);

    const notifications = await Notification.getUserNotifications(
      userId,
      parseInt(limit),
      parseInt(offset)
    );

    console.log(`[${timestamp}] ✓ Loaded ${notifications.length} notifications`);
    
    res.status(200).json({
      success: true,
      notifications,
      count: notifications.length,
    });
  } catch (error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ✗ Failed to load notifications:`, error.message);
    
    // Return 504 Gateway Timeout for connection issues, 500 for other errors
    const statusCode = error.message.includes('timeout') ? 504 : 500;
    
    res.status(statusCode).json({
      success: false,
      message: error.message.includes('timeout') 
        ? 'Notifications service is temporarily unavailable. Please try again later.'
        : 'Failed to load notifications',
    });
  }
});

// Get unread notification count
router.get('/unread/count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] 📌 Getting unread count for user: ${userId}`);

    const count = await Notification.getUnreadCount(userId);

    console.log(`[${timestamp}] ✓ User has ${count} unread notifications`);
    
    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ✗ Failed to get unread count:`, error.message);
    
    const statusCode = error.message.includes('timeout') ? 504 : 500;
    
    res.status(statusCode).json({
      success: false,
      message: error.message.includes('timeout')
        ? 'Service temporarily unavailable. Please try again later.'
        : 'Failed to get unread count',
      count: 0,
    });
  }
});

// Mark notification as read
router.put('/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.markAsRead(notificationId);

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      notification,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Mark all notifications as read
router.post('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const count = await Notification.markAllAsRead(userId);

    res.status(200).json({
      success: true,
      message: `${count} notification(s) marked as read`,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Create notification (internal service only)
router.post('/', async (req, res) => {
  try {
    const serviceSecret = req.headers['x-service-secret'];
    const internalSecret = process.env.INTERNAL_SERVICE_SECRET || 'nexvault-internal-secret';
    const isInternal = serviceSecret && serviceSecret === internalSecret;

    if (!isInternal) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
      });
    }

    const { userId, email, type, title, message, data, priority } = req.body;

    if (!title || !message || (!userId && !email)) {
      return res.status(400).json({
        success: false,
        message: 'userId or email, title and message are required to create a notification',
      });
    }

    let targetUserId = userId;

    if (!targetUserId && email) {
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }
      targetUserId = user.id;
    }

    const notification = await Notification.create({
      userId: targetUserId,
      type: type || 'transaction',
      title,
      message,
      data,
      priority: priority || 'normal',
    });

    res.status(201).json({
      success: true,
      notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Delete notification
router.delete('/:notificationId', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.userId;

    const notification = await Notification.delete(notificationId, userId);

    res.status(200).json({
      success: true,
      message: 'Notification deleted',
      notification,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Get notifications by type
router.get('/type/:type', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type } = req.params;
    const { limit = 50 } = req.query;

    const notifications = await Notification.getByType(userId, type, parseInt(limit));

    res.status(200).json({
      success: true,
      notifications,
      count: notifications.length,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
