# UML Diagrams Specifications - NexVault Digital Wallet System

Complete detailed specifications for drawing all UML diagrams with exact actors, functionalities, interactions, relationships, and requirements.

---

# PART 1: USE CASE DIAGRAM

## 1.1 Overview
The use case diagram shows all actors (users and systems) and the actions they can perform within the NexVault system.

## 1.2 Actors Definition

### Primary Actors
1. **End User / Customer**
   - Regular user of the system
   - Can perform wallet and account operations
   - Uses web browser interface
   
2. **Admin**
   - System administrator
   - Can monitor and manage system
   - Accesses admin dashboard
   - Optional/future actor

### Secondary Actors
3. **Email Service / SMTP Server**
   - Sends email notifications
   - External system
   - Triggered by notification events
   
4. **Banking System**
   - External provider for deposits and withdrawals
   - Processes real bank transactions
   - Optional external integration

5. **KYC Provider**
   - Verifies identity documents
   - External service for document validation
   - Optional external integration

## 1.3 Use Cases by Category

### AUTHENTICATION & ACCOUNT MANAGEMENT (System Boundary: "NexVault Account Services")

**Actor: End User**

1. **Register New Account**
   - Preconditions: User not already registered
   - Flow: User provides email, password, full name, phone, country, city
   - Portal: Landing Page / Register Page
   - Postconditions: User account created, verification email sent
   - Success Criteria: New user record in database, email verification token generated

2. **Verify Email Address**
   - Preconditions: User registered but email not verified
   - Flow: User clicks verification link in email, system confirms
   - Portal: Email link / Verify Email Page
   - Postconditions: Email marked as verified in database
   - Success Criteria: User email_verified flag set to TRUE

3. **Login to Account**
   - Preconditions: User registered and email verified
   - Flow: User enters email and password, system validates credentials
   - Portal: Login Page
   - Postconditions: Session created, JWT tokens issued
   - Success Criteria: User receives access_token, refresh_token, session_id
   - Related Data: Device name, device type, IP address, user agent tracked

4. **Refresh Access Token**
   - Preconditions: User logged in with valid refresh token
   - Flow: System validates refresh token, issues new access token
   - Portal: Automatic (triggered by frontend)
   - Postconditions: New access token issued
   - Success Criteria: New access token valid for 24 hours
   - Auto-trigger: When primary token expires

5. **Logout from Current Device**
   - Preconditions: User logged in
   - Flow: User clicks logout, session deactivated
   - Portal: Dashboard / Any protected page
   - Postconditions: Current session marked inactive
   - Success Criteria: Tokens cleared from frontend, session deactivated in DB

6. **Logout from All Devices**
   - Preconditions: User logged in with multiple devices
   - Flow: User selects "logout all devices" option, all sessions revoked
   - Portal: Account Settings / Security Settings
   - Postconditions: All user sessions deactivated
   - Success Criteria: User logged out from all devices
   - Notification: User receives alerts about all logouts

7. **Request Password Reset**
   - Preconditions: User registered but forgot password
   - Flow: User provides email, system sends reset link
   - Portal: Login Page / "Forgot Password" Link
   - Postconditions: Reset token generated, email sent
   - Success Criteria: User receives email with reset link valid for 1 hour

8. **Reset Password**
   - Preconditions: User received reset email with valid token
   - Flow: User enters new password, system validates and updates
   - Portal: Password Reset Page (from email link)
   - Postconditions: Password hash updated, all sessions revoked
   - Success Criteria: Password changed, user must login again

9. **View Active Sessions**
   - Preconditions: User logged in
   - Flow: User navigates to security/sessions page, views all active devices
   - Portal: Account Settings / Security Settings / Sessions
   - Postconditions: List of devices displayed
   - Data shown: Device name, device type, IP address, login time, last activity

10. **Revoke Device Session**
    - Preconditions: User has multiple active sessions
    - Flow: User selects device and clicks "logout from this device"
    - Portal: Account Settings / Security Settings / Sessions
    - Postconditions: Selected session marked inactive
    - Success Criteria: Device is logged out, cannot use old tokens

11. **Update Profile**
    - Preconditions: User logged in
    - Flow: User updates personal information (name, phone, country, city, avatar)
    - Portal: Profile Page / Account Settings
    - Postconditions: User profile updated in database
    - Fields editable: firstName, lastName, phoneNumber, country, city, avatar_url, preferred_currency

### WALLET & BALANCE MANAGEMENT (System Boundary: "NexVault Wallet Services")

**Actor: End User**

12. **View Wallet Balance**
    - Preconditions: User logged in, wallet exists
    - Flow: User navigates to dashboard, system fetches wallet balance
    - Portal: Dashboard / Wallet Widget
    - Postconditions: Current balance displayed
    - Data shown: Balance amount, currency (USD/XAF), wallet status
    - Refresh: Real-time fetch from backend
    - Hide Balance: User can toggle balance visibility

13. **Create Wallet** (Automatic)
    - Preconditions: User first time accessing wallet features
    - Flow: System automatically creates wallet for new user
    - Portal: On login or first wallet access
    - Postconditions: Wallet record created with 0 balance
    - Success Criteria: One wallet per user, default currency USD

### TRANSACTION MANAGEMENT (System Boundary: "NexVault Transaction Services")

**Actor: End User**

14. **Deposit Funds**
    - Preconditions: User logged in, wallet exists, verified
    - Flow: User selects deposit, enters amount, chooses payment method
    - Portal: Deposit Page
    - Payment Methods: Card (1.5% fee), Bank Transfer (0% fee, pending status)
    - Postconditions: Transaction recorded, wallet balance updated
    - Success Criteria: Debit transaction created, balance increased
    - Success Response: Transaction reference, new balance, status (completed/pending)
    - Notification: User receives deposit confirmation email
    - RabbitMQ Event: `deposit.created` published

15. **Transfer Funds to Another User**
    - Preconditions: User logged in, sufficient balance, recipient account exists
    - Flow: User enters recipient email, amount, optional note, confirms transfer
    - Portal: Transfer Page
    - Validation:
      - Recipient must exist in system
      - Recipient must have verified email
      - Sender must have sufficient balance (amount + fee)
    - Fee: $0.50 per transfer
    - Postconditions: Debit transaction for sender, credit transaction for recipient
    - Success Criteria: Both wallets updated, both users receive notifications
    - Notification: sender receives "Transfer Sent", recipient receives "Transfer Received"
    - RabbitMQ Events: `transfer.sent`, `transfer.received` published
    - Reference: Auto-generated transaction reference (TRF-XXXXXXXX)

16. **Withdraw Funds to Bank Account**
    - Preconditions: User logged in, sufficient balance, KYC verified or pending
    - Flow: User enters bank name, account number, amount, confirms withdrawal
    - Portal: Withdraw Page
    - Validation:
      - Amount must be positive
      - Account must exist (or be first-time registration)
      - User must have bank details on file
    - Fee: $0 (varies by bank)
    - Status: Pending (processing by external bank system)
    - Processing Time: 1-3 business days
    - Postconditions: Debit transaction created, wallet balance reduced, status pending
    - Success Criteria: Withdrawal transaction recorded, balance decreased
    - Notification: User receives withdrawal initiated email with reference
    - RabbitMQ Event: `withdrawal.initiated` published
    - Reference: Auto-generated (WDR-XXXXXXXX)

17. **View Transaction History**
    - Preconditions: User logged in
    - Flow: User navigates to transactions page, system loads transaction list
    - Portal: Transactions Page / Dashboard
    - Display: Paginated list (50 per page by default)
    - Filters: Optional filters by date range, transaction type, status
    - Columns: Date, Type (credit/debit), Category, Amount, Fee, Status, Reference
    - Sorting: Newest first by default
    - Success Criteria: Transaction list loaded with pagination

18. **View Transaction Details**
    - Preconditions: User logged in, transaction exists
    - Flow: User clicks on transaction, system displays full details
    - Portal: Transaction Details Page
    - Data shown:
      - Transaction ID, reference, timestamp
      - Sender and receiver information
      - Amount, currency, fee
      - Status (pending/completed/failed)
      - Full narrative of transaction
      - Related documents (if any)
    - Success Criteria: All transaction details displayed correctly

### KYC & VERIFICATION (System Boundary: "NexVault KYC Services")

**Actor: End User**

19. **View KYC Status**
    - Preconditions: User logged in
    - Flow: User navigates to KYC page, system displays current status
    - Portal: KYC Status Page / Dashboard Banner
    - Status Options:
      - **Unverified** (initial state)
      - **Pending** (documents submitted, awaiting review)
      - **Verified** (approved by system)
      - **Rejected** (documents not accepted, needs resubmission)
    - Display: Clear status badge, next steps if applicable
    - Success Criteria: Status accurately reflects database state

