import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { apiClient } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('nv_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      const token = apiClient.getTokenFromStorage();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const profile = await apiClient.getUserProfile();
        const userData = profile.user || profile.data || profile;
        setUser(userData);
        localStorage.setItem('nv_user', JSON.stringify(userData));
      } catch (err) {
        apiClient.clearTokens();
        localStorage.removeItem('nv_user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    restoreSession();
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prevUser) => {
      const nextUser = { ...prevUser, ...updates };
      try {
        localStorage.setItem('nv_user', JSON.stringify(nextUser));
      } catch {
        // ignore storage errors
      }
      return nextUser;
    });
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await apiClient.login(email, password);
    const accessToken = response.accessToken || response.token || response.access_token;
    const refreshToken = response.refreshToken || response.refresh_token;
    let userData = response.user || response.data || null;

    if (response.success && accessToken) {
      apiClient.setTokens(accessToken, refreshToken);
      try {
        const profile = await apiClient.getUserProfile();
        userData = profile.user || profile.data || profile || userData;
      } catch (err) {
        console.error('Failed to fetch profile after login:', err);
      }
    }

    if (userData && typeof userData === 'object') {
      setUser(userData);
      try {
        localStorage.setItem('nv_user', JSON.stringify(userData));
      } catch {
        // ignore storage errors
      }
    }

    return response;
  }, []);

  const verifyTwoFactor = useCallback(async (email, code) => {
    const response = await apiClient.verifyTwoFactorCode(email, code);
    const accessToken = response.accessToken || response.token || response.access_token;
    const refreshToken = response.refreshToken || response.refresh_token;
    let userData = response.user || response.data || null;

    if (response.success && accessToken) {
      apiClient.setTokens(accessToken, refreshToken);
      try {
        const profile = await apiClient.getUserProfile();
        userData = profile.user || profile.data || profile || userData;
      } catch (err) {
        console.error('Failed to fetch profile after 2FA verification:', err);
      }
    }

    if (userData && typeof userData === 'object') {
      setUser(userData);
      try {
        localStorage.setItem('nv_user', JSON.stringify(userData));
      } catch {
        // ignore storage errors
      }
    }

    return response;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.logout();
    } catch (err) {
      console.warn('Logout failed:', err);
    }
    apiClient.clearTokens();
    localStorage.removeItem('nv_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, verifyTwoFactor, updateUser, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
