// Frontend API Client - Handles all communication with the API Gateway
// This replaces the mock API and provides real backend integration

// Development mode: connect directly to mock auth service for testing
const USE_MOCK_AUTH = process.env.REACT_APP_USE_MOCK_AUTH === 'true';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
const MOCK_AUTH_URL = process.env.REACT_APP_MOCK_AUTH_URL || 'http://localhost:3001';

class APIClient {
  constructor() {
    this.token = this.getTokenFromStorage();
    this.refreshToken = this.getRefreshTokenFromStorage();
  }

  // Get the appropriate base URL for an endpoint
  getBaseUrl(endpoint) {
    // For development testing, route auth endpoints directly to mock service
    if (USE_MOCK_AUTH && (endpoint.startsWith('/auth') || endpoint.startsWith('/kyc') || endpoint.startsWith('/notifications'))) {
      return MOCK_AUTH_URL;
    }
    return API_BASE_URL;
  }

  // Token Management
  setTokens(accessToken, refreshToken) {
    this.token = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('nv_access_token', accessToken);
    localStorage.setItem('nv_refresh_token', refreshToken);
  }

  getTokenFromStorage() {
    return localStorage.getItem('nv_access_token');
  }

  getRefreshTokenFromStorage() {
    return localStorage.getItem('nv_refresh_token');
  }

  clearTokens() {
    this.token = null;
    this.refreshToken = null;
    localStorage.removeItem('nv_access_token');
    localStorage.removeItem('nv_refresh_token');
  }

  // Get authorization header
  getAuthHeader() {
    if (!this.token) {
      return {};
    }
    return {
      'Authorization': `Bearer ${this.token}`,
    };
  }

