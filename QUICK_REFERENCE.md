# 🎯 Quick Reference Guide

## Services Overview

| Service | Port | Language | Database | Status |
|---------|------|----------|----------|--------|
| Auth Service | 3001 | Node.js/Express | PostgreSQL | ✅ Ready |
| Notification Service | 3002 | Node.js/Express | RabbitMQ Events | ✅ Ready |
| PostgreSQL | 5432 | - | PostgreSQL | ✅ Ready |
| RabbitMQ | 5672 | - | Message Queue | ✅ Ready |
| Wallet Service | 3003 | Java Spring Boot | PostgreSQL | ⏳ TODO |
| API Gateway | 3000 | Node.js/Express | - | ⏳ TODO |

---

## Starting Services

### Option 1: Docker Compose (Recommended)
```bash
docker-compose up -d
```
This starts: PostgreSQL, RabbitMQ, Auth Service, Notification Service

### Option 2: Local Development
```bash
# Terminal 1 - Auth Service
cd cloud-wallet/apps/auth-service
npm install
npm run dev

# Terminal 2 - Notification Service
cd cloud-wallet/apps/notification-service
npm install
npm run dev

# Terminal 3 - PostgreSQL & RabbitMQ
docker-compose up postgres rabbitmq
```

---

## Environment Setup

### Create .env Files
```bash
cp cloud-wallet/apps/auth-service/.env.example cloud-wallet/apps/auth-service/.env
cp cloud-wallet/apps/notification-service/.env.example cloud-wallet/apps/notification-service/.env
```

### Update Configuration
Edit the `.env` files with:
- Database credentials
- JWT secrets
- Email credentials (Gmail, SendGrid, etc.)
- RabbitMQ URL

---

## API Testing

### Register User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "password": "Test123!@#",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "password": "Test123!@#",
    "deviceName": "Chrome Browser",
    "deviceType": "desktop"
  }'
```

### Use Access Token
```bash
# Replace YOUR_TOKEN with actual token from login response
curl -X GET http://localhost:3001/api/auth/sessions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Notifications
```bash
curl -X GET http://localhost:3001/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Database Access

### Connect to PostgreSQL
```bash
# Using Docker
docker-compose exec postgres psql -U nexvault_user -d nexvault_auth

# Using psql locally
psql -U nexvault_user -d nexvault_auth -h localhost
```

### View Users
```sql
SELECT id, email, first_name, last_name, kyc_status, created_at FROM users;
```

### View Sessions
```sql
SELECT user_id, device_name, device_type, ip_address, expires_at, is_active FROM sessions;
```

### View Audit Trail
```sql
SELECT user_id, action, ip_address, created_at FROM login_attempts ORDER BY created_at DESC;
```

---

## RabbitMQ Management

### Access RabbitMQ UI
```
http://localhost:15672
Username: guest
Password: guest
```

### View Queues
- notifications.email
- notifications.sms
- events.user-registered
- events.user-login
- events.user-logout.all

### View Exchanges
- nexvault.notifications (direct)
- nexvault.events (topic)

---

## Docker Commands

```bash
# View all services status
docker-compose ps

# View logs
docker-compose logs -f auth-service
docker-compose logs -f notification-service

# Rebuild containers
docker-compose up -d --build

# Stop all services
docker-compose down

# Remove volumes (clears data)
docker-compose down -v

# Execute command in container
docker-compose exec auth-service npm run dev
docker-compose exec postgres psql -U nexvault_user -d nexvault_auth
```

---

## File Locations

### Auth Service
- Main: `cloud-wallet/apps/auth-service/index.js`
- Config: `cloud-wallet/apps/auth-service/config/`
- Models: `cloud-wallet/apps/auth-service/models/`
- Routes: `cloud-wallet/apps/auth-service/routes/`
- Services: `cloud-wallet/apps/auth-service/services/`
- Database Schema: `cloud-wallet/apps/auth-service/database/schema.sql`

### Notification Service
- Main: `cloud-wallet/apps/notification-service/index.js`
- Config: `cloud-wallet/apps/notification-service/config/`

### Documentation
- API Docs: `API_DOCUMENTATION.md`
- Setup Guide: `IMPLEMENTATION_GUIDE.md`
- Summary: `COMPLETION_SUMMARY.md`

---

## Authentication Flow

```
User Registers
    ↓
