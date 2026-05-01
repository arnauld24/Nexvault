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
import { useAuth } from '../context/AuthContext';
import { useKYC } from '../context/KYCContext';
import { useWallet } from '../context/WalletContext';
import { formatCurrency, formatDate } from '../utils/formatters';
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
  const { balance, transactions, hideBalance, error: walletError, loading: walletLoading } = useWallet();
  const { user } = useAuth();
  const recentTx = transactions.slice(0, 5);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonthName = monthNames[currentMonth];

  const currentMonthTx = transactions.filter(tx => {
    const txDate = new Date(tx.date);
    return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
  });

  const currentMonthCount = currentMonthTx.length;
  const currentMonthIncome = currentMonthTx
    .filter(tx => tx.type === 'credit')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const currentMonthExpenses = currentMonthTx
    .filter(tx => tx.type === 'debit')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const cashbackEarned = currentMonthTx
    .filter(tx => tx.category === 'cashback')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const greetEmoji = hour < 12 ? '☀️' : hour < 17 ? '👋' : '🌙';

  const totalIn = transactions.filter(t => t.type === 'credit').reduce((a, t) => a + t.amount, 0);
  const totalOut = transactions.filter(t => t.type === 'debit').reduce((a, t) => a + t.amount, 0);

  const displayName = user?.firstName || user?.email?.split('@')[0] || 'User';

  // Generate chart data from transactions
  const chartData = React.useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const last6Months = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      last6Months.push(months[monthIndex]);
    }

    return last6Months.map(month => {
      const monthTransactions = transactions.filter(tx => {
        const txDate = new Date(tx.date);
        const txMonth = txDate.getMonth();
        return months[txMonth] === month;
      });

      const income = monthTransactions
        .filter(tx => tx.type === 'credit')
        .reduce((sum, tx) => sum + tx.amount, 0);

      const expense = monthTransactions
        .filter(tx => tx.type === 'debit')
        .reduce((sum, tx) => sum + tx.amount, 0);

      return { month, income, expense };
    });
  }, [transactions]);

  return (
    <DashboardLayout>
      <KYCBanner />
      {walletError && (
        <div className="alert alert-danger">
          <div className="alert-icon">⚠️</div>
          <div>
            <div className="alert-title">Connection Error</div>
            <div className="alert-message">Unable to load wallet data. Please check your connection and try again.</div>
          </div>
        </div>
      )}
      <div className="page-header">
        <h1>Good morning, {displayName}</h1>
        <p>Here's what's happening with your wallet today.</p>
      </div>

      {/* Balance Hero */}
      <div className="balance-hero animate-fade">
        <div className="balance-card">
          <div className="balance-card-bg" />
          <div className="balance-card-content">
            <div className="balance-label">Total Wallet Balance</div>
            <div className="balance-value">
              {walletLoading ? (
                <span className="balance-loading-shimmer">···</span>
              ) : hideBalance ? (
                '••••••'
              ) : (
                formatCurrency(balance)
              )}
            </div>
            <div className="balance-account">
              {kycStatus === 'verified' && (
                <span className="balance-account-badge"><CheckCircle size={12} /> Verified</span>
              )}
              <span className="balance-account-num">{user?.accountNumber}</span>
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
          <div className="stat-label">Transactions ({currentMonthName})</div>
          <div className="stat-value">{currentMonthCount}</div>
          <div className="stat-change text-success">Based on your current data</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
            <TrendingUp size={20} />
          </div>
          <div className="stat-label">Monthly Income</div>
          <div className="stat-value">{formatCurrency(currentMonthIncome)}</div>
          <div className="stat-change text-success">Updated from transactions</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }}>
            <TrendingDown size={20} />
          </div>
          <div className="stat-label">Monthly Expenses</div>
          <div className="stat-value">{formatCurrency(currentMonthExpenses)}</div>
          <div className="stat-change text-danger">Updated from transactions</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--warning-light)', color: '#856404' }}>
            <Gift size={20} />
          </div>
          <div className="stat-label">Cashback Earned</div>
          <div className="stat-value">{formatCurrency(cashbackEarned)}</div>
          <div className="stat-change text-muted">Current month</div>
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
          <span className="legend-item text-muted"><span/>FCFA</span>
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
                    {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount, tx.currency || 'XAF')}
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
