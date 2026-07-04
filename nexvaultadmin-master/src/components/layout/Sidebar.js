import React from 'react';
import { ShieldCheck, LayoutDashboard, LogOut, HardDrive, Users, Receipt, Bell, TrendingUp } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, user, onLogout }) {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard',        icon: LayoutDashboard },
    { id: 'users',     name: 'User Management',  icon: Users           },
    { id: 'kyc',       name: 'KYC Verification', icon: ShieldCheck     },
    { id: 'transactions', name: 'Transactions',   icon: Receipt         },
    { id: 'notifications', name: 'Notifications', icon: Bell            },
    { id: 'profit',    name: 'Profit & Revenue', icon: TrendingUp      },
  ];

  return (
    <aside style={styles.sidebar}>
      <div style={styles.header}>
        <div style={styles.logoWrapper}>
          <ShieldCheck size={22} style={styles.logoIcon} />
        </div>
        <div style={styles.brandDetails}>
          <span style={styles.brandTitle}>NEXVAULT</span>
          <span style={styles.brandSub}>ADMIN PANEL</span>
        </div>
      </div>

      <nav style={styles.nav}>
        <div style={styles.sectionLabel}>Navigation</div>
        <ul style={styles.list}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <li key={item.id} style={styles.listItem}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  style={{ ...styles.navBtn, ...(isActive ? styles.navBtnActive : {}) }}
                >
                  {isActive && <div style={styles.activeCapsule} />}
                  <Icon size={18} style={isActive ? styles.iconActive : styles.icon} />
                  <span>{item.name}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div style={{ ...styles.sectionLabel, marginTop: '32px' }}>System Health</div>
        <div style={styles.statusBox}>
          <div style={styles.statusRow}>
            <div style={styles.statusDotWrapper}>
              <span style={styles.statusDot} />
              <span style={styles.statusDotPulse} />
            </div>
            <span style={styles.statusLabel}>All Systems Operational</span>
          </div>
          <div style={styles.metricsBox}>
            <div style={styles.metricItem}>
              <HardDrive size={11} style={styles.metricIcon} />
              <span>DB Sync 100%</span>
            </div>
            <div style={styles.metricItem}>
              <span style={styles.metricDot} />
              <span>Uptime 99.9%</span>
            </div>
          </div>
        </div>
      </nav>

      <div style={styles.footer}>
        <div style={styles.userSection}>
          <div className="avatar" style={styles.userAvatar}>
            {user?.name ? user.name.split(' ').map(n => n[0]).join('') : 'A'}
          </div>
          <div style={styles.userDetails}>
            <div style={styles.userName}>{user?.name || 'Administrator'}</div>
            <div style={styles.userRole}>{user?.role || 'Super Admin'}</div>
          </div>
        </div>
        <button onClick={onLogout} style={styles.logoutBtn} title="Sign Out">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: '260px',
    height: '100vh',
    background: '#0f172a',
    borderRight: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    flexDirection: 'column',
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 100,
    fontFamily: "'Inter', sans-serif",
  },
  header: {
    height: '70px',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  },
  logoWrapper: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    background: 'rgba(79,70,229,0.15)',
    border: '1px solid rgba(79,70,229,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: { color: '#818cf8' },
  brandDetails: { display: 'flex', flexDirection: 'column' },
  brandTitle: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: '15px',
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '0.08em',
    lineHeight: '1.2',
  },
  brandSub: {
    fontSize: '9px',
    fontWeight: 700,
    color: '#64748b',
    letterSpacing: '0.12em',
  },
  nav: { flex: 1, padding: '24px 16px', overflowY: 'auto' },
  sectionLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    paddingLeft: '12px',
    marginBottom: '10px',
  },
  list: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' },
  listItem: { width: '100%' },
  navBtn: {
    width: '100%',
    padding: '11px 12px 11px 16px',
    borderRadius: '8px',
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontFamily: "'Inter', sans-serif",
    fontSize: '13.5px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s ease',
    position: 'relative',
  },
  navBtnActive: { background: 'rgba(255,255,255,0.06)', color: '#ffffff' },
  activeCapsule: {
    position: 'absolute',
    left: 0,
    top: '25%',
    height: '50%',
    width: '3.5px',
    background: '#4f46e5',
    borderRadius: '0 4px 4px 0',
    boxShadow: '0 0 8px rgba(79,70,229,0.8)',
  },
  icon: { color: '#475569', transition: 'color 0.2s ease' },
  iconActive: { color: '#818cf8' },
  statusBox: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: '10px',
    padding: '14px 16px',
  },
  statusRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' },
  statusDotWrapper: { position: 'relative', width: '8px', height: '8px', flexShrink: 0 },
  statusDot: { position: 'absolute', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' },
  statusDotPulse: {
    position: 'absolute',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite',
  },
  statusLabel: { fontSize: '12px', color: '#e2e8f0', fontWeight: 500 },
  metricsBox: { display: 'flex', flexDirection: 'column', gap: '6px' },
  metricItem: { fontSize: '11px', color: '#64748b', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' },
  metricIcon: { color: '#475569' },
  metricDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#475569', flexShrink: 0 },
  footer: {
    padding: '16px 20px',
    borderTop: '1px solid rgba(255,255,255,0.04)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#090d16',
  },
  userSection: { display: 'flex', alignItems: 'center', gap: '10px' },
  userAvatar: {
    width: '32px',
    height: '32px',
    fontSize: '11px',
    background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
    boxShadow: 'none',
    flexShrink: 0,
  },
  userDetails: { display: 'flex', flexDirection: 'column', maxWidth: '120px' },
  userName: { fontSize: '12.5px', fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  userRole: { fontSize: '10px', color: '#64748b', fontWeight: 500 },
  logoutBtn: {
    background: 'transparent',
    border: 'none',
    color: '#475569',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
};

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `@keyframes ping { 75%, 100% { transform: scale(2.2); opacity: 0; } }`;
  document.head.appendChild(style);
}
