import React, { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';
import {
  Users, UserCheck, ArrowLeftRight, TrendingUp, Clock,
  ShieldCheck, Download, UserPlus, ArrowUpRight, ArrowDownRight,
  X, Eye, Pencil, ChevronRight, Calendar,
  DollarSign, CheckCircle2
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

// ─── Static data ─────────────────────────────────────────────────────────────

const volumeData = [
  { day: 'Mon', volume: 420000, prev: 310000 },
  { day: 'Tue', volume: 580000, prev: 420000 },
  { day: 'Wed', volume: 390000, prev: 480000 },
  { day: 'Thu', volume: 720000, prev: 510000 },
  { day: 'Fri', volume: 890000, prev: 650000 },
  { day: 'Sat', volume: 340000, prev: 390000 },
  { day: 'Sun', volume: 210000, prev: 270000 },
];

const areaData = [
  { month: 'Jan', value: 18000 },
  { month: 'Feb', value: 24000 },
  { month: 'Mar', value: 32000 },
  { month: 'Apr', value: 28000 },
  { month: 'May', value: 45000 },
  { month: 'Jun', value: 58000 },
  { month: 'Jul', value: 64000 },
];

// ─── Custom tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle}>
      <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={p.dataKey || p.name || `payload-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#f1f5f9' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          {formatCurrency(p.value)}
        </div>
      ))}
    </div>
  );
};
const tooltipStyle = {
  background: '#1e293b',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '10px',
  padding: '10px 14px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
};

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color, bg, trend, trendUp, onClick }) {
  return (
    <div
      className="card"
      style={{ ...s.statCard, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <div style={s.statTop}>
        <div style={{ ...s.statIconBox, background: bg, color }}>
          <Icon size={20} />
        </div>
        {trend != null && (
          <div style={{ ...s.trendBadge, color: trendUp ? '#10b981' : '#ef4444', background: trendUp ? '#d1fae5' : '#fee2e2' }}>
            {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trend}
          </div>
        )}
      </div>
      <div style={s.statValue}>{value}</div>
      <div style={s.statLabel}>{label}</div>
      {sub && (
        <div style={s.statSub}>
          {sub}
          {onClick && <ChevronRight size={11} style={{ marginLeft: '2px' }} />}
        </div>
      )}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={s.sectionHeader}>
      <div>
        <h3 style={s.sectionTitle}>{title}</h3>
        {subtitle && <p style={s.sectionSub}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Modal shell ─────────────────────────────────────────────────────────────

function Modal({ title, onClose, children, footer, wide }) {
  return (
    <div style={s.backdrop}>
      <div className="card animate-fade" style={{ ...s.modal, maxWidth: wide ? '660px' : '500px' }}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>{title}</h3>
          <button onClick={onClose} style={s.closeBtn}><X size={18} /></button>
        </div>
        <div style={s.modalBody}>{children}</div>
        {footer && <div style={s.modalFooter}>{footer}</div>}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminDashboard({ users, setUsers, setActiveTab, stats, kycStats, txStats, walletStats, recentTx: recentTxProp, topWallets: topWalletsProp }) {
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [txRange, setTxRange] = useState('All Time');
  const [activeUsersOpen, setActiveUsersOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('add');
  const [selectedUser, setSelectedUser] = useState(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formBalance, setFormBalance] = useState('');
  const [formKyc, setFormKyc] = useState('verified');
  const [formStatus, setFormStatus] = useState('active');

  const pendingKyc = users.filter(u => u.kyc === 'pending').length;
  const activeCount = users.filter(u => u.status === 'active').length;
  const totalBalance = users.reduce((sum, u) => sum + (u.balance || 0), 0);

  // Transaction filter
  const getFilteredTx = () => {
    const list = (recentTxProp || recentTx || []).map(tx => ({
      ...tx,
      date: tx.date || tx.created_at,
    }));
    const now = new Date();
    const diff = (s) => {
      try { return Math.ceil(Math.abs(now - new Date(s)) / 864e5); }
      catch { return 999; }
    };
    if (txRange === 'Today') return list.filter(t => diff(t.date) < 1);
    if (txRange === 'This Week') return list.filter(t => diff(t.date) <= 7);
    if (txRange === 'This Month') return list.filter(t => diff(t.date) <= 30);
    return list;
  };

  // Top users by balance
  const topUsers = (topWalletsProp && topWalletsProp.length > 0)
    ? topWalletsProp.slice(0,5)
    : [...users].sort((a, b) => (b.balance || 0) - (a.balance || 0)).slice(0, 5);

  // Modal helpers
  const openAdd = () => {
    setModalType('add'); setFormName(''); setFormEmail('');
    setFormBalance(''); setFormKyc('verified'); setFormStatus('active');
    setModalOpen(true);
  };
  const openEdit = (u) => {
    setModalType('edit'); setSelectedUser(u);
    setFormName(u.name); setFormEmail(u.email);
    setFormBalance(u.balance.toString()); setFormKyc(u.kyc); setFormStatus(u.status);
    setModalOpen(true);
  };
  const openView = (u) => { setModalType('view'); setSelectedUser(u); setModalOpen(true); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formName || !formEmail) return;
    if (modalType === 'add') {
      setUsers([{
        id: `usr_${Math.floor(10000 + Math.random() * 90000)}`,
        name: formName, email: formEmail, kyc: formKyc,
        status: formStatus, balance: parseFloat(formBalance) || 0,
        transactions: 0,
        joined: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
        documentType: 'National ID', documentId: 'ID-000000X',
      }, ...users]);
    } else if (modalType === 'edit' && selectedUser) {
      setUsers(prev => prev.map(u => u.id === selectedUser.id
        ? { ...u, name: formName, email: formEmail, kyc: formKyc, status: formStatus, balance: parseFloat(formBalance) || 0 }
        : u));
    }
    setModalOpen(false);
  };

  const handleToggleStatus = (id) =>
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' } : u));

  const recentTx = (recentTxProp && recentTxProp.length > 0) ? recentTxProp.slice(0,6) : [];

  return (
    <div style={s.root}>

      {/* ── Page header ── */}
      <div style={s.pageHeader} className="animate-fade">
        <div>
          <div style={s.headerBadge}>
            <ShieldCheck size={12} /> Nexvault Admin
          </div>
          <h1 style={s.pageTitle}>Overview</h1>
          <p style={s.pageSubtitle}>Welcome back. Here's what's happening today.</p>
        </div>
        <div style={s.headerActions}>
          <button className="btn btn-outline btn-sm" style={s.headerBtn}>
            <Download size={13} /> Export
          </button>
          <button className="btn btn-primary btn-sm" style={s.headerBtn} onClick={openAdd}>
            <UserPlus size={13} /> Add User
          </button>
        </div>
      </div>

      {/* ── Stats grid ── */}
      <div style={s.statsGrid} className="animate-fade-delay-1">
        <StatCard
          label="Total Users"
          value={users.length.toLocaleString()}
          sub="All registered accounts"
          icon={Users}
          color="#0056B3"
          bg="#e8f0fb"
          trend="+12.4%"
          trendUp
        />
        <StatCard
          label="Active Users"
          value={activeCount.toLocaleString()}
          sub="View active profiles"
          icon={UserCheck}
          color="#059669"
          bg="#d1fae5"
          trend="+8.1%"
          trendUp
          onClick={() => setActiveUsersOpen(true)}
        />
        <StatCard
          label="Total Volume"
          value={`${(((stats && stats.totalVolume) || 0) / 1_000_000).toFixed(1)}M FCFA`}
          sub="All-time settlements"
          icon={DollarSign}
          color="#0056B3"
          bg="#e8f0fb"
          trend="+18.4%"
          trendUp
          onClick={() => setTxModalOpen(true)}
        />
        <StatCard
          label="Transactions"
          value={((stats && stats.totalTransactions) || 0).toLocaleString()}
          sub="Open transaction log"
          icon={ArrowLeftRight}
          color="#7c3aed"
          bg="#ede9fe"
          trend="+5.2%"
          trendUp
          onClick={() => setTxModalOpen(true)}
        />
        <StatCard
          label="Pending KYC"
          value={pendingKyc.toLocaleString()}
          sub={pendingKyc > 0 ? 'Review now' : 'Queue is clear'}
          icon={Clock}
          color="#d97706"
          bg="#fef3c7"
          trend={pendingKyc > 0 ? `${pendingKyc} waiting` : null}
          trendUp={false}
          onClick={() => setActiveTab('kyc')}
        />
        <StatCard
          label="Funds Under Mgmt"
          value={`${(totalBalance / 1_000_000).toFixed(2)}M FCFA`}
          sub="Combined user balances"
          icon={TrendingUp}
          color="#059669"
          bg="#d1fae5"
          trend="+3.7%"
          trendUp
        />
      </div>

      {/* ── Charts row ── */}
      <div style={s.chartsRow} className="animate-fade-delay-2">

        {/* Volume bar chart */}
        <div className="card" style={s.chartCard}>
          <SectionHeader
            title="Weekly Transaction Volume"
            subtitle="Gross FCFA settlements by day"
          />
          <div style={s.chartWrap}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={volumeData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}k FCFA`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="prev" fill="#e8f0fb" radius={[4, 4, 0, 0]} barSize={16} name="Prior week" />
                <Bar dataKey="volume" fill="#0056B3" radius={[4, 4, 0, 0]} barSize={16} name="This week" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={s.chartLegend}>
            <span style={s.legendDot('#0056B3')} /> This week
            <span style={{ ...s.legendDot('#c7d9f5'), marginLeft: '16px' }} /> Prior week
          </div>
        </div>

        {/* Revenue area chart */}
        <div className="card" style={s.chartCard}>
          <SectionHeader
            title="Revenue Growth"
            subtitle="Monthly income trend"
          />
          <div style={s.chartWrap}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={areaData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0056B3" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0056B3" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}k FCFA`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" stroke="#0056B3" strokeWidth={2.5} fill="url(#revenueGrad)" dot={false} activeDot={{ r: 5, fill: '#0056B3' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div style={s.chartLegend}>
            <span style={s.legendDot('#0056B3')} /> Monthly Revenue
          </div>
        </div>

        {/* Income vs Expense line chart */}
        <div className="card" style={{ ...s.chartCard, flex: '1 1 100%' }}>
          <SectionHeader
            title="Income vs Expenditure"
            subtitle="Financial balance over time"
          />
          <div style={s.chartWrap}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={(txStats && txStats.trend) || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={label => label ? new Date(label).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}k FCFA`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="income" name="Income" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={s.chartLegend}>
            <span style={s.legendDot('#10b981')} /> Income
            <span style={{ ...s.legendDot('#ef4444'), marginLeft: '16px' }} /> Expenditure
          </div>
        </div>
      </div>

      {/* ── Bottom row: Recent transactions + Top users ── */}
      <div style={s.bottomRow} className="animate-fade-delay-3">

        {/* Recent transactions */}
        <div className="card" style={s.bottomCard}>
          <SectionHeader
            title="Recent Transactions"
            subtitle="Latest platform activity"
            action={
              <button className="btn btn-outline btn-sm" style={s.sectionBtn} onClick={() => setTxModalOpen(true)}>
                View all <ChevronRight size={13} />
              </button>
            }
          />
          <div style={s.txList}>
            {recentTx.map((tx, i) => {
              const isDebit = tx.type === 'debit' || tx.category === 'withdrawal' || tx.type === 'Withdrawal';
              const statusLower = (tx.status || '').toLowerCase();
              const statusColor = statusLower === 'completed' || statusLower === 'success'
                ? '#10b981'
                : statusLower === 'pending'
                ? '#d97706'
                : '#ef4444';
              return (
                <div key={tx.id} style={{ ...s.txRow, borderBottom: i < recentTx.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                  <div style={s.txIconWrap(isDebit ? '#fee2e2' : '#d1fae5')}>
                    {isDebit
                      ? <ArrowDownRight size={16} style={{ color: '#ef4444' }} />
                      : <ArrowUpRight size={16} style={{ color: '#10b981' }} />}
                  </div>
                  <div style={s.txMeta}>
                    <div style={s.txName}>{tx.userName || tx.name || 'Unknown User'}</div>
                    <div style={s.txType}>{(tx.category || tx.type || '').toString().replace(/\b(debit|credit)\b/i, '').trim() || 'Transaction'} · {tx.date}</div>
                  </div>
                  <div style={s.txRight}>
                    <div style={{ ...s.txAmount, color: isDebit ? '#ef4444' : '#10b981' }}>
                      {isDebit ? '−' : '+'}{formatCurrency(tx.amount)}
                    </div>
                    <div style={{ ...s.txStatus, color: statusColor }}>{tx.status}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top users + KYC summary */}
        <div style={s.rightColumn}>

          {/* Top users by balance */}
          <div className="card" style={s.bottomCard}>
            <SectionHeader
              title="Top Accounts"
              subtitle="Highest balance holders"
              action={
                <button className="btn btn-outline btn-sm" style={s.sectionBtn} onClick={() => setActiveUsersOpen(true)}>
                  View all <ChevronRight size={13} />
                </button>
              }
            />
            <div>
              {topUsers.map((u, i) => (
                <div key={u.id} style={{ ...s.userRow, borderBottom: i < topUsers.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                  <div style={s.userRank}>{i + 1}</div>
                  <div className="avatar" style={s.userAvatar}>
                    {u.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div style={s.userInfo}>
                    <div style={s.userName}>{u.name}</div>
                    <div style={s.userEmail}>{u.email}</div>
                  </div>
                  <div style={s.userBalance}>{formatCurrency(u.balance)}</div>
                  <div style={s.userActions}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openView(u)}><Eye size={13} /></button>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}><Pencil size={13} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* KYC summary widget */}
          <div className="card" style={s.kycWidget}>
            <div style={s.kycWidgetHeader}>
              <div style={s.kycIconWrap}>
                <ShieldCheck size={18} style={{ color: '#818cf8' }} />
              </div>
              <div>
                <div style={s.kycWidgetTitle}>KYC Status</div>
                <div style={s.kycWidgetSub}>Identity verification summary</div>
              </div>
            </div>
            <div style={s.kycBars}>
              {[
                { label: 'Verified', count: users.filter(u => u.kyc === 'verified').length, color: '#10b981', bg: '#d1fae5' },
                { label: 'Pending', count: users.filter(u => u.kyc === 'pending').length, color: '#d97706', bg: '#fef3c7' },
                { label: 'Unverified', count: users.filter(u => u.kyc === 'unverified').length, color: '#ef4444', bg: '#fee2e2' },
              ].map(item => (
                <div key={item.label} style={s.kycBarRow}>
                  <div style={s.kycBarLabel}>
                    <span style={{ ...s.kycDot, background: item.color }} />
                    {item.label}
                  </div>
                  <div style={s.kycBarTrack}>
                    <div style={{ ...s.kycBarFill, width: `${(item.count / users.length) * 100}%`, background: item.color }} />
                  </div>
                  <span style={{ ...s.kycBarCount, color: item.color }}>{item.count}</span>
                </div>
              ))}
            </div>
            {pendingKyc > 0 && (
              <button
                className="btn btn-primary btn-sm"
                style={s.kycBtn}
                onClick={() => setActiveTab('kyc')}
              >
                Review {pendingKyc} pending <ChevronRight size={13} />
              </button>
            )}
            {pendingKyc === 0 && (
              <div style={s.kycAllClear}>
                <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                All verifications complete
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ── */}

      {/* Active users modal */}
      {activeUsersOpen && (
        <Modal title="Active Users" onClose={() => setActiveUsersOpen(false)}
          footer={<button className="btn btn-outline" onClick={() => setActiveUsersOpen(false)}>Close</button>}
        >
          <div style={s.modalScroll}>
            {users.filter(u => u.status === 'active').map(u => (
              <div key={u.id} style={s.modalListRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="avatar" style={s.modalAvatar}>{u.name.split(' ').map(n => n[0]).join('')}</div>
                  <div>
                    <div style={s.modalListName}>{u.name}</div>
                    <div style={s.modalListEmail}>{u.email}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={s.modalListBalance}>{formatCurrency(u.balance)}</div>
                  <span className={`badge ${u.kyc === 'verified' ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '10px' }}>{u.kyc}</span>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Transactions modal */}
      {txModalOpen && (
        <Modal title="Transaction Ledger" onClose={() => setTxModalOpen(false)} wide
          footer={<button className="btn btn-outline" onClick={() => setTxModalOpen(false)}>Close</button>}
        >
          <div style={s.txFilterRow}>
            {['All Time', 'Today', 'This Week', 'This Month'].map(r => (
              <button key={r} onClick={() => setTxRange(r)}
                className={`btn btn-sm ${txRange === r ? 'btn-primary' : 'btn-outline'}`}
              >
                <Calendar size={11} /> {r}
              </button>
            ))}
          </div>
          <div style={s.modalScroll}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['User', 'Type', 'Date', 'Amount', 'Status'].map(h => (
                    <th key={h} style={s.modalTh}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {getFilteredTx().length > 0 ? getFilteredTx().map(tx => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={s.modalTd}>
                      <div style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: '13px' }}>{tx.userName}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tx.userEmail}</div>
                    </td>
                    <td style={s.modalTd}><span style={{ fontSize: '12px' }}>{tx.type}</span></td>
                    <td style={s.modalTd}><span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tx.date}</span></td>
                    <td style={{ ...s.modalTd, fontWeight: 700, color: 'var(--text-dark)', textAlign: 'right' }}>{formatCurrency(tx.amount)}</td>
                    <td style={{ ...s.modalTd, textAlign: 'right' }}>
                      <span className={`badge ${tx.status === 'success' ? 'badge-success' : tx.status === 'pending' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '10px' }}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-light)' }}>No records for this period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Modal>
      )}

      {/* Add / Edit / View user modal */}
      {modalOpen && (
        <Modal
          title={modalType === 'add' ? 'Add New User' : modalType === 'edit' ? 'Edit User' : 'User Profile'}
          onClose={() => setModalOpen(false)}
          footer={
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
              {modalType !== 'view' && (
                <button className="btn btn-primary" form="user-form" type="submit">
                  {modalType === 'add' ? 'Create User' : 'Save Changes'}
                </button>
              )}
            </div>
          }
        >
          {modalType === 'view' && selectedUser ? (
            <div>
              <div style={s.viewTop}>
                <div className="avatar" style={s.viewAvatar}>{selectedUser.name.split(' ').map(n => n[0]).join('')}</div>
                <div>
                  <div style={s.viewName}>{selectedUser.name}</div>
                  <div style={s.viewEmail}>{selectedUser.email}</div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    <span className={`badge ${selectedUser.kyc === 'verified' ? 'badge-success' : selectedUser.kyc === 'pending' ? 'badge-warning' : 'badge-secondary'}`}>
                      {selectedUser.kyc}
                    </span>
                    <span className={`badge ${selectedUser.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                      {selectedUser.status}
                    </span>
                  </div>
                </div>
              </div>
              <div style={s.viewGrid}>
                {[
                  { label: 'User ID', value: selectedUser.id, mono: true },
                  { label: 'Date of Birth', value: selectedUser.dob || 'Not provided' },
                  { label: 'Joined', value: selectedUser.joined },
                  { label: 'Balance', value: formatCurrency(selectedUser.balance), strong: true },
                  { label: 'Transactions', value: `${selectedUser.transactions} settled` },
                  { label: 'Document', value: `${selectedUser.documentType} · ${selectedUser.documentId}` },
                ].map(row => (
                  <div key={row.label} style={s.viewRow}>
                    <div style={s.viewLabel}>{row.label}</div>
                    <div style={row.mono ? s.viewMono : row.strong ? s.viewStrong : s.viewVal}>{row.value}</div>
                  </div>
                ))}
              </div>
              <div style={s.viewActions}>
                <button className="btn btn-outline btn-sm" onClick={() => { setModalOpen(false); setTimeout(() => openEdit(selectedUser), 100); }}>
                  <Pencil size={13} /> Edit Profile
                </button>
                <button
                  className={`btn btn-sm ${selectedUser.status === 'active' ? 'btn-danger' : 'btn-success'}`}
                  onClick={() => { handleToggleStatus(selectedUser.id); setModalOpen(false); }}
                >
                  {selectedUser.status === 'active' ? 'Suspend User' : 'Reinstate User'}
                </button>
              </div>
            </div>
          ) : (
            <form id="user-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input type="text" className="form-control" required placeholder="Jane Doe" value={formName} onChange={e => setFormName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input type="email" className="form-control" required placeholder="jane@company.com" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Balance ($)</label>
                <input type="number" className="form-control" placeholder="0.00" value={formBalance} onChange={e => setFormBalance(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">KYC Status</label>
                  <select className="form-control" value={formKyc} onChange={e => setFormKyc(e.target.value)}>
                    <option value="verified">Verified</option>
                    <option value="pending">Pending</option>
                    <option value="unverified">Unverified</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Status</label>
                  <select className="form-control" value={formStatus} onChange={e => setFormStatus(e.target.value)}>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  root: { width: '100%', fontFamily: "'Inter', sans-serif" },

  // Header
  pageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '28px',
  },
  headerBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    background: '#e8f0fb',
    color: '#0056B3',
    border: '1px solid rgba(0,86,179,0.15)',
    padding: '3px 10px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 700,
    marginBottom: '8px',
  },
  pageTitle: { fontSize: '26px', fontWeight: 800, color: 'var(--text-dark)', letterSpacing: '-0.02em', marginBottom: '4px' },
  pageSubtitle: { fontSize: '13.5px', color: 'var(--text-muted)' },
  headerActions: { display: 'flex', gap: '10px', alignItems: 'center' },
  headerBtn: { padding: '8px 14px', fontSize: '12.5px', gap: '6px' },

  // Stats
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    padding: '20px',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column',
  },
  statTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' },
  statIconBox: {
    width: '40px', height: '40px', borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  trendBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '3px',
    padding: '3px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
  },
  statValue: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: '28px', fontWeight: 800, color: 'var(--text-dark)',
    letterSpacing: '-0.03em', lineHeight: 1, marginBottom: '4px',
  },
  statLabel: { fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '2px' },
  statSub: {
    fontSize: '11.5px', color: 'var(--text-light)', fontWeight: 500, marginTop: '4px',
    display: 'flex', alignItems: 'center',
  },

  // Charts
  chartsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '24px',
  },
  chartCard: {
    flex: '1 1 300px',
    padding: 0,
    overflow: 'hidden',
    minWidth: '280px',
  },
  chartWrap: { padding: '0 20px 8px' },
  chartLegend: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 24px 16px',
    fontSize: '11.5px',
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  legendDot: (color) => ({
    display: 'inline-block', width: '8px', height: '8px',
    borderRadius: '50%', background: color, marginRight: '5px',
  }),

  // Section header
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '18px 20px 14px',
    borderBottom: '1px solid var(--border-light)',
    flexWrap: 'wrap',
    gap: '8px',
  },
  sectionTitle: { fontSize: '14.5px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '2px' },
  sectionSub: { fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 },
  sectionBtn: { fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' },

  // Bottom row
  bottomRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    marginBottom: '12px',
  },
  bottomCard: {
    flex: '1 1 320px',
    padding: 0,
    overflow: 'hidden',
  },
  rightColumn: {
    flex: '0 1 340px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    minWidth: '280px',
  },

  // Transaction list
  txList: { padding: '0 4px' },
  txRow: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px 16px',
    transition: 'background 0.15s',
  },
  txIconWrap: (bg) => ({
    width: '36px', height: '36px', borderRadius: '10px', background: bg,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  }),
  txMeta: { flex: 1, minWidth: 0 },
  txName: { fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  txType: { fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '1px' },
  txRight: { textAlign: 'right', flexShrink: 0 },
  txAmount: { fontSize: '13px', fontWeight: 700 },
  txStatus: { fontSize: '10.5px', fontWeight: 600, textTransform: 'capitalize', marginTop: '2px' },

  // Top users
  userRow: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '10px 16px', transition: 'background 0.15s',
  },
  userRank: { width: '18px', fontSize: '11px', fontWeight: 700, color: 'var(--text-light)', textAlign: 'center' },
  userAvatar: { width: '32px', height: '32px', fontSize: '11px', flexShrink: 0 },
  userInfo: { flex: 1, minWidth: 0 },
  userName: { fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  userEmail: { fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  userBalance: { fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', flexShrink: 0 },
  userActions: { display: 'flex', gap: '2px', flexShrink: 0 },

  // KYC widget
  kycWidget: { padding: '18px 20px' },
  kycWidgetHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' },
  kycIconWrap: {
    width: '38px', height: '38px', borderRadius: '10px',
    background: 'rgba(79,70,229,0.1)', border: '1px solid rgba(79,70,229,0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  kycWidgetTitle: { fontSize: '14px', fontWeight: 700, color: 'var(--text-dark)' },
  kycWidgetSub: { fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '1px' },
  kycBars: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' },
  kycBarRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  kycBarLabel: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, width: '80px', flexShrink: 0 },
  kycDot: { width: '7px', height: '7px', borderRadius: '50%', display: 'inline-block', flexShrink: 0 },
  kycBarTrack: { flex: 1, height: '6px', background: 'var(--border-light)', borderRadius: '999px', overflow: 'hidden' },
  kycBarFill: { height: '100%', borderRadius: '999px', transition: 'width 0.6s ease' },
  kycBarCount: { fontSize: '12px', fontWeight: 700, width: '24px', textAlign: 'right', flexShrink: 0 },
  kycBtn: { width: '100%', justifyContent: 'center', gap: '6px' },
  kycAllClear: {
    display: 'flex', alignItems: 'center', gap: '6px',
    fontSize: '12.5px', color: '#10b981', fontWeight: 600,
    justifyContent: 'center', padding: '8px',
    background: '#d1fae5', borderRadius: '8px',
  },

  // Modal
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(9,13,22,0.45)',
    backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '20px',
  },
  modal: {
    width: '100%', maxWidth: '500px',
    background: 'var(--bg-card)',
    borderRadius: '16px',
    overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
    maxHeight: '90vh',
    boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
  },
  modalHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid var(--border-light)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  modalTitle: { fontSize: '16px', fontWeight: 700, color: 'var(--text-dark)' },
  closeBtn: {
    background: 'var(--border-light)', border: 'none', borderRadius: '8px',
    padding: '6px', cursor: 'pointer', color: 'var(--text-muted)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  modalBody: { padding: '20px 24px', overflowY: 'auto', flex: 1 },
  modalFooter: {
    padding: '16px 24px', borderTop: '1px solid var(--border-light)',
    display: 'flex', justifyContent: 'flex-end', gap: '10px',
  },
  modalScroll: { maxHeight: '400px', overflowY: 'auto' },
  modalListRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 0', borderBottom: '1px solid var(--border-light)',
  },
  modalAvatar: { width: '32px', height: '32px', fontSize: '11px' },
  modalListName: { fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)' },
  modalListEmail: { fontSize: '11px', color: 'var(--text-muted)' },
  modalListBalance: { fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' },
  txFilterRow: { display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' },
  modalTh: {
    padding: '10px 12px', fontSize: '11px', fontWeight: 700,
    color: 'var(--text-muted)', textTransform: 'uppercase',
    letterSpacing: '0.05em', background: 'var(--border-light)',
    borderBottom: '1px solid var(--border)',
  },
  modalTd: { padding: '12px', verticalAlign: 'middle' },

  // View modal
  viewTop: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--border-light)' },
  viewAvatar: { width: '52px', height: '52px', fontSize: '16px', flexShrink: 0 },
  viewName: { fontSize: '17px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '2px' },
  viewEmail: { fontSize: '13px', color: 'var(--text-muted)' },
  viewGrid: { display: 'flex', flexDirection: 'column', gap: '2px' },
  viewRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 0', borderBottom: '1px solid var(--border-light)',
  },
  viewLabel: { fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 },
  viewVal: { fontSize: '13px', color: 'var(--text-dark)', fontWeight: 600 },
  viewMono: { fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: '#0056B3', fontWeight: 600 },
  viewStrong: { fontSize: '14px', fontFamily: "'Outfit', sans-serif", fontWeight: 800, color: 'var(--text-dark)' },
  viewActions: { display: 'flex', gap: '10px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-light)' },
};
