const { query } = require('../config/database');

class KYCModel {
  // Create a new KYC document record
  static async createKycDocument(userId, documentType, documentUrl, status = 'pending') {
    const sql = `
      INSERT INTO kyc_documents (user_id, document_type, document_url, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    const values = [userId, documentType, documentUrl, status];
    const result = await query(sql, values);
    return result.rows[0];
  }

  // Get KYC documents for a user
  static async getKycDocuments(userId) {
    const sql = `
      SELECT id, document_type, document_url, status, rejection_reason, verified_at, created_at, updated_at
      FROM kyc_documents
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    const result = await query(sql, [userId]);
    return result.rows;
  }

  // Get KYC status for a user
  static async getKycStatus(userId) {
    const sql = `
      SELECT kyc_status, kyc_verified_at
      FROM users
      WHERE id = $1
    `;
    const result = await query(sql, [userId]);
    return result.rows[0];
  }

  // Update KYC status for a user
  static async updateKycStatus(userId, status, verifiedAt = null) {
    const sql = `
      UPDATE users
      SET kyc_status = $1, kyc_verified_at = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING kyc_status, kyc_verified_at
    `;
    const values = [status, verifiedAt, userId];
    const result = await query(sql, values);
    return result.rows[0];
  }

  // Update document status
  static async updateDocumentStatus(documentId, status, rejectionReason = null, verifiedBy = null) {
    const sql = `
      UPDATE kyc_documents
      SET status = $1, rejection_reason = $2, verified_by = $3, verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;
    const values = [status, rejectionReason, verifiedBy, documentId];
    const result = await query(sql, values);
    return result.rows[0];
  }

  // Get all pending KYC documents (for admin)
  static async getPendingKycDocuments(limit = 50, offset = 0) {
    const sql = `
      SELECT
        kd.id,
        kd.document_type,
        kd.document_url,
        kd.status,
        kd.created_at,
        u.id as user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.phone_number,
        u.country,
        u.city
      FROM kyc_documents kd
      JOIN users u ON kd.user_id = u.id
      WHERE kd.status = 'pending'
      ORDER BY kd.created_at ASC
      LIMIT $1 OFFSET $2
    `;
    const result = await query(sql, [limit, offset]);
    return result.rows;
  }

  // Get KYC statistics
  static async getKycStats() {
    const sql = `
      SELECT
        COUNT(*) as total_documents,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'verified' THEN 1 END) as verified,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected
      FROM kyc_documents
    `;
    const result = await query(sql);
    return result.rows[0];
  }

  // Check if user has completed KYC submission
  static async hasCompletedKycSubmission(userId) {
    const sql = `
      SELECT COUNT(*) as document_count
      FROM kyc_documents
      WHERE user_id = $1 AND status IN ('pending', 'verified')
    `;
    const result = await query(sql, [userId]);
    return parseInt(result.rows[0].document_count) > 0;
  }

  // Delete KYC document
  static async deleteKycDocument(documentId, userId) {
    const sql = `
      DELETE FROM kyc_documents
      WHERE id = $1 AND user_id = $2 AND status = 'pending'
      RETURNING *
    `;
    const result = await query(sql, [documentId, userId]);
    return result.rows[0];
  }
}

module.exports = KYCModel;