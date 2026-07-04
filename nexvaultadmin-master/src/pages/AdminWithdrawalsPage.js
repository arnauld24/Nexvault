import React, { useEffect, useState } from 'react';
import { adminApi } from '../api/adminClient';
import { formatCurrency } from '../utils/formatters';
import { AlertCircle, Check, X } from 'lucide-react';

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [filteredWithdrawals, setFilteredWithdrawals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [validationNote, setValidationNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchWithdrawals = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getPendingWithdrawals(100);
      if (res?.success && Array.isArray(res.withdrawals)) {
        setWithdrawals(res.withdrawals);
        filterWithdrawals(res.withdrawals, statusFilter);
      } else {
        setError(res?._error || 'Unable to load withdrawals');
      }
    } catch (e) {
      setError(e.message || 'Unable to load withdrawals');
    } finally {
      setLoading(false);
    }
  };

  const filterWithdrawals = (txs, status) => {
    let filtered = txs;
    if (status !== 'all') {
      filtered = txs.filter(t => t.status === status);
    }
    setFilteredWithdrawals(filtered);
  };

  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    filterWithdrawals(withdrawals, status);
  };

  const handleValidate = async () => {
    if (!selectedWithdrawal) return;
    setProcessing(true);
    try {
      const res = await adminApi.validateWithdrawal(selectedWithdrawal.reference, validationNote);
      if (res?.success) {
        alert('Withdrawal validated successfully');
        setShowValidateModal(false);
        setValidationNote('');
        setSelectedWithdrawal(null);
        fetchWithdrawals();
      } else {
        alert(res?.message || 'Validation failed');
      }
    } catch (e) {
      alert(e.message || 'Validation failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedWithdrawal) return;
    setProcessing(true);
    try {
      const res = await adminApi.rejectWithdrawal(selectedWithdrawal.reference, rejectionReason);
      if (res?.success) {
        alert('Withdrawal rejected and user refunded');
        setShowRejectModal(false);
        setRejectionReason('');
        setSelectedWithdrawal(null);
        fetchWithdrawals();
      } else {
        alert(res?.message || 'Rejection failed');
      }
    } catch (e) {
      alert(e.message || 'Rejection failed');
    } finally {
      setProcessing(false);
    }
  };

  useEffect(() => { 
    fetchWithdrawals(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusBadge = (status) => {
    const colors = {
      pending: { bg: '#fef3c7', color: '#ca8a04' },
      validated: { bg: '#dcfce7', color: '#15803d' },
      failed: { bg: '#fee2e2', color: '#dc2626' },
      completed: { bg: '#dbeafe', color: '#0284c7' },
    };
    const style = colors[status] || { bg: '#f3f4f6', color: '#6b7280' };
    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '600',
        backgroundColor: style.bg,
        color: style.color,
      }}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getWithdrawalTypeLabel = (tx) => {
    if (tx.provider) return `${tx.provider === 'orange' ? '🟠 Orange' : '🟡 MTN'} Mobile Money`;
    return '🏦 Bank Account';
  };

  return (
    <div style={{ padding: '20px', background: '#fff' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700' }}>Withdrawal Management</h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>Validate and manage user withdrawal requests</p>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '16px',
          background: '#fee2e2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          color: '#b91c1c',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-light)' }}>
        {['pending', 'validated', 'failed', 'all'].map(status => (
          <button
            key={status}
            onClick={() => handleStatusFilterChange(status)}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              color: statusFilter === status ? '#6366f1' : 'var(--text-muted)',
              fontWeight: statusFilter === status ? '600' : '500',
              fontSize: '14px',
              cursor: 'pointer',
              borderBottom: statusFilter === status ? '2px solid #6366f1' : 'transparent',
              transition: 'all 0.2s'
            }}
          >
            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
            {' '}
            ({withdrawals.filter(t => status === 'all' || t.status === status).length})
          </button>
        ))}
      </div>

      {/* Withdrawals table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          <div style={{ display: 'inline-block' }} className="spinner" /> Loading withdrawals...
        </div>
      ) : filteredWithdrawals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          No {statusFilter !== 'all' ? statusFilter : ''} withdrawals found
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-light)', borderBottom: '1px solid var(--border-light)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>User</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Amount</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Type</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Reference</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Date</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWithdrawals.map((tx, i) => (
                <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-light)', background: i % 2 === 0 ? '#fafafa' : '#fff' }}>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-dark)' }}>{tx.userName || tx.first_name + ' ' + tx.last_name || 'Unknown'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{tx.email}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600' }}>{formatCurrency(tx.amount)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>{getWithdrawalTypeLabel(tx)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{tx.reference}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                    {new Date(tx.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px 16px' }}>{getStatusBadge(tx.status)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                    {tx.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => { setSelectedWithdrawal(tx); setShowValidateModal(true); }}
                          style={{
                            padding: '6px 12px',
                            background: '#10b981',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Check size={12} /> Validate
                        </button>
                        <button
                          onClick={() => { setSelectedWithdrawal(tx); setShowRejectModal(true); }}
                          style={{
                            padding: '6px 12px',
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <X size={12} /> Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Validate modal */}
      {showValidateModal && selectedWithdrawal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700' }}>Validate Withdrawal</h2>
            <div style={{ marginBottom: '16px' }}>
              <p style={{ margin: '0 0 8px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                User: <strong>{selectedWithdrawal.userName}</strong>
              </p>
              <p style={{ margin: '0 0 8px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                Amount: <strong>{formatCurrency(selectedWithdrawal.amount)}</strong>
              </p>
              <p style={{ margin: '0 0 16px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                Reference: <strong>{selectedWithdrawal.reference}</strong>
              </p>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>Optional Note</label>
              <textarea
                value={validationNote}
                onChange={e => setValidationNote(e.target.value)}
                placeholder="Add a note (optional)"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border-light)',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  minHeight: '80px'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { setShowValidateModal(false); setValidationNote(''); setSelectedWithdrawal(null); }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  border: '1px solid var(--border-light)',
                  background: '#fff',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleValidate}
                disabled={processing}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  opacity: processing ? 0.6 : 1
                }}
              >
                {processing ? 'Validating...' : 'Validate Withdrawal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {showRejectModal && selectedWithdrawal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '700' }}>Reject Withdrawal</h2>
            <div style={{ marginBottom: '16px' }}>
              <p style={{ margin: '0 0 8px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                User: <strong>{selectedWithdrawal.userName}</strong>
              </p>
              <p style={{ margin: '0 0 8px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                Amount: <strong>{formatCurrency(selectedWithdrawal.amount)}</strong>
              </p>
              <p style={{ margin: '0 0 16px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                <strong>User will be refunded automatically</strong>
              </p>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>Reason for Rejection</label>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Explain why you're rejecting this withdrawal"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--border-light)',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  minHeight: '80px'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => { setShowRejectModal(false); setRejectionReason(''); setSelectedWithdrawal(null); }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  border: '1px solid var(--border-light)',
                  background: '#fff',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing || !rejectionReason.trim()}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: (!rejectionReason.trim() || processing) ? 'not-allowed' : 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  opacity: (!rejectionReason.trim() || processing) ? 0.6 : 1
                }}
              >
                {processing ? 'Rejecting...' : 'Reject & Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
