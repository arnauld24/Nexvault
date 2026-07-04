const express = require('express');
const axios = require('axios');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const User = require('../models/User');
const { query } = require('../config/database');
const { publishEvent } = require('../config/rabbitmq');

const router = express.Router();

console.log('Admin routes loaded');

// ── helpers ────────────────────────────────────────────────────────────────

/**
 * Try to join wallet balance and transaction count for each user.
 * If the wallets / transactions tables don't exist yet (e.g. wallet service
 * hasn't run its migrations), fall back to a plain users query so the admin
 * dashboard still loads.
 */
async function getUsersWithWalletData(limitNum, offsetNum, search) {
  // Build optional search filter
  const searchClause = search && search.trim()
    ? `AND (LOWER(u.email) LIKE $3 OR LOWER(u.first_name || ' ' || u.last_name) LIKE $3)`
    : '';
  const searchParam = search && search.trim() ? [`%${search.toLowerCase()}%`] : [];

  try {
    // Attempt the full query with wallet + transaction JOINs
    const sql = `
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.kyc_status,
        u.account_status,
        u.phone_number,
        u.country,
        u.created_at,
        u.last_login_at,
        COALESCE(wt.total_balance, 0)  AS balance,
        COALESCE(tx.tx_count,   0)     AS transactions_count
      FROM users u
      LEFT JOIN (
        SELECT user_id, SUM(balance) AS total_balance
        FROM wallets
        GROUP BY user_id
      ) wt ON wt.user_id = u.id
      LEFT JOIN (
        SELECT w.user_id, COUNT(*) AS tx_count
        FROM transactions t
        JOIN wallets w ON w.id = t.wallet_id
        GROUP BY w.user_id
      ) tx ON tx.user_id = u.id
      WHERE u.deleted_at IS NULL
      ${searchClause}
      ORDER BY u.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    return await query(sql, [limitNum, offsetNum, ...searchParam]);
  } catch (joinErr) {
    // wallets / transactions tables unavailable – return users without financial data
    console.warn('[admin/users] wallet JOIN failed, falling back to plain query:', joinErr.message);
    const sql = `
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.kyc_status,
        u.account_status,
        u.phone_number,
        u.country,
        u.created_at,
        u.last_login_at,
        0 AS balance,
        0 AS transactions_count
      FROM users u
      WHERE u.deleted_at IS NULL
      ${search && search.trim()
        ? `AND (LOWER(u.email) LIKE $3 OR LOWER(u.first_name || ' ' || u.last_name) LIKE $3)`
        : ''}
      ORDER BY u.created_at DESC
      LIMIT $1 OFFSET $2
    `;
    return await query(sql, [limitNum, offsetNum, ...searchParam]);
  }
}

/**
 * Build an UPDATE for account_status that avoids referencing the
 * `suspension_reason` column (not in the original schema DDL).
 * If the column was added later it still works; if not, no crash.
 */
async function safeSetAccountStatus(userId, status, reason) {
  // Check once whether the column exists
  const colCheck = await query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_name = 'users' AND column_name = 'suspension_reason'
     LIMIT 1`
  );
  const hasColumn = colCheck.rows.length > 0;

  if (hasColumn && reason) {
    return query(
      `UPDATE users
       SET account_status = $1, suspension_reason = $2
       WHERE id = $3 AND deleted_at IS NULL
       RETURNING id, email, account_status`,
      [status, reason, userId]
    );
  }
  return query(
    `UPDATE users
     SET account_status = $1
     WHERE id = $2 AND deleted_at IS NULL
     RETURNING id, email, account_status`,
    [status, userId]
  );
}

// ── USER MANAGEMENT ────────────────────────────────────────────────────────

