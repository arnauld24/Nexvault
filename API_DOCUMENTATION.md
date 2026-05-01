# Auth Service API Documentation

## Overview
The Auth Service is a Node.js/Express microservice responsible for handling all authentication, session management, and user verification for the NexVault digital wallet system. It uses PostgreSQL for data persistence and JWT for secure token management.

---

## Base URL
```
http://localhost:3001/api/auth
```

---

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <accessToken>
```

---

## Endpoints

### 1. Register User
**POST** `/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "phoneNumber": "+1234567890",
  "country": "USA",
  "city": "New York"
}
```

**Success Response (201):**
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

**Error Response (400):**
```json
{
  "success": false,
  "message": "Email already registered"
}
```

---

### 2. Login User
**POST** `/login`

Authenticate a user and create a session.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "deviceName": "iPhone 14",
  "deviceType": "mobile"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "sessionId": "550e8400-e29b-41d4-a716-446655440002",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "kycStatus": "unverified",
    "emailVerified": false,
    "tier": "standard"
  },
  "expiresIn": "24h"
}
```

**Error Response (401):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

---

### 3. Refresh Access Token
**POST** `/refresh-token`

Get a new access token using a valid refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": "24h"
}
```

---

### 4. Logout User
**POST** `/logout`
*Requires Authentication*

Log out from the current device/session.

**Request Body:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440002"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 5. Logout from All Devices
**POST** `/logout-all`
*Requires Authentication*

Log out from all active sessions.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out from 3 device(s)"
}
```

---

### 6. Verify Email
**POST** `/verify-email`

Verify user's email address using verification token.

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "token": "550e8400-e29b-41d4-a716-446655440001"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

---

### 7. Request Password Reset
**POST** `/request-password-reset`

Request a password reset link (sends email).

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "If the email exists, a password reset link has been sent"
}
```

---

### 8. Reset Password
**POST** `/reset-password`

Reset password using reset token.

**Request Body:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "token": "550e8400-e29b-41d4-a716-446655440003",
  "newPassword": "NewSecurePassword456!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password reset successfully. Please log in with your new password."
}
```

---

### 9. Get Active Sessions
**GET** `/sessions`
*Requires Authentication*

Get all active sessions for the current user.

**Success Response (200):**
```json
{
  "success": true,
  "sessions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "device_name": "iPhone 14",
      "device_type": "mobile",
      "ip_address": "192.168.1.100",
      "last_activity": "2024-04-15T10:30:00Z",
      "created_at": "2024-04-14T08:15:00Z",
      "expires_at": "2024-04-16T08:15:00Z"
    }
  ]
}
```

---

### 10. Revoke Device Session
**POST** `/sessions/:sessionId/revoke`
*Requires Authentication*

Revoke a specific device session.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Device session revoked"
}
```

---

### 11. Verify Token
**POST** `/verify-token`
*Requires Authentication*

Check if the provided token is valid.

**Success Response (200):**
```json
{
  "success": true,
  "message": "Token is valid",
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com"
  }
}
```

---

## Error Codes

| Code | Message | Meaning |
|------|---------|---------|
| 400 | Bad Request | Invalid input or request format |
| 401 | Unauthorized | Invalid credentials or expired token |
| 403 | Forbidden | Access denied |
| 404 | Not Found | Resource not found |
| 500 | Internal Server Error | Server-side error |

---

## Rate Limiting

- **Login**: 5 attempts per 15 minutes
- **Register**: 3 attempts per hour
- **General API**: 100 requests per 15 minutes

---

## Security Features

✅ **Password Hashing**: bcryptjs with 12 rounds
✅ **JWT Tokens**: Signed with HS256 algorithm
✅ **Session Management**: Database-backed with expiry
✅ **Rate Limiting**: Prevents brute force attacks
✅ **CORS**: Restricted origins
✅ **Helmet**: Security headers
✅ **Input Validation**: Server-side validation

---

## Database Schema

See `database/schema.sql` for the complete PostgreSQL schema including:
- users
- sessions
- email_verification_tokens
- password_reset_tokens
- login_attempts
- notifications
- kyc_documents
- audit_logs

---

## Environment Variables

See `.env.example` for the full list of required environment variables.

---

## Notification Service API

The Notification Service runs on port 3002 and handles email and SMS notifications triggered by Auth Service events through RabbitMQ.

### Health Check
**GET** `/health`

```json
{
  "success": true,
  "message": "Notification Service is running",
  "timestamp": "2024-04-15T10:30:00Z"
}
```

---

## RabbitMQ Event Flow

### Events Published by Auth Service
- `user.registered` - on successful registration
- `user.login` - on successful login
- `user.logout` - on logout
- `user.logout.all` - on logout from all devices

### Events Consumed by Notification Service
- `user.registered` → sends welcome email
- `user.login` → sends login notification email
- `password_reset` → sends password reset email

---

## Example Usage

### Register and Login Flow
```bash
# 1. Register
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "firstName": "John",
    "lastName": "Doe"
  }'

# 2. Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "deviceName": "Chrome Browser"
  }'

# 3. Use accessToken for authenticated requests
curl -X GET http://localhost:3001/api/auth/sessions \
  -H "Authorization: Bearer <accessToken>"
```

---

## Testing

Run the test suite:
```bash
npm run test
```

---

## Deployment

See Docker setup in `docker-compose.yml`:
```bash
docker-compose up -d
```

This will start:
- PostgreSQL (port 5432)
- RabbitMQ (port 5672, management UI on 15672)
- Auth Service (port 3001)
- Notification Service (port 3002)

---

## Notes

- All timestamps are in UTC (ISO 8601 format)
- Tokens expire after 24 hours
- Refresh tokens expire after 7 days
- Sessions expire based on `SESSION_EXPIRY_HOURS` environment variable
- All passwords are hashed using bcryptjs
- Database connections use connection pooling for performance
