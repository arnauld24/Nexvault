// Admin API Client - Handles all communication with the backend for admin operations

const rawApiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const normalizedApiUrl = rawApiUrl.replace(/\/+$/, '');
// Admin dashboard expects the auth service to expose admin routes at the root (e.g. /admin)
const ADMIN_API_BASE_URL = normalizedApiUrl;

// ── Storage key constants ─────────────────────────────────────────────────────
// Single source of truth – imported by App.js so both files always agree.
export const STORAGE_KEYS = {
  ACCESS_TOKEN:  'admin_access_token',
  REFRESH_TOKEN: 'admin_refresh_token',
  SESSION:       'admin_session',
};

class AdminAPIClient {
  constructor() {
    this.accessToken  = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    this.refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  // ── Token management ────────────────────────────────────────────────────────

  setTokens(accessToken, refreshToken) {
    this.accessToken  = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN,  accessToken);
    if (refreshToken) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
  }

  clearTokens() {
    this.accessToken  = null;
    this.refreshToken = null;
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  }

  getAuthHeader() {
    return this.accessToken
      ? { Authorization: `Bearer ${this.accessToken}` }
      : {};
  }

  // ── Core fetch wrapper ──────────────────────────────────────────────────────

  async fetchAPI(endpoint, options = {}) {
    const url     = `${ADMIN_API_BASE_URL}${endpoint}`;
    const authHeader = this.getAuthHeader();
    const headers = {
      'Content-Type': 'application/json',
      ...authHeader,
      ...options.headers,
    };

    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${options.method || 'GET'} ${endpoint}`, {
        hasToken: !!this.accessToken,
        tokenLength: this.accessToken?.length,
        authHeaderPresent: !!authHeader.Authorization
      });
    }

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), options.timeout || 20000);

    try {
      const response = await fetch(url, { ...options, headers, signal: controller.signal });

      const text = await response.text();
      let data;
      try   { data = text ? JSON.parse(text) : {}; }
      catch { data = { message: text }; }

      // Auto-refresh on 401 token-expired
      if (response.status === 401 && data.message?.includes('expired')) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          headers.Authorization = `Bearer ${this.accessToken}`;
          const retry     = await fetch(url, { ...options, headers, signal: controller.signal });
          const retryText = await retry.text();
          let retryData;
          try   { retryData = retryText ? JSON.parse(retryText) : {}; }
          catch { retryData = { message: retryText }; }
          if (!retry.ok) throw new Error(retryData.message || `HTTP ${retry.status}`);
          return retryData;
        }
      }

      if (!response.ok) {
        // Log 401 errors with more context
        if (response.status === 401) {
          console.error(`[API 401] ${endpoint}:`, {
            message: data.message,
            hasToken: !!this.accessToken,
            tokenPreview: this.accessToken ? `${this.accessToken.slice(0, 20)}...` : 'none',
            authHeaderSent: !!authHeader.Authorization
          });
        }
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      console.error(`Admin API Error [${endpoint}]:`, error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Like fetchAPI but never throws — returns { success: false, _error } on failure.
   * Use this for non-critical dashboard calls so one failing endpoint never
   * prevents the rest of the data from loading.
   */
  async safeCall(endpoint, options = {}) {
    try {
      return await this.fetchAPI(endpoint, options);
    } catch (err) {
      console.warn(`Admin safeCall [${endpoint}] failed (non-fatal):`, err.message);
      return { success: false, _error: err.message };
    }
  }

  // ── Token refresh ───────────────────────────────────────────────────────────

  async refreshAccessToken() {
    try {
      if (!this.refreshToken) return false;

      const response = await fetch(`${ADMIN_API_BASE_URL}/auth/refresh-token`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refreshToken: this.refreshToken }),
      });

      const data = await response.json();

      if (data.success && data.accessToken) {
        this.accessToken = data.accessToken;
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.accessToken);
        return true;
      }

      this.clearTokens();
      return false;
    } catch (error) {
      console.error('Admin token refresh failed:', error);
      this.clearTokens();
      return false;
    }
  }

  // ── Authentication ──────────────────────────────────────────────────────────

  async loginAdmin(email, password) {
    const response = await this.fetchAPI('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, deviceName: 'Admin Dashboard', deviceType: 'desktop' }),
    });

    if (response.success && response.accessToken) {
      this.setTokens(response.accessToken, response.refreshToken);
    }

    return response;
  }

  async logoutAdmin() {
    const response = await this.safeCall('/auth/logout', { method: 'POST' });
    this.clearTokens();
    return response;
  }

  // ── KYC management ──────────────────────────────────────────────────────────

  async getPendingKyc(limit = 50, offset = 0) {
    return this.safeCall(`/kyc/admin/pending?limit=${limit}&offset=${offset}`);
  }

  async approveKyc(userId) {
    return this.fetchAPI(`/kyc/admin/${userId}/approve`, { method: 'POST' });
  }

  async rejectKyc(userId, rejectionReason) {
    return this.fetchAPI(`/kyc/admin/${userId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejectionReason }),
    });
  }

  async getKycStats() {
    return this.safeCall('/kyc/admin/stats');
  }

  async getUserKycDocuments(userId) {
    return this.safeCall(`/kyc/documents?userId=${userId}`);
  }

  // ── User management ─────────────────────────────────────────────────────────

  async getAllUsers(limit = 50, offset = 0, search = '') {
    let endpoint = `/admin/users?limit=${limit}&offset=${offset}`;
    if (search) endpoint += `&search=${encodeURIComponent(search)}`;
    return this.safeCall(endpoint);
  }

  async getUserStats() {
    return this.safeCall('/admin/users/stats');
  }

  async getUserDetails(userId) {
    return this.fetchAPI(`/admin/users/${userId}`);
  }

  async searchUsers(searchTerm = '') {
    return this.safeCall(`/auth/users/search?q=${encodeURIComponent(searchTerm)}`);
  }

  async suspendUser(userId, reason = '') {
    return this.fetchAPI(`/admin/users/${userId}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async reactivateUser(userId) {
    return this.fetchAPI(`/admin/users/${userId}/reactivate`, { method: 'POST' });
  }

  async disableUser(userId, reason = '') {
    return this.fetchAPI(`/admin/users/${userId}/disable`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // ── Dashboard statistics ─────────────────────────────────────────────────────

  async getDashboardOverview() {
    return this.safeCall('/admin/dashboard/overview');
  }

  async getTransactionStats(period = '7d') {
    return this.safeCall(`/admin/transactions/stats?period=${period}`);
  }

  async getWalletStats() {
    return this.safeCall('/admin/wallets/stats');
  }

  async getRecentTransactions(limit = 6) {
    return this.safeCall(`/admin/transactions/recent?limit=${limit}`);
  }

  async getTopWalletUsers(limit = 5) {
    return this.safeCall(`/admin/wallets/top?limit=${limit}`);
  }

  // ── Admin Notifications ──────────────────────────────────────────────────────

  async getAdminNotifications(limit = 50, offset = 0) {
    return this.safeCall(`/admin/notifications?limit=${limit}&offset=${offset}`);
  }

  async getUnreadNotificationCount() {
    return this.safeCall('/admin/notifications/unread/count');
  }

  async markNotificationAsRead(notificationId) {
    return this.fetchAPI(`/admin/notifications/${notificationId}/read`, { method: 'PUT' });
  }

  async markAllNotificationsAsRead() {
    return this.fetchAPI('/admin/notifications/mark-all-read', { method: 'POST' });
  }

  // ── Withdrawals ──────────────────────────────────────────────────────────────

  async getPendingWithdrawals(limit = 50) {
    return this.safeCall(`/admin/withdrawals/pending?limit=${limit}`);
  }

  async validateWithdrawal(reference, note = '') {
    return this.fetchAPI(`/admin/withdrawals/${reference}/validate`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  }

  async rejectWithdrawal(reference, reason = 'Admin rejection') {
    return this.fetchAPI(`/admin/withdrawals/${reference}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // ── Profit & Revenue ────────────────────────────────────────────────────────

  async getProfit(period = 'all', startDate = null, endDate = null) {
    let endpoint = `/admin/profit?period=${period}`;
    if (startDate && endDate) {
      endpoint += `&startDate=${startDate}&endDate=${endDate}`;
    }
    return this.safeCall(endpoint);
  }

  async getProfitBreakdown(period = 'day') {
    return this.safeCall(`/admin/profit/breakdown?period=${period}`);
  }

  async getFeeStatistics() {
    return this.safeCall('/admin/profit/fees');
  }

  // ── System monitoring ────────────────────────────────────────────────────────

  async getSystemHealth() {
    return this.safeCall('/admin/health');
  }

  async getServiceStatus() {
    return this.safeCall('/admin/services/status');
  }
}

// Singleton
export const adminApi = new AdminAPIClient();
export default adminApi;