// Get all users
router.get('/users', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { limit = 50, offset = 0, search = '' } = req.query;
    const limitNum  = Math.max(1, parseInt(limit)  || 50);
    const offsetNum = Math.max(0, parseInt(offset) || 0);

    // Count query (lightweight, no JOINs)
    const countParams = search && search.trim() ? [`%${search.toLowerCase()}%`] : [];
    const countSql = `
      SELECT COUNT(*) AS count FROM users
      WHERE deleted_at IS NULL
      ${search && search.trim()
        ? `AND (LOWER(email) LIKE $1 OR LOWER(first_name || ' ' || last_name) LIKE $1)`
        : ''}
    `;
    const countResult = await query(countSql, countParams);
    const totalCount  = parseInt(countResult.rows[0]?.count) || 0;

    const result = await getUsersWithWalletData(limitNum, offsetNum, search);

    res.status(200).json({
      success: true,
      users: result.rows,
      total: totalCount,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Failed to get users', error: error.message });
  }
});

// Get user statistics
router.get('/users/stats', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const [total, verified, pending, unverified, active, suspended] = await Promise.all([
      query(`SELECT COUNT(*) AS v FROM users WHERE deleted_at IS NULL`),
      query(`SELECT COUNT(*) AS v FROM users WHERE kyc_status = 'verified'    AND deleted_at IS NULL`),
      query(`SELECT COUNT(*) AS v FROM users WHERE kyc_status = 'pending'     AND deleted_at IS NULL`),
      query(`SELECT COUNT(*) AS v FROM users WHERE kyc_status IN ('unverified','rejected') AND deleted_at IS NULL`),
      query(`SELECT COUNT(*) AS v FROM users WHERE account_status = 'active'    AND deleted_at IS NULL`),
      query(`SELECT COUNT(*) AS v FROM users WHERE account_status = 'suspended' AND deleted_at IS NULL`),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers:        parseInt(total.rows[0].v)     || 0,
        verifiedUsers:     parseInt(verified.rows[0].v)  || 0,
        pendingKyc:        parseInt(pending.rows[0].v)   || 0,
        unverifiedUsers:   parseInt(unverified.rows[0].v)|| 0,
        activeAccounts:    parseInt(active.rows[0].v)    || 0,
        suspendedAccounts: parseInt(suspended.rows[0].v) || 0,
      },
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to get user statistics', error: error.message });
  }
});

// Get user details
router.get('/users/:userId', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({ success: false, message: 'Failed to get user details', error: error.message });
  }
});

// Suspend user
router.post('/users/:userId/suspend', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason = 'Suspended by admin' } = req.body;

    const result = await safeSetAccountStatus(userId, 'suspended', reason);

    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'User not found' });

    await publishEvent('nexvault.notifications', 'email', {
      userId,
      email: result.rows[0].email,
      type: 'account_suspended',
      title: 'NexVault Account Suspended',
      message: 'Your NexVault account has been temporarily suspended while we investigate activity. If you believe this is an error, please contact support.',
      data: { reason },
    });

    res.status(200).json({ success: true, message: 'User account suspended', user: result.rows[0] });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ success: false, message: 'Failed to suspend user', error: error.message });
  }
});

// Reactivate user
router.post('/users/:userId/reactivate', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const result = await query(
      `UPDATE users SET account_status = 'active', deleted_at = NULL
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, email, account_status`,
      [req.params.userId]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'User not found' });

    await publishEvent('nexvault.notifications', 'email', {
      userId: req.params.userId,
      email: result.rows[0].email,
      type: 'account_reactivated',
      title: 'NexVault Account Reinstated',
      message: 'Your NexVault account has been reinstated and is now active again. You can log in and continue using your wallet.',
      data: {},
    });

    res.status(200).json({ success: true, message: 'User account reactivated', user: result.rows[0] });
  } catch (error) {
    console.error('Reactivate user error:', error);
    res.status(500).json({ success: false, message: 'Failed to reactivate user', error: error.message });
  }
});

