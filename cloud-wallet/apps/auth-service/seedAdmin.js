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

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@nexvault.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'admin123';
const ADMIN_FIRST_NAME = process.env.SEED_ADMIN_FIRST_NAME || 'System';
const ADMIN_LAST_NAME = process.env.SEED_ADMIN_LAST_NAME || 'Admin';
const ADMIN_ROLE = process.env.SEED_ADMIN_ROLE || 'superadmin';

async function seedAdmin() {
  try {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

    const result = await pool.query(
      `INSERT INTO admins (email, password_hash, first_name, last_name, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         role = EXCLUDED.role,
         is_active = EXCLUDED.is_active`,
      [ADMIN_EMAIL, passwordHash, ADMIN_FIRST_NAME, ADMIN_LAST_NAME, ADMIN_ROLE, true]
    );

    console.log('✅ Admin credentials seeded successfully.');
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
  } catch (error) {
    console.error('❌ Failed to seed admin credentials:', error.message || error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedAdmin();
