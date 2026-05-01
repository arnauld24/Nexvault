require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const amqp = require('amqplib');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const app = express();

// Configuration
const PORT = process.env.PORT || 3003;
const JWT_SECRET = process.env.JWT_SECRET || 'fbd204a7-318e-4dd3-86e0-e6d524fc3f98';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
const INTERNAL_SERVICE_SECRET = process.env.INTERNAL_SERVICE_SECRET || 'nexvault-internal-secret';

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'FONK2005-',
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'nexvault_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased from 2000ms
  statement_timeout: 30000, // 30s statement timeout
});

// Query function with timeout handling
const query = async (text, params) => {
  const timestamp = new Date().toISOString();
  try {
    console.log(`[${timestamp}] 🔍 Executing Database Query:`);
    console.log(`[${timestamp}]    SQL: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
    if (params && params.length > 0) {
      console.log(`[${timestamp}]    Params: ${JSON.stringify(params).substring(0, 100)}`);
    }
    
    // Set a timeout for the query to prevent hanging
    const queryPromise = pool.query(text, params);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout: Database operation exceeded 30 seconds')), 30000)
    );
    
    const result = await Promise.race([queryPromise, timeoutPromise]);
    
    console.log(`[${timestamp}] ✓ Query Success: ${result.rowCount} rows affected/returned`);
    return result;
  } catch (error) {
    console.error(`[${timestamp}] ✗ Query Failed:`, error.message);
    console.error(`[${timestamp}] ✗ Failed SQL: ${text.substring(0, 150)}`);
    
    // Provide more specific error messages
    if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
      throw new Error('Database connection timeout. The server may be experiencing high load.');
    }
    throw error;
  }
};

// RabbitMQ connection
let rabbitmqChannel = null;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@rabbitmq:5672';

const createAuthNotification = async (authHeader, notificationPayload) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'X-Service-Secret': INTERNAL_SERVICE_SECRET,
    };
    if (authHeader) {
      headers.Authorization = authHeader;
    }

    const response = await axios.post(
      `${AUTH_SERVICE_URL}/api/notifications`,
      notificationPayload,
      { headers, timeout: 10000 }
    );

    return response.data;
  } catch (error) {
    console.error('Auth notification creation failed:', error.message || error);
    return null;
  }
};

// Middleware
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`\n[${timestamp}] 📥 REQUEST RECEIVED`);
  console.log(`[${timestamp}] Method: ${req.method} ${req.path}`);
  console.log(`[${timestamp}] Full URL: ${req.url}`);
  if (req.method !== 'GET' && Object.keys(req.body).length > 0) {
    console.log(`[${timestamp}] Body keys:`, Object.keys(req.body));
  }
  console.log(`[${timestamp}] ═══════════════════════════════════════════════════\n`);
  next();
});

// CORS
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// JWT Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required',
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }
    req.user = user;
    next();
  });
};

// KYC Verification middleware - checks if user has completed KYC
const verifyKYC = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user.id;
    
    // Check KYC status from users table in auth service database
    const result = await query(
      'SELECT kyc_status FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const kycStatus = result.rows[0].kyc_status;

    if (kycStatus !== 'verified') {
      return res.status(403).json({
        success: false,
        message: 'KYC verification required to perform this transaction',
        requiresKYC: true,
        currentStatus: kycStatus,
      });
    }

    next();
  } catch (error) {
    console.error('KYC verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify KYC status',
      error: error.message,
    });
  }
};

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Wallet Service is running',
    timestamp: new Date(),
    database: 'connected',
    rabbitmq: rabbitmqChannel ? 'connected' : 'disconnected',
  });
});

// Initialize RabbitMQ
async function initRabbitMQ() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    rabbitmqChannel = await connection.createChannel();

    // Declare the correct exchange
    await rabbitmqChannel.assertExchange('nexvault.notifications', 'direct', { durable: true });

    console.log('✅ RabbitMQ connected and notifications exchange declared');
  } catch (error) {
    console.error('❌ RabbitMQ connection failed:', error.message);
  }
}

// Initialize database tables if they don't exist
async function initDatabase() {
  try {
    console.log('🔄 Initializing database tables...');

    // Create wallets table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS wallets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE,
        balance DECIMAL(15,2) DEFAULT 0.00 CHECK (balance >= 0),
        currency VARCHAR(3) DEFAULT 'XAF',
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create transactions table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_id UUID NOT NULL,
        type VARCHAR(20) NOT NULL,
        category VARCHAR(50) NOT NULL,
        description TEXT,
        amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'XAF',
        fee DECIMAL(15,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending',
        reference VARCHAR(100),
        from_entity VARCHAR(255),
        to_entity VARCHAR(255),
        bank_name VARCHAR(255),
        account_number VARCHAR(50),
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create kyc_status table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS kyc_status (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'unverified',
        verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database tables initialized with correct schema');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
}

// ==================== WALLET ENDPOINTS ====================

// Get wallet balance
app.get(['/balance', '/api/wallets/balance'], authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    // Get or create wallet for user
    let wallet = await query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [userId]
    );

    if (wallet.rows.length === 0) {
      // Create wallet if it doesn't exist
      wallet = await query(
        'INSERT INTO wallets (user_id) VALUES ($1) RETURNING *',
        [userId]
      );
    }

    res.status(200).json({
      success: true,
      balance: parseFloat(wallet.rows[0].balance || 0),
      currency: wallet.rows[0].currency,
      status: wallet.rows[0].status,
    });
  } catch (error) {
    console.error('Wallet balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve wallet balance',
      error: error.message,
    });
  }
});

// Create wallet (if needed)
app.post('/api/wallets', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currency = 'XAF' } = req.body;

    // Check if wallet already exists
    const existing = await query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [userId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Wallet already exists for this user',
      });
    }

    // Create new wallet
    const wallet = await query(
      'INSERT INTO wallets (user_id, currency) VALUES ($1, $2) RETURNING *',
      [userId, currency]
    );

    res.status(201).json({
      success: true,
      wallet: {
        id: wallet.rows[0].id,
        userId: wallet.rows[0].user_id,
        balance: parseFloat(wallet.rows[0].balance),
        currency: wallet.rows[0].currency,
        status: wallet.rows[0].status,
      },
    });
  } catch (error) {
    console.error('Create wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create wallet',
      error: error.message,
    });
  }
});

// ==================== KYC ENDPOINTS ====================

// Get KYC status
app.get(['/status', '/api/kyc/status'], authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 🔍 Fetching KYC status for user: ${userId}`);

    // Get KYC status from auth service database
    const user = await query(
      'SELECT kyc_status, kyc_verified_at FROM users WHERE id = $1',
      [userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const kycStatus = user.rows[0].kyc_status || 'unverified';
    const isVerified = kycStatus === 'verified';

    // Define transaction capabilities based on KYC status
    const capabilities = {
      canTransfer: isVerified,
      canWithdraw: isVerified,
      canDeposit: true, // Everyone can deposit
      canViewBalance: true, // Everyone can view balance
      maxTransactionAmount: isVerified ? 10000 : 100, // Limited for unverified users
      dailyLimit: isVerified ? 50000 : 500,
    };

    res.status(200).json({
      success: true,
      kycStatus,
      verified: isVerified,
      verifiedAt: user.rows[0].kyc_verified_at,
      transactionCapabilities: capabilities,
      message: isVerified 
        ? 'KYC verification completed. You can perform all transactions.' 
        : 'KYC verification required to perform transfers and withdrawals.',
    });
  } catch (error) {
    console.error('KYC status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve KYC status',
      error: error.message,
    });
  }
});