// Disable user (soft-delete)
router.post('/users/:userId/disable', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason = 'Disabled by admin' } = req.body;

    // Set deleted_at + account_status; avoid referencing suspension_reason
    const result = await safeSetAccountStatus(userId, 'disabled', null);
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'User not found' });

    // Soft-delete
    await query(
      `UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [userId]
    );

    await publishEvent('nexvault.notifications', 'email', {
      userId,
      email: result.rows[0].email,
      type: 'account_disabled',
      title: 'NexVault Account Disabled',
      message: 'Your NexVault account has been disabled. If you need assistance or want to restore access, please contact support.',
      data: {},
    });

    res.status(200).json({ success: true, message: 'User account disabled', user: result.rows[0] });
  } catch (error) {
    console.error('Disable user error:', error);
    res.status(500).json({ success: false, message: 'Failed to disable user', error: error.message });
  }
});

// ── DASHBOARD STATISTICS ───────────────────────────────────────────────────

router.get('/dashboard/overview', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const userStats = await Promise.all([
      query(`SELECT COUNT(*) AS v FROM users WHERE deleted_at IS NULL`),
      query(`SELECT COUNT(*) AS v FROM users WHERE kyc_status = 'verified' AND deleted_at IS NULL`),
    ]);

    // KYC pending count — safe regardless of whether kyc_documents table exists
    let pendingKyc = 0;
    try {
      const kycRes = await query(`SELECT COUNT(*) AS v FROM kyc_documents WHERE status = 'pending'`);
      pendingKyc = parseInt(kycRes.rows[0].v) || 0;
    } catch (_) { /* table may not exist */ }

    // Wallet totals — optional
    let totalVolume = 0;
    try {
      const walletRes = await query(`SELECT COALESCE(SUM(balance), 0) AS v FROM wallets`);
      totalVolume = parseFloat(walletRes.rows[0].v) || 0;
    } catch (_) { /* table may not exist */ }

    // Transaction count — optional
    let totalTransactions = 0;
    try {
      const txRes = await query(`SELECT COUNT(*) AS v FROM transactions`);
      totalTransactions = parseInt(txRes.rows[0].v) || 0;
    } catch (_) { /* table may not exist */ }

    res.status(200).json({
      success: true,
      overview: {
        totalUsers:        parseInt(userStats[0].rows[0].v) || 0,
        verifiedUsers:     parseInt(userStats[1].rows[0].v) || 0,
        pendingKyc,
        totalVolume,
        totalTransactions,
      },
    });
  } catch (error) {
    console.error('Get dashboard overview error:', error);
    res.status(500).json({ success: false, message: 'Failed to get dashboard overview', error: error.message });
  }
});

// List and validate pending transactions for admin review
router.get('/transactions', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { status = 'pending', limit = 100, offset = 0 } = req.query;
    const limitNum = Math.max(1, parseInt(limit) || 100);
    const offsetNum = Math.max(0, parseInt(offset) || 0);

    const result = await query(
      `SELECT t.*, 
              w.user_id,
              u.email, u.first_name, u.last_name,
              CONCAT(u.first_name, ' ', u.last_name) as userName
       FROM transactions t
       LEFT JOIN wallets w ON w.id = t.wallet_id
       LEFT JOIN users u ON u.id = w.user_id
       WHERE ($1::text IS NULL OR t.status = $1)
       ORDER BY t.created_at DESC
       LIMIT $2 OFFSET $3`,
      [status || null, limitNum, offsetNum]
    );

    res.status(200).json({ success: true, transactions: result.rows });
  } catch (error) {
    console.error('Get admin transactions error:', error);
    res.status(500).json({ success: false, message: 'Failed to get admin transactions', error: error.message });
  }
});

router.post('/transactions/:reference/validate', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { reference } = req.params;
    if (!reference) return res.status(400).json({ success: false, message: 'reference required' });

    const txResult = await query('SELECT * FROM transactions WHERE reference = $1 LIMIT 1', [reference]);
    if (txResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Transaction not found' });

    const tx = txResult.rows[0];
    if (tx.status === 'completed') return res.status(200).json({ success: true, message: 'Already completed' });

    await query(
      'UPDATE transactions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['completed', tx.id]
    );

    const creditAmount = parseFloat(tx.amount) - parseFloat(tx.fee || 0);
    await query(
      'UPDATE wallets SET balance = balance + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [creditAmount, tx.wallet_id]
    );

    await query(
      'UPDATE transactions SET notes = $1 WHERE id = $2',
      [JSON.stringify({ validatedBy: req.user?.userId || req.user?.id, validatedAt: new Date().toISOString() }), tx.id]
    );

    res.status(200).json({ success: true, message: 'Transaction validated and wallet credited' });
  } catch (error) {
    console.error('Validate admin transaction error:', error);
    res.status(500).json({ success: false, message: 'Validation failed', error: error.message });
  }
});

// Transaction statistics
router.get('/transactions/stats', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { period = '7d' } = req.query;
    let interval = '7 days';
    if (period === '30d') interval = '30 days';
    else if (period === '1m') interval = '1 month';

    let rows = [];
    try {
      const result = await query(
        `SELECT
           DATE(created_at)                                                          AS date,
           COUNT(*)                                                                   AS count,
           COALESCE(SUM(CASE WHEN category IN ('deposit','transfer') THEN amount ELSE 0 END), 0) AS income,
           COALESCE(SUM(CASE WHEN category = 'withdrawal'           THEN amount ELSE 0 END), 0) AS expense,
           COALESCE(SUM(CASE WHEN category = 'transfer'             THEN amount ELSE 0 END), 0) AS transfers,
           COALESCE(SUM(CASE WHEN category = 'deposit'              THEN amount ELSE 0 END), 0) AS deposits,
           COALESCE(SUM(CASE WHEN category = 'withdrawal'           THEN amount ELSE 0 END), 0) AS withdrawals
         FROM transactions
         WHERE DATE(created_at) >= CURRENT_DATE - INTERVAL '${interval}'
         GROUP BY DATE(created_at)
         ORDER BY date DESC`
      );
      rows = result.rows;
    } catch (_) { /* transactions table unavailable */ }

    res.status(200).json({ success: true, stats: rows, period });
  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to get transaction statistics', error: error.message });
  }
});

// Wallet statistics
router.get('/wallets/stats', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    let rows = [];
    try {
      const result = await query(
        `SELECT
           currency,
           COUNT(*)                        AS count,
           COALESCE(SUM(balance),  0)      AS total_balance,
           COALESCE(AVG(balance),  0)      AS average_balance,
           COALESCE(MAX(balance),  0)      AS max_balance,
           COALESCE(MIN(balance),  0)      AS min_balance
         FROM wallets
         GROUP BY currency`
      );
      rows = result.rows;
    } catch (_) { /* wallets table unavailable */ }

    res.status(200).json({ success: true, stats: rows });
  } catch (error) {
    console.error('Get wallet stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to get wallet statistics', error: error.message });
  }
});

// Recent transactions
router.get('/transactions/recent', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const limitNum = Math.max(1, parseInt(req.query.limit) || 6);
    let rows = [];
    try {
      const result = await query(
        `SELECT
           t.id, t.type, t.category, t.amount, t.currency,
           t.status, t.reference, t.created_at,
           w.user_id,
           u.email, u.first_name, u.last_name,
           CONCAT(u.first_name, ' ', u.last_name) as userName
         FROM transactions t
         LEFT JOIN wallets w ON w.id = t.wallet_id
         LEFT JOIN users   u ON u.id = w.user_id
         ORDER BY t.created_at DESC
         LIMIT $1`,
        [limitNum]
      );
      rows = result.rows;
    } catch (_) { /* tables unavailable */ }

    res.status(200).json({ success: true, transactions: rows });
  } catch (error) {
    console.error('Get recent transactions error:', error);
    res.status(500).json({ success: false, message: 'Failed to get recent transactions', error: error.message });
  }
});

// Get pending withdrawals
router.get('/withdrawals/pending', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const limitNum = Math.max(1, parseInt(req.query.limit) || 50);
    let rows = [];
    try {
      const result = await query(
        `SELECT
           t.*, 
           w.user_id,
           u.email, u.first_name, u.last_name,
           CONCAT(u.first_name, ' ', u.last_name) as userName
         FROM transactions t
         LEFT JOIN wallets w ON w.id = t.wallet_id
         LEFT JOIN users u ON u.id = w.user_id
         WHERE t.category = 'withdrawal' AND t.status = 'pending'
         ORDER BY t.created_at DESC
         LIMIT $1`,
        [limitNum]
      );
      rows = result.rows;
    } catch (_) { /* tables unavailable */ }

    res.status(200).json({ success: true, withdrawals: rows });
  } catch (error) {
    console.error('Get pending withdrawals error:', error);
    res.status(500).json({ success: false, message: 'Failed to get pending withdrawals', error: error.message });
  }
});

// Validate/approve a withdrawal
router.post('/withdrawals/:reference/validate', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { reference } = req.params;
    const { note = '' } = req.body;
    
    if (!reference) return res.status(400).json({ success: false, message: 'reference required' });

    const txResult = await query('SELECT * FROM transactions WHERE reference = $1 LIMIT 1', [reference]);
    if (txResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Withdrawal not found' });

    const tx = txResult.rows[0];
    
    if (tx.category !== 'withdrawal') {
      return res.status(400).json({ success: false, message: 'Transaction is not a withdrawal' });
    }

    if (tx.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Cannot validate ${tx.status} withdrawal` });
    }

    // Update transaction status to 'validated'
    const updateResult = await query(
      'UPDATE transactions SET status = $1, note = $2, updated_at = NOW() WHERE reference = $3 RETURNING *',
      ['validated', note, reference]
    );

    const validatedTx = updateResult.rows[0];

    // Get user info for notification
    const userResult = await query('SELECT * FROM users WHERE id = (SELECT user_id FROM wallets WHERE id = $1) LIMIT 1', [validatedTx.wallet_id]);
    const user = userResult.rows[0];

    // Send notification to user
    if (user && user.id) {
      try {
        const amount = (validatedTx.amount / 100).toFixed(2);
        await axios.post(`http://notification-service:3002/api/notifications`, {
          userId: user.id,
          type: 'withdrawal_validated',
          title: '✅ Withdrawal Approved',
          message: `Admin has approved your withdrawal of XAF ${amount}. ${validatedTx.note ? 'Note: ' + validatedTx.note : ''}`,
          data: { transactionId: validatedTx.id, reference, amount },
          priority: 'high'
        }, {
          headers: { 'X-Service-Secret': process.env.INTERNAL_SERVICE_SECRET || 'nexvault-internal-secret' },
          timeout: 5000
        }).catch(err => console.error('User notification failed:', err.message));
      } catch (notifErr) {
        console.error('Notification error:', notifErr.message);
      }
    }

    res.status(200).json({ 
      success: true, 
      message: 'Withdrawal validated successfully',
      transaction: validatedTx
    });
  } catch (error) {
    console.error('Withdraw validation error:', error);
    res.status(500).json({ success: false, message: 'Failed to validate withdrawal', error: error.message });
  }
});

