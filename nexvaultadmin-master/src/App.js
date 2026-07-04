import React, { useState, useEffect } from 'react';
import SplashLoader from './components/common/SplashLoader';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/layout/DashboardLayout';
import AdminDashboard from './pages/AdminDashboard';
import KycVerificationPage from './pages/KycVerificationPage';
import UserManagementPage from './pages/UserManagementPage';
import AdminTransactionsPage from './pages/AdminTransactionsPage';
import AdminWithdrawalsPage from './pages/AdminWithdrawalsPage';
import AdminNotificationsPage from './pages/AdminNotificationsPage';
import AdminProfitPage from './pages/AdminProfitPage';
import { adminApi, STORAGE_KEYS } from './api/adminClient';

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [usersList, setUsersList] = useState([]);
  const [pendingKycUsers, setPendingKycUsers] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [kycStats, setKycStats] = useState(null);
  const [txStats, setTxStats] = useState(null);
  const [walletStats, setWalletStats] = useState(null);
  const [recentTx, setRecentTx] = useState([]);
  const [topWallets, setTopWallets] = useState([]);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        const savedUser = localStorage.getItem(STORAGE_KEYS.SESSION);

        if (accessToken && savedUser) {
          try {
            const adminUser = JSON.parse(savedUser);
            adminApi.setTokens(accessToken, refreshToken);
            setUser(adminUser);
            // Load dashboard data after setting user
            await loadAdminData();
          } catch (e) {
            console.warn('Failed to restore admin session:', e);
            // Clear invalid session
            localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
            localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
            localStorage.removeItem(STORAGE_KEYS.SESSION);
          }
        }
      } catch (e) {
        console.warn('Session restore error:', e);
      } finally {
        setIsInitializing(false);
      }
    };
    
    restoreSession();
  }, []);

  const loadAdminData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [pendingResponse, kycStatsResponse, userStatsResponse, usersResponse, overviewResponse, txStatsResponse, walletStatsResponse, recentTxResponse, topWalletsResponse] = await Promise.all([
        adminApi.getPendingKyc(),
        adminApi.getKycStats(),
        adminApi.getUserStats(),
        adminApi.getAllUsers(100, 0, ''),
        adminApi.getDashboardOverview(),
        adminApi.getTransactionStats('7d'),
        adminApi.getWalletStats(),
        adminApi.getRecentTransactions(6),
        adminApi.getTopWalletUsers(5),
      ]);

      // Ensure pendingDocs is always an array - defensive checks
      let pendingDocs = [];
      if (pendingResponse?.success && Array.isArray(pendingResponse.documents)) {
        pendingDocs = pendingResponse.documents;
      } else if (Array.isArray(pendingResponse)) {
        pendingDocs = pendingResponse;
      }
      // Default to empty array for any other case (error, null, undefined, etc.)

      // Group documents by user so we keep front/back/selfie separate
      const normalizeType = (value) => {
        const raw = (value || '').toString().trim().toLowerCase();
        if (['id', 'national_id', 'national id', 'identity_document', 'identity document'].includes(raw)) return 'id';
        if (['drivers_license', 'driver_license', 'driver license', 'driver_license'].includes(raw)) return 'drivers_license';
        if (['passport'].includes(raw)) return 'passport';
        if (['selfie'].includes(raw)) return 'selfie';
        if (['address_proof', 'address proof'].includes(raw)) return 'address_proof';
        return raw;
      };

      const normalizeKycStatus = (value) => {
        const raw = (value || '').toString().trim().toLowerCase();
        if (['verified', 'approved', 'passed', 'complete'].includes(raw)) return 'verified';
        if (['rejected', 'declined', 'denied', 'failed', 'unverified'].includes(raw)) return 'rejected';
        if (['pending', 'in_review', 'review', 'submitted'].includes(raw)) return 'pending';
        return raw || 'pending';
      };

      const friendlyDocumentType = (type) => {
        if (type === 'id') return 'National ID';
        if (type === 'drivers_license') return "Driver's License";
        if (type === 'passport') return 'Passport';
        if (type === 'selfie') return 'Selfie';
        if (type === 'address_proof') return 'Address Proof';
        return type ? type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'ID Document';
      };

      const usersMap = new Map();
      (Array.isArray(pendingDocs) ? pendingDocs : []).forEach((doc) => {
        const userId = doc.user?.id || doc.user_id || doc.id;
        if (!userId) return;
        const type = normalizeType(doc.documentType || doc.document_type || '');
        const url = doc.documentUrl || doc.document_url || '';
        let entry = usersMap.get(userId);
        if (!entry) {
          entry = {
            id: userId,
            name: `${doc.user?.firstName || doc.user?.first_name || ''} ${doc.user?.lastName || doc.user?.last_name || ''}`.trim() || doc.user?.email || doc.email || 'Unknown User',
            email: doc.user?.email || doc.email || 'unknown@domain.com',
            dob: doc.user?.dob || '',
            kyc: 'pending',
            status: 'active',
            joined: doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A',
            documentType: friendlyDocumentType(type),
            documentId: doc.documentId || doc.document_id || doc.id || 'N/A',
            documentIds: {},
            documentUrls: {},
          };
          usersMap.set(userId, entry);
        }

        // Keep documentType friendly for later if selfie appears before ID/passport
        if ((entry.documentType === 'Selfie' || entry.documentType === 'Address Proof' || !entry.documentType) && ['id', 'drivers_license', 'passport'].includes(type)) {
          entry.documentType = friendlyDocumentType(type);
        }

        // assign to appropriate slot
        if (type === 'selfie') {
          entry.documentUrls.selfie = url;
          entry.documentIds.selfie = doc.id;
        } else if (type === 'passport') {
          entry.documentUrls.passport = url;
          entry.documentIds.passport = doc.id;
        } else if (type === 'address_proof') {
          const isIdDocument = ['National ID', "Driver's License", 'Driving License', 'Identity Document'].includes(entry.documentType);
          if (isIdDocument && entry.documentUrls.front && !entry.documentUrls.back) {
            // Some KYC uploads treat the back-side image as address_proof placeholder.
            entry.documentUrls.back = url;
            entry.documentIds.back = doc.id;
          } else {
            entry.documentUrls.address_proof = url;
            entry.documentIds.address_proof = doc.id;
          }
          if (!entry.documentId || entry.documentId === 'N/A') {
            entry.documentId = doc.id;
          }
        } else if (type === 'id' || type === 'drivers_license' || type === 'identity_document') {
          if (!entry.documentUrls.front) {
            entry.documentUrls.front = url;
            entry.documentIds.front = doc.id;
          } else if (!entry.documentUrls.back) {
            entry.documentUrls.back = url;
            entry.documentIds.back = doc.id;
          } else {
            entry.documentUrls.extra = entry.documentUrls.extra || [];
            entry.documentUrls.extra.push(url);
          }
        } else {
          entry.documentUrls[type] = url;
          entry.documentIds[type] = doc.id;
        }
      });

      setPendingKycUsers(Array.from(usersMap.values()));

      if (kycStatsResponse?.success) {
        setKycStats(kycStatsResponse.stats);
      }

      if (userStatsResponse?.success) {
        setAdminStats(userStatsResponse.stats);
      }

      if (overviewResponse?.success) {
        setAdminStats(prev => ({ ...(prev || {}), ...overviewResponse.overview }));
      }

      if (txStatsResponse?.success) {
        setTxStats({ trend: txStatsResponse.stats || [], period: txStatsResponse.period || '7d' });
      }

      if (walletStatsResponse?.success) {
        setWalletStats(walletStatsResponse.stats || walletStatsResponse);
      }

      if (recentTxResponse?.success) {
        setRecentTx((recentTxResponse.transactions || []).map((tx) => ({
          ...tx,
          userName: `${tx.first_name || tx.userName || ''} ${tx.last_name || ''}`.trim() || tx.email || tx.userEmail || 'Unknown User',
          userEmail: tx.email || tx.userEmail || '',
          amount: Number(tx.amount) || 0,
          date: tx.created_at || tx.date || tx.createdAt || '',
          category: tx.category || tx.type,
          type: tx.type || tx.category,
        })));
      }

      if (topWalletsResponse?.success) {
        setTopWallets((topWalletsResponse.topWallets || []).map((wallet) => ({
          ...wallet,
          name: `${wallet.first_name || ''} ${wallet.last_name || ''}`.trim() || wallet.email || wallet.userName || 'Unknown User',
          email: wallet.email || '',
          balance: Number(wallet.total_balance || wallet.balance || 0),
        })));
      }

      if (usersResponse?.success) {
        setUsersList(usersResponse.users.map((user) => ({
          id: user.id,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
          email: user.email,
          kyc: user.kyc_status || 'unverified',
          status: user.account_status || 'active',
          joined: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A',
          balance: user.balance || 0,
          transactions: user.transactions_count || 0,
          documentType: 'Unknown',
          documentId: 'N/A',
        })));
      }
    } catch (err) {
      console.error('Admin data load failed:', err);
      setError(err.message || 'Unable to load admin data from backend');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSuccess = async (payload) => {
    const adminUser = payload.adminUser || payload;
    const tokens = payload.tokens || {
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
    };

    if (!tokens?.accessToken) {
      throw new Error('Missing access token after login.');
    }

    // Set tokens first (saves to localStorage with correct keys)
    adminApi.setTokens(tokens.accessToken, tokens.refreshToken);
    
    // Update UI state
    setUser(adminUser);
    
    // Save session to localStorage
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(adminUser));
    
    // Load dashboard data
    await loadAdminData();
  };

  const handleLogout = () => {
    setUser(null);
    setUsersList([]);
    setPendingKycUsers([]);
    setAdminStats(null);
    setKycStats(null);
    adminApi.clearTokens();
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    setActiveTab('dashboard');
  };

  const handleSuspendUser = async (id, reason = '') => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminApi.suspendUser(id, reason);
      if (!response?.success) throw new Error(response?.message || 'Unable to suspend user');
      setUsersList(prev => prev.map((u) => u.id === id ? { ...u, status: 'suspended' } : u));
      await loadAdminData();
    } catch (err) {
      console.error('Suspend user failed:', err);
      setError(err.message || 'Failed to suspend user');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleReactivateUser = async (id) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminApi.reactivateUser(id);
      if (!response?.success) throw new Error(response?.message || 'Unable to reactivate user');
      setUsersList(prev => prev.map((u) => u.id === id ? { ...u, status: 'active' } : u));
      await loadAdminData();
    } catch (err) {
      console.error('Reactivate user failed:', err);
      setError(err.message || 'Failed to reactivate user');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableUser = async (id, reason = '') => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminApi.disableUser(id, reason);
      if (!response?.success) throw new Error(response?.message || 'Unable to disable user');
      setUsersList(prev => prev.map((u) => u.id === id ? { ...u, status: 'disabled' } : u));
      await loadAdminData();
    } catch (err) {
      console.error('Disable user failed:', err);
      setError(err.message || 'Failed to disable user');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyKyc = async (id) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await adminApi.approveKyc(id);
      if (!response?.success) {
        throw new Error(response?.message || 'Unable to approve KYC');
      }
      setPendingKycUsers(prev => prev.filter((user) => user.id !== id));
      setUsersList(prev => prev.map((u) => u.id === id ? { ...u, kyc: 'verified' } : u));
      await loadAdminData();
    } catch (err) {
      console.error('Approve KYC failed:', err);
      setError(err.message || 'Failed to approve KYC');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeclineKyc = async (id, reason = 'Document verification failed') => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await adminApi.rejectKyc(id, reason);
      if (!response?.success) {
        throw new Error(response?.message || 'Unable to reject KYC');
      }
      setPendingKycUsers(prev => prev.filter((user) => user.id !== id));
      setUsersList(prev => prev.map((u) => u.id === id ? { ...u, kyc: 'rejected' } : u));
      await loadAdminData();
    } catch (err) {
      console.error('Reject KYC failed:', err);
      setError(err.message || 'Failed to reject KYC');
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitializing) {
    return <SplashLoader />;
  }

  if (!user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const renderTabContent = () => {
    const pendingById = new Map(pendingKycUsers.map((user) => [user.id, user]));
    const reviewUsers = usersList.map((user) => {
      const pendingMatch = pendingById.get(user.id);
      if (!pendingMatch) return user;
      return {
        ...user,
        ...pendingMatch,
        kyc: pendingMatch.kyc || user.kyc || 'pending',
      };
    });

    switch (activeTab) {
      case 'dashboard':
        return (
          <AdminDashboard
            users={usersList}
            setUsers={setUsersList}
            setActiveTab={setActiveTab}
            stats={adminStats}
            kycStats={kycStats}
            txStats={txStats}
            walletStats={walletStats}
            recentTx={recentTx}
            topWallets={topWallets}
          />
        );
      case 'kyc':
        return (
          <KycVerificationPage
            users={reviewUsers}
            stats={kycStats}
            onVerify={handleVerifyKyc}
            onDecline={handleDeclineKyc}
          />
        );
      case 'users':
        return (
          <UserManagementPage
            users={usersList}
            setUsers={setUsersList}
            setActiveTab={setActiveTab}
            onSuspendUser={handleSuspendUser}
            onReactivateUser={handleReactivateUser}
            onDisableUser={handleDisableUser}
          />
        );
      case 'transactions':
        return <AdminTransactionsPage />;
      case 'withdrawals':
        return <AdminWithdrawalsPage />;
      case 'notifications':
        return <AdminNotificationsPage />;
      case 'profit':
        return <AdminProfitPage />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      user={user}
      onLogout={handleLogout}
      isLoading={isLoading}
      error={error}
    >
      {renderTabContent()}
    </DashboardLayout>
  );
}
