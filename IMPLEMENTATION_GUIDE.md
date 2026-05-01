# NexVault Backend Implementation Guide

## Project Structure

```
Nexvault-master/
├── cloud-wallet/
│   ├── apps/
│   │   ├── auth-service/           # ✅ Node.js/Express - Implemented
│   │   │   ├── config/
│   │   │   │   ├── config.js
│   │   │   │   ├── database.js     # PostgreSQL connection
│   │   │   │   └── rabbitmq.js     # RabbitMQ connection
│   │   │   ├── database/
│   │   │   │   └── schema.sql      # PostgreSQL schema
│   │   │   ├── middleware/
│   │   │   │   ├── auth.js         # JWT middleware
│   │   │   │   └── rateLimiter.js
│   │   │   ├── models/
│   │   │   │   ├── User.js
│   │   │   │   ├── Session.js
│   │   │   │   └── Notification.js
│   │   │   ├── routes/
│   │   │   │   ├── auth.js
│   │   │   │   └── notifications.js
│   │   │   ├── services/
│   │   │   │   └── AuthService.js
│   │   │   ├── index.js
│   │   │   ├── Dockerfile
│   │   │   ├── package.json
│   │   │   └── .env.example
│   │   │
│   │   ├── notification-service/   # ✅ Node.js/Express - Implemented
│   │   │   ├── config/
│   │   │   ├── index.js
│   │   │   ├── Dockerfile
│   │   │   ├── package.json
│   │   │   └── .env.example
│   │   │
│   │   ├── wallet-service/         # ⏳ Java Spring Boot (You'll implement)
│   │   │
│   │   ├── api-gateway/            # ⏳ To be implemented
│   │   │
│   │   └── auth-service/ (Old)     # Deprecated
│   │
│   └── packages/
│       └── shared/
│           └── db-connect.js
│
├── docker-compose.yml              # ✅ Updated with PostgreSQL
├── API_DOCUMENTATION.md            # ✅ Complete API reference
└── README.md                        # ⏳ This file

```

---

## Technology Stack

### Backend Services
| Service | Technology | Database | Status |
|---------|-----------|----------|--------|
| **Auth Service** | Node.js/Express + JWT | PostgreSQL | ✅ Complete |
| **Notification Service** | Node.js/Express | RabbitMQ | ✅ Complete |
| **Wallet Service** | Java Spring Boot | PostgreSQL | ⏳ TODO |
| **API Gateway** | Express.js | - | ⏳ TODO |

### Infrastructure
- **Database**: PostgreSQL 15
- **Message Queue**: RabbitMQ 3
- **Containerization**: Docker & Docker Compose
- **Package Manager**: npm

---

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- Docker and Docker Compose installed
- Java 17+ (for Wallet Service development in IntelliJ)
- PostgreSQL 15 (for local development)

### 1. Clone and Setup Project

```bash
# Clone repository
git clone <repo-url>
cd Nexvault-master

# Create environment files
cp cloud-wallet/apps/auth-service/.env.example cloud-wallet/apps/auth-service/.env
cp cloud-wallet/apps/notification-service/.env.example cloud-wallet/apps/notification-service/.env
```

### 2. Configure Environment Variables

**Auth Service** (`cloud-wallet/apps/auth-service/.env`):
```bash
# Database
DB_USER=nexvault_user
DB_PASSWORD=secure_password_123
DB_HOST=postgres
DB_NAME=nexvault_auth

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Email (configure with your email provider)
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
```

**Notification Service** (`cloud-wallet/apps/notification-service/.env`):
```bash
# Email configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
```

### 3. Start Services with Docker Compose

```bash
# Build and start all services
docker-compose up -d

# Check logs
docker-compose logs -f auth-service
docker-compose logs -f notification-service

# Stop services
docker-compose down
```

This will start:
- ✅ PostgreSQL on port 5432
- ✅ RabbitMQ on port 5672 (Management UI on 15672)
- ✅ Auth Service on port 3001
- ✅ Notification Service on port 3002

