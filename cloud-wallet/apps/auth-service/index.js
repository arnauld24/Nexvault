require('dotenv').config();
const fs = require('fs');
const path = require('path');
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
const adminRoutes = require('./routes/admin');
const debugRoutes = require('./routes/debug');

const app = express();
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3004',
  'http://localhost:4000',
  'http://localhost:3006',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
  'http://127.0.0.1:3004',
  'http://127.0.0.1:4000',
  'http://127.0.0.1:3006',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://nexvault-frontend:5173',
];

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions));
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

// Serve uploaded KYC assets
const uploadsPath = path.resolve(__dirname, 'uploads');
const kycUploadsPath = path.join(uploadsPath, 'kyc');
fs.mkdirSync(uploadsPath, { recursive: true });
fs.mkdirSync(kycUploadsPath, { recursive: true });
console.log('Serving uploads from:', uploadsPath);

// Explicit KYC file endpoint to ensure correct CORS/CORP headers are applied
app.get('/uploads/kyc/:filename', async (req, res, next) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(kycUploadsPath, filename);
    await fs.promises.access(filePath);
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.sendFile(filePath);
  } catch (err) {
    // If not found, attempt seeded-folder fallback (userId/docType.jpg)
    const fallbackMatch = req.params.filename.match(/^([^_]+)_(passport|id|selfie|address_proof)_(\d+)\.(jpg|jpeg|png|pdf)$/i);
    if (fallbackMatch) {
      const userId = fallbackMatch[1];
      try {
        const files = await fs.promises.readdir(kycUploadsPath);
        const candidate = files.find((f) => f.startsWith(`${userId}_`));
        if (candidate) {
          const candidatePath = path.join(kycUploadsPath, candidate);
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
          res.setHeader('Access-Control-Allow-Origin', '*');
          return res.sendFile(candidatePath);
        }
      } catch (e) {
        // fall through to next
      }
    }
    return next();
  }
});

app.use('/uploads', async (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.path.startsWith('/kyc/')) {
    const requestedFile = path.join(kycUploadsPath, req.path.substring('/kyc/'.length));
      try {
        await fs.promises.access(requestedFile);
        return next();
      } catch {
        const fallbackMatch = req.path.match(/^\/kyc\/([^/]+)\/(passport|id|selfie|address_proof)\.(jpg|jpeg|png|pdf)$/i);
        if (fallbackMatch) {
          const [, userId, documentType] = fallbackMatch;
          try {
            const files = await fs.promises.readdir(kycUploadsPath);
            const candidate = files.find((filename) => filename.startsWith(`${userId}_${documentType}_`));
            if (candidate) {
              // sendFile will allow our express.static setHeaders to be bypassed, so set headers here
              res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
              res.setHeader('Access-Control-Allow-Origin', '*');
              return res.sendFile(path.join(kycUploadsPath, candidate));
            }
          } catch (error) {
            console.warn('Uploads fallback search failed:', error.message);
          }
        }
      }
  }

    next();
  }, express.static(uploadsPath, {
    setHeaders: function (res, filePath) {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
      // allow embedding images in other origins
      res.removeHeader && res.removeHeader('Cross-Origin-Opener-Policy');
    }
  }));

// API Routes
app.use('/auth', authRoutes);
// Backwards-compatible mounts for clients that include /api prefix
app.use('/api/auth', authRoutes);
console.log('Mounted auth routes under /auth and /api/auth');
app.use('/notifications', notificationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/kyc', kycRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/admin', adminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/debug', debugRoutes);
console.log('Mounted admin routes under /admin and /api/admin');
console.log('Mounted debug routes under /debug');

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
    await query(`
      CREATE TABLE IF NOT EXISTS admin_notifications (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        data JSONB,
        priority VARCHAR(20) DEFAULT 'normal',
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(read)
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at)
    `);
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
