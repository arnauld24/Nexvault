require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const axios = require('axios');

const app = express();

// Configuration
const AUTH_SERVICE_URL = 'http://localhost:3001';
const WALLET_SERVICE_URL = process.env.WALLET_SERVICE_URL || 'http://localhost:3003';
const WALLET_SERVICE_JAVA_URL = process.env.WALLET_SERVICE_JAVA_URL || 'http://localhost:8080';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3002';
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet());

// Do not parse proxy request bodies globally, so the gateway can forward browser requests intact.
// Parse JSON only for local gateway helper endpoints below.

// CORS configuration - Allow frontend to connect
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173', // Vite default
  'http://localhost:5174',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: 'Too many requests from this IP, please try again later',
});

app.use(limiter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Gateway is running',
    services: {
      auth: AUTH_SERVICE_URL,
      wallet: WALLET_SERVICE_URL,
      wallet_java : WALLET_SERVICE_JAVA_URL,
      notification: NOTIFICATION_SERVICE_URL,
    },
    timestamp: new Date(),
  });
});

// Service health check endpoints
app.get('/health/services', async (req, res) => {
  try {
    const [authHealth, walletHealth, walletJavaHealth, notificationHealth] = await Promise.allSettled([
      axios.get(`${AUTH_SERVICE_URL}/health`),
      axios.get(`${WALLET_SERVICE_URL}/health`),
      axios.get(`${WALLET_SERVICE_JAVA_URL}/health`),
      axios.get(`${NOTIFICATION_SERVICE_URL}/health`),
    ]);

    res.status(200).json({
      success: true,
      services: {
        auth: {
          status: authHealth.status === 'fulfilled' ? 'online' : 'offline',
          url: AUTH_SERVICE_URL,
        },
        wallet: {
          status: walletHealth.status === 'fulfilled' ? 'online' : 'offline',
          url: WALLET_SERVICE_URL,
        },
        wallet_java: {
          status: walletJavaHealth.status === 'fulfilled' ? 'online' : 'offline',
          url: WALLET_SERVICE_JAVA_URL,
        },
        notification: {
          status: notificationHealth.status === 'fulfilled' ? 'online' : 'offline',
          url: NOTIFICATION_SERVICE_URL,
        },
      },
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error checking service health',
      error: error.message,
    });
  }
});

// ==================== AUTH SERVICE ROUTES ====================

const proxyLogger = (proxyRes, req, res) => {
  console.log(`[${new Date().toISOString()}] Proxy response from target for ${req.method} ${req.originalUrl}: ${proxyRes.statusCode}`);
  console.log(`[${new Date().toISOString()}] Response headers:`, proxyRes.headers);
};

// All auth endpoints are proxied to the Auth Service
app.use('/api/auth', (req, res, next) => {
  console.log(`[${new Date().toISOString()}] Matched /api/auth route for ${req.method} ${req.path}`);
  next();
}, createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
  router: (req) => `${AUTH_SERVICE_URL}/api/auth`,
  proxyTimeout: 20000,
  timeout: 20000,
  onProxyRes: proxyLogger,
  onError: (err, req, res) => {
    console.error('Auth Service Error:', err);
    res.status(503).json({
      success: false,
      message: 'Auth Service is unavailable',
      error: err.message,
    });
  },
}));

// Notification endpoints via Auth Service
app.use('/api/notifications', createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
  router: (req) => `${AUTH_SERVICE_URL}/api/notifications`,
  proxyTimeout: 20000,
  timeout: 20000,
  onError: (err, req, res) => {
    console.error('Notification Service Error:', err);
    res.status(503).json({
      success: false,
      message: 'Notification Service is unavailable',
      error: err.message,
    });
  },
}));

// ==================== WALLET SERVICE ROUTES ====================
// All wallet operations are proxied to the Wallet Service (Java Spring Boot)
const walletProxyOptions = {
    target: WALLET_SERVICE_URL, // Default to Node.js
    changeOrigin: true,
    proxyTimeout: 20000,
    timeout: 20000,
    router: async (req) => {
        // This function runs on every request
        try {
            // Check if the Node.js service is alive (quick timeout)
            await axios.get(`${WALLET_SERVICE_URL}/health`, { timeout: 2000 });
            console.log('Routing to: Wallet Service (Node.js)');
            return WALLET_SERVICE_URL;
        } catch (err) {
            console.log('Node.js Wallet Service offline, falling back to Java...');
            return WALLET_SERVICE_JAVA_URL;
        }
    },
    onError: (err, req, res) => {
        console.error('All Wallet Services are unavailable:', err.message);
        res.status(503).json({
            success: false,
            message: 'Wallet services currently unavailable',
            error: 'Both Node.js and Java backends are offline'
        });
    }
};

