import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Zap, Globe, BarChart2, CreditCard, Target,
  Lock, CheckCircle, Star, ArrowRight, TrendingUp, TrendingDown,
  Wallet, Send, Download, Bell, Users, Activity,
  Mail, HelpCircle, Menu, X,
} from 'lucide-react';
import { FaTwitter, FaGithub, FaLinkedinIn, FaInstagram } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './Landing.css';

const features = [
  {
    icon: Shield,
    title: 'Bank-Grade Security',
    desc: 'AES-256 encryption, 2FA, and real-time fraud monitoring protect every transaction around the clock.',
    color: '#6366f1',
    bg: '#eef2ff',
  },
  {
    icon: Zap,
    title: 'Instant Transfers',
    desc: 'Send and receive money globally in seconds, 24/7, with zero downtime and no delays.',
    color: '#f59e0b',
    bg: '#fffbeb',
  },
  {
    icon: Globe,
    title: 'Global Reach',
    desc: 'Transact in 150+ currencies across 180+ countries with the most competitive exchange rates.',
    color: '#10b981',
    bg: '#ecfdf5',
  },
  {
    icon: BarChart2,
    title: 'Smart Analytics',
    desc: 'Visualize your spending patterns, set budgets, and make smarter financial decisions daily.',
    color: '#0056B3',
    bg: '#e8f0fb',
  },
  {
    icon: Zap,
    title: 'Low Transaction Fees',
    desc: 'Enjoy some of the lowest fees in the industry — flat $0.50 per transfer, free bank deposits.',
    color: '#10b981',
    bg: '#ecfdf5',
  },
  {
    icon: Shield,
    title: 'KYC Verified Accounts',
    desc: 'Every user is identity-verified, making NexVault a trusted and secure platform for everyone.',
    color: '#0056B3',
    bg: '#e8f0fb',
  },
];

const stats = [
  { value: '4.8M+', label: 'Active Users', icon: Users },
  { value: '$2.1B+', label: 'Monthly Volume', icon: Activity },
  { value: '180+', label: 'Countries', icon: Globe },
  { value: '99.99%', label: 'Uptime SLA', icon: Zap },
];

const testimonials = [
  {
    name: 'Amara Diallo',
    role: 'Freelance Designer',
    text: 'NexVault changed how I get paid internationally. No more ridiculous fees or 5-day waits. My clients transfer and it\'s there instantly.',
    initials: 'AD',
    color: '#6366f1',
  },
  {
    name: 'Ryan Osei',
    role: 'E-commerce Founder',
    text: 'Managing multiple currencies used to be a nightmare. NexVault\'s dashboard makes it effortless. Highly recommend for any business owner.',
    initials: 'RO',
    color: '#10b981',
  },
  {
    name: 'Mei Lin',
    role: 'Remote Engineer',
    text: 'The security features give me peace of mind. Biometric login, instant freeze cards, real-time alerts — it\'s everything a modern wallet should be.',
    initials: 'ML',
    color: '#f59e0b',
  },
];

