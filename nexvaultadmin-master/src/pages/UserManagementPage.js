import React, { useState, useMemo } from 'react';
import {
  Users, UserCheck, UserX, Search, Filter,
  Eye, ChevronLeft, ChevronRight, X, CheckCircle2,
  AlertTriangle, ShieldCheck, ShieldOff, Clock,
  DollarSign, ArrowLeftRight, Calendar
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

// ─── Toast component ─────────────────────────────────────────────────────────
function Toast({ message, onClose }) {
  return (
    <div style={toast.wrap} className="animate-fade">
      <CheckCircle2 size={16} style={{ color: '#28A745', flexShrink: 0 }} />
      <span style={toast.msg}>{message}</span>
      <button style={toast.closeBtn} onClick={onClose} aria-label="Dismiss">
        <X size={13} />
      </button>
    </div>
  );
}

const toast = {
  wrap: {
    position: 'fixed',
    top: '24px',
    right: '24px',
    zIndex: 2000,
    background: '#ffffff',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: '280px',
    maxWidth: '380px',
  },
  msg: {
    flex: 1,
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-dark)',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    borderRadius: '4px',
  },
};

// ─── Confirmation modal ──────────────────────────────────────────────────────
function ConfirmModal({ action, userName, onConfirm, onCancel }) {
  const colorMap = {
    Suspend:   { bg: '#fff3cd', color: '#856404', btnClass: 'btn-danger' },
    Disable:   { bg: '#f8d7da', color: '#842029', btnClass: 'btn-danger' },
    Reinstate: { bg: '#d1fae5', color: '#065f46', btnClass: 'btn-success' },
  };
  const theme = colorMap[action] || colorMap.Suspend;

  return (
    <div style={modal.backdrop}>
      <div className="card animate-fade" style={modal.box}>
        <div style={modal.header}>
          <h3 style={modal.title}>Confirm {action}</h3>
          <button style={modal.closeBtn} onClick={onCancel} aria-label="Cancel">
            <X size={18} />
          </button>
        </div>
        <div style={modal.body}>
          <div style={{ ...modal.pill, background: theme.bg, color: theme.color }}>
            {action === 'Reinstate' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {action} Account
          </div>
          <p style={modal.desc}>
            Are you sure you want to <strong>{action.toLowerCase()}</strong>{' '}
            <strong>{userName}</strong>? This action can be reversed.
          </p>
        </div>
        <div style={modal.footer}>
          <button className="btn btn-outline" style={modal.cancelBtn} onClick={onCancel}>
            Cancel
          </button>
          <button className={`btn ${theme.btnClass}`} style={modal.confirmBtn} onClick={onConfirm}>
            {action}
          </button>
        </div>
      </div>
    </div>
  );
}

const modal = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,23,42,0.45)',
    backdropFilter: 'blur(4px)',
    zIndex: 1500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  box: {
    width: '100%',
    maxWidth: '420px',
    borderRadius: '16px',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '18px 24px',
    borderBottom: '1px solid var(--border-light)',
  },
  title: { fontSize: '15px', fontWeight: 700, color: 'var(--text-dark)' },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
  },
  body: { padding: '20px 24px' },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '8px',
    fontSize: '12.5px',
    fontWeight: 700,
    marginBottom: '14px',
  },
  desc: { fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.6 },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid var(--border-light)',
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    background: 'var(--bg-light)',
  },
  cancelBtn: { padding: '9px 18px', fontSize: '13px' },
  confirmBtn: { padding: '9px 20px', fontSize: '13px', fontWeight: 700 },
};