// Apply the dynamic proxy to all related wallet paths
const walletPaths = ['/api/wallets', '/api/transactions', '/api/payment-methods', '/api/users'];
walletPaths.forEach(path => {
    app.use(path, createProxyMiddleware(walletProxyOptions));
});

// KYC endpoints belong to Auth Service, not Wallet Service
app.use('/api/kyc', createProxyMiddleware({
  target: AUTH_SERVICE_URL,
  changeOrigin: true,
  proxyTimeout: 20000,
  timeout: 20000,
  pathRewrite: (path, req) => {
    if (path.startsWith('/api/kyc')) return path;
    return `/api/kyc${path}`;
  },
  onProxyRes: proxyLogger,
  onError: (err, req, res) => {
    console.error('Auth Service KYC proxy error:', err);
    res.status(503).json({
      success: false,
      message: 'KYC Service is unavailable',
      error: err.message,
    });
  },
}));

// ==================== GATEWAY-SPECIFIC ENDPOINTS ====================

// Token refresh endpoint (gateway helper)
app.post('/api/gateway/refresh-token', express.json({ limit: '10mb' }), async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/refresh-token`, {
      refreshToken,
    });

    res.status(200).json(response.data);
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      message: 'Failed to refresh token',
      error: error.message,
    });
  }
});

// Gateway status endpoint
app.get('/api/gateway/status', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Gateway is operational',
    uptime: process.uptime(),
    timestamp: new Date(),
    version: '1.0.0',
  });
});

// Request documentation endpoint
app.get('/api/docs', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'NexVault API Gateway Documentation',
    baseUrl: `http://localhost:${PORT}`,
    services: [
      {
        name: 'Authentication Service',
        prefix: '/api/auth',
        endpoints: [
          'POST /api/auth/register',
          'POST /api/auth/login',
          'POST /api/auth/logout',
          'POST /api/auth/logout-all',
          'POST /api/auth/refresh-token',
          'POST /api/auth/verify-email',
          'POST /api/auth/request-password-reset',
          'POST /api/auth/reset-password',
        ],
      },
      {
        name: 'Notification Service',
        prefix: '/api/notifications',
        endpoints: [
          'GET /api/notifications',
          'GET /api/notifications/unread/count',
          'PUT /api/notifications/:id/read',
          'POST /api/notifications/mark-all-read',
          'DELETE /api/notifications/:id',
        ],
      },
      {
        name: 'Wallet Service',
        prefix: '/api/wallets',
        endpoints: [
          'GET /api/wallets/balance',
          'POST /api/wallets/create',
          'GET /api/wallets/:id',
          'PUT /api/wallets/:id/update',
        ],
      },
      {
        name: 'Transaction Service',
        prefix: '/api/transactions',
        endpoints: [
          'POST /api/transactions/transfer',
          'POST /api/transactions/deposit',
          'POST /api/transactions/withdraw',
          'GET /api/transactions/history',
          'GET /api/transactions/:id',
        ],
      },
      {
        name: 'KYC Service',
        prefix: '/api/kyc',
        endpoints: [
          'POST /api/kyc/upload',
          'GET /api/kyc/status',
          'GET /api/kyc/documents',
        ],
      },
    ],
    healthCheck: {
      gateway: '/health',
      services: '/health/services',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path,
    method: req.method,
    suggestion: 'See /api/docs for available endpoints',
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Gateway Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal Gateway Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📡 Auth Service: ${AUTH_SERVICE_URL}`);
  console.log(`💳 Wallet Service: ${WALLET_SERVICE_URL}`);
  console.log(`💳 Wallet Service Java: ${WALLET_SERVICE_JAVA_URL}`);
  console.log(`📧 Notification Service: ${NOTIFICATION_SERVICE_URL}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`✅ Health Check: http://localhost:${PORT}/health`);
});

module.exports = app;
