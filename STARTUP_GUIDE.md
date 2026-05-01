# 🚀 NexVault Development Startup Guide

## Prerequisites
- Node.js 14+ installed
- Docker & Docker Compose installed (for containerized deployment)
- PostgreSQL 15 (if running without Docker)
- RabbitMQ (if running without Docker)

---

## Option 1: Start with Docker Compose (Recommended)

### Step 1: Build and Start All Services
```bash
# Navigate to project root
cd Nexvault-master

# Build and start all services
docker-compose up --build
```

This will start:
- PostgreSQL (port 5432)
- RabbitMQ (port 5672, Management UI: 15672)
- Auth Service (port 3001)
- Notification Service (port 3002)
- API Gateway (port 3000)

### Step 2: Start Frontend
```bash
# In a new terminal, navigate to frontend
cd Nexvault-master

# Install dependencies (if not already done)
npm install

# Start React dev server
npm start
```

The frontend will typically run on `http://localhost:5173` or `http://localhost:3000`

---

## Option 2: Start Services Individually (Development)

### Step 1: Start Database
```bash
docker run --name nexvault_postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=FONK2005- -e POSTGRES_DB=nexvault_db -p 5432:5432 -d postgres:18-alpine
```

### Step 2: Start RabbitMQ
```bash
docker run --name nexvault_rabbitmq -e RABBITMQ_DEFAULT_USER=guest -e RABBITMQ_DEFAULT_PASS=guest -p 5672:5672 -p 15672:15672 -d rabbitmq:3-management
```

### Step 3: Initialize Database Schema
```bash
# Wait for PostgreSQL to be ready (about 10 seconds), then run:
psql -h localhost -U nexvault_user -d nexvault_auth -f cloud-wallet/apps/auth-service/database/schema.sql
```

### Step 4: Start Auth Service
```bash
cd cloud-wallet/apps/auth-service
npm install
npm start
```

### Step 5: Start Notification Service
```bash
cd cloud-wallet/apps/notification-service
npm install
npm start
```

### Step 6: Start API Gateway
```bash
cd cloud-wallet/apps/api-gateway
npm install
npm start
```

### Step 7: Start Frontend
```bash
npm install
npm start
```

---

## Verify Services are Running

### Check API Gateway Health
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "success": true,
  "message": "API Gateway is running",
  "services": {
    "auth": "http://localhost:3001",
    "wallet": "http://localhost:3003",
    "notification": "http://localhost:3002"
  }
}
```

### Check Service Status
```bash
curl http://localhost:3000/health/services
```

### Access RabbitMQ Management
- URL: `http://localhost:15672`
- Username: `guest`
- Password: `guest`

### Connect to PostgreSQL
```bash
psql -h localhost -U nexvault_user -d nexvault_auth
```
Password: `secure_password_123`

---

## Frontend Configuration

The frontend API client looks for `process.env.REACT_APP_API_URL`. Make sure it's set to:

**For Local Development:**
```
REACT_APP_API_URL=http://localhost:4000/api
```

Create a `.env` file in the project root:
```env
REACT_APP_API_URL=http://localhost:3000/api
```

---

## Testing Login Flow

1. Navigate to http://localhost:5173 (or http://localhost:3000 if using default port)
2. Click "Create one free" on the login page
3. Fill in registration form:
   - First Name: John
   - Last Name: Doe
   - Email: john@example.com
   - Phone: +1 (555) 000-0000
   - Password: SecurePass123!

4. Complete registration
5. Sign in with credentials just created

---

## Troubleshooting

### Issue: "Failed to load resource: 404 Not Found"
**Solution:**
- Ensure API Gateway is running on port 3000
- Check that Auth Service is running on port 3001
- Verify CORS is not blocking requests (should see a 200 response in browser DevTools)
- Check API Gateway logs for service availability

### Issue: "ECONNREFUSED" when starting Auth Service
**Solution:**
- Make sure PostgreSQL is running
- Verify database credentials in `.env`
- Check if port 5432 is accessible

### Issue: Database schema not initialized
**Solution:**
```bash
# Manually run schema initialization
psql -h localhost -U nexvault_user -d nexvault_auth -f cloud-wallet/apps/auth-service/database/schema.sql
```

### Issue: RabbitMQ connection fails
**Solution:**
- Ensure RabbitMQ is running and accessible on port 5672
- Check RabbitMQ logs: `docker logs nexvault_rabbitmq`
- Verify credentials in service `.env` files

### Issue: "Cannot find module" errors
**Solution:**
```bash
# Reinstall dependencies for specific service
cd cloud-wallet/apps/<service-name>
rm -rf node_modules package-lock.json
npm install
npm start
```

---

## API Endpoints

All endpoints are proxied through the API Gateway.

### Auth Service
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/logout-all` - Logout from all devices
- `GET /api/auth/verify-token` - Verify JWT token
- `POST /api/auth/refresh-token` - Refresh access token

### Wallet Service (Java Spring Boot - Coming Soon)
- `GET /api/wallets` - Get wallet list
- `POST /api/wallets` - Create wallet
- `GET /api/transactions` - Get transactions

---

## Architecture Overview

```
Frontend (React)
    ↓
API Gateway (Express.js, Port 3000)
    ├─ Auth Service (Express.js, Port 3001)
    │   └─ PostgreSQL (Port 5432)
    ├─ Notification Service (Express.js, Port 3002)
    │   └─ RabbitMQ (Port 5672)
    └─ Wallet Service (Java Spring Boot, Port 3003) [Coming Soon]
```

---

## Next Steps

1. ✅ Backend services running
2. ✅ Frontend connected to API Gateway
3. ⏭️ Implement Wallet Service (Java Spring Boot)
4. ⏭️ Add KYC (Know Your Customer) service
5. ⏭️ Implement payment provider integration

---

For more details, see [API_DOCUMENTATION.md](./cloud-wallet/API_DOCUMENTATION.md)
