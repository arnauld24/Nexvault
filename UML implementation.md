# UML Implementation Overview

## 1. System Summary

NexVault is a digital wallet system built as a frontend React application and a backend microservices architecture.

The system is composed of:
- A **React frontend** that manages user experience, authentication, wallet operations, transactions, KYC, and notifications.
- An **API Gateway** that routes client API requests to backend microservices and centralizes security/cors/rate limiting.
- An **Auth Service** for user registration, login, JWT session management, email verification, password reset, and notification support.
- A **Wallet Service** for wallet balance, deposit, transfer, withdraw, transaction history, and KYC status.
- A **Notification Service** for sending email notifications and consuming RabbitMQ events.
- A **PostgreSQL database** for user, session, wallet, transaction, and notification persistence.
- A **RabbitMQ message broker** for event-driven notifications.

This overview is intended to help your team draw correct UML diagrams for:
- Use Case Diagram
- Activity Diagrams
- Class Diagram
- Sequence Diagrams

---

## 2. High-Level Architecture

### 2.1 Components

1. **Frontend (React)**
   - Located in `src/`
   - Entry: `src/index.js`
   - App root: `src/App.js`
   - Responsibilities:
     - Present landing, auth, dashboard, wallet, transaction, KYC, notifications pages
     - Manage auth state, wallet state, notification state, KYC state
     - Communicate with backend through `src/api/client.js`

2. **API Gateway**
   - Located in `cloud-wallet/apps/api-gateway/index.js`
   - Responsibilities:
     - Proxy requests to backend services
     - Handle CORS and request rate limiting
     - Expose `/health` and `/health/services`
     - Forward:
       - `/api/auth` and `/api/notifications` to Auth Service
       - `/api/wallets`, `/api/transactions`, `/api/kyc`, `/api/payment-methods`, `/api/users` to Wallet Service
     - Provide helper endpoint for token refresh if needed

3. **Auth Service**
   - Located in `cloud-wallet/apps/auth-service/`
   - Responsibilities:
     - Register and login users
     - Issue and verify JWT tokens
     - Maintain session records
     - Manage email verification and password reset
     - Expose notification operations for user inbox
     - Use PostgreSQL and RabbitMQ

4. **Wallet Service**
   - Located in `cloud-wallet/apps/wallet-service/index.js`
   - Responsibilities:
     - Manage wallet balance and wallet account
     - Process deposits, transfers, and withdrawals
     - Store transaction history
     - Provide KYC status and wallet endpoints
     - Publish notification events to RabbitMQ

5. **Notification Service**
   - Located in `cloud-wallet/apps/notification-service/index.js`
   - Responsibilities:
     - Connect to RabbitMQ and consume notification events
     - Send emails using SMTP configuration
     - Optionally send SMS notifications in future
     - Provide an internal `/api/send` endpoint for direct notification requests

6. **Infrastructure**
   - PostgreSQL stores auth, wallet, transaction, session, notification, and KYC data
   - RabbitMQ carries events such as user registration, login, deposit, transfer, and withdrawal

### 2.2 Deployment Diagram

Your UML deployment diagram should include:
- **User Browser** running the React frontend
- **API Gateway container** (Node.js/Express)
- **Auth Service container** (Node.js/Express)
- **Wallet Service container** (Node.js/Express)
- **Notification Service container** (Node.js/Express)
- **PostgreSQL Database** container
- **RabbitMQ** container

Connections:
- Browser -> API Gateway over HTTP
- API Gateway -> Auth Service over HTTP
- API Gateway -> Wallet Service over HTTP
- Auth Service -> PostgreSQL over TCP
- Wallet Service -> PostgreSQL over TCP
- Auth Service -> RabbitMQ over AMQP
- Wallet Service -> RabbitMQ over AMQP
- Notification Service -> RabbitMQ over AMQP

---

## 3. Frontend Architecture

### 3.1 React Application Structure

- `src/index.js`
  - Mounts the React application
- `src/App.js`
  - Wraps the app in context providers:
    - `AuthProvider`
    - `NotificationProvider`
    - `KYCProvider`
    - `WalletProvider`
    - `ToastProvider`
  - Defines routes using React Router
- `src/api/client.js`
  - Central API client for all backend calls
  - Handles token header injection, refresh logic, and endpoint routing
