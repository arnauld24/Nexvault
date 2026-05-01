# KYC Verification Implementation Summary

## Overview
Complete KYC (Know Your Customer) verification system has been implemented across the NexVault microservices architecture. Users must complete KYC verification before they can perform transactions like transfers and withdrawals.

## Changes Implemented

### 1. **Wallet Service KYC Verification Middleware**
**File:** `cloud-wallet/apps/wallet-service/index.js`

Added a `verifyKYC` middleware that checks if a user has completed KYC verification before allowing transactions:

```javascript
const verifyKYC = async (req, res, next) => {
  // Checks user's kyc_status from database
  // Returns 403 Forbidden if KYC status != 'verified'
  // Provides requiresKYC flag and current status in response
}
```

### 2. **Transaction Endpoints Updated with KYC Protection**
**File:** `cloud-wallet/apps/wallet-service/index.js`

#### Transfer Endpoint
- **Route:** `POST /transfer` or `POST /api/transactions/transfer`
- **Middleware Stack:** `authenticateToken` → `verifyKYC`
- **Requirements:** 
  - User must be authenticated
  - User must have `kyc_status = 'verified'`
  - Recipient email must exist
  - Sufficient balance required

**Error Response (No KYC):**
```json
{
  "success": false,
  "message": "KYC verification required to perform this transaction",
  "requiresKYC": true,
  "currentStatus": "unverified"
}
```

#### Withdraw Endpoint
- **Route:** `POST /withdraw` or `POST /api/transactions/withdraw`
- **Middleware Stack:** `authenticateToken` → `verifyKYC`
- **Requirements:**
  - User must be authenticated
  - User must have `kyc_status = 'verified'`
  - Valid amount and bank details required
  - Sufficient balance required

**Status:** Pending (1-3 business days)

### 3. **Enhanced KYC Status Endpoint**
**File:** `cloud-wallet/apps/wallet-service/index.js`

Updated `GET /status` or `GET /api/kyc/status` endpoint to provide transaction capabilities:

**Response Includes:**
- `kycStatus` - Current KYC status (unverified, pending, verified, rejected)
- `verified` - Boolean indicating if KYC is complete
- `verifiedAt` - Timestamp of verification
- `transactionCapabilities` - Transaction limits based on verification status:
  - `canTransfer` - Boolean
  - `canWithdraw` - Boolean
  - `canDeposit` - Boolean (always true)
  - `maxTransactionAmount` - 100 (unverified) or 10,000 (verified)
  - `dailyLimit` - 500 (unverified) or 50,000 (verified)

### 4. **Comprehensive KYC Information Endpoint**
**File:** `cloud-wallet/apps/auth-service/routes/kyc.js`

Added new endpoint `GET /kyc/info` for users to check their KYC progress:

**Response Includes:**
- `kycStatus` - Current status
- `verified` - Boolean
- `progressPercentage` - Completion percentage (0-100%)
- `requirements` - List of required and optional documents with submission status
- `documents` - Array of submitted documents with statuses
- `nextSteps` - Helpful information about what to do next

**Document Types Required:**
- `id` (passport or national ID)
- `selfie` (photo verification)

**Optional Documents:**
- `address_proof` (utility bill, etc.)

### 5. **KYC Approval Endpoint Enhanced**
**File:** `cloud-wallet/apps/auth-service/services/KYCService.js`

Updated `approveKyc()` method with:
- Proper user verification before approval
- Validation that pending documents exist
- All pending documents marked as 'verified'
- User `kyc_status` updated to 'verified' with timestamp
- `kyc_verified_at` column set to current timestamp
- Event published to RabbitMQ: `kyc.approved`
- Detailed logging at each step
- Returns complete user data with verification info

**Admin Route:** `POST /kyc/admin/:userId/approve`

### 6. **KYC Rejection Endpoint Enhanced**
**File:** `cloud-wallet/apps/auth-service/services/KYCService.js`

Updated `rejectKyc()` method with:
- Validation of rejection reason (required)
- User verification before rejection
- Check for pending documents to reject
- All pending documents marked as 'rejected' with reason
- User `kyc_status` updated to 'rejected'
- Event published to RabbitMQ: `kyc.rejected`
- Detailed logging and error handling
- Returns user data with rejection reason

**Admin Route:** `POST /kyc/admin/:userId/reject`

### 7. **KYC Resubmission Endpoint**
**File:** `cloud-wallet/apps/auth-service/routes/kyc.js`

Added new endpoint for users to resubmit rejected documents:

**Route:** `POST /kyc/resubmit/:documentId`

**Process:**
1. Delete old rejected document
2. Upload new document
3. Return success with new document info

**Allowed Document Types:**
- JPEG, PNG, PDF files
- Maximum 10MB per file

### 8. **KYC Data Storage in Database**

**Tables Used:**

#### users table (columns)
```sql
kyc_status VARCHAR(50) DEFAULT 'unverified'  -- unverified, pending, verified, rejected
kyc_verified_at TIMESTAMP                     -- When KYC was approved
```

#### kyc_documents table
```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL REFERENCES users(id)
document_type VARCHAR(50)                    -- id, passport, selfie, address_proof
document_url VARCHAR(500)                    -- Path to uploaded file
status VARCHAR(20) DEFAULT 'pending'         -- pending, verified, rejected
rejection_reason TEXT
verified_by UUID                             -- Admin who verified/rejected
verified_at TIMESTAMP
created_at TIMESTAMP
updated_at TIMESTAMP
```

