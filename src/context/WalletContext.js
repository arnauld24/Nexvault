import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useAuth } from './AuthContext';

const WalletContext = createContext(null);

const STORAGE_KEY = 'nv_wallet';

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

function genRef(prefix) {
  return `${prefix}-${Date.now().toString().slice(-8)}`;
}

export function WalletProvider({ children }) {
  const saved = loadState();
  const { isAuthenticated } = useAuth();
  const [balance, setBalance] = useState(0); // Start with 0, fetch from API
  const [transactions, setTransactions] = useState([]); // Start with empty, fetch from API
  const [hideBalance, setHideBalance] = useState(saved?.hideBalance ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Persist wallet state locally while keeping real service sync available
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ hideBalance }));
    } catch {}
  }, [hideBalance]);

  useEffect(() => {
    if (!isAuthenticated) return;
    refreshWallet();
  }, [isAuthenticated]);

  const addTransaction = (tx) => setTransactions(prev => [tx, ...prev]);

  const refreshWallet = async () => {
    setLoading(true);
    setError(null);
    try {
      const balanceResponse = await apiClient.getWalletBalance();
      
      if (balanceResponse.success && balanceResponse.balance !== undefined) {
        const rawBalance = balanceResponse.balance;
        const numericBalance = typeof rawBalance === 'string' ? parseFloat(rawBalance) : Number(rawBalance);
        
        if (!isNaN(numericBalance)) {
          setBalance(numericBalance);
        }
      }

      const historyResponse = await apiClient.getTransactionHistory(50, 0);
      if (historyResponse.success && Array.isArray(historyResponse.transactions)) {
        const normalized = historyResponse.transactions.map(tx => {
          const normalizedType = tx.type ||
            (tx.category === 'deposit' ? 'credit' :
             tx.category === 'withdrawal' ? 'debit' :
             tx.category === 'transfer' ? 'debit' :
             tx.type);

          return {
            ...tx,
            type: normalizedType,
            currency: tx.currency || 'XAF',
            amount: typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount,
          };
        });
        setTransactions(normalized);
      }
    } catch (err) {
      console.error('Failed to refresh wallet data:', err);
      setError(err.message || 'Unable to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const deposit = async (amount, method, reference) => {
    const response = await apiClient.deposit(amount, method, 'XAF', reference);
    if (!response.success) {
      throw new Error(response.message || 'Deposit failed');
    }

    const tx = response.transaction || {
      id: response.reference || reference || genRef('DEP'),
      type: 'credit',
      category: 'deposit',
      description: `Deposit via ${method}`,
      amount,
      currency: response.currency || 'XAF',
      date: new Date().toISOString(),
      status: response.status || (method === 'bank' ? 'pending' : 'completed'),
      from: method,
      to: 'My Wallet',
      reference: response.reference || reference,
      fee: response.fee ?? 0,
      note: response.note || '',
    };

    const newBalance = typeof response.balance === 'string' ? parseFloat(response.balance) : response.balance;
    if (typeof newBalance === 'number' && !isNaN(newBalance)) {
      setBalance(newBalance);
    } else {
      setBalance(b => b + amount);
    }

    addTransaction(tx);
    return response;
  };

  const transfer = async (amount, recipientName, recipientEmail, note) => {
    const response = await apiClient.transfer(recipientEmail, amount, note, 'XAF');
    if (!response.success) {
      throw new Error(response.message || 'Transfer failed');
    }

    const txRef = response.transaction?.reference || response.reference || genRef('TRF');
    const tx = response.transaction || {
      id: txRef,
      type: 'debit',
      category: 'transfer',
      description: `Transfer to ${recipientName}`,
      amount,
      currency: response.currency || 'XAF',
      date: new Date().toISOString(),
      status: response.status || 'completed',
      from: 'My Wallet',
      to: recipientName,
      reference: txRef,
      fee: response.fee ?? 0.50,
      note: note || '',
    };

    if (typeof response.balance === 'number') {
      setBalance(response.balance);
    } else {
      setBalance(b => b - amount - tx.fee);
    }

    addTransaction(tx);
    return response;
  };

  const withdraw = async (amount, bankName, accountNumber) => {
    const bankDetails = { bankName, accountNumber };
    const response = await apiClient.withdraw(amount, bankDetails, 'XAF');
    if (!response.success) {
      throw new Error(response.message || 'Withdrawal failed');
    }

    const txRef = response.transaction?.reference || response.reference || genRef('WDR');
    const tx = response.transaction || {
      id: txRef,
      type: 'debit',
      category: 'withdrawal',
      description: `Withdrawal to ${bankName}`,
      amount,
      currency: response.currency || 'XAF',
      date: new Date().toISOString(),
      status: response.status || 'pending',
      from: 'My Wallet',
      to: `${bankName} ••••${accountNumber.slice(-4)}`,
      reference: txRef,
      fee: response.fee ?? 0,
      note: response.note || '',
    };

    if (typeof response.balance === 'number') {
      setBalance(response.balance);
    } else {
      setBalance(b => b - amount);
    }

    addTransaction(tx);
    return response;
  };

  const resetWallet = () => {
    setBalance(0);
    setTransactions([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <WalletContext.Provider value={{
      balance,
      transactions,
      hideBalance,
      loading,
      error,
      setHideBalance,
      deposit,
      transfer,
      withdraw,
      refreshWallet,
      resetWallet,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
