import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, ArrowLeft, ArrowLeftRight, Landmark, CreditCard,
  Lock, Wallet, ArrowRight, ArrowUpFromLine,
  User, Search, ChevronDown, Info, Copy, Shield,
  AlertCircle, Clock, Zap, BadgeCheck,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { KYCGate } from '../components/KYCBanner';
import { useWallet } from '../context/WalletContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api/mockApi';
import { contacts, currentUser, formatCurrency } from '../data/mockData';
import './SendDeposit.css';

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
          <Clock size={14} /> Processing — funds will arrive in 1–3 business days
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
function AmountInput({ value, onChange, balance, quickAmounts }) {
  return (
    <div className="fin-amount-block">
      <div className="fin-amount-input-wrap">
        <div className="fin-currency-badge">
          <span className="fin-currency-flag">🇺🇸</span>
          <span>USD</span>
          <ChevronDown size={14} />
        </div>
        <input
          type="number"
          className="fin-amount-input"
          placeholder="0.00"
          value={value}
          onChange={e => onChange(e.target.value)}
          min="0"
        />
      </div>
      <div className="fin-amount-meta">
        <span className="fin-amount-balance">
          <Wallet size={13} /> Available: <strong>{formatCurrency(balance)}</strong>
        </span>
        {value && parseFloat(value) > 0 && (
          <span className="fin-amount-usd">≈ {formatCurrency(parseFloat(value))}</span>
        )}
      </div>
      <div className="fin-quick-amounts">
        {quickAmounts.map(v => (
          <button key={v} className={`fin-quick-btn ${value === String(v) ? 'active' : ''}`} onClick={() => onChange(String(v))}>
            ${v}
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

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await api.initiateTransfer({
        amount: parseFloat(form.amount),
        recipientEmail: form.recipient,
        note: form.note,
      });
      transfer(
        parseFloat(form.amount),
        recipientContact?.name || form.recipient,
        form.recipient,
        form.note,
        res.reference
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
                  <AmountInput value={form.amount} onChange={v => setForm(f => ({ ...f, amount: v }))} balance={balance} quickAmounts={[50, 100, 250, 500]} />
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
                  <div className="fin-info-row"><span>Daily limit</span><span>$50,000</span></div>
                  <div className="fin-info-row"><span>Per transaction</span><span>$10,000</span></div>
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
  const toast = useToast();
  const [method, setMethod] = useState('bank');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState('');

  // Generate a unique deposit reference when the page loads — user needs this BEFORE going to their bank
  const [depositRef] = useState(() => `DEP-${currentUser.accountNumber}-${Date.now().toString().slice(-6)}`);

  const [cardForm, setCardForm] = useState({ number: '', expiry: '', cvv: '', name: '' });

  const methods = [
    { id: 'bank', label: 'Bank Transfer', icon: Landmark, desc: 'Free · 1–3 business days', badge: 'Popular' },
    { id: 'card', label: 'Debit / Credit Card', icon: CreditCard, desc: '1.5% fee · Instant', badge: 'Instant' },
  ];

  const copyText = (text, key) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleDeposit = async () => {
    setLoading(true);
    try {
      const res = await api.initiateDeposit({ amount: parseFloat(amount), method });
      deposit(parseFloat(amount), methods.find(m => m.id === method)?.label, method === 'bank' ? depositRef : res.reference);
      setResult({ ...res, reference: method === 'bank' ? depositRef : res.reference });
      toast(res.message, 'success');
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
                    (method === 'card' && (!cardForm.name || cardForm.number.replace(/\s/g,'').length < 16 || cardForm.expiry.length < 5 || cardForm.cvv.length < 3))
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
                  <div className="fin-info-row"><span>Max deposit</span><span>$100,000</span></div>
                  <div className="fin-info-row"><span>Min deposit</span><span>$1.00</span></div>
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
  const [bankForm, setBankForm] = useState({ bankName: '', accountNumber: '', routingNumber: '', accountName: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const fee = 0;
  const youGet = (parseFloat(amount) || 0) - fee;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const res = await api.initiateWithdrawal({
        amount: parseFloat(amount),
        bankDetails: bankForm,
      });
      withdraw(parseFloat(amount), bankForm.bankName, bankForm.accountNumber, res.reference);
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
        subtitle="Your funds are on the way to your bank"
        amount={formatCurrency(youGet)}
        reference={result.reference}
        status="pending"
        onViewTx={() => navigate('/transactions')}
        onAgain={() => { setResult(null); setStep(1); setAmount(''); setBankForm({ bankName: '', accountNumber: '', routingNumber: '', accountName: '' }); }}
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
                <p>Transfer funds from your wallet to your bank account</p>
              </div>
            </div>
            <div className="fin-balance-pill"><Wallet size={14} /><span>{formatCurrency(balance)}</span></div>
          </div>

          <div className="fin-steps">
            {['Amount', 'Bank Details', 'Confirm'].map((s, i) => (
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
                  <div className="fin-card-title">Amount to Withdraw</div>
                  <AmountInput value={amount} onChange={setAmount} balance={balance} quickAmounts={[100, 250, 500, 1000]} />
                  {amount && parseFloat(amount) > 0 && (
                    <div className="fin-withdraw-summary">
                      <div className="fin-review-row"><span>Withdrawal amount</span><span>{formatCurrency(parseFloat(amount))}</span></div>
                      <div className="fin-review-row"><span>Fee</span><span>Free</span></div>
                      <div className="fin-review-row fin-review-total"><span>You receive</span><span>{formatCurrency(youGet)}</span></div>
                    </div>
                  )}
                  <button className="btn btn-primary btn-full fin-next-btn" onClick={() => setStep(2)}
                    disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance}>
                    Continue <ArrowRight size={16} />
                  </button>
                  {parseFloat(amount) > balance && (
                    <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 8, textAlign: 'center' }}>Insufficient balance</p>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="fin-card animate-fade">
                  <button className="fin-back-btn" onClick={() => setStep(1)}><ArrowLeft size={15} /> Back</button>
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
                  <button className="btn btn-primary btn-full fin-next-btn" onClick={() => setStep(3)}
                    disabled={!bankForm.accountName || !bankForm.bankName || !bankForm.accountNumber || !bankForm.routingNumber}>
                    Review Withdrawal <ArrowRight size={16} />
                  </button>
                </div>
              )}

              {step === 3 && (
                <div className="fin-card animate-fade">
                  <button className="fin-back-btn" onClick={() => setStep(2)}><ArrowLeft size={15} /> Back</button>
                  <div className="fin-card-title">Confirm Withdrawal</div>
                  <div className="fin-review-hero" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>You withdraw</div>
                    <div className="fin-review-amount">{formatCurrency(parseFloat(amount))}</div>
                  </div>
                  <div className="fin-review-rows">
                    <div className="fin-review-row"><span>To Bank</span><span>{bankForm.bankName}</span></div>
                    <div className="fin-review-row"><span>Account</span><span className="font-mono">••••{bankForm.accountNumber.slice(-4)}</span></div>
                    <div className="fin-review-row"><span>Account Name</span><span>{bankForm.accountName}</span></div>
                    <div className="fin-review-row"><span>Fee</span><span>Free</span></div>
                    <div className="fin-review-row fin-review-total"><span>You receive</span><span>{formatCurrency(youGet)}</span></div>
                    <div className="fin-review-row"><span>Arrival</span><span>1–3 business days</span></div>
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
                  <div className="fin-info-row"><span>Daily limit</span><span>$50,000</span></div>
                  <div className="fin-info-row"><span>Monthly limit</span><span>$200,000</span></div>
                  <div className="fin-info-row"><span>Min withdrawal</span><span>$10.00</span></div>
                </div>
              </div>
              <div className="fin-info-card" style={{ marginTop: 14 }}>
                <div className="fin-info-title"><AlertCircle size={14} /> Important</div>
                <ul className="fin-info-list">
                  <li>Verify bank details carefully before confirming.</li>
                  <li>Withdrawals are processed within 1–3 business days.</li>
                  <li>Contact support if funds don't arrive within 3 days.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </KYCGate>
    </DashboardLayout>
  );
}
