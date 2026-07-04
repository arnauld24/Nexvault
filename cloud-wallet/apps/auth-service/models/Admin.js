const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Admin {
  static async create(adminData) {
    const { email, passwordHash, firstName, lastName, role = 'admin' } = adminData;
    const adminId = uuidv4();

    try {
      const result = await query(
        `INSERT INTO admins (id, email, password_hash, first_name, last_name, role)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, first_name, last_name, role, is_active, created_at, last_login_at`,
        [adminId, email.toLowerCase(), passwordHash, firstName, lastName, role]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error(`Error creating admin: ${error.message}`);
    }
  }

  static async findByEmail(email) {
    try {
      const result = await query(
        `SELECT * FROM admins WHERE email = $1 AND deleted_at IS NULL`,
        [email.toLowerCase()]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding admin by email: ${error.message}`);
    }
  }

  static async findById(adminId) {
    try {
      const result = await query(
        `SELECT id, email, first_name, last_name, role, is_active, created_at, last_login_at
         FROM admins WHERE id = $1 AND deleted_at IS NULL`,
        [adminId]
      );
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding admin by ID: ${error.message}`);
    }
  }

  static async updateLastLogin(adminId) {
    try {
      await query(
        `UPDATE admins SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [adminId]
      );
    } catch (error) {
      throw new Error(`Error updating admin last login: ${error.message}`);
    }
  }
}

module.exports = Admin;