- Context providers manage shared state across pages
- Lazy-loaded page components support code-splitting and route-based rendering

### 3.2 Key Contexts and Responsibilities

#### `AuthContext`
- Stores current user information and authentication state
- Provides operations:
  - `login()`
  - `register()`
  - `logout()`
  - `logoutAllDevices()`
  - `getActiveSessions()`
  - `revokeSession()`
- On mount, verifies stored access token using `apiClient.verifyToken()`
- Saves session ID and refresh token to `localStorage`

#### `WalletContext`
- Manages wallet balance and transactions
- Provides operations:
  - `refreshWallet()`
  - `deposit()`
  - `transfer()`
  - `withdraw()`
- Persists wallet state locally in `localStorage`
- Uses API calls to wallet service endpoints:
  - `/wallets/balance`
  - `/transactions/history`
  - `/transactions/deposit`
  - `/transactions/transfer`
  - `/transactions/withdraw`

#### `NotificationContext`
- Stores notification list and unread count
- Provides operations:
  - `loadNotifications()`
  - `loadUnreadCount()`
  - `markAsRead()`
  - `markAllAsRead()`
  - `deleteNotification()`
- Uses API calls to `/notifications`

#### `KYCContext`
- Stores KYC status and uploaded documents
- Provides operations:
  - `loadKycStatus()`
  - `submitKYC()`
- Uses wallet service KYC endpoints

### 3.3 Frontend Pages and Routes

Public pages:
- `/` - Landing page
- `/login` - Login page
- `/register` - Register page
- `/kyc` - KYC submission page
- `/kyc-status` - KYC status page

Protected pages (only accessible when authenticated):
- `/dashboard` - Main user dashboard
- `/transfer` - Transfer page
- `/deposit` - Deposit page
- `/withdraw` - Withdraw page
- `/transactions` - Transaction history page
- `/transactions/:id` - Transaction details page
- `/notifications` - Notifications page
- `/profile` - User profile page
- `/settings` - User settings page
- `/help` - Help page
- `/admin` - Admin dashboard page

### 3.4 API Client Behavior

`src/api/client.js` is a singleton `APIClient`.

Important behaviors:
- It stores tokens in `localStorage` under `nv_access_token` and `nv_refresh_token`
- Adds `Authorization: Bearer <token>` to requests when available
- Refreshes expired access tokens automatically by calling `/auth/refresh-token`
- Offers API methods for:
  - Auth: `login`, `register`, `logout`, `logoutAllDevices`, `verifyEmail`, `requestPasswordReset`, `resetPassword`, `verifyToken`
  - Notifications: `getNotifications`, `markNotificationAsRead`, `markAllNotificationsAsRead`, `deleteNotification`
  - Wallet: `getWalletBalance`, `getWallet`, `createWallet`
  - Transactions: `getTransactionHistory`, `getTransactionDetails`, `transfer`, `deposit`, `withdraw`
  - KYC: `uploadKYCDocument`, `getKYCStatus`, `getKYCDocuments`
  - Payment methods and profile operations
- For KYC upload, it uses native `fetch()` with `FormData`

---

## 4. Backend Architecture

### 4.1 Auth Service

Located in `cloud-wallet/apps/auth-service/`

#### Main pieces
- `index.js`
  - Sets up Express middleware, health endpoint, API routes, request logging, error handling
  - Connects to PostgreSQL and RabbitMQ
  - Starts scheduled cleanup jobs for expired tokens and sessions
- `config/database.js`
  - Exposes `connectDB()` and `query()` helpers for PostgreSQL
- `config/rabbitmq.js`
  - Connects to RabbitMQ and exposes `connectRabbitMQ()`
- `middleware/auth.js`
  - JWT authentication middleware for protected endpoints
- `middleware/rateLimiter.js`
  - Rate limiting for login and registration endpoints
- `routes/auth.js`
  - Handles registration, login, refresh token, logout, logout-all, verify-email, password reset, sessions, token verification
- `routes/notifications.js`
  - Handles reading and marking notifications
- `routes/kyc.js`
  - Handles KYC status + documents if implemented
- `services/AuthService.js`
  - Contains business logic for user auth, session creation, token generation, email verification, password reset
- `models/User.js`, `Session.js`, `Notification.js`
  - Encapsulate persistence and query logic

#### Key database entities

