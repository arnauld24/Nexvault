#!/usr/bin/env node
/**
 * Seed Test Data for NexVault Admin Dashboard
 * 
 * This script populates the database with realistic test data:
 * - 50 test users with varied KYC statuses
 * - Wallets for each user with random balances
 * - 200+ transactions (deposits, withdrawals, transfers)
 * - Pending KYC documents
 * - Admin account (if not exists)
 * 
 * Usage:
 *   node seedTestData.js
 * 
 * Or via docker:
 *   docker exec nexvault_auth_service node seedTestData.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'FONK2005-',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'nexvault_db',
});

// ── Sample data generators ─────────────────────────────────────────────────

const firstNames = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Daniel', 'Nancy', 'Matthew', 'Lisa',
  'Emma', 'Olivia', 'Ava', 'Isabella', 'Sophia', 'Mia', 'Charlotte', 'Amelia',
  'Harper', 'Evelyn', 'Abigail', 'Emily', 'Ella', 'Scarlett', 'Grace', 'Chloe',
  'Liam', 'Noah', 'Oliver', 'Elijah', 'Lucas', 'Mason', 'Logan', 'Alexander',
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris',
  'Clark', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright',
];

const countries = ['USA', 'Canada', 'UK', 'Germany', 'France', 'Spain', 'Italy', 'Australia', 'Japan', 'Brazil', 'Mexico', 'Nigeria', 'South Africa', 'India', 'China'];

const cities = ['New York', 'London', 'Paris', 'Berlin', 'Tokyo', 'Sydney', 'Toronto', 'Madrid', 'Rome', 'Mumbai', 'Lagos', 'São Paulo', 'Mexico City'];

const kycStatuses = ['unverified', 'pending', 'verified', 'rejected'];
const accountStatuses = ['active', 'suspended'];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDecimal(min, max, decimals = 2) {
  const value = Math.random() * (max - min) + min;
  return parseFloat(value.toFixed(decimals));
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// ── Seed functions ─────────────────────────────────────────────────────────

async function clearExistingData() {
  console.log('🗑️  Clearing existing test data...');
  
  await pool.query('DELETE FROM transaction_logs WHERE 1=1');
  await pool.query('DELETE FROM transaction_fees WHERE 1=1');
  await pool.query('DELETE FROM transactions WHERE 1=1');
  await pool.query('DELETE FROM wallets WHERE 1=1');
  await pool.query('DELETE FROM kyc_documents WHERE 1=1');
  await pool.query('DELETE FROM notifications WHERE 1=1');
  await pool.query('DELETE FROM sessions WHERE user_id IS NOT NULL');
  await pool.query('DELETE FROM login_attempts WHERE 1=1');
  await pool.query('DELETE FROM users WHERE email NOT LIKE \'%@nexvault.%\'');
  
  console.log('✅ Existing test data cleared');
}

async function seedAdmin() {
  console.log('👤 Seeding admin account...');
  
  const passwordHash = await bcrypt.hash('admin123', 12);
  
  await pool.query(
    `INSERT INTO admins (email, password_hash, first_name, last_name, role, is_active)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       is_active = EXCLUDED.is_active`,
    ['admin@nexvault.local', passwordHash, 'System', 'Admin', 'superadmin', true]
  );
  
  console.log('✅ Admin account ready (email: admin@nexvault.local, password: admin123)');
}

async function seedUsers(count = 50) {
  console.log(`👥 Seeding ${count} test users...`);
  
  const users = [];
  const passwordHash = await bcrypt.hash('password123', 12);
  
  for (let i = 0; i < count; i++) {
    const firstName = randomItem(firstNames);
    const lastName = randomItem(lastNames);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@testuser.com`;
    const kycStatus = randomItem(kycStatuses);
    const accountStatus = randomItem(accountStatuses);
    const country = randomItem(countries);
    const city = randomItem(cities);
    const createdAt = randomDate(new Date(2023, 0, 1), new Date());
    const lastLoginAt = Math.random() > 0.3 ? randomDate(createdAt, new Date()) : null;
    
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone_number, country, city,
                          kyc_status, account_status, email_verified, created_at, last_login_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        email, passwordHash, firstName, lastName,
        `+1${randomInt(1000000000, 9999999999)}`,
        country, city, kycStatus, accountStatus, true, createdAt, lastLoginAt
      ]
    );
    
    users.push({
      id: result.rows[0].id,
      email,
      firstName,
      lastName,
      kycStatus,
      accountStatus,
    });
  }
  
  console.log(`✅ Created ${users.length} users`);
  return users;
}

async function seedWallets(users) {
  console.log('💰 Seeding wallets...');
  
  const wallets = [];
  
  for (const user of users) {
    const balance = user.accountStatus === 'active'
      ? randomDecimal(10, 50000)
      : randomDecimal(0, 100);
    
    const result = await pool.query(
      `INSERT INTO wallets (user_id, balance, currency, status, created_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [user.id, balance, 'XAF', user.accountStatus === 'active' ? 'active' : 'frozen', new Date()]
    );
    
    wallets.push({
      id: result.rows[0].id,
      userId: user.id,
      balance,
    });
  }
  
  console.log(`✅ Created ${wallets.length} wallets`);
  return wallets;
}

async function seedTransactions(wallets, count = 200) {
  console.log(`💸 Seeding ${count} transactions...`);
  
  const types = ['credit', 'debit'];
  const categories = ['deposit', 'withdrawal', 'transfer'];
  const statuses = ['completed', 'pending', 'failed'];
  
  for (let i = 0; i < count; i++) {
    const wallet = randomItem(wallets);
    const type = randomItem(types);
    const category = randomItem(categories);
    const status = randomItem(statuses);
    const amount = randomDecimal(5, 5000);
    const fee = category === 'withdrawal' ? randomDecimal(0, 5) : category === 'transfer' ? 0.50 : 0;
    const createdAt = randomDate(new Date(2024, 0, 1), new Date());
    
    const reference = `TXN-${createdAt.toISOString().slice(0, 10).replace(/-/g, '')}-${randomInt(100000, 999999)}`;
    
    await pool.query(
      `INSERT INTO transactions (
        wallet_id, reference, type, category, amount, fee,
        currency, status, description, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        wallet.id, reference, type, category, amount, fee,
        'XAF', status,
        `${category.charAt(0).toUpperCase() + category.slice(1)} transaction`,
        createdAt
      ]
    );
  }
  
  console.log(`✅ Created ${count} transactions`);
}

async function seedKycDocuments(users) {
  console.log('📄 Seeding KYC documents...');
  
  const documentTypes = ['id', 'passport', 'selfie'];
  let count = 0;
  
  for (const user of users) {
    if (user.kycStatus === 'pending' || user.kycStatus === 'verified' || user.kycStatus === 'rejected') {
      const docType = randomItem(documentTypes);
      // Always create pending documents for seeding (not auto-verified)
      const status = 'pending';
      
      await pool.query(
        `INSERT INTO kyc_documents (user_id, document_type, document_url, status, rejection_reason, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          user.id,
          docType,
          `/uploads/kyc/${user.id}/${docType}.jpg`,
          status,
          status === 'rejected' ? 'Document quality too low' : null,
          new Date()
        ]
      );
      count++;
    }
  }
  
  console.log(`✅ Created ${count} KYC documents`);
}

async function seedNotifications(users) {
  console.log('🔔 Seeding notifications...');
  
  const types = ['transaction', 'kyc', 'security', 'system'];
  const titles = [
    'Transaction Completed',
    'KYC Status Updated',
    'Security Alert',
    'Welcome to NexVault',
    'New Login Detected',
    'Withdrawal Processed',
  ];
  
  let count = 0;
  
  for (const user of users) {
    const notifCount = randomInt(2, 8);
    
    for (let i = 0; i < notifCount; i++) {
      const type = randomItem(types);
      const title = randomItem(titles);
      const isRead = Math.random() > 0.4;
      
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, is_read, priority, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          user.id,
          type,
          title,
          `This is a test notification for ${user.firstName}.`,
          isRead,
          randomItem(['low', 'normal', 'high']),
          randomDate(new Date(2024, 0, 1), new Date())
        ]
      );
      count++;
    }
  }
  
  console.log(`✅ Created ${count} notifications`);
}

// ── Main execution ─────────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱 NexVault Test Data Seeder\n');
  console.log('════════════════════════════════════════════════════════════════\n');
  
  try {
    // Test connection
    await pool.query('SELECT 1');
    console.log('✅ Database connection established\n');
    
    // Clear existing test data
    await clearExistingData();
    console.log();
    
    // Seed admin
    await seedAdmin();
    console.log();
    
    // Seed users
    const users = await seedUsers(50);
    console.log();
    
    // Seed wallets
    const wallets = await seedWallets(users);
    console.log();
    
    // Seed transactions
    await seedTransactions(wallets, 200);
    console.log();
    
    // Seed KYC documents
    await seedKycDocuments(users);
    console.log();
    
    // Seed notifications
    await seedNotifications(users);
    console.log();
    
    console.log('════════════════════════════════════════════════════════════════');
    console.log('✅ Database seeded successfully!\n');
    console.log('📊 Summary:');
    console.log(`   • 1 admin account (admin@nexvault.local / admin123)`);
    console.log(`   • ${users.length} test users (password: password123)`);
    console.log(`   • ${wallets.length} wallets with random balances`);
    console.log(`   • 200+ transactions`);
    console.log(`   • KYC documents for users with pending/verified/rejected status`);
    console.log(`   • Notifications for all users\n`);
    console.log('🚀 Start the services and login to the admin dashboard!');
    console.log('════════════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