Email Verification Token Created
    ↓
Welcome Email Sent (via Notification Service)
    ↓
User Clicks Verification Link
    ↓
User Logs In
    ↓
Access Token (24h) + Refresh Token (7d) Generated
    ↓
Session Created (multi-device support)
    ↓
Login Notification Email Sent (via Notification Service)
    ↓
User Can Access Protected Routes with Access Token
```

---

## Session Management

```
Device 1 Login (Phone)
    ↓ Session 1 Created
    
Device 2 Login (Browser)
    ↓ Session 2 Created (same user)
    
Can Logout From:
    - Single Device → Session Revoked
    - All Devices → All Sessions Revoked
    
Sessions Automatically Expire After 24 Hours
```

---

## Password Reset Flow

```
User Clicks "Forgot Password"
    ↓
Email Entered
    ↓
Reset Token Created (1 hour expiry)
    ↓
Reset Email Sent (via Notification Service)
    ↓
User Clicks Reset Link
    ↓
New Password Entered
    ↓
Password Updated + All Sessions Revoked
    ↓
User Logs In with New Password
```

---

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| /api/auth/register | 3 attempts | 1 hour |
| /api/auth/login | 5 attempts | 15 minutes |
| General API | 100 requests | 15 minutes |

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Email already registered"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Invalid or expired token"
}
```

---

## Troubleshooting

### PostgreSQL Won't Start
```bash
# Check logs
docker-compose logs postgres

# Verify port not in use
lsof -i :5432

# Remove old container
docker-compose down -v
docker-compose up postgres
```

### RabbitMQ Issues
```bash
# Check logs
docker-compose logs rabbitmq

# Access management UI
http://localhost:15672

# Restart RabbitMQ
docker-compose restart rabbitmq
```

### Auth Service Connection Error
```bash
# Check if PostgreSQL is running
docker-compose ps

# View auth service logs
docker-compose logs auth-service

# Check GitHub Copilot
# Restart service
docker-compose restart auth-service
```

---

## Important Variables

### JWT
- **Access Token Expiry**: 24 hours
- **Refresh Token Expiry**: 7 days
- **Algorithm**: HS256

### Session
- **Default Expiry**: 24 hours
- **Absolute Timeout**: 30 days
- **Refresh After**: Logout

### Password
- **Min Length**: 8 characters
- **Hash Rounds**: 12 (bcryptjs)
- **Algorithm**: bcrypt

### Rate Limiting
- **Login Window**: 15 minutes
- **Login Max Attempts**: 5
- **Register Window**: 1 hour
- **Register Max Attempts**: 3

---

## Deployment Checklist

- [ ] Change JWT_SECRET in .env
- [ ] Change REFRESH_TOKEN_SECRET in .env
- [ ] Configure real email service (not Gmail for production)
- [ ] Update database credentials
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS/TLS
- [ ] Set up SSL certificates
- [ ] Configure firewall rules
- [ ] Set up backups
- [ ] Set up monitoring
- [ ] Set up logging
- [ ] Load test the system
- [ ] Security audit

---

## Support Resources

- Full API Documentation: See `API_DOCUMENTATION.md`
- Setup Guide: See `IMPLEMENTATION_GUIDE.md`
- Database Schema: See `cloud-wallet/apps/auth-service/database/schema.sql`
- Example .env Files: See `.env.example` files

---

## Next Steps

1. **Update Frontend** - Connect React app to Auth Service endpoints
2. **Implement Wallet Service** - Java Spring Boot microservice
3. **Create API Gateway** - Request routing and orchestration
4. **Add Monitoring** - Logging and performance tracking
5. **Production Deployment** - Deploy to cloud (AWS, GCP, Azure)

---

**Last Updated**: April 15, 2024
**Version**: 1.0 (Backend Services Complete)
