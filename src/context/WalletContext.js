import React, { createContext, useContext, useState, useEffect } from 'react';
import { currentUser, transactions as initialTx } from '../data/mockData';

const WalletContext = createContext(null);

const STORAGE_KEY = 'nv_wallet';

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
}

export function WalletProvider({ children }) {
  const saved = loadState();
  const [balance, setBalance] = useState(saved?.balance ?? currentUser.balance);
  const [transactions, setTransactions] = useState(saved?.transactions ?? initialTx);
  const [hideBalance, setHideBalance] = useState(saved?.hideBalance ?? false);

  // Persist to localStorage whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ balance, transactions, hideBalance }));
    } catch {}
  }, [balance, transactions, hideBalance]);

  const addTransaction = (tx) => setTransactions(prev => [tx, ...prev]);

  const deposit = (amount, method, reference) => {
    setBalance(b => b + amount);
    addTransaction({
      id: reference, type: 'credit', category: 'deposit',
      description: `Deposit via ${method}`, amount, currency: 'USD',
      date: new Date().toISOString(),
      status: method === 'Bank Transfer' ? 'pending' : 'completed',
      from: method, to: 'My Wallet', reference, fee: 0, note: '',
    });
  };

  const transfer = (amount, recipientName, recipientEmail, note, reference) => {
    const fee = 0.50;
    setBalance(b => b - amount - fee);
    addTransaction({
      id: reference, type: 'debit', category: 'transfer',
      description: `Transfer to ${recipientName}`, amount, currency: 'USD',
      date: new Date().toISOString(), status: 'completed',
      from: 'My Wallet', to: recipientName, reference, fee, note: note || '',
    });
  };

  const withdraw = (amount, bankName, accountNumber, reference) => {
    setBalance(b => b - amount);
    addTransaction({
      id: reference, type: 'debit', category: 'withdrawal',
      description: `Withdrawal to ${bankName}`, amount, currency: 'USD',
      date: new Date().toISOString(), status: 'pending',
      from: 'My Wallet', to: `${bankName} ••••${accountNumber.slice(-4)}`,
      reference, fee: 0, note: '',
    });
  };

  const resetWallet = () => {
    setBalance(currentUser.balance);
    setTransactions(initialTx);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <WalletContext.Provider value={{ balance, transactions, hideBalance, setHideBalance, deposit, transfer, withdraw, resetWallet }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}