// ==================== TRANSACTION ENDPOINTS ====================

// Get transaction history
app.get(['/history', '/api/transactions/history'], authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { limit = 50, offset = 0 } = req.query;

    // Get wallet for user
    const walletResult = await query(
      'SELECT id FROM wallets WHERE user_id = $1',
      [userId]
    );

    if (walletResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found',
      });
    }

    const walletId = walletResult.rows[0].id;

    const result = await query(
      'SELECT * FROM transactions WHERE wallet_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [walletId, parseInt(limit), parseInt(offset)]
    );

    const totalResult = await query(
      'SELECT COUNT(*) FROM transactions WHERE wallet_id = $1',
      [walletId]
    );

    res.status(200).json({
      success: true,
      transactions: result.rows.map(tx => ({
        id: tx.id,
        type: tx.type,
        category: tx.category,
        description: tx.description,
        amount: parseFloat(tx.amount),
        currency: tx.currency,
        status: tx.status,
        reference: tx.reference,
        fee: parseFloat(tx.fee),
        from: tx.from_entity,
        to: tx.to_entity,
        date: tx.created_at.toISOString(),
        note: tx.note,
      })),
      total: parseInt(totalResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('Transaction history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transaction history',
      error: error.message,
    });
  }
});

// Deposit endpoint
app.post(['/deposit', '/api/transactions/deposit'], authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, method, currency = 'XAF', reference } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required',
      });
    }

    // Get wallet for user
    const walletCheck = await query(
      'SELECT id FROM wallets WHERE user_id = $1',
      [userId]
    );

    if (walletCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found',
      });
    }

    const walletId = walletCheck.rows[0].id;

    const isCard = method === 'card';
    const fee = isCard ? amount * 0.015 : 0;
    const status = isCard ? 'completed' : 'pending';
    const txRef = reference || `DEP-${Date.now().toString().slice(-8)}`;

    const txResult = await query(
      `INSERT INTO transactions (wallet_id, type, category, description, amount, currency, fee, status, reference, from_entity, to_entity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [walletId, 'credit', 'deposit', `Deposit via ${method}`, amount, currency, fee, status, txRef, method, 'My Wallet']
    );

    await query(
      'UPDATE wallets SET balance = balance + $1 WHERE user_id = $2',
      [amount - fee, userId]
    );

    const walletResult = await query(
      'SELECT balance FROM wallets WHERE user_id = $1',
      [userId]
    );

    // Get user email for notification
    const userResult = await query(
      'SELECT email FROM users WHERE id = $1',
      [userId]
    );

    const userEmail = userResult.rows[0]?.email;

    if (rabbitmqChannel && userEmail) {
      await rabbitmqChannel.publish(
        'nexvault.notifications',
        'email',
        Buffer.from(JSON.stringify({
          type: 'deposit',
          email: userEmail,
          title: 'Deposit Received',
          message: `Your deposit of ${currency} ${amount} has been ${isCard ? 'completed' : 'initiated'}`,
          data: { reference: txRef, amount, method },
        }))
      );
    }

    await createAuthNotification(req.headers.authorization, {
      userId,
      type: 'transaction',
      title: 'Deposit Received',
      message: `Your deposit of ${currency} ${amount} has been ${isCard ? 'completed' : 'initiated'}`,
      data: { transactionId: txResult.rows[0].id, transactionRef: txRef, amount, method, transactionType: 'deposit' },
      priority: 'normal',
    });

    res.status(200).json({
      success: true,
      message: 'Deposit processed successfully',
      transaction: {
        id: txResult.rows[0].id,
        type: 'credit',
        amount: parseFloat(amount),
        currency,
        fee: parseFloat(fee),
        status,
        reference: txRef,
      },
      balance: parseFloat(walletResult.rows[0].balance),
    });
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process deposit',
      error: error.message,
    });
  }
});

// Transfer endpoint
app.post(['/transfer', '/api/transactions/transfer'], authenticateToken, verifyKYC, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { recipientEmail, amount, note, currency = 'XAF' } = req.body;

    if (!recipientEmail || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email and valid amount are required',
      });
    }

    // Get sender wallet
    const senderWalletResult = await query(
      'SELECT id, balance FROM wallets WHERE user_id = $1',
      [userId]
    );

    if (senderWalletResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sender wallet not found',
      });
    }

    const senderWalletId = senderWalletResult.rows[0].id;
    const senderBalance = senderWalletResult.rows[0].balance;

    const fee = 0.50;
    const totalDebit = parseFloat(amount) + fee;

    if (senderBalance < totalDebit) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance for transfer',
      });
    }

    const recipientResult = await query(
      'SELECT id, email FROM users WHERE email = $1',
      [recipientEmail]
    );

    if (recipientResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recipient user not found',
      });
    }

    const recipientId = recipientResult.rows[0].id;

    // Get recipient wallet
    const recipientWalletResult = await query(
      'SELECT id FROM wallets WHERE user_id = $1',
      [recipientId]
    );

    if (recipientWalletResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Recipient wallet not found',
      });
    }

    const recipientWalletId = recipientWalletResult.rows[0].id;
    const recipientName = recipientEmail.split('@')[0];
    const txRef = `TRF-${Date.now().toString().slice(-8)}`;

    await query(
      `INSERT INTO transactions (wallet_id, type, category, description, amount, currency, fee, status, reference, from_entity, to_entity, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [senderWalletId, 'debit', 'transfer', `Transfer to ${recipientName}`, amount, currency, fee, 'completed', txRef, 'My Wallet', recipientEmail, note || '']
    );

    await query(
      'UPDATE wallets SET balance = balance - $1 WHERE user_id = $2',
      [totalDebit, userId]
    );

    await query(
      'UPDATE wallets SET balance = balance + $1 WHERE user_id = $2',
      [amount, recipientId]
    );

    // Get sender and recipient emails for notifications and transfer metadata
    const senderEmailResult = await query(
      'SELECT email FROM users WHERE id = $1',
      [userId]
    );

    const recipientEmailResult = await query(
      'SELECT email FROM users WHERE id = $1',
      [recipientId]
    );

    const senderEmail = senderEmailResult.rows[0]?.email;
    const recipientEmailAddress = recipientEmailResult.rows[0]?.email || recipientEmail;

    await query(
      `INSERT INTO transactions (wallet_id, type, category, description, amount, currency, fee, status, reference, from_entity, to_entity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [recipientWalletId, 'credit', 'transfer', `Transfer from ${recipientName}`, amount, currency, 0, 'completed', txRef, senderEmail || 'My Wallet', 'My Wallet']
    );

    const updatedSenderBalance = await query(
      'SELECT balance FROM wallets WHERE user_id = $1',
      [userId]
    );

    if (rabbitmqChannel) {
      // Notify sender
      if (senderEmail) {
        await rabbitmqChannel.publish(
          'nexvault.notifications',
          'email',
          Buffer.from(JSON.stringify({
            type: 'transfer',
            email: senderEmail,
            title: 'Transfer Sent',
            message: `You sent ${currency} ${amount} to ${recipientEmail}`,
            data: { reference: txRef, recipient: recipientEmail, amount },
          }))
        );
      }

      // Notify recipient
      if (recipientEmailAddress) {
        await rabbitmqChannel.publish(
          'nexvault.notifications',
          'email',
          Buffer.from(JSON.stringify({
            type: 'transfer',
            email: recipientEmailAddress,
            title: 'Transfer Received',
            message: `You received ${currency} ${amount} from ${senderEmail || 'another user'}`,
            data: { reference: txRef, sender: senderEmail, amount },
          }))
        );
      }
    }

    await createAuthNotification(req.headers.authorization, {
      userId,
      type: 'transaction',
      title: 'Transfer Sent',
      message: `You sent ${currency} ${amount} to ${recipientEmail}`,
      data: { transactionRef: txRef, amount, recipientEmail, transactionType: 'transfer' },
      priority: 'normal',
    });

    await createAuthNotification(req.headers.authorization, {
      userId: recipientId,
      type: 'transaction',
      title: 'Transfer Received',
      message: `You received ${currency} ${amount} from ${senderEmail || 'another user'}`,
      data: { transactionRef: txRef, amount, senderEmail, transactionType: 'transfer' },
      priority: 'normal',
    });

    res.status(200).json({
      success: true,
      message: 'Transfer sent successfully',
      transaction: {
        id: txRef,
        type: 'debit',
        amount: parseFloat(amount),
        currency,
        fee,
        status: 'completed',
        recipient: recipientEmail,
        reference: txRef,
      },
      balance: parseFloat(updatedSenderBalance.rows[0].balance),
    });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process transfer',
      error: error.message,
    });
  }
});

// Withdraw endpoint
app.post(['/withdraw', '/api/transactions/withdraw'], authenticateToken, verifyKYC, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, bankDetails, currency = 'XAF' } = req.body;

    if (!amount || amount <= 0 || !bankDetails) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount and bank details are required',
      });
    }

    // Get wallet for user
    const walletCheck = await query(
      'SELECT id, balance FROM wallets WHERE user_id = $1',
      [userId]
    );

    if (walletCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found',
      });
    }

    const walletId = walletCheck.rows[0].id;
    const currentBalance = walletCheck.rows[0].balance;

    if (currentBalance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance for withdrawal',
      });
    }

    const fee = 0;
    const txRef = `WDR-${Date.now().toString().slice(-8)}`;

    await query(
      `INSERT INTO transactions (wallet_id, type, category, description, amount, currency, fee, status, reference, from_entity, to_entity, bank_name, account_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [walletId, 'debit', 'withdrawal', `Withdrawal to ${bankDetails.bankName}`, amount, currency, fee, 'pending', txRef, 'My Wallet', bankDetails.bankName, bankDetails.bankName, bankDetails.accountNumber]
    );

    await query(
      'UPDATE wallets SET balance = balance - $1 WHERE user_id = $2',
      [amount, userId]
    );

    const updatedWallet = await query(
      'SELECT balance FROM wallets WHERE user_id = $1',
      [userId]
    );

    // Get user email for notification
    const userEmailResult = await query(
      'SELECT email FROM users WHERE id = $1',
      [userId]
    );

    const userEmail = userEmailResult.rows[0]?.email;

    if (rabbitmqChannel && userEmail) {
      await rabbitmqChannel.publish(
        'nexvault.notifications',
        'email',
        Buffer.from(JSON.stringify({
          type: 'withdrawal',
          email: userEmail,
          title: 'Withdrawal Initiated',
          message: `Your withdrawal of ${currency} ${amount} to ${bankDetails.bankName} has been initiated and will be processed in 1-3 business days`,
          data: { reference: txRef, amount, bankName: bankDetails.bankName },
        }))
      );
    }

    await createAuthNotification(req.headers.authorization, {
      userId,
      type: 'transaction',
      title: 'Withdrawal Initiated',
      message: `Your withdrawal of ${currency} ${amount} to ${bankDetails.bankName} has been initiated and will be processed in 1-3 business days`,
      data: { transactionRef: txRef, amount, bankName: bankDetails.bankName, transactionType: 'withdrawal' },
      priority: 'normal',
    });

    res.status(200).json({
      success: true,
      message: 'Withdrawal initiated successfully',
      transaction: {
        id: txRef,
        type: 'debit',
        amount: parseFloat(amount),
        currency,
        status: 'pending',
        reference: txRef,
      },
      balance: parseFloat(updatedWallet.rows[0].balance),
    });
  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process withdrawal',
      error: error.message,
    });
  }
});

