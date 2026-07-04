import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from './AuthContext';

// kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected'
const KYCContext = createContext(null);

export function KYCProvider({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  
  // Initialize from localStorage cache to avoid showing banner on reload
  const [kycStatus, setKycStatus] = useState(() => {
    try {
      return localStorage.getItem('nv_kyc_status') || 'unverified';
    } catch {
      return 'unverified';
    }
  });
  
  const [kycDocuments, setKycDocuments] = useState(() => {
    try {
      const cached = localStorage.getItem('nv_kyc_documents');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [initializing, setInitializing] = useState(true); // Prevents banner flash on first load

  useEffect(() => {
    // Mark initialization as complete after a tick to allow cached state to render
    const timer = setTimeout(() => setInitializing(false), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Wait for auth to finish loading before attempting to load KYC
    if (authLoading) return;
    
    // If we've already loaded, don't load again
    if (hasLoaded) return;
    
    // Don't load if not authenticated
    if (!isAuthenticated) return;
    
    loadKycStatus();
  }, [isAuthenticated, hasLoaded, authLoading]);

  const loadKycStatus = async () => {
    if (loading) return; // Prevent multiple simultaneous calls
    
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.getKYCStatus();
      if (response.success) {
        setKycStatus(response.kycStatus || 'unverified');
        setKycDocuments(response.documents || []);
        setHasLoaded(true);
        // Cache the KYC status
        localStorage.setItem('nv_kyc_status', response.kycStatus || 'unverified');
        localStorage.setItem('nv_kyc_documents', JSON.stringify(response.documents || []));
        localStorage.setItem('nv_kyc_cache_time', new Date().toISOString());
      } else {
        throw new Error(response.message || 'Failed to load KYC status');
      }
    } catch (err) {
      console.error('Failed to load KYC status:', err);
      setError(err.message || 'Failed to load KYC status');

      // Fallback to localStorage for offline scenarios
      const cachedStatus = localStorage.getItem('nv_kyc_status') || 'unverified';
      const cachedDocuments = localStorage.getItem('nv_kyc_documents');

      setKycStatus(cachedStatus);
      if (cachedDocuments) {
        try {
          setKycDocuments(JSON.parse(cachedDocuments));
        } catch {
          setKycDocuments([]);
        }
      }
      setHasLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const submitKYC = async (formData) => {
    try {
      setLoading(true);
      setError(null);

      // Validate formData
      if (!formData || typeof formData !== 'object') {
        throw new Error('Invalid form data provided');
      }

      // Upload documents
      const uploadPromises = [];

      if (formData.idDocument) {
        uploadPromises.push(
          apiClient.uploadKYCDocument('id', formData.idDocument)
        );
      }

      if (formData.passportDocument) {
        uploadPromises.push(
          apiClient.uploadKYCDocument('passport', formData.passportDocument)
        );
      }

      if (formData.selfie) {
        uploadPromises.push(
          apiClient.uploadKYCDocument('selfie', formData.selfie)
        );
      }

      if (formData.addressProof) {
        uploadPromises.push(
          apiClient.uploadKYCDocument('address_proof', formData.addressProof)
        );
      }

      const results = await Promise.all(uploadPromises);

      // Check if all uploads were successful
      const failedUploads = results.filter(r => !r.success);
      if (failedUploads.length > 0) {
        throw new Error(`Failed to upload ${failedUploads.length} document(s). Please check your files and try again.`);
      }

      // Reload KYC status
      await loadKycStatus();

      return { success: true };
    } catch (err) {
      const errorMsg = err.message || 'Failed to submit KYC';
      setError(errorMsg);
      console.error('KYC submission error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshKycStatus = async () => {
    await loadKycStatus();
  };

  return (
    <KYCContext.Provider value={{
      kycStatus,
      kycDocuments,
      loading,
      error,
      initializing,
      submitKYC,
      refreshKycStatus,
      loadKycStatus,
    }}>
      {children}
    </KYCContext.Provider>
  );
}

export function useKYC() {
  const ctx = useContext(KYCContext);
  if (!ctx) throw new Error('useKYC must be used within KYCProvider');
  return ctx;
}
