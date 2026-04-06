import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  ArrowLeftRight, ArrowDownLeft, ArrowUpRight, History,
  TrendingUp, TrendingDown, BarChart2, Gift,
  CheckCircle, ArrowRight, Banknote, RefreshCw, ArrowUpFromLine,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import KYCBanner from '../components/KYCBanner';
import { useKYC } from '../context/KYCContext';
import { useWallet } from '../context/WalletContext';
import { currentUser, chartData, formatCurrency, formatDate } from '../data/mockData';
import './Dashboard.css';

const quickActions = [
  { icon: ArrowLeftRight, label: 'Transfer', path: '/transfer', color: '#007BFF' },
  { icon: ArrowDownLeft, label: 'Deposit', path: '/deposit', color: '#28A745' },
  { icon: ArrowUpFromLine, label: 'Withdraw', path: '/withdraw', color: '#6366f1' },
  { icon: History, label: 'History', path: '/transactions', color: '#f59e0b' },
];

function getTxIcon(category) {
  if (category === 'deposit') return <Banknote size={18} />;
  if (category === 'transfer') return <ArrowUpRight size={18} />;
  return <RefreshCw size={18} />;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { kycStatus } = useKYC();
  const { balance, transactions, hideBalance } = useWallet();
  const recentTx = transactions.slice(0, 5);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const greetEmoji = hour < 12 ? '☀️' : hour < 17 ? '👋' : '🌙';

  const totalIn = transactions.filter(t => t.type === 'credit').reduce((a, t) => a + t.amount, 0);
  const totalOut = transactions.filter(t => t.type === 'debit').reduce((a, t) => a + t.amount, 0);

  return (
    <DashboardLayout>
      <KYCBanner />
      <div className="page-header">
        <h1>Good morning, {currentUser.name.split(' ')[0]} </h1>
        <p>Here's what's happening with your wallet today.</p>
      </div>

      {/* Balance Hero */}
      <div className="balance-hero animate-fade">
        <div className="balance-card">
          <div className="balance-card-bg" />
          <div className="balance-card-content">
            <div className="balance-label">Total Wallet Balance</div>
            <div className="balance-value">{hideBalance ? '••••••' : formatCurrency(balance)}</div>
            <div className="balance-account">
              {kycStatus === 'verified' && (
                <span className="balance-account-badge"><CheckCircle size={12} /> Verified</span>
              )}
              <span className="balance-account-num">{currentUser.accountNumber}</span>
            </div>
          </div>
          <div className="balance-stats">
            <div className="balance-stat">
              <span className="balance-stat-icon up"><TrendingUp size={16} /></span>
              <div>
                <div className="balance-stat-label">Total Income</div>
                <div className="balance-stat-value">{formatCurrency(totalIn)}</div>
              </div>
            </div>
            <div className="balance-stat-divider" />
            <div className="balance-stat">
              <span className="balance-stat-icon down"><TrendingDown size={16} /></span>
              <div>
                <div className="balance-stat-label">Total Spent</div>
                <div className="balance-stat-value">{formatCurrency(totalOut)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <button key={a.path} className="quick-action-btn" onClick={() => navigate(a.path)}>
                <div className="quick-action-icon" style={{ background: `${a.color}18`, color: a.color }}>
                  <Icon size={20} />
                </div>
                <span className="quick-action-label">{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid animate-fade-delay-1">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
            <BarChart2 size={20} />
          </div>
          <div className="stat-label">Transactions (Mar)</div>
          <div className="stat-value">48</div>
          <div className="stat-change text-success">↑ 12% from last month</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
            <TrendingUp size={20} />
          </div>
          <div className="stat-label">Monthly Income</div>
          <div className="stat-value">$10,700</div>
          <div className="stat-change text-success">↑ 30% from Feb</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
            <TrendingDown size={20} />
          </div>
          <div className="stat-label">Monthly Expenses</div>
          <div className="stat-value">$4,800</div>
          <div className="stat-change text-danger">↑ 8% from Feb</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--warning-light)', color: '#856404' }}>
            <Gift size={20} />
          </div>
          <div className="stat-label">Cashback Earned</div>
          <div className="stat-value">$12.50</div>
          <div className="stat-change text-muted">This month</div>
        </div>
      </div>

      {/* Chart + Recent Tx */}
      <div className="dashboard-grid animate-fade-delay-2">
        {/* Chart */}
        <div className="card dashboard-chart-card">
          <div className="card-header">
            <div>
              <h3>Cash Flow</h3>
              <p className="text-muted" style={{ fontSize: 13, marginTop: 2 }}>Last 6 months overview</p>
            </div>
            <div className="chart-legend">
              <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--success)' }} />Income</span>
              <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--danger)' }} />Expenses</span>
            </div>
          </div>
          <div style={{ padding: '0 20px 20px' }}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#28A745" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#28A745" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#DC3545" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#DC3545" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6C757D' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#6C757D' }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 10, border: '1px solid var(--border-light)', fontSize: 13 }} />
                <Area type="monotone" dataKey="income" stroke="#28A745" strokeWidth={2.5} fill="url(#incomeGrad)" />
                <Area type="monotone" dataKey="expense" stroke="#DC3545" strokeWidth={2.5} fill="url(#expenseGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card dashboard-tx-card">
          <div className="card-header">
            <div>
              <h3>Recent Transactions</h3>
              <p className="text-muted" style={{ fontSize: 13, marginTop: 2 }}>Your latest activity</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/transactions')}>
              View all <ArrowRight size={14} />
            </button>
          </div>
          <div className="tx-list">
            {recentTx.map((tx) => (
              <div key={tx.id} className="tx-item" onClick={() => navigate(`/transactions/${tx.id}`)}>
                <div className={`tx-icon ${tx.type}`}>{getTxIcon(tx.category)}</div>
                <div className="tx-info">
                  <div className="tx-desc">{tx.description}</div>
                  <div className="tx-date">{formatDate(tx.date)}</div>
                </div>
                <div className="tx-right">
                  <div className={`tx-amount ${tx.type}`}>
                    {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </div>
                  <span className={`badge badge-${tx.status === 'completed' ? 'success' : tx.status === 'pending' ? 'warning' : 'danger'}`}>
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