**User**
- Attributes:
  - `id`, `email`, `password_hash`, `first_name`, `last_name`, `phone_number`, `country`, `city`
  - `kyc_status`, `account_status`, `email_verified`, `tier`, `preferred_currency`
  - `created_at`, `last_login_at`
- Responsible for:
  - registration
  - profile updates
  - email verification
  - password updates
  - KYC status state

**Session**
- Attributes:
  - `id`, `user_id`, `session_token`, `refresh_token`, `user_agent`, `ip_address`, `device_name`, `device_type`
  - `expires_at`, `last_activity`, `is_active`
- Responsible for:
  - active device sessions
  - token-based authentication
  - logout and revoke operations

**Notification**
- Attributes:
  - `id`, `user_id`, `type`, `title`, `message`, `data`, `priority`, `is_read`, `is_archived`
  - `created_at`, `read_at`
- Responsible for:
  - inbox messages
  - unread count
  - mark read / delete

#### Auth Service flows

- Registration
  - `POST /api/auth/register`
  - Creates user record, hashes password, issues verification token, publishes registration event
- Login
  - `POST /api/auth/login`
  - Verifies password, creates session, generates JWT and refresh token
- Refresh token
  - `POST /api/auth/refresh-token`
  - Issues a new access token after verifying refresh token
- Logout
  - `POST /api/auth/logout`
  - Deactivates single session
- Logout all devices
  - `POST /api/auth/logout-all`
  - Revokes all user sessions
- Verify token
  - `POST /api/auth/verify-token`
  - Validates token and returns current user

### 4.2 Wallet Service

Located in `cloud-wallet/apps/wallet-service/index.js`

#### Main pieces
- Express server with JWT authentication middleware using `jsonwebtoken`
- PostgreSQL `Pool` connection for wallet data
- RabbitMQ publisher for notification events
- DB initialization for `wallets`, `transactions`, and `kyc_status`

#### Wallet Service endpoints

- `GET /api/wallets/balance`
  - Returns user wallet balance and currency
  - Creates wallet if missing
- `POST /api/wallets`
  - Creates a new wallet for a user
- `GET /api/kyc/status`
  - Returns KYC status from database
- `GET /api/transactions/history`
  - Returns paginated transaction history for user
- `POST /api/transactions/deposit`
  - Records a deposit transaction
  - Updates wallet balance
  - Publishes a rabbitMQ deposit notification event
- `POST /api/transactions/transfer`
  - Transfers funds from sender to recipient
  - Updates both wallets and records transactions for both users
  - Sends notification events for sender and receiver
- `POST /api/transactions/withdraw`
  - Deducts amount from wallet
  - Creates pending withdrawal transaction
  - Sends withdrawal notification event

#### Wallet service entities

**Wallet**
- Attributes:
  - `id`, `user_id`, `balance`, `currency`, `status`, `created_at`, `updated_at`
- One-to-one with `User`
- Responsible for balance, deposit, transfer, withdrawal operations

**Transaction**
- Attributes:
  - `id`, `user_id`, `type`, `category`, `description`, `amount`, `currency`, `fee`, `status`, `reference`
  - `from_entity`, `to_entity`, `bank_name`, `account_number`, `note`, `created_at`, `updated_at`
- Responsible for history of funds movement

**KYC Status**
- Attributes:
  - `id`, `user_id`, `status`, `verified_at`, `created_at`, `updated_at`
- Responsible for KYC lifecycle state

### 4.3 Notification Service

Located in `cloud-wallet/apps/notification-service/index.js`

#### Main pieces
- Express server with `/health` and `/api/send`
- SMTP email transport via `nodemailer`
- RabbitMQ consumer for event queues
- Notification templates with HTML email content

#### Published events consumed
- `events.user-registered`
- `events.user-login`
- `notifications.email`
- `deposit.created`
- `transfer.sent`
- `transfer.received`
- `withdrawal.initiated`

#### Notification service responsibilities
- Deliver email notifications to users
- Log send attempts and errors
- Expand to SMS notifications in the future

### 4.4 API Gateway

Located in `cloud-wallet/apps/api-gateway/index.js`

#### Responsibilities
- Proxy client requests to backend services
- Apply global rate limiting
- Validate CORS origins
- Provide service health status
- Centralize error handling for unavailable services