// Email receipt endpoint
app.post(['/transactions/:id/receipt', '/api/transactions/:id/receipt'], authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const txResult = await query(
      `SELECT t.*, u.email as user_email
       FROM transactions t
       JOIN wallets w ON w.id = t.wallet_id
       JOIN users u ON u.id = w.user_id
       WHERE w.user_id = $1
         AND (t.id::text = $2 OR t.reference = $2)`,
      [userId, id]
    );

    if (txResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    const tx = txResult.rows[0];
    const userEmail = tx.user_email;
    const receiptData = {
      transactionId: tx.id,
      reference: tx.reference,
      category: tx.category,
      type: tx.type,
      amount: tx.amount,
      currency: tx.currency,
      fee: tx.fee,
      status: tx.status,
      from: tx.from_entity,
      to: tx.to_entity,
      date: tx.created_at?.toISOString?.() || tx.created_at || new Date().toISOString(),
      note: tx.note,
    };

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        message: 'Unable to resolve user email for receipt',
      });
    }

    if (rabbitmqChannel) {
      await rabbitmqChannel.publish(
        'nexvault.notifications',
        'email',
        Buffer.from(JSON.stringify({
          type: 'receipt',
          email: userEmail,
          title: 'Your NexVault Transaction Receipt',
          message: `Your transaction receipt for ${receiptData.reference} is ready.`,
          data: receiptData,
        }))
      );
    }

    res.status(200).json({
      success: true,
      message: 'Transaction receipt is being emailed',
    });
  } catch (error) {
    console.error('Receipt email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to email transaction receipt',
      error: error.message,
    });
  }
});