// Reject a withdrawal
router.post('/withdrawals/:reference/reject', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { reference } = req.params;
    const { reason = 'Admin rejection' } = req.body;
    
    if (!reference) return res.status(400).json({ success: false, message: 'reference required' });

    const txResult = await query('SELECT * FROM transactions WHERE reference = $1 LIMIT 1', [reference]);
    if (txResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Withdrawal not found' });

    const tx = txResult.rows[0];
    
    if (tx.category !== 'withdrawal') {
      return res.status(400).json({ success: false, message: 'Transaction is not a withdrawal' });
    }

    if (tx.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Cannot reject ${tx.status} withdrawal` });
    }

    // Update transaction status to 'failed' and note the reason
    const updateResult = await query(
      'UPDATE transactions SET status = $1, note = $2, updated_at = NOW() WHERE reference = $3 RETURNING *',
      ['failed', reason, reference]
    );

    const rejectedTx = updateResult.rows[0];

    // Refund the amount + fee back to the user's wallet
    try {
      const userWallet = await query('SELECT * FROM wallets WHERE id = $1', [rejectedTx.wallet_id]);
      if (userWallet.rows.length > 0) {
        const refundAmount = rejectedTx.amount + (rejectedTx.fee || 0);
        await query(
          'UPDATE wallets SET balance = balance + $1 WHERE id = $2',
          [refundAmount, rejectedTx.wallet_id]
        );
      }
    } catch (refundErr) {
      console.error('Refund error:', refundErr.message);
    }

    // Get user info for notification
    const userResult = await query('SELECT * FROM users WHERE id = (SELECT user_id FROM wallets WHERE id = $1) LIMIT 1', [rejectedTx.wallet_id]);
    const user = userResult.rows[0];

    // Send notification to user
    if (user && user.id) {
      try {
        const amount = (rejectedTx.amount / 100).toFixed(2);
        const refundAmount = ((rejectedTx.amount + (rejectedTx.fee || 0)) / 100).toFixed(2);
        await axios.post(`http://notification-service:3002/api/notifications`, {
          userId: user.id,
          type: 'withdrawal_rejected',
          title: '⚠️ Withdrawal Rejected',
          message: `Your withdrawal request of XAF ${amount} has been rejected. Reason: ${reason}. XAF ${refundAmount} has been refunded to your wallet.`,
          data: { transactionId: rejectedTx.id, reference, amount, refundAmount },
          priority: 'high'
        }, {
          headers: { 'X-Service-Secret': process.env.INTERNAL_SERVICE_SECRET || 'nexvault-internal-secret' },
          timeout: 5000
        }).catch(err => console.error('User notification failed:', err.message));
      } catch (notifErr) {
        console.error('Notification error:', notifErr.message);
      }
    }

    res.status(200).json({ 
      success: true, 
      message: 'Withdrawal rejected and refunded',
      transaction: rejectedTx
    });
  } catch (error) {
    console.error('Withdraw rejection error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject withdrawal', error: error.message });
  }
});

