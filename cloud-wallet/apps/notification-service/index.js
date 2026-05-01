require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const nodemailer = require('nodemailer');
const { connectRabbitMQ, consumeMessage } = require('./config/rabbitmq');
const config = require('./config/config');
const { v4: uuidv4 } = require('uuid');

//const uuid = require('uuid');
// const uuidv4 = uuid.v4;
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Email configuration
let emailTransporter;

const initializeEmail = () => {
  console.log(`[${new Date().toISOString()}] 📧 Initializing email service. NODE_ENV: ${config.NODE_ENV}`);
  // Always use real email service (development and production)
  console.log(`[${new Date().toISOString()}] 📧 Using REAL email service (${config.EMAIL_HOST}:${config.EMAIL_PORT})`);
  emailTransporter = nodemailer.createTransport({
    host: config.EMAIL_HOST,
    port: config.EMAIL_PORT,
    secure: config.EMAIL_PORT === 465, // Use TLS for port 587, SSL for port 465
    auth: {
      user: config.EMAIL_USER,
      pass: config.EMAIL_PASSWORD,
    },
  });
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Notification Service is running',
    timestamp: new Date(),
  });
});

// Send notification (internal endpoint)
app.post('/api/send', async (req, res) => {
  try {
    const { userId, type, email, title, message, data } = req.body;

    if (type === 'email') {
      await sendEmailNotification(email, title, message, data);
    } else if (type === 'sms') {
      await sendSMSNotification(data?.phoneNumber, title, message);
    }

    res.status(200).json({
      success: true,
      message: `${type} notification sent successfully`,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Send email notification
const sendEmailNotification = async (to, subject, htmlContent, data = {}) => {
  try {
    let emailTemplate = htmlContent;

    // Build email template
    const template = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; }
          .header { background-color: #0056B3; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: white; padding: 20px; }
          .footer { background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #0056B3; color: white; text-decoration: none; border-radius: 4px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>NexVault</h2>
          </div>
          <div class="content">
            <h3>${subject}</h3>
            <p>${htmlContent}</p>
            ${data?.link ? `<a href="${data.link}" class="button">View Details</a>` : ''}
          </div>
          <div class="footer">
            <p>&copy; 2024 NexVault. All rights reserved.</p>
            <p>This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    if (!emailTransporter) {
      initializeEmail();
    }

    console.log(`[${new Date().toISOString()}] 📧 Sending notification email to: ${to}`);
    console.log(`[${new Date().toISOString()}] 📧 Email config:`, {
      host: config.EMAIL_HOST,
      port: config.EMAIL_PORT,
      user: config.EMAIL_USER ? '***' : 'NOT SET',
      from: config.EMAIL_FROM
    });
    
    const result = await emailTransporter.sendMail({
      from: config.EMAIL_FROM,
      to,
      subject,
      html: template,
    });

    console.log(`[${new Date().toISOString()}] ✓ Email notification sent successfully, messageId: ${result.messageId}`);
    return true;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ⚠️  Email notification failed (non-critical):`, error.message);
    // Don't throw - email failures should not crash the service
    // Log the error but continue processing
    return false;
  }
};

// Send SMS notification (placeholder - integrate with SMS service)
const sendSMSNotification = async (phoneNumber, title, message) => {
  try {
    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log(`SMS to ${phoneNumber}: ${message}`);
    return true;
  } catch (error) {
    console.error('Error sending SMS:', error);
    throw new Error(`Failed to send SMS: ${error.message}`);
  }
};

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: config.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Initialize RabbitMQ consumers
const initializeRabbitMQConsumers = async () => {
  try {
    await connectRabbitMQ();

    // Consumer for user registration
    await consumeMessage('events.user-registered', async (message) => {
      console.log('Processing user registration event:', message);
      try {
        await sendEmailNotification(
          message.email,
          'Welcome to NexVault!',
          `
            <p>Dear User,</p>
            <p>Thank you for registering with NexVault! We're excited to have you on board.</p>
            <p>To get started, please verify your email address by clicking the link below:</p>
            <p><strong>Your User ID:</strong> ${message.userId}</p>
            <p>If you didn't create this account, please contact our support team immediately.</p>
            <p>Best regards,<br/>The NexVault Team</p>
          `,
          { userId: message.userId }
        );
      } catch (error) {
        console.error('Error processing registration event:', error);
      }
    });

    // Consumer for user login
    await consumeMessage('events.user-login', async (message) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] 📨 Processing user login event for: ${message.email}`);
      try {
        const result = await sendEmailNotification(
          message.email,
          'New Login on Your NexVault Account',
          `
            <p>Dear User,</p>
            <p>We detected a new login on your NexVault account.</p>
            <p><strong>Date & Time:</strong> ${new Date(message.timestamp).toLocaleString()}</p>
            <p><strong>IP Address:</strong> ${message.ipAddress}</p>
            <p>If this wasn't you, please secure your account immediately by changing your password.</p>
            <p>Best regards,<br/>The NexVault Team</p>
          `
        );
        if (result) {
          console.log(`[${timestamp}] ✓ Login notification processed successfully`);
        } else {
          console.log(`[${timestamp}] ⚠️  Login notification failed but service continues`);
        }
      } catch (error) {
        console.error(`[${timestamp}] ⚠️  Error processing login event (non-critical):`, error.message);
      }
    });

    // Consumer for password reset and 2FA codes
    await consumeMessage('notifications.email', async (message) => {
      console.log(`[${new Date().toISOString()}] 📨 Processing notification event:`, JSON.stringify(message, null, 2));
      try {
        if (message.type === 'password_reset') {
          console.log(`[${new Date().toISOString()}] 📧 Sending password reset email to: ${message.email}`);
          await sendEmailNotification(
            message.email,
            'Password Reset Request',
            `
              <p>Dear User,</p>
              <p>We received a request to reset your password.</p>
              <p>To reset your password, click the link below (this link expires in 1 hour):</p>
              <p><strong>Reset Token:</strong> ${message.resetToken}</p>
              <p>If you didn't request a password reset, please ignore this email.</p>
              <p>Best regards,<br/>The NexVault Team</p>
            `
          );
        } else if (message.type === '2fa_code') {
          console.log(`[${new Date().toISOString()}] 🔐 Sending 2FA code email to: ${message.email}, code: ${message.verificationCode}`);
          await sendEmailNotification(
            message.email,
            'Your NexVault 2FA Verification Code',
            `
              <p>Dear User,</p>
              <p>You are attempting to log in to your NexVault account.</p>
              <p>Your verification code is:</p>
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                <h2 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 4px;">${message.verificationCode}</h2>
              </div>
              <p><strong>This code will expire in 10 minutes.</strong></p>
              <p>If you didn't request this code, please secure your account immediately by changing your password.</p>
              <p>Best regards,<br/>The NexVault Team</p>
            `
          );
        } else if (message.type === 'deposit') {
          console.log(`[${new Date().toISOString()}] 💰 Sending deposit notification email to: ${message.email}`);
          await sendEmailNotification(
            message.email,
            message.title,
            `
              <p>Dear User,</p>
              <p>${message.message}</p>
              ${message.data?.reference ? `<p><strong>Reference:</strong> ${message.data.reference}</p>` : ''}
              ${message.data?.amount ? `<p><strong>Amount:</strong> ${message.data.amount} ${message.data.currency || 'XAF'}</p>` : ''}
              ${message.data?.method ? `<p><strong>Method:</strong> ${message.data.method}</p>` : ''}
              <p>Best regards,<br/>The NexVault Team</p>
            `,
            message.data
          );
        } else if (message.type === 'transfer') {
          console.log(`[${new Date().toISOString()}] 💸 Sending transfer notification email to: ${message.email}`);
          await sendEmailNotification(
            message.email,
            message.title,
            `
              <p>Dear User,</p>
              <p>${message.message}</p>
              ${message.data?.reference ? `<p><strong>Reference:</strong> ${message.data.reference}</p>` : ''}
              ${message.data?.amount ? `<p><strong>Amount:</strong> ${message.data.amount} ${message.data.currency || 'XAF'}</p>` : ''}
              ${message.data?.recipient ? `<p><strong>Recipient:</strong> ${message.data.recipient}</p>` : ''}
              ${message.data?.sender ? `<p><strong>Sender:</strong> ${message.data.sender}</p>` : ''}
              <p>Best regards,<br/>The NexVault Team</p>
            `,
            message.data
          );
        } else if (message.type === 'withdrawal') {
          console.log(`[${new Date().toISOString()}] 🏦 Sending withdrawal notification email to: ${message.email}`);
          await sendEmailNotification(
            message.email,
            message.title,
            `
              <p>Dear User,</p>
              <p>${message.message}</p>
              ${message.data?.reference ? `<p><strong>Reference:</strong> ${message.data.reference}</p>` : ''}
              ${message.data?.amount ? `<p><strong>Amount:</strong> ${message.data.amount} ${message.data.currency || 'XAF'}</p>` : ''}
              ${message.data?.bankName ? `<p><strong>Bank:</strong> ${message.data.bankName}</p>` : ''}
              <p>Best regards,<br/>The NexVault Team</p>
            `,
            message.data
          );
        } else if (message.type === 'receipt') {
          console.log(`[${new Date().toISOString()}] 🧾 Sending receipt email to: ${message.email}`);
          await sendEmailNotification(
            message.email,
            message.title,
            `
              <p>Dear User,</p>
              <p>${message.message}</p>
              ${message.data?.reference ? `<p><strong>Reference:</strong> ${message.data.reference}</p>` : ''}
              ${message.data?.amount ? `<p><strong>Amount:</strong> ${message.data.amount} ${message.data.currency || 'XAF'}</p>` : ''}
              ${message.data?.fee != null ? `<p><strong>Fee:</strong> ${message.data.fee} ${message.data.currency || 'XAF'}</p>` : ''}
              ${message.data?.from ? `<p><strong>From:</strong> ${message.data.from}</p>` : ''}
              ${message.data?.to ? `<p><strong>To:</strong> ${message.data.to}</p>` : ''}
              <p><strong>Status:</strong> ${message.data?.status}</p>
              <p><strong>Date:</strong> ${message.data?.date}</p>
              <p>Best regards,<br/>The NexVault Team</p>
            `,
            message.data
          );
        }
      } catch (error) {
        console.error('Error processing email notification:', error);
      }
    });

    console.log(`[${new Date().toISOString()}] ✓ RabbitMQ consumers initialized`);
  } catch (error) {
    console.error('Failed to initialize RabbitMQ consumers:', error);
    // Continue anyway, as the service can still function
  }
};

// Start server
const PORT = process.env.NOTIFICATION_SERVICE_PORT || 3002;

const server = app.listen(PORT, async () => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🚀 Notification Service running on port ${PORT}`);
  console.log(`[${timestamp}] Environment: ${config.NODE_ENV}`);
  initializeEmail();
  await initializeRabbitMQConsumers();
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;
