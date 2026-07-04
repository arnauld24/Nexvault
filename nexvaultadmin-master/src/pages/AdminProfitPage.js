import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, DollarSign, Percent, Activity,
  AlertCircle, RefreshCw
} from 'lucide-react';
import { adminApi } from '../api/adminClient';
import { formatCurrency } from '../utils/formatters';

export default function AdminProfitPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('month');
  const [breakdownPeriod, setBreakdownPeriod] = useState('day');
  const [profit, setProfit] = useState(null);
  const [breakdown, setBreakdown] = useState([]);
  const [feeStats, setFeeStats] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [profitRes, breakdownRes, feesRes] = await Promise.all([
        adminApi.getProfit(period),
        adminApi.getProfitBreakdown(breakdownPeriod),
        adminApi.getFeeStatistics()
      ]);

      if (profitRes?.success) setProfit(profitRes.profit);
      if (breakdownRes?.success) setBreakdown(breakdownRes.breakdown || []);
      if (feesRes?.success) setFeeStats(feesRes.feeStats);

      if (!profitRes?.success) {
        setError(profitRes?.message || 'Failed to load profit data');
      }
    } catch (err) {
      console.error('Load profit data error:', err);
      setError(err.message || 'Failed to load profit dashboard');
    } finally {
      setLoading(false);
    }
  }, [period, breakdownPeriod]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingSpinner}>
          <div style={styles.spinner} />
          <p>Loading profit analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>💰 Profit & Revenue Analytics</h2>
          <p style={styles.subtitle}>Track fees, revenue, and transaction metrics</p>
        </div>
        <button onClick={loadData} style={styles.refreshBtn} title="Refresh data">
          <RefreshCw size={18} />
        </button>
      </div>

      {error && (
        <div style={styles.errorBox}>
          <AlertCircle size={16} style={{ marginRight: '8px' }} />
          <span>{error}</span>
        </div>
      )}

      {/* Period Selector */}
      <div style={styles.filterBar}>
        <div style={styles.filterGroup}>
          <label style={styles.label}>Period:</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} style={styles.select}>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      {profit && (
        <div style={styles.metricsGrid}>
          {/* Total Profit */}
          <div style={styles.metricCard}>
            <div style={{ ...styles.metricIcon, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <DollarSign size={22} />
            </div>
            <div>
              <div style={styles.metricLabel}>Total Profit</div>
              <div style={styles.metricValue}>{formatCurrency(profit.totalProfit)}</div>
              <div style={styles.metricSub}>From all fees collected</div>
            </div>
          </div>

          {/* Withdrawal Fees */}
          <div style={styles.metricCard}>
            <div style={{ ...styles.metricIcon, background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <Percent size={22} />
            </div>
            <div>
              <div style={styles.metricLabel}>Withdrawal Fees</div>
              <div style={styles.metricValue}>{formatCurrency(profit.withdrawalFees)}</div>
              <div style={styles.metricSub}>{profit.transactionCounts.withdrawals} withdrawals</div>
            </div>
          </div>

          {/* Deposit Fees */}
          <div style={styles.metricCard}>
            <div style={{ ...styles.metricIcon, background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
              <Activity size={22} />
            </div>
            <div>
              <div style={styles.metricLabel}>Deposit Fees</div>
              <div style={styles.metricValue}>{formatCurrency(profit.depositFees)}</div>
              <div style={styles.metricSub}>{profit.transactionCounts.deposits} deposits</div>
            </div>
          </div>

          {/* Net Volume */}
          <div style={styles.metricCard}>
            <div style={{ ...styles.metricIcon, background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
              <TrendingUp size={22} />
            </div>
            <div>
              <div style={styles.metricLabel}>Net Volume</div>
              <div style={styles.metricValue}>{formatCurrency(profit.volume.net)}</div>
              <div style={styles.metricSub}>Deposits minus withdrawals</div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Summary */}
      {profit && (
        <div style={styles.summaryGrid}>
          <div style={styles.summaryCard}>
            <h3 style={styles.summaryTitle}>📊 Transaction Summary</h3>
            <div style={styles.summaryContent}>
              <div style={styles.summaryRow}>
                <span>Total Transactions:</span>
                <span style={styles.summaryValue}>{profit.transactionCounts.total.toLocaleString()}</span>
              </div>
              <div style={styles.summaryRow}>
                <span>Deposits:</span>
                <span style={styles.summaryValue}>{profit.transactionCounts.deposits}</span>
              </div>
              <div style={styles.summaryRow}>
                <span>Withdrawals:</span>
                <span style={styles.summaryValue}>{profit.transactionCounts.withdrawals}</span>
              </div>
            </div>
          </div>

          <div style={styles.summaryCard}>
            <h3 style={styles.summaryTitle}>💸 Volume Analysis</h3>
            <div style={styles.summaryContent}>
              <div style={styles.summaryRow}>
                <span>Total Deposits:</span>
                <span style={{ ...styles.summaryValue, color: '#10b981' }}>
                  {formatCurrency(profit.volume.deposits)}
                </span>
              </div>
              <div style={styles.summaryRow}>
                <span>Total Withdrawals:</span>
                <span style={{ ...styles.summaryValue, color: '#ef4444' }}>
                  {formatCurrency(profit.volume.withdrawals)}
                </span>
              </div>
              <div style={styles.summaryRow}>
                <span>Net Flow:</span>
                <span style={styles.summaryValue}>
                  {formatCurrency(profit.volume.net)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fee Statistics */}
      {feeStats && (
        <div style={styles.summaryGrid}>
          <div style={styles.summaryCard}>
            <h3 style={styles.summaryTitle}>💰 Fee Statistics</h3>
            <div style={styles.summaryContent}>
              <div style={styles.summaryRow}>
                <span>Total Withdrawals:</span>
                <span style={styles.summaryValue}>{feeStats.totalWithdrawals.toLocaleString()}</span>
              </div>
              <div style={styles.summaryRow}>
                <span>Total Fees Collected:</span>
                <span style={styles.summaryValue}>{formatCurrency(feeStats.totalFeesCollected)}</span>
              </div>
              <div style={styles.summaryRow}>
                <span>Average Fee:</span>
                <span style={styles.summaryValue}>{formatCurrency(feeStats.averageFee)}</span>
              </div>
              <div style={styles.summaryRow}>
                <span>Min Fee:</span>
                <span style={styles.summaryValue}>{formatCurrency(feeStats.minFee)}</span>
              </div>
              <div style={styles.summaryRow}>
                <span>Max Fee:</span>
                <span style={styles.summaryValue}>{formatCurrency(feeStats.maxFee)}</span>
              </div>
              <div style={styles.summaryRow}>
                <span>Total Withdrawn:</span>
                <span style={styles.summaryValue}>{formatCurrency(feeStats.totalWithdrawn)}</span>
              </div>
            </div>
          </div>

          <div style={styles.summaryCard}>
            <h3 style={styles.summaryTitle}>📈 Key Metrics</h3>
            <div style={styles.summaryContent}>
              {feeStats.totalWithdrawals > 0 && (
                <>
                  <div style={styles.summaryRow}>
                    <span>Fee Ratio:</span>
                    <span style={styles.summaryValue}>
                      {((feeStats.totalFeesCollected / feeStats.totalWithdrawn) * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div style={styles.summaryRow}>
                    <span>Avg per Withdrawal:</span>
                    <span style={styles.summaryValue}>
                      {formatCurrency(feeStats.totalWithdrawn / feeStats.totalWithdrawals)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Breakdown by Period */}
      {breakdown.length > 0 && (
        <div style={styles.breakdownSection}>
          <div style={styles.breakdownHeader}>
            <h3 style={styles.breakdownTitle}>📊 Breakdown by {breakdownPeriod === 'day' ? 'Day' : breakdownPeriod === 'week' ? 'Week' : 'Month'}</h3>
            <select value={breakdownPeriod} onChange={(e) => setBreakdownPeriod(e.target.value)} style={styles.select}>
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </div>

          <div style={styles.breakdownTable}>
            <div style={styles.tableHeader}>
              <div style={styles.tableCell}>Period</div>
              <div style={styles.tableCell}>Withdrawals</div>
              <div style={styles.tableCell}>Deposits</div>
              <div style={styles.tableCell}>Total Fees</div>
              <div style={styles.tableCell}>Transactions</div>
              <div style={styles.tableCell}>Net Volume</div>
            </div>
            {breakdown.map((item, idx) => (
              <div key={idx} style={styles.tableRow}>
                <div style={styles.tableCell}>
                  {new Date(item.period).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: breakdownPeriod === 'month' ? 'numeric' : undefined,
                  })}
                </div>
                <div style={styles.tableCell}>{formatCurrency(item.withdrawalFees)}</div>
                <div style={styles.tableCell}>{formatCurrency(item.depositFees)}</div>
                <div style={{ ...styles.tableCell, fontWeight: 'bold', color: '#10b981' }}>
                  {formatCurrency(item.totalFees)}
                </div>
                <div style={styles.tableCell}>{item.transactionCount}</div>
                <div style={styles.tableCell}>
                  {formatCurrency(item.depositVolume - item.withdrawalVolume)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Box */}
      <div style={styles.infoBox}>
        <AlertCircle size={16} style={{ marginRight: '8px' }} />
        <span>
          Profit calculations are based on fees collected from withdrawals and deposits. 
          Data updates in real-time as transactions complete.
        </span>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  title: {
    margin: '0 0 4px',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    margin: 0,
    fontSize: '13px',
    color: '#64748b',
  },
  refreshBtn: {
    padding: '8px 12px',
    background: '#007BFF',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'background 0.2s',
  },
  filterBar: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    padding: '12px',
    background: '#f8fafc',
    borderRadius: '8px',
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569',
  },
  select: {
    padding: '6px 10px',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    fontSize: '13px',
    background: 'white',
    cursor: 'pointer',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  metricCard: {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  metricIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  metricLabel: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '600',
    marginBottom: '4px',
  },
  metricValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: '4px',
  },
  metricSub: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  summaryCard: {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
  },
  summaryTitle: {
    margin: '0 0 12px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#0f172a',
  },
  summaryContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    fontSize: '13px',
    borderBottom: '1px solid #f1f5f9',
  },
  summaryValue: {
    fontWeight: 'bold',
    color: '#0056B3',
  },
  breakdownSection: {
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
  },
  breakdownHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  breakdownTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: '600',
    color: '#0f172a',
  },
  breakdownTable: {
    overflowX: 'auto',
  },
  tableHeader: {
    display: 'grid',
    gridTemplateColumns: '120px 100px 100px 120px 120px 120px',
    gap: '12px',
    padding: '12px 0',
    borderBottom: '2px solid #e2e8f0',
    fontWeight: 'bold',
    fontSize: '12px',
    color: '#475569',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '120px 100px 100px 120px 120px 120px',
    gap: '12px',
    padding: '12px 0',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '13px',
    alignItems: 'center',
  },
  tableCell: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  errorBox: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    padding: '12px 16px',
    borderRadius: '6px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    fontSize: '13px',
  },
  infoBox: {
    background: '#dbeafe',
    border: '1px solid #93c5fd',
    color: '#1e40af',
    padding: '12px 16px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    fontSize: '13px',
    marginTop: '16px',
  },
  loadingSpinner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #007BFF',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '16px',
  },
};

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);
