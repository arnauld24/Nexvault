import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx.toast;
}

const COLORS = {
  success: { bg: '#f0fdf4', border: '#bbf7d0', icon: '#16a34a', text: '#15803d' },
  error:   { bg: '#fef2f2', border: '#fecaca', icon: '#dc2626', text: '#b91c1c' },
  warning: { bg: '#fffbeb', border: '#fde68a', icon: '#d97706', text: '#b45309' },
  info:    { bg: '#eff6ff', border: '#bfdbfe', icon: '#2563eb', text: '#1d4ed8' },
};

const ICONS = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

function ToastItem({ t, onDismiss }) {
  const c = COLORS[t.type] || COLORS.info;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 12, padding: '12px 14px',
      minWidth: 280, maxWidth: 360,
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      animation: 'toastIn 0.25s ease',
      fontFamily: 'var(--font-body)',
      pointerEvents: 'all',
    }}>
      <span style={{
        width: 22, height: 22, borderRadius: '50%',
        background: c.icon, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1,
      }}>
        {ICONS[t.type]}
      </span>
      <span style={{ flex: 1, fontSize: 14, color: c.text, lineHeight: 1.5 }}>
        {t.message}
      </span>
      <button onClick={() => onDismiss(t.id)} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: c.icon, fontSize: 18, lineHeight: 1,
        padding: 0, opacity: 0.6, flexShrink: 0,
      }}>×</button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => dismiss(id), duration);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24,
          display: 'flex', flexDirection: 'column', gap: 10,
          zIndex: 9999, pointerEvents: 'none',
        }}>
          {toasts.map(t => <ToastItem key={t.id} t={t} onDismiss={dismiss} />)}
        </div>
      )}
    </ToastContext.Provider>
  );
}
