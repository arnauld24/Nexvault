<<<<<<< HEAD
import React, { useState, useEffect } from 'react';
=======
import React, { useState } from 'react';
>>>>>>> ec2b1053c5f7048b5abbc6c93b3702001479646e
import { useNavigate, Link } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight,
  User, Phone, CheckCircle, Shield, Zap, BarChart2, Target,
} from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';
import { FaApple } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
<<<<<<< HEAD
=======
import { currentUser } from '../data/mockData';
>>>>>>> ec2b1053c5f7048b5abbc6c93b3702001479646e
import './Auth.css';

function validateEmail(email) {
  // RFC 5322 simplified — covers all real-world email formats
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

function validatePassword(pw) {
  return pw.length >= 8;
}

function validateName(name) {
  // Letters, spaces, hyphens, apostrophes only — min 2 chars
  return /^[a-zA-ZÀ-ÿ' \-]{2,}$/.test(name.trim());
}

function validatePhone(phone) {
  // Accepts: +1 (555) 000-0000 / +44 7911 123456 / 0612345678 etc.
  // Strips spaces, dashes, dots, parens then checks 7–15 digits with optional leading +
  const stripped = phone.replace(/[\s\-().]/g, '');
  return /^\+?[0-9]{7,15}$/.test(stripped);
}

function getPasswordStrength(pw) {
  if (!pw) return { label: '', color: 'var(--border)', score: 0 };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: 'Weak', color: 'var(--danger)', score };
  if (score <= 3) return { label: 'Medium', color: 'var(--warning)', score };
  return { label: 'Strong', color: 'var(--success)', score };
}

export function Login() {
  const navigate = useNavigate();
<<<<<<< HEAD
  const { login, verifyTwoFactor, isAuthenticated, isLoading } = useAuth();
=======
  const { login } = useAuth();
>>>>>>> ec2b1053c5f7048b5abbc6c93b3702001479646e
  const [form, setForm] = useState({ email: '', password: '', remember: false });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
<<<<<<< HEAD
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorEmail, setTwoFactorEmail] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);

  const justRegistered = new URLSearchParams(window.location.search).get('registered') === 'true';

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

=======

  const justRegistered = new URLSearchParams(window.location.search).get('registered') === 'true';

>>>>>>> ec2b1053c5f7048b5abbc6c93b3702001479646e
  const validate = () => {
    const e = {};
    if (!form.email.trim()) e.email = 'Email is required.';
    else if (!validateEmail(form.email)) e.email = 'Enter a valid email address (e.g. you@example.com).';
    if (!form.password) e.password = 'Password is required.';
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters.';
    return e;
  };