// ─── Profile modal ───────────────────────────────────────────────────────────
function ProfileModal({ user, onClose }) {
  const initials = user.name.split(' ').map(n => n[0]).join('');
  const kycBadge = user.kyc === 'verified' ? 'badge-success' : user.kyc === 'pending' ? 'badge-warning' : 'badge-secondary';
  const statusBadge = user.status === 'active' ? 'badge-success' : user.status === 'suspended' ? 'badge-warning' : 'badge-danger';

  return (
    <div style={modal.backdrop}>
      <div className="card animate-fade" style={{ ...modal.box, maxWidth: '500px' }}>
        <div style={modal.header}>
          <h3 style={modal.title}>User Profile</h3>
          <button style={modal.closeBtn} onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>
        <div style={{ padding: '24px' }}>
          <div style={pm.top}>
            <div className="avatar" style={pm.avatar}>{initials}</div>
            <div>
              <div style={pm.name}>{user.name}</div>
              <div style={pm.email}>{user.email}</div>
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                <span className={`badge ${kycBadge}`}>{user.kyc}</span>
                <span className={`badge ${statusBadge}`}>{user.status}</span>
              </div>
            </div>
          </div>
          <div style={pm.grid}>
            {[
              { label: 'User ID', value: user.id, mono: true },
              { label: 'Date of Birth', value: user.dob || 'N/A' },
              { label: 'Joined', value: user.joined },
              { label: 'Balance', value: formatCurrency(user.balance), strong: true },
              { label: 'Transactions', value: `${user.transactions} settled` },
              { label: 'Document', value: `${user.documentType} · ${user.documentId}` },
            ].map(row => (
              <div key={row.label} style={pm.row}>
                <div style={pm.label}>{row.label}</div>
                <div style={row.mono ? pm.mono : row.strong ? pm.strong : pm.val}>{row.value}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ ...modal.footer }}>
          <button className="btn btn-outline" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

const pm = {
  top: { display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px' },
  avatar: { width: '52px', height: '52px', fontSize: '16px', flexShrink: 0 },
  name: { fontSize: '16px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '2px' },
  email: { fontSize: '12.5px', color: 'var(--text-muted)' },
  grid: { display: 'flex', flexDirection: 'column', gap: '0px', background: 'var(--bg-light)', borderRadius: '12px', border: '1px solid var(--border-light)', overflow: 'hidden' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid var(--border-light)' },
  label: { fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 },
  val: { fontSize: '12.5px', color: 'var(--text-dark)', fontWeight: 600 },
  mono: { fontFamily: "'Fira Code', monospace", fontSize: '11.5px', color: 'var(--primary)', fontWeight: 600 },
  strong: { fontSize: '13px', color: 'var(--text-dark)', fontWeight: 800 },
};

// ─── KYC badge ───────────────────────────────────────────────────────────────
function KycBadge({ kyc }) {
  const normalized = (kyc || '').toString().trim().toLowerCase();
  if (normalized === 'verified') return <span className="badge badge-success"><ShieldCheck size={10} /> Verified</span>;
  if (normalized === 'pending')  return <span className="badge badge-warning"><Clock size={10} /> Pending</span>;
  return <span className="badge badge-secondary"><ShieldOff size={10} /> Declined</span>;
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  if (status === 'active')    return <span className="badge badge-success"><CheckCircle2 size={10} /> Active</span>;
  if (status === 'suspended') return <span className="badge badge-warning"><AlertTriangle size={10} /> Suspended</span>;
  return <span className="badge badge-danger"><UserX size={10} /> Disabled</span>;
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, bg }) {
  return (
    <div className="card" style={sc.card}>
      <div style={{ ...sc.iconBox, background: bg, color }}>
        <Icon size={20} />
      </div>
      <div>
        <div style={sc.value}>{value}</div>
        <div style={sc.label}>{label}</div>
      </div>
    </div>
  );
}

const sc = {
  card: { padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' },
  iconBox: { width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  value: { fontSize: '22px', fontWeight: 700, color: 'var(--text-dark)', lineHeight: 1.1 },
  label: { fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' },
};

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, onPrev, onNext }) {
  if (totalPages <= 1) return null;
  return (
    <div style={pg.wrap}>
      <button className="btn btn-outline btn-sm" onClick={onPrev} disabled={page === 1} style={{ opacity: page === 1 ? 0.4 : 1 }}>
        <ChevronLeft size={14} /> Prev
      </button>
      <span style={pg.info}>Page {page} of {totalPages}</span>
      <button className="btn btn-outline btn-sm" onClick={onNext} disabled={page === totalPages} style={{ opacity: page === totalPages ? 0.4 : 1 }}>
        Next <ChevronRight size={14} />
      </button>
    </div>
  );
}

const pg = {
  wrap: { display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 24px', borderTop: '1px solid var(--border-light)', justifyContent: 'flex-end' },
  info: { fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: 500 },
};

// ─── Main page ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 8;

export default function UserManagementPage({ users, setUsers, setActiveTab, onSuspendUser, onReactivateUser, onDisableUser }) {
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [kycFilter, setKycFilter]       = useState('All');
  const [page, setPage]                 = useState(1);
  const [toastMsg, setToastMsg]         = useState(null);
  const [confirm, setConfirm]           = useState(null); // { action, user }
  const [profileUser, setProfileUser]   = useState(null);

  // Global stats (unaffected by filters)
  const totalUsers     = users.length;
  const activeCount    = users.filter(u => u.status === 'active').length;
  const suspendedCount = users.filter(u => u.status === 'suspended').length;
  const disabledCount  = users.filter(u => u.status === 'disabled').length;

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const normalizeKycFilter = (value) => {
      const normalized = (value || '').toString().trim().toLowerCase();
      if (['declined', 'unverified', 'rejected'].includes(normalized)) return 'rejected';
      return normalized;
    };

    return users.filter(u => {
      const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'All' || u.status === statusFilter.toLowerCase();
      const matchKyc    = kycFilter === 'All' || normalizeKycFilter(u.kyc) === normalizeKycFilter(kycFilter);
      return matchSearch && matchStatus && matchKyc;
    });
  }, [users, search, statusFilter, kycFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const pageUsers  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 5000);
  };

  const applyStatusChange = async (userId, newStatus, actionLabel, userName, action) => {
    try {
      if (action === 'Suspend') {
        await onSuspendUser?.(userId, 'Suspended from admin panel');
      } else if (action === 'Disable') {
        await onDisableUser?.(userId, 'Disabled from admin panel');
      } else if (action === 'Reinstate') {
        await onReactivateUser?.(userId);
      }

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u));
      showToast(`${userName} has been ${actionLabel}`);
    } catch (error) {
      showToast(error?.message || `Unable to ${action.toLowerCase()} user`);
    }
  };

  const handleAction = (action, user) => {
    if (action === 'Suspend' && user.status === 'suspended') {
      showToast(`${user.name} is already suspended`);
      return;
    }
    setConfirm({ action, user });
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    const { action, user } = confirm;
    if (action === 'Suspend') {
      await applyStatusChange(user.id, 'suspended', 'suspended', user.name, action);
    } else if (action === 'Disable') {
      await applyStatusChange(user.id, 'disabled', 'disabled', user.name, action);
    } else if (action === 'Reinstate') {
      await applyStatusChange(user.id, 'active', 'reinstated', user.name, action);
    }
    setConfirm(null);
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('All');
    setKycFilter('All');
    setPage(1);
  };

  return (
    <div className="animate-fade" style={p.root}>

      {/* Toast */}
      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}

      {/* Confirm modal */}
      {confirm && (
        <ConfirmModal
          action={confirm.action}
          userName={confirm.user.name}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Profile modal */}
      {profileUser && (
        <ProfileModal user={profileUser} onClose={() => setProfileUser(null)} />
      )}

      {/* ── Page header ── */}
      <div style={p.header}>
        <div style={p.headerLeft}>
          <div style={p.iconWrap}>
            <Users size={20} style={{ color: '#818cf8' }} />
          </div>
          <div>
            <h2 style={p.title}>User Management</h2>
            <p style={p.subtitle}>Manage account statuses, review profiles and monitor activity.</p>
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div style={p.statsGrid}>
        <StatCard label="Total Users"   value={totalUsers}     icon={Users}       color="#0056B3" bg="#e8f0fb" />
        <StatCard label="Active"        value={activeCount}    icon={UserCheck}   color="#059669" bg="#d1fae5" />
        <StatCard label="Suspended"     value={suspendedCount} icon={AlertTriangle} color="#d97706" bg="#fef3c7" />
        <StatCard label="Disabled"      value={disabledCount}  icon={UserX}       color="#DC3545" bg="#fee2e2" />
      </div>

      {/* ── Search + filter bar ── */}
      <div className="card" style={p.filterCard}>
        <div style={p.searchWrap}>
          <Search size={15} style={p.searchIcon} />
          <input
            type="text"
            className="form-control"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={p.searchInput}
          />
          {search && (
            <button style={p.clearBtn} onClick={() => { setSearch(''); setPage(1); }} aria-label="Clear search">
              <X size={13} />
            </button>
          )}
        </div>

        <div style={p.filterGroup}>
          <Filter size={13} style={{ color: 'var(--text-light)', flexShrink: 0 }} />

          <div style={p.selectWrap}>
            <label style={p.filterLabel}>Account Status</label>
            <select
              className="form-control"
              style={p.select}
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
            >
              {['All', 'Active', 'Suspended', 'Disabled'].map(v => <option key={v}>{v}</option>)}
            </select>
          </div>

          <div style={p.selectWrap}>
            <label style={p.filterLabel}>KYC Status</label>
            <select
              className="form-control"
              style={p.select}
              value={kycFilter}
              onChange={e => { setKycFilter(e.target.value); setPage(1); }}
            >
              {['All', 'Verified', 'Pending', 'Declined'].map(v => <option key={v}>{v}</option>)}
            </select>
          </div>

          {(search || statusFilter !== 'All' || kycFilter !== 'All') && (
            <button className="btn btn-ghost btn-sm" onClick={resetFilters} style={{ whiteSpace: 'nowrap' }}>
              <X size={13} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {pageUsers.length === 0 ? (
          <div style={p.emptyState}>
            <div style={p.emptyIcon}><Search size={36} style={{ color: '#94a3b8' }} /></div>
            <h3 style={p.emptyTitle}>No users found</h3>
            <p style={p.emptyDesc}>Try adjusting your search or filter criteria.</p>
            <button className="btn btn-outline btn-sm" style={{ marginTop: '14px' }} onClick={resetFilters}>
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '780px' }}>
                <thead>
                  <tr>
                    {['User', 'KYC Status', 'Account Status', 'Balance', 'Transactions', 'Joined', 'Actions'].map(h => (
                      <th key={h} style={p.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageUsers.map(user => {
                    const isDisabled  = user.status === 'disabled';
                    const initials    = user.name.split(' ').map(n => n[0]).join('');

                    return (
                      <tr key={user.id} style={{ ...p.tr, opacity: isDisabled ? 0.5 : 1 }}>
                        {/* User column */}
                        <td style={p.td}>
                          <div style={p.userCell}>
                            <div className="avatar" style={p.avatar}>{initials}</div>
                            <div>
                              <div style={p.userName}>{user.name}</div>
                              <div style={p.userEmail}>{user.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* KYC Status */}
                        <td style={p.td}><KycBadge kyc={user.kyc} /></td>

                        {/* Account Status */}
                        <td style={p.td}><StatusBadge status={user.status} /></td>

                        {/* Balance */}
                        <td style={p.td}>
                          <div style={p.balanceCell}>
                            <DollarSign size={12} style={{ color: '#059669' }} />
                            <span style={p.balanceVal}>{formatCurrency(user.balance)}</span>
                          </div>
                        </td>

                        {/* Transactions */}
                        <td style={p.td}>
                          <div style={p.txCell}>
                            <ArrowLeftRight size={12} style={{ color: 'var(--text-light)' }} />
                            <span style={p.txVal}>{user.transactions}</span>
                          </div>
                        </td>

                        {/* Joined */}
                        <td style={p.td}>
                          <div style={p.joinedCell}>
                            <Calendar size={12} style={{ color: 'var(--text-light)' }} />
                            <span style={p.joinedVal}>{user.joined}</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={p.td}>
                          <div style={p.actions}>
                            {/* View profile */}
                            <button
                              className="btn btn-ghost btn-sm"
                              title="View profile"
                              onClick={() => setProfileUser(user)}
                              style={p.actionBtn}
                            >
                              <Eye size={14} />
                            </button>

                            {/* Active: Suspend + Disable */}
                            {user.status === 'active' && (
                              <>
                                <button
                                  className="btn btn-sm"
                                  style={p.suspendBtn}
                                  onClick={() => handleAction('Suspend', user)}
                                >
                                  Suspend
                                </button>
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleAction('Disable', user)}
                                >
                                  Disable
                                </button>
                              </>
                            )}

                            {/* Suspended: Reinstate + Disable */}
                            {user.status === 'suspended' && (
                              <>
                                <button
                                  className="btn btn-sm btn-success"
                                  onClick={() => handleAction('Reinstate', user)}
                                >
                                  Reinstate
                                </button>
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleAction('Disable', user)}
                                >
                                  Disable
                                </button>
                              </>
                            )}

                            {/* Disabled: Reinstate only */}
                            {user.status === 'disabled' && (
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => handleAction('Reinstate', user)}
                              >
                                Reinstate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              page={safePage}
              totalPages={totalPages}
              onPrev={() => setPage(v => Math.max(1, v - 1))}
              onNext={() => setPage(v => Math.min(totalPages, v + 1))}
            />
          </>
        )}
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const p = {
  root: { width: '100%', fontFamily: "'Inter', sans-serif" },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '24px',
  },
  headerLeft: { display: 'flex', alignItems: 'flex-start', gap: '14px' },
  iconWrap: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: 'rgba(79,70,229,0.1)',
    border: '1px solid rgba(79,70,229,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: '2px',
  },
  title: { fontSize: '22px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '4px' },
  subtitle: { fontSize: '13px', color: 'var(--text-muted)' },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    marginBottom: '20px',
  },

  filterCard: {
    padding: '16px 20px',
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
    marginBottom: '16px',
  },
  searchWrap: {
    flex: '1 1 220px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: { position: 'absolute', left: '12px', color: '#94a3b8' },
  searchInput: {
    paddingLeft: '36px',
    paddingRight: '32px',
    height: '38px',
    fontSize: '13px',
  },
  clearBtn: {
    position: 'absolute',
    right: '8px',
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
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '12px',
    flexWrap: 'wrap',
  },
  selectWrap: { display: 'flex', flexDirection: 'column', gap: '4px' },
  filterLabel: {
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  select: { height: '38px', fontSize: '12.5px', minWidth: '130px', cursor: 'pointer' },

  th: {
    padding: '12px 20px',
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    background: 'var(--border-light)',
    borderBottom: '1px solid var(--border)',
    whiteSpace: 'nowrap',
    textAlign: 'left',
  },
  tr: { transition: 'all 0.15s', borderBottom: '1px solid var(--border-light)' },
  td: { padding: '14px 20px', verticalAlign: 'middle' },

  userCell: { display: 'flex', alignItems: 'center', gap: '12px' },
  avatar: { width: '34px', height: '34px', fontSize: '11px', flexShrink: 0 },
  userName: { fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', whiteSpace: 'nowrap' },
  userEmail: { fontSize: '11.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap' },

  balanceCell: { display: 'flex', alignItems: 'center', gap: '4px' },
  balanceVal: { fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', fontFamily: "'Fira Code', monospace" },

  txCell: { display: 'flex', alignItems: 'center', gap: '5px' },
  txVal: { fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)' },

  joinedCell: { display: 'flex', alignItems: 'center', gap: '5px' },
  joinedVal: { fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' },

  actions: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap' },
  actionBtn: { padding: '5px', color: 'var(--text-muted)' },
  suspendBtn: {
    padding: '5px 10px',
    fontSize: '12px',
    background: 'transparent',
    border: '1px solid #d97706',
    color: '#d97706',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  emptyState: { padding: '56px 32px', textAlign: 'center' },
  emptyIcon: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: 'var(--border-light)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },
  emptyTitle: { fontSize: '18px', fontWeight: 700, marginBottom: '8px' },
  emptyDesc: { fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.6 },
};