// Top wallet holders
router.get('/wallets/top', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const limitNum = Math.max(1, parseInt(req.query.limit) || 5);
    let rows = [];
    try {
      const result = await query(
        `SELECT
           u.id AS user_id, u.email, u.first_name, u.last_name,
           COALESCE(SUM(w.balance), 0) AS total_balance
         FROM wallets w
         JOIN users u ON u.id = w.user_id
         GROUP BY u.id, u.email, u.first_name, u.last_name
         ORDER BY total_balance DESC
         LIMIT $1`,
        [limitNum]
      );
      rows = result.rows;
    } catch (_) { /* wallets table unavailable */ }

    res.status(200).json({ success: true, topWallets: rows });
  } catch (error) {
    console.error('Get top wallets error:', error);
    res.status(500).json({ success: false, message: 'Failed to get top wallet holders', error: error.message });
  }
});

// ── ADMIN NOTIFICATIONS ────────────────────────────────────────────────────

// Get admin notifications (for all user operations)
router.get('/notifications', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const limitNum = Math.max(1, parseInt(limit) || 50);
    const offsetNum = Math.max(0, parseInt(offset) || 0);

    const result = await query(
      `SELECT * FROM admin_notifications
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limitNum, offsetNum]
    );

    const countResult = await query(`SELECT COUNT(*) AS total FROM admin_notifications`);
    const totalCount = parseInt(countResult.rows[0].total) || 0;

    res.status(200).json({
      success: true,
      notifications: result.rows,
      total: totalCount,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (error) {
    console.error('Get admin notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin notifications',
      error: error.message,
    });
  }
});

// Get unread admin notification count
router.get('/notifications/unread/count', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const result = await query(
      `SELECT COUNT(*) AS count FROM admin_notifications WHERE read = false`
    );

    const count = parseInt(result.rows[0].count) || 0;

    res.status(200).json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      count: 0,
    });
  }
});

// Mark admin notification as read
router.put('/notifications/:notificationId/read', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { notificationId } = req.params;

    const result = await query(
      `UPDATE admin_notifications SET read = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [notificationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      notification: result.rows[0],
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message,
    });
  }
});

