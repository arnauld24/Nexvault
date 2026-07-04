require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const axios = require('axios');
const fapshi = require('./fapshi-payments/fapshi');

const app = express();
const PORT = process.env.PORT || 3010;
const WALLET_SERVICE_URL = process.env.WALLET_SERVICE_URL || 'http://wallet-service:3003';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3002';
const INTERNAL_SERVICE_SECRET = process.env.INTERNAL_SERVICE_SECRET || 'nexvault-internal-secret';

app.use(helmet());
app.use(express.json({limit: '10mb'}));

// ==================== WITHDRAWAL FEE CONFIGURATION ====================
// Withdrawal fees: Fixed fee + percentage based on amount
const WITHDRAWAL_FEES = {
  fixed: parseInt(process.env.WITHDRAWAL_FEE_FIXED || '50', 10), // 50 XAF fixed fee
  percentage: parseFloat(process.env.WITHDRAWAL_FEE_PERCENTAGE || '1.5') / 100, // 1.5% percentage
  tiers: [
    { max: 10000, percentage: 2.0 / 100 },   // 2% for amounts up to 10,000
    { max: 50000, percentage: 1.5 / 100 },   // 1.5% for amounts up to 50,000
    { max: 200000, percentage: 1.0 / 100 },  // 1% for amounts up to 200,000
    { max: Infinity, percentage: 0.5 / 100 } // 0.5% for larger amounts
  ],
  minWithdrawal: parseInt(process.env.MIN_WITHDRAWAL || '500', 10),     // Minimum 500 XAF
  maxWithdrawal: parseInt(process.env.MAX_WITHDRAWAL || '1000000', 10)  // Maximum 1,000,000 XAF
};

/**
 * Calculate withdrawal fee based on amount
 * Uses tiered percentage + fixed fee
 */
function calculateWithdrawalFee(amount) {
  const tier = WITHDRAWAL_FEES.tiers.find(t => amount <= t.max);
  const percentageFee = Math.round(amount * (tier?.percentage || 0.5 / 100));
  const totalFee = WITHDRAWAL_FEES.fixed + percentageFee;
  return { fixed: WITHDRAWAL_FEES.fixed, percentage: percentageFee, total: totalFee };
}

/**
 * Validate withdrawal request
 */
function validateWithdrawal(amount) {
  if (!Number.isInteger(amount) || amount < WITHDRAWAL_FEES.minWithdrawal) {
    return { valid: false, error: `Minimum withdrawal is XAF ${WITHDRAWAL_FEES.minWithdrawal}` };
  }
  if (amount > WITHDRAWAL_FEES.maxWithdrawal) {
    return { valid: false, error: `Maximum withdrawal is XAF ${WITHDRAWAL_FEES.maxWithdrawal}` };
  }
  return { valid: true };
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Payment Service is running',
    timestamp: new Date(),
  });
});


// Initiate a direct mobile-money payment (MTN or ORANGE) via Fapshi
app.post('/api/payments/direct', async (req, res) => {
  try {
    const { userId, amount, phone, medium, currency = 'XAF', reference } = req.body;
    if(!userId || !amount || !phone || !medium) return res.status(400).json({ success: false, message: 'userId, amount, phone and medium are required' });
    const intAmount = parseInt(amount, 10);
    if(Number.isNaN(intAmount) || intAmount < 100) return res.status(400).json({ success:false, message: 'amount must be an integer >= 100' });

    // create pending transaction in wallet service
    const txRef = reference || `DEP-${Date.now().toString().slice(-8)}`;
    const createResp = await axios.post(`${WALLET_SERVICE_URL}/internal/transactions/create-pending`, {
      userId, amount: intAmount, method: medium, currency, reference: txRef
    }, {
      headers: { 'X-Service-Secret': INTERNAL_SERVICE_SECRET },
      timeout: 8000,
    });

    if(!createResp.data || !createResp.data.success) {
      return res.status(500).json({ success: false, message: 'Failed to create pending transaction', detail: createResp.data });
    }

    // call fapshi directPay
    const payData = { amount: intAmount, phone: phone.toString(), medium, userId, externalId: txRef };
    const fResp = await fapshi.directPay(payData);

    res.status(200).json({ success: true, fapshi: fResp, reference: txRef });
  } catch (error) {
    console.error('Direct payment error:', error.message || error);
    res.status(500).json({ success: false, message: 'Direct payment failed', error: error.message });
  }
});

