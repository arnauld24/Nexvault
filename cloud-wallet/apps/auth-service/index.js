require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { connectDB } = require('./config/database');
const { connectRabbitMQ, consumeMessage } = require('./config/rabbitmq');
const { query } = require('./config/database');
const config = require('./config/config');

// Import routes
const authRoutes = require('./routes/auth');
const notificationRoutes = require('./routes/notifications');
const kycRoutes = require('./routes/kyc');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] ═══════════════════════════════════════════════════`);
  console.log(`[${timestamp}] 📥 REQUEST RECEIVED`);
  console.log(`[${timestamp}] Method: ${req.method} ${req.path}`);
  console.log(`[${timestamp}] Headers:`, { 'content-type': req.headers['content-type'], 'user-agent': req.headers['user-agent'] });
  // Only log body if it exists and is an object (not FormData or undefined)
  if (req.method !== 'GET' && req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
    console.log(`[${timestamp}] Body keys:`, Object.keys(req.body));
  }
  console.log(`[${timestamp}] ═══════════════════════════════════════════════════\n`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Auth Service is running',
    timestamp: new Date(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/kyc', kycRoutes);

// Not found handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handling middleware - MUST have 4 parameters for Express to recognize it as error handler
app.use((err, req, res, next) => {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ✗ Error Handler Caught:`, err.message);
  console.error(`[${timestamp}] Stack:`, err.stack);
  
  // Handle multer file upload errors
  if (err.name === 'MulterError') {
    console.error(`[${timestamp}] 📤 Multer Error Type: ${err.code}`);
    
    const statusCode = err.code === 'FILE_TOO_LARGE' ? 413 : 400;
    const message = 
      err.code === 'FILE_TOO_LARGE' ? 'File size exceeds maximum limit (10MB)' :
      err.code === 'LIMIT_FILE_COUNT' ? 'Too many files uploaded' :
      err.code === 'LIMIT_FILE_SIZE' ? 'File size exceeds limit' :
      err.message || 'File upload error';
    
    return res.status(statusCode).json({
      success: false,
      message,
      error: config.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
  
  // Handle other errors
  const statusCode = err.statusCode || err.status || 500;
  const isDev = config.NODE_ENV === 'development';
  
  console.error(`[${timestamp}] HTTP ${statusCode}: ${err.message}`);
  
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    error: isDev ? err.stack : undefined,
  });
});

// Initialize database and RabbitMQ connections
const initializeConnections = async () => {
  try {
    // Connect to PostgreSQL
    const dbConnected = await connectDB();
    if (!dbConnected) {
      console.error('Failed to connect to database');
      process.exit(1);
    }

    // Initialize database schema (if needed)
    console.log('✓ Database schema is ready');

    // Connect to RabbitMQ
    await connectRabbitMQ();

    // Set up token cleanup job (runs every hour)
    setInterval(async () => {
      try {
        await query('SELECT cleanup_expired_tokens();');
        console.log('✓ Expired tokens cleaned up');
      } catch (error) {
        console.error('Error cleaning up expired tokens:', error);
      }
    }, config.TOKEN_CLEANUP_INTERVAL);

    // Set up session cleanup job (runs every hour)
    setInterval(async () => {
      try {
        await query('SELECT cleanup_expired_sessions();');
        console.log('✓ Expired sessions cleaned up');
      } catch (error) {
        console.error('Error cleaning up expired sessions:', error);
      }
    }, config.TOKEN_CLEANUP_INTERVAL);

    console.log('✓ Connections initialized successfully');
  } catch (error) {
    console.error('Failed to initialize connections:', error);
    process.exit(1);
  }
};

// Start server
const PORT = config.PORT;

const server = app.listen(PORT, async () => {
  console.log(`🚀 Auth Service running on port ${PORT}`);
  await initializeConnections();
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