#### Proxy mappings
- `/api/auth` -> Auth Service
- `/api/notifications` -> Auth Service
- `/api/wallets`, `/api/transactions`, `/api/kyc`, `/api/payment-methods`, `/api/users` -> Wallet Service

---

## 5. Use Case Diagram Guidance

### Actors
- **End User**: primary actor for most actions
- **System**: backend services and infrastructure
- **Admin**: optional actor for admin dashboard and monitoring

### Use cases
- Register account
- Verify email
- Login
- Refresh access token
- Logout from current device
- Logout from all devices
- View dashboard
- View wallet balance
- Deposit funds
- Transfer funds
- Withdraw funds
- View transaction history
- View transaction details
- Submit KYC documents
- View KYC status
- View notifications
- Read notification
- Delete notification
- Manage profile
- Manage settings
- Health check services

### Suggested layout
Place **End User** on left, **System** on right.
Group use cases in areas:
- Authentication
- Wallet operations
- Notifications
- KYC
- Diagnostics

Call out cross-service use cases such as:
- `Login` -> API Gateway -> Auth Service
- `Deposit` -> API Gateway -> Wallet Service -> RabbitMQ -> Notification Service

---

## 6. Activity Diagram Guidance

### 6.1 User Registration Activity

Steps:
1. User fills registration form
2. Frontend calls `/api/auth/register` via API Gateway
3. API Gateway forwards to Auth Service
4. Auth Service validates input and calls `User.create()`
5. User record inserted in PostgreSQL
6. Auth Service publishes registration event to RabbitMQ
7. Notification Service consumes event and sends welcome/verification email
8. Frontend receives success and shows next step

### 6.2 Login Activity

Steps:
1. User submits email and password
2. Frontend calls `/api/auth/login`
3. Auth Service verifies credentials
4. Auth Service creates session record and JWT token
5. Auth Service returns access token, refresh token, user data, sessionId
6. Frontend stores tokens and sessionId locally
7. Frontend navigates to dashboard

### 6.3 Deposit / Transfer / Withdraw Activity

For Deposit:
1. User requests deposit amount and method
2. Frontend calls `/api/transactions/deposit`
3. Wallet Service validates amount and inserts transaction
4. Wallet Service updates wallet balance
5. Wallet Service publishes `deposit.created` event
6. Notification Service sends notification email
7. Frontend updates wallet balance and transaction list

For Transfer:
1. User enters recipient email, amount, and note
2. Frontend calls `/api/transactions/transfer`
3. Wallet Service verifies sender balance and recipient user
4. Wallet Service inserts debit transaction for sender
5. Wallet Service updates sender and recipient wallets
6. Wallet Service inserts credit transaction for recipient
7. Wallet Service publishes `transfer.sent` and `transfer.received`
8. Notification Service sends emails to both users
9. Frontend updates UI and transaction history

For Withdraw:
1. User enters bank details and amount
2. Frontend calls `/api/transactions/withdraw`
3. Wallet Service validates balance and bank details
4. Wallet Service inserts pending withdrawal transaction
5. Wallet Service decreases wallet balance
6. Wallet Service publishes `withdrawal.initiated`
7. Notification Service sends email with withdrawal details
8. Frontend updates wallet state and shows pending status

### 6.4 KYC Submission Activity

1. User uploads documents via KYC page
2. Frontend sends multipart `FormData` to `/kyc/upload`
3. Wallet Service stores or proxies documents and updates KYC status
4. Frontend polls `/kyc/status` to display progress

### 6.5 Notification Flow Activity

1. Backend publishes event to RabbitMQ
2. Notification Service consumes event
3. Notification Service formats email message
4. Notification Service sends email via SMTP
5. Frontend fetches notifications from `/notifications`
6. User reads or deletes notifications
7. Notification Service updates notification status in DB

---

## 7. Class Diagram Guidance

Your class diagram should include these core classes and their relationships.

### 7.1 Backend classes

#### `User`
- Attributes:
  - `id`, `email`, `passwordHash`, `firstName`, `lastName`, `phoneNumber`, `country`, `city`
  - `kycStatus`, `accountStatus`, `emailVerified`, `tier`, `preferredCurrency`, `createdAt`, `lastLoginAt`
- Methods:
  - `create(userData)`
  - `findByEmail(email)`
  - `findById(userId)`
  - `emailExists(email)`
  - `updateProfile(userId, updates)`
  - `updatePassword(userId, passwordHash)`
  - `verifyEmail(userId)`
  - `updateKYCStatus(userId, status)`
  - `getStats()`

