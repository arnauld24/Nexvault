import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowUpRight, ArrowDownLeft, RefreshCw, Banknote,
  Search, X, Download, ChevronRight, ArrowLeft,
  FileDown, Mail, Share2, RotateCcw, XCircle,
  HeadphonesIcon, InboxIcon,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useWallet } from '../context/WalletContext';
import { formatCurrency, formatDate, formatTime } from '../data/mockData';
import './Transactions.css';

function TxIcon({ category, type }) {
  if (category === 'deposit') return <Banknote size={18} />;
  if (category === 'transfer') return type === 'credit' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />;
  return <RefreshCw size={18} />;
}

export function TransactionHistory() {
  const navigate = useNavigate();
  const { transactions } = useWallet();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = transactions.filter(t => {
    const matchSearch = t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.reference.toLowerCase().includes(search.toLowerCase());
    const matchType = filter === 'all' || t.type === filter;
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const totalCredits = filtered.filter(t => t.type === 'credit').reduce((a, t) => a + t.amount, 0);
  const totalDebits = filtered.filter(t => t.type === 'debit').reduce((a, t) => a + t.amount, 0);

  return (
    <DashboardLayout>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1>Transaction History</h1>
            <p>View and filter all your wallet activity.</p>
          </div>
          <button className="btn btn-outline btn-sm">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="tx-summary animate-fade">
        <div className="tx-summary-card income">
          <span className="tx-summary-icon"><ArrowDownLeft size={18} /></span>
          <div>
            <div className="tx-summary-label">Total Income</div>
            <div className="tx-summary-value">{formatCurrency(totalCredits)}</div>
          </div>
        </div>
        <div className="tx-summary-card expense">
          <span className="tx-summary-icon"><ArrowUpRight size={18} /></span>
          <div>
            <div className="tx-summary-label">Total Spent</div>
            <div className="tx-summary-value">{formatCurrency(totalDebits)}</div>
          </div>
        </div>
        <div className="tx-summary-card net">
          <span className="tx-summary-icon"><RefreshCw size={18} /></span>
          <div>
            <div className="tx-summary-label">Net Balance</div>
            <div className="tx-summary-value">{formatCurrency(totalCredits - totalDebits)}</div>
          </div>
        </div>
        <div className="tx-summary-card count">
          <span className="tx-summary-icon"><Banknote size={18} /></span>
          <div>
            <div className="tx-summary-label">Transactions</div>
            <div className="tx-summary-value">{filtered.length}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card tx-filters animate-fade-delay-1">
        <div className="tx-search-wrap">
          <Search size={16} className="tx-search-icon" />
          <input
            className="tx-search"
            placeholder="Search transactions, references..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="tx-search-clear" onClick={() => setSearch('')} aria-label="Clear search">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="tx-filter-chips">
          {['all', 'credit', 'debit'].map(f => (
            <button key={f} className={`filter-chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All Types' : f === 'credit' ? 'Income' : 'Expenses'}
            </button>
          ))}
          <div className="tx-filter-sep" />
          {['all', 'completed', 'pending', 'failed'].map(s => (
            <button key={s} className={`filter-chip ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
              {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card animate-fade-delay-2" style={{ marginTop: 20 }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><InboxIcon size={40} /></div>
            <h3>No transactions found</h3>
            <p>Try adjusting your search or filters to find what you're looking for.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(tx => (
                  <tr key={tx.id} onClick={() => navigate(`/transactions/${tx.id}`)} style={{ cursor: 'pointer' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className={`tx-table-icon ${tx.type}`}>
                          <TxIcon category={tx.category} type={tx.type} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{tx.description}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{tx.reference}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 14 }}>{formatDate(tx.date)}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatTime(tx.date)}</div>
                    </td>
                    <td><span className="tag">{tx.category}</span></td>
                    <td>
                      <span style={{
                        fontWeight: 700, fontFamily: 'var(--font-display)',
                        color: tx.type === 'credit' ? 'var(--success)' : 'var(--text-dark)', fontSize: 15,
                      }}>
                        {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${tx.status === 'completed' ? 'success' : tx.status === 'pending' ? 'warning' : 'danger'}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); navigate(`/transactions/${tx.id}`); }}>
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export function TransactionDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { transactions } = useWallet();
  const tx = transactions.find(t => t.id === id) || transactions[0];

  return (
    <DashboardLayout>
      <div className="page-header">
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/transactions')} style={{ marginBottom: 12 }}>
          <ArrowLeft size={14} /> Back to Transactions
        </button>
        <h1>Transaction Details</h1>
        <p>Full breakdown and receipt for this transaction.</p>
      </div>

      <div className="tx-detail-layout animate-fade">
        {/* Main */}
        <div>
          <div className="card tx-detail-card">
            <div className="tx-detail-hero">
              <div className={`tx-detail-icon ${tx.type}`}>
                <TxIcon category={tx.category} type={tx.type} />
              </div>
              <div className="tx-detail-amount-wrap">
                <div className={`tx-detail-amount ${tx.type}`}>
                  {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                </div>
                <div className="tx-detail-desc">{tx.description}</div>
              </div>
              <span className={`badge badge-${tx.status === 'completed' ? 'success' : tx.status === 'pending' ? 'warning' : 'danger'}`} style={{ fontSize: 13, padding: '5px 14px' }}>
                {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
              </span>
            </div>

            <div className="divider" />

            <div className="tx-detail-rows">
              {[
                { label: 'Transaction ID', value: tx.id.toUpperCase(), mono: true },
                { label: 'Reference', value: tx.reference, mono: true },
                { label: 'Date & Time', value: `${formatDate(tx.date)} at ${formatTime(tx.date)}` },
                { label: 'Category', value: <span className="tag">{tx.category}</span> },
                { label: 'From', value: tx.from },
                { label: 'To', value: tx.to },
                { label: 'Amount', value: formatCurrency(tx.amount) },
                { label: 'Transaction Fee', value: tx.fee > 0 ? formatCurrency(tx.fee) : 'Free' },
                { label: 'Total', value: formatCurrency(tx.amount + tx.fee), highlight: true },
                ...(tx.note ? [{ label: 'Note', value: tx.note }] : []),
              ].map((row, i) => (
                <div key={i} className="tx-detail-row">
                  <span>{row.label}</span>
                  <span className={`fw-600 ${row.mono ? 'font-mono' : ''} ${row.highlight ? 'text-primary' : ''}`} style={{ fontSize: row.mono ? 13 : row.highlight ? 16 : undefined }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="card tx-timeline-card" style={{ marginTop: 20 }}>
            <h3 style={{ padding: '20px 24px 0', fontSize: 16 }}>Transaction Timeline</h3>
            <div className="tx-timeline">
              {[
                { label: 'Transfer Initiated', time: formatTime(tx.date), done: true },
                { label: 'Security Check Passed', time: '0:03 later', done: true },
                { label: 'Processing by Network', time: '0:05 later', done: tx.status !== 'failed' },
                {
                  label: tx.status === 'failed' ? 'Transfer Failed' : tx.status === 'pending' ? 'Awaiting Confirmation' : 'Transfer Completed',
                  time: tx.status === 'completed' ? '0:08 later' : tx.status === 'failed' ? '0:06 later' : 'In progress',
                  done: tx.status === 'completed',
                  failed: tx.status === 'failed',
                  pending: tx.status === 'pending',
                },
              ].map((item, i) => (
                <div key={i} className={`timeline-item ${item.done ? 'done' : item.failed ? 'failed' : item.pending ? 'pending' : ''}`}>
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <div className="timeline-label">{item.label}</div>
                    <div className="timeline-time">{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Side */}
        <div>
          <div className="card tx-receipt-card">
            <h4>Receipt Actions</h4>
            <div className="receipt-actions">
              <button className="btn btn-outline btn-full" style={{ justifyContent: 'flex-start', gap: 12 }}>
                <FileDown size={16} /> Download PDF Receipt
              </button>
              <button className="btn btn-outline btn-full" style={{ justifyContent: 'flex-start', gap: 12 }}>
                <Mail size={16} /> Email Receipt
              </button>
              <button className="btn btn-outline btn-full" style={{ justifyContent: 'flex-start', gap: 12 }}>
                <Share2 size={16} /> Share Transaction
              </button>
              {tx.status === 'failed' && (
                <button className="btn btn-primary btn-full">
                  <RotateCcw size={16} /> Retry Transfer
                </button>
              )}
              {tx.status === 'pending' && (
                <button className="btn btn-danger btn-full">
                  <XCircle size={16} /> Cancel Transfer
                </button>
              )}
            </div>
          </div>

          <div className="card" style={{ marginTop: 16, padding: 20 }}>
            <h4 style={{ marginBottom: 14, fontSize: 15 }}>Need Help?</h4>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.6 }}>
              If you have questions about this transaction, our support team is available 24/7.
            </p>
            <button className="btn btn-ghost btn-full" onClick={() => navigate('/help')}>
              <HeadphonesIcon size={14} /> Contact Support
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