  // Generic fetch wrapper with error handling
  async fetchAPI(endpoint, options = {}) {
    const baseUrl = this.getBaseUrl(endpoint);
    const url = `${baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...this.getAuthHeader(),
      ...options.headers,
    };

    const controller = new AbortController();
    const timeoutMs = options.timeout || 20000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: text };
      }

      // If token expired, try to refresh
      if (response.status === 401 && data.message && data.message.includes('expired')) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${this.token}`;
          const retryResponse = await fetch(url, {
            ...options,
            headers,
            signal: controller.signal,
          });
          const retryText = await retryResponse.text();
          let retryData;
          try {
            retryData = retryText ? JSON.parse(retryText) : {};
          } catch {
            retryData = { message: retryText };
          }
          if (!retryResponse.ok) {
            throw new Error(retryData.message || `HTTP ${retryResponse.status}`);
          }
          return retryData;
        }
      }

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please check your connection and try again.');
      }
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Refresh access token
  async refreshAccessToken() {
    try {
      if (!this.refreshToken) {
        throw new Error('No refresh token available');
      }

      const baseUrl = this.getBaseUrl('/auth/refresh-token');
      const response = await fetch(`${baseUrl}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      const data = await response.json();

      if (data.success && data.accessToken) {
        this.token = data.accessToken;
        localStorage.setItem('nv_access_token', data.accessToken);
        return true;
      }

      // Token refresh failed, clear tokens
      this.clearTokens();
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearTokens();
      return false;
    }
  }

  // ==================== AUTHENTICATION ENDPOINTS ====================

  // Register new user
  async register(userData) {
    return this.fetchAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Login user
  async login(email, password, deviceName = 'Web Browser', deviceType = 'desktop') {
    const response = await this.fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        deviceName,
        deviceType,
      }),
    });

    if (response.success && response.accessToken) {
      this.setTokens(response.accessToken, response.refreshToken);
    }

    return response;
  }

  // Logout user
  async logout(sessionId) {
    const response = await this.fetchAPI('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ sessionId }),
    });

    if (response.success) {
      this.clearTokens();
    }

    return response;
  }

  // Logout from all devices
  async logoutAllDevices() {
    const response = await this.fetchAPI('/auth/logout-all', {
      method: 'POST',
    });

    if (response.success) {
      this.clearTokens();
    }

    return response;
  }

  // Verify email
  async verifyEmail(userId, token) {
    return this.fetchAPI('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ userId, token }),
    });
  }

  // Request password reset
  async requestPasswordReset(email) {
    return this.fetchAPI('/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Reset password
  async resetPassword(userId, token, newPassword) {
    return this.fetchAPI('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ userId, token, newPassword }),
    });
  }

  // Verify token
  async verifyToken() {
    return this.fetchAPI('/auth/verify-token', {
      method: 'POST',
    });
  }

  // Get active sessions
  async getActiveSessions() {
    return this.fetchAPI('/auth/sessions', {
      method: 'GET',
    });
  }

  // Revoke device session
  async revokeDeviceSession(sessionId) {
    return this.fetchAPI(`/auth/sessions/${sessionId}/revoke`, {
      method: 'POST',
    });
  }

  // ==================== NOTIFICATION ENDPOINTS ====================

  // Get notifications
  async getNotifications(limit = 50, offset = 0) {
    return this.fetchAPI(`/notifications?limit=${limit}&offset=${offset}`, {
      method: 'GET',
    });
  }

  // Get unread count
  async getUnreadNotificationCount() {
    return this.fetchAPI('/notifications/unread/count', {
      method: 'GET',
    });
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId) {
    return this.fetchAPI(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  // Mark all as read
  async markAllNotificationsAsRead() {
    return this.fetchAPI('/notifications/mark-all-read', {
      method: 'POST',
    });
  }

  // Delete notification
  async deleteNotification(notificationId) {
    return this.fetchAPI(`/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  }

  // ==================== WALLET ENDPOINTS ====================

  // Get wallet balance
  async getWalletBalance() {
    return this.fetchAPI('/wallets/balance', {
      method: 'GET',
    });
  }

  // Get wallet details
  async getWallet(walletId) {
    return this.fetchAPI(`/wallets/${walletId}`, {
      method: 'GET',
    });
  }

  // Create wallet
  async createWallet(currency = 'XAF') {
    return this.fetchAPI('/wallets/create', {
      method: 'POST',
      body: JSON.stringify({ currency }),
    });
  }

  // ==================== TRANSACTION ENDPOINTS ====================

  // Transfer money
  async transfer(recipientEmail, amount, note = '', currency = 'XAF') {
    return this.fetchAPI('/transactions/transfer', {
      method: 'POST',
      body: JSON.stringify({
        recipientEmail,
        amount,
        note,
        currency,
      }),
    });
  }

  // Deposit money
  async deposit(amount, method = 'card', currency = 'XAF', reference = null) {
    return this.fetchAPI('/transactions/deposit', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        method,
        currency,
        reference,
      }),
    });
  }

  // Withdraw money
  async withdraw(amount, bankDetails, currency = 'XAF') {
    return this.fetchAPI('/transactions/withdraw', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        bankDetails,
        currency,
      }),
    });
  }

  // Get transaction history
  async getTransactionHistory(limit = 50, offset = 0, filter = {}) {
    const params = new URLSearchParams({
      limit,
      offset,
      ...filter,
    });
    return this.fetchAPI(`/transactions/history?${params.toString()}`, {
      method: 'GET',
    });
  }

  // Get transaction details
  async getTransactionDetails(transactionId) {
    return this.fetchAPI(`/transactions/${transactionId}`, {
      method: 'GET',
    });
  }

  // ==================== KYC ENDPOINTS ====================

  // Upload KYC document
  async uploadKYCDocument(documentType, file) {
    const formData = new FormData();
    formData.append('documentType', documentType);
    formData.append('file', file);

    const baseUrl = this.getBaseUrl('/kyc/upload');
    const url = `${baseUrl}/kyc/upload`;
    
    const controller = new AbortController();
    const timeoutMs = 30000; // 30 second timeout for file uploads
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // For FormData, do NOT include Content-Type header - let the browser set it to multipart/form-data
      const headers = {
        'Authorization': `Bearer ${this.token}`,
        // NO Content-Type header here - the browser will set it correctly with boundary
      };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal,
      });

      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { success: false, message: text };
      }

      if (!response.ok) {
        const errorMessage = data.message || `HTTP ${response.status}`;
        console.error(`KYC upload failed [${response.status}]:`, errorMessage);
        throw new Error(errorMessage);
      }

      console.log('KYC document uploaded successfully');
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        const timeoutError = new Error('KYC upload timed out. Please check your connection and try again.');
        console.error('KYC upload timeout:', timeoutError.message);
        throw timeoutError;
      }
      console.error('KYC upload error:', error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Get KYC status
  async getKYCStatus() {
    return this.fetchAPI('/kyc/status', {
      method: 'GET',
    });
  }

  // Get KYC documents
  async getKYCDocuments() {
    return this.fetchAPI('/kyc/documents', {
      method: 'GET',
    });
  }

  // ==================== PAYMENT METHODS ====================

  // Add payment method
  async addPaymentMethod(paymentData) {
    return this.fetchAPI('/payment-methods', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  // Get payment methods
  async getPaymentMethods() {
    return this.fetchAPI('/payment-methods', {
      method: 'GET',
    });
  }

  // Delete payment method
  async deletePaymentMethod(paymentMethodId) {
    return this.fetchAPI(`/payment-methods/${paymentMethodId}`, {
      method: 'DELETE',
    });
  }

  // ==================== USER PROFILE ====================

  // Get user profile
  async getUserProfile() {
    return this.fetchAPI('/auth/profile', {
      method: 'GET',
    });
  }

  // Update user profile
  async updateUserProfile(userData) {
    return this.fetchAPI('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  // Change password
  async changePassword(currentPassword, newPassword) {
    return this.fetchAPI('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // Update avatar
  async updateAvatar(avatarUrl) {
    return this.fetchAPI('/auth/avatar', {
      method: 'PUT',
      body: JSON.stringify({ avatarUrl }),
    });
  }

  // Get 2FA status
  async get2FAStatus() {
    return this.fetchAPI('/auth/2fa/status', {
      method: 'GET',
    });
  }

  // Enable 2FA
  async enable2FA(method) {
    return this.fetchAPI('/auth/2fa/enable', {
      method: 'POST',
      body: JSON.stringify({ method }),
    });
  }

  // Disable 2FA
  async disable2FA(verificationCode) {
    return this.fetchAPI('/auth/2fa/disable', {
      method: 'POST',
      body: JSON.stringify({ verificationCode }),
    });
  }

  // Verify 2FA code
  async verifyTwoFactorCode(email, code) {
    return this.fetchAPI('/auth/verify-2fa', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  }

  async sendTransactionReceipt(transactionId) {
    return this.fetchAPI(`/transactions/${transactionId}/receipt`, {
      method: 'POST',
    });
  }

  // Search users by name or email
  async searchUsers(searchTerm = '') {
    const params = new URLSearchParams({ q: searchTerm });
    return this.fetchAPI(`/auth/users/search?${params.toString()}`, {
      method: 'GET',
    });
  }

  // Get user statistics
  async getUserStatistics() {
    return this.fetchAPI('/users/statistics', {
      method: 'GET',
    });
  }

  // ==================== HEALTH & DIAGNOSTICS ====================

  // Check API Gateway health
  async checkGatewayHealth() {
    return fetch(`${API_BASE_URL.replace('/api', '')}/health`)
      .then(r => r.json());
  }

  // Check service health
  async checkServiceHealth() {
    return fetch(`${API_BASE_URL.replace('/api', '')}/health/services`)
      .then(r => r.json());
  }
}

// Create singleton instance
export const apiClient = new APIClient();

// Export for direct use in components
export default apiClient;

