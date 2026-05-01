# Wallet Service Integration Guide

## Overview
The wallet service is fully integrated across the microservices architecture, connecting the React frontend through the API Gateway to the Node.js wallet-service backend, with RabbitMQ for event notifications.

## Architecture Flow

```
┌─────────────────────┐
│   React Frontend    │
│  (SendDeposit.js)   │
└──────────┬──────────┘
           │
           │ (useWallet context)
           │
┌──────────▼──────────────────┐
│  API Client (client.js)     │
│  - transfer()               │
│  - deposit()                │
│  - withdraw()               │
│  - getWalletBalance()       │
│  - getTransactionHistory()  │
└──────────┬──────────────────┘
           │
           │ (HTTP/JSON)
           │
┌──────────▼──────────────────────┐
│   API Gateway (4000)            │
│   Routes to Wallet Service      │
└──────────┬──────────────────────┘
           │
┌──────────▼──────────────────────┐
│  Wallet Service (3003)          │
│  - POST /transactions/deposit   │
│  - POST /transactions/transfer  │
│  - POST /transactions/withdraw  │
│  - GET /transactions/history    │
│  - GET /wallets/balance         │
└──────────┬──────────────────────┘
           │
           ├─ Queries/Updates → PostgreSQL
           │
           └─ Events → RabbitMQ
              ├─ deposit.created
              ├─ transfer.sent/received
              └─ withdrawal.initiated
```

## Components

### 1. Frontend Pages (React)
**File:** `src/pages/SendDeposit.js`

#### Deposit Component
```javascript
const { deposit } = useWallet();
const handleDeposit = async () => {
  const res = await deposit(parseFloat(amount), method, depositRef);
  // Sets balance and adds transaction to state
};
```

#### Transfer Component
```javascript
const { transfer } = useWallet();
const handleConfirm = async () => {
  const res = await transfer(
    parseFloat(form.amount),
    recipientContact?.name || form.recipient,
    form.recipient,
    form.note
  );
  // Sets balance and adds transaction to state
};
```

#### Withdraw Component
```javascript
const { withdraw } = useWallet();
const handleConfirm = async () => {
  const res = await withdraw(parseFloat(amount), bankForm.bankName, bankForm.accountNumber);
  // Sets balance and adds transaction to state
};
```

### 2. Wallet Context Provider
**File:** `src/context/WalletContext.js`

Provides wallet state and async operations:
- `balance` - Current wallet balance
- `transactions` - Transaction history
- `deposit(amount, method, reference)` - Process deposit
- `transfer(amount, name, email, note)` - Send transfer
- `withdraw(amount, bankName, accountNumber)` - Initiate withdrawal
- `refreshWallet()` - Sync with backend
- `getTransactionHistory()` - Fetch transactions from server

### 3. API Client Wrapper
**File:** `src/api/client.js`

Endpoint methods:
```javascript
apiClient.deposit(amount, method, currency, reference)
apiClient.transfer(recipientEmail, amount, note, currency)
apiClient.withdraw(amount, bankDetails, currency)
apiClient.getWalletBalance()
apiClient.getTransactionHistory(limit, offset)
```

### 4. API Gateway
**File:** `cloud-wallet/apps/api-gateway/index.js`

Routes:
- `POST /api/transactions/deposit` → wallet-service
- `POST /api/transactions/transfer` → wallet-service
- `POST /api/transactions/withdraw` → wallet-service
- `GET /api/transactions/history` → wallet-service
- `GET /api/wallets/balance` → wallet-service

### 5. Wallet Service Backend
**File:** `cloud-wallet/apps/wallet-service/index.js`

Endpoints with full transaction handling:

#### GET /api/wallets/balance
Returns current balance and wallet status

#### POST /api/transactions/deposit
- Validates amount
- Calculates fee (1.5% for card, 0% for bank)
- Creates transaction record in DB
- Updates wallet balance
- Publishes `deposit.created` event to RabbitMQ

#### POST /api/transactions/transfer
- Validates sender and recipient
- Checks balance sufficiency
- Debits sender (amount + fee)
- Credits recipient (amount only)
- Creates transaction records for both parties
- Publishes `transfer.sent` and `transfer.received` events

#### POST /api/transactions/withdraw
- Validates amount and bank details
- Checks balance
- Creates transaction record with banking info
- Debits wallet
- Publishes `withdrawal.initiated` event

#### GET /api/transactions/history
- Queries transactions table
- Applies pagination
- Returns formatted transaction list

### 6. Database Schema
**File:** `cloud-wallet/apps/wallet-service/schema.sql`

Tables:
- `wallets` - User wallet accounts with balance
- `transactions` - All transaction records
- `transaction_fees` - Fee breakdowns
- `external_accounts` - Bank account details
- `transaction_logs` - Audit trail
- `wallet_limits` - Transaction limits per user
- `pending_transactions` - Async processing queue