// Mark all admin notifications as read
router.post('/notifications/mark-all-read', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const result = await query(
      `UPDATE admin_notifications SET read = true, updated_at = CURRENT_TIMESTAMP
       WHERE read = false
       RETURNING id`
    );

    res.status(200).json({
      success: true,
      message: `${result.rows.length} notification(s) marked as read`,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all as read',
      error: error.message,
    });
  }
});

// Create admin notification (internal endpoint - called by payment/wallet services)
router.post('/notifications', async (req, res) => {
  try {
    const serviceSecret = req.headers['x-service-secret'];
    const internalSecret = process.env.INTERNAL_SERVICE_SECRET || 'nexvault-internal-secret';
    const isInternal = serviceSecret && serviceSecret === internalSecret;

    if (!isInternal) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden - internal service secret required',
      });
    }

    const { type, title, message, data, priority = 'normal' } = req.body;

    if (!type || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'type, title, and message are required',
      });
    }

    // Create admin_notifications table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS admin_notifications (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        data JSONB,
        priority VARCHAR(20) DEFAULT 'normal',
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert notification
    const result = await query(
      `INSERT INTO admin_notifications (type, title, message, data, priority)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [type, title, message, JSON.stringify(data || {}), priority]
    );

    console.log(`[${new Date().toISOString()}] ✓ Admin notification created:`, result.rows[0].id);

    res.status(201).json({
      success: true,
      message: 'Admin notification created',
      notification: result.rows[0],
    });
  } catch (error) {
    console.error('Create admin notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin notification',
      error: error.message,
    });
  }
});

// ── PROFIT & REVENUE TRACKING ──────────────────────────────────────────────────────

/**
 * Get profit/revenue analytics
 * Calculates fees from withdrawals and deposits
 */
router.get('/profit', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { startDate, endDate, period = 'all' } = req.query;

    let dateFilter = '';
    const params = [];

    if (period === 'today') {
      dateFilter = `WHERE DATE(t.created_at) = CURRENT_DATE`;
    } else if (period === 'week') {
      dateFilter = `WHERE t.created_at >= CURRENT_DATE - INTERVAL '7 days'`;
    } else if (period === 'month') {
      dateFilter = `WHERE t.created_at >= CURRENT_DATE - INTERVAL '30 days'`;
    } else if (period === 'year') {
      dateFilter = `WHERE t.created_at >= CURRENT_DATE - INTERVAL '365 days'`;
    } else if (startDate && endDate) {
      dateFilter = `WHERE t.created_at >= $1 AND t.created_at < $2`;
      params.push(startDate, endDate);
    }

    // Get total fees from completed transactions
    const feeQuery = `
      SELECT 
        SUM(CASE WHEN t.category = 'withdrawal' THEN t.fee ELSE 0 END) as withdrawal_fees,
        SUM(CASE WHEN t.category = 'deposit' THEN t.fee ELSE 0 END) as deposit_fees,
        COUNT(*) as total_transactions,
        SUM(CASE WHEN t.category = 'withdrawal' THEN 1 ELSE 0 END) as withdrawal_count,
        SUM(CASE WHEN t.category = 'deposit' THEN 1 ELSE 0 END) as deposit_count
      FROM transactions t
      WHERE t.status = 'completed' ${dateFilter ? 'AND ' + dateFilter.split('WHERE ')[1] : ''}
    `;

    const feeResult = await query(feeQuery, params);
    const fees = feeResult.rows[0] || {};

    // Get transaction volume
    const volumeQuery = `
      SELECT 
        SUM(CASE WHEN t.category = 'deposit' THEN t.amount ELSE 0 END) as deposit_volume,
        SUM(CASE WHEN t.category = 'withdrawal' THEN t.amount ELSE 0 END) as withdrawal_volume
      FROM transactions t
      WHERE t.status = 'completed' ${dateFilter ? 'AND ' + dateFilter.split('WHERE ')[1] : ''}
    `;

    const volumeResult = await query(volumeQuery, params);
    const volume = volumeResult.rows[0] || {};

    // Calculate totals
    const withdrawalFees = parseFloat(fees.withdrawal_fees || 0);
    const depositFees = parseFloat(fees.deposit_fees || 0);
    const totalFees = withdrawalFees + depositFees;
    const depositVolume = parseFloat(volume.deposit_volume || 0);
    const withdrawalVolume = parseFloat(volume.withdrawal_volume || 0);

    res.status(200).json({
      success: true,
      profit: {
        period: period,
        startDate: params[0] || null,
        endDate: params[1] || null,
        totalProfit: totalFees,
        withdrawalFees,
        depositFees,
        transactionCounts: {
          total: parseInt(fees.total_transactions || 0),
          withdrawals: parseInt(fees.withdrawal_count || 0),
          deposits: parseInt(fees.deposit_count || 0),
        },
        volume: {
          deposits: depositVolume,
          withdrawals: withdrawalVolume,
          net: depositVolume - withdrawalVolume,
        }
      }
    });
  } catch (error) {
    console.error('Profit calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate profit',
      error: error.message,
    });
  }
});

/**
 * Get profit breakdown by day/week/month
 */
router.get('/profit/breakdown', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { period = 'day' } = req.query; // day, week, month

    let groupBy = 'DATE(t.created_at)';
    let orderBy = 'DATE(t.created_at) DESC';

    if (period === 'week') {
      groupBy = `DATE_TRUNC('week', t.created_at)`;
      orderBy = `DATE_TRUNC('week', t.created_at) DESC`;
    } else if (period === 'month') {
      groupBy = `DATE_TRUNC('month', t.created_at)`;
      orderBy = `DATE_TRUNC('month', t.created_at) DESC`;
    }

    const breakdownQuery = `
      SELECT 
        ${groupBy} as period,
        SUM(CASE WHEN t.category = 'withdrawal' THEN t.fee ELSE 0 END) as withdrawal_fees,
        SUM(CASE WHEN t.category = 'deposit' THEN t.fee ELSE 0 END) as deposit_fees,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN t.category = 'deposit' THEN t.amount ELSE 0 END) as deposit_volume,
        SUM(CASE WHEN t.category = 'withdrawal' THEN t.amount ELSE 0 END) as withdrawal_volume
      FROM transactions t
      WHERE t.status = 'completed'
      GROUP BY ${groupBy}
      ORDER BY ${orderBy}
      LIMIT 30
    `;

    const result = await query(breakdownQuery);
    
    const breakdown = result.rows.map(row => ({
      period: row.period,
      withdrawalFees: parseFloat(row.withdrawal_fees || 0),
      depositFees: parseFloat(row.deposit_fees || 0),
      totalFees: parseFloat((row.withdrawal_fees || 0)) + parseFloat((row.deposit_fees || 0)),
      transactionCount: parseInt(row.transaction_count || 0),
      depositVolume: parseFloat(row.deposit_volume || 0),
      withdrawalVolume: parseFloat(row.withdrawal_volume || 0),
    }));

    res.status(200).json({
      success: true,
      breakdown,
      period,
    });
  } catch (error) {
    console.error('Profit breakdown error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profit breakdown',
      error: error.message,
    });
  }
});

/**
 * Get withdrawal fee statistics
 */
router.get('/profit/fees', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const feesQuery = `
      SELECT 
        COUNT(*) as total_withdrawals,
        SUM(fee) as total_fees,
        AVG(fee) as avg_fee,
        MIN(fee) as min_fee,
        MAX(fee) as max_fee,
        SUM(amount) as total_withdrawn
      FROM transactions
      WHERE category = 'withdrawal' AND status = 'completed'
    `;

    const result = await query(feesQuery);
    const stats = result.rows[0] || {};

    res.status(200).json({
      success: true,
      feeStats: {
        totalWithdrawals: parseInt(stats.total_withdrawals || 0),
        totalFeesCollected: parseFloat(stats.total_fees || 0),
        averageFee: parseFloat(stats.avg_fee || 0),
        minFee: parseFloat(stats.min_fee || 0),
        maxFee: parseFloat(stats.max_fee || 0),
        totalWithdrawn: parseFloat(stats.total_withdrawn || 0),
      }
    });
  } catch (error) {
    console.error('Fee statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get fee statistics',
      error: error.message,
    });
  }
});

// ── SYSTEM MONITORING ──────────────────────────────────────────────────────

router.get('/health', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const dbResult  = await query('SELECT 1');
    const dbHealthy = dbResult && dbResult.rows.length > 0;

    res.status(200).json({
      success: true,
      health: {
        status:    'healthy',
        database:  dbHealthy ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      success: false,
      message: 'System health check failed',
      health: { status: 'unhealthy', database: 'disconnected', timestamp: new Date().toISOString() },
    });
  }
});

module.exports = router;
