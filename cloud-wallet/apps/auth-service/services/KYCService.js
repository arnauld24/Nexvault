const KYCModel = require('../models/KYC');
const UserModel = require('../models/User');
const { publishEvent } = require('../config/rabbitmq');
const fs = require('fs').promises;
const path = require('path');

class KYCService {
  // Upload KYC document
  static async uploadKycDocument(userId, documentType, file) {
    const timestamp = new Date().toISOString();
    try {
      console.log(`[${timestamp}] 📤 KYC Upload Service Started`);
      console.log(`[${timestamp}]    User: ${userId}, Type: ${documentType}, File: ${file.originalname}`);

      // Validate document type
      const validTypes = ['id', 'passport', 'selfie', 'address_proof'];
      if (!validTypes.includes(documentType)) {
        throw new Error(`Invalid document type: ${documentType}. Must be one of: ${validTypes.join(', ')}`);
      }

      // Validate file type
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${allowedMimeTypes.join(', ')}`);
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new Error(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum of 10MB`);
      }

      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(__dirname, '../../uploads/kyc');
      console.log(`[${timestamp}] 📁 Creating uploads directory: ${uploadsDir}`);
      await fs.mkdir(uploadsDir, { recursive: true });

      // Generate unique filename
      const fileExtension = path.extname(file.originalname) || '.jpg';
      const filename = `${userId}_${documentType}_${Date.now()}${fileExtension}`;
      const filePath = path.join(uploadsDir, filename);

      // Save file
      console.log(`[${timestamp}] 💾 Saving file to: ${filePath}`);
      await fs.writeFile(filePath, file.buffer);
      console.log(`[${timestamp}] ✓ File saved successfully (${file.size} bytes)`);

      // Create relative URL for database storage
      const documentUrl = `/uploads/kyc/${filename}`;

      // Save to database
      console.log(`[${timestamp}] 🗄️  Saving document to database`);
      const document = await KYCModel.createKycDocument(userId, documentType, documentUrl);
      console.log(`[${timestamp}] ✓ Document saved with ID: ${document.id}`);

      // Check if user has completed all required documents
      console.log(`[${timestamp}] 🔍 Checking for all required documents`);
      const documents = await KYCModel.getKycDocuments(userId);
      const hasId = documents.some(d => ['id', 'passport'].includes(d.document_type) && d.status !== 'rejected');
      const hasSelfie = documents.some(d => d.document_type === 'selfie' && d.status !== 'rejected');

      console.log(`[${timestamp}] 📋 Documents: Has ID=${hasId}, Has Selfie=${hasSelfie}`);

      // If user has submitted ID and selfie, update KYC status to pending
      if (hasId && hasSelfie) {
        console.log(`[${timestamp}] 🚀 All required documents submitted, updating KYC status to pending`);
        await KYCModel.updateKycStatus(userId, 'pending');

        // Publish KYC submitted event
        await publishEvent('kyc.submitted', {
          userId,
          documentTypes: documents.map(d => d.document_type),
          submittedAt: new Date(),
        });
        console.log(`[${timestamp}] 📤 KYC submitted event published`);
      }