20. **Submit KYC Documents**
    - Preconditions: User logged in, at KYC unverified state
    - Flow: User uploads documents, system validates and stores
    - Portal: KYC Verification Page
    - Required Documents:
      - Valid photo ID (passport, driver's license, national ID)
      - Selfie with ID (liveness check)
      - Address proof (utility bill, bank statement, government letter)
      - Optional: Passport document
    - Validation:
      - File size < 10MB per document
      - Format: JPG, PNG, PDF
      - Image quality acceptable
      - Faces visible and clear (for ID/selfie)
    - Postconditions: Documents uploaded, KYC status changed to "pending"
    - Success Criteria: All documents stored, verification initiated
    - Notification: User receives confirmation, admin receives review notification
    - Processing: Manual or automated document verification

### NOTIFICATION MANAGEMENT (System Boundary: "NexVault Notification Services")

**Actor: End User**

21. **View Notifications**
    - Preconditions: User logged in
    - Flow: User navigates to notifications page/bell icon
    - Portal: Notifications Page / Notification Bell Any Page
    - Display: List of notifications with newest first
    - Pagination: 50 per page
    - Filtering: Can filter by type or read/unread status
    - Notification Types:
      - Account: login alerts, logout alerts, password change
      - Wallet: balance changes, KYC status updates
      - Transactions: deposit completed, transfer sent/received, withdrawal initiated
      - Security: new device login, session revoked, unusual activity
    - Success Criteria: All user notifications retrieved and displayed

22. **Mark Notification as Read**
    - Preconditions: User has unread notification
    - Flow: User clicks on notification or "mark as read" button
    - Portal: Notifications Page
    - Postconditions: Notification marked as read in database
    - Success Criteria: Notification appears as read, unread count decreases

23. **Mark All Notifications as Read**
    - Preconditions: User has multiple unread notifications
    - Flow: User clicks "mark all as read" button
    - Portal: Notifications Page
    - Postconditions: All user notifications marked as read
    - Success Criteria: Unread count becomes 0

24. **Delete Notification**
    - Preconditions: User has notification to delete
    - Flow: User clicks delete/trash icon on notification
    - Portal: Notifications Page
    - Postconditions: Notification archived or soft-deleted
    - Success Criteria: Notification no longer visible in list

25. **View Unread Notification Count**
    - Preconditions: User logged in
    - Flow: Real-time display of unread count on bell icon
    - Portal: Header / Navbar every page
    - Success Criteria: Count accurate and updates in real-time
    - Trigger: Auto-update when new notification received

### SYSTEM MONITORING & ADMIN (System Boundary: "NexVault Admin Services")

**Actor: Admin** (if role exists)

26. **View System Health**
    - Flow: Admin checks API gateway health and service status
    - Portal: `/health` and `/health/services` endpoints
    - Checks: API Gateway status, Auth Service status, Wallet Service status
    - Services monitored:
      - Auth Service (port 3001)
      - Wallet Service (port 3003)
      - Notification Service (port 3002)
    - Status: Online/Offline
    - Success Criteria: All services show correct status

27. **Monitor Transactions**
    - Flow: Admin views all system transactions (admin dashboard)
    - Portal: Admin Dashboard
    - Data: Filter by user, date, type, status
    - Success Criteria: Admin can review all financial activity

28. **Manage Users**
    - Flow: Admin view user list, user details, can suspend/activate
    - Portal: Admin Dashboard / User Management
    - Actions: View, search, suspend, activate, delete
    - Success Criteria: Admin can manage user accounts

## 1.4 Relationships and Associations

### Include Relationships (Use case includes another)
- **Login to Account** includes **Refresh Access Token** (token refresh happens automatically)
- **Deposit Funds** includes **Send Notification** (email sent after deposit)
- **Transfer Funds** includes **Send Notification** (email sent for both parties)
- **Withdraw Funds** includes **Send Notification** (email sent after withdrawal)
- **Submit KYC Documents** includes **Send Notification** (confirmation emails)
- **Logout from All Devices** includes **Revoke Device Session** (all sessions revoked)

### Extend Relationships (Conditional use cases)
- **View Wallet Balance** extends to **Hide Balance** (optional)
- **View Transaction History** extends to **Apply Filters** (optional)
- **Request Password Reset** extends **Reset Password** (only if reset initiated)

### Dependency Relationships
- **Deposit Funds** depends on: **View Wallet Balance**, wallet exists, user verified
- **Transfer Funds** depends on: recipient account exists, sufficient balance
- **Withdraw Funds** depends on: sufficient balance, bank details exist
- **Submit KYC Documents** depends on: registered account
- **View KYC Status** depends on: documents previously submitted or status set

## 1.5 Use Case Diagram Visual Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                     NexVault System                             │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         End User / Customer                             │  │
│  │              (Primary Actor)                            │  │
│  └──┬──────────────────────────────────────────────────────┴─┐ │
│     │                                                           │ │
│     │    ●─────────────── Register New Account              │ │
│     │    ●─────────────── Verify Email                      │ │
│     │    ●─────────────── Login to Account                  │ │
│     │    ●─────────────── Logout from Current Device        │ │
│     │    ●─────────────── Logout from All Devices           │ │
│     │    ●─────────────── View Active Sessions              │ │
│     │    ●─────────────── Revoke Device Session             │ │
│     │    ●─────────────── Request Password Reset            │ │
│     │    ●─────────────── Reset Password                    │ │
│     │    ●─────────────── Update Profile                    │ │
│     │    ●─────────────── View Wallet Balance               │ │
│     │    ●─────────────── Deposit Funds                     │ │
│     │    ●─────────────── Transfer Funds                    │ │
│     │    ●─────────────── Withdraw Funds                    │ │
│     │    ●─────────────── View Transaction History          │ │
│     │    ●─────────────── View Transaction Details          │ │
│     │    ●─────────────── View KYC Status                   │ │
│     │    ●─────────────── Submit KYC Documents              │ │
│     │    ●─────────────── View Notifications                │ │
│     │    ●─────────────── Mark Notification as Read         │ │
│     │    ●─────────────── Delete Notification               │ │
│     │                                                           │ │
│  ┌──┴──────────────────────────────────────────────────────┬──┐ │
│  │         Admin (Secondary Actor - Optional)             │  │ │
│  │              (System Administrator)                    │  │ │
│  └──┬──────────────────────────────────────────────────────┴─┐ │
│     │                                                           │ │
│     │    ●─────────────── View System Health                │ │
│     │    ●─────────────── Monitor Transactions              │ │
│     │    ●─────────────── Manage Users                      │ │
│     │                                                           │ │
│  ┌──┴──────────────────────────────────────────────────────┬──┐ │
│  │         SMTP / Email Service (Secondary Actor)         │  │ │
│  │              (External System)                         │  │ │
│  └──┬──────────────────────────────────────────────────────┴──┘ │
│     │                                                             │
│     └─────────── <<include>> ──→ Send Notification Emails       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

# PART 2: ACTIVITY DIAGRAM

## 2.1 Overview
Activity diagrams show the flow of activities and decision points for key processes in the system.

## 2.2 Activity Diagram 1: User Registration Flow

### Title: "User Registration and Email Verification Process"

### Swimlanes (3 horizontal lanes)
1. **End User** - initiates actions
2. **Web Frontend** - React application
3. **Backend Services** - API Gateway, Auth Service, Database, Notification Service

### Activities and Flow

**Step 1: User Accesses Registration**
- Activity: User navigates to registration page
- Swimlane: End User
- Trigger: User clicks "Create one free" or "Sign Up"

**Step 2: Enter Registration Data**
- Activity: User fills form (email, password, name, phone, country, city)
- Swimlane: End User
- Input validation: Frontend validates format
- Decision: **Are all fields valid?**
  - YES → Go to Step 3
  - NO → Display error, return to Step 2

**Step 3: Submit Registration Request**
- Activity: Frontend calls `POST /api/auth/register`
- Swimlane: Web Frontend
- Data sent: {email, password, firstName, lastName, phoneNumber, country, city}

**Step 4: API Gateway Routes Request**
- Activity: API Gateway receives request
- Swimlane: Backend Services
- Action: Route to Auth Service on port 3001

**Step 5: Auth Service Validates Input**
- Activity: AuthService.validate() checks:
  - Email format valid
  - Email not already registered
  - Password meets security requirements (length, complexity)
  - All required fields present
- Swimlane: Backend Services
- Decision: **Is all input valid?**
  - NO → Return 400 error, activities end
  - YES → Go to Step 6

**Step 6: Hash Password**
- Activity: Auth Service calls bcrypt.hash(password, 12 rounds)
- Swimlane: Backend Services
- Output: passwordHash

**Step 7: Create User Record**
- Activity: User.create() inserts user record to PostgreSQL
- Swimlane: Backend Services
- Data inserted:
  - id (UUID)
  - email (lowercase)
  - password_hash (bcrypted)
  - first_name
  - last_name
  - phone_number
  - country
  - city
  - kyc_status: "unverified"
  - account_status: "active"
  - email_verified: FALSE
  - created_at: CURRENT_TIMESTAMP
- Success check: User record created?
  - YES → Go to Step 8
  - NO → Return 500 error, activities end

**Step 8: Generate Verification Token**
- Activity: Auth Service generates email verification token (UUID)
- Swimlane: Backend Services
- Token validity: 24 hours
- Store token in a tokens table or in response

**Step 9: Publish Registration Event**
- Activity: Auth Service publishes to RabbitMQ queue `events.user-registered`
- Swimlane: Backend Services
- Event payload:
  ```json
  {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "timestamp": "2024-04-26T10:00:00Z"
  }
  ```

**Step 10: Notification Service Consumes Event**
- Activity: Notification Service listens on `events.user-registered` queue
- Swimlane: Backend Services (Notification Service)
- Action: Event consumed from RabbitMQ

**Step 11: Format Welcome Email**
- Activity: Notification Service builds email template
- Swimlane: Backend Services
- Content:
  - Welcome message
  - Verification link with token
  - User ID
  - Expiration time (24 hours)

**Step 12: Send Email via SMTP**
- Activity: Nodemailer sends email to user@example.com
- Swimlane: Backend Services
- SMTP Configuration from .env
- Success check: Email sent?
  - YES → Continue
  - NO → Log error, continue (non-blocking)

**Step 13: Return Success Response**
- Activity: Auth Service returns response to Frontend
- Swimlane: Backend Services
- Response (201 Created):
  ```json
  {
    "success": true,
    "message": "User registered successfully. Please verify your email.",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "verificationToken": "550e8400-e29b-41d4-a716-446655440001"
  }
  ```

**Step 14: Display Success Message**
- Activity: Frontend displays success message
- Swimlane: Web Frontend
- Message: "Account created! Please check your email to verify."
- Navigation: Redirect to verification page or email verification form

**Step 15: User Checks Email**
- Activity: User receives email and clicks verification link
- Swimlane: End User
- Link format: `https://nexvault.app/verify?token=VERIFICATION_TOKEN&userId=USER_ID`

**Step 16: Verify Email Endpoint Called**
- Activity: Frontend calls `POST /api/auth/verify-email`
- Swimlane: Web Frontend
- Request payload: {userId, token}

**Step 17: Backend Validates Token**
- Activity: Auth Service validates verification token
- Swimlane: Backend Services
- Checks:
  - Token format correct
  - Token exists in database
  - Token not expired
  - Token matches user
- Decision: **Is token valid?**
  - NO → Return 400 error, display "Invalid or expired token"
  - YES → Go to Step 18

**Step 18: Update User Email Verified**
- Activity: User.verifyEmail(userId) updates email_verified = TRUE
- Swimlane: Backend Services
- Query: `UPDATE users SET email_verified = TRUE, email_verified_at = CURRENT_TIMESTAMP`

**Step 19: Delete Verification Token**
- Activity: Token record is deleted or marked as used
- Swimlane: Backend Services

**Step 20: Return Success**
- Activity: Auth Service returns verification success
- Swimlane: Backend Services
- Response: `{success: true, message: "Email verified successfully"}`

**Step 21: Display Verification Success**
- Activity: Frontend shows success message
- Swimlane: Web Frontend
- Message: "Email verified! You can now login."
- Navigation: Redirect to login page

**Step 22: End Activity**
- Activity: User registration and verification process complete
- User can now login with email and password

### Decision Points Summary
1. All registration fields valid?
2. Email not already registered?
3. User record successfully created?
4. Email verification token valid?

### Error Handling Paths
- Invalid input → Display validation error → Return to form
- Email already exists → Display error → Suggest login or recovery
- Database error → Display error → User retries
- Email send failed → Log error → User can request email resend
- Token expired → Display error → User requests new verification email

### Flow Outcomes
- **Success**: User registered, email verified, ready to login
- **Partial Success**: User registered but email verification pending
- **Failure**: Registration fails, user shown error, no account created

---

## 2.3 Activity Diagram 2: Fund Deposit Flow

### Title: "User Deposit Funds Process"

### Swimlanes (3 lanes)
1. **End User** - initiates deposit
2. **Web Frontend** - React application
3. **Backend Services** - API Gateway, Wallet Service, PostgreSQL, RabbitMQ, Notification Service

### Activities and Flow

**Step 1: User Navigates to Deposit**
- Activity: User clicks "Deposit" button on dashboard
- Swimlane: End User
- Navigation: Route to `/deposit` page

**Step 2: Display Deposit Form**
- Activity: Frontend loads deposit page with form
- Swimlane: Web Frontend
- Form fields:
  - Amount (number input)
  - Payment method (dropdown: card, bank_transfer)
  - Currency (default USD, can be XAF)
  - Optional note

**Step 3: User Enters Deposit Details**
- Activity: User fills form and clicks "Deposit"
- Swimlane: End User
- Validates:
  - Amount > 0
  - Payment method selected
  - User confirms action

**Step 4: Frontend Validates Input**
- Activity: JavaScript validation on form
- Swimlane: Web Frontend
- Checks: Amount is positive number, format correct
- Decision: **Is amount valid?**
  - NO → Display error, return to Step 3
  - YES → Go to Step 5

**Step 5: Submit Deposit Request**
- Activity: Frontend calls `POST /api/transactions/deposit`
- Swimlane: Web Frontend
- Request includes:
  - Authorization header with JWT token
  - Request body: {amount, method, currency, reference}

**Step 6: API Gateway Routes Request**
- Activity: API Gateway validates request
- Swimlane: Backend Services
- Actions:
  - Check CORS
  - Apply rate limiting
  - Route to Wallet Service port 3003

**Step 7: Wallet Service Authenticates**
- Activity: JWT middleware validates token
- Swimlane: Backend Services
- Extract userId from token
- Decision: **Is token valid and not expired?**
  - NO → Return 401 Unauthorized
  - YES → Go to Step 8

**Step 8: Validate Deposit Amount**
- Activity: Backend validates amount > 0
- Swimlane: Backend Services
- Decision: **Is amount valid?**
  - NO → Return 400 error
  - YES → Go to Step 9

**Step 9: Check Wallet Exists**
- Activity: Query wallets table for user_id
- Swimlane: Backend Services
- Decision: **Does wallet exist?**
  - NO → Create wallet automatically (Step 9a)
  - YES → Continue to Step 10
- Step 9a: Create wallet with balance = 0

**Step 10: Calculate Transaction Fee**
- Activity: Backend calculates fee based on payment method
- Swimlane: Backend Services
- Logic:
  - If method = "card": fee = amount * 0.015 (1.5%)
  - If method = "bank": fee = 0
- Output: fee amount

**Step 11: Determine Transaction Status**
- Activity: Backend sets transaction status
- Swimlane: Backend Services
- Logic:
  - If method = "card": status = "completed" (immediate)
  - If method = "bank": status = "pending" (1-3 days)

**Step 12: Generate Transaction Reference**
- Activity: Create unique reference code
- Swimlane: Backend Services
- Format: `DEP-{TIMESTAMP_LAST_8_DIGITS}`
- Example: `DEP-12345678`

**Step 13: Insert Transaction Record**
- Activity: INSERT into transactions table
- Swimlane: Backend Services
- Fields:
  - id: UUID
  - user_id
  - type: "credit"
  - category: "deposit"
  - description: "Deposit via {method}"
  - amount
  - currency
  - fee
  - status
  - reference
  - from_entity: {method}
  - to_entity: "My Wallet"
  - created_at: CURRENT_TIMESTAMP
- Success check: Transaction record created?
  - YES → Go to Step 14
  - NO → Return 500 error

**Step 14: Update Wallet Balance**
- Activity: UPDATE wallets table
- Swimlane: Backend Services
- Query: `UPDATE wallets SET balance = balance + {amount - fee} WHERE user_id = {userId}`
- Success check: Wallet updated?
  - YES → Go to Step 15
  - NO → Rollback transaction record, return error

**Step 15: Fetch Updated Balance**
- Activity: SELECT balance FROM wallets WHERE user_id = {userId}
- Swimlane: Backend Services
- Output: new_balance

**Step 16: Publish Deposit Event to RabbitMQ**
- Activity: Publish to `notifications` exchange, route `deposit.created`
- Swimlane: Backend Services
- Event payload:
  ```json
  {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "type": "deposit",
    "title": "Deposit Received",
    "message": "Your deposit of USD 100 has been completed",
    "data": {
      "reference": "DEP-12345678",
      "amount": 100,
      "method": "card",
      "status": "completed"
    }
  }
  ```

**Step 17: Notification Service Consumes Event**
- Activity: Notification Service receives `deposit.created`
- Swimlane: Backend Services (Notification Service)
- Event consumed from RabbitMQ queue

**Step 18: Format Deposit Notification Email**
- Activity: Build email template
- Swimlane: Backend Services
- Email content:
  - Subject: "Deposit Received - Reference: DEP-12345678"
  - Body: Amount, method, status, new balance, reference
  - Call-to-action: "View in wallet"

**Step 19: Send Email Notification**
- Activity: Nodemailer sends email via SMTP
- Swimlane: Backend Services
- To: user@example.com
- Success check: Email sent?
  - YES → Log success
  - NO → Log error (non-blocking, deposit already credited)

**Step 20: Return Success Response**
- Activity: Backend returns deposit response
- Swimlane: Backend Services
- Response (200 OK):
  ```json
  {
    "success": true,
    "message": "Deposit processed successfully",
    "transaction": {
      "id": "uuid-transaction-id",
      "type": "credit",
      "amount": 100,
      "currency": "USD",
      "fee": 1.50,
      "status": "completed",
      "reference": "DEP-12345678"
    },
    "balance": 98.50
  }
  ```

**Step 21: Display Success Message**
- Activity: Frontend displays deposit success
- Swimlane: Web Frontend
- Message: "Deposit of USD 100.00 successful! Reference: DEP-12345678"
- Display: New wallet balance updated
- Actions available:
  - "View Transaction Details"
  - "Make Another Deposit"
  - "Return to Dashboard"

**Step 22: Update Frontend State**
- Activity: Frontend updates WalletContext
- Swimlane: Web Frontend
- Updates:
  - balance = new_balance
  - transactions array = [new_transaction, ...rest]
- UI automatically refreshes showing new balance

**Step 23: End Activity**
- Activity: Deposit process complete
- User sees updated wallet balance
- Transaction appears in history
- Confirmation email received

### Decision Points Summary
1. Is deposit amount valid and positive?
2. Is user authenticated (valid JWT)?
3. Does wallet exist for user?
4. Is payment method recognized?
5. Is transaction record created successfully?
6. Is wallet balance updated successfully?

### Error Handling Paths
- Invalid amount → Display error → Return to form
- Token expired → Return 401 → Frontend refreshes token and retries
- Wallet missing → Auto-create wallet → Continue
- Database error → Rollback → Return 500 error → Retry option
- Invalid payment method → Return 400 error
- Insufficient permissions → Return 403 error

### Success Criteria
- Transaction record created in database
- Wallet balance increased by (amount - fee)
- Deposit reference generated
- Email notification sent
- Frontend displays success with new balance

---

## 2.4 Activity Diagram 3: User Login Flow

### Title: "User Login and Session Creation"

### Swimlanes (3 lanes)
1. **End User** - enters credentials
2. **Web Frontend** - React application
3. **Backend Services** - API Gateway, Auth Service, PostgreSQL

### Activities and Flow

**Step 1: User Navigates to Login**
- Activity: User lands on /login page
- Swimlane: End User

**Step 2: Display Login Form**
- Activity: Frontend displays login form
- Swimlane: Web Frontend
- Fields: Email, Password

**Step 3: User Enters Credentials**
- Activity: User types email and password
- Swimlane: End User
- Clicks "Sign In"

**Step 4: Frontend Validates Format**
- Activity: JavaScript validates email format
- Swimlane: Web Frontend
- Decision: **Is email format valid?**
  - NO → Display error → Return to Step 3
  - YES → Go to Step 5

**Step 5: Submit Login Request**
- Activity: Frontend calls `POST /api/auth/login`
- Swimlane: Web Frontend
- Request body: {email, password, deviceName, deviceType}
- Headers: Captures user agent and IP address on backend

**Step 6: API Gateway Routes Request**
- Activity: API Gateway receives request
- Swimlane: Backend Services
- Route: to Auth Service port 3001

**Step 7: Auth Service Finds User**
- Activity: User.findByEmail(email.toLowerCase())
- Swimlane: Backend Services
- Query database
- Decision: **Does user exist?**
  - NO → Return 401 "Invalid credentials" → Go to Step 18
  - YES → Go to Step 8

**Step 8: Check Email Verified**
- Activity: Check user.email_verified flag
- Swimlane: Backend Services
- Decision: **Is email verified?**
  - NO → Return 403 "Please verify your email first"
  - YES → Go to Step 9

**Step 9: Compare Password**
- Activity: bcrypt.compare(inputPassword, user.password_hash)
- Swimlane: Backend Services
- Decision: **Does password match?**
  - NO → Return 401 "Invalid credentials" → Go to Step 18
  - YES → Go to Step 10

**Step 10: Update Last Login**
- Activity: User.updateLastLogin(userId)
- Swimlane: Backend Services
- Update: last_login_at = CURRENT_TIMESTAMP

**Step 11: Generate JWT Tokens**
- Activity: Generate access and refresh tokens
- Swimlane: Backend Services
- Access token:
  - Payload: {userId, email, tier}
  - Secret: JWT_SECRET
  - Expiry: 24 hours
- Refresh token:
  - Payload: {userId}
  - Secret: JWT_SECRET (different key possible)
  - Expiry: 7 days

**Step 12: Create Session Record**
- Activity: Session.create(sessionData)
- Swimlane: Backend Services
- Fields:
  - id: UUID
  - user_id
  - session_token: UUID
  - refresh_token: (hashed or stored)
  - user_agent: from request header
  - ip_address: from request
  - device_name: from request
  - device_type: from request
  - expires_at: NOW + 24 hours
  - is_active: TRUE
  - created_at: CURRENT_TIMESTAMP

**Step 13: Return Login Response**
- Activity: Auth Service returns success response
- Swimlane: Backend Services
- Response (200 OK):
  ```json
  {
    "success": true,
    "message": "Login successful",
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "sessionId": "550e8400-e29b-41d4-a716-446655440002",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "kycStatus": "unverified",
      "emailVerified": true,
      "tier": "standard"
    },
    "expiresIn": "24h"
  }
  ```

**Step 14: Store Tokens**
- Activity: Frontend stores tokens in localStorage
- Swimlane: Web Frontend
- localStorage keys:
  - nv_access_token: accessToken
  - nv_refresh_token: refreshToken
  - nv_session_id: sessionId

**Step 15: Initialize AuthContext**
- Activity: Frontend sets user in AuthContext
- Swimlane: Web Frontend
- Updates:
  - user = response.user
  - isAuthenticated = true
  - sessionId = response.sessionId

**Step 16: Display Dashboard**
- Activity: Frontend redirects to /dashboard
- Swimlane: Web Frontend
- Navigation: React Router redirects
- Page loads: Dashboard page with user data

**Step 17: Initialize Other Contexts**
- Activity: Frontend loads Wallet, Notification, KYC contexts
- Swimlane: Web Frontend
- Actions:
  - WalletContext fetches balance
  - NotificationContext loads notifications
  - KYCContext loads KYC status

**Step 18: Handle Login Failure**
- Activity: Display error message
- Swimlane: Web Frontend
- Messages:
  - "Invalid email or password"
  - "Please verify your email first"
  - "Account temporarily locked"
- User can retry or use "Forgot Password"

**Step 19: End Activity**
- Activity: User logged in and authenticated
- Swimlane: End User
- Status: Can access protected pages

### Decision Points Summary
1. Is email format valid?
2. Does user exist with that email?
3. Is email verified?
4. Does password match?
5. Are tokens generated successfully?

---

## 2.5 Activity Diagram 4: Transfer Funds Flow

### Title: "User Transfer Funds to Another User"

### Swimlanes (3 lanes)
1. **End User** - initiates transfer
2. **Web Frontend** - React application
3. **Backend Services** - Wallet Service, PostgreSQL, RabbitMQ, Notification Service

### Key Activities

**Step 1: User Navigates to Transfer Page**
- Activity: User clicks "Transfer" → Route to /transfer
- Swimlane: End User

**Step 2: Display Transfer Form**
- Activity: Frontend shows transfer form
- Swimlane: Web Frontend
- Fields:
  - Recipient email
  - Amount
  - Note (optional)
  - Current balance display

**Step 3: User Enters Transfer Details**
- Activity: User fills form and clicks "Confirm Transfer"
- Swimlane: End User

**Step 4: Frontend Validates Input**
- Activity: JavaScript validation
- Swimlane: Web Frontend
- Checks:
  - Recipient email valid format
  - Amount > 0
  - Amount ≤ wallet balance
- Decision: **Is input valid?**
  - NO → Display error → Return to Step 3
  - YES → Go to Step 5

**Step 5: Show Confirmation Dialog**
- Activity: Display confirmation with:
  - "Send USD 100 to john@example.com?"
  - Fee: USD 0.50
  - Total debit: USD 100.50
  - "Confirm" or "Cancel"
- Swimlane: Web Frontend
- Decision: **User confirms?**
  - NO → Return to Step 3
  - YES → Go to Step 6

**Step 6: Submit Transfer Request**
- Activity: Frontend calls `POST /api/transactions/transfer`
- Swimlane: Web Frontend
- Request: {recipientEmail, amount, note, currency}

**Step 7: Backend Authenticates**
- Activity: JWT middleware validates token, extract userId
- Swimlane: Backend Services

**Step 8: Find Recipient User**
- Activity: Query users table for email
- Swimlane: Backend Services
- Decision: **Does recipient exist?**
  - NO → Return 404 "Recipient not found" → Error handling
  - YES → Go to Step 9

**Step 9: Check Recipient Email Verified**
- Activity: Check recipient email_verified
- Swimlane: Backend Services
- Decision: **Is email verified?**
  - NO → Return 400 "Recipient email not verified"
  - YES → Go to Step 10

**Step 10: Fetch Sender Wallet**
- Activity: Query wallets table for sender
- Swimlane: Backend Services
- Get: sender_balance

**Step 11: Calculate Total Debit**
- Activity: total_debit = amount + fee (USD 0.50)
- Swimlane: Backend Services

**Step 12: Check Sufficient Balance**
- Activity: Compare sender_balance >= total_debit
- Swimlane: Backend Services
- Decision: **Sufficient balance?**
  - NO → Return 400 "Insufficient balance for transfer"
  - YES → Go to Step 13

**Step 13: Fetch Recipient Wallet**
- Activity: Query wallets table for recipient
- Swimlane: Backend Services

**Step 14: Generate Transaction Reference**
- Activity: Create reference: `TRF-{TIMESTAMP_LAST_8_DIGITS}`
- Swimlane: Backend Services

**Step 15: Insert Sender Debit Transaction**
- Activity: INSERT into transactions (sender side)
- Swimlane: Backend Services
- Fields:
  - user_id: sender_id
  - type: "debit"
  - category: "transfer"
  - amount: {amount}
  - currency: "USD"
  - fee: 0.50
  - status: "completed"
  - from_entity: "My Wallet"
  - to_entity: recipient_email
  - reference: txRef

**Step 16: Insert Recipient Credit Transaction**
- Activity: INSERT into transactions (recipient side)
- Swimlane: Backend Services
- Fields:
  - user_id: recipient_id
  - type: "credit"
  - category: "transfer"
  - from_entity: sender_email
  - to_entity: "My Wallet"
  - reference: txRef (same)

**Step 17: Update Sender Wallet**
- Activity: `UPDATE wallets SET balance = balance - {total_debit}`
- Swimlane: Backend Services

**Step 18: Update Recipient Wallet**
- Activity: `UPDATE wallets SET balance = balance + {amount}`
- Swimlane: Backend Services

**Step 19: Fetch Updated Sender Balance**
- Activity: SELECT balance FROM wallets WHERE user_id = sender_id
- Swimlane: Backend Services

**Step 20: Publish Transfer Events**
- Activity: Publish 2 events to RabbitMQ
- Swimlane: Backend Services
- Event 1 - `transfer.sent`:
  ```json
  {
    "userId": "sender_id",
    "type": "transfer",
    "title": "Transfer Sent",
    "message": "You sent USD 100 to john@example.com",
    "data": {
      "reference": "TRF-12345678",
      "recipient": "john@example.com",
      "amount": 100
    }
  }
  ```
- Event 2 - `transfer.received`:
  ```json
  {
    "userId": "recipient_id",
    "type": "transfer",
    "title": "Transfer Received",
    "message": "You received USD 100 from jane@example.com",
    "data": {
      "reference": "TRF-12345678",
      "sender": "jane@example.com",
      "amount": 100
    }
  }
  ```

**Step 21: Notification Service Processes Events**
- Activity: Notification Service consumes both events
- Swimlane: Backend Services (Notification Service)
- Actions: Send 2 emails (sender and recipient)

**Step 22: Return Success Response**
- Activity: Backend returns transfer success
- Swimlane: Backend Services
- Response:
  ```json
  {
    "success": true,
    "message": "Transfer sent successfully",
    "transaction": {
      "type": "debit",
      "amount": 100,
      "currency": "USD",
      "fee": 0.50,
      "recipient": "john@example.com",
      "reference": "TRF-12345678"
    },
    "balance": 899.50
  }
  ```

**Step 23: Display Success Message**
- Activity: Frontend shows transfer success
- Swimlane: Web Frontend
- Message: "Transfer of USD 100 sent to john@example.com!"
- Display: Reference number, new balance
- Navigation: Links to view transaction or dashboard

**Step 24: Update Frontend State**
- Activity: Frontend updates WalletContext
- Swimlane: Web Frontend
- Updates: balance, transactions list

**Step 25: End Activity**
- Activity: Transfer complete
- Both users receive email notifications
- Transaction appears in both histories

### Error Handling
- Recipient not found → 404
- Insufficient balance → 400
- Email not verified → 400
- Invalid amount → 400

---

## 2.6 Activity Diagram 5: KYC Document Submission

### Title: "User Submit KYC Documents for Verification"

### Swimlanes (3 lanes)
1. **End User** - uploads documents
2. **Web Frontend** - React with file upload
3. **Backend Services** - Wallet Service, Document Storage, Database

### Key Activities

**Step 1: User Navigates to KYC Page**
- Activity: User clicks "Submit KYC" or KYC notice
- Swimlane: End User

**Step 2: Display KYC Status**
- Activity: Frontend fetches and displays KYC status
- Swimlane: Web Frontend
- Decision: **Current status?**
  - "unverified" → Show submission form
  - "pending" → Show "Awaiting review" message
  - "verified" → Show "KYC Verified" badge
  - "rejected" → Show reason and resubmit option

**Step 3: Display Document Upload Form** (if unverified)
- Activity: Frontend shows required documents
- Swimlane: Web Frontend
- Required documents:
  - Photo ID (passport, driver's license, national ID)
  - Selfie with ID
  - Address proof
  - Passport (optional)

**Step 4: User Selects Documents**
- Activity: User clicks file input and selects documents
- Swimlane: End User
- Files: JPEG, PNG, PDF < 10MB each

**Step 5: Frontend Validates Files**
- Activity: JavaScript validates each file
- Swimlane: Web Frontend
- Checks:
  - File size < 10MB
  - File format in [JPG, PNG, PDF]
  - File not corrupted
- Decision: **Are all files valid?**
  - NO → Display error → Return to Step 4
  - YES → Go to Step 6

**Step 6: Display Confirmation**
- Activity: Show summary of files to upload
- Swimlane: Web Frontend
- "Ready to upload 4 documents? This may take a minute."

**Step 7: Upload Documents**
- Activity: Frontend calls multipart POST for each document
- Swimlane: Web Frontend
- Endpoint: `POST /api/kyc/upload`
- Format: FormData with file + documentType
- Loop: Upload each document sequentially or in parallel

**Step 8: Backend Receives Upload**
- Activity: Wallet Service receives file upload
- Swimlane: Backend Services
- Actions:
  - Validate JWT token
  - Validate file (size, format, virus scan if applicable)

**Step 9: Store Document**
- Activity: Save file to storage (disk or cloud storage)
- Swimlane: Backend Services
- Storage path: `/uploads/kyc/{userId}/{documentType}/{timestamp}.{ext}`
- Or: Cloud storage (S3, Azure Blob, etc.)

**Step 10: Insert Document Record**
- Activity: INSERT into kyc_documents table
- Swimlane: Backend Services
- Fields:
  - id: UUID
  - user_id
  - document_type: [id, passport, selfie, address_proof]
  - file_path or file_url
  - file_name
  - file_size
  - uploaded_at: CURRENT_TIMESTAMP
  - verification_status: "pending"

**Step 11: Return Upload Success**
- Activity: Backend returns success for each file
- Swimlane: Backend Services
- Response: {success: true, documentType, fileUrl}

**Step 12: Update Upload Progress**
- Activity: Frontend updates progress bar
- Swimlane: Web Frontend
- Progress: 1/4, 2/4, 3/4, 4/4

**Step 13: All Documents Uploaded?**
- Activity: Check if all required documents uploaded
- Swimlane: Web Frontend
- Decision: **All required docs uploaded?**
  - NO → Prompt "Please upload missing documents"
  - YES → Go to Step 14

**Step 14: Update KYC Status**
- Activity: Backend updates kyc_status to "pending"
- Swimlane: Backend Services
- Query: `UPDATE users SET kyc_status = 'pending'`

**Step 15: Publish KYC Event**
- Activity: Publish to RabbitMQ `events.kyc-submitted`
- Swimlane: Backend Services
- Event: {userId, timestamp, documentCount}

**Step 16: Return Final Response**
- Activity: Backend returns KYC submission success
- Swimlane: Backend Services
- Response:
  ```json
  {
    "success": true,
    "message": "KYC documents submitted for verification",
    "kycStatus": "pending",
    "submittedAt": "2024-04-26T10:00:00Z"
  }
  ```

**Step 17: Display Success Message**
- Activity: Frontend shows success
- Swimlane: Web Frontend
- Message: "Documents submitted! We'll review within 24 hours."
- Display: Pending status badge

**Step 18: Update KYCContext**
- Activity: Frontend updates KYCContext
- Swimlane: Web Frontend
- Updates: kycStatus = "pending"

**Step 19: End Activity**
- Activity: User documents submitted
- Status: Awaiting verification

### Verification (Manual/Automated Process)

**Step 20: Admin/System Reviews Documents**
- Activity: Manual or automated verification
- Swimlane: Backend Services

**Step 21: Update Verification Status**
- Activity: Query sets kyc_status to "verified" or "rejected"
- Swimlane: Backend Services

**Step 22: Send Verification Email**
- Activity: Notification Service sends status email
- Swimlane: Backend Services
- If verified: "Your KYC is verified!"
- If rejected: "Your KYC was rejected. Reason: ..."

**Step 23: User Receives Notification**
- Activity: User sees KYC status updated
- Swimlane: End User
- Next: Can now access higher transaction limits if verified

---

# PART 3: CLASS DIAGRAM

## 3.1 Overview
The class diagram shows the structure of the system: classes, attributes, methods, and their relationships.

## 3.2 Frontend Classes

### 3.2.1 APIClient Class

```
┌──────────────────────────────┐
│         APIClient            │
├──────────────────────────────┤
│ - token: string              │
│ - refreshToken: string       │
├──────────────────────────────┤
│ + getBaseUrl(endpoint)       │
│ + getAuthHeader()            │
│ + fetchAPI(endpoint, opts)   │
│ + refreshAccessToken()       │
│ + login(email, password)     │
│ + register(userData)         │
│ + logout(sessionId)          │
│ + logoutAllDevices()         │
│ + verifyEmail(userId, token) │
│ + getWalletBalance()         │
│ + transfer(email, amount)    │
│ + deposit(amount, method)    │
│ + withdraw(amount, bank)     │
│ + getNotifications(limit)    │
│ + markNotificationAsRead()   │
│ + getKYCStatus()             │
│ + uploadKYCDocument(file)    │
└──────────────────────────────┘
```

**APIClient Methods Detail:**
- `getBaseUrl(endpoint: string): string`
  - Returns appropriate API gateway or mock auth URL
  - Used for routing requests in development/production
  
- `getAuthHeader(): object`
  - Returns object: {Authorization: `Bearer ${token}`} if token exists
  - Returns empty object {} if no token
  
- `fetchAPI(endpoint: string, options: object): Promise<object>`
  - Wraps fetch() with token injection
  - Handles 401 errors by calling refreshAccessToken()
  - Throws error on non-200 responses
  
- `login(email: string, password: string): Promise<object>`
  - Calls POST /api/auth/login
  - Calls setTokens() to store returned tokens
  - Returns user object
  
- `register(userData: object): Promise<object>`
  - Calls POST /api/auth/register
  - userData = {email, password, firstName, lastName, phoneNumber, country, city}
  - Returns success and verification token
  
- `logout(sessionId: string): Promise<object>`
  - Calls POST /api/auth/logout
  - Calls clearTokens()
  - Returns success
  
- `getWalletBalance(): Promise<object>`
  - Calls GET /api/wallets/balance
  - Returns {success, balance, currency}
  
- `transfer(recipientEmail: string, amount: number, note: string): Promise<object>`
  - Calls POST /api/transactions/transfer
  - Returns transaction and new balance
  
- `deposit(amount: number, method: string, currency: string): Promise<object>`
  - Calls POST /api/transactions/deposit
  - Returns transaction and new balance
  
- `getNotifications(limit: number = 50): Promise<object>`
  - Calls GET /api/notifications?limit={limit}
  - Returns array of notifications

### 3.2.2 AuthProvider / Context Component

```
┌───────────────────────────────┐
│     AuthProvider              │
├───────────────────────────────┤
│ - user: User | null           │
│ - isLoading: boolean          │
│ - error: string | null        │
│ - sessionId: string | null    │
├───────────────────────────────┤
│ + login(email, password)      │
│ + register(userData)          │
│ + logout()                    │
│ + logoutAllDevices()          │
│ + updateUser(userData)        │
│ + getActiveSessions()         │
│ + revokeSession(sessionId)    │
│ + provide AuthContext         │
└───────────────────────────────┘
```

**AuthProvider State:**
- `user`: Current authenticated User object or null
- `isLoading`: Boolean flag for loading state during auth operations
- `error`: Error message string or null
- `sessionId`: Current session ID used for logout

**AuthProvider Methods:**
- `login(email: string, password: string): Promise<{success, user}>`
  - Uses apiClient.login()
  - Updates user state
  - Returns success/error
  
- `register(userData: object): Promise<{success, message}>`
  - Uses apiClient.register()
  - Returns confirmation message
  
- `logout(): Promise<{success}>`
  - Calls apiClient.logout(sessionId)
  - Clears user state and tokens
  - Always returns success (clears state even if API fails)
  
- `getActiveSessions(): Promise<Session[]>`
  - Calls apiClient.getActiveSessions()
  - Returns array of session objects

### 3.2.3 WalletProvider / Context Component

```
┌───────────────────────────────┐
│    WalletProvider             │
├───────────────────────────────┤
│ - balance: number             │
│ - transactions: Transaction[] │
│ - hideBalance: boolean        │
│ - loading: boolean            │
│ - error: string | null        │
├───────────────────────────────┤
│ + refreshWallet()             │
│ + deposit(amount, method)     │
│ + transfer(email, amount)     │
│ + withdraw(amount, bank)      │
│ + resetWallet()               │
│ + setHideBalance(boolean)     │
│ + provide WalletContext       │
└───────────────────────────────┘
```

**WalletProvider State:**
- `balance`: Current wallet balance (number)
- `transactions`: Array of Transaction objects
- `hideBalance`: Boolean to show/hide balance in UI
- `loading`: During async operations
- `error`: Error message or null

**WalletProvider Methods:**
- `refreshWallet(): Promise<void>`
  - Calls getWalletBalance() and getTransactionHistory()
  - Updates both balance and transactions
  
- `deposit(amount: number, method: string): Promise<{success, transaction}>`
  - Calls apiClient.deposit()
  - Updates state: balance + transaction
  
- `transfer(email: string, amount: number): Promise<{success, transaction}>`
  - Calls apiClient.transfer()
  - Updates transactions list
  
- `withdraw(amount: number, bank: object): Promise<{success, transaction}>`
  - Calls apiClient.withdraw()
  - Updates state with pending transaction

### 3.2.4 NotificationProvider / Context Component

```
┌─────────────────────────────────┐
│   NotificationProvider          │
├─────────────────────────────────┤
│ - notifications: Notification[] │
│ - unreadCount: number           │
│ - loading: boolean              │
│ - error: string | null          │
├─────────────────────────────────┤
│ + loadNotifications()           │
│ + markAsRead(id)               │
│ + markAllAsRead()              │
│ + deleteNotification(id)       │
│ + refreshNotifications()        │
│ + provide NotificationContext  │
└─────────────────────────────────┘
```

**NotificationProvider State:**
- `notifications`: Array of Notification objects
- `unreadCount`: Number of unread notifications
- `loading`: During fetch operations
- `error`: Error message or null

**NotificationProvider Methods:**
- `loadNotifications(limit: number = 50): Promise<void>`
  - Fetches notifications from API
  - Updates notifications array
  
- `markAsRead(notificationId: string): Promise<void>`
  - Calls API to mark single notification as read
  - Updates local state
  - Decreases unreadCount
  
- `deleteNotification(notificationId: string): Promise<void>`
  - Removes notification from list

### 3.2.5 KYCProvider / Context Component

```
┌────────────────────────────────┐
│     KYCProvider                │
├────────────────────────────────┤
│ - kycStatus: string            │
│ - kycDocuments: KYCDoc[]       │
│ - loading: boolean             │
│ - error: string | null         │
├────────────────────────────────┤
│ + loadKycStatus()              │
│ + submitKYC(formData)          │
│ + refreshKycStatus()           │
│ + provide KYCContext           │
└────────────────────────────────┘
```

**KYCProvider State:**
- `kycStatus`: "unverified" | "pending" | "verified" | "rejected"
- `kycDocuments`: Array of uploaded document objects
- `loading`: During KYC operations
- `error`: Error message or null

**KYCProvider Methods:**
- `submitKYC(formData: FormData): Promise<{success}>`
  - Uploads each document to /kyc/upload
  - Updates kycStatus to "pending"
  - Returns confirmation

### 3.2.6 Data Models (Frontend)

```
┌──────────────────────────┐
│       User               │
├──────────────────────────┤
│ - id: string (UUID)      │
│ - email: string          │
│ - firstName: string      │
│ - lastName: string       │
│ - kycStatus: string      │
│ - emailVerified: boolean │
│ - tier: string           │
└──────────────────────────┘

┌──────────────────────────┐
│     Transaction          │
├──────────────────────────┤
│ - id: string (UUID)      │
│ - type: string (debit)   │
│ - category: string       │
│ - description: string    │
│ - amount: number         │
│ - currency: string       │
│ - fee: number            │
│ - status: string         │
│ - reference: string      │
│ - from: string           │
│ - to: string             │
│ - date: string (ISO)     │
├──────────────────────────┤
│ + getStatusColor()       │
│ + formatAmount()         │
└──────────────────────────┘

┌──────────────────────────┐
│     Notification         │
├──────────────────────────┤
│ - id: string (UUID)      │
│ - type: string           │
│ - title: string          │
│ - message: string        │
│ - read: boolean          │
│ - createdAt: string      │
├──────────────────────────┤
│ + getIcon()              │
│ + getColor()             │
└──────────────────────────┘

┌──────────────────────────┐
│      Session             │
├──────────────────────────┤
│ - id: string (UUID)      │
│ - deviceName: string     │
│ - deviceType: string     │
│ - ipAddress: string      │
│ - createdAt: string      │
│ - lastActivity: string   │
└──────────────────────────┘
```

---

## 3.3 Backend Classes

### 3.3.1 User Model

```
┌────────────────────────────────────────┐
│           User (Database Model)        │
├────────────────────────────────────────┤
│ - id: UUID (PK)                        │
│ - email: string (UNIQUE)               │
│ - password_hash: string               │
│ - first_name: string                   │
│ - last_name: string                    │
│ - phone_number: string (nullable)      │
│ - country: string (nullable)           │
│ - city: string (nullable)              │
│ - avatar_url: string (nullable)        │
│ - kyc_status: string                   │
│ - account_status: string               │
│ - email_verified: boolean              │
│ - tier: string                         │
│ - preferred_currency: string           │
│ - created_at: timestamp                │
│ - last_login_at: timestamp (nullable)  │
│ - deleted_at: timestamp (nullable)     │
├────────────────────────────────────────┤
│ + create(userData)                     │
│ + findByEmail(email)                   │
│ + findById(userId)                     │
│ + emailExists(email)                   │
│ + updateProfile(userId, updates)       │
│ + updatePassword(userId, hash)         │
│ + updateLastLogin(userId)              │
│ + verifyEmail(userId)                  │
│ + updateKYCStatus(userId, status)      │
│ + delete(userId)                       │
│ + getStats()                           │
└────────────────────────────────────────┘
```

### 3.3.2 Session Model

```
┌──────────────────────────────────────┐
│       Session (Database Model)       │
├──────────────────────────────────────┤
│ - id: UUID (PK)                      │
│ - user_id: UUID (FK → User)          │
│ - session_token: UUID                │
│ - refresh_token: string (nullable)   │
│ - user_agent: string (nullable)      │
│ - ip_address: string (nullable)      │
│ - device_name: string (nullable)     │
│ - device_type: string (nullable)     │
│ - expires_at: timestamp              │
│ - last_activity: timestamp           │
│ - is_active: boolean                 │
│ - created_at: timestamp              │
├──────────────────────────────────────┤
│ + create(sessionData)                │
│ + findByToken(token)                 │
│ + getActiveSessions(userId)          │
│ + updateActivity(sessionId)          │
│ + revoke(sessionId)                  │
│ + revokeAllSessions(userId)          │
│ + cleanupExpiredSessions()           │
└──────────────────────────────────────┘
```

### 3.3.3 Notification Model

```
┌─────────────────────────────────────┐
│    Notification (Database Model)    │
├─────────────────────────────────────┤
│ - id: UUID (PK)                     │
│ - user_id: UUID (FK → User)         │
│ - type: string                      │
│ - title: string                     │
│ - message: string                   │
│ - data: JSON (nullable)             │
│ - priority: string                  │
│ - is_read: boolean                  │
│ - is_archived: boolean              │
│ - created_at: timestamp             │
│ - read_at: timestamp (nullable)     │
├─────────────────────────────────────┤
│ + create(notificationData)          │
│ + getUserNotifications(userId)      │
│ + getUnreadCount(userId)            │
│ + markAsRead(notificationId)        │
│ + markAllAsRead(userId)             │
│ + delete(notificationId)            │
│ + getByType(userId, type)           │
└─────────────────────────────────────┘
```

### 3.3.4 Wallet Model

```
┌─────────────────────────────────────┐
│     Wallet (Database Model)         │
├─────────────────────────────────────┤
│ - id: UUID (PK)                     │
│ - user_id: UUID (FK, UNIQUE)        │
│ - balance: decimal(15,2)            │
│ - currency: string (default USD)    │
│ - status: string (active)           │
│ - created_at: timestamp             │
│ - updated_at: timestamp             │
├─────────────────────────────────────┤
│ + create(userId, currency)          │
│ + findByUserId(userId)              │
│ + getBalance(userId)                │
│ + updateBalance(userId, amount)     │
│ + deposit(userId, amount, fee)      │
│ + withdraw(userId, amount)          │
└─────────────────────────────────────┘
```

### 3.3.5 Transaction Model

```
┌───────────────────────────────────────────┐
│     Transaction (Database Model)          │
├───────────────────────────────────────────┤
│ - id: UUID (PK)                           │
│ - user_id: UUID (FK → User)               │
│ - type: string (credit/debit)             │
│ - category: string (deposit/transfer)     │
│ - description: string                     │
│ - amount: decimal(15,2)                   │
│ - currency: string                        │
│ - fee: decimal(15,2)                      │
│ - status: string (pending/completed)      │
│ - reference: string (UNIQUE)              │
│ - from_entity: string                     │
│ - to_entity: string                       │
│ - bank_name: string (nullable)            │
│ - account_number: string (nullable)       │
│ - note: string (nullable)                 │
│ - created_at: timestamp                   │
│ - updated_at: timestamp                   │
├───────────────────────────────────────────┤
│ + create(transactionData)                 │
│ + findById(transactionId)                 │
│ + getHistoryByUser(userId, limit)         │
│ + getByReference(reference)               │
│ + updateStatus(transactionId, status)     │
└───────────────────────────────────────────┘
```

### 3.3.6 AuthService Class

```
┌──────────────────────────────────────┐
│       AuthService (Business Logic)   │
├──────────────────────────────────────┤
│ - userModel: User                    │
│ - sessionModel: Session              │
│ - notificationModel: Notification    │
├──────────────────────────────────────┤
│ + register(userData)                 │
│ + login(email, password, ip, ua)     │
│ + refreshToken(refreshToken)         │
│ + logout(sessionId, userId)          │
│ + logoutAllDevices(userId)           │
│ + verifyEmail(userId, token)         │
│ + requestPasswordReset(email)        │
│ + resetPassword(userId, token, pass) │
│ + getActiveSessions(userId)          │
│ + revokeDeviceSession(sessionId)     │
│ + generateTokens(userId)             │
│ + validatePassword(plaintext, hash)  │
│ + sendVerificationEmail(user, token) │
└──────────────────────────────────────┘
```

**AuthService Methods Detail:**

- `register(userData: object): Promise<object>`
  - Validates input (email not exists, password strong)
  - Hash password with bcrypt
  - Create User record
  - Generate verification token
  - Publish events.user-registered
  - Return user + token
  
- `login(email: string, password: string, ipAddress: string, userAgent: string): Promise<object>`
  - Find user by email
  - Validate password
  - Update last_login_at
  - Create Session record
  - Generate JWT accessToken and refreshToken
  - Publish events.user-login
  - Return tokens + user + sessionId
  
- `refreshToken(refreshToken: string): Promise<object>`
  - Validate refresh token
  - Generate new access token
  - Return new accessToken
  
- `logout(sessionId: string, userId: string): Promise<object>`
  - Revoke session (set is_active = FALSE)
  - Optionally publish logout event
  - Return success
  
- `verifyEmail(userId: string, token: string): Promise<object>`
  - Validate token + userId combination
  - Check token not expired
  - Update user email_verified = TRUE
  - Delete/invalidate token
  - Return success

### 3.3.7 WalletService Class

```
┌──────────────────────────────────────┐
│     WalletService (Business Logic)   │
├──────────────────────────────────────┤
│ - walletModel: Wallet                │
│ - transactionModel: Transaction      │
│ - kycModel: KYCStatus                │
├──────────────────────────────────────┤
│ + deposit(userId, amount, method)    │
│ + transfer(senderId, recipient, amt) │
│ + withdraw(userId, amount, bank)     │
│ + getWalletBalance(userId)           │
│ + getTransactionHistory(userId)      │
│ + validateTransfer(sender, amount)   │
│ + publishEvent(event, payload)       │
└──────────────────────────────────────┘
```

**WalletService Methods Detail:**

- `deposit(userId: string, amount: number, method: string): Promise<object>`
  - Validate amount > 0
  - Create/get wallet
  - Calculate fee based on method
  - Insert transaction (credit) record
  - Update wallet balance = balance + (amount - fee)
  - Publish deposit.created event
  - Return transaction + balance
  
- `transfer(senderId: string, recipientEmail: string, amount: number): Promise<object>`
  - Find recipient user
  - Validate sender balance sufficient
  - Validate recipient account exists and verified
  - Calculate fee (0.50)
  - Insert sender debit transaction
  - Insert recipient credit transaction
  - Update sender wallet (debit total)
  - Update recipient wallet (credit amount)
  - Publish transfer.sent and transfer.received events
  - Return transaction + balance
  
- `withdraw(userId: string, amount: number, bankDetails: object): Promise<object>`
  - Validate wallet balance sufficient
  - Insert withdrawal transaction (pending status)
  - Update wallet balance (debit)
  - Publish withdrawal.initiated event
  - Return transaction + balance

### 3.3.8 NotificationService Class

```
┌────────────────────────────────────┐
│    NotificationService             │
├────────────────────────────────────┤
│ - emailTransporter: Transporter    │
│ - rabbitmqChannel: Channel         │
├────────────────────────────────────┤
│ + connectRabbitMQ()                │
│ + consumeMessage(queue, callback)  │
│ + sendEmailNotification(to, subj)  │
│ + sendSMSNotification(phone, msg)  │
│ + initializeConsumers()            │
│ + formatEmailTemplate(data)        │
└────────────────────────────────────┘
```

**NotificationService Methods:**

- `connectRabbitMQ(): Promise<void>`
  - Connect to RabbitMQ server
  - Create channel
  - Declare necessary exchanges and queues
  
- `consumeMessage(queue: string, callback: function): Promise<void>`
  - Subscribe to queue
  - Call callback for each message
  - Auto-acknowledge (or manual as needed)
  
- `sendEmailNotification(to: string, subject: string, htmlContent: string): Promise<void>`
  - Use nodemailer transporter
  - Send email via SMTP
  - Log success or error
  
- `initializeConsumers(): void`
  - Setup consumers for:
    - events.user-registered
    - events.user-login
    - notifications.email
    - deposit.created
    - transfer.sent + transfer.received
    - withdrawal.initiated

### 3.3.9 API Gateway Class

```
┌──────────────────────────────────────┐
│        API Gateway (Express App)     │
├──────────────────────────────────────┤
│ - authServiceUrl: string             │
│ - walletServiceUrl: string           │
│ - notificationServiceUrl: string     │
├──────────────────────────────────────┤
│ + use middleware (CORS, helmet)      │
│ + proxyAuthRoutes()                  │
│ + proxyWalletRoutes()                │
│ + proxyNotificationRoutes()          │
│ + healthCheck()                      │
│ + serviceHealthCheck()               │
│ + errorHandler()                     │
└──────────────────────────────────────┘
```

---

## 3.4 Relationships

### 3.4.1 Inheritance Relationships
- None defined (no class inheritance in this event-driven architecture)

### 3.4.2 Composition Relationships

**AuthProvider "contains" User**
```
AuthProvider 1 ─── 1 User
```
- AuthProvider maintains current logged-in User or null

**WalletProvider "contains" Transaction**
```
WalletProvider 1 ─── * Transaction
```
- WalletProvider holds list of transactions for display

**NotificationProvider "contains" Notification**
```
NotificationProvider 1 ─── * Notification
```
- NotificationProvider manages list of notifications

**KYCProvider "contains" KYCDocument**
```
KYCProvider 1 ─── * KYCDocument
```

### 3.4.3 Association Relationships

**Frontend API Communication**
```
AuthProvider → APIClient
WalletProvider → APIClient
NotificationProvider → APIClient
KYCProvider → APIClient
```

**Backend Service Chain**
```
User (DB) ← ─ AuthService
Session (DB) ← ─ AuthService
Notification (DB) ← ─ AuthService

Wallet (DB) ← ─ WalletService
Transaction (DB) ← ─ WalletService
KYCStatus (DB) ← ─ WalletService

RabbitMQ ← → AuthService
RabbitMQ ← → WalletService
RabbitMQ → NotificationService

NotificationService → SMTP Server (email)
```

### 3.4.4 Dependency Relationships

**Frontend Dependencies**
```
Pages (Login, Dashboard, etc.) 
    ↓
    Uses
    ↓
Contexts (Auth, Wallet, Notification, KYC)
    ↓
    Use
    ↓
APIClient

Contexts also depend on:
- localStorage API
- React hooks (useState, useContext, useEffect)
```

**Backend Dependencies**
```
Routes (auth, wallet, kyc)
    ↓
    Call
    ↓
Services (AuthService, WalletService)
    ↓
    Use
    ↓
Models (User, Session, Wallet, Transaction)
    ↓
    Database (PostgreSQL) + RabbitMQ
```

---

# PART 4: SEQUENCE DIAGRAMS

## 4.1 Overview
Sequence diagrams show the interaction between different system components over time for specific use cases.

## 4.2 Sequence Diagram 1: User Login Sequence

### Diagram Title: "Login Sequence - User Authentication"

### Participants (Lifelines)
1. **User** (Actor)
2. **Web Frontend** (React)
3. **API Gateway** (Express)
4. **Auth Service** (Express)
5. **PostgreSQL** (Database)

### Message Flow with Sequence Numbers

```
Time ↓
─────────────────────────────────────────────────────────────

1. User → Web Frontend: Click "Sign In"
   [User clicks login button on /login page]

2. Web Frontend: Validate email format
   [JavaScript validates email@domain.com format]

3. Web Frontend → API Gateway: POST /api/auth/login
   [Headers: Content-Type: application/json]
   [Body: {email, password, deviceName, deviceType}]

4. API Gateway: CORS check
   [Verify origin, apply rate limiting]

5. API Gateway → Auth Service: POST /api/auth/login
   [Forward request to http://localhost:3001]

6. Auth Service → PostgreSQL: SELECT * FROM users WHERE email = $1
   [Query: user lookup by email]

7. PostgreSQL → Auth Service: User record or null
   [Returns user object with password_hash if found]

8. Auth Service: Validate Query Result
   [Decision: User exists?]
   ├─ NO → Return 401 "Invalid credentials"
   └─ YES → Continue

9. Auth Service: Check email_verified flag
   [Decision: email_verified = TRUE?]
   ├─ NO → Return 403 "Verify email first"
   └─ YES → Continue

10. Auth Service: bcrypt.compare(inputPassword, passwordHash)
    [Validate password matches hash]

11. Auth Service: Validate Password Result
    [Decision: Password match?]
    ├─ NO → Return 401 "Invalid credentials"
    └─ YES → Continue

12. Auth Service → PostgreSQL: UPDATE users SET last_login_at = NOW
    [Update last login timestamp]

13. PostgreSQL → Auth Service: Confirmation

14. Auth Service: Generate JWT tokens
    [Create accessToken (24h) and refreshToken (7d)]

15. Auth Service → PostgreSQL: INSERT INTO sessions (...)
    [Create session record with device info]
    [Fields: user_id, session_token, refresh_token, device_name, device_type, ip_address, user_agent, expires_at]

16. PostgreSQL → Auth Service: Session record created
    [Returns session ID]

17. Auth Service → API Gateway: Response 200 OK
    [Body:
     {
       success: true,
       accessToken: "eyJhbGci...",
       refreshToken: "eyJhbGci...",
       sessionId: "550e8400...",
       user: {
         id, email, firstName, lastName, kycStatus, emailVerified, tier
       },
       expiresIn: "24h"
     }
    ]

18. API Gateway → Web Frontend: Response 200
    [Forward response from Auth Service]

19. Web Frontend: Parse response
    [Extract tokens and user data]

20. Web Frontend: Store tokens in localStorage
    [localStorage.setItem('nv_access_token', accessToken)]
    [localStorage.setItem('nv_refresh_token', refreshToken)]
    [localStorage.setItem('nv_session_id', sessionId)]

21. Web Frontend: Update AuthContext
    [Set user = response.user]
    [Set isAuthenticated = true]
    [Set sessionId = response.sessionId]

22. Web Frontend → User: Display Dashboard
    [Navigate to /dashboard]
    [Show user welcome message and wallet balance]

23. Web Frontend: Initialize other contexts
    [WalletContext.fetchBalance()]
    [NotificationContext.loadNotifications()]

24. Web Frontend → User: Full dashboard loaded
    [User logged in and authenticated]

─────────────────────────────────────────────────────────────
```

### Decision Points
- User exists?
- Email verified?
- Password matches?
- Tokens generated successfully?

### Error Scenarios

**Scenario A: Invalid Email**
```
Web Frontend: Detect format error
Web Frontend: Display error message
Web Frontend: Clear password field
User: Retry login
```

**Scenario B: User Not Found**
```
Auth Service → API Gateway: Return 401
API Gateway → Web Frontend: Response 401
Web Frontend: Display error "Invalid email or password"
User: Can click "Forgot Password" or "Register"
```

**Scenario C: Password Wrong**
```
Auth Service: bcrypt returns false
Auth Service → API Gateway: Return 401
Web Frontend: Display error
Web Frontend: Remain on login page
User: Can retry or reset password
```

**Scenario D: Email Not Verified**
```
Auth Service: Check email_verified = FALSE
Auth Service → API Gateway: Return 403
Web Frontend: Display error "Verify your email first"
Web Frontend: Show option "Resend verification email"
User: Resend or check email
```

### Success Criteria
✓ User authenticated with valid credentials
✓ Session created in database
✓ Tokens generated (access + refresh)
✓ Tokens stored in localStorage
✓ Dashboard displayed
✓ User can access protected pages

---

## 4.3 Sequence Diagram 2: Transfer Funds Sequence

### Diagram Title: "Transfer Funds Between Users"

### Participants
1. **Sender User** (Actor)
2. **Web Frontend** (React)
3. **API Gateway**
4. **Wallet Service** (Express)
5. **PostgreSQL** (Database)
6. **RabbitMQ** (Message Broker)
7. **Notification Service**
8. **SMTP Server** (Email)
9. **Recipient User** (Actor)

### Message Flow

```
─────────────────────────────────────────────────────────────

1. Sender User → Web Frontend: Enter recipient email, amount
   [Navigate to /transfer page]
   [Fill form: email, amount, note]

2. Web Frontend: Validate input
   [Email format, amount > 0, amount ≤ balance]

3. Web Frontend: Display confirmation dialog
   [Show: "Send USD 100 to john@example.com? Fee: $0.50"]

4. Sender User → Web Frontend: Click "Confirm"
   [User confirms transfer]

5. Web Frontend → API Gateway: POST /api/transactions/transfer
   [Headers: Authorization: Bearer {accessToken}]
   [Body: {recipientEmail, amount, note, currency}]

6. API Gateway: Validate request
   [Rate limiting check, CORS verification]

7. API Gateway → Wallet Service: POST /api/transactions/transfer

8. Wallet Service: Extract userId from JWT token

9. Wallet Service → PostgreSQL: SELECT * FROM users WHERE email = $1
    [Recipient lookup: Query users table]

10. PostgreSQL → Wallet Service: Recipient user record or null
    [Returns: {id, email, email_verified, ...}]

11. Wallet Service: Validate recipient exists
    [Decision: Recipient found?]
    ├─ NO → Return 404 "Recipient not found"
    └─ YES → Continue

12. Wallet Service: Check recipient email verified
    [Decision: email_verified = TRUE?]
    ├─ NO → Return 400 "Recipient email not verified"
    └─ YES → Continue

13. Wallet Service → PostgreSQL: SELECT balance FROM wallets WHERE user_id = $1
    [Sender wallet balance check]

14. PostgreSQL → Wallet Service: {balance: 1000}
    [Current sender balance]

15. Wallet Service: Calculate total debit
    [fee = 0.50]
    [total = amount + fee = 100.50]
    [Decision: balance >= total?]
    ├─ NO → Return 400 "Insufficient balance"
    └─ YES → Continue

16. Wallet Service → PostgreSQL: SELECT * FROM wallets WHERE user_id = $2
    [Get recipient wallet]

17. PostgreSQL → Wallet Service: Recipient wallet record

18. Wallet Service: Generate transaction reference
    [reference = "TRF-12345678" (timestamp-based)]

19. Wallet Service → PostgreSQL: INSERT INTO transactions (sender transaction)
    [Insert debit transaction for sender]
    [Fields: user_id: sender_id, type: "debit", amount: 100, fee: 0.50, reference: "TRF-12345678"]

20. PostgreSQL → Wallet Service: Confirmation + transaction_id

21. Wallet Service → PostgreSQL: INSERT INTO transactions (recipient transaction)
    [Insert credit transaction for recipient]
    [Fields: user_id: recipient_id, type: "credit", amount: 100, reference: "TRF-12345678"]

22. PostgreSQL → Wallet Service: Confirmation + transaction_id

23. Wallet Service → PostgreSQL: UPDATE wallets SET balance = balance - 100.50 WHERE user_id = sender
    [Deduct from sender wallet]

24. PostgreSQL → Wallet Service: Confirmation

25. Wallet Service → PostgreSQL: UPDATE wallets SET balance = balance + 100 WHERE user_id = recipient
    [Add to recipient wallet]

26. PostgreSQL → Wallet Service: Confirmation

27. Wallet Service → PostgreSQL: SELECT balance FROM wallets WHERE user_id = sender
    [Get updated sender balance: 899.50]

28. PostgreSQL → Wallet Service: {balance: 899.50}

29. Wallet Service → RabbitMQ: Publish transfer.sent event
    [Exchange: notifications]
    [Routing key: transfer.sent]
    [Payload:
     {
       userId: sender_id,
       type: "transfer",
       title: "Transfer Sent",
       message: "You sent USD 100 to john@example.com",
       data: {reference: "TRF-12345678", recipient: "john@example.com", amount: 100}
     }
    ]

30. Wallet Service → RabbitMQ: Publish transfer.received event
    [Routing key: transfer.received]
    [Payload:
     {
       userId: recipient_id,
       type: "transfer",
       title: "Transfer Received",
       message: "You received USD 100 from jane@example.com",
       data: {reference: "TRF-12345678", sender: "jane@example.com", amount: 100}
     }
    ]

31. RabbitMQ: Route events to Notification Service queue

32. Notification Service: Consume transfer.sent event
    [Get message from queue]

33. Notification Service: Format email template (sender)
    [Subject: "Transfer Sent"]
    [Body: Amount, recipient, fee, new balance, reference]

34. Notification Service → SMTP Server: Send email to sender@example.com
    [Use nodemailer to send email]

35. SMTP Server → Notification Service: Email sent (202 Accepted)

36. Notification Service: Log success
    [Record email sent for transfer.sent]

37. Notification Service: Consume transfer.received event
    [Get message from queue]

38. Notification Service: Format email template (recipient)
    [Subject: "Transfer Received"]
    [Body: Amount, sender, reference]

39. Notification Service → SMTP Server: Send email to recipient@example.com

40. SMTP Server → Notification Service: Email sent (202 Accepted)

41. Wallet Service → API Gateway: Response 200 OK
    [Body:
     {
       success: true,
       message: "Transfer sent successfully",
       transaction: {
         id: txRef,
         type: "debit",
         amount: 100,
         fee: 0.50,
         recipient: "john@example.com",
         reference: "TRF-12345678"
       },
       balance: 899.50
     }
    ]

42. API Gateway → Web Frontend: Response 200

43. Web Frontend: Parse response

44. Web Frontend: Display success message
    [Message: "Transfer of USD 100 sent to john@example.com!"]
    [Show reference: TRF-12345678]
    [Display new balance: $899.50]

45. Web Frontend: Update WalletContext
    [Update balance = 899.50]
    [Add transaction to transactions array]

46. Web Frontend: Render updated UI
    [Show success message for 5 seconds]
    [Display new balance]
    [Offer: "Make Another Transfer" or "View Transactions"]

47. Sender User: See transfer success
    [Dashboard shows new balance]
    [Can view transaction details]

48. [Meanwhile] Sender User receives email confirmation
    [Email shows: Transfer sent, amount, recipient, reference, new balance]

49. Recipient User receives email notification
    [Email shows: Transfer received, amount, sender, reference]

50. Recipient User → Web Frontend: User sees notification in bell icon
    [Unread count increments]
    [When opens notifications: transfer.received message appears]

─────────────────────────────────────────────────────────────
```

### Alt (Alternative) Flows

**Alt: Insufficient Balance**
```
15. Wallet Service: balance (1000) < total (100.50)?
    ├─ YES → Decision TRUE
    └─ Return 400 "Insufficient balance"

Wallet Service → API Gateway → Web Frontend → User
Error message displayed
User sees current balance
```

**Alt: Recipient Not Found**
```
10. PostgreSQL → Wallet Service: null (user not found)

11. Wallet Service: Decision FALSE
    └─ Return 404 "Recipient user not found"

Message displayed to user
User can search for correct email or try again
```

**Alt: Recipient Email Not Verified**
```
12. Wallet Service: email_verified = FALSE

Decision FALSE
└─ Return 400 "Recipient email not verified"

Message: "Recipient has not verified their email yet"
```

### Success Criteria
✓ Sender wallet debited (amount + fee)
✓ Recipient wallet credited (amount)
✓ Transactions recorded for both users
✓ Reference generated and stored
✓ Both emails sent successfully
✓ Frontend updated with new balance
✓ Transaction appears in both users' histories

---

## 4.4 Sequence Diagram 3: KYC Document Upload Sequence

### Diagram Title: "Submit KYC Documents for Verification"

### Participants
1. **End User** (Actor)
2. **Web Frontend** (React)
3. **API Gateway**
4. **Wallet Service**
5. **File Storage** (Disk/Cloud)
6. **PostgreSQL** (Database)

### Message Flow

```
─────────────────────────────────────────────────────────────

1. User → Web Frontend: Navigate to KYC page
   [Click "Complete KYC" or visit /kyc]

2. Web Frontend → Wallet Service: GET /api/kyc/status
   [Check current KYC status]

3. Wallet Service → PostgreSQL: SELECT kyc_status FROM users WHERE id = $1
   [Query user KYC status]

4. PostgreSQL → Wallet Service: {kyc_status: "unverified"}

5. Wallet Service → API Gateway: Response 200

6. API Gateway → Web Frontend: {kycStatus: "unverified"}

7. Web Frontend: Display KYC submission form
   [Show file upload fields for:]
   ├─ Photo ID (required)
   ├─ Selfie with ID (required)
   ├─ Address proof (required)
   └─ Passport (optional)

8. User: Select documents
   [User clicks file input]
   [Browser opens file chooser]

9. User: Choose ID document file
   [Selects: passport.pdf (2.5 MB)]

10. Web Frontend: Validate file
    [JavaScript validation:]
    ├─ Size < 10 MB? YES
    ├─ Format (JPG/PNG/PDF)? YES
    └─ Not corrupted? YES

11. User: Choose selfie file
    [Selects: selfie.jpg (1.8 MB)]

12. Web Frontend: Validate selfie
    [Checks pass]

13. User: Choose address proof file
    [Selects: utility_bill.png (3.2 MB)]

14. Web Frontend: Validate address proof
    [Checks pass]

15. User → Web Frontend: Click "Submit Documents"
    [User confirms submission]

16. Web Frontend: Display progress
    [Show: "Uploading documents... 0%"]

17. Web Frontend → API Gateway: POST /api/kyc/upload (Document 1: ID)
    [Multipart form data]
    [Fields: documentType: "id", file: passport.pdf]
    [Headers: Authorization: Bearer {token}]

18. API Gateway: Validate request
    [Check JWT, content-type, size limits]

19. API Gateway → Wallet Service: Forward request

20. Wallet Service: Extract userId from token

21. Wallet Service: Validate file
    [Size, format, virus scan if applicable]

22. Wallet Service → File Storage: Save file
    [Path: /uploads/kyc/{userId}/id/{timestamp}.pdf]
    [Or: Upload to S3/Azure Blob]

23. File Storage → Wallet Service: File saved successfully
    [Returns: file_path or file_url]

24. Wallet Service → PostgreSQL: INSERT INTO kyc_documents
    [Fields:]
    [user_id, document_type: "id", file_path, file_name: "passport.pdf", file_size: 2500000, uploaded_at: NOW, verification_status: "pending"]

25. PostgreSQL → Wallet Service: Record inserted

26. Wallet Service → API Gateway: Response 200
    [{success: true, documentType: "id", fileUrl: "..."}]

27. API Gateway → Web Frontend: Response 200

28. Web Frontend: Update progress
    [Show: "Uploading documents... 33%"]

29. Web Frontend → API Gateway: POST /api/kyc/upload (Document 2: Selfie)

30-34. [Same flow as steps 20-24 for selfie document]
    [document_type: "selfie", file_name: "selfie.jpg"]

35. Web Frontend: Update progress
    [Show: "Uploading documents... 66%"]

36. Web Frontend → API Gateway: POST /api/kyc/upload (Document 3: Address Proof)

37-41. [Same flow as steps 20-24 for address proof]
    [document_type: "address_proof", file_name: "utility_bill.png"]

42. Web Frontend: All documents uploaded
    [Progress: 100%]

43. Web Frontend: Update KYC status locally
    [Call GET /api/kyc/status to fetch latest]

44. Wallet Service → PostgreSQL: SELECT kyc_status FROM users WHERE id = $1

45. PostgreSQL → Wallet Service: {kyc_status: "pending"}
    [Status should have been updated on backend]

46. Wallet Service → API Gateway: Response

47. Web Frontend: Update KYCContext
    [Set kycStatus = "pending"]

48. Web Frontend: Display success message
    [Message: "Documents submitted successfully!"]
    [Show: "Status: Pending Review"]
    [Show: "We'll verify within 24 hours"]

49. User: See success message
    [Status badge changes to yellow (pending)]

50. [Backend - Admin/System Process]
    Wallet Service → Admin Reviewer: Notification
    [Documents ready for review]

51. Admin manually or system automatically reviews documents

52. Admin/System → Wallet Service: Update KYC status
    [Decision: Documents valid?]
    ├─ YES → Set kyc_status = "verified"
    └─ NO → Set kyc_status = "rejected" + reason

53. Wallet Service → PostgreSQL: UPDATE users SET kyc_status = "verified"

54. Wallet Service → PostgreSQL: UPDATE kyc_documents SET verification_status = "verified"

55. Notification Service: Send verification email
    [If verified: "Your KYC is verified!"]
    [If rejected: "Your KYC was rejected. Reason: ..."]

─────────────────────────────────────────────────────────────
```

### Alternative: Rejected Status

```
If reviewer rejects documents:

52. Admin → Wallet Service: UPDATE kyc_status = "rejected"
    [Fields: rejection_reason = "ID not clear, please resubmit"]

53. Wallet Service → PostgreSQL: UPDATE users SET kyc_status = "rejected"

54. Notification Service: Send rejection email
    [Message: "Your KYC submission was rejected"]
    [Reason: "ID document not legible"]
    [Action: "Please resubmit updated documents"]

55. User receives email with reason

56. User can navigate to KYC page and resubmit documents
    [Process repeats from step 7]
```

### Success Criteria
✓ All 3 documents uploaded successfully
✓ Files stored with correct paths
✓ Database records created for each document
✓ KYC status changed to "pending"
✓ User receives confirmation message
✓ Reviewer can access documents
✓ User receives email after verification (verified or rejected)

---

## 4.5 Sequence Diagram 4: Deposit Funds Sequence

### Diagram Title: "Deposit Funds to Wallet"

### Participants
1. **User** (Actor)
2. **Web Frontend**
3. **API Gateway**
4. **Wallet Service**
5. **PostgreSQL**
6. **RabbitMQ**
7. **Notification Service**
8. **SMTP Server**

### Message Flow (Abbreviated - Card Deposit)

```
─────────────────────────────────────────────────────────────

1. User → Web Frontend: Click "Deposit"
   [Navigate to /deposit page]

2. Web Frontend: Display deposit form
   [Form fields: amount, payment_method (dropdown)]

3. User → Web Frontend: Enter USD 100, select "card"
   [Click "Deposit"]

4. Web Frontend: Validate input
   [amount > 0? YES]

5. Web Frontend → API Gateway: POST /api/transactions/deposit
   [Body: {amount: 100, method: "card", currency: "USD"}]

6. API Gateway → Wallet Service

7. Wallet Service: Validate JWT token

8. Wallet Service → PostgreSQL: SELECT * FROM wallets WHERE user_id = $1
   [Get user wallet]

9. PostgreSQL → Wallet Service: {id, balance: 500, currency: "USD"}
   [If no wallet, create it]

10. Wallet Service: Calculate fee
    [method = "card" → fee = 100 * 0.015 = 1.50]
    [status = "completed" (card is immediate)]

11. Wallet Service: Generate reference
    [reference = "DEP-12345678"]

12. Wallet Service → PostgreSQL: INSERT INTO transactions
    [Fields: user_id, type: "credit", category: "deposit", amount: 100, fee: 1.50, status: "completed", reference: "DEP-12345678"]

13. PostgreSQL → Wallet Service: Transaction created

14. Wallet Service → PostgreSQL: UPDATE wallets SET balance = balance + 98.50
    [balance becomes: 500 + 98.50 = 598.50]
    [Note: Amount minus fee]

15. PostgreSQL → Wallet Service: Confirmation

16. Wallet Service → RabbitMQ: Publish event "deposit.created"
    [Payload: {userId, amount: 100, method: "card", reference: "DEP-12345678", status: "completed"}]

17. RabbitMQ → Notification Service: Event received

18. Notification Service: Format email
    [Subject: "Deposit Received - REF: DEP-12345678"]
    [Body: Amount: USD 100, Status: Completed, Fee: USD 1.50, New Balance: USD 598.50]

19. Notification Service → SMTP Server: Send email

20. SMTP Server → Notification Service: Email sent (202)

21. Wallet Service → API Gateway: Response 200 OK
    [{success: true, transaction: {id, reference: "DEP-12345678", amount: 100, fee: 1.50, status: "completed"}, balance: 598.50}]

22. API Gateway → Web Frontend: Response 200

23. Web Frontend: Update WalletContext
    [balance = 598.50, add transaction to list]

24. Web Frontend: Display success message
    [Message: "Deposit of USD 100 successful! Ref: DEP-12345678"]
    [Show: New Balance USD 598.50]

25. User: See deposit success
    [Can view updated balance on dashboard]

26. User receives email confirmation
    [Email shows transaction details]

─────────────────────────────────────────────────────────────
```

---

# PART 5: SUMMARY TABLE

## Complete UML Diagram Specifications Summary

| Diagram Type | Purpose | Key Elements | Participants | Flows |
|---|---|---|---|---|
| **Use Case** | Show actors & actions | 25+ use cases, 3 actors, system boundaries, relationships | End User, Admin, Email Service, Bank, KYC | Registration, Login, Wallet, Transactions, KYC, Notifications |
| **Activity** | Show process flows with decisions | Activities, swimlanes, decisions, error paths | User, Frontend, Backend, Database, RabbitMQ | Registration, Login, Deposit, Transfer, KYC |
| **Class** | Show structure & relationships | 20+ classes, attributes, methods | APIClient, Contexts, Models, Services | Composition, association, dependency |
| **Sequence** | Show message flows over time | Lifelines, messages, alt flows, success criteria | User, Frontend, Gateway, Services, Database, Email | Login, Transfer, KYC Upload, Deposit |

---

# APPENDIX: Quick Reference Checklists

## For Drawing Use Case Diagram
- [ ] Draw system boundary rectangle
- [ ] Place primary actor (End User) on left
- [ ] Place secondary actors (Admin, Email Service) on right
- [ ] Draw 25 use cases as ovals inside boundary
- [ ] Draw lines from actors to use cases they perform
- [ ] Add include relationships (arrows with <<include>>)
- [ ] Add extend relationships (arrows with <<extend>>)
- [ ] Label all elements clearly
- [ ] Group related use cases by domain (Auth, Wallet, etc.)

## For Drawing Activity Diagram  
- [ ] Draw 3 swimlanes horizontally (User, Frontend, Backend)
- [ ] Draw initial node (circle) at top
- [ ] Draw activities as rounded rectangles
- [ ] Draw decision points as diamonds
- [ ] Draw flows between activities as arrows
- [ ] Label all decision paths (YES/NO)
- [ ] Include error/exception paths
- [ ] Draw final nodes (filled circle) at bottom
- [ ] Number sequences 1, 2, 3...

## For Drawing Class Diagram
- [ ] Draw classes as rectangles with 3 sections: name, attributes, methods
- [ ] List all attributes with types (String, int, UUID, boolean, etc.)
- [ ] List all methods with return types and parameters
- [ ] Draw inheritance arrows ↑ (not used in this system)
- [ ] Draw composition relationships (filled diamonds ◆)
- [ ] Draw association relationships (lines with labels)
- [ ] Draw dependency relationships (dashed arrows ⟶)
- [ ] Add multiplicity labels (1, *, 0..1, 1..*)
- [ ] Use proper sizing for readability

## For Drawing Sequence Diagram
- [ ] Draw participant boxes at top (lifelines)
- [ ] Draw lifelines as vertical dashed lines
- [ ] Draw messages as horizontal arrows between lifelines
- [ ] Label each message with number and description
- [ ] Use solid arrow (→) for synchronous calls
- [ ] Use dashed arrow (⟶) for async/return messages
- [ ] Draw decision diamonds with alt/opt frames
- [ ] Include database queries and responses
- [ ] Show event publishing and consumption
- [ ] Mark all error scenarios
- [ ] Include all interactions with external systems

---

**End of UML Diagrams Specifications Document**

All specifications are complete and detailed for your team to draw accurate, comprehensive UML diagrams of the NexVault digital wallet system.