### 7. RabbitMQ Events

Events published on transaction operations:

```javascript
// Deposit events
{
  userId: "...",
  type: "deposit",
  title: "Deposit Received",
  message: "Your deposit of USD 100 has been completed",
  data: { reference: "DEP-...", amount: 100, method: "card" }
}

// Transfer events
{
  userId: "sender_id",
  type: "transfer",
  title: "Transfer Sent",
  message: "You sent USD 50 to recipient@email.com",
  data: { reference: "TRF-...", recipient: "...", amount: 50 }
}

// Withdrawal events
{
  userId: "...",
  type: "withdrawal",
  title: "Withdrawal Initiated",
  message: "Your withdrawal of USD 100 to Bank XYZ will be processed in 1-3 business days",
  data: { reference: "WDR-...", amount: 100, bankName: "Bank XYZ" }
}
```

## Data Flow Examples

### Deposit Flow
1. User selects amount and method (card/bank) in Deposit page
2. UI calls `deposit()` from WalletContext
3. WalletContext calls `apiClient.deposit()`
4. API Client sends POST to `/api/transactions/deposit` via gateway
5. Wallet Service receives request
6. Creates transaction record in PostgreSQL
7. Updates wallet balance
8. Publishes event to RabbitMQ notification queue
9. Returns response with balance and transaction details
10. WalletContext updates local state with balance and adds transaction

### Transfer Flow
1. User selects recipient and enters amount
2. UI calls `transfer()` from WalletContext
3. WalletContext calls `apiClient.transfer()`
4. Wallet Service receives transfer request
5. **Validates:**
   - Sender has sufficient balance (amount + $0.50 fee)
   - Recipient email exists in users table
6. **Executes transaction:**
   - Creates "debit" transaction for sender
   - Creates "credit" transaction for recipient
   - Debits sender wallet: balance - amount - fee
   - Credits recipient wallet: balance + amount
7. **Publishes events:**
   - `transfer.sent` to sender
   - `transfer.received` to recipient
8. Returns updated sender balance to frontend

### Withdrawal Flow
1. User enters bank details and amount
2. UI calls `withdraw()` from WalletContext
3. Wallet Service creates pending transaction
4. Updates wallet balance
5. Publishes `withdrawal.initiated` event
6. Backend processes withdrawal asynchronously
7. Updates transaction status to "completed" when bank confirms

## Integration Checklist

- ✅ Frontend pages use WalletContext async operations
- ✅ WalletContext calls real backend APIs
- ✅ API Client properly formats requests for wallet-service endpoints
- ✅ API Gateway proxies wallet routes to wallet-service
- ✅ Wallet Service persists all transactions to PostgreSQL
- ✅ Wallet Service calculates fees correctly
- ✅ Wallet Service updates balances after operations
- ✅ Wallet Service publishes RabbitMQ notification events
- ✅ Transaction history endpoint queries database
- ✅ Docker compose includes wallet schema SQL
- ✅ Environment variables configured for Node wallet-service (not Java)

## Testing the Integration

### Start Services
```bash
docker-compose up
```

### Test Deposit
```bash
curl -X POST http://localhost:4000/api/transactions/deposit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100,
    "method": "card",
    "currency": "USD",
    "reference": "DEP-test-001"
  }'
```

### Test Transfer
```bash
curl -X POST http://localhost:4000/api/transactions/transfer \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientEmail": "user2@example.com",
    "amount": 50,
    "note": "Test transfer",
    "currency": "USD"
  }'
```

### Test Get Balance
```bash
curl -X GET http://localhost:4000/api/wallets/balance \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Transaction History
```bash
curl -X GET http://localhost:4000/api/transactions/history?limit=50&offset=0 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Troubleshooting

### Balance not updating
- Check wallet-service is running on port 3003
- Verify PostgreSQL is connecting (check logs)
- Ensure transactions are being inserted in DB

### Transactions not showing in history
- Check transactions table has data: `SELECT * FROM transactions;`
- Verify transaction user_id matches authenticated user

### Notifications not received
- Check RabbitMQ is running (port 5672)
- Verify wallet-service can connect to RabbitMQ
- Notification-service must be running to consume events

### Transfer fails with "Insufficient balance"
- Correct - backend validates (amount + fee) <= balance
- Includes $0.50 transfer fee in calculation

## Performance Notes

- Transaction history uses pagination (default 50 items)
- Wallet balance is synced on app load and refreshed after operations
- All DB operations use indexed user_id for fast queries
- RabbitMQ ensures notifications don't block transaction processing

## Security

- JWT authentication required for all wallet endpoints
- User can only access their own transactions
- Sensitive bank account numbers are logged with masks
- All transactions audited with timestamps and user info
