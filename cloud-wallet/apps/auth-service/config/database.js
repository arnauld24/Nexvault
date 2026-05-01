require('dotenv').config();
const { Pool } = require('pg');

// Create PostgreSQL connection pool
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'FONK2005-',
  host: process.env.DB_HOST || 'postgres',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'nexvault_db',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased from 2000ms to 10000ms to handle slower connections
  statement_timeout: 30000, // 30s statement timeout to prevent hanging queries
});

// Handle connection errors
pool.on('error', (err) => {
  console.error(`[${new Date().toISOString()}] ✗ Database Pool Error:`, err.message);
  process.exit(-1);
});

pool.on('connect', () => {
  console.log(`[${new Date().toISOString()}] ✓ New database connection established`);
});

const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log(`[${new Date().toISOString()}] ✓ PostgreSQL connected successfully`);
    console.log(`[${new Date().toISOString()}] 📊 Database Details: ${process.env.DB_HOST || 'postgres'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'nexvault_db'}`);
    client.release();
    return true;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ✗ PostgreSQL connection failed:`, error.message);
    console.error(`[${new Date().toISOString()}] ✗ Database Details: ${process.env.DB_HOST || 'postgres'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'nexvault_db'}`);
    return false;
  }
};

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

module.exports = {
  pool,
  query,
  connectDB,
};