#### `Session`
- Attributes:
  - `id`, `userId`, `sessionToken`, `refreshToken`, `userAgent`, `ipAddress`, `deviceName`, `deviceType`, `expiresAt`, `lastActivity`, `isActive`
- Methods:
  - `create(sessionData)`
  - `findByToken(token)`
  - `getActiveSessions(userId)`
  - `updateActivity(sessionId)`
  - `revoke(sessionId)`
  - `revokeAllSessions(userId)`
  - `cleanupExpiredSessions()`

#### `Notification`
- Attributes:
  - `id`, `userId`, `type`, `title`, `message`, `data`, `priority`, `isRead`, `isArchived`, `createdAt`, `readAt`
- Methods:
  - `create(notificationData)`
  - `getUserNotifications(userId, limit, offset)`
  - `getUnreadCount(userId)`
  - `markAsRead(notificationId)`
  - `markAllAsRead(userId)`
  - `delete(notificationId)`

#### `Wallet`
- Attributes:
  - `id`, `userId`, `balance`, `currency`, `status`, `createdAt`, `updatedAt`
- Methods:
  - `getBalance(userId)`
  - `createWallet(userId, currency)`
  - `updateBalance(userId, amount)`

#### `Transaction`
- Attributes:
  - `id`, `userId`, `type`, `category`, `description`, `amount`, `currency`, `fee`, `status`, `reference`, `fromEntity`, `toEntity`, `bankName`, `accountNumber`, `note`, `createdAt`, `updatedAt`
- Methods:
  - `createDeposit(...)`
  - `createTransfer(...)`
  - `createWithdrawal(...)`
  - `getHistory(userId, limit, offset)`

#### `KYCDocument` or `KYCStatus`
- Attributes:
  - `id`, `userId`, `status`, `verifiedAt`, `createdAt`, `updatedAt`
- Methods:
  - `getStatus(userId)`
  - `updateStatus(userId, status)`

#### `AuthService`
- Methods:
  - `register()`
  - `login()`
  - `refreshToken()`
  - `logout()`
  - `logoutAllDevices()`
  - `verifyEmail()`
  - `requestPasswordReset()`
  - `resetPassword()`
  - `getActiveSessions()`
  - `revokeDeviceSession()`

#### `NotificationService`
- Methods:
  - `sendEmailNotification()`
  - `sendSMSNotification()`
  - `consumeMessage(queue, callback)`
  - `initializeRabbitMQConsumers()`

#### `ApiGateway`
- Methods:
  - `proxyAuthRoutes()`
  - `proxyWalletRoutes()`
  - `checkHealth()`
  - `limitRequests()`

### 7.2 Frontend classes/components

#### `APIClient`
- Attributes:
  - `token`, `refreshToken`
- Methods:
  - `getBaseUrl(endpoint)`
  - `getAuthHeader()`
  - `fetchAPI(endpoint, options)`
  - `refreshAccessToken()`
  - `login()`, `register()`, `logout()`
  - `getWalletBalance()`, `transfer()`, `deposit()`, `withdraw()`
  - `getNotifications()`, `markNotificationAsRead()`
  - `uploadKYCDocument()`, `getKYCStatus()`

#### `AuthProvider`
- State:
  - `user`, `isLoading`, `error`, `sessionId`
- Operations:
  - `login`, `register`, `logout`, `logoutAllDevices`, `getActiveSessions`, `revokeSession`

#### `WalletProvider`
- State:
  - `balance`, `transactions`, `hideBalance`, `loading`, `error`
- Operations:
  - `refreshWallet`, `deposit`, `transfer`, `withdraw`

#### `NotificationProvider`
- State:
  - `notifications`, `unreadCount`, `loading`, `error`
- Operations:
  - `loadNotifications`, `markAsRead`, `markAllAsRead`, `deleteNotification`

#### `KYCProvider`
- State:
  - `kycStatus`, `kycDocuments`, `loading`, `error`
- Operations:
  - `loadKycStatus`, `submitKYC`

#### UI components
- `PrivateRoute` - protects paths by checking authentication
- `ErrorBoundary` - catches component rendering errors
- `DashboardLayout`, `Navbar`, `Sidebar` - layout components
- Page components such as `Dashboard`, `SendDeposit`, `Transactions`, `KYC`, `Misc`, `Admin`

