import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import './styles/global.css';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { KYCProvider } from './context/KYCContext';
import { WalletProvider } from './context/WalletContext';
import { NotificationProvider } from './context/NotificationContext';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';

const Landing          = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));
const LandingPage       = lazy(() => import('./pages/Landing').then(m => ({ default: m.LandingPage })));
const Login            = lazy(() => import('./pages/Auth').then(m => ({ default: m.Login })));
const Register         = lazy(() => import('./pages/Auth').then(m => ({ default: m.Register })));
const Verify2FA        = lazy(() => import('./pages/Auth').then(m => ({ default: m.Verify2FA })));
const KYCVerification  = lazy(() => import('./pages/KYC').then(m => ({ default: m.KYCVerification })));
const KYCStatus        = lazy(() => import('./pages/KYC').then(m => ({ default: m.KYCStatus })));
const KYCRouter        = lazy(() => import('./pages/KYC').then(m => ({ default: m.KYCRouter })));
const Dashboard        = lazy(() => import('./pages/Dashboard'));
const Transfer         = lazy(() => import('./pages/SendDeposit').then(m => ({ default: m.Transfer })));
const Deposit          = lazy(() => import('./pages/SendDeposit').then(m => ({ default: m.Deposit })));
const Withdraw         = lazy(() => import('./pages/SendDeposit').then(m => ({ default: m.Withdraw })));
const TransactionHistory = lazy(() => import('./pages/Transactions').then(m => ({ default: m.TransactionHistory })));
const TransactionDetails = lazy(() => import('./pages/Transactions').then(m => ({ default: m.TransactionDetails })));
const Notifications    = lazy(() => import('./pages/Misc').then(m => ({ default: m.Notifications })));
const Profile          = lazy(() => import('./pages/Misc').then(m => ({ default: m.Profile })));
const Settings         = lazy(() => import('./pages/Misc').then(m => ({ default: m.Settings })));
const Help             = lazy(() => import('./pages/Misc').then(m => ({ default: m.Help })));
const AdminDashboard   = lazy(() => import('./pages/Admin'));

function PageLoader() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg-light)',
    }}>
      <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
    </div>
  );
}

function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-light)', fontFamily: 'var(--font-body)',
      padding: 24, textAlign: 'center',
    }}>
      <div style={{ fontSize: 72, fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>404</div>
      <h2 style={{ marginTop: 16, marginBottom: 8, fontFamily: 'var(--font-display)' }}>Page not found</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 28 }}>The page you're looking for doesn't exist or was moved.</p>
      <a href="/" className="btn btn-primary">Go back home</a>
    </div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  // Scroll to top on every route change
  useEffect(() => { window.scrollTo(0, 0); }, [location.pathname]);

  return (
    <div key={location.pathname} className="page-fade">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/"                  element={<LandingPage />} />
          <Route path="/login"             element={<Login />} />
          <Route path="/register"          element={<Register />} />
          <Route path="/verify-2fa"        element={<Verify2FA />} />
          <Route path="/kyc"               element={<PrivateRoute><KYCRouter /></PrivateRoute>} />
          <Route path="/kyc-status"        element={<PrivateRoute><KYCStatus /></PrivateRoute>} />
          <Route path="/dashboard"         element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/transfer"           element={<PrivateRoute><Transfer /></PrivateRoute>} />
          <Route path="/deposit"           element={<PrivateRoute><Deposit /></PrivateRoute>} />
          <Route path="/withdraw"          element={<PrivateRoute><Withdraw /></PrivateRoute>} />
          <Route path="/transactions"      element={<PrivateRoute><TransactionHistory /></PrivateRoute>} />
          <Route path="/transactions/:id"  element={<PrivateRoute><TransactionDetails /></PrivateRoute>} />
          <Route path="/notifications"     element={<PrivateRoute><Notifications /></PrivateRoute>} />
          <Route path="/profile"           element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/settings"          element={<PrivateRoute><Settings /></PrivateRoute>} />
          <Route path="/help"              element={<PrivateRoute><Help /></PrivateRoute>} />
          <Route path="/admin"             element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
          <Route path="*"                  element={<NotFound />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <KYCProvider>
          <WalletProvider>
            <NotificationProvider>
              <ToastProvider>
                <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                  <AnimatedRoutes />
                </BrowserRouter>
              </ToastProvider>
            </NotificationProvider>
          </WalletProvider>
        </KYCProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
