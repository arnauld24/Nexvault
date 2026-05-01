import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, Download, ArrowUpFromLine, List,
  Bell, User, Settings, HelpCircle, LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
<<<<<<< HEAD
import { useNotifications } from '../../context/NotificationContext';
import './Sidebar.css';

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { unreadCount } = useNotifications();
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: ArrowLeftRight, label: 'Transfer', path: '/transfer' },
    { icon: Download, label: 'Deposit', path: '/deposit' },
    { icon: ArrowUpFromLine, label: 'Withdraw', path: '/withdraw' },
    { icon: List, label: 'Transactions', path: '/transactions' },
    { icon: Bell, label: 'Notifications', path: '/notifications', badge: unreadCount },
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Settings, label: 'Settings', path: '/settings' },
    { icon: HelpCircle, label: 'Help & Support', path: '/help' },
  ];

=======
import { currentUser } from '../../data/mockData';
import './Sidebar.css';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: ArrowLeftRight, label: 'Transfer', path: '/transfer' },
  { icon: Download, label: 'Deposit', path: '/deposit' },
  { icon: ArrowUpFromLine, label: 'Withdraw', path: '/withdraw' },
  { icon: List, label: 'Transactions', path: '/transactions' },
  { icon: Bell, label: 'Notifications', path: '/notifications', badge: currentUser.notifications },
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: HelpCircle, label: 'Help & Support', path: '/help' },
];

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

>>>>>>> ec2b1053c5f7048b5abbc6c93b3702001479646e
  const handleLogout = () => {
    setLoggingOut(true);
    setTimeout(() => { logout(); navigate('/'); }, 800);
  };

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark"><span>N</span></div>
          <span className="sidebar-logo-text">NexVault</span>
        </div>

        <div className="sidebar-user">
<<<<<<< HEAD
          <div className="sidebar-user-avatar">{user?.initials || user?.firstName?.[0] || 'U'}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">
              {user
                ? `${user.firstName || 'User'}${user.lastName ? ` ${user.lastName}` : ''}`.trim()
                : 'User'}
            </div>
=======
          <div className="sidebar-user-avatar">{currentUser.initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{currentUser.name}</div>
>>>>>>> ec2b1053c5f7048b5abbc6c93b3702001479646e
          </div>
        </div>

        <div className="sidebar-divider" />

        <nav className="sidebar-nav">
          <div className="sidebar-nav-label">Main Menu</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.path} to={item.path}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={onClose}>
                <Icon size={18} className="sidebar-link-icon" />
                <span className="sidebar-link-label">{item.label}</span>
                {item.badge ? <span className="sidebar-badge">{item.badge}</span> : null}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          {confirmLogout ? (
            <div className="sidebar-logout-confirm">
              <span>Log out?</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-danger btn-sm" onClick={handleLogout} disabled={loggingOut}>
                  {loggingOut ? 'Logging out...' : 'Yes'}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setConfirmLogout(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="sidebar-logout" onClick={() => setConfirmLogout(true)}>
              <LogOut size={16} />
              <span>Log Out</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
