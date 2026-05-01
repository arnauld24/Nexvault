const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
//const uuid = require('uuid');
// const uuidv4 = uuid.v4;
const config = require('../config/config');

class User {
  // Create a new user
  static async create(userData) {
    const { email, passwordHash, firstName, lastName, phoneNumber, country, city, preferredCurrency } = userData;
    const userId = uuidv4();
    
    try {
      const result = await query(
        `INSERT INTO users (id, email, password_hash, first_name, last_name, phone_number, country, city, preferred_currency)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, email, first_name, last_name, kyc_status, account_status, created_at`,
        [userId, email, passwordHash, firstName, lastName, phoneNumber || null, country || null, city || null, preferredCurrency || 'USD']
      );
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      const result = await query(
        `SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL`,
        [email.toLowerCase()]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding user by email: ${error.message}`);
    }
  }

  // Find user by ID
  static async findById(userId) {
    try {
      const result = await query(
        `SELECT id, email, first_name, last_name, phone_number, country, city, avatar_url, 
                kyc_status, account_status, email_verified, two_factor_enabled, tier, preferred_currency, created_at, last_login_at
         FROM users WHERE id = $1 AND deleted_at IS NULL`,
        [userId]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding user by ID: ${error.message}`);
    }
  }

  // Search users by name or email
  static async searchUsers(queryText, excludeUserId = null) {
    try {
      const queryValue = `%${queryText.trim().toLowerCase()}%`;
      let sql = `SELECT id, email, first_name, last_name FROM users
                 WHERE deleted_at IS NULL
                   AND (
                     LOWER(email) LIKE $1 OR
                     LOWER(first_name || ' ' || last_name) LIKE $1 OR
                     LOWER(first_name) LIKE $1 OR
                     LOWER(last_name) LIKE $1
                   )`;
      const params = [queryValue];

      if (excludeUserId) {
        sql += ' AND id != $2';
        params.push(excludeUserId);
      }

      sql += ' ORDER BY created_at DESC LIMIT 50';

      const result = await query(sql, params);
      return result.rows;
    } catch (error) {
      throw new Error(`Error searching users: ${error.message}`);
    }
  }

  // Check if email exists
  static async emailExists(email) {
    try {
      const result = await query(
        `SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL LIMIT 1`,
        [email.toLowerCase()]
      );
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Error checking email existence: ${error.message}`);
    }
  }

  // Update user profile
  static async updateProfile(userId, updates) {
    const allowedFields = ['first_name', 'last_name', 'phone_number', 'country', 'city', 'avatar_url', 'preferred_currency'];
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(userId);

    try {
      const result = await query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} AND deleted_at IS NULL
         RETURNING id, email, first_name, last_name, phone_number, country, city, avatar_url, preferred_currency`,
        values
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error updating user profile: ${error.message}`);
    }
  }

  // Update password
  static async updatePassword(userId, passwordHash) {
    try {
      const result = await query(
        `UPDATE users SET password_hash = $1 WHERE id = $2 AND deleted_at IS NULL
         RETURNING id, email`,
        [passwordHash, userId]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error updating password: ${error.message}`);
    }
  }

  // Update last login
  static async updateLastLogin(userId) {
    try {
      await query(
        `UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [userId]
      );
    } catch (error) {
      throw new Error(`Error updating last login: ${error.message}`);
    }
  }

  // Set email as verified
  static async verifyEmail(userId) {
    try {
      const result = await query(
        `UPDATE users SET email_verified = TRUE, email_verified_at = CURRENT_TIMESTAMP WHERE id = $1
         RETURNING id, email, email_verified`,
        [userId]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error verifying email: ${error.message}`);
    }
  }

  // Update KYC status
  static async updateKYCStatus(userId, status) {
    try {
      const result = await query(
        `UPDATE users SET kyc_status = $1, kyc_verified_at = CASE WHEN $1 = 'verified' THEN CURRENT_TIMESTAMP ELSE kyc_verified_at END
         WHERE id = $2
         RETURNING id, kyc_status, kyc_verified_at`,
        [status, userId]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error updating KYC status: ${error.message}`);
    }
  }

  // Soft delete user
  static async delete(userId) {
    try {
      const result = await query(
        `UPDATE users SET deleted_at = CURRENT_TIMESTAMP, account_status = 'deleted' WHERE id = $1
         RETURNING id, email`,
        [userId]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error deleting user: ${error.message}`);
    }
  }

  // Get user statistics
  static async getStats() {
    try {
      const result = await query(
        `SELECT 
          COUNT(*) as total_users,
          SUM(CASE WHEN kyc_status = 'verified' THEN 1 ELSE 0 END) as verified_users,
          SUM(CASE WHEN account_status = 'suspended' THEN 1 ELSE 0 END) as suspended_users,
          SUM(CASE WHEN email_verified = TRUE THEN 1 ELSE 0 END) as email_verified_users
         FROM users WHERE deleted_at IS NULL`
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error getting user statistics: ${error.message}`);
    }
  }
}

module.exports = User;
