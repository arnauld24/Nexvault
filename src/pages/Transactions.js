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
import { useToast } from '../context/ToastContext';
import apiClient from '../api/client';
import { formatCurrency, formatDate, formatTime } from '../utils/formatters';
import './Transactions.css';

function TxIcon({ category, type }) {
  const normalizedType = type || (category === 'deposit' ? 'credit' : category === 'withdrawal' ? 'debit' : 'credit');
  if (category === 'deposit') return <Banknote size={18} />;
  if (category === 'transfer') return normalizedType === 'credit' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />;
  if (category === 'withdrawal') return <ArrowUpRight size={18} />;
  return <RefreshCw size={18} />;
}

function escapeCsvValue(value) {
  const text = value === undefined || value === null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadFile(filename, content, mimeType = 'text/csv') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadTransactionCsv(transactions) {
  const headers = ['Date', 'Time', 'Type', 'Category', 'Description', 'Reference', 'From', 'To', 'Amount', 'Currency', 'Fee', 'Status'];
  const rows = transactions.map(tx => [
    formatDate(tx.date),
    formatTime(tx.date),
    tx.type || '',
    tx.category || '',
    tx.description || '',
    tx.reference || '',
    tx.from || '',
    tx.to || '',
    tx.amount != null ? tx.amount : '',
    tx.currency || 'XAF',
    tx.fee != null ? tx.fee : '',
    tx.status || '',
  ].map(escapeCsvValue).join(','));

  const csv = [headers.join(','), ...rows].join('\n');
  downloadFile(`nexvault-transactions-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}

function printTransactionReceipt(tx) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Transaction Receipt</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #111; }
        .receipt { max-width: 680px; margin: 0 auto; }
        .heading { margin-bottom: 24px; }
        .heading h1 { margin: 0; font-size: 24px; }
        .details, .line-items { width: 100%; border-collapse: collapse; }
        .details td, .line-items td { padding: 10px 8px; border-bottom: 1px solid #ddd; }
        .details td.label { width: 35%; color: #555; }
        .line-items td { padding: 12px 8px; }
        .total { font-weight: 700; }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="heading">
          <h1>NexVault Receipt</h1>
          <p>Transaction reference: ${tx.reference || tx.id}</p>
          <p>${formatDate(tx.date)} at ${formatTime(tx.date)}</p>
        </div>
        <table class="details">
          <tr><td class="label">Description</td><td>${tx.description || tx.category}</td></tr>
          <tr><td class="label">Type</td><td>${tx.type}</td></tr>
          <tr><td class="label">Category</td><td>${tx.category}</td></tr>
          <tr><td class="label">From</td><td>${tx.from || 'N/A'}</td></tr>
          <tr><td class="label">To</td><td>${tx.to || 'N/A'}</td></tr>
          <tr><td class="label">Amount</td><td>${formatCurrency(tx.amount, tx.currency || 'XAF')}</td></tr>
          <tr><td class="label">Fee</td><td>${tx.fee ? formatCurrency(tx.fee, tx.currency || 'XAF') : 'Free'}</td></tr>
          <tr><td class="label">Total</td><td class="total">${formatCurrency(Number(tx.amount || 0) + Number(tx.fee || 0), tx.currency || 'XAF')}</td></tr>
          <tr><td class="label">Status</td><td>${tx.status}</td></tr>
        </table>
      </div>
      <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>
  `;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
}

async function emailTransactionReceipt(tx, toast) {
  try {
    const response = await apiClient.sendTransactionReceipt(tx.id);
    if (response.success) {
      toast('Receipt has been emailed successfully', 'success');
    } else {
      throw new Error(response.message || 'Unable to send receipt');
    }
  } catch (error) {
    console.error('Email receipt error:', error);
    toast(error.message || 'Failed to email receipt', 'error');
  }
}

async function shareTransactionLink(tx, toast) {
  const url = window.location.href;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'NexVault Transaction', text: 'View my transaction receipt', url });
      return;
    } catch (error) {
      console.warn('Web share not completed:', error);
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast('Transaction link copied to clipboard', 'success');
  } catch (error) {
    console.error('Share error:', error);
    toast('Unable to copy link', 'error');
  }
}

