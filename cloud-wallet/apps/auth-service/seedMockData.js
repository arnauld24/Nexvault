const { Client } = require('pg');
const bcrypt = require('bcryptjs');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'nexvault_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'FONK2005-',
};


// Mock data from frontend
const mockTransactions = [
  {
    id: 'txn_001',
    type: 'credit',
    category: 'deposit',
    description: 'Salary Deposit — Anthropic Inc.',
    amount: 8500.00,
    currency: 'USD',
    date: '2024-03-28T09:14:00Z',
    status: 'completed',
    from: 'Anthropic Inc.',
    to: 'My Wallet',
    reference: 'REF-20240328-0041',
    fee: 0,
    note: 'Monthly salary payment',
  },
  {
    id: 'txn_002',
    type: 'debit',
    category: 'transfer',
    description: 'Sent to Marcus Williams',
    amount: 350.00,
    currency: 'USD',
    date: '2024-03-27T14:30:00Z',
    status: 'completed',
    from: 'My Wallet',
    to: 'Marcus Williams',
    reference: 'REF-20240327-0185',
    fee: 0.50,
    note: 'Rent split March',
  },
  {
    id: 'txn_003',
    type: 'debit',
    category: 'payment',
    description: 'Netflix Subscription',
    amount: 15.99,
    currency: 'USD',
    date: '2024-03-25T00:01:00Z',
    status: 'completed',
    from: 'My Wallet',
    to: 'Netflix Inc.',
    reference: 'REF-20240325-0002',
    fee: 0,
    note: '',
  },
  {
    id: 'txn_004',
    type: 'credit',
    category: 'transfer',
    description: 'Received from Sarah Johnson',
    amount: 125.00,
    currency: 'USD',
    date: '2024-03-24T18:22:00Z',
    status: 'completed',
    from: 'Sarah Johnson',
    to: 'My Wallet',
    reference: 'REF-20240324-0093',
    fee: 0,
    note: 'Dinner last Friday 🍕',
  },
  {
    id: 'txn_005',
    type: 'debit',
    category: 'deposit',
    description: 'ATM Withdrawal — Downtown Branch',
    amount: 200.00,
    currency: 'USD',
    date: '2024-03-23T11:45:00Z',
    status: 'completed',
    from: 'My Wallet',
    to: 'ATM',
    reference: 'REF-20240323-0067',
    fee: 2.50,
    note: '',
  },
  {
    id: 'txn_006',
    type: 'debit',
    category: 'transfer',
    description: 'Sent to James Okafor',
    amount: 750.00,
    currency: 'USD',
    date: '2024-03-22T09:00:00Z',
    status: 'pending',
    from: 'My Wallet',
    to: 'James Okafor',
    reference: 'REF-20240322-0040',
    fee: 1.00,
    note: 'Project payment',
  },
  {
    id: 'txn_007',
    type: 'credit',
    category: 'deposit',
    description: 'Freelance Payment — TechCorp',
    amount: 2200.00,
    currency: 'USD',
    date: '2024-03-20T16:10:00Z',
    status: 'completed',
    from: 'TechCorp Ltd.',
    to: 'My Wallet',
    reference: 'REF-20240320-0180',
    fee: 0,
    note: 'Website redesign project',
  },
  {
    id: 'txn_008',
    type: 'debit',
    category: 'payment',
    description: 'Amazon Purchase',
    amount: 89.99,
    currency: 'USD',
    date: '2024-03-19T13:55:00Z',
    status: 'completed',
    from: 'My Wallet',
    to: 'Amazon.com',
    reference: 'REF-20240319-0221',
    fee: 0,
    note: '',
  },
  {
    id: 'txn_009',
    type: 'debit',
    category: 'transfer',
    description: 'Sent to Emily Park',
    amount: 55.00,
    currency: 'USD',
    date: '2024-03-18T20:30:00Z',
    status: 'failed',
    from: 'My Wallet',
    to: 'Emily Park',
    reference: 'REF-20240318-0144',
    fee: 0,
    note: 'Concert tickets',
  },
  {
    id: 'txn_010',
    type: 'credit',
    category: 'deposit',
    description: 'Cashback Reward',
    amount: 12.50,
    currency: 'USD',
    date: '2024-03-17T10:00:00Z',
    status: 'completed',
    from: 'NexVault Rewards',
    to: 'My Wallet',
    reference: 'REF-20240317-0055',
    fee: 0,
    note: 'Monthly cashback credit',
  },
];

async function seedMockData() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('Connected to database');

    // Find user by email
    const userQuery = 'SELECT id, first_name, last_name FROM users WHERE email = $1';
    const userResult = await client.query(userQuery, ['fonkouaarnauld@gmail.com']);

    if (userResult.rows.length === 0) {
      console.log('User not found. Please ensure the user exists.');
      return;
    }

    const user = userResult.rows[0];
    console.log(`Found user: ${user.first_name} ${user.last_name} (ID: ${user.id})`);

    // Check if wallet exists for user in wallet service database
    // Since both services use the same DB, we can use the same client

    // Check if wallet exists
    const walletQuery = 'SELECT id, balance FROM wallets WHERE user_id = $1';
    const walletResult = await client.query(walletQuery, [user.id]);

    let walletId;
    if (walletResult.rows.length === 0) {
      // Create wallet
      const createWalletQuery = `
        INSERT INTO wallets (user_id, balance, currency, status, daily_limit, monthly_limit)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;
      const createResult = await client.query(createWalletQuery, [
        user.id,
        24850.75, // from mockData
        'USD',
        'active',
        10000.00,
        50000.00
      ]);
      walletId = createResult.rows[0].id;
      console.log(`Created wallet with ID: ${walletId}`);
    } else {
      walletId = walletResult.rows[0].id;
      console.log(`Found existing wallet with ID: ${walletId}, balance: ${walletResult.rows[0].balance}`);
    }

    // Insert transactions
    for (const tx of mockTransactions) {
      const insertTxQuery = `
        INSERT INTO transactions (
          reference, type, category, status, amount, fee, net_amount, currency,
          wallet_id, description, notes, external_reference, payment_method,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (reference) DO NOTHING
      `;

      const netAmount = tx.type === 'credit' ? tx.amount - tx.fee : -(tx.amount + tx.fee);

      await client.query(insertTxQuery, [
        tx.reference,
        tx.type,
        tx.category,
        tx.status,
        tx.amount,
        tx.fee,
        netAmount,
        tx.currency,
        walletId,
        tx.description,
        tx.note,
        tx.reference,
        tx.category === 'deposit' ? 'bank_transfer' : tx.category === 'transfer' ? 'wallet' : 'card',
        tx.date,
        tx.date
      ]);

      console.log(`Inserted transaction: ${tx.reference}`);
    }

    console.log('Seeding completed successfully!');

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await client.end();
    // await walletClient.end(); // if connected
  }
}

seedMockData();