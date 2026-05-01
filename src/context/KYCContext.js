import React, { createContext, useContext, useState } from 'react';

// kycStatus: 'unverified' | 'pending' | 'verified'
const KYCContext = createContext(null);

export function KYCProvider({ children }) {
  const [kycStatus, setKycStatus] = useState(() => {
    return localStorage.getItem('nv_kyc_status') || 'unverified';
  });

  const submitKYC = () => {
    localStorage.setItem('nv_kyc_status', 'pending');
    setKycStatus('pending');
  };

  const approveKYC = () => {
    localStorage.setItem('nv_kyc_status', 'verified');
    setKycStatus('verified');
  };

  const resetKYC = () => {
    localStorage.setItem('nv_kyc_status', 'unverified');
    setKycStatus('unverified');
  };

  return (
    <KYCContext.Provider value={{ kycStatus, submitKYC, approveKYC, resetKYC }}>
      {children}
    </KYCContext.Provider>
  );
}

export function useKYC() {
  const ctx = useContext(KYCContext);
  if (!ctx) throw new Error('useKYC must be used within KYCProvider');
  return ctx;
}