<<<<<<< HEAD
  const handleSubmit = async (e) => {
=======
  const handleSubmit = (e) => {
>>>>>>> ec2b1053c5f7048b5abbc6c93b3702001479646e
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
<<<<<<< HEAD
    
    try {
      const response = await login(form.email, form.password, 'Web Browser', 'desktop');
      if (response.success) {
        if (response.requiresTwoFactor) {
          setTwoFactorRequired(true);
          setTwoFactorEmail(response.email);
          setLoading(false);
        } else {
          navigate('/dashboard');
        }
      } else {
        setErrors({ general: response.error || 'Login failed. Please try again.' });
        setLoading(false);
      }
    } catch (error) {
      setErrors({ general: error.message || 'An error occurred. Please try again.' });
      setLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e) => {
    e.preventDefault();
    if (!twoFactorCode.trim()) {
      setErrors({ twoFactor: 'Verification code is required.' });
      return;
    }
    setErrors({});
    setTwoFactorLoading(true);

    try {
      const response = await verifyTwoFactor(twoFactorEmail, twoFactorCode);
      if (response.success) {
        navigate('/dashboard');
      } else {
        setErrors({ twoFactor: response.error || 'Invalid verification code.' });
      }
    } catch (error) {
      setErrors({ twoFactor: error.message || 'Verification failed. Please try again.' });
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setTwoFactorRequired(false);
    setTwoFactorCode('');
    setErrors({});
=======
    setTimeout(() => {
      setLoading(false);
      login(currentUser);
      navigate('/dashboard');
    }, 1200);
>>>>>>> ec2b1053c5f7048b5abbc6c93b3702001479646e
  };

  const features = [
    { icon: <Shield size={16} />, label: 'Bank-grade security' },
    { icon: <Zap size={16} />, label: 'Instant global transfers' },
    { icon: <BarChart2 size={16} />, label: 'Real-time analytics' },
    { icon: <Target size={16} />, label: 'Cashback rewards' },
  ];

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="landing-logo" style={{ marginBottom: 40 }}>
            <div className="landing-logo-mark">N</div>
            <span style={{ color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22 }}>NexVault</span>
          </div>
          <h2>Welcome back to the future of finance.</h2>
          <p>Manage your money smarter. Send, receive, and grow your wealth with the power of distributed cloud banking.</p>
          <div className="auth-features">
            {features.map((f, i) => (
              <div key={i} className="auth-feature-item">
                {f.icon} {f.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrap animate-fade">
          <div className="auth-form-header">
<<<<<<< HEAD
            <h1>{twoFactorRequired ? 'Two-Factor Authentication' : 'Sign in'}</h1>
            <p>{twoFactorRequired ? `Enter the verification code sent to ${twoFactorEmail}` : 'Welcome back! Enter your details to continue.'}</p>
          </div>

          {justRegistered && !twoFactorRequired && (
=======
            <h1>Sign in</h1>
            <p>Welcome back! Enter your details to continue.</p>
          </div>

          {justRegistered && (
>>>>>>> ec2b1053c5f7048b5abbc6c93b3702001479646e
            <div className="alert alert-success" style={{ marginBottom: 16 }}>
              Account created! Sign in to access your dashboard.
            </div>
          )}

<<<<<<< HEAD
          {errors.general && !twoFactorRequired && (
            <div className="alert alert-danger" style={{ marginBottom: 16 }}>
              {errors.general}
            </div>
          )}

          {errors.twoFactor && twoFactorRequired && (
            <div className="alert alert-danger" style={{ marginBottom: 16 }}>
              {errors.twoFactor}
            </div>
          )}

          {twoFactorRequired ? (
            <form onSubmit={handleTwoFactorSubmit} noValidate>
              <div className="form-group">
                <label className="form-label">Verification Code</label>
                <input
                  type="text"
                  className={`form-control ${errors.twoFactor ? 'input-error' : ''}`}
                  placeholder="Enter 6-digit code"
                  value={twoFactorCode}
                  onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  aria-describedby={errors.twoFactor ? '2fa-error' : undefined}
                />
                {errors.twoFactor && <span id="2fa-error" className="field-error">{errors.twoFactor}</span>}
              </div>

              <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={twoFactorLoading}>
                {twoFactorLoading ? <><span className="spinner" />Verifying...</> : <><span>Verify Code</span><ArrowRight size={16} /></>}
              </button>

              <button type="button" className="btn btn-secondary btn-full" onClick={handleBackToLogin} style={{ marginTop: 12 }}>
                Back to Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
=======
          <form onSubmit={handleSubmit} noValidate>
>>>>>>> ec2b1053c5f7048b5abbc6c93b3702001479646e
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-icon-wrap">
                <Mail size={16} className="input-icon" />
                <input
                  type="email"
                  className={`form-control input-with-icon ${errors.email ? 'input-error' : ''}`}
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
              </div>
              {errors.email && <span id="email-error" className="field-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                Password
                <a href="#" style={{ fontWeight: 400, fontSize: 13 }}>Forgot password?</a>
              </label>
              <div className="input-icon-wrap">
                <Lock size={16} className="input-icon" />
                <input
                  type={showPw ? 'text' : 'password'}
                  className={`form-control input-with-icon input-with-icon-right ${errors.password ? 'input-error' : ''}`}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  aria-describedby={errors.password ? 'pw-error' : undefined}
                />
                <button type="button" className="input-icon-right" onClick={() => setShowPw(v => !v)} aria-label="Toggle password">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <span id="pw-error" className="field-error">{errors.password}</span>}
            </div>

            <div className="auth-remember">
              <label>
                <input type="checkbox" checked={form.remember} onChange={e => setForm({ ...form, remember: e.target.checked })} />
                <span>Remember me for 30 days</span>
              </label>
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
              {loading ? <><span className="spinner" />Signing in...</> : <><span>Sign In</span><ArrowRight size={16} /></>}
            </button>
          </form>
<<<<<<< HEAD
          )}

          {!twoFactorRequired && (
            <>
              <div className="auth-divider"><span>or continue with</span></div>
              <div className="auth-social">
                <button className="auth-social-btn"><FcGoogle size={18} /> Google</button>
                <button className="auth-social-btn"><FaApple size={18} /> Apple</button>
              </div>

              <div className="auth-switch">
                Don't have an account? <Link to="/register">Create one free</Link>
              </div>
            </>
          )}
=======

          <div className="auth-divider"><span>or continue with</span></div>
          <div className="auth-social">
            <button className="auth-social-btn"><FcGoogle size={18} /> Google</button>
            <button className="auth-social-btn"><FaApple size={18} /> Apple</button>
          </div>

          <div className="auth-switch">
            Don't have an account? <Link to="/register">Create one free</Link>
          </div>
>>>>>>> ec2b1053c5f7048b5abbc6c93b3702001479646e
        </div>
      </div>
    </div>
  );
}

export function Register() {
  const navigate = useNavigate();
<<<<<<< HEAD
  const { register, login, isAuthenticated, isLoading } = useAuth();
=======
>>>>>>> ec2b1053c5f7048b5abbc6c93b3702001479646e
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    password: '', confirm: '', agree: false,
  });

<<<<<<< HEAD
  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

=======
>>>>>>> ec2b1053c5f7048b5abbc6c93b3702001479646e
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validateStep1 = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required.';
    else if (!validateName(form.firstName)) e.firstName = 'Enter a valid first name (letters only, min 2 chars).';

    if (!form.lastName.trim()) e.lastName = 'Last name is required.';
    else if (!validateName(form.lastName)) e.lastName = 'Enter a valid last name (letters only, min 2 chars).';

    if (!form.email.trim()) e.email = 'Email is required.';
    else if (!validateEmail(form.email)) e.email = 'Enter a valid email address (e.g. you@example.com).';

    if (!form.phone.trim()) e.phone = 'Phone number is required.';
    else if (!validatePhone(form.phone)) e.phone = 'Enter a valid phone number (e.g. +1 555 000 0000).';

    return e;
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.password) e.password = 'Password is required.';
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters.';
    else if (!/[A-Z]/.test(form.password)) e.password = 'Password must contain at least one uppercase letter.';
    else if (!/[0-9]/.test(form.password)) e.password = 'Password must contain at least one number.';

    if (!form.confirm) e.confirm = 'Please confirm your password.';
    else if (form.password !== form.confirm) e.confirm = 'Passwords do not match.';

    if (!form.agree) e.agree = 'You must accept the terms to continue.';
    return e;
  };

<<<<<<< HEAD
  const handleNext = async (e) => {
=======
  const handleNext = (e) => {
>>>>>>> ec2b1053c5f7048b5abbc6c93b3702001479646e
    e.preventDefault();
    if (step === 1) {
      const errs = validateStep1();
      if (Object.keys(errs).length) { setErrors(errs); return; }
      setErrors({});
      setStep(2);
      return;
    }
    const errs = validateStep2();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
<<<<<<< HEAD
    
    try {
      const response = await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phoneNumber: form.phone,
        country: null,
        city: null,
        password: form.password,
      });
      
      if (response.success) {
        const loginResponse = await login(form.email, form.password, 'Web Browser', 'desktop');
        if (loginResponse.success) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/login?registered=true');
        }
      } else {
        setErrors({ general: response.error || 'Registration failed. Please try again.' });
      }
    } catch (error) {
      setErrors({ general: error.message || 'An error occurred during registration.' });
    } finally {
      setLoading(false);
    }
=======
    setTimeout(() => { setLoading(false); navigate('/login?registered=true'); }, 1200);
>>>>>>> ec2b1053c5f7048b5abbc6c93b3702001479646e
  };

  const pwStrength = getPasswordStrength(form.password);
  const pwColor = pwStrength.color;

  const steps = ['Create your account', 'Sign in', 'Verify & transact'];

  return (
    <div className="auth-page">
      <div className="auth-left auth-left-register">
        <div className="auth-left-content">
          <div className="landing-logo" style={{ marginBottom: 40 }}>
            <div className="landing-logo-mark">N</div>
            <span style={{ color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22 }}>NexVault</span>
          </div>
          <h2>Start your financial journey in 2 minutes.</h2>
          <p>Open a NexVault account today — free, secure, and powerful. No hidden fees, no minimum balance.</p>
          <div className="auth-steps-visual">
            {steps.map((s, i) => (
              <div key={i} className="auth-step-vis">
                <div className={`auth-step-num ${step > i ? 'done' : step === i + 1 ? 'curr' : ''}`}>
                  {step > i ? <CheckCircle size={14} /> : i + 1}
                </div>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrap animate-fade">
          <div className="auth-form-header">
            <h1>{step === 1 ? 'Create Account' : 'Secure your account'}</h1>
            <p>{step === 1 ? 'Step 1 of 2 — Personal information' : 'Step 2 of 2 — Set your password'}</p>
          </div>

          <div className="auth-progress">
            <div className="auth-progress-fill" style={{ width: `${step * 50}%` }} />
          </div>

<<<<<<< HEAD
          {errors.general && (
            <div className="alert alert-danger" style={{ marginTop: 16, marginBottom: 16 }}>
              {errors.general}
            </div>
          )}

=======
>>>>>>> ec2b1053c5f7048b5abbc6c93b3702001479646e
          <form onSubmit={handleNext} noValidate style={{ marginTop: 24 }}>
            {step === 1 && <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <div className="input-icon-wrap">
                    <User size={16} className="input-icon" />
                    <input className={`form-control input-with-icon ${errors.firstName ? 'input-error' : ''}`} placeholder="John" value={form.firstName} onChange={e => update('firstName', e.target.value)} />
                  </div>
                  {errors.firstName && <span className="field-error">{errors.firstName}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <div className="input-icon-wrap">
                    <User size={16} className="input-icon" />
                    <input className={`form-control input-with-icon ${errors.lastName ? 'input-error' : ''}`} placeholder="Doe" value={form.lastName} onChange={e => update('lastName', e.target.value)} />
                  </div>
                  {errors.lastName && <span className="field-error">{errors.lastName}</span>}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-icon-wrap">
                  <Mail size={16} className="input-icon" />
                  <input type="email" className={`form-control input-with-icon ${errors.email ? 'input-error' : ''}`} placeholder="you@example.com" value={form.email} onChange={e => update('email', e.target.value)} />
                </div>
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <div className="input-icon-wrap">
                  <Phone size={16} className="input-icon" />
                  <input type="tel" className={`form-control input-with-icon ${errors.phone ? 'input-error' : ''}`} placeholder="+1 (555) 000-0000" value={form.phone} onChange={e => update('phone', e.target.value)} />
                </div>
                {errors.phone && <span className="field-error">{errors.phone}</span>}
              </div>
            </>}

            {step === 2 && <>
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-icon-wrap">
                  <Lock size={16} className="input-icon" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    className={`form-control input-with-icon input-with-icon-right ${errors.password ? 'input-error' : ''}`}
                    placeholder="Min 8 characters"
                    value={form.password}
                    onChange={e => update('password', e.target.value)}
                  />
                  <button type="button" className="input-icon-right" onClick={() => setShowPw(v => !v)} aria-label="Toggle password">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {form.password && (
                  <div className="auth-password-strength">
                    <div className="pws-bar" style={{ background: pwColor, width: `${(pwStrength.score / 5) * 100}%` }} />
                    <span style={{ color: pwColor }}>{pwStrength.label}</span>
                  </div>
                )}
                <div className="auth-pw-hints">
                  <span className={form.password.length >= 8 ? 'hint-ok' : 'hint-off'}>8+ characters</span>
                  <span className={/[A-Z]/.test(form.password) ? 'hint-ok' : 'hint-off'}>Uppercase</span>
                  <span className={/[0-9]/.test(form.password) ? 'hint-ok' : 'hint-off'}>Number</span>
                  <span className={/[^a-zA-Z0-9]/.test(form.password) ? 'hint-ok' : 'hint-off'}>Symbol</span>
                </div>
                {errors.password && <span className="field-error">{errors.password}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <div className="input-icon-wrap">
                  <Lock size={16} className="input-icon" />
                  <input type="password" className={`form-control input-with-icon ${errors.confirm ? 'input-error' : ''}`} placeholder="Repeat password" value={form.confirm} onChange={e => update('confirm', e.target.value)} />
                </div>
                {errors.confirm && <span className="field-error">{errors.confirm}</span>}
              </div>
              <div className="auth-agree">
                <label>
                  <input type="checkbox" checked={form.agree} onChange={e => update('agree', e.target.checked)} />
                  <span>I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a></span>
                </label>
                {errors.agree && <span className="field-error" style={{ display: 'block', marginTop: 4 }}>{errors.agree}</span>}
              </div>
            </>}

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              {step === 2 && (
                <button type="button" className="btn btn-outline btn-lg" style={{ flex: 1 }} onClick={() => { setStep(1); setErrors({}); }}>
                  ← Back
                </button>
              )}
              <button type="submit" className="btn btn-primary btn-lg" style={{ flex: 1 }} disabled={loading}>
                {loading ? <><span className="spinner" />Creating...</> : step === 1 ? <><span>Continue</span><ArrowRight size={16} /></> : <><span>Create Account</span><ArrowRight size={16} /></>}
              </button>
            </div>
          </form>

          <div className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
