import React, { useEffect, useState } from 'react';
import { adminApi } from '../api/adminClient';
import { formatCurrency } from '../utils/formatters';
import { AlertCircle } from 'lucide-react';

export default function AdminTransactionsPage() {
  const [deposits, setDeposits] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('deposits');

  const fetchTransactions = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.safeCall('/admin/transactions?status=pending&limit=200');
      if (res?.success && Array.isArray(res.transactions)) {
        // Filter by transaction type
        const depTxs = res.transactions.filter(t => ['mobile_money', 'mtn', 'orange'].some(type => t.from_entity?.toLowerCase().includes(type) || t.type?.toLowerCase().includes(type)));
        const transTxs = res.transactions.filter(t => t.type === 'transfer' || t.category === 'transfer');
        const withTxs = res.transactions.filter(t => t.type === 'withdrawal' || t.category === 'withdrawal');
        
        setDeposits(depTxs);
        setTransfers(transTxs);
        setWithdrawals(withTxs);
      } else {
        setError(res?._error || 'Unable to load transactions');
      }
    } catch (e) {
      setError(e.message || 'Unable to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, []);

  const validate = async (reference) => {
    try {
      const res = await adminApi.fetchAPI(`/admin/transactions/${reference}/validate`, { method: 'POST' });
      if (res?.success) {
        alert('Transaction validated and wallet credited');
        fetchTransactions();
      } else {
        alert(res?.message || 'Validation failed');
      }
    } catch (e) {
      alert(e.message || 'Validation failed');
    }
  };

  const renderTransactionTable = (txList, type) => {
    if (txList.length === 0) {
      return <div style={{ padding: '20px', color: '#94a3b8' }}>No {type} transactions found.</div>;
    }

    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
              <th style={{ padding: '10px 8px' }}>Reference</th>
              <th style={{ padding: '10px 8px' }}>User</th>
              <th style={{ padding: '10px 8px' }}>Amount</th>
              <th style={{ padding: '10px 8px' }}>Method</th>
              <th style={{ padding: '10px 8px' }}>Status</th>
              <th style={{ padding: '10px 8px' }}>Created</th>
              {type === 'deposits' && <th style={{ padding: '10px 8px' }}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {txList.map((tx) => (
              <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontSize: '12px' }}>{tx.reference}</td>
                <td style={{ padding: '10px 8px' }}>{tx.user_id || tx.userId || '—'}</td>
                <td style={{ padding: '10px 8px' }}>{formatCurrency(tx.amount || 0)}</td>
                <td style={{ padding: '10px 8px' }}>{tx.from_entity || tx.payment_method || tx.type || '—'}</td>
                <td style={{ padding: '10px 8px' }}>
                  <span style={{ padding: '4px 8px', borderRadius: 4, background: tx.status === 'pending' ? '#fef3c7' : '#d1fae5', color: tx.status === 'pending' ? '#92400e' : '#065f46', fontSize: '12px' }}>
                    {tx.status}
                  </span>
                </td>
                <td style={{ padding: '10px 8px', fontSize: '12px' }}>{tx.created_at ? new Date(tx.created_at).toLocaleString() : '—'}</td>
                {type === 'deposits' && (
                  <td style={{ padding: '10px 8px' }}>
                    {tx.status === 'pending' ? (
                      <button
                        onClick={() => validate(tx.reference)}
                        style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer', fontSize: '12px' }}
                      >
                        Validate
                      </button>
                    ) : '—'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 24 }}>Transactions Management</h2>
        <p style={{ margin: '6px 0 0', color: '#64748b' }}>Manage deposits, transfers, and withdrawals across the system.</p>
      </div>

      {error ? <div style={{ padding: 12, borderRadius: 8, background: '#fef2f2', color: '#b91c1c', marginBottom: 16 }}>{error}</div> : null}

      {/* Fapshi Check Reminder Section */}
      <div style={{ padding: 16, borderRadius: 8, background: '#fef3c7', border: '1px solid #fcd34d', marginBottom: 24, display: 'flex', gap: 12 }}>
        <AlertCircle size={20} style={{ color: '#ca8a04', flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 600, color: '#ca8a04', marginBottom: 4 }}>⚠️ Important: Check Fapshi Account Before Validating Mobile Money Deposits</div>
          <p style={{ margin: 0, color: '#92400e', fontSize: '14px' }}>
            Before clicking "Validate" on a mobile money deposit, please log in to your Fapshi merchant account to confirm that the payment was actually received. 
            Only validate transactions after you've verified the funds arrived. This prevents crediting wallets for payments that may have failed.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
        {[
          { id: 'deposits', label: '📱 Mobile Money Deposits', icon: '📱' },
          { id: 'transfers', label: '↔️ Transfers', icon: '↔️' },
          { id: 'withdrawals', label: '📤 Withdrawals', icon: '📤' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px',
              borderRadius: '6px 6px 0 0',
              border: 'none',
              background: activeTab === tab.id ? '#fff' : 'transparent',
              color: activeTab === tab.id ? '#0f172a' : '#64748b',
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '3px solid #4f46e5' : 'none',
              fontSize: '14px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 16 }}>
        {loading ? (
          <div style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>Loading transactions…</div>
        ) : activeTab === 'deposits' ? (
          renderTransactionTable(deposits, 'deposits')
        ) : activeTab === 'transfers' ? (
          renderTransactionTable(transfers, 'transfers')
        ) : (
          renderTransactionTable(withdrawals, 'withdrawals')
        )}
      </div>
    </div>
  );
}
