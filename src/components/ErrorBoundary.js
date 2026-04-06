import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: 24,
          fontFamily: 'var(--font-body)', background: 'var(--bg-light)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ marginBottom: 8, fontFamily: 'var(--font-display)' }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24, textAlign: 'center', maxWidth: 400 }}>
            An unexpected error occurred. Please refresh the page or go back to the dashboard.
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn btn-outline"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </button>
            <button
              className="btn btn-primary"
              onClick={() => { this.setState({ hasError: false }); window.location.href = '/dashboard'; }}
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