// ==================== USER STATISTICS ENDPOINT ====================

// Get user statistics (monthly income/expense aggregates for dashboard chart)
app.get('/api/users/statistics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get wallet for user
    const walletResult = await query(
      'SELECT id FROM wallets WHERE user_id = $1',
      [userId]
    );

    if (walletResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found',
      });
    }

    const walletId = walletResult.rows[0].id;

    // Get monthly aggregates for last 6 months
    const monthlyResult = await query(
      `SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as month,
        SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as expense
      FROM transactions
      WHERE wallet_id = $1
        AND created_at >= CURRENT_DATE - INTERVAL '6 months'
        AND status = 'completed'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY DATE_TRUNC('month', created_at)`,
      [walletId]
    );

    // Get total income and expense
    const totalsResult = await query(
      `SELECT
        SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as total_income,
        SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as total_expense,
        COUNT(*) as total_transactions
      FROM transactions
      WHERE wallet_id = $1 AND status = 'completed'`,
      [walletId]
    );

    // Format chart data - ensure all 6 months are present
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = months[d.getMonth()];
      const dbRow = monthlyResult.rows.find(r => r.month === monthLabel);
      chartData.push({
        month: monthLabel,
        income: parseFloat(dbRow?.income || 0),
        expense: parseFloat(dbRow?.expense || 0),
      });
    }

    res.status(200).json({
      success: true,
      chartData,
      totals: {
        totalIncome: parseFloat(totalsResult.rows[0]?.total_income || 0),
        totalExpense: parseFloat(totalsResult.rows[0]?.total_expense || 0),
        totalTransactions: parseInt(totalsResult.rows[0]?.total_transactions || 0),
      },
    });
  } catch (error) {
    console.error('User statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user statistics',
      error: error.message,
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: error.message,
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Start server
async function startServer() {
  try {
    // Initialize database
    await initDatabase();

    // Initialize RabbitMQ
    await initRabbitMQ();

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Wallet Service running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');
  await pool.end();
  if (rabbitmqChannel) {
    await rabbitmqChannel.close();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await pool.end();
  if (rabbitmqChannel) {
    await rabbitmqChannel.close();
  }
  process.exit(0);
});

startServer();