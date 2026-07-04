import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, ArrowLeft, ArrowLeftRight, Landmark, CreditCard,
  Lock, Wallet, ArrowRight, ArrowUpFromLine,
  User, Search, ChevronDown, Info, Copy, Shield,
  AlertCircle, Clock, Zap, BadgeCheck, Smartphone,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { KYCGate } from '../components/KYCBanner';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import { formatCurrency } from '../utils/formatters';
import './SendDeposit.css';

const CONTACT_COLORS = ['#f59e0b', '#10b981', '#6366f1', '#ef4444', '#8b5cf6', '#0ea5e9', '#f97316'];

function getInitials(name, email) {
  if (!name || name === email) {
    return email.split('@')[0].slice(0, 2).toUpperCase();
  }
  return name.split(' ').filter(Boolean).slice(0, 2).map(word => word[0].toUpperCase()).join('');
}

function getContactColor(seed) {
  const hash = [...seed].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CONTACT_COLORS[hash % CONTACT_COLORS.length];
}

function calculateWithdrawalFee(amount) {
  const tiers = [
    { max: 10000, percentage: 0.030 },
    { max: 50000, percentage: 0.041 },
    { max: 200000, percentage: 0.040 },
    { max: Infinity, percentage: 0.045 },
  ];
  const tier = tiers.find(t => amount <= t.max) || tiers[tiers.length - 1];
  const percentageFee = Math.round(amount * tier.percentage);
  const fixedFee = 10;
  return {
    amount,
    fixedFee,
    percentageFee,
    total: fixedFee + percentageFee,
  };
}

/* ─── Shared success screen ─── */
function SuccessScreen({ title, subtitle, amount, reference, status, onViewTx, onAgain, againLabel }) {
  return (
    <div className="fin-success animate-fade">
      <div className="fin-success-ring">
        <div className="fin-success-circle">
          <CheckCircle size={36} strokeWidth={2} />
        </div>
      </div>
      <h2>{title}</h2>
      <p>{subtitle}</p>
      <div className="fin-success-amount">{amount}</div>
      {status === 'pending' && (
        <div className="fin-success-status">
          <Clock size={14} /> Processing — please check within 1–5 minutes
        </div>
      )}
      <div className="fin-success-ref">
        <span>Reference</span>
        <span className="fin-ref-code">{reference}</span>
        <button className="fin-ref-copy" onClick={() => navigator.clipboard?.writeText(reference)} aria-label="Copy">
          <Copy size={13} />
        </button>
      </div>
      <div className="fin-success-actions">
        <button className="btn btn-outline" onClick={onViewTx}>View Transaction</button>
        <button className="btn btn-primary" onClick={onAgain}>{againLabel}</button>
      </div>
    </div>
  );
}

/* ─── Amount input ─── */
function AmountInput({ value, onChange, balance, quickAmounts, min = 0 }) {
  return (
    <div className="fin-amount-block">
      <div className="fin-amount-input-wrap">
        <div className="fin-currency-badge">
          <span className="fin-currency-flag">cm</span>
          <span>FCFA</span>
          <ChevronDown size={14} />
        </div>
        <input
          type="number"
          className="fin-amount-input"
          placeholder="100.00"
          value={value}
          onChange={e => onChange(e.target.value)}
          min={min}
        />
      </div>
      <div className="fin-amount-meta">
        <span className="fin-amount-balance">
          <Wallet size={13} /> Available: <strong>{formatCurrency(balance)}</strong>
        </span>
        {value && parseFloat(value) > 0 && (
          <span className="fin-amoun">≈ {formatCurrency(parseFloat(value))}</span>
        )}
      </div>
      <div className="fin-quick-amounts">
        {quickAmounts.map(v => (
          <button key={v} className={`fin-quick-btn ${value === String(v) ? 'active' : ''}`} onClick={() => onChange(String(v))}>
            {v} FCFA
          </button>
        ))}
        <button className={`fin-quick-btn ${value === String(balance) ? 'active' : ''}`} onClick={() => onChange(String(balance))}>
          Max
        </button>
      </div>
    </div>
  );
}

