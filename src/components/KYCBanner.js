import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Clock, X, ArrowRight, AlertTriangle } from 'lucide-react';
import { useKYC } from '../context/KYCContext';

export default function KYCBanner() {
  const { kycStatus } = useKYC();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (kycStatus === 'verified' || dismissed) return null;

  if (kycStatus === 'pending') {
    return (
      <div className="kyc-banner kyc-banner-pending">
        <div className="kyc-banner-icon"><Clock size={18} /></div>
        <div className="kyc-banner-text">
          <span className="kyc-banner-title">Verification under review</span>
          <span className="kyc-banner-sub">We're reviewing your documents. This usually takes 1–2 business days.</span>
        </div>
        <button className="kyc-banner-dismiss" onClick={() => setDismissed(true)} aria-label="Dismiss">
          <X size={16} />
        </button>
      </div>
    );
  }

  // unverified
  return (
    <div className="kyc-banner kyc-banner-unverified">
      <div className="kyc-banner-icon"><AlertTriangle size={18} /></div>
      <div className="kyc-banner-text">
        <span className="kyc-banner-title">Verify your identity to start transacting</span>
        <span className="kyc-banner-sub">You can explore your dashboard, but sending and depositing requires KYC verification.</span>
      </div>
      <button className="kyc-banner-cta" onClick={() => navigate('/kyc')}>
        Verify Now <ArrowRight size={14} />
      </button>
      <button className="kyc-banner-dismiss" onClick={() => setDismissed(true)} aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  );
}

export function KYCGate({ children }) {
  const { kycStatus } = useKYC();
  const navigate = useNavigate();

  if (kycStatus === 'verified') return children;

  return (
    <div className="kyc-gate animate-fade">
      <div className="kyc-gate-icon">
        <ShieldCheck size={40} />
      </div>
      <h2>Identity Verification Required</h2>
      <p>
        {kycStatus === 'pending'
          ? 'Your verification is currently under review. You\'ll be able to transact once it\'s approved — usually within 1–2 business days.'
          : 'To send money, make deposits, and access all features, you need to verify your identity first. It only takes a few minutes.'}
      </p>
      {kycStatus === 'unverified' && (
        <div className="kyc-gate-features">
          <div className="kyc-gate-feature">
            <ShieldCheck size={16} /> Secure document upload
          </div>
          <div className="kyc-gate-feature">
            <ShieldCheck size={16} /> Takes 3–5 minutes
          </div>
          <div className="kyc-gate-feature">
            <ShieldCheck size={16} /> Unlocks all features
          </div>
        </div>
      )}
      <div className="kyc-gate-actions">
        {kycStatus === 'unverified' && (
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/kyc')}>
            Start Verification <ArrowRight size={16} />
          </button>
        )}
        <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
