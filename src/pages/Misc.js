import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCheck, Bell, ShieldCheck, Star, Camera, Pencil, X,
  Mail, Phone, MapPin, Globe, AlertTriangle, Trash2,
  MessageCircle, PhoneCall, BookOpen, ChevronDown, ChevronUp,
  Send, BellRing, Smartphone, Lock, Fingerprint, Moon, EyeOff,
  Languages, DollarSign, CheckCircle, ArrowRight,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useKYC } from '../context/KYCContext';
import { useWallet } from '../context/WalletContext';
import { notifications as notifData, currentUser } from '../data/mockData';
import './Misc.css';

/* ─── NOTIFICATIONS ─── */
export function Notifications() {
  const [notifs, setNotifs] = useState(notifData);

  const markAllRead = () => setNotifs(n => n.map(x => ({ ...x, read: true })));
  const markRead = (id) => setNotifs(n => n.map(x => x.id === id ? { ...x, read: true } : x));
  const unread = notifs.filter(n => !n.read).length;

  const notifIconMap = {
    success: <CheckCircle size={18} />,
    info: <Bell size={18} />,
    warning: <AlertTriangle size={18} />,
    danger: <X size={18} />,
  };

  return (
    <DashboardLayout>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1>Notifications</h1>
          <p>{unread > 0 ? `You have ${unread} unread notification${unread > 1 ? 's' : ''}.` : 'All caught up!'}</p>
        </div>
        {unread > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
            <CheckCheck size={14} /> Mark all as read
          </button>
        )}
      </div>

      <div className="notif-list animate-fade">
        {notifs.map(n => (
          <div key={n.id} className={`notif-item card ${!n.read ? 'unread' : ''}`} onClick={() => markRead(n.id)}>
            <div className={`notif-icon notif-icon-${n.type}`}>{notifIconMap[n.type] || <Bell size={18} />}</div>
            <div className="notif-content">
              <div className="notif-title">{n.title}</div>
              <div className="notif-message">{n.message}</div>
              <div className="notif-time">{n.time}</div>
            </div>
            {!n.read && <div className="notif-dot" />}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}

/* ─── PROFILE ─── */
export function Profile() {
  const [editing, setEditing] = useState(false);
  const { kycStatus } = useKYC();
  const navigate = useNavigate();
  const [photo, setPhoto] = useState(null);
  const photoInputRef = React.useRef();
  const [form, setForm] = useState({
    name: currentUser.name,
    email: currentUser.email,
    phone: currentUser.phone,
    address: currentUser.address,
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const kycLabel = kycStatus === 'verified' ? 'Fully Verified ✓' : kycStatus === 'pending' ? 'Under Review' : 'Not Verified';
  const kycOk = kycStatus === 'verified';

  const securityItems = [
    { label: 'Password', value: 'Last changed 30 days ago', action: 'Change', ok: true },
    { label: '2-Factor Auth', value: 'Enabled via Authenticator App', action: 'Manage', ok: true },
    { label: 'KYC Verification', value: kycLabel, action: kycStatus === 'unverified' ? 'Verify' : 'View', ok: kycOk },
    { label: 'Login Devices', value: '2 active sessions', action: 'Review', ok: false },
  ];

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Manage your personal information and account details.</p>
      </div>

      {saved && <div className="alert alert-success animate-fade"><CheckCircle size={14} /> Profile updated successfully.</div>}

      <div className="profile-layout animate-fade">
        <div>
          <div className="card profile-avatar-card">
            <div className="profile-avatar">
              {photo
                ? <img src={photo} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                : <span>{currentUser.initials}</span>
              }
              <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files[0]; if (f) setPhoto(URL.createObjectURL(f)); }} />
              <button className="profile-avatar-edit" aria-label="Change photo" onClick={() => photoInputRef.current.click()}>
                <Camera size={14} />
              </button>
            </div>
            <h2 className="profile-name">{form.name}</h2>
            <p className="profile-email">{form.email}</p>
            <div className="divider" />
            <div className="profile-meta">
              <div className="profile-meta-item">
                <span className="profile-meta-label">Account #</span>
                <span className="profile-meta-value font-mono">{currentUser.accountNumber}</span>
              </div>
              <div className="profile-meta-item">
                <span className="profile-meta-label">KYC Status</span>
                {kycStatus === 'verified' && <span className="badge badge-success"><CheckCircle size={11} /> Verified</span>}
                {kycStatus === 'pending' && <span className="badge badge-warning">⏳ Under Review</span>}
                {kycStatus === 'unverified' && (
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/kyc')}>
                    Verify Now
                  </button>
                )}
              </div>
              <div className="profile-meta-item">
                <span className="profile-meta-label">Member Since</span>
                <span className="profile-meta-value">{currentUser.joinDate}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="card profile-form-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3>Personal Information</h3>
              <button className={`btn ${editing ? 'btn-ghost' : 'btn-outline'} btn-sm`} onClick={() => setEditing(!editing)}>
                {editing ? <><X size={14} /> Cancel</> : <><Pencil size={14} /> Edit</>}
              </button>
            </div>
            {[
              { label: 'Full Name', key: 'name', type: 'text', icon: <Mail size={15} /> },
              { label: 'Email Address', key: 'email', type: 'email', icon: <Mail size={15} /> },
              { label: 'Phone Number', key: 'phone', type: 'tel', icon: <Phone size={15} /> },
              { label: 'Address', key: 'address', type: 'text', icon: <MapPin size={15} /> },
            ].map(field => (
              <div key={field.key} className="form-group">
                <label className="form-label">{field.label}</label>
                <input
                  type={field.type}
                  className="form-control"
                  value={form[field.key]}
                  disabled={!editing}
                  onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="form-group">
              <label className="form-label">Country</label>
              <input className="form-control" value={currentUser.country} disabled />
            </div>
            {editing && (
              <button className="btn btn-primary btn-full" onClick={handleSave}>Save Changes</button>
            )}
          </div>

          <div className="card" style={{ marginTop: 20, padding: 24 }}>
            <h3 style={{ marginBottom: 16 }}>Security & Verification</h3>
            <div className="security-items">
              {securityItems.map((item, i) => (
                <div key={i} className="security-item">
                  <div className={`security-status ${item.ok ? 'ok' : 'warn'}`} />
                  <div className="security-info">
                    <div className="security-label">{item.label}</div>
                    <div className="security-value">{item.value}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm">{item.action}</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

/* ─── SETTINGS ─── */
export function Settings() {
  const { hideBalance, setHideBalance } = useWallet();
  const [settings, setSettings] = useState({
    emailNotifs: true, pushNotifs: true, smsAlerts: false, loginAlerts: true,
    twoFactor: true, biometric: true, darkMode: false,
    language: 'en', currency: 'USD',
  });
  const [saved, setSaved] = useState(false);

  const toggle = (key) => {
    if (key === 'hideBalance') { setHideBalance(v => !v); return; }
    setSettings(s => ({ ...s, [key]: !s[key] }));
  };

  const getValue = (key) => key === 'hideBalance' ? hideBalance : settings[key];

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  const sections = [
    {
      title: 'Notifications', icon: <BellRing size={16} />,
      items: [
        { key: 'emailNotifs', label: 'Email Notifications', desc: 'Receive transaction receipts and account alerts via email.', icon: <Mail size={15} /> },
        { key: 'pushNotifs', label: 'Push Notifications', desc: 'Real-time alerts on your mobile device.', icon: <Smartphone size={15} /> },
        { key: 'smsAlerts', label: 'SMS Alerts', desc: 'Text message alerts for large transactions.', icon: <MessageCircle size={15} /> },
        { key: 'loginAlerts', label: 'Login Alerts', desc: 'Get notified of new device logins.', icon: <Bell size={15} /> },
      ],
    },
    {
      title: 'Security', icon: <Lock size={16} />,
      items: [
        { key: 'twoFactor', label: 'Two-Factor Authentication', desc: 'Add an extra layer of security to your account.', icon: <ShieldCheck size={15} /> },
        { key: 'biometric', label: 'Biometric Login', desc: 'Use Face ID or fingerprint to sign in.', icon: <Fingerprint size={15} /> },
        { key: 'loginAlerts', label: 'Suspicious Activity Alerts', desc: 'Detect and alert on unusual account behavior.', icon: <AlertTriangle size={15} /> },
      ],
    },
    {
      title: 'Display', icon: <Moon size={16} />,
      items: [
        { key: 'darkMode', label: 'Dark Mode', desc: 'Switch to a darker theme for low-light environments.', icon: <Moon size={15} /> },
        { key: 'hideBalance', label: 'Hide Balance', desc: 'Mask wallet balance on the dashboard.', icon: <EyeOff size={15} /> },
      ],
    },
  ];

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Customize your NexVault experience.</p>
      </div>

      {saved && <div className="alert alert-success animate-fade"><CheckCircle size={14} /> Settings saved successfully.</div>}

      <div className="settings-layout animate-fade">
        {sections.map((section, i) => (
          <div key={i} className="card settings-section">
            <h3 className="settings-section-title">{section.icon} {section.title}</h3>
            {section.items.map((item) => (
              <div key={item.key} className="settings-item">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ color: 'var(--text-muted)', marginTop: 2 }}>{item.icon}</span>
                  <div>
                    <div className="settings-item-label">{item.label}</div>
                    <div className="settings-item-desc">{item.desc}</div>
                  </div>
                </div>
                <button className={`toggle-btn ${getValue(item.key) ? 'on' : ''}`} onClick={() => toggle(item.key)} aria-label={`Toggle ${item.label}`}>
                  <span className="toggle-thumb" />
                </button>
              </div>
            ))}
          </div>
        ))}

        <div className="card settings-section">
          <h3 className="settings-section-title"><Globe size={16} /> Preferences</h3>
          <div className="settings-item">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <Languages size={15} style={{ color: 'var(--text-muted)', marginTop: 2 }} />
              <div>
                <div className="settings-item-label">Language</div>
                <div className="settings-item-desc">Choose your preferred display language.</div>
              </div>
            </div>
            <select className="form-control" style={{ width: 160 }} value={settings.language} onChange={e => setSettings(s => ({ ...s, language: e.target.value }))}>
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
          <div className="settings-item">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <DollarSign size={15} style={{ color: 'var(--text-muted)', marginTop: 2 }} />
              <div>
                <div className="settings-item-label">Default Currency</div>
                <div className="settings-item-desc">Currency used to display balances and amounts.</div>
              </div>
            </div>
            <select className="form-control" style={{ width: 160 }} value={settings.currency} onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))}>
              <option value="USD">USD — US Dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — British Pound</option>
              <option value="XAF">XAF — CFA Franc</option>
            </select>
          </div>
        </div>

        <div className="card settings-section settings-danger-zone">
          <h3 className="settings-section-title" style={{ color: 'var(--danger)' }}><AlertTriangle size={16} /> Danger Zone</h3>
          <div className="danger-actions">
            <div>
              <div className="settings-item-label">Close Account</div>
              <div className="settings-item-desc">Permanently delete your NexVault account and all associated data.</div>
            </div>
            <button className="btn btn-danger btn-sm"><Trash2 size={14} /> Close Account</button>
          </div>
        </div>

        <button className="btn btn-primary btn-lg" onClick={handleSave} style={{ alignSelf: 'flex-start' }}>
          Save All Settings
        </button>
      </div>
    </DashboardLayout>
  );
}

/* ─── HELP ─── */
export function Help() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);
  const [ticket, setTicket] = useState({ subject: '', message: '', category: 'general' });
  const [submitted, setSubmitted] = useState(false);

  const faqs = [
    { q: 'How long do transfers take?', a: 'Transfers between NexVault users are instant. External bank transfers take 1–3 business days depending on your bank.' },
    { q: 'Is my money insured?', a: 'Balances up to $250,000 are protected through our banking partners, who are FDIC-insured institutions.' },
    { q: 'How do I increase my transaction limits?', a: 'Complete KYC verification to unlock higher limits. Verified accounts can send up to $50,000 per day.' },
    { q: 'Can I use NexVault internationally?', a: 'Yes! NexVault supports transactions in 150+ currencies across 180+ countries at competitive exchange rates.' },
    { q: 'What should I do if I suspect fraud?', a: 'Immediately freeze your card from the Profile page, then contact our 24/7 support team via live chat or call +1 (888) 639-8258.' },
    { q: 'How is my data protected?', a: 'We use AES-256 encryption, TLS 1.3, and store no card data on our servers. All authentication uses OAuth 2.0 with optional biometrics.' },
  ];

  const contacts = [
    { icon: <MessageCircle size={22} />, title: 'Live Chat', desc: 'Chat with support now', action: 'Start Chat', href: '#' },
    { icon: <Mail size={22} />, title: 'Email Support', desc: 'support@nexvault.io', action: 'Send Email', href: 'mailto:support@nexvault.io' },
    { icon: <PhoneCall size={22} />, title: 'Phone', desc: '+1 (888) 639-8258', action: 'Call Now', href: 'tel:+18886398258' },
    { icon: <BookOpen size={22} />, title: 'Docs', desc: 'Browse our knowledge base', action: 'View Docs', href: '#' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1>Help & Support</h1>
        <p>Find answers or get in touch with our support team.</p>
      </div>

      {/* Quick links */}
      <div className="help-quick-links animate-fade">
        {contacts.map((c, i) => (
          <div key={i} className="card help-contact-card">
            <div className="help-contact-icon">{c.icon}</div>
            <div className="help-contact-title">{c.title}</div>
            <div className="help-contact-desc">{c.desc}</div>
            <button className="btn btn-outline btn-sm" style={{ marginTop: 'auto', width: '100%', justifyContent: 'center' }}
              onClick={() => c.href !== '#' && window.open(c.href)}>{c.action}</button>
          </div>
        ))}
      </div>

      <div className="help-layout animate-fade-delay-1">
        {/* FAQ */}
        <div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border-light)' }}>
              <h3>Frequently Asked Questions</h3>
            </div>
            {faqs.map((faq, i) => (
              <div key={i} className={`faq-item ${openFaq === i ? 'open' : ''}`}>
                <button className="faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{faq.q}</span>
                  {openFaq === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {openFaq === i && <div className="faq-answer animate-fade">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Contact form */}
        <div>
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ marginBottom: 6 }}>Submit a Ticket</h3>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>We typically respond within 2–4 hours.</p>
            {submitted ? (
              <div className="help-submitted animate-fade">
                <div className="success-icon" style={{ width: 56, height: 56, fontSize: 24 }}><CheckCircle size={28} /></div>
                <h4>Ticket Submitted!</h4>
                <p>Reference: TKT-{Date.now().toString().slice(-6)}</p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>We'll respond to {currentUser.email} within 2–4 hours.</p>
                <button className="btn btn-outline btn-sm" onClick={() => setSubmitted(false)}>Submit Another</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-control" value={ticket.category} onChange={e => setTicket(t => ({ ...t, category: e.target.value }))}>
                    <option value="general">General Inquiry</option>
                    <option value="transaction">Transaction Issue</option>
                    <option value="account">Account Problem</option>
                    <option value="security">Security Concern</option>
                    <option value="kyc">KYC Verification</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input className="form-control" placeholder="Brief description of your issue" value={ticket.subject} onChange={e => setTicket(t => ({ ...t, subject: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea className="form-control" rows={5} placeholder="Please describe your issue in detail..." value={ticket.message} onChange={e => setTicket(t => ({ ...t, message: e.target.value }))} required style={{ resize: 'vertical' }} />
                </div>
                <button type="submit" className="btn btn-primary btn-full">
                  <Send size={14} /> Submit Ticket
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
