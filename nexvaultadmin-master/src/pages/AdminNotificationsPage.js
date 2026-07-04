import React, { useEffect, useState } from 'react';
import { adminApi } from '../api/adminClient';
import { formatCurrency } from '../utils/formatters';
import { Bell, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
    // Poll every 15 seconds for new notifications
    const interval = setInterval(loadNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getAdminNotifications(100, 0);
      if (res?.success) {
        setNotifications(res.notifications || []);
        const unread = (res.notifications || []).filter(n => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await adminApi.markNotificationAsRead(notificationId);
      setNotifications(notifications.map(n => n.id === notificationId ? { ...n, read: true } : n));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await adminApi.markAllNotificationsAsRead();
      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'deposit_received': return <CheckCircle2 size={18} />;
      case 'withdrawal_processed': return <CheckCircle2 size={18} />;
      case 'warning': return <AlertTriangle size={18} />;
      case 'error': return <AlertCircle size={18} />;
      default: return <Info size={18} />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'deposit_received': return '#10b981';
      case 'withdrawal_processed': return '#3b82f6';
      case 'user_action': return '#f59e0b';
      case 'admin_action': return '#8b5cf6';
      case 'warning': return '#ef4444';
      case 'error': return '#dc2626';
      default: return '#0056B3';
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div>
            <h1 style={styles.title}>🔔 Notifications Center</h1>
            <p style={styles.subtitle}>All system and user activity notifications</p>
          </div>
          <div style={styles.headerStats}>
            <div style={styles.stat}>
              <div style={styles.statValue}>{unreadCount}</div>
              <div style={styles.statLabel}>Unread</div>
            </div>
            <div style={styles.stat}>
              <div style={styles.statValue}>{notifications.length}</div>
              <div style={styles.statLabel}>Total</div>
            </div>
          </div>
        </div>

        {/* Filter & Actions */}
        <div style={styles.controls}>
          <div style={styles.filterGroup}>
            {['all', 'unread', 'read'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  ...styles.filterBtn,
                  background: filter === f ? '#0056B3' : 'transparent',
                  color: filter === f ? 'white' : '#64748b',
                  borderColor: filter === f ? '#0056B3' : '#cbd5e1',
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)} ({f === 'all' ? notifications.length : f === 'unread' ? unreadCount : notifications.filter(n => n.read).length})
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllAsRead} style={styles.markAllBtn}>
              Mark all as read
            </button>
          )}
          <button onClick={loadNotifications} style={styles.refreshBtn}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div style={styles.listContainer}>
        {loading ? (
          <div style={styles.emptyState}>
            <div style={styles.spinner} />
            <p>Loading notifications...</p>
          </div>
        ) : error ? (
          <div style={styles.errorState}>
            <AlertCircle size={24} />
            <p>{error}</p>
            <button onClick={loadNotifications} style={styles.retryBtn}>
              Retry
            </button>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div style={styles.emptyState}>
            <Bell size={32} style={{ color: '#cbd5e1', marginBottom: '12px' }} />
            <p>No {filter !== 'all' ? filter : ''} notifications</p>
          </div>
        ) : (
          <div style={styles.notificationsList}>
            {filteredNotifications.map(notif => {
              const color = getTypeColor(notif.type);
              const bgColor = notif.read ? 'transparent' : '#eff6ff';
              const data = typeof notif.data === 'string' ? JSON.parse(notif.data) : notif.data;

              return (
                <div
                  key={notif.id}
                  style={{
                    ...styles.notificationItem,
                    background: bgColor,
                    borderLeft: `4px solid ${color}`,
                    opacity: notif.read ? 0.7 : 1,
                  }}
                  onClick={() => !notif.read && handleMarkAsRead(notif.id)}
                  role="button"
                >
                  {/* Icon */}
                  <div style={{ ...styles.iconBox, color }}>
                    {getTypeIcon(notif.type)}
                  </div>

                  {/* Content */}
                  <div style={styles.content}>
                    <div style={styles.titleRow}>
                      <div style={styles.notifTitle}>{notif.title}</div>
                      <div style={styles.badge}>
                        {notif.priority === 'high' && (
                          <span style={styles.priorityBadge}>High Priority</span>
                        )}
                        {notif.type}
                      </div>
                    </div>
                    
                    <div style={styles.notifMessage}>{notif.message}</div>

                    {/* Data details */}
                    {data && (
                      <div style={styles.dataBox}>
                        {data.userId && <div>👤 User ID: <strong>{data.userId}</strong></div>}
                        {data.amount && <div>💰 Amount: <strong>{formatCurrency(data.amount)}</strong></div>}
                        {data.reference && <div>📌 Reference: <strong>{data.reference}</strong></div>}
                        {data.transactionId && <div>🔗 Transaction: <strong>{data.transactionId}</strong></div>}
                      </div>
                    )}

                    {/* Timestamp */}
                    <div style={styles.timestamp}>
                      {new Date(notif.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                      {!notif.read && <span style={styles.unreadIndicator}>● Unread</span>}
                    </div>
                  </div>

                  {/* Read indicator */}
                  {!notif.read && (
                    <div style={styles.unreadDot} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '24px',
    background: '#f8fafc',
    borderRadius: '12px',
    minHeight: '100vh',
  },
  header: {
    marginBottom: '24px',
  },
  headerTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#0f172a',
    margin: 0,
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  headerStats: {
    display: 'flex',
    gap: '24px',
  },
  stat: {
    textAlign: 'center',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#0056B3',
  },
  statLabel: {
    fontSize: '12px',
    color: '#64748b',
    marginTop: '4px',
  },
  controls: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  filterGroup: {
    display: 'flex',
    gap: '8px',
  },
  filterBtn: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  markAllBtn: {
    padding: '8px 16px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  refreshBtn: {
    padding: '8px 16px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  listContainer: {
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  notificationsList: {
    display: 'flex',
    flexDirection: 'column',
  },
  notificationItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '16px',
    borderBottom: '1px solid #e2e8f0',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  iconBox: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    background: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  notifTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#0f172a',
  },
  badge: {
    fontSize: '11px',
    fontWeight: '500',
    background: '#f1f5f9',
    color: '#64748b',
    padding: '4px 8px',
    borderRadius: '4px',
    textTransform: 'capitalize',
  },
  priorityBadge: {
    background: '#fecaca',
    color: '#dc2626',
    marginRight: '6px',
    padding: '2px 6px',
    borderRadius: '3px',
  },
  notifMessage: {
    fontSize: '13px',
    color: '#475569',
    lineHeight: '1.5',
    marginBottom: '8px',
  },
  dataBox: {
    fontSize: '12px',
    color: '#64748b',
    background: '#f8fafc',
    padding: '8px 12px',
    borderRadius: '6px',
    marginBottom: '8px',
    lineHeight: '1.6',
    fontFamily: 'monospace',
  },
  timestamp: {
    fontSize: '11px',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  unreadIndicator: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  unreadDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#3b82f6',
    flexShrink: 0,
    marginLeft: '8px',
  },
  emptyState: {
    padding: '48px 24px',
    textAlign: 'center',
    color: '#94a3b8',
  },
  errorState: {
    padding: '48px 24px',
    textAlign: 'center',
    color: '#dc2626',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  retryBtn: {
    marginTop: '12px',
    padding: '8px 16px',
    background: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #0056B3',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto 12px',
  },
};