### 7.3 Relationships

- `AuthService` uses `User`, `Session`, and `Notification` models
- `WalletService` manipulates `Wallet`, `Transaction`, and `KYCStatus`
- `NotificationService` consumes events produced by other services
- `ApiGateway` routes requests from `APIClient`/frontend to backend services
- `APIClient` is used by frontend contexts and pages
- `AuthProvider` depends on `APIClient`
- `WalletProvider`, `NotificationProvider`, and `KYCProvider` depend on `APIClient`

---

## 8. Sequence Diagram Guidance

### 8.1 Login Sequence

Actors:
- User
- React Frontend
- API Gateway
- Auth Service
- PostgreSQL

Flow:
1. User submits login form
2. Frontend calls `apiClient.login()` to `/api/auth/login`
3. API Gateway forwards the request to Auth Service
4. Auth Service calls `User.findByEmail(email)` against PostgreSQL
5. Auth Service verifies password and creates `Session.create(...)`
6. Auth Service generates JWT accessToken and refreshToken
7. Auth Service returns success response with user data and tokens
8. Frontend saves tokens in `localStorage`
9. Frontend updates `AuthContext.user`

### 8.2 Deposit Sequence

Actors:
- User
- React Frontend
- API Gateway
- Wallet Service
- PostgreSQL
- RabbitMQ
- Notification Service

Flow:
1. User submits deposit amount and method
2. Frontend calls `apiClient.deposit()` to `/api/transactions/deposit`
3. API Gateway forwards request to Wallet Service
4. Wallet Service inserts new `transactions` row
5. Wallet Service updates `wallets.balance`
6. Wallet Service publishes event `deposit.created` to RabbitMQ
7. Notification Service consumes event and sends email
8. Wallet Service returns updated balance and transaction info
9. Frontend updates wallet context state

### 8.3 Transfer Sequence

Flow:
1. Frontend calls `/api/transactions/transfer`
2. Wallet Service verifies sender wallet balance and recipient user
3. Wallet Service inserts sender debit and recipient credit transactions
4. Wallet Service updates both wallets
5. Wallet Service publishes `transfer.sent` and `transfer.received`
6. Notification Service sends emails for both users
7. Frontend updates transaction list and balance

### 8.4 Logout Sequence

Flow:
1. User clicks logout
2. Frontend calls `/api/auth/logout`
3. API Gateway forwards request to Auth Service
4. Auth Service validates token and deactivates session in PostgreSQL
5. Auth Service returns success
6. Frontend clears local tokens and user state

---

## 9. UML Diagram Details by Diagram Type

### 9.1 Use Case Diagram

Map actors to goals:
- End User:
  - Register
  - Login
  - Verify email
  - View dashboard
  - Manage wallet
  - Deposit funds
  - Transfer funds
  - Withdraw funds
  - View transactions
  - View notifications
  - Upload KYC
  - Logout
- Admin (if present):
  - View system health
  - Monitor transactions

### 9.2 Activity Diagram

Recommended activity flows:
- Registration
- Login and token verification
- Deposit process
- Transfer process
- Withdrawal process
- KYC submission
- Notification consumption

Each activity should include decision points such as:
- `if password valid`
- `if token expired`
- `if wallet exists`
- `if balance sufficient`
- `if recipient found`

### 9.3 Class Diagram

Suggested classes:
- `APIClient`
- `AuthProvider`
- `WalletProvider`
- `NotificationProvider`
- `KYCProvider`
- `User`
- `Session`
- `Wallet`
- `Transaction`
- `Notification`
- `KYCStatus`
- `AuthService`
- `WalletService`
- `NotificationService`
- `ApiGateway`

Show relationships:
- `AuthService` aggregates `User`, `Session`, `Notification`
- `WalletService` aggregates `Wallet`, `Transaction`, `KYCStatus`
- `NotificationService` depends on `RabbitMQ`
- `Frontend` depends on `APIClient`
- `APIClient` depends on `ApiGateway`

### 9.4 Sequence Diagram

Draw sequence diagrams for at least:
- Login
- Deposit
- Transfer
- KYC submission
- Notification delivery

Include lifelines for:
- User
- Browser
- API Gateway
- Backend Service
- Database
- RabbitMQ
- Notification Service

---

