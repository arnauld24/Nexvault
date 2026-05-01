import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from './AuthContext';

// kycStatus: 'unverified' | 'pending' | 'verified' | 'rejected'
const KYCContext = createContext(null);

export function KYCProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [kycStatus, setKycStatus] = useState('unverified');
  const [kycDocuments, setKycDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadKycStatus();
  }, [isAuthenticated]);

  const loadKycStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.getKYCStatus();
      if (response.success) {
        setKycStatus(response.kycStatus || 'unverified');
        setKycDocuments(response.documents || []);
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
    } finally {
      setLoading(false);
    }
  };

  const submitKYC = async (formData) => {
    try {
      setLoading(true);
      setError(null);

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