export function TransactionHistory() {
  const navigate = useNavigate();
  const { transactions } = useWallet();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const normalizedSearch = search.trim().toLowerCase();

  const filtered = transactions.filter(t => {
    const description = (t.description || '').toString().toLowerCase();
    const reference = (t.reference || '').toString().toLowerCase();
    const from = (t.from || '').toString().toLowerCase();
    const to = (t.to || '').toString().toLowerCase();
    const category = (t.category || '').toString().toLowerCase();
    const matchSearch = !normalizedSearch ||
      description.includes(normalizedSearch) ||
      reference.includes(normalizedSearch) ||
      from.includes(normalizedSearch) ||
      to.includes(normalizedSearch) ||
      category.includes(normalizedSearch);
    const matchType = filter === 'all' || t.type === filter;
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const totalCredits = filtered.filter(t => t.type === 'credit').reduce((a, t) => a + Number(t.amount || 0), 0);
  const totalDebits = filtered.filter(t => t.type === 'debit').reduce((a, t) => a + Number(t.amount || 0), 0);

  return (
    <DashboardLayout>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1>Transaction History</h1>
            <p>View and filter all your wallet activity.</p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => downloadTransactionCsv(filtered)}>
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
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{tx.description || tx.category || 'Transaction'}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{tx.reference || tx.category || 'No reference'}</div>
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
                        {((tx.type || tx.category) === 'credit' || (tx.category === 'deposit')) ? '+' : '-'}{formatCurrency(tx.amount, tx.currency || 'XAF')}
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
  const toast = useToast();
  const { transactions } = useWallet();
  const [emailing, setEmailing] = useState(false);
  const tx = transactions.find(t => String(t.id) === id || String(t.reference) === id);

  if (!tx || !tx.type) {
    return (
      <DashboardLayout>
        <div className="page-header">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/transactions')} style={{ marginBottom: 12 }}>
            <ArrowLeft size={14} /> Back to Transactions
          </button>
          <h1>Transaction Not Found</h1>
          <p>The transaction you're looking for doesn't exist or has been deleted.</p>
        </div>
      </DashboardLayout>
    );
  }

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
                { label: 'Transaction ID', value: String(tx.id).toUpperCase(), mono: true },
                { label: 'Reference', value: tx.reference, mono: true },
                { label: 'Date & Time', value: `${formatDate(tx.date)} at ${formatTime(tx.date)}` },
                { label: 'Category', value: <span className="tag">{tx.category}</span> },
                { label: 'From', value: tx.from },
                { label: 'To', value: tx.to },
                { label: 'Amount', value: formatCurrency(tx.amount, tx.currency || 'XAF') },
                { label: 'Transaction Fee', value: tx.fee > 0 ? formatCurrency(tx.fee, tx.currency || 'XAF') : 'Free' },
                { label: 'Total', value: formatCurrency(Number(tx.amount || 0) + Number(tx.fee || 0), tx.currency || 'XAF'), highlight: true },
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
              <button className="btn btn-outline btn-full" style={{ justifyContent: 'flex-start', gap: 12 }} onClick={() => printTransactionReceipt(tx)}>
                <FileDown size={16} /> Download PDF Receipt
              </button>
              <button className="btn btn-outline btn-full" style={{ justifyContent: 'flex-start', gap: 12 }} onClick={async () => { setEmailing(true); await emailTransactionReceipt(tx, toast); setEmailing(false); }}>
                <Mail size={16} /> {emailing ? 'Emailing Receipt...' : 'Email Receipt'}
              </button>
              <button className="btn btn-outline btn-full" style={{ justifyContent: 'flex-start', gap: 12 }} onClick={() => shareTransactionLink(tx, toast)}>
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
