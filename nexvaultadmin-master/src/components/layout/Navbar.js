import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Menu, Sun, Moon, ShieldCheck, LayoutDashboard, Users, X, ArrowRight, Command, ArrowUpFromLine } from 'lucide-react';
import { adminApi } from '../../api/adminClient';

// Quick-search result categories shown in the dropdown
const QUICK_LINKS = [
  { icon: LayoutDashboard, label: 'Dashboard Overview',  category: 'Pages', tab: 'dashboard' },
  { icon: Users,           label: 'User Management',     category: 'Pages', tab: 'users'     },
  { icon: ShieldCheck,     label: 'KYC Verification',    category: 'Pages', tab: 'kyc'       },
  { icon: ArrowUpFromLine,  label: 'Withdrawal Management', category: 'Pages', tab: 'withdrawals' },
];

const SUGGESTIONS = [
  { label: 'Pending KYC reviews',   category: 'Actions', tab: 'kyc'       },
  { label: 'Manage user accounts',  category: 'Actions', tab: 'users'     },
  { label: 'Pending withdrawals',   category: 'Actions', tab: 'withdrawals' },
  { label: 'Export transaction CSV', category: 'Actions', tab: 'dashboard' },
];

export default function Navbar({ onMenuToggle, activeTab, user, setActiveTab }) {
  const [notificationsOpen, setNotificationsOpen]   = useState(false);
  const [darkTheme,          setDarkTheme]           = useState(false);
  const [searchFocused,      setSearchFocused]       = useState(false);
  const [searchQuery,        setSearchQuery]         = useState('');
  const [notifications,      setNotifications]       = useState([]);
  const [unreadCount,        setUnreadCount]         = useState(0);
  const [loadingNotif,       setLoadingNotif]        = useState(false);

  const inputRef    = useRef(null);
  const wrapperRef  = useRef(null);

  // Load notifications when dropdown opens
  useEffect(() => {
    if (notificationsOpen) {
      loadNotifications();
    }
  }, [notificationsOpen]);

  // Poll for unread count every 30 seconds
  useEffect(() => {
    const pollUnread = async () => {
      try {
        const res = await adminApi.getUnreadNotificationCount();
        if (res?.success) {
          setUnreadCount(res.unreadCount || 0);
        }
      } catch (err) {
        console.error('Failed to poll unread count:', err);
      }
    };

    const interval = setInterval(pollUnread, 30000);
    pollUnread(); // Initial load

    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    setLoadingNotif(true);
    try {
      const res = await adminApi.getAdminNotifications(20, 0);
      if (res?.success) {
        setNotifications(res.notifications || []);
        setUnreadCount((res.notifications || []).filter(n => !n.read).length);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoadingNotif(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await adminApi.markNotificationAsRead(notificationId);
      setNotifications(notifications.map(n => n.id === notificationId ? { ...n, read: true } : n));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
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

  // Press "/" anywhere to focus search
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setSearchFocused(false);
        setSearchQuery('');
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setSearchFocused(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleTheme = () => {
    setDarkTheme(p => !p);
    document.documentElement[!darkTheme ? 'setAttribute' : 'removeAttribute']('data-theme', 'dark');
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard';
      case 'kyc':       return 'KYC Verification';
      case 'users':     return 'User Management';
      default:          return 'Nexvault Admin';
    }
  };

  // Filter results by query
  const q = searchQuery.toLowerCase().trim();
  const filteredLinks = QUICK_LINKS.filter(i => !q || i.label.toLowerCase().includes(q));
  const filteredSugg  = SUGGESTIONS.filter(i => !q || i.label.toLowerCase().includes(q));
  const hasResults    = filteredLinks.length > 0 || filteredSugg.length > 0;

  const handleSelect = (tab) => {
    if (setActiveTab && tab) setActiveTab(tab);
    setSearchFocused(false);
    setSearchQuery('');
    inputRef.current?.blur();
  };

  const showDropdown = searchFocused;

  return (
    <>
      <header style={st.header}>

        {/* Mobile menu toggle */}
        <button onClick={onMenuToggle} className="navbar-menu-btn" aria-label="Toggle sidebar">
          <Menu size={20} />
        </button>

        {/* Breadcrumb */}
        <div style={st.breadcrumb}>
          <span style={st.breadRoot}>Console</span>
          <span style={st.slash}>/</span>
          <span style={st.breadActive}>{getPageTitle()}</span>
        </div>

        {/* ── Search bar ── */}
        <div ref={wrapperRef} className="navbar-search-outer">
          <div
            style={{
              ...st.searchBar,
              ...(searchFocused ? st.searchBarFocused : {}),
            }}
            onClick={() => inputRef.current?.focus()}
          >
            {/* Left icon */}
            <div style={{ ...st.searchIconLeft, color: searchFocused ? 'var(--primary)' : '#94a3b8' }}>
              <Search size={15} />
            </div>

            {/* Input */}
            <input
              ref={inputRef}
              style={st.searchInput}
              placeholder={searchFocused ? 'Search pages, actions…' : "Search  —  press '/' to focus"}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              aria-label="Global search"
              autoComplete="off"
            />

            {/* Right side: clear button when typing, shortcut hint when idle */}
            {searchQuery ? (
              <button
                style={st.clearBtn}
                onMouseDown={e => { e.preventDefault(); setSearchQuery(''); inputRef.current?.focus(); }}
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            ) : (
              <div style={{ ...st.kbdWrap, opacity: searchFocused ? 0 : 1 }}>
                <kbd style={st.kbd}>
                  <Command size={10} style={{ marginRight: '2px' }} />
                  /
                </kbd>
              </div>
            )}
          </div>

          {/* ── Dropdown ── */}
          {showDropdown && (
            <div style={st.dropdown} role="listbox">

              {hasResults ? (
                <>
                  {/* Pages */}
                  {filteredLinks.length > 0 && (
                    <div style={st.group}>
                      <div style={st.groupLabel}>Pages</div>
                      {filteredLinks.map((item, i) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={i}
                            style={st.resultRow}
                            onMouseDown={() => handleSelect(item.tab)}
                            role="option"
                          >
                            <div style={st.resultIconBox}>
                              <Icon size={14} style={{ color: '#0056B3' }} />
                            </div>
                            <span style={st.resultLabel}>{item.label}</span>
                            <ArrowRight size={12} style={st.resultArrow} />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Actions */}
                  {filteredSugg.length > 0 && (
                    <div style={st.group}>
                      <div style={st.groupLabel}>Quick Actions</div>
                      {filteredSugg.map((item, i) => (
                        <button
                          key={i}
                          style={st.resultRow}
                          onMouseDown={() => handleSelect(item.tab)}
                          role="option"
                        >
                          <div style={{ ...st.resultIconBox, background: '#f8f9fa' }}>
                            <Search size={13} style={{ color: '#94a3b8' }} />
                          </div>
                          <span style={st.resultLabel}>{item.label}</span>
                          <ArrowRight size={12} style={st.resultArrow} />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div style={st.emptyState}>
                  <Search size={22} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
                  <span style={st.emptyText}>No results for "<strong>{searchQuery}</strong>"</span>
                </div>
              )}

              {/* Footer hint */}
              <div style={st.dropdownFooter}>
                <span style={st.footerHint}><kbd style={st.miniKbd}>↵</kbd> to select</span>
                <span style={st.footerHint}><kbd style={st.miniKbd}>esc</kbd> to close</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Right actions ── */}
        <div style={st.actions}>
          {/* Live status */}
          <div className="navbar-live-badge" style={st.liveBadge}>
            <span style={st.liveDot} />
            <span style={st.liveText}>Live</span>
          </div>

          {/* Theme toggle */}
          <button onClick={toggleTheme} style={st.iconBtn} title={darkTheme ? 'Light mode' : 'Dark mode'}>
            {darkTheme ? <Sun size={17} style={{ color: '#f59e0b' }} /> : <Moon size={17} />}
          </button>

          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setNotificationsOpen(p => !p)}
              style={st.iconBtn}
              title="Notifications"
            >
              <Bell size={17} />
              {unreadCount > 0 && <span style={st.notifBadge}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>

            {notificationsOpen && (
              <div className="card" style={st.notifDropdown}>
                <div style={st.notifHeader}>
                  <span style={st.notifTitle}>Notifications ({unreadCount} unread)</span>
                  {unreadCount > 0 && (
                    <button style={st.markRead} onClick={handleMarkAllAsRead}>
                      Mark all read
                    </button>
                  )}
                </div>
                
                {loadingNotif ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>
                    Loading...
                  </div>
                ) : notifications.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8' }}>
                    No notifications yet
                  </div>
                ) : (
                  notifications.map((n, i) => {
                    const bgColor = n.read ? 'transparent' : '#f0f7ff';
                    const typeColors = {
                      'deposit_received': '#10b981',
                      'withdrawal_processed': '#3b82f6',
                      'user_action': '#f59e0b',
                      'admin_action': '#8b5cf6',
                      'system': '#6b7280',
                      'warning': '#ef4444',
                    };
                    const color = typeColors[n.type] || '#0056B3';
                    
                    return (
                      <div 
                        key={n.id} 
                        style={{ ...st.notifRow, background: bgColor }}
                        onClick={() => !n.read && handleMarkAsRead(n.id)}
                        role="button"
                        tabIndex="0"
                      >
                        <span style={{ ...st.notifDot, background: color }} />
                        <div style={{ flex: 1 }}>
                          <div style={st.notifMsg}>{n.title}</div>
                          <div style={st.notifSub}>{n.message}</div>
                          <div style={st.notifTime}>
                            {new Date(n.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Avatar */}
          <div style={st.avatarWrap}>
            <div className="avatar" style={st.avatar}>
              {user?.name ? user.name.split(' ').map(n => n[0]).join('') : 'A'}
            </div>
          </div>
        </div>
      </header>

      {/* Full-screen overlay when search is focused */}
      {showDropdown && (
        <div style={st.overlay} onClick={() => { setSearchFocused(false); setSearchQuery(''); }} />
      )}
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const st = {
  header: {
    height: '64px',
    background: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderBottom: '1px solid var(--border-light)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 24px',
    gap: '16px',
    position: 'sticky',
    top: 0,
    zIndex: 200,
    fontFamily: "'Inter', sans-serif",
  },
  menuToggle: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-dark)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '8px',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  breadRoot:   { color: '#94a3b8' },
  slash:       { color: '#dee2e6' },
  breadActive: { color: 'var(--text-dark)', fontWeight: 700 },

  // ── Search ──
  searchOuter: {
    flex: 1,
    maxWidth: '440px',
    position: 'relative',
    zIndex: 300,
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    height: '38px',
    background: '#f8f9fa',
    border: '1.5px solid #e9ecef',
    borderRadius: '10px',
    padding: '0 10px 0 12px',
    cursor: 'text',
    transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
  },
  searchBarFocused: {
    background: '#ffffff',
    border: '1.5px solid var(--primary)',
    boxShadow: '0 0 0 3px rgba(0,86,179,0.1)',
    borderRadius: '10px 10px 0 0',
    borderBottomColor: 'transparent',
  },
  searchIconLeft: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    transition: 'color 0.2s',
  },
  searchInput: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    outline: 'none',
    fontFamily: "'Inter', sans-serif",
    fontSize: '13px',
    color: 'var(--text-dark)',
    minWidth: 0,
  },
  clearBtn: {
    background: '#e9ecef',
    border: 'none',
    borderRadius: '6px',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#64748b',
    flexShrink: 0,
    transition: 'background 0.15s',
  },
  kbdWrap: {
    display: 'flex',
    alignItems: 'center',
    transition: 'opacity 0.15s',
    flexShrink: 0,
  },
  kbd: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 6px',
    background: '#ffffff',
    border: '1px solid #dee2e6',
    borderRadius: '5px',
    fontSize: '10px',
    fontFamily: "'Inter', sans-serif",
    color: '#94a3b8',
    fontWeight: 600,
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
    userSelect: 'none',
    gap: '1px',
  },

  // ── Dropdown ──
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: '#ffffff',
    border: '1.5px solid var(--primary)',
    borderTop: 'none',
    borderRadius: '0 0 12px 12px',
    boxShadow: '0 16px 40px rgba(0,0,0,0.12)',
    overflow: 'hidden',
    zIndex: 400,
  },
  group: {
    padding: '8px 0 4px',
  },
  groupLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    padding: '4px 14px 6px',
  },
  resultRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '8px 14px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.12s',
    fontFamily: "'Inter', sans-serif",
  },
  resultIconBox: {
    width: '28px',
    height: '28px',
    borderRadius: '7px',
    background: '#e8f0fb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  resultLabel: {
    flex: 1,
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-dark)',
  },
  resultArrow: {
    color: '#cbd5e1',
    flexShrink: 0,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '28px 20px',
    color: '#94a3b8',
  },
  emptyText: {
    fontSize: '13px',
    color: '#94a3b8',
  },
  dropdownFooter: {
    display: 'flex',
    gap: '14px',
    padding: '8px 14px',
    borderTop: '1px solid #f1f5f9',
    background: '#fafafa',
  },
  footerHint: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '11px',
    color: '#94a3b8',
    fontWeight: 500,
  },
  miniKbd: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1px 5px',
    background: '#ffffff',
    border: '1px solid #dee2e6',
    borderRadius: '4px',
    fontSize: '10px',
    color: '#64748b',
    fontWeight: 600,
    boxShadow: '0 1px 1px rgba(0,0,0,0.06)',
  },

  // ── Overlay ──
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 199,
    background: 'rgba(15,23,42,0.2)',
    backdropFilter: 'blur(2px)',
  },

  // ── Right actions ──
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginLeft: 'auto',
    flexShrink: 0,
  },
  liveBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    background: '#d1fae5',
    border: '1px solid rgba(16,185,129,0.2)',
    borderRadius: '999px',
  },
  liveDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#10b981',
    boxShadow: '0 0 0 2px rgba(16,185,129,0.3)',
    animation: 'livePulse 2s ease infinite',
    display: 'inline-block',
  },
  liveText: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#047857',
  },
  iconBtn: {
    width: '36px',
    height: '36px',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: '9px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#64748b',
    position: 'relative',
    transition: 'all 0.15s',
  },
  notifBadge: {
    position: 'absolute',
    top: '5px',
    right: '5px',
    background: '#ef4444',
    color: '#fff',
    fontSize: '8px',
    fontWeight: 800,
    width: '13px',
    height: '13px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1.5px solid #fff',
    lineHeight: 1,
  },
  notifDropdown: {
    position: 'absolute',
    top: '44px',
    right: 0,
    width: '310px',
    zIndex: 1000,
    borderRadius: '14px',
    overflow: 'hidden',
    boxShadow: '0 16px 40px rgba(0,0,0,0.12)',
  },
  notifHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: '1px solid var(--border-light)',
  },
  notifTitle: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--text-dark)',
  },
  markRead: {
    background: 'none',
    border: 'none',
    color: 'var(--primary)',
    fontSize: '11.5px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  notifRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 16px',
    borderBottom: '1px solid var(--border-light)',
    cursor: 'pointer',
    transition: 'background 0.12s',
  },
  notifDot: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    marginTop: '5px',
    flexShrink: 0,
  },
  notifMsg: {
    fontSize: '12.5px',
    fontWeight: 500,
    color: 'var(--text-dark)',
    lineHeight: 1.4,
    marginBottom: '3px',
  },
  notifSub: {
    fontSize: '11px',
    color: 'var(--text-light)',
    lineHeight: 1.3,
    marginBottom: '4px',
  },
  notifTime: {
    fontSize: '10.5px',
    color: 'var(--text-light)',
  },
  avatarWrap: {
    borderLeft: '1px solid var(--border-light)',
    paddingLeft: '12px',
    marginLeft: '2px',
  },
  avatar: {
    width: '34px',
    height: '34px',
    fontSize: '12px',
    cursor: 'pointer',
  },
};

// Inject keyframe for live dot animation
if (typeof document !== 'undefined') {
  const id = 'navbar-keyframes';
  if (!document.getElementById(id)) {
    const s = document.createElement('style');
    s.id = id;
    s.innerHTML = `
      @keyframes livePulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.4); }
        50%       { box-shadow: 0 0 0 4px rgba(16,185,129,0); }
      }
      .search-result-row:hover { background: #f8faff !important; }
      .notif-row:hover          { background: var(--border-light) !important; }
    `;
    document.head.appendChild(s);
  }
}
