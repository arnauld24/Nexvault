const express = require('express');
const multer = require('multer');
const KYCService = require('../services/KYCService');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed'), false);
    }
  },
});

// Upload KYC document
router.post('/upload', authenticateToken, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] 📤 Multer Error:`, err.message);
      
      // Handle specific multer errors
      if (err.name === 'MulterError') {
        if (err.code === 'FILE_TOO_LARGE') {
          return res.status(413).json({
            success: false,
            message: 'File size exceeds 10MB limit',
          });
        }
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            success: false,
            message: 'File size exceeds maximum limit',
          });
        }
      }
      
      // Handle custom fileFilter errors
      if (err.message && err.message.includes('Invalid file type')) {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed',
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { documentType } = req.body;
    const userId = req.user.userId;
    const timestamp = new Date().toISOString();

    console.log(`[${timestamp}] 📤 KYC Upload Request`);
    console.log(`[${timestamp}]    User ID: ${userId}`);
    console.log(`[${timestamp}]    Document Type: ${documentType}`);
    console.log(`[${timestamp}]    File: ${req.file ? req.file.originalname : 'NO FILE'}`);

    if (!req.file) {
      console.error(`[${timestamp}] ✗ No file provided`);
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please select a file and try again.',
      });
    }

    if (!documentType) {
      console.error(`[${timestamp}] ✗ Document type not provided`);
      return res.status(400).json({
        success: false,
        message: 'Document type is required. Please specify the type of document.',
      });
    }

    const result = await KYCService.uploadKycDocument(userId, documentType, req.file);
    
    console.log(`[${timestamp}] ✓ KYC Upload Success:`, result.message);
    res.status(201).json(result);
  } catch (error) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ✗ KYC upload route error:`, error.message);
    
    // Return appropriate error status based on error type
    const statusCode = error.message.includes('timeout') ? 504 : 
                      error.message.includes('Invalid') ? 400 : 500;
    
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to upload KYC document. Please try again.',
    });
  }
});

// Get detailed KYC info (requirements, progress, etc)
router.get('/info', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 📋 Fetching KYC info for user: ${userId}`);

    // Get KYC status
    const statusResult = await KYCService.getKycStatus(userId);
    
    // Define required documents
    const requiredDocuments = ['id', 'selfie'];
    const optionalDocuments = ['address_proof'];
    
    // Get current documents
    const currentDocs = statusResult.documents || [];
    const submittedTypes = currentDocs.map(d => d.documentType);
    
    // Calculate progress
    const requiredSubmitted = requiredDocuments.filter(doc => submittedTypes.includes(doc)).length;
    const progressPercentage = Math.round((requiredSubmitted / requiredDocuments.length) * 100);
    
    // Check if all required documents are submitted
    const allRequiredSubmitted = requiredDocuments.every(doc => submittedTypes.includes(doc));
    
    // Check if any document is rejected
    const hasRejected = currentDocs.some(d => d.status === 'rejected');
    
    res.status(200).json({
      success: true,
      kycStatus: statusResult.kycStatus,
      verified: statusResult.kycStatus === 'verified',
      verifiedAt: statusResult.verifiedAt,
      progressPercentage,
      requirements: {
        required: requiredDocuments.map(doc => ({
          type: doc,
          label: doc.charAt(0).toUpperCase() + doc.slice(1),
          submitted: submittedTypes.includes(doc),
        })),
        optional: optionalDocuments.map(doc => ({
          type: doc,
          label: doc.replace('_', ' ').charAt(0).toUpperCase() + doc.slice(1),
          submitted: submittedTypes.includes(doc),
        })),
      },
      documents: currentDocs,
      nextSteps: {
        canSubmit: statusResult.kycStatus !== 'verified' && !hasRejected,
        readyForReview: allRequiredSubmitted && !hasRejected,
        requiresResubmission: hasRejected,
        message: 
          statusResult.kycStatus === 'verified' ? 'Your KYC is verified. You can now perform all transactions.' :
          hasRejected ? 'Your KYC was rejected. Please resubmit the documents.' :
          allRequiredSubmitted ? 'All required documents submitted. Waiting for review.' :
          'Please submit the required documents to complete KYC verification.',
      },
    });
  } catch (error) {
    console.error('Get KYC info route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get KYC information',
      error: error.message,
    });
  }
});

// Get KYC status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await KYCService.getKycStatus(userId);

    res.status(200).json(result);
  } catch (error) {
    console.error('Get KYC status route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get KYC status',
    });
  }
});

// Get KYC documents
router.get('/documents', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await KYCService.getKycDocuments(userId);

    res.status(200).json(result);
  } catch (error) {
    console.error('Get KYC documents route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get KYC documents',
    });
  }
});

// Delete KYC document
router.delete('/documents/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.userId;

    const result = await KYCService.deleteKycDocument(documentId, userId);

    res.status(200).json(result);
  } catch (error) {
    console.error('Delete KYC document route error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Resubmit KYC after rejection
router.post('/resubmit/:documentId', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { documentId } = req.params;
    const { documentType } = req.body;
    const userId = req.user.userId;
    const timestamp = new Date().toISOString();

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    if (!documentType) {
      return res.status(400).json({
        success: false,
        message: 'Document type is required',
      });
    }

    console.log(`[${timestamp}] 📝 Resubmitting KYC document for user: ${userId}`);

    // Delete old rejected document
    const deleteResult = await KYCService.deleteKycDocument(documentId, userId);
    
    if (!deleteResult.success) {
      return res.status(400).json(deleteResult);
    }

    console.log(`[${timestamp}] ✓ Old document deleted`);

    // Upload new document
    const uploadResult = await KYCService.uploadKycDocument(userId, documentType, req.file);

    res.status(201).json({
      success: true,
      message: 'Document resubmitted successfully',
      document: uploadResult.document,
    });
  } catch (error) {
    console.error('Resubmit KYC document route error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Admin routes (these would typically require admin authentication)
// Get pending KYC documents
router.get('/admin/pending', authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin role check
    const { limit = 50, offset = 0 } = req.query;

    const result = await KYCService.getPendingKycDocuments(parseInt(limit), parseInt(offset));

    res.status(200).json(result);
  } catch (error) {
    console.error('Get pending KYC documents route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending KYC documents',
    });
  }
});

// Admin: Approve KYC
router.post('/admin/:userId/approve', authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin role check
    const { userId } = req.params;
    const adminId = req.user.userId;

    const result = await KYCService.approveKyc(userId, adminId);

    res.status(200).json(result);
  } catch (error) {
    console.error('Approve KYC route error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Admin: Reject KYC
router.post('/admin/:userId/reject', authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin role check
    const { userId } = req.params;
    const { rejectionReason } = req.body;
    const adminId = req.user.userId;

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required',
      });
    }

    const result = await KYCService.rejectKyc(userId, rejectionReason, adminId);

    res.status(200).json(result);
  } catch (error) {
    console.error('Reject KYC route error:', error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Get KYC statistics
router.get('/admin/stats', authenticateToken, async (req, res) => {
  try {
    // TODO: Add admin role check

    const result = await KYCService.getKycStats();

    res.status(200).json(result);
  } catch (error) {
    console.error('Get KYC stats route error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get KYC statistics',
    });
  }
});

module.exports = router;