### 9. **Fix for 2FA Login User Data**
**File:** `cloud-wallet/apps/auth-service/services/AuthService.js`

Fixed the `verifyTwoFactorCode()` method to include user fields in the database query:

**Before (Bug):**
```sql
SELECT u.id, u.email, u.two_factor_enabled, u.two_factor_method, t.code, t.expires_at
```

**After (Fixed):**
```sql
SELECT u.id, u.email, u.first_name, u.last_name, u.two_factor_enabled, u.two_factor_method, 
       u.kyc_status, u.email_verified, u.tier, t.code, t.expires_at
```

This ensures the user object returned to the frontend includes `firstName` and `lastName`, fixing the "user" display issue on the dashboard after 2FA login.

## User Journey

### 1. **Registration**
User registers with email and basic info

### 2. **First Login**
- Can log in successfully
- Can deposit funds
- Cannot transfer or withdraw

### 3. **Upload KYC Documents**
- User uploads ID (or passport) document
- User uploads selfie for face verification
- System shows KYC submission status at `GET /kyc/info`

### 4. **Admin Review**
Admin logs in and reviews pending documents:
- `GET /kyc/admin/pending` - View all pending KYCs
- `POST /kyc/admin/{userId}/approve` - Approve KYC
- `POST /kyc/admin/{userId}/reject` - Reject with reason

### 5. **After Approval**
- User receives notification that KYC is verified
- Can now perform transfers
- Can now request withdrawals
- `kyc_status = 'verified'` in database
- Transaction limits increased to full amounts

### 6. **If Rejected**
- User receives notification with rejection reason
- Can resubmit with `POST /kyc/resubmit/:documentId`
- Deletes old document and uploads new one
- Status returns to pending for re-review

## API Endpoints Summary

### User Endpoints (Auth Service)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/kyc/upload` | Upload KYC document |
| GET | `/kyc/info` | Get KYC requirements and progress |
| GET | `/kyc/status` | Get user's current KYC status |
| GET | `/kyc/documents` | Get all uploaded documents |
| DELETE | `/kyc/documents/:id` | Delete a pending document |
| POST | `/kyc/resubmit/:id` | Resubmit rejected document |

### Admin Endpoints (Auth Service)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/kyc/admin/pending` | Get all pending KYC submissions |
| POST | `/kyc/admin/:userId/approve` | Approve user's KYC |
| POST | `/kyc/admin/:userId/reject` | Reject user's KYC with reason |
| GET | `/kyc/admin/stats` | Get KYC statistics |

### Transaction Endpoints (Wallet Service)
| Method | Endpoint | Description | Requires KYC |
|--------|----------|-------------|--------------|
| POST | `/transfer` | Transfer funds to another user | YES |
| POST | `/withdraw` | Withdraw to bank account | YES |
| POST | `/deposit` | Deposit funds | NO |
| GET | `/history` | View transaction history | NO |
| GET | `/status` | Check KYC and transaction capabilities | NO |

## Error Handling

### KYC Not Verified Response
```json
{
  "success": false,
  "message": "KYC verification required to perform this transaction",
  "requiresKYC": true,
  "currentStatus": "unverified"
}
```

### Transaction Limits Applied
- **Unverified users:**
  - Max transfer: $100
  - Daily limit: $500
  - Can deposit unlimited

- **Verified users:**
  - Max transfer: $10,000
  - Daily limit: $50,000
  - Can withdraw unlimited

## Database Constraints

All KYC endpoints include:
- Input validation
- File type validation (JPEG, PNG, PDF only)
- File size validation (max 10MB)
- User ID validation
- Document type validation
- Status tracking (pending → verified/rejected)
- Timestamp tracking for audit trail
- Rejection reason storage

## RabbitMQ Events Published

### kyc.approved
```json
{
  "userId": "uuid",
  "approvedBy": "admin-uuid",
  "approvedAt": "2026-04-30T...",
  "documentsCount": 2
}
```

### kyc.rejected
```json
{
  "userId": "uuid",
  "rejectedBy": "admin-uuid",
  "rejectionReason": "ID document not clear",
  "rejectedAt": "2026-04-30T...",
  "documentsCount": 2
}
```

## Logging

All KYC operations include detailed logging with timestamps:
- Document uploads
- Status checks
- Admin approvals/rejections
- Database queries
- Event publishing
- Error tracking

## Security Features

1. **JWT Authentication** - All KYC endpoints protected
2. **Role-based Access** - Admin endpoints would require admin role (TODO: implement role check)
3. **File Upload Security** - MIME type validation, size limits
4. **Audit Trail** - verified_by and verified_at fields track who changed what
5. **Input Validation** - All user inputs validated
6. **Database Transactions** - Atomic operations for consistency

## Testing Recommendations

1. **User can't transfer without KYC** - Verify 403 response
2. **User can transfer after KYC approval** - Verify successful transaction
3. **Withdrawal blocked for unverified** - Verify 403 response
4. **Rejection reason persisted** - Check database for reason storage
5. **Resubmission creates new document** - Verify old document deleted
6. **KYC status accurate in wallet service** - Verify query results

## Future Enhancements

1. Implement admin role verification middleware
2. Add document expiration (re-verify every 2-3 years)
3. Implement automated document validation (OCR)
4. Add liveness detection for selfies
5. Implement tiered verification levels (basic, standard, premium)
6. Add geographic restrictions based on KYC data
7. Implement velocity checks for transactions
8. Add manual review workflow with comments

