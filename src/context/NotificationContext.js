import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from './AuthContext';
import { useWallet } from './WalletContext';
import { formatCurrency } from '../utils/formatters';

const NotificationContext = createContext(null);

function createTransactionNotification(tx) {
  const amountText = formatCurrency(tx.amount, tx.currency || 'XAF');
  const createdAt = tx.date || new Date().toISOString();
  const transactionKey = tx.reference || tx.id;
  const base = {
    id: `tx-${transactionKey}`,
    type: 'info',
    read: true,
    createdAt,
    category: 'transaction',
    link: `/transactions/${tx.id}`,
  };

  if (tx.category === 'deposit') {
    return {
      ...base,
      title: 'Deposit Completed',
      message: `You received ${amountText} into your wallet.`,
    };
  }

  if (tx.category === 'transfer' && tx.type === 'debit') {
    return {
      ...base,
      title: 'Transfer Sent',
      message: `You sent ${amountText} to ${tx.to || 'a recipient'}.`,
    };
  }

  if (tx.category === 'transfer' && tx.type === 'credit') {
    return {
      ...base,
      title: 'Transfer Received',
      message: `You received ${amountText} from ${tx.from || 'a sender'}.`,
    };
  }

  if (tx.category === 'withdrawal') {
    return {
      ...base,
      title: 'Withdrawal Initiated',
      message: `A withdrawal of ${amountText} is being processed.`,
    };
  }

  return {
    ...base,
    title: 'Transaction Updated',
    message: `A ${tx.category || 'transaction'} of ${amountText} was posted.`,
  };
}

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const { transactions } = useWallet();
  const [apiNotifications, setApiNotifications] = useState([]);
  const [deletedTransactionNotificationIds, setDeletedTransactionNotificationIds] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const transactionNotificationRefs = useMemo(() => {
    return new Set(
      apiNotifications
        .filter(n => n.data?.transactionRef || n.data?.transactionId)
        .map(n => String(n.data.transactionRef || n.data.transactionId))
    );
  }, [apiNotifications]);

  const transactionNotifications = useMemo(() => {
    return transactions
      .filter(tx => tx && tx.id)
      .map(createTransactionNotification)
      .filter(tx => !deletedTransactionNotificationIds.includes(tx.id))
      .filter(tx => !transactionNotificationRefs.has(String(tx.id)))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [transactions, deletedTransactionNotificationIds, transactionNotificationRefs]);

  const notifications = useMemo(() => {
    return [...transactionNotifications, ...apiNotifications].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [apiNotifications, transactionNotifications]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadNotifications();
    loadUnreadCount();
  }, [isAuthenticated]);

  const loadNotifications = async (limit = 50, offset = 0) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.getNotifications(limit, offset);
      if (response.success) {
        const notifications = response.notifications || [];
        setApiNotifications(notifications);
        // Cache the notifications for offline access
        localStorage.setItem('nv_notifications_cache', JSON.stringify(notifications));
        localStorage.setItem('nv_notifications_cache_time', new Date().toISOString());
      } else {
        throw new Error(response.message || 'Failed to load notifications');
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
      const errorMsg = err.message || 'Failed to load notifications';
      setError(errorMsg);
      
      const cached = localStorage.getItem('nv_notifications_cache');
      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          setApiNotifications(cachedData);
          const cacheTime = localStorage.getItem('nv_notifications_cache_time');
          console.log(`Loaded notifications from cache (cached at ${cacheTime})`);
        } catch (e) {
          setApiNotifications([]);
        }
      } else {
        setApiNotifications([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const response = await apiClient.getUnreadNotificationCount();
      if (response.success) {
        setUnreadCount(response.count || 0);
      }
    } catch (err) {
      console.error('Failed to load unread count:', err);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const response = await apiClient.markNotificationAsRead(notificationId);
      if (response.success) {
        setApiNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await apiClient.markAllNotificationsAsRead();
      if (response.success) {
        setApiNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const isSynthetic = String(notificationId).startsWith('tx-');

      if (isSynthetic) {
        setDeletedTransactionNotificationIds(prev => [...prev, notificationId]);
        return;
      }

      const response = await apiClient.deleteNotification(notificationId);
      if (response.success) {
        const deleted = response.notification;
        if (deleted?.data?.transactionRef || deleted?.data?.transactionId) {
          const key = deleted.data.transactionRef || deleted.data.transactionId;
          setDeletedTransactionNotificationIds(prev => [...prev, `tx-${String(key)}`]);
        }
        setApiNotifications(prev => prev.filter(n => n.id !== notificationId));
        loadUnreadCount();
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const refreshNotifications = useCallback(async () => {
    await Promise.all([loadNotifications(), loadUnreadCount()]);
  }, []);

  const addNotification = useCallback((notification) => {
    setApiNotifications(prev => [notification, ...prev]);
    if (!notification.read) {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      error,
      loadNotifications,
      loadUnreadCount,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      refreshNotifications,
      addNotification,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}