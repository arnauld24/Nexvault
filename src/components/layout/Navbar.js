import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Bell, ChevronRight, Home } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { formatCurrency } from '../../utils/formatters';
import './Navbar.css';

const pageLabels = {
  '/dashboard': 'Dashboard',
  '/transfer': 'Transfer',
  '/deposit': 'Deposit',
  '/withdraw': 'Withdraw',
  '/transactions': 'Transaction History',
  '/notifications': 'Notifications',
  '/profile': 'My Profile',
  '/settings': 'Settings',
  '/help': 'Help & Support',
  '/admin': 'Admin Dashboard',
};

export default function Navbar({ onMenuToggle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { balance, hideBalance } = useWallet();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const pathParts = location.pathname.split('/').filter(Boolean);

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="navbar-menu-btn" onClick={onMenuToggle} aria-label="Toggle menu">
          <Menu size={20} />
        </button>
        <div className="navbar-breadcrumb">
          <span className="navbar-breadcrumb-home" onClick={() => navigate('/dashboard')} role="button" tabIndex={0}>
            <Home size={14} />
          </span>
          {pathParts.map((part, i) => (
            <React.Fragment key={i}>
              <ChevronRight size={14} className="navbar-breadcrumb-sep" />
              <span className="navbar-breadcrumb-current">{pageLabels['/' + part] || part}</span>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="navbar-right">
        {/* Balance pill */}
        <div className="navbar-balance">
          <span className="navbar-balance-label">Balance</span>
          <span className="navbar-balance-value">{hideBalance ? '••••••' : formatCurrency(balance)}</span>
        </div>

        {/* Notifications */}
        <button className="navbar-icon-btn" onClick={() => navigate('/notifications')} aria-label="Notifications">
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="navbar-notif-dot">{unreadCount}</span>
          )}
        </button>

        {/* Avatar */}
        <button className="navbar-avatar" onClick={() => navigate('/profile')}>
          <span>{user?.firstName?.charAt(0).toUpperCase() || 'N'}</span>
          <span className="navbar-avatar-name hide-mobile">{user?.firstName?.split(' ')[0] || 'Me'}</span>
        </button>
      </div>
    </header>
  );
}
