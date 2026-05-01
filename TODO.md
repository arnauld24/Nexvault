# TODO: Replace Mock Data with Real Database Data

## Completed
- [x] src/utils/formatters.js - New file with formatCurrency & formatDate
- [x] src/context/AuthContext.js - Add profile state, fetch full profile
- [x] src/context/WalletContext.js - Remove mockData imports, default to 0/[]
- [x] src/pages/Dashboard.js - Replace currentUser with profile, chartData with real stats
- [x] Deleted mockData.js file
- [x] Updated all components to use real data from contexts

## Phone 1: Backend - Add Missing API Endpoints
- [ ] cloud-wallet/apps/auth-service/routes/auth.js - Add GET /profile endpoint
- [ ] cloud-wallet/apps/wallet-service/index.js - Add GET /api/users/statistics endpoint
- [ ] src/api/client.js - Update getUserProfile() path

## Phase 3: Database Seeding
- [x] seed-database.js - Create standalone seeding script
- [ ] Execute seed script for fonkouaarnauld@gmail.com user