// Initiate a redirect/paylink payment
app.post('/api/payments/initiate', async (req, res) => {
  try {
    const { userId, amount, email, redirectUrl, message, currency = 'XAF', reference } = req.body;
    if(!userId || !amount) return res.status(400).json({ success:false, message: 'userId and amount required' });
    const intAmount = parseInt(amount, 10);
    if(Number.isNaN(intAmount) || intAmount < 100) return res.status(400).json({ success:false, message: 'amount must be integer >= 100' });

    const txRef = reference || `DEP-${Date.now().toString().slice(-8)}`;
    const createResp = await axios.post(`${WALLET_SERVICE_URL}/internal/transactions/create-pending`, {
      userId, amount: intAmount, method: 'fapshi-paylink', currency, reference: txRef
    }, { headers: { 'X-Service-Secret': INTERNAL_SERVICE_SECRET }, timeout: 8000 });

    if(!createResp.data || !createResp.data.success) {
      return res.status(500).json({ success: false, message: 'Failed to create pending transaction', detail: createResp.data });
    }

    const data = { amount: intAmount, email, userId, externalId: txRef, redirectUrl, message };
    const fResp = await fapshi.initiatePay(data);

    res.status(200).json({ success: true, fapshi: fResp, reference: txRef });
  } catch (error) {
    console.error('Initiate payment error:', error.message || error);
    res.status(500).json({ success: false, message: 'Initiate payment failed', error: error.message });
  }
});