### 4. Local Development (Without Docker)

```bash
# Auth Service
cd cloud-wallet/apps/auth-service
npm install
npm run dev

# In another terminal - Notification Service
cd cloud-wallet/apps/notification-service
npm install
npm run dev
```

---

## Auth Service Features

### ✅ Implemented Endpoints

#### User Management
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout from device
- `POST /api/auth/logout-all` - Logout from all devices
- `POST /api/auth/verify-token` - Verify JWT token

#### Session Management
- `GET /api/auth/sessions` - Get active sessions
- `POST /api/auth/sessions/:sessionId/revoke` - Revoke device session

#### Email Verification
- `POST /api/auth/verify-email` - Verify email address

#### Password Management
- `POST /api/auth/request-password-reset` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/refresh-token` - Refresh access token

#### Notifications
- `GET /api/notifications` - Get user notifications
- `GET /api/notifications/unread/count` - Get unread count
- `PUT /api/notifications/:id/read` - Mark notification as read
- `POST /api/notifications/mark-all-read` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification
- `GET /api/notifications/type/:type` - Get notifications by type

### ✅ Key Features

✅ **JWT Authentication**
- Access tokens (24h expiry)
- Refresh tokens (7d expiry)
- Token verification middleware

✅ **Session Management**
- Multi-device session support
- Device tracking (name, type, IP, user agent)
- Session revocation
- Activity tracking

✅ **Password Security**
- bcryptjs hashing (12 rounds)
- Password reset tokens
- Password strength validation

✅ **Email Management**
- Email verification workflow
- Password reset emails
- Login notifications
- Sent through Notification Service via RabbitMQ

✅ **Rate Limiting**
- Login rate limiter (5 attempts/15 min)
- Register rate limiter (3 attempts/hour)
- General API limiter (100 requests/15 min)

✅ **Audit Trail**
- Login attempts tracking
- Failed login logging
- Session activity tracking

---

## Notification Service Features

### ✅ Implemented

✅ **Email Notifications**
- Sends welcome emails on registration
- Sends login notifications
- Sends password reset emails
- HTML email templates
- SMTP configuration

✅ **RabbitMQ Integration**
- Consumes user.registered events
- Consumes user.login events
- Consumes password_reset notifications
- Automatic retry on failure

✅ **Extensible Design**
- Ready for SMS integration (Twilio/AWS SNS)
- Ready for push notifications
- Configurable notification types

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  kyc_status VARCHAR(50) DEFAULT 'unverified',
  account_status VARCHAR(50) DEFAULT 'active',
  email_verified BOOLEAN DEFAULT FALSE,
  tier VARCHAR(50) DEFAULT 'standard',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ...
)
```

### Sessions Table
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  session_token VARCHAR(500) UNIQUE,
  ip_address VARCHAR(50),
  device_name VARCHAR(255),
  device_type VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP NOT NULL,
  ...
)
```

### Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type VARCHAR(50),
  title VARCHAR(255),
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ...
)
```

See complete schema in `cloud-wallet/apps/auth-service/database/schema.sql`

---

## API Usage Examples

### 1. Register User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!",
    "deviceName": "Mobile App"
  }'
```

### 3. Access Protected Route
```bash
curl -X GET http://localhost:3001/api/auth/sessions \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." 
```

### 4. Refresh Token
```bash
curl -X POST http://localhost:3001/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }'
```

---

## Next Steps - Wallet Service (Java Spring Boot)

### What You Need to Implement

The Wallet Service should handle:

1. **Wallet Management**
   - Create wallet for user
   - Get wallet balance
   - Update balance
   - Multiple currency support

2. **Transaction Processing**
   - Create transaction records
   - Update transaction status
   - Transaction history
   - Transaction filtering

3. **Deposit/Withdrawal**
   - Process deposits
   - Process withdrawals
   - Payment gateway integration

4. **KYC Integration**
   - KYC document storage
   - KYC verification status
   - Document validation

5. **Database Tables Needed**
   ```sql
   - wallets
   - transactions
   - kyc_documents
   - payment_methods
   - transaction_fees
   - wallet_history
   ```

6. **API Endpoints**
   - `GET /api/wallets/balance`
   - `POST /api/transactions/transfer`
   - `POST /api/transactions/deposit`
   - `POST /api/transactions/withdraw`
   - `GET /api/transactions/history`
   - `POST /api/kyc/upload`

See [Java Spring Boot Setup](#) for detailed instructions.

---

## RabbitMQ Message Flow

```
Auth Service Events:
- user.registered → Notification Service → Send welcome email
- user.login → Notification Service → Send login email
- password_reset → Notification Service → Send reset email
- user.logout.all → Notification Service → Send logout notification

