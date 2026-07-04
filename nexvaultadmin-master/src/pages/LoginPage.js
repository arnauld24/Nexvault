import React, { useEffect, useState } from 'react';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage({ onLoginSuccess }) {
  const apiUrl = (process.env.REACT_APP_API_URL || 'http://localhost:3001').replace(/\/+$/, '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authServerOnline, setAuthServerOnline] = useState(true);

  useEffect(() => {
    const checkAuthServer = async () => {
      try {
        const response = await fetch(`${apiUrl}/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await response.json();
        setAuthServerOnline(response.ok && data?.success === true);
      } catch {
        setAuthServerOnline(false);
      }
    };

    checkAuthServer();
  }, [apiUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) { setError('Please enter your administrator email address.'); return; }
    if (!password) { setError('Please enter your access password.'); return; }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setError('Please enter a valid email address.'); return; }

    setIsLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/auth/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          deviceName: 'Admin Dashboard',
          deviceType: 'desktop',
        }),
      });

      const rawResponse = await response.text();
      let result = null;
      try {
        result = JSON.parse(rawResponse);
      } catch (parseError) {
        result = null;
      }

      setIsLoading(false);

      if (!response.ok) {
        if (response.status === 404) {
          setError(`Admin login endpoint not found at ${apiUrl}/api/auth/admin/login. Confirm auth service is running on port ${new URL(apiUrl).port || '3001'} and configured to serve /api/auth/admin/login.`);
          return;
        }

        const message = result?.message || `Auth server returned ${response.status} ${response.statusText}`;
        setError(message);
        return;
      }

      if (!result?.success) {
        setError(result?.message || 'Login failed. Please verify your credentials.');
        return;
      }

      const adminUser = {
        id: result.admin?.id,
        email: result.admin?.email,
        name: `${result.admin?.firstName || ''} ${result.admin?.lastName || ''}`.trim() || result.admin?.email,
        role: result.admin?.role || 'admin',
      };

      onLoginSuccess({
        adminUser,
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (fetchError) {
      setIsLoading(false);
      setError(
        fetchError.message?.includes('Failed to fetch')
          ? 'Unable to reach the auth server. Please check your backend and try again.'
          : fetchError.message || 'An unexpected error occurred during login.'
      );
    }
  };

  return (
    <div style={styles.container}>
      <div style={{ ...styles.glowNode, ...styles.glowTop }} />
      <div style={{ ...styles.glowNode, ...styles.glowBottom }} />

      <div className="card animate-fade" style={styles.card}>
        <div style={styles.header}>
          <div className="pulse-glow-effect" style={styles.logoWrapper}>
            <ShieldCheck size={32} style={styles.logoIcon} />
          </div>
          <h2 style={styles.title}>Welcome Back</h2>
          <p style={styles.subtitle}>Enter credentials to access the console</p>
        </div>

        {authServerOnline === false && (
          <div style={styles.alert}>
            <AlertCircle size={18} style={styles.alertIcon} />
            <span>
              Auth service is not reachable at {apiUrl}. Start the auth backend on that port or update REACT_APP_API_URL in your admin `.env`.
            </span>
          </div>
        )}

        {error && (
          <div style={styles.alert}>
            <AlertCircle size={18} style={styles.alertIcon} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="form-group">
            <label className="form-label" style={styles.label}>Email Address</label>
            <div style={styles.inputWrap}>
              <Mail size={16} style={styles.inputIcon} />
              <input
                type="email"
                className="form-control"
                placeholder="admin@nexvault.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                style={styles.input}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <div style={styles.passwordHeader}>
              <label className="form-label" style={styles.label}>Access Password</label>
              <a href="#forgot" onClick={(e) => e.preventDefault()} style={styles.forgotLink}>Forgot password?</a>
            </div>
            <div style={styles.inputWrap}>
              <Lock size={16} style={styles.inputIcon} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                style={styles.input}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.showPassBtn}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={styles.submitBtn} disabled={isLoading}>
            {isLoading ? (
              <span style={styles.loaderRow}>
                <span className="btn-spinner" /> Authenticating admin...
              </span>
            ) : 'Sign In to Dashboard'}
          </button>
        </form>

        <div style={styles.footer}>
          <span style={styles.footerText}>Secure 256-bit SSL encrypted connection.</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'relative',
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#090d16',
    padding: '24px',
    overflow: 'hidden',
    fontFamily: "'Inter', sans-serif",
  },
  glowNode: { position: 'absolute', borderRadius: '50%', filter: 'blur(100px)', pointerEvents: 'none' },
  glowTop: { top: '-10%', left: '20%', width: '350px', height: '350px', background: 'rgba(79, 70, 229, 0.25)' },
  glowBottom: { bottom: '-10%', right: '20%', width: '400px', height: '400px', background: 'rgba(16, 185, 129, 0.15)' },
  card: {
    width: '100%',
    maxWidth: '430px',
    background: 'rgba(17, 24, 39, 0.7)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    padding: '40px 32px',
    borderRadius: '20px',
    zIndex: 10,
  },
  header: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px', textAlign: 'center' },
  logoWrapper: {
    width: '60px',
    height: '60px',
    background: 'rgba(79, 70, 229, 0.15)',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1.5px solid rgba(79, 70, 229, 0.3)',
    marginBottom: '16px',
  },
  logoIcon: { color: '#818cf8' },
  title: { fontFamily: "'Outfit', sans-serif", fontSize: '24px', fontWeight: 700, color: '#ffffff', marginBottom: '6px' },
  subtitle: { fontSize: '13px', color: '#94a3b8' },
  alert: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1.5px solid rgba(239, 68, 68, 0.25)',
    color: '#fca5a5',
    padding: '12px 16px',
    borderRadius: '10px',
    fontSize: '12.5px',
    fontWeight: 500,
    marginBottom: '22px',
    lineHeight: '1.4',
  },
  alertIcon: { flexShrink: 0, marginTop: '1px' },
  form: { width: '100%' },
  label: { color: '#94a3b8', fontSize: '11px', fontWeight: '700', letterSpacing: '0.08em' },
  inputWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: { position: 'absolute', left: '14px', color: '#64748b', pointerEvents: 'none' },
  input: { paddingLeft: '42px', paddingRight: '42px', height: '46px', background: 'rgba(15, 23, 42, 0.6)', border: '1.5px solid rgba(255, 255, 255, 0.08)', color: '#ffffff', fontSize: '14px' },
  passwordHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' },
  forgotLink: { fontSize: '12px', color: '#818cf8', textDecoration: 'none', fontWeight: '500' },
  showPassBtn: { position: 'absolute', right: '14px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 },
  submitBtn: { width: '100%', height: '46px', fontSize: '14.5px', fontWeight: '600', marginTop: '8px' },
  loaderRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  footer: { marginTop: '28px', textAlign: 'center' },
  footerText: { fontSize: '11px', color: '#475569' },
};

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    .btn-spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; }
    .form-control:focus { border-color: #0056B3 !important; box-shadow: 0 0 0 3px rgba(0, 86, 179, 0.2) !important; }
  `;
  document.head.appendChild(style);
}
