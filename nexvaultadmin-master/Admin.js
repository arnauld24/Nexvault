import React from 'react';
import AdminDashboard from './src/pages/AdminDashboard';
import { adminUsers } from './src/data/mockData';

export default function RootAdminDashboard() {
  return <AdminDashboard initialUsers={adminUsers} />;
}