      console.log(`[${timestamp}] ✓ KYC Upload completed successfully`);
      return {
        success: true,
        message: 'Document uploaded successfully',
        document: {
          id: document.id,
          documentType: document.document_type,
          status: document.status,
          createdAt: document.created_at,
        },
      };
    } catch (error) {
      console.error(`[${timestamp}] ✗ KYC upload error:`, error.message);
      console.error(`[${timestamp}] Stack trace:`, error.stack);
      throw error;
    }
  }

  // Get KYC status for user
  static async getKycStatus(userId) {
    try {
      const status = await KYCModel.getKycStatus(userId);
      const documents = await KYCModel.getKycDocuments(userId);

      return {
        success: true,
        kycStatus: status.kyc_status,
        verifiedAt: status.kyc_verified_at,
        documents: documents.map(doc => ({
          id: doc.id,
          documentType: doc.document_type,
          status: doc.status,
          rejectionReason: doc.rejection_reason,
          verifiedAt: doc.verified_at,
          createdAt: doc.created_at,
        })),
      };
    } catch (error) {
      console.error('Get KYC status error:', error);
      throw error;
    }
  }

  // Get KYC documents for user
  static async getKycDocuments(userId) {
    try {
      const documents = await KYCModel.getKycDocuments(userId);

      return {
        success: true,
        documents: documents.map(doc => ({
          id: doc.id,
          documentType: doc.document_type,
          documentUrl: doc.document_url,
          status: doc.status,
          rejectionReason: doc.rejection_reason,
          verifiedAt: doc.verified_at,
          createdAt: doc.created_at,
        })),
      };
    } catch (error) {
      console.error('Get KYC documents error:', error);
      throw error;
    }
  }

  // Admin: Get pending KYC documents
  static async getPendingKycDocuments(limit = 50, offset = 0) {
    try {
      const documents = await KYCModel.getPendingKycDocuments(limit, offset);

      return {
        success: true,
        documents: documents.map(doc => ({
          id: doc.id,
          documentType: doc.document_type,
          documentUrl: doc.document_url,
          user: {
            id: doc.user_id,
            firstName: doc.first_name,
            lastName: doc.last_name,
            email: doc.email,
            phoneNumber: doc.phone_number,
            country: doc.country,
            city: doc.city,
          },
          createdAt: doc.created_at,
        })),
      };
    } catch (error) {
      console.error('Get pending KYC documents error:', error);
      throw error;
    }
  }

  // Admin: Approve KYC
  static async approveKyc(userId, adminId) {
    try {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] 🔍 Approving KYC for user: ${userId}`);

      // Verify user exists
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get all pending documents
      const documents = await KYCModel.getKycDocuments(userId);
      const pendingDocs = documents.filter(d => d.status === 'pending');

      if (pendingDocs.length === 0) {
        throw new Error('No pending KYC documents to approve');
      }

      console.log(`[${timestamp}] 📄 Approving ${pendingDocs.length} documents`);

      // Update all pending documents to verified
      for (const doc of pendingDocs) {
        await KYCModel.updateDocumentStatus(doc.id, 'verified', null, adminId);
        console.log(`[${timestamp}] ✓ Document ${doc.id} approved`);
      }

      // Update user KYC status
      const verifiedAt = new Date();
      await KYCModel.updateKycStatus(userId, 'verified', verifiedAt);
      console.log(`[${timestamp}] ✓ User KYC status updated to verified`);

      // Publish KYC approved event
      await publishEvent('nexvault.events', 'kyc.approved', {
        userId,
        approvedBy: adminId,
        approvedAt: verifiedAt,
        documentsCount: pendingDocs.length,
      });
      console.log(`[${timestamp}] 📤 KYC approved event published`);

      return {
        success: true,
        message: 'KYC approved successfully',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          kycStatus: 'verified',
          verifiedAt,
        },
      };
    } catch (error) {
      console.error('Approve KYC error:', error);
      throw error;
    }
  }

  // Admin: Reject KYC
  static async rejectKyc(userId, rejectionReason, adminId) {
    try {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] 🔍 Rejecting KYC for user: ${userId}`);

      if (!rejectionReason || rejectionReason.trim().length === 0) {
        throw new Error('Rejection reason is required');
      }

      // Verify user exists
      const user = await UserModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get all pending documents
      const documents = await KYCModel.getKycDocuments(userId);
      const pendingDocs = documents.filter(d => d.status === 'pending');

      if (pendingDocs.length === 0) {
        throw new Error('No pending KYC documents to reject');
      }

      console.log(`[${timestamp}] 📄 Rejecting ${pendingDocs.length} documents`);

      // Update all pending documents to rejected
      for (const doc of pendingDocs) {
        await KYCModel.updateDocumentStatus(doc.id, 'rejected', rejectionReason, adminId);
        console.log(`[${timestamp}] ✓ Document ${doc.id} rejected`);
      }

      // Update user KYC status
      await KYCModel.updateKycStatus(userId, 'rejected');
      console.log(`[${timestamp}] ✓ User KYC status updated to rejected`);

      // Publish KYC rejected event
      await publishEvent('nexvault.events', 'kyc.rejected', {
        userId,
        rejectedBy: adminId,
        rejectionReason,
        rejectedAt: new Date(),
        documentsCount: pendingDocs.length,
      });
      console.log(`[${timestamp}] 📤 KYC rejected event published`);

      return {
        success: true,
        message: 'KYC rejected',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          kycStatus: 'rejected',
          rejectionReason,
        },
      };
    } catch (error) {
      console.error('Reject KYC error:', error);
      throw error;
    }
  }

  // Get KYC statistics
  static async getKycStats() {
    try {
      const stats = await KYCModel.getKycStats();

      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error('Get KYC stats error:', error);
      throw error;
    }
  }

  // Delete KYC document (user can delete their own pending documents)
  static async deleteKycDocument(documentId, userId) {
    try {
      const document = await KYCModel.deleteKycDocument(documentId, userId);

      if (!document) {
        throw new Error('Document not found or cannot be deleted');
      }

      // Delete file from filesystem
      const filePath = path.join(__dirname, '../../', document.document_url);
      try {
        await fs.unlink(filePath);
      } catch (fileError) {
        console.warn('Could not delete file:', fileError);
      }

      return {
        success: true,
        message: 'Document deleted successfully',
      };
    } catch (error) {
      console.error('Delete KYC document error:', error);
      throw error;
    }
  }
}

module.exports = KYCService;