// Webhook endpoint to receive Fapshi events
app.post('/api/payments/webhook', async (req, res) => {
  try {
    const { transId } = req.body;
    if(!transId) return res.status(400).send({ message: 'transId required' });

    const event = await fapshi.paymentStatus(transId);
    if(event.statusCode !== 200) return res.status(400).send({ message: event.message || 'invalid event' });

    // If successful, notify wallet service to complete the pending transaction
    if(event.status === 'SUCCESSFUL' || event.status === 'successful') {
      // event should contain externalId (our reference) or userId
      const reference = event.externalId || event.external_id || event.externalid || event.userId || event.user_id || event.reference || event.transId || transId;
      const completeResp = await axios.post(`${WALLET_SERVICE_URL}/internal/transactions/complete`, { reference, event }, { headers: { 'X-Service-Secret': INTERNAL_SERVICE_SECRET }, timeout: 8000 });
      
      // Send notification to user about deposit
      try {
        const transaction = completeResp.data?.transaction;
        if (transaction && transaction.user_id) {
          const amount = transaction.amount ? (transaction.amount / 100).toFixed(2) : 'unknown';
          
          // Create user notification
          await axios.post(`${NOTIFICATION_SERVICE_URL}/api/notifications`, {
            userId: transaction.user_id,
            type: 'deposit',
            title: '✅ Deposit Received',
            message: `You've successfully received XAF ${amount} into your wallet. Check your wallet for confirmation.`,
            data: { transactionId: transaction.id, reference, amount },
            priority: 'high'
          }, {
            headers: { 'X-Service-Secret': INTERNAL_SERVICE_SECRET },
            timeout: 5000
          }).catch(err => console.error('User notification failed:', err.message));

          // Create admin notification
          await axios.post(`${NOTIFICATION_SERVICE_URL}/admin/notifications`, {
            type: 'deposit_received',
            title: '💳 New Deposit Received',
            message: `User received XAF ${amount} deposit (Ref: ${reference})`,
            data: { userId: transaction.user_id, transactionId: transaction.id, reference, amount },
            priority: 'normal'
          }, {
            headers: { 'X-Service-Secret': INTERNAL_SERVICE_SECRET },
            timeout: 5000
          }).catch(err => console.error('Admin notification failed:', err.message));
        }
      } catch (notifErr) {
        console.error('Notification error:', notifErr.message);
        // Don't fail the webhook - notifications are non-critical
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook handling error:', error.message || error);
    res.status(500).json({ success: false, message: 'Webhook processing failed', error: error.message });
  }
});

// ==================== WITHDRAWAL ENDPOINTS ====================
// Initiate a withdrawal (supports bank account and mobile money)
app.post('/api/payments/withdraw', async (req, res) => {
  try {
    const { userId, amount, withdrawalType, bankDetails, mobileDetails } = req.body;
    
    // Validate inputs
    if(!userId || !amount || !withdrawalType) {
      return res.status(400).json({ success: false, message: 'userId, amount, and withdrawalType are required' });
    }

    if (withdrawalType === 'bank') {
      if (!bankDetails || !bankDetails.bankName || !bankDetails.accountNumber) {
        return res.status(400).json({ success: false, message: 'bankDetails with bankName and accountNumber are required for bank withdrawal' });
      }
    } else if (withdrawalType === 'mobile') {
      if (!mobileDetails || !mobileDetails.phone || !mobileDetails.provider) {
        return res.status(400).json({ success: false, message: 'mobileDetails with phone and provider are required for mobile withdrawal' });
      }
    } else {
      return res.status(400).json({ success: false, message: 'withdrawalType must be "bank" or "mobile"' });
    }

    const intAmount = parseInt(amount, 10);
    
    // Validate withdrawal amount
    const validation = validateWithdrawal(intAmount);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    // For mobile withdrawals, validate phone format
    if (withdrawalType === 'mobile') {
      const phone = mobileDetails.phone;
      if (typeof phone !== 'string' || !/^6[\d]{8}$/.test(phone)) {
        return res.status(400).json({ success: false, message: 'Invalid phone number format' });
      }
    }

    // Calculate withdrawal fee
    const feeBreakdown = calculateWithdrawalFee(intAmount);
    const totalDebit = intAmount + feeBreakdown.total;
    
    console.log(`[Withdrawal] User: ${userId}, Type: ${withdrawalType}, Amount: ${intAmount}, Fee: ${feeBreakdown.total}, Total Debit: ${totalDebit}`);

    // Check wallet balance via wallet service
    try {
      const balanceResp = await axios.get(`${WALLET_SERVICE_URL}/internal/wallet-balance/${userId}`, {
        headers: { 'X-Service-Secret': INTERNAL_SERVICE_SECRET },
        timeout: 8000,
      });

      if (!balanceResp.data?.success || !balanceResp.data?.balance) {
        return res.status(500).json({ success: false, message: 'Failed to check wallet balance' });
      }

      const currentBalance = parseFloat(balanceResp.data.balance);
      
      if (currentBalance < totalDebit) {
        return res.status(400).json({ 
          success: false, 
          message: 'Insufficient balance for withdrawal',
          available: currentBalance,
          required: totalDebit,
          shortfall: totalDebit - currentBalance
        });
      }
    } catch (balanceErr) {
      console.error('Balance check error:', balanceErr.message);
      return res.status(500).json({ success: false, message: 'Failed to verify wallet balance', error: balanceErr.message });
    }

    // Create pending withdrawal transaction
    const txRef = `WD-${Date.now().toString().slice(-8)}`;
    const txPayload = {
      userId,
      amount: intAmount,
      fee: feeBreakdown.total,
      totalDebit: totalDebit,
      reference: txRef,
      feeBreakdown,
      withdrawalType,
      ...(withdrawalType === 'mobile' && {
        phone: mobileDetails.phone,
        provider: mobileDetails.provider,
        mobileAccountName: mobileDetails.accountName
      }),
      ...(withdrawalType === 'bank' && {
        bankName: bankDetails.bankName,
        accountNumber: bankDetails.accountNumber,
        accountName: bankDetails.accountName
      })
    };

    try {
      const createResp = await axios.post(`${WALLET_SERVICE_URL}/internal/transactions/create-withdrawal`, txPayload, {
        headers: { 'X-Service-Secret': INTERNAL_SERVICE_SECRET },
        timeout: 8000,
      });

      if(!createResp.data || !createResp.data.success) {
        return res.status(500).json({ success: false, message: 'Failed to create withdrawal transaction', detail: createResp.data });
      }
    } catch (txErr) {
      console.error('Transaction creation error:', txErr.message);
      return res.status(500).json({ success: false, message: 'Failed to create withdrawal transaction', error: txErr.message });
    }

    // Handle bank vs mobile withdrawal
    if (withdrawalType === 'bank') {
      // For bank withdrawal, we don't call Fapshi immediately
      // Return success and mark as pending (admin approval workflow)
      return res.status(200).json({ 
        success: true, 
        reference: txRef,
        amount: intAmount,
        fee: feeBreakdown.total,
        netAmount: intAmount,
        bankDetails: {
          bankName: bankDetails.bankName,
          accountNumber: `••••${bankDetails.accountNumber.slice(-4)}`
        },
        message: `Bank withdrawal submitted for processing. Fee: XAF ${feeBreakdown.total}. Admin will verify and process within 1-3 business days.`
      });
    } else {
      // For mobile withdrawal, initiate Fapshi payout
      const payoutData = { 
        amount: intAmount, 
        phone: mobileDetails.phone.toString(), 
        userId, 
        externalId: txRef,
        provider: mobileDetails.provider,
        message: `NexVault Withdrawal - ${intAmount} XAF`
      };

      let fResp;
      try {
        fResp = await fapshi.payout(payoutData);
      } catch (fapshiErr) {
        console.error('Fapshi payout error:', fapshiErr.message);
        // Mark transaction as failed
        try {
          await axios.post(`${WALLET_SERVICE_URL}/internal/transactions/fail-withdrawal`, {
            reference: txRef
          }, {
            headers: { 'X-Service-Secret': INTERNAL_SERVICE_SECRET },
            timeout: 5000,
          }).catch(e => console.error('Rollback failed:', e.message));
        } catch (e) {
          console.error('Rollback error:', e.message);
        }
        return res.status(400).json({ success: false, message: 'Withdrawal initiation failed', error: fapshiErr.message });
      }

      if (fResp.statusCode !== 200 && fResp.statusCode !== 201) {
        // Mark transaction as failed
        try {
          await axios.post(`${WALLET_SERVICE_URL}/internal/transactions/fail-withdrawal`, {
            reference: txRef
          }, {
            headers: { 'X-Service-Secret': INTERNAL_SERVICE_SECRET },
            timeout: 5000,
          }).catch(e => console.error('Rollback failed:', e.message));
        } catch (e) {
          console.error('Rollback error:', e.message);
        }
        
        return res.status(400).json({ success: false, message: 'Mobile money withdrawal failed', fapshi: fResp });
      }

      res.status(200).json({ 
        success: true, 
        reference: txRef,
        amount: intAmount,
        fee: feeBreakdown.total,
        netAmount: intAmount,
        provider: mobileDetails.provider === 'orange' ? 'Orange Money' : 'MTN Mobile Money',
        fapshi: fResp,
        message: `Mobile money withdrawal initiated. Fee: XAF ${feeBreakdown.total}. Funds should arrive within 1-5 minutes.`
      });
    }
  } catch (error) {
    console.error('Withdrawal error:', error.message || error);
    res.status(500).json({ success: false, message: 'Withdrawal failed', error: error.message });
  }
});

// Withdrawal webhook (receives Fapshi payout status updates)
app.post('/api/payments/withdrawal-webhook', async (req, res) => {
  try {
    const { transId } = req.body;
    if(!transId) return res.status(400).send({ message: 'transId required' });

    const event = await fapshi.paymentStatus(transId);
    if(event.statusCode !== 200) return res.status(400).send({ message: event.message || 'invalid event' });

    // If successful, notify wallet service to complete the withdrawal
    if(event.status === 'SUCCESSFUL' || event.status === 'successful') {
      const reference = event.externalId || event.external_id || event.externalid || event.userId || event.user_id || event.reference || event.transId || transId;
      
      try {
        const completeResp = await axios.post(`${WALLET_SERVICE_URL}/internal/transactions/complete-withdrawal`, { 
          reference, 
          event 
        }, { 
          headers: { 'X-Service-Secret': INTERNAL_SERVICE_SECRET }, 
          timeout: 8000 
        });

        // Send notifications
        try {
          const transaction = completeResp.data?.transaction;
          if (transaction && transaction.user_id) {
            const amount = transaction.amount ? (transaction.amount / 100).toFixed(2) : 'unknown';
            const fee = transaction.fee ? (transaction.fee / 100).toFixed(2) : '0';

            // Create user notification
            await axios.post(`${AUTH_SERVICE_URL}/api/notifications`, {
              userId: transaction.user_id,
              type: 'withdrawal',
              title: '✅ Withdrawal Successful',
              message: `Your withdrawal of XAF ${amount} has been sent to your mobile money account. Network fee: XAF ${fee}.`,
              data: { transactionId: transaction.id, reference, amount, fee },
              priority: 'high'
            }, {
              headers: { 'X-Service-Secret': INTERNAL_SERVICE_SECRET },
              timeout: 5000
            }).catch(err => console.error('User notification failed:', err.message));

            // Create admin notification
            await axios.post(`${AUTH_SERVICE_URL}/admin/notifications`, {
              type: 'withdrawal_processed',
              title: '💸 Withdrawal Processed',
              message: `User withdrew XAF ${amount} (Fee: XAF ${fee}, Ref: ${reference})`,
              data: { userId: transaction.user_id, transactionId: transaction.id, reference, amount, fee, profit: fee },
              priority: 'normal'
            }, {
              headers: { 'X-Service-Secret': INTERNAL_SERVICE_SECRET },
              timeout: 5000
            }).catch(err => console.error('Admin notification failed:', err.message));
          }
        } catch (notifErr) {
          console.error('Notification error:', notifErr.message);
          // Don't fail the webhook - notifications are non-critical
        }
      } catch (completeErr) {
        console.error('Withdrawal completion error:', completeErr.message);
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Withdrawal webhook error:', error.message || error);
    res.status(500).json({ success: false, message: 'Withdrawal webhook processing failed', error: error.message });
  }
});

app.listen(PORT, () => console.log(`Payment Service running on port ${PORT}`));