Future Events:
- transaction.created → Wallet Service & Notification Service
- transfer.completed → Notification Service
- kyc.verified → Notification Service
```

---

## Production Deployment Checklist

- [ ] Change JWT secret keys
- [ ] Configure real database credentials
- [ ] Set up email provider (Gmail, SendGrid, AWS SES)
- [ ] Configure SMS provider (Twilio, AWS SNS)
- [ ] Enable HTTPS/TLS
- [ ] Set up API Gateway
- [ ] Configure environment variables securely
- [ ] Set up logging and monitoring
- [ ] Run security audit
- [ ] Set up automated backups
- [ ] Configure load balancing
- [ ] Set up CI/CD pipeline

---

## Troubleshooting

### PostgreSQL Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose logs postgres

# Verify connection
psql -U nexvault_user -d nexvault_auth -h localhost
```

### RabbitMQ Issues
```bash
# Check RabbitMQ status
docker-compose logs rabbitmq

# Access Management UI
http://localhost:15672 (guest/guest)
```

### Auth Service Errors
```bash
# Check logs
docker-compose logs auth-service

# Verify database schema
docker-compose exec postgres psql -U nexvault_user -d nexvault_auth -c "\dt"
```

---

## File Structure Explained

### Config Files
- `config/config.js` - Central configuration
- `config/database.js` - PostgreSQL pool connection
- `config/rabbitmq.js` - RabbitMQ connection and channel

### Models
- `models/User.js` - User CRUD operations
- `models/Session.js` - Session management
- `models/Notification.js` - Notification management

### Services
- `services/AuthService.js` - Business logic for auth operations

### Middleware
- `middleware/auth.js` - JWT verification
- `middleware/rateLimiter.js` - Rate limiting

### Routes
- `routes/auth.js` - Auth endpoints
- `routes/notifications.js` - Notification endpoints

---

## Security Best Practices Implemented

✅ **Encryption**: bcryptjs with 12 rounds
✅ **Token Security**: JWT with HS256 algorithm
✅ **Rate Limiting**: Prevent brute force attacks
✅ **Input Validation**: Server-side validation
✅ **CORS**: Restricted origins
✅ **Helmet**: Security headers
✅ **SQL Injection Prevention**: Parameterized queries
✅ **XSS Protection**: Input sanitization
✅ **Password Policy**: Minimum 8 characters
✅ **Session Timeout**: 24-hour default
✅ **Audit Logging**: Track user actions
✅ **Soft Deletes**: User data preservation

---

## Performance Optimizations

✅ Database connection pooling
✅ Indexed database queries
✅ Async/await for non-blocking operations
✅ Message queue for async notifications
✅ Gzip compression for responses
✅ Request caching where applicable

---

## Monitoring & Logging

- Health check endpoint: `/health`
- Request logging middleware
- Error logging to console
- RabbitMQ message tracking
- Database query performance

---

## Support & Documentation

- **API Docs**: See `API_DOCUMENTATION.md`
- **Postman Collection**: [Link to collection]
- **Database Schema**: `cloud-wallet/apps/auth-service/database/schema.sql`
- **Environment Variables**: `.env.example` files

---

## Authors
- NexVault Development Team
- Backend: Microservices Architecture

## License
ISC

---

**Last Updated**: April 15, 2024
**Status**: Auth Service & Notification Service Complete | Wallet Service In Progress
