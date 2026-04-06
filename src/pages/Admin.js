import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import {
  Users, UserCheck, ArrowLeftRight, TrendingUp, Clock, BarChart2,
  Search, Download, UserPlus, Eye, Pencil, ShieldCheck,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { adminUsers, adminStats, chartData, formatCurrency } from '../data/mockData';
import './Admin.css';

const volumeData = [
  { day: 'Mon', volume: 420000 },
  { day: 'Tue', volume: 580000 },
  { day: 'Wed', volume: 390000 },
  { day: 'Thu', volume: 720000 },
  { day: 'Fri', volume: 890000 },
  { day: 'Sat', volume: 340000 },
  { day: 'Sun', volume: 210000 },
];

export default function AdminDashboard() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = adminUsers.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || u.status === statusFilter || u.kyc === statusFilter;
    return matchSearch && matchStatus;
  });

  const adminCards = [
    { label: 'Total Users', value: adminStats.totalUsers.toLocaleString(), icon: Users, color: 'var(--primary)', bg: 'var(--primary-light)', change: `+${adminStats.monthlyGrowth}% this month` },
    { label: 'Active Users', value: adminStats.activeUsers.toLocaleString(), icon: UserCheck, color: 'var(--success)', bg: 'var(--success-light)', change: '82% activity rate' },
    { label: 'Total Transactions', value: adminStats.totalTransactions.toLocaleString(), icon: ArrowLeftRight, color: '#6366f1', bg: '#eef2ff', change: 'All time' },
    { label: 'Transaction Volume', value: `${(adminStats.totalVolume / 1_000_000).toFixed(1)}M`, icon: TrendingUp, color: 'var(--success)', bg: 'var(--success-light)', change: 'This month' },
    { label: 'Pending KYC', value: adminStats.pendingKyc.toLocaleString(), icon: Clock, color: '#f59e0b', bg: 'var(--warning-light)', change: 'Requires review' },
    { label: 'Monthly Growth', value: `${adminStats.monthlyGrowth}%`, icon: BarChart2, color: 'var(--success)', bg: 'var(--success-light)', change: 'vs last month' },
  ];

  return (
    <DashboardLayout>
      <div className="page-header admin-page-header">
        <div>
          <div className="admin-badge"><ShieldCheck size={14} /> Admin Panel</div>
          <h1>System Dashboard</h1>
          <p>Monitor users, transactions, and system health in real time.</p>
        </div>
        <div className="admin-header-actions">
          <button className="btn btn-outline btn-sm"><Download size={14} /> Export Report</button>
          <button className="btn btn-primary btn-sm"><UserPlus size={14} /> Add User</button>
        </div>
      </div>

      {/* Stats */}
      <div className="admin-stats-grid animate-fade">
        {adminCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="admin-stat-card card">
              <div className="admin-stat-icon" style={{ background: c.bg, color: c.color }}>
                <Icon size={20} />
              </div>
              <div className="admin-stat-info">
                <div className="admin-stat-label">{c.label}</div>
                <div className="admin-stat-value">{c.value}</div>
                <div className="admin-stat-change">{c.change}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="admin-charts animate-fade-delay-1">
        <div className="card admin-chart">
          <div className="card-header">
            <div>
              <h3>Transaction Volume</h3>
              <p className="text-muted" style={{ fontSize: 13 }}>Last 7 days ($)</p>
            </div>
          </div>
          <div style={{ padding: '8px 20px 20px' }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#6C757D' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#6C757D' }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}k`} />
                <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ borderRadius: 10, fontSize: 13 }} />
                <Bar dataKey="volume" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card admin-chart">
          <div className="card-header">
            <div>
              <h3>User Growth</h3>
              <p className="text-muted" style={{ fontSize: 13 }}>Income vs Expenses</p>
            </div>
          </div>
          <div style={{ padding: '8px 20px 20px' }}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6C757D' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#6C757D' }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}k`} />
                <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ borderRadius: 10, fontSize: 13 }} />
                <Line type="monotone" dataKey="income" stroke="var(--success)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="expense" stroke="var(--danger)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* User Table */}
      <div className="card animate-fade-delay-2" style={{ marginTop: 20 }}>
        <div className="card-header">
          <div>
            <h3>User Management</h3>
            <p className="text-muted" style={{ fontSize: 13 }}>Manage and monitor all registered users</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="tx-search-wrap" style={{ width: 220 }}>
              <Search size={15} className="tx-search-icon" />
              <input className="tx-search" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-control" style={{ width: 160, padding: '8px 12px', fontSize: 13 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Users</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="verified">KYC Verified</option>
              <option value="pending">KYC Pending</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Account ID</th>
                <th>KYC Status</th>
                <th>Account Status</th>
                <th>Balance</th>
                <th>Transactions</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{ fontSize: 13, width: 36, height: 36 }}>
                        {u.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>{u.id}</span></td>
                  <td>
                    <span className={`badge ${u.kyc === 'verified' ? 'badge-success' : u.kyc === 'pending' ? 'badge-warning' : 'badge-secondary'}`}>
                      {u.kyc === 'verified' ? '✓ Verified' : u.kyc === 'pending' ? '⏳ Pending' : '✕ Unverified'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{u.status}</span>
                  </td>
                  <td><span style={{ fontWeight: 600, fontFamily: 'var(--font-display)', fontSize: 14 }}>{formatCurrency(u.balance)}</span></td>
                  <td><span style={{ fontWeight: 600 }}>{u.transactions}</span></td>
                  <td><span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{u.joined}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" title="View"><Eye size={14} /></button>
                      <button className="btn btn-ghost btn-sm" title="Edit"><Pencil size={14} /></button>
                      <button className={`btn btn-sm ${u.status === 'active' ? 'btn-danger' : 'btn-success'}`} style={{ fontSize: 11, padding: '4px 10px' }}>
                        {u.status === 'active' ? 'Suspend' : 'Restore'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-table-footer">
          <span>Showing {filtered.length} of {adminUsers.length} users</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-outline btn-sm">← Prev</button>
            <button className="btn btn-primary btn-sm">1</button>
            <button className="btn btn-outline btn-sm">2</button>
            <button className="btn btn-outline btn-sm">3</button>
            <button className="btn btn-outline btn-sm">Next →</button>
          </div>
        </div>
      </div>

      {/* System health */}
      <div className="admin-health-grid animate-fade-delay-3">
        {[
          { label: 'API Response Time', value: '42ms', status: 'healthy', percent: 95 },
          { label: 'Database Load', value: '23%', status: 'healthy', percent: 23 },
          { label: 'Transaction Queue', value: '12 pending', status: 'warning', percent: 40 },
          { label: 'Security Alerts', value: '0 critical', status: 'healthy', percent: 0 },
        ].map((h, i) => (
          <div key={i} className="card admin-health-card">
            <div className="admin-health-header">
              <span className="admin-health-label">{h.label}</span>
              <span className={`badge badge-${h.status === 'healthy' ? 'success' : 'warning'}`}>{h.status}</span>
            </div>
            <div className="admin-health-value">{h.value}</div>
            <div className="progress-bar" style={{ marginTop: 10 }}>
              <div className="progress-fill" style={{ width: `${h.percent}%`, background: h.status === 'healthy' ? 'var(--success)' : 'var(--warning)' }} />
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