/* ─── TRANSFER ─── */
export function Transfer() {
  const navigate = useNavigate();
  const { balance, transfer } = useWallet();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [form, setForm] = useState({ recipient: '', amount: '', note: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const recipientContact = contacts.find(c => c.id === selected);
  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );
  const fee = 0.50;
  const total = (parseFloat(form.amount) || 0) + fee;

  useEffect(() => {
    const timer = setTimeout(() => {
      const fetchUsers = async () => {
        setLoadingContacts(true);
        setSearchError(null);

        try {
          const response = await apiClient.searchUsers(search);
          if (response.success && Array.isArray(response.users)) {
            setContacts(response.users.map(user => ({
              id: user.id,
              email: user.email,
              name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
              initials: getInitials(`${user.firstName || ''} ${user.lastName || ''}`.trim(), user.email),
              color: getContactColor(user.email),
            })));
          } else {
            setContacts([]);
            setSearchError(response.message || 'Unable to search recipients');
          }
        } catch (error) {
          setContacts([]);
          setSearchError(error.message || 'Unable to search recipients');
        } finally {
          setLoadingContacts(false);
        }
      };

      fetchUsers();
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await transfer(
        parseFloat(form.amount),
        recipientContact?.name || form.recipient,
        form.recipient,
        form.note
      );
      setResult(res);
      toast('Transfer sent successfully!', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (result) return (
    <DashboardLayout>
      <SuccessScreen
        title="Transfer Successful"
        subtitle={`Sent to ${recipientContact?.name || form.recipient}`}
        amount={formatCurrency(parseFloat(form.amount) || 0)}
        reference={result.reference}
        status={result.status}
        onViewTx={() => navigate('/transactions')}
        onAgain={() => { setResult(null); setStep(1); setForm({ recipient: '', amount: '', note: '' }); setSelected(null); }}
        againLabel="New Transfer"
      />
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <KYCGate>
        <div className="fin-page">
          <div className="fin-page-header">
            <div className="fin-page-title">
              <div className="fin-page-icon" style={{ background: '#e8f0fb', color: 'var(--primary)' }}>
                <ArrowLeftRight size={20} />
              </div>
              <div>
                <h1>Transfer</h1>
                <p>Send money to another NexVault user instantly</p>
              </div>
            </div>
            <div className="fin-balance-pill"><Wallet size={14} /><span>{formatCurrency(balance)}</span></div>
          </div>

          <div className="fin-steps">
            {['Recipient', 'Amount', 'Review'].map((s, i) => (
              <div key={i} className={`fin-step ${step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}`}>
                <div className="fin-step-dot">{step > i + 1 ? <CheckCircle size={14} /> : <span>{i + 1}</span>}</div>
                <span>{s}</span>
                {i < 2 && <div className="fin-step-line" />}
              </div>
            ))}
          </div>

          <div className="fin-layout">
            <div className="fin-main">
              {step === 1 && (
                <div className="fin-card animate-fade">
                  <div className="fin-card-title">Select Recipient</div>
                  <div className="fin-search-wrap">
                    <Search size={15} className="fin-search-icon" />
                    <input className="fin-search" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
                  </div>
                  <div className="fin-contacts">
                    {filtered.map(c => (
                      <button key={c.id} className={`fin-contact ${selected === c.id ? 'selected' : ''}`}
                        onClick={() => { setSelected(c.id); setForm(f => ({ ...f, recipient: c.email })); }}>
                        <div className="fin-contact-avatar" style={{ background: c.color }}>{c.initials}</div>
                        <div className="fin-contact-info">
                          <div className="fin-contact-name">{c.name}</div>
                          <div className="fin-contact-sub">{c.email}</div>
                        </div>
                        {selected === c.id && <div className="fin-contact-check"><CheckCircle size={16} /></div>}
                      </button>
                    ))}
                    {loadingContacts && (
                      <div className="fin-contact-empty">Searching for recipients...</div>
                    )}
                    {!loadingContacts && searchError && (
                      <div className="fin-contact-empty text-danger">{searchError}</div>
                    )}
                    {!loadingContacts && !searchError && filtered.length === 0 && (
                      <div className="fin-contact-empty">No recipients found. Try another name or email, or enter manually.</div>
                    )}
                  </div>
                  <div className="fin-divider-label">or enter manually</div>
                  <div className="form-group">
                    <label className="form-label">NexVault Email or ID</label>
                    <input className="form-control" placeholder="user@nexvault.io" value={form.recipient}
                      onChange={e => { setForm(f => ({ ...f, recipient: e.target.value })); setSelected(null); }} />
                  </div>
                  <button className="btn btn-primary btn-full fin-next-btn" onClick={() => setStep(2)} disabled={!form.recipient}>
                    Continue <ArrowRight size={16} />
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="fin-card animate-fade">
                  <button className="fin-back-btn" onClick={() => setStep(1)}><ArrowLeft size={15} /> Back</button>
                  <div className="fin-card-title">Enter Amount</div>
                  <div className="fin-recipient-pill">
                    <div className="fin-contact-avatar" style={{ background: recipientContact?.color || '#6366f1', width: 32, height: 32, fontSize: 12 }}>
                      {recipientContact?.initials || <User size={14} />}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{recipientContact?.name || form.recipient}</div>
                      {recipientContact && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{recipientContact.email}</div>}
                    </div>
                    <BadgeCheck size={16} style={{ color: 'var(--success)', marginLeft: 'auto' }} />
                  </div>
                  <AmountInput value={form.amount} onChange={v => setForm(f => ({ ...f, amount: v }))} balance={balance} quickAmounts={[100, 200, 500, 1000]} />
                  <div className="form-group" style={{ marginTop: 16 }}>
                    <label className="form-label">Note <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                    <input className="form-control" placeholder="What's this for?" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
                  </div>
                  <div className="fin-fee-row">
                    <span><Info size={13} /> Transfer fee</span>
                    <span className="fin-fee-value">{formatCurrency(fee)}</span>
                  </div>
                  <button className="btn btn-primary btn-full fin-next-btn" onClick={() => setStep(3)}
                    disabled={!form.amount || parseFloat(form.amount) <= 0 || parseFloat(form.amount) + fee > balance}>
                    Review Transfer <ArrowRight size={16} />
                  </button>
                  {parseFloat(form.amount) + fee > balance && (
                    <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8, textAlign: 'center' }}>Insufficient balance</p>
                  )}
                </div>
              )}

              {step === 3 && (
                <div className="fin-card animate-fade">
                  <button className="fin-back-btn" onClick={() => setStep(2)}><ArrowLeft size={15} /> Back</button>
                  <div className="fin-card-title">Review & Confirm</div>
                  <div className="fin-review-hero">
                    <div className="fin-review-amount">{formatCurrency(parseFloat(form.amount) || 0)}</div>
                    <div className="fin-review-arrow"><ArrowRight size={18} /></div>
                    <div className="fin-review-to">
                      <div className="fin-contact-avatar" style={{ background: recipientContact?.color || '#6366f1' }}>
                        {recipientContact?.initials || <User size={16} />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{recipientContact?.name || form.recipient}</div>
                        {recipientContact && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{recipientContact.email}</div>}
                      </div>
                    </div>
                  </div>
                  <div className="fin-review-rows">
                    <div className="fin-review-row"><span>Amount</span><span>{formatCurrency(parseFloat(form.amount) || 0)}</span></div>
                    <div className="fin-review-row"><span>Transfer Fee</span><span>{formatCurrency(fee)}</span></div>
                    <div className="fin-review-row fin-review-total"><span>Total Deducted</span><span>{formatCurrency(total)}</span></div>
                    {form.note && <div className="fin-review-row"><span>Note</span><span>{form.note}</span></div>}
                    <div className="fin-review-row"><span>Arrival</span><span className="fin-instant"><Zap size={12} /> Instant</span></div>
                  </div>
                  <div className="fin-security-note"><Lock size={13} /> AES-256 encrypted · Secured by NexVault</div>
                  <button className="btn btn-primary btn-full fin-next-btn" onClick={handleConfirm} disabled={loading}>
                    {loading ? <><span className="spinner" /> Processing...</> : <><Shield size={15} /> Confirm Transfer</>}
                  </button>
                </div>
              )}
            </div>

            <div className="fin-sidebar">
              <div className="fin-info-card">
                <div className="fin-info-title"><Clock size={14} /> Processing Time</div>
                <div className="fin-info-rows">
                  <div className="fin-info-row"><span>NexVault → NexVault</span><span className="fin-instant"><Zap size={11} /> Instant</span></div>
                </div>
              </div>
              <div className="fin-info-card" style={{ marginTop: 14 }}>
                <div className="fin-info-title"><Shield size={14} /> Limits</div>
                <div className="fin-info-rows">
                  <div className="fin-info-row"><span>Daily limit</span><span>50,000 FCFA</span></div>
                  <div className="fin-info-row"><span>Per transaction</span><span>10,000 FCFA</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </KYCGate>
    </DashboardLayout>
  );
}

/* ─── DEPOSIT ─── */
export function Deposit() {
  const navigate = useNavigate();
  const { balance, deposit } = useWallet();
  const { user } = useAuth();
  const toast = useToast();
  const [method, setMethod] = useState('bank');
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState('');

  // Generate a unique deposit reference when the page loads — user needs this BEFORE going to their bank
  const [depositRef] = useState(() => `DEP-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`);

  const [cardForm, setCardForm] = useState({ number: '', expiry: '', cvv: '', name: '' });

  const methods = [
    { id: 'bank', label: 'Bank Transfer', icon: Landmark, desc: 'Free · 1–3 business days', badge: 'Popular' },
    { id: 'card', label: 'Debit / Credit Card', icon: CreditCard, desc: '1.5% fee · Instant', badge: 'Instant' },
    { id: 'orange', label: 'Orange Money', icon: Smartphone, desc: 'Pay from your Orange account · Instant', badge: 'Mobile' },
    { id: 'mtn', label: 'MTN Mobile Money', icon: Smartphone, desc: 'Pay from your MTN account · Instant', badge: 'Mobile' },
  ];

  const isMobileMethod = method === 'orange' || method === 'mtn';
  const normalizedPhone = phoneNumber.replace(/\D/g, '');
  const isPhoneValid = !isMobileMethod || normalizedPhone.length >= 9;

  const copyText = (text, key) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleDeposit = async () => {
    setLoading(true);
    try {
      if (isMobileMethod) {
        if (!isPhoneValid) {
          throw new Error('Please enter a valid phone number for mobile money.');
        }

        const userId = user?.id || user?.userId || user?.uuid;
        const payload = {
          userId,
          amount: Math.round(parseFloat(amount)),
          phone: normalizedPhone,
          medium: method === 'orange' ? 'orange money' : 'mtn',
          currency: 'XAF',
          reference: depositRef,
          email: user?.email,
          redirectUrl: window.location.origin + '/dashboard',
          message: `Deposit ${formatCurrency(parseFloat(amount))} to NexVault wallet`,
        };

        const res = await apiClient.initiateMobileMoneyDeposit(payload);
        setResult({
          ...res,
          reference: res.reference || res.fapshi?.transId || depositRef,
          status: res.success ? 'pending' : 'failed',
        });
        toast(res.message || 'Mobile money payment request started', 'success');
        return;
      }

      const res = await deposit(parseFloat(amount), method, method === 'bank' ? depositRef : undefined);
      setResult({ ...res, reference: res.transaction?.reference || res.reference });
      toast(res.message || 'Deposit processed successfully', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (result) return (
    <DashboardLayout>
      <SuccessScreen
        title="Deposit Initiated"
        subtitle={`Via ${methods.find(m => m.id === method)?.label}`}
        amount={formatCurrency(parseFloat(amount) || 0)}
        reference={result.reference}
        status={result.status}
        onViewTx={() => navigate('/transactions')}
        onAgain={() => { setResult(null); setAmount(''); }}
        againLabel="Deposit Again"
      />
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <KYCGate>
        <div className="fin-page">
          <div className="fin-page-header">
            <div className="fin-page-title">
              <div className="fin-page-icon" style={{ background: '#d4edda', color: 'var(--success)' }}>
                <ArrowLeft size={20} style={{ transform: 'rotate(180deg)' }} />
              </div>
              <div>
                <h1>Deposit</h1>
                <p>Add funds to your NexVault wallet</p>
              </div>
            </div>
            <div className="fin-balance-pill"><Wallet size={14} /><span>{formatCurrency(balance)}</span></div>
          </div>

          <div className="fin-layout">
            <div className="fin-main">
              <div className="fin-card animate-fade">
                <div className="fin-card-title">Choose Method</div>
                <div className="fin-methods">
                  {methods.map(m => {
                    const Icon = m.icon;
                    return (
                      <button key={m.id} className={`fin-method ${method === m.id ? 'selected' : ''}`} onClick={() => setMethod(m.id)}>
                        <div className="fin-method-icon"><Icon size={20} /></div>
                        <div className="fin-method-info">
                          <div className="fin-method-label">{m.label}</div>
                          <div className="fin-method-desc">{m.desc}</div>
                        </div>
                        {m.badge && <span className="fin-method-badge">{m.badge}</span>}
                        {method === m.id && <CheckCircle size={18} className="fin-method-check" />}
                      </button>
                    );
                  })}
                </div>

                <div className="fin-divider" />
                <div className="fin-card-title">Enter Amount</div>
                <AmountInput value={amount} onChange={setAmount} balance={balance} quickAmounts={[100, 250, 500, 1000]} />
                {method === 'card' && amount && parseFloat(amount) > 0 && (
                  <div className="fin-fee-row" style={{ marginTop: 8 }}>
                    <span><Info size={13} /> Card processing fee (1.5%)</span>
                    <span className="fin-fee-value">{formatCurrency(parseFloat(amount) * 0.015)}</span>
                  </div>
                )}

                {method === 'bank' && (
                  <div className="fin-bank-details">
                    <div className="fin-bank-title"><Info size={14} /> Send to this bank account</div>
                    {[
                      { label: 'Bank Name', value: 'NexVault Financial Bank', key: 'bank' },
                      { label: 'Account Number', value: '8801-2240-4891', key: 'acc', mono: true },
                      { label: 'Routing Number', value: '021000021', key: 'routing', mono: true },
                      { label: 'Reference', value: depositRef, key: 'ref', mono: true, highlight: true },
                    ].map(row => (
                      <div key={row.key} className={`fin-bank-row ${row.highlight ? 'fin-bank-row-highlight' : ''}`}>
                        <span className="fin-bank-label">{row.label}</span>
                        <div className="fin-bank-value-wrap">
                          <span className={`fin-bank-value ${row.mono ? 'font-mono' : ''}`}>{row.value}</span>
                          <button className="fin-copy-btn" onClick={() => copyText(row.value, row.key)} aria-label="Copy">
                            {copied === row.key ? <CheckCircle size={13} /> : <Copy size={13} />}
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="fin-ref-warning">
                      <AlertCircle size={14} />
                      <div>
                        <strong>Important:</strong> You must include the reference number <strong>{depositRef}</strong> in your bank transfer. Without it, we cannot match your payment and credit your wallet.
                      </div>
                    </div>
                  </div>
                )}

                {isMobileMethod && (
                  <div className="fin-bank-details">
                    <div className="fin-bank-title"><Smartphone size={14} /> Mobile Money Details</div>
                    <div className="form-group" style={{ marginBottom: 12 }}>
                      <label className="form-label">Phone Number</label>
                      <input
                        className="form-control"
                        placeholder="6XXXXXXXX"
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                      />
                    </div>
                    <div className="fin-bank-note" style={{ marginTop: 12 }}>
                      <Shield size={13} /> We will send the payment request to your mobile account through Fapshi and confirm it once the transaction is validated.
                    </div>
                  </div>
                )}

                {method === 'card' && (
                  <div className="fin-bank-details">
                    <div className="fin-bank-title"><CreditCard size={14} /> Card Details</div>
                    <div className="form-group" style={{ marginBottom: 12 }}>
                      <label className="form-label">Cardholder Name</label>
                      <input className="form-control" placeholder="Name on card" value={cardForm.name}
                        onChange={e => setCardForm(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 12 }}>
                      <label className="form-label">Card Number</label>
                      <input className="form-control font-mono" placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        value={cardForm.number}
                        onChange={e => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 16);
                          const formatted = v.replace(/(.{4})/g, '$1 ').trim();
                          setCardForm(f => ({ ...f, number: formatted }));
                        }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Expiry Date</label>
                        <input className="form-control font-mono" placeholder="MM/YY" maxLength={5}
                          value={cardForm.expiry}
                          onChange={e => {
                            const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                            const formatted = v.length > 2 ? `${v.slice(0,2)}/${v.slice(2)}` : v;
                            setCardForm(f => ({ ...f, expiry: formatted }));
                          }} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">CVV</label>
                        <input className="form-control font-mono" placeholder="•••" maxLength={4}
                          type="password"
                          value={cardForm.cvv}
                          onChange={e => setCardForm(f => ({ ...f, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))} />
                      </div>
                    </div>
                    <div className="fin-bank-note" style={{ marginTop: 12 }}>
                      <Lock size={13} /> Your card details are encrypted and never stored on our servers.
                    </div>
                  </div>
                )}

                <button className="btn btn-primary btn-full fin-next-btn" style={{ marginTop: 20 }}
                  onClick={handleDeposit}
                  disabled={
                    !amount || parseFloat(amount) <= 0 || loading ||
                    (method === 'card' && (!cardForm.name || cardForm.number.replace(/\s/g,'').length < 16 || cardForm.expiry.length < 5 || cardForm.cvv.length < 3)) ||
                    (isMobileMethod && !isPhoneValid)
                  }>
                  {loading ? <><span className="spinner" /> Processing...</> : `Deposit ${amount ? formatCurrency(parseFloat(amount)) : 'Funds'}`}
                </button>
              </div>
            </div>

            <div className="fin-sidebar">
              <div className="fin-info-card">
                <div className="fin-info-title"><Shield size={14} /> Secure & Protected</div>
                <div className="fin-info-rows">
                  <div className="fin-info-row"><span>Encryption</span><span>AES-256</span></div>
                  <div className="fin-info-row"><span>Max deposit</span><span>100,000 FCFA</span></div>
                  <div className="fin-info-row"><span>Min deposit</span><span>1.00 FCFA</span></div>
                </div>
              </div>
              <div className="fin-info-card" style={{ marginTop: 14 }}>
                <div className="fin-info-title"><Clock size={14} /> Processing Times</div>
                <div className="fin-info-rows">
                  <div className="fin-info-row"><span>Bank transfer</span><span>1–3 days</span></div>
                  <div className="fin-info-row"><span>Card</span><span className="fin-instant"><Zap size={11} /> Instant</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </KYCGate>
    </DashboardLayout>
  );
}

/* ─── WITHDRAW ─── */
export function Withdraw() {
  const navigate = useNavigate();
  const { balance, withdraw } = useWallet();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [withdrawalType, setWithdrawalType] = useState(null); // 'bank' or 'mobile'
  const [mobileProvider, setMobileProvider] = useState(null); // 'orange' or 'mtn'
  const [bankForm, setBankForm] = useState({ bankName: '', accountNumber: '', routingNumber: '', accountName: '' });
  const [mobileForm, setMobileForm] = useState({ phone: '', name: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const intAmount = Math.max(0, Math.round(parseFloat(amount) || 0));
  const feeBreakdown = intAmount > 0 ? calculateWithdrawalFee(intAmount) : { total: 0, fixedFee: 0, percentageFee: 0 };
  const youGet = Math.max(intAmount - feeBreakdown.total, 0);
  
  const stepLabels = withdrawalType === 'bank' 
    ? ['Amount', 'Bank Details', 'Confirm']
    : ['Amount', 'Withdrawal Type', 'Mobile Details', 'Confirm'];

  const handleConfirm = async () => {
    setLoading(true);
    try {
      let res;
      if (withdrawalType === 'bank') {
        res = await withdraw(parseFloat(amount), 'bank', { bankName: bankForm.bankName, accountNumber: bankForm.accountNumber, accountName: bankForm.accountName });
      } else {
        res = await withdraw(parseFloat(amount), 'mobile', { provider: mobileProvider, phone: mobileForm.phone, name: mobileForm.name });
      }
      setResult(res);
      toast('Withdrawal submitted successfully!', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (result) return (
    <DashboardLayout>
      <SuccessScreen
        title="Withdrawal Submitted"
        subtitle={withdrawalType === 'bank' ? "Your funds are on the way to your bank" : "Your funds are on the way to your mobile money account"}
        amount={formatCurrency(youGet)}
        reference={result.reference}
        status="pending"
        onViewTx={() => navigate('/transactions')}
        onAgain={() => { 
          setResult(null); 
          setStep(1); 
          setAmount(''); 
          setWithdrawalType(null);
          setMobileProvider(null);
          setBankForm({ bankName: '', accountNumber: '', routingNumber: '', accountName: '' }); 
          setMobileForm({ phone: '', name: '' });
        }}
        againLabel="New Withdrawal"
      />
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <KYCGate>
        <div className="fin-page">
          <div className="fin-page-header">
            <div className="fin-page-title">
              <div className="fin-page-icon" style={{ background: '#eef2ff', color: '#6366f1' }}>
                <ArrowUpFromLine size={20} />
              </div>
              <div>
                <h1>Withdraw</h1>
                <p>Transfer funds from your wallet to your bank or mobile money account</p>
              </div>
            </div>
            <div className="fin-balance-pill"><Wallet size={14} /><span>{formatCurrency(balance)}</span></div>
          </div>

          <div className="fin-steps">
            {stepLabels.map((s, i) => (
              <div key={i} className={`fin-step ${step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}`}>
                <div className="fin-step-dot">{step > i + 1 ? <CheckCircle size={14} /> : <span>{i + 1}</span>}</div>
                <span>{s}</span>
                {i < stepLabels.length - 1 && <div className="fin-step-line" />}
              </div>
            ))}
          </div>

          <div className="fin-layout">
            <div className="fin-main">
              {step === 1 && (
                <div className="fin-card animate-fade">
                  <div className="fin-card-title">Amount to Withdraw</div>
                  <AmountInput value={amount} onChange={setAmount} balance={balance} quickAmounts={[500, 1000, 2000, 5000]} min={500} />
                  {amount && parseFloat(amount) > 0 && (
                    <div className="fin-withdraw-summary">
                      <div className="fin-review-row"><span>Withdrawal amount</span><span>{formatCurrency(intAmount)}</span></div>
                      <div className="fin-review-row"><span>Fee</span><span>{formatCurrency(feeBreakdown.total)}</span></div>
                      <div className="fin-review-row fin-review-total"><span>You receive</span><span>{formatCurrency(youGet)}</span></div>
                    </div>
                  )}
                  <button className="btn btn-primary btn-full fin-next-btn" onClick={() => setStep(2)}
                    disabled={!amount || parseFloat(amount) < 500 || parseFloat(amount) > balance}>
                    Continue <ArrowRight size={16} />
                  </button>
                  {parseFloat(amount) > balance && (
                    <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8, textAlign: 'center' }}>Insufficient balance</p>
                  )}
                  {amount && parseFloat(amount) > 0 && parseFloat(amount) < 500 && (
                    <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8, textAlign: 'center' }}>Minimum withdrawal amount is 500 FCFA</p>
                  )}
                </div>
              )}

              {step === 2 && !withdrawalType && (
                <div className="fin-card animate-fade">
                  <button className="fin-back-btn" onClick={() => setStep(1)}><ArrowLeft size={15} /> Back</button>
                  <div className="fin-card-title">Choose Withdrawal Method</div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Select where you want to receive your funds</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button 
                      onClick={() => { setWithdrawalType('bank'); setStep(3); }}
                      style={{
                        padding: 16,
                        border: '2px solid var(--border-light)',
                        borderRadius: 8,
                        background: 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = '#f3f4f6'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ width: 40, height: 40, background: '#dbeafe', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0056b3', fontSize: 18 }}>🏦</div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>Bank Account</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Transfer to your bank account (1-3 business days)</div>
                      </div>
                    </button>
                    <button 
                      onClick={() => { setWithdrawalType('mobile'); setStep(3); }}
                      style={{
                        padding: 16,
                        border: '2px solid var(--border-light)',
                        borderRadius: 8,
                        background: 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#10b981'; e.currentTarget.style.background = '#f3f4f6'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ width: 40, height: 40, background: '#d1fae5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', fontSize: 18 }}>📱</div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>Mobile Money</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Transfer to mobile money account (1-5 minutes)</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && withdrawalType === 'bank' && (
                <div className="fin-card animate-fade">
                  <button className="fin-back-btn" onClick={() => { setWithdrawalType(null); setStep(2); }}><ArrowLeft size={15} /> Back</button>
                  <div className="fin-card-title">Your Bank Account Details</div>
                  <div className="form-group">
                    <label className="form-label">Account Holder Name</label>
                    <input className="form-control" placeholder="Full name as on bank account" value={bankForm.accountName} onChange={e => setBankForm(f => ({ ...f, accountName: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bank Name</label>
                    <input className="form-control" placeholder="e.g. Chase, Bank of America" value={bankForm.bankName} onChange={e => setBankForm(f => ({ ...f, bankName: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Account Number</label>
                    <input className="form-control font-mono" placeholder="Your bank account number" value={bankForm.accountNumber} onChange={e => setBankForm(f => ({ ...f, accountNumber: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Routing Number</label>
                    <input className="form-control font-mono" placeholder="9-digit routing number" value={bankForm.routingNumber} onChange={e => setBankForm(f => ({ ...f, routingNumber: e.target.value }))} />
                  </div>
                  <div className="fin-bank-note" style={{ marginBottom: 16 }}>
                    <AlertCircle size={13} /> Double-check your details. Incorrect information may cause delays or lost funds.
                  </div>
                  <button className="btn btn-primary btn-full fin-next-btn" onClick={() => setStep(stepLabels.length)}
                    disabled={!bankForm.accountName || !bankForm.bankName || !bankForm.accountNumber || !bankForm.routingNumber}>
                    Review Withdrawal <ArrowRight size={16} />
                  </button>
                </div>
              )}

              {step === 3 && withdrawalType === 'mobile' && (
                <div className="fin-card animate-fade">
                  <button className="fin-back-btn" onClick={() => { setWithdrawalType(null); setStep(2); }}><ArrowLeft size={15} /> Back</button>
                  <div className="fin-card-title">Choose Mobile Money Provider</div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Select your mobile money service</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <button 
                      onClick={() => { setMobileProvider('orange'); setStep(4); }}
                      style={{
                        padding: 16,
                        border: `2px solid ${mobileProvider === 'orange' ? '#ff6600' : 'var(--border-light)'}`,
                        borderRadius: 8,
                        background: mobileProvider === 'orange' ? '#fff5f0' : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12
                      }}
                      onMouseEnter={e => { if (mobileProvider !== 'orange') { e.currentTarget.style.borderColor = '#ff6600'; e.currentTarget.style.background = '#f3f4f6'; } }}
                      onMouseLeave={e => { if (mobileProvider !== 'orange') { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'transparent'; } }}
                    >
                      <div style={{ width: 40, height: 40, background: '#ffe6cc', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff6600', fontSize: 18 }}>🟠</div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>Orange Money</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Fast transfer to your Orange account</div>
                      </div>
                    </button>
                    <button 
                      onClick={() => { setMobileProvider('mtn'); setStep(4); }}
                      style={{
                        padding: 16,
                        border: `2px solid ${mobileProvider === 'mtn' ? '#ffc900' : 'var(--border-light)'}`,
                        borderRadius: 8,
                        background: mobileProvider === 'mtn' ? '#fffaf0' : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12
                      }}
                      onMouseEnter={e => { if (mobileProvider !== 'mtn') { e.currentTarget.style.borderColor = '#ffc900'; e.currentTarget.style.background = '#f3f4f6'; } }}
                      onMouseLeave={e => { if (mobileProvider !== 'mtn') { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'transparent'; } }}
                    >
                      <div style={{ width: 40, height: 40, background: '#ffecb3', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffc900', fontSize: 18 }}>🟡</div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-dark)' }}>MTN Mobile Money</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Fast transfer to your MTN wallet</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {step === 4 && withdrawalType === 'mobile' && (
                <div className="fin-card animate-fade">
                  <button className="fin-back-btn" onClick={() => setStep(3)}><ArrowLeft size={15} /> Back</button>
                  <div className="fin-card-title">{mobileProvider === 'orange' ? 'Orange Money' : 'MTN Mobile Money'} Details</div>
                  <div className="form-group">
                    <label className="form-label">Account Holder Name</label>
                    <input className="form-control" placeholder="Full name" value={mobileForm.name} onChange={e => setMobileForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input className="form-control font-mono" placeholder="e.g. +237650000000" value={mobileForm.phone} onChange={e => setMobileForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div className="fin-bank-note" style={{ marginBottom: 16 }}>
                    <AlertCircle size={13} /> Make sure the phone number matches your {mobileProvider === 'orange' ? 'Orange Money' : 'MTN'} account.
                  </div>
                  <button className="btn btn-primary btn-full fin-next-btn" onClick={() => setStep(stepLabels.length)}
                    disabled={!mobileForm.name || !mobileForm.phone}>
                    Review Withdrawal <ArrowRight size={16} />
                  </button>
                </div>
              )}

              {step === stepLabels.length && (
                <div className="fin-card animate-fade">
                  <button className="fin-back-btn" onClick={() => setStep(withdrawalType === 'bank' ? 3 : 4)}><ArrowLeft size={15} /> Back</button>
                  <div className="fin-card-title">Confirm Withdrawal</div>
                  <div className="fin-review-hero" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>You withdraw</div>
                    <div className="fin-review-amount">{formatCurrency(parseFloat(amount))}</div>
                  </div>
                  <div className="fin-review-rows">
                    {withdrawalType === 'bank' ? (
                      <>
                        <div className="fin-review-row"><span>To Bank</span><span>{bankForm.bankName}</span></div>
                        <div className="fin-review-row"><span>Account</span><span className="font-mono">••••{bankForm.accountNumber.slice(-4)}</span></div>
                        <div className="fin-review-row"><span>Account Name</span><span>{bankForm.accountName}</span></div>
                        <div className="fin-review-row"><span>Arrival</span><span>1–3 business days</span></div>
                      </>
                    ) : (
                      <>
                        <div className="fin-review-row"><span>To {mobileProvider === 'orange' ? 'Orange Money' : 'MTN Mobile Money'}</span><span className="font-mono">••••{mobileForm.phone.slice(-4)}</span></div>
                        <div className="fin-review-row"><span>Account Name</span><span>{mobileForm.name}</span></div>
                        <div className="fin-review-row"><span>Arrival</span><span>1–5 minutes</span></div>
                      </>
                    )}
                    <div className="fin-review-row"><span>Fee</span><span>{formatCurrency(feeBreakdown.total)}</span></div>
                    <div className="fin-review-row fin-review-total"><span>You receive</span><span>{formatCurrency(youGet)}</span></div>
                  </div>
                  <div className="fin-security-note"><Lock size={13} /> AES-256 encrypted · Secured by NexVault</div>
                  <button className="btn btn-primary btn-full fin-next-btn" onClick={handleConfirm} disabled={loading}>
                    {loading ? <><span className="spinner" /> Processing...</> : <><Shield size={15} /> Confirm Withdrawal</>}
                  </button>
                </div>
              )}
            </div>

            <div className="fin-sidebar">
              <div className="fin-info-card">
                <div className="fin-info-title"><Shield size={14} /> Withdrawal Limits</div>
                <div className="fin-info-rows">
                  <div className="fin-info-row"><span>Daily limit</span><span>200,000 FCFA</span></div>
                  <div className="fin-info-row"><span>Monthly limit</span><span>1,000,000 FCFA</span></div>
                  <div className="fin-info-row"><span>Min withdrawal</span><span>500 FCFA</span></div>
                </div>
              </div>
              <div className="fin-info-card" style={{ marginTop: 14 }}>
                <div className="fin-info-title"><AlertCircle size={14} /> Important</div>
                <ul className="fin-info-list">
                  <li>Verify your details carefully before confirming.</li>
                  <li>Bank transfers: 1–3 business days</li>
                  <li>Mobile Money: 1–5 minutes</li>
                  <li>Contact support if funds don't arrive in time.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </KYCGate>
    </DashboardLayout>
  );
}
