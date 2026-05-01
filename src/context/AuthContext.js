import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);
const USER_STORAGE_KEY = 'nv_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_STORAGE_KEY)) || null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);

  // Get active sessions
  const getActiveSessions = useCallback(async () => {
    try {
      const response = await apiClient.getActiveSessions();
      const sessions = response.sessions || [];
      setActiveSessions(sessions);
      return sessions;
    } catch (err) {
      console.error('Failed to get sessions:', err);
      return [];
    }
  }, []);

  // Initialize auth on mount - check if user is already logged in
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('nv_access_token');
        const storedSessionId = localStorage.getItem('nv_session_id');

        if (token) {
          if (storedSessionId) {
            setSessionId(storedSessionId);
          }

          const response = await apiClient.verifyToken();
          if (response.success) {
            setUser(response.user);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
            await getActiveSessions();
          } else {
            apiClient.clearTokens();
            localStorage.removeItem('nv_session_id');
            localStorage.removeItem(USER_STORAGE_KEY);
            setSessionId(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        apiClient.clearTokens();
        localStorage.removeItem('nv_session_id');
        localStorage.removeItem(USER_STORAGE_KEY);
        setSessionId(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [getActiveSessions]);

  // Login user
  const login = useCallback(async (email, password, deviceName = 'Web Browser') => {
    try {
      setError(null);
      setIsLoading(true);

      const response = await apiClient.login(email, password, deviceName, 'desktop');

      if (response && response.success) {
        if (response.requiresTwoFactor) {
          // Return the response with 2FA requirement
          return response;
        }

        setUser(response.user);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
        setSessionId(response.sessionId);
        localStorage.setItem('nv_session_id', response.sessionId);

        await getActiveSessions();

        return { success: true, user: response.user };
      }
      const message = response?.message || 'Login failed. Please try again.';
      setError(message);
      return { success: false, error: message };
    } catch (err) {
      const errorMsg = err.message || 'Login failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, [getActiveSessions]);

  // Verify 2FA code and complete login
  const verifyTwoFactor = useCallback(async (email, code) => {
    try {
      setError(null);
      setIsLoading(true);

      const response = await apiClient.verifyTwoFactorCode(email, code);

      if (response && response.success) {
        // Store tokens
        apiClient.setTokens(response.accessToken, response.refreshToken);
        
        setUser(response.user);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
        setSessionId(response.sessionId);
        localStorage.setItem('nv_session_id', response.sessionId);

        await getActiveSessions();

        return { success: true, user: response.user };
      }
      const message = response?.message || 'Verification failed. Please try again.';
      setError(message);
      return { success: false, error: message };
    } catch (err) {
      const errorMsg = err.message || 'Verification failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, [getActiveSessions]);

  // Register user
  const register = useCallback(async (userData) => {
    try {
      setError(null);
      setIsLoading(true);

      const response = await apiClient.register(userData);

      if (response.success) {
        return { success: true, message: response.message };
      } else {
        setError(response.message);
        return { success: false, error: response.message };
      }
    } catch (err) {
      const errorMsg = err.message || 'Registration failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout user
  const logout = useCallback(async () => {
    try {
      setError(null);
      if (sessionId) {
        await apiClient.logout(sessionId);
      }
      setUser(null);
      setSessionId(null);
      localStorage.removeItem('nv_session_id');
      localStorage.removeItem(USER_STORAGE_KEY);
      apiClient.clearTokens();
      return { success: true };
    } catch (err) {
      console.error('Logout error:', err);
      // Still clear local state even if API call fails
      setUser(null);
      setSessionId(null);
      localStorage.removeItem('nv_session_id');
      localStorage.removeItem(USER_STORAGE_KEY);
      apiClient.clearTokens();
      return { success: true };
    }
  }, [sessionId]);

  // Logout from all devices
  const logoutAllDevices = useCallback(async () => {
    try {
      setError(null);
      await apiClient.logoutAllDevices();
      setUser(null);
      setSessionId(null);
      localStorage.removeItem('nv_session_id');
      return { success: true };
    } catch (err) {
      const errorMsg = err.message || 'Logout failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  }, []);

  // Revoke device session
  const revokeSession = useCallback(async (sessionIdToRevoke) => {
    try {
      await apiClient.revokeDeviceSession(sessionIdToRevoke);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  // Update user info
  const updateUser = useCallback((userData) => {
    setUser(prev => {
      const updated = { ...prev, ...userData };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    sessionId,
    activeSessions,
    login,
    register,
    logout,
    logoutAllDevices,
    updateUser,
    getActiveSessions,
    revokeSession,
    verifyTwoFactor,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