## 10. Important System Details for UML

### 10.1 Authentication
- JWT-based authentication with `Authorization: Bearer <token>` header
- Refresh token endpoint to renew access tokens
- Session tracking stored in database
- Protected routes require `authenticateToken` middleware

### 10.2 Service Boundaries
- Auth Service owns user and session domain
- Wallet Service owns wallet, transaction, and KYC domains
- Notification Service owns email notification delivery
- API Gateway orchestrates request routing

### 10.3 Event-driven notifications
- Wallet Service publishes events to RabbitMQ when financial actions occur
- Notification Service listens on queues and sends email notifications
- This separation supports asynchronous notifications and decouples services

### 10.4 Data flow between services
- The frontend never calls backend services directly; it always goes through API Gateway
- Auth Service and Wallet Service both use PostgreSQL but may share the same database server
- Wallet Service and Auth Service both use RabbitMQ for publish/subscribe notification events

---

## 11. Notes for UML Implementation

1. **Use clear boundaries** between frontend, gateway, auth service, wallet service, notification service, database, and message broker.
2. **Label data objects** such as `User`, `Token`, `Session`, `Wallet`, `Transaction`, `Notification`, `KYCStatus`.
3. **Show both synchronous and asynchronous interactions**:
   - HTTP requests are synchronous
   - RabbitMQ publish/subscribe is asynchronous
4. **Include error/decision branching** in activity diagrams for validation and failure cases.
5. **Trace state changes** in sequences: e.g., login stores tokens, deposit updates wallet balance, transfer updates sender and receiver.

---

## 12. Recommended Diagram Mapping

### Use case groups
- Authentication: `Register`, `Login`, `Verify Email`, `Logout`, `Refresh Token`
- Wallet: `View Balance`, `Deposit`, `Transfer`, `Withdraw`, `View Transactions`
- KYC: `Submit Documents`, `View KYC Status`
- Notifications: `Receive Notification`, `Read Notification`, `Delete Notification`
- System: `Health Check`, `Manage Profile`

### Activity flows
- `User -> Frontend -> API Gateway -> Auth Service -> DB`
- `User -> Frontend -> API Gateway -> Wallet Service -> RabbitMQ -> Notification Service`

### Classes to display
- `User`, `Session`, `Wallet`, `Transaction`, `Notification`, `KYCStatus`
- `APIClient`, `AuthProvider`, `WalletProvider`, `NotificationProvider`, `KYCProvider`
- `AuthService`, `WalletService`, `NotificationService`, `ApiGateway`

### Sequence scenarios
- **Login**: UI -> API Gateway -> Auth Service -> DB -> Auth Service -> UI
- **Deposit**: UI -> API Gateway -> Wallet Service -> DB -> RabbitMQ -> Notification Service -> UI
- **Transfer**: UI -> API Gateway -> Wallet Service -> DB -> DB -> RabbitMQ -> Notification Service -> UI
- **Withdraw**: UI -> API Gateway -> Wallet Service -> DB -> RabbitMQ -> Notification Service -> UI
- **KYC status**: UI -> API Gateway -> Wallet Service -> DB -> UI

---

## 13. Appendix: Key Files

- Frontend:
  - `src/App.js`
  - `src/api/client.js`
  - `src/context/AuthContext.js`
  - `src/context/WalletContext.js`
  - `src/context/NotificationContext.js`
  - `src/context/KYCContext.js`
- Backend:
  - `cloud-wallet/apps/api-gateway/index.js`
  - `cloud-wallet/apps/auth-service/index.js`
  - `cloud-wallet/apps/auth-service/routes/auth.js`
  - `cloud-wallet/apps/auth-service/models/User.js`
  - `cloud-wallet/apps/auth-service/models/Session.js`
  - `cloud-wallet/apps/auth-service/models/Notification.js`
  - `cloud-wallet/apps/wallet-service/index.js`
  - `cloud-wallet/apps/notification-service/index.js`

---

## 14. Final implementation advice

- Use this overview as a blueprint for your UML diagrams.
- Make sure each diagram clearly shows where each action begins and which service handles it.
- When in doubt, model the system as a chain:
  - `User -> Frontend -> API Gateway -> Backend Service -> Database/RabbitMQ -> Notification Service`
- Keep the frontend and backend separation explicit in every diagram.

Good luck implementing the UML diagrams for NexVault!