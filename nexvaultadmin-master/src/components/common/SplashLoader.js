import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';

const steps = [
  { threshold: 15, text: 'Connecting secure API tunnels...' },
  { threshold: 40, text: 'Synchronizing relational databases...' },
  { threshold: 65, text: 'Verifying active session handshakes...' },
  { threshold: 85, text: 'Caching dashboard charts & cards...' },
  { threshold: 95, text: 'Preparing workspace...' },
];

export default function SplashLoader({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Initializing system security...');

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => { if (onComplete) onComplete(); }, 450);
          return 100;
        }
        const nextVal = Math.min(prev + Math.floor(Math.random() * 8) + 4, 100);
        const matchingStep = steps.find(s => nextVal >= s.threshold);
        if (matchingStep) setStatusText(matchingStep.text);
        return nextVal;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.glow} />
        <div style={styles.iconWrapper}>
          <div style={styles.spinner} />
          <ShieldCheck size={44} style={styles.icon} />
        </div>
        <h1 style={styles.title}>NEXVAULT<span style={styles.gradientText}>.</span></h1>
        <p style={styles.subtitle}>Nexvault Admin Console v1.0.0</p>
        <div style={styles.progressContainer}>
          <div style={{ ...styles.progressFill, width: `${progress}%` }} />
        </div>
        <div style={styles.statusRow}>
          <span style={styles.status}>{statusText}</span>
          <span style={styles.percent}>{progress}%</span>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'radial-gradient(circle at center, #0f172a 0%, #020617 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    fontFamily: "'Inter', sans-serif",
  },
  content: { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '320px', textAlign: 'center' },
  glow: { position: 'absolute', top: '-40px', width: '180px', height: '180px', background: 'rgba(79, 70, 229, 0.15)', filter: 'blur(40px)', borderRadius: '50%', pointerEvents: 'none' },
  iconWrapper: { position: 'relative', width: '84px', height: '84px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' },
  spinner: { position: 'absolute', width: '80px', height: '80px', borderRadius: '50%', border: '3px solid transparent', borderTopColor: '#4f46e5', borderRightColor: '#6366f1', animation: 'spin 1.2s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite' },
  icon: { color: '#818cf8', filter: 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.5))' },
  title: { fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 800, color: '#ffffff', letterSpacing: '0.15em', marginBottom: '4px' },
  gradientText: { color: '#6366f1' },
  subtitle: { fontSize: '11px', fontWeight: 600, color: '#64748b', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '40px' },
  progressContainer: { width: '100%', height: '4px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '999px', overflow: 'hidden', marginBottom: '12px' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #4f46e5 0%, #818cf8 100%)', borderRadius: '999px', transition: 'width 0.1s ease', boxShadow: '0 0 8px rgba(99, 102, 241, 0.6)' },
  statusRow: { width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 500 },
  status: { color: '#94a3b8' },
  percent: { fontFamily: "'Fira Code', monospace", color: '#818cf8', fontWeight: '600' },
};

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}
