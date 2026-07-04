import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function DashboardLayout({ children, activeTab, setActiveTab, user, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggle = () => setSidebarOpen(o => !o);
  const close  = () => setSidebarOpen(false);

  return (
    <div className="app-container">

      <div className={`sidebar-wrapper${sidebarOpen ? ' is-open' : ''}`}>
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => { setActiveTab(tab); close(); }}
          user={user}
          onLogout={onLogout}
        />
      </div>

      <div
        className={`layout-backdrop${sidebarOpen ? ' is-open' : ''}`}
        onClick={close}
      />

      <div className="main-wrapper">
        <Navbar
          onMenuToggle={toggle}
          activeTab={activeTab}
          user={user}
          setActiveTab={setActiveTab}
        />
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