const mockTransactions = [
  { label: 'Salary Deposit', sub: 'From Employer', amount: '+$5,200.00', positive: true, icon: TrendingUp },
  { label: 'Transfer Sent', sub: 'To J. Williams', amount: '-$320.00', positive: false, icon: Send },
  { label: 'Bank Deposit', sub: 'From Chase Bank', amount: '+$1,000.00', positive: true, icon: Download },
  { label: 'Card Payment', sub: 'Online Purchase', amount: '-$89.99', positive: false, icon: CreditCard },
];

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how' },
    { label: 'Reviews', href: '#testimonials' },
  ];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="landing">
      {/* ── NAV ── */}
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <div className="landing-logo-mark">N</div>
            <span>NexVault</span>
          </div>
          <div className="landing-nav-links">
            {navLinks.map(l => <a key={l.href} href={l.href}>{l.label}</a>)}
          </div>
          <div className="landing-nav-actions">
            <button className="btn btn-ghost" onClick={() => navigate('/login')}>Log In</button>
            <button className="btn btn-primary" onClick={() => navigate('/register')}>
              Get Started <ArrowRight size={15} />
            </button>
          </div>
          {/* Mobile hamburger */}
          <button
            className="landing-nav-hamburger"
            onClick={() => setMobileMenuOpen(v => !v)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="landing-mobile-menu">
            {navLinks.map(l => (
              <a key={l.href} href={l.href} onClick={() => setMobileMenuOpen(false)}>{l.label}</a>
            ))}
            <div className="landing-mobile-menu-actions">
              <button className="btn btn-outline btn-full" onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}>Log In</button>
              <button className="btn btn-primary btn-full" onClick={() => { navigate('/register'); setMobileMenuOpen(false); }}>
                Get Started <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-grid" />
        </div>

        <div className="hero-content">
          <div className="hero-badge animate-fade">
            <span className="hero-badge-dot" />
            Trusted by 4.8M+ users worldwide
          </div>
          <h1 className="hero-title animate-fade-delay-1">
            The Smarter Way<br />
            to <span className="hero-title-gradient">Manage Money</span><br />
            Globally
          </h1>
          <p className="hero-subtitle animate-fade-delay-2">
            NexVault is a cloud-native digital wallet. Send, receive, and grow your
            wealth across 180+ countries — securely, instantly, effortlessly.
          </p>
          <div className="hero-actions animate-fade-delay-3">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
              Open Free Account <ArrowRight size={16} />
            </button>
            <button className="btn btn-outline btn-lg" onClick={() => navigate('/login')}>
              Sign In
            </button>
          </div>
          <div className="hero-trust animate-fade-delay-4">
            <span><Lock size={13} /> 256-bit encrypted</span>
            <span className="hero-trust-dot" />
            <span><CheckCircle size={13} /> FDIC compliant</span>
            <span className="hero-trust-dot" />
            <span><Zap size={13} /> Zero hidden fees</span>
          </div>
        </div>

        {/* ── HERO MOCKUP ── */}
        <div className="hero-visual animate-fade-delay-2">
          <div className="hero-card-mockup">

            {/* Wallet card */}
            <div className="mockup-wallet-card">
              <div className="mockup-card-header">
                <div>
                  <div className="mockup-card-logo">NexVault</div>
                  <div className="mockup-card-type">Digital Wallet</div>
                </div>
                <div className="mockup-card-chip-wrap">
                  <div className="mockup-chip-circle" />
                  <div className="mockup-chip-circle mockup-chip-circle-2" />
                </div>
              </div>
              <div className="mockup-card-balance">
                <div className="mockup-balance-label">Available Balance</div>
                <div className="mockup-balance-value">$18,420.50</div>
              </div>
              <div className="mockup-card-footer">
                <div className="mockup-card-info">
                  <div className="mockup-card-info-label">Account</div>
                  <div className="mockup-card-info-value">NV •••• 7291</div>
                </div>
                <div className="mockup-card-info" style={{ textAlign: 'right' }}>
                  <div className="mockup-card-info-label">Status</div>
                  <div className="mockup-card-info-value mockup-verified">
                    <CheckCircle size={11} /> Verified
                  </div>
                </div>
              </div>
            </div>

            {/* Quick stats row */}
            <div className="mockup-stats">
              <div className="mockup-stat">
                <div className="mockup-stat-icon income"><TrendingUp size={14} /></div>
                <div>
                  <div className="mockup-stat-label">Income</div>
                  <div className="mockup-stat-value">$9,400</div>
                </div>
              </div>
              <div className="mockup-stat-divider" />
              <div className="mockup-stat">
                <div className="mockup-stat-icon expense"><TrendingDown size={14} /></div>
                <div>
                  <div className="mockup-stat-label">Expenses</div>
                  <div className="mockup-stat-value">$3,210</div>
                </div>
              </div>
              <div className="mockup-stat-divider" />
              <div className="mockup-stat">
                <div className="mockup-stat-icon savings"><Wallet size={14} /></div>
                <div>
                  <div className="mockup-stat-label">Savings</div>
                  <div className="mockup-stat-value">$6,190</div>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="mockup-actions">
              {[
                { icon: Send, label: 'Send', color: '#007BFF' },
                { icon: Download, label: 'Deposit', color: '#28A745' },
                { icon: CreditCard, label: 'Cards', color: '#6366f1' },
                { icon: Bell, label: 'Alerts', color: '#f59e0b' },
              ].map((a, i) => {
                const Icon = a.icon;
                return (
                  <div key={i} className="mockup-action">
                    <div className="mockup-action-icon" style={{ background: `${a.color}18`, color: a.color }}>
                      <Icon size={16} />
                    </div>
                    <span>{a.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Transactions */}
            <div className="mockup-tx-header">Recent Activity</div>
            <div className="mockup-transactions">
              {mockTransactions.map((t, i) => {
                const Icon = t.icon;
                return (
                  <div key={i} className="mockup-tx">
                    <div className={`mockup-tx-icon-wrap ${t.positive ? 'income' : 'expense'}`}>
                      <Icon size={14} />
                    </div>
                    <div className="mockup-tx-info">
                      <div className="mockup-tx-name">{t.label}</div>
                      <div className="mockup-tx-sub">{t.sub}</div>
                    </div>
                    <span className={`mockup-tx-amount ${t.positive ? 'positive' : 'negative'}`}>
                      {t.amount}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section id="stats" className="stats-section">
        <div className="stats-section-header">
          <div className="stats-section-tag">
            <span className="stats-section-tag-dot" />
            Live Platform Metrics
          </div>
          <h2 className="stats-section-title">Trusted at global scale</h2>
          <p className="stats-section-sub">Real numbers from a platform built to handle millions of transactions every day.</p>
        </div>

        <div className="stats-inner">
          <div className="landing-stat">
            <div className="landing-stat-icon"><Users size={22} /></div>
            <div className="landing-stat-value">4.8M+</div>
            <div className="landing-stat-label">Active Users</div>
            <div className="landing-stat-trend up"><TrendingUp size={11} /> +18% this year</div>
          </div>
          <div className="landing-stat">
            <div className="landing-stat-icon"><Activity size={22} /></div>
            <div className="landing-stat-value">$2.1B+</div>
            <div className="landing-stat-label">Monthly Volume</div>
            <div className="landing-stat-trend up"><TrendingUp size={11} /> +34% vs last year</div>
          </div>
          <div className="landing-stat">
            <div className="landing-stat-icon"><Globe size={22} /></div>
            <div className="landing-stat-value">180+</div>
            <div className="landing-stat-label">Countries Supported</div>
            <div className="landing-stat-trend stable"><Globe size={11} /> 150+ currencies</div>
          </div>
          <div className="landing-stat">
            <div className="landing-stat-icon"><Zap size={22} /></div>
            <div className="landing-stat-value">99.99%</div>
            <div className="landing-stat-label">Uptime SLA</div>
            <div className="landing-stat-trend stable"><CheckCircle size={11} /> All systems normal</div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="features-section">
        <div className="section-inner">
          <div className="section-header">
            <div className="section-tag">Why NexVault</div>
            <h2 className="section-title">Everything you need to manage money, smarter</h2>
            <p className="section-subtitle">Built from the ground up with enterprise-grade reliability and consumer-grade simplicity.</p>
          </div>
          <div className="features-grid">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="feature-card">
                  <div className="feature-icon-wrap" style={{ background: f.bg, color: f.color }}>
                    <Icon size={22} />
                  </div>
                  <h3 className="feature-title">{f.title}</h3>
                  <p className="feature-desc">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="how-section">
        <div className="section-inner">
          <div className="section-header">
            <div className="section-tag">Simple Process</div>
            <h2 className="section-title">Up and running in 3 steps</h2>
            <p className="section-subtitle">No paperwork, no branch visits. Open your account entirely online in minutes.</p>
          </div>
          <div className="how-grid">
            {[
              { step: '01', icon: Users, title: 'Create Account', desc: 'Sign up with your email in under 2 minutes. No credit card required to get started.' },
              { step: '02', icon: Shield, title: 'Verify Identity', desc: 'Complete a quick KYC check with your government ID to unlock all features and higher limits.' },
              { step: '03', icon: Zap, title: 'Start Transacting', desc: 'Deposit funds and start sending money globally, earning cashback, and tracking your finances.' },
            ].map((h, i) => {
              const Icon = h.icon;
              return (
                <div key={i} className="how-card">
                  <div className="how-step-num">{h.step}</div>
                  <div className="how-icon"><Icon size={24} /></div>
                  <h3>{h.title}</h3>
                  <p>{h.desc}</p>
                  {i < 2 && <div className="how-connector" />}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section id="testimonials" className="testimonials-section">
        <div className="section-inner">
          <div className="section-header">
            <div className="section-tag">Customer Stories</div>
            <h2 className="section-title">Loved by people worldwide</h2>
            <p className="section-subtitle">Real stories from real users who transformed how they manage money.</p>
          </div>
          <div className="testimonials-grid">
            {testimonials.map((t, i) => (
              <div key={i} className="testimonial-card">
                <div className="testimonial-stars">
                  {[...Array(5)].map((_, s) => <Star key={s} size={14} fill="#f59e0b" color="#f59e0b" />)}
                </div>
                <p className="testimonial-text">"{t.text}"</p>
                <div className="testimonial-author">
                  <div className="avatar" style={{ background: t.color, color: '#fff', width: 42, height: 42, fontSize: 15 }}>{t.initials}</div>
                  <div>
                    <div className="testimonial-name">{t.name}</div>
                    <div className="testimonial-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="landing-footer">
        {/* Top CTA bar */}
        <div className="footer-top-bar">
          <div className="footer-top-bar-inner">
            <div className="footer-top-bar-text">
              <h3>Ready to take control of your finances?</h3>
              <p>Join 4.8M+ users already banking smarter with NexVault.</p>
            </div>
            <div className="footer-top-bar-actions">
              <button className="footer-cta-btn" onClick={() => navigate('/register')}>
                Open Free Account <ArrowRight size={15} />
              </button>
              <button className="footer-cta-btn-outline" onClick={() => navigate('/login')}>
                Sign In
              </button>
            </div>
          </div>
        </div>

        {/* Main body */}
        <div className="footer-body">
          <div className="footer-inner">
            {/* Brand */}
            <div className="footer-brand">
              <div className="landing-logo footer-logo">
                <div className="landing-logo-mark">N</div>
                <span>NexVault</span>
              </div>
              <p className="footer-brand-desc">
                Next-generation digital wallet built on distributed cloud microservices.
                Secure, instant, and available in 180+ countries.
              </p>
              <div className="footer-contact-row">
                <Mail size={13} /> support@nexvault.io
              </div>
              <div className="footer-contact-row">
                <Globe size={13} /> nexvault.io
              </div>
              <div className="footer-social">
                <a href="#" aria-label="Twitter" className="footer-social-btn"><FaTwitter size={15} /></a>
                <a href="#" aria-label="GitHub" className="footer-social-btn"><FaGithub size={15} /></a>
                <a href="#" aria-label="LinkedIn" className="footer-social-btn"><FaLinkedinIn size={15} /></a>
                <a href="#" aria-label="Instagram" className="footer-social-btn"><FaInstagram size={15} /></a>
              </div>
            </div>

            {/* Product */}
            <div className="footer-col">
              <div className="footer-col-title">Product</div>
              <a href="#features"><Shield size={13} /> Security</a>
              <a href="#how"><Zap size={13} /> How It Works</a>
              <a href="#stats"><BarChart2 size={13} /> Analytics</a>
              <a href="#features"><Zap size={13} /> Low Fees</a>
              <a href="#features"><Shield size={13} /> KYC Verified</a>
            </div>

            {/* Company */}
            <div className="footer-col">
              <div className="footer-col-title">Company</div>
              <a href="#"><Users size={13} /> About Us</a>
              <a href="#"><Globe size={13} /> Blog</a>
              <a href="#"><Activity size={13} /> Careers</a>
              <a href="#"><Star size={13} /> Press Kit</a>
              <a href="#"><CheckCircle size={13} /> Partners</a>
            </div>

            {/* Support */}
            <div className="footer-col">
              <div className="footer-col-title">Support</div>
              <a href="#"><HelpCircle size={13} /> Help Center</a>
              <a href="#"><Mail size={13} /> Contact Us</a>
              <a href="#"><Activity size={13} /> Status Page</a>
              <a href="#"><Lock size={13} /> Privacy Policy</a>
              <a href="#"><Shield size={13} /> Terms of Service</a>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="footer-bottom-wrap">
            <div className="footer-bottom">
              <div className="footer-bottom-left">
                <span className="footer-bottom-copy">© 2025 NexVault Technologies, Inc. All rights reserved.</span>
                <div className="footer-bottom-links">
                  <a href="#">Privacy</a>
                  <a href="#">Terms</a>
                  <a href="#">Cookies</a>
                </div>
              </div>
              <div className="footer-bottom-badges">
                <span className="footer-badge"><Lock size={11} /> SSL Secured</span>
                <span className="footer-badge"><Shield size={11} /> FDIC Insured</span>
                <span className="footer-badge"><CheckCircle size={11} /> SOC 2 Certified</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="landing-loading">
        <div className="landing-logo">
          <div className="landing-logo-mark">N</div>
          <span>NexVault</span>
        </div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Will redirect
  }

  return <Landing />;
}
