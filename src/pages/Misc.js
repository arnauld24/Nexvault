import React, { useState, useEffect } from 'react';
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
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import './Misc.css';

/* ─── NOTIFICATIONS ─── */
export function Notifications() {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications
  } = useNotifications();

  const notifIconMap = {
    success: <CheckCircle size={18} />,
    info: <Bell size={18} />,
    warning: <AlertTriangle size={18} />,
    danger: <X size={18} />,
  };

  const handleDeleteNotification = (event, notificationId) => {
    event.stopPropagation();
    deleteNotification(notificationId);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="page-header">
          <h1>Notifications</h1>
          <p>Loading notifications...</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <span className="spinner" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="page-header">
          <h1>Notifications</h1>
          <p>Failed to load notifications.</p>
        </div>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--danger)', marginBottom: '16px' }}>{error}</p>
          <button className="btn btn-primary" onClick={refreshNotifications}>
            Try Again
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1>Notifications</h1>
          <p>{unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}.` : 'All caught up!'}</p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={markAllAsRead}>
            <CheckCheck size={14} /> Mark all as read
          </button>
        )}
      </div>

      <div className="notif-list animate-fade">
        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <Bell size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
            <p>No notifications yet.</p>
          </div>
        ) : (
          notifications.map(n => {
            const isSynthetic = String(n.id).startsWith('tx-');
            return (
              <div key={n.id} className={`notif-item card ${!n.read ? 'unread' : ''}`} onClick={() => !isSynthetic && markAsRead(n.id)}>
              <div className={`notif-icon notif-icon-${n.type}`}>{notifIconMap[n.type] || <Bell size={18} />}</div>
              <div className="notif-content">
                <div className="notif-title">{n.title}</div>
                <div className="notif-message">{n.message}</div>
                <div className="notif-time">{n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Just now'}</div>
              </div>
              <div className="notif-actions">
                {!n.read && <div className="notif-dot" />}
                <button
                  className="btn btn-ghost btn-sm notif-delete-btn"
                  onClick={(event) => handleDeleteNotification(event, n.id)}
                  aria-label="Delete notification"
                  title="Delete notification"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            );
          }) )}
      </div>
    </DashboardLayout>
  );
}

/* ─── PROFILE ─── */
export function Profile() {
  const [editing, setEditing] = useState(false);
  const { kycStatus } = useKYC();
  const { user, updateUser } = useAuth();
  const { addNotification } = useNotifications();
  const navigate = useNavigate();
  const [photo, setPhoto] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = React.useRef();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    country: '',
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Modals
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showTwoFAModal, setShowTwoFAModal] = useState(false);
  const [twoFAStatus, setTwoFAStatus] = useState(null);
  const [loadingTwoFA, setLoadingTwoFA] = useState(false);

  // Password modal state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [changingPassword, setChangingPassword] = useState(false);

  // 2FA modal state
  const [twoFAMethod, setTwoFAMethod] = useState('email');
  const [enabling2FA, setEnabling2FA] = useState(false);
  const [disabling2FA, setDisabling2FA] = useState(false);
  const [twoFACode, setTwoFACode] = useState('');

  // Fetch profile data once after login
  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiClient.getUserProfile();
        const profileData = response.user;

        setPhoto(profileData.avatarUrl || null);
        setForm({
          name: `${profileData.firstName || ''} ${profileData.lastName || ''}`.trim(),
          email: profileData.email || '',
          phone: profileData.phoneNumber || '',
          address: profileData.city || '',
          country: profileData.country || '',
        });

        // Fetch 2FA status - don't fail if it errors
        try {
          const twoFARes = await apiClient.get2FAStatus();
          setTwoFAStatus({
            enabled: twoFARes.twoFactorEnabled || false,
            method: twoFARes.twoFactorMethod || null,
          });
        } catch (err) {
          console.warn('Failed to fetch 2FA status:', err);
          setTwoFAStatus({ enabled: false, method: null });
        }

        const profileUpdates = {};
        if (profileData.firstName && profileData.firstName !== user.firstName) profileUpdates.firstName = profileData.firstName;
        if (profileData.lastName && profileData.lastName !== user.lastName) profileUpdates.lastName = profileData.lastName;
        if (profileData.email && profileData.email !== user.email) profileUpdates.email = profileData.email;
        if (profileData.phoneNumber && profileData.phoneNumber !== user.phone) profileUpdates.phone = profileData.phoneNumber;
        if (profileData.country && profileData.country !== user.country) profileUpdates.country = profileData.country;
        if (profileData.city && profileData.city !== user.city) profileUpdates.city = profileData.city;

        if (Object.keys(profileUpdates).length > 0) {
          updateUser(profileUpdates);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setError('Failed to load profile data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.id, updateUser]);

  const handlePhotoUpload = async (file) => {
    if (!file) return;

    try {
      setUploadingPhoto(true);
      setError(null);

      // Convert image to base64 or URL
      const reader = new FileReader();
      reader.onloadend = async () => {
        const avatarUrl = reader.result;
        setPhoto(avatarUrl);

        // Save to database
        const response = await apiClient.updateAvatar(avatarUrl);

        if (response.success) {
          addNotification({
            id: Date.now(),
            type: 'success',
            title: 'Avatar Updated',
            message: 'Your profile photo has been updated successfully.',
            read: false,
            createdAt: new Date(),
          });

          updateUser({ avatarUrl });
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Failed to upload photo:', err);
      setError('Failed to upload photo. Please try again.');
      addNotification({
        id: Date.now(),
        type: 'danger',
        title: 'Upload Failed',
        message: 'Failed to upload your profile photo.',
        read: false,
        createdAt: new Date(),
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const nameParts = form.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const updateData = {
        firstName,
        lastName,
        phoneNumber: form.phone,
        city: form.address,
        country: form.country,
      };

      const response = await apiClient.updateUserProfile(updateData);

      updateUser({
        firstName: response.user.firstName,
        lastName: response.user.lastName,
        phone: response.user.phoneNumber,
        country: response.user.country,
        city: response.user.city,
      });

      setSaved(true);
      setEditing(false);

      addNotification({
        id: Date.now(),
        type: 'success',
        title: 'Profile Updated',
        message: 'Your profile has been updated successfully.',
        read: false,
        createdAt: new Date(),
      });

      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError('Failed to update profile. Please try again.');
      addNotification({
        id: Date.now(),
        type: 'danger',
        title: 'Update Failed',
        message: 'Failed to update your profile. Please try again.',
        read: false,
        createdAt: new Date(),
      });
    } finally {
      setSaving(false);
    }
  };

  const validatePasswordForm = () => {
    const errors = {};
    if (!passwordForm.currentPassword) errors.currentPassword = 'Current password is required';
    if (!passwordForm.newPassword) errors.newPassword = 'New password is required';
    if (passwordForm.newPassword.length < 8) errors.newPassword = 'Password must be at least 8 characters';
    if (passwordForm.newPassword !== passwordForm.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    if (passwordForm.currentPassword === passwordForm.newPassword) errors.newPassword = 'New password must be different';

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validatePasswordForm()) return;

    try {
      setChangingPassword(true);
      setError(null);

      const response = await apiClient.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword
      );

      if (response.success) {
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordModal(false);

        addNotification({
          id: Date.now(),
          type: 'success',
          title: 'Password Changed',
          message: 'Your password has been changed successfully. Please log in again.',
          read: false,
          createdAt: new Date(),
        });

        // Redirect to login after short delay
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (err) {
      console.error('Failed to change password:', err);
      setError(err.message || 'Failed to change password. Please try again.');
      addNotification({
        id: Date.now(),
        type: 'danger',
        title: 'Password Change Failed',
        message: err.message || 'Failed to change your password.',
        read: false,
        createdAt: new Date(),
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleEnable2FA = async () => {
    try {
      setEnabling2FA(true);
      setError(null);

      const response = await apiClient.enable2FA(twoFAMethod);

      if (response.success) {
        setTwoFAStatus({
          enabled: true,
          method: twoFAMethod,
        });

        addNotification({
          id: Date.now(),
          type: 'success',
          title: '2FA Enabled',
          message: `Two-factor authentication enabled via ${twoFAMethod}.`,
          read: false,
          createdAt: new Date(),
        });
      }
    } catch (err) {
      console.error('Failed to enable 2FA:', err);
      addNotification({
        id: Date.now(),
        type: 'danger',
        title: '2FA Setup Failed',
        message: err.message || 'Failed to enable 2FA.',
        read: false,
        createdAt: new Date(),
      });
    } finally {
      setEnabling2FA(false);
    }
  };

  const handleDisable2FA = async () => {
    try {
      setDisabling2FA(true);
      setError(null);

      const response = await apiClient.disable2FA(twoFACode);

      if (response.success) {
        setTwoFAStatus({
          enabled: false,
          method: null,
        });
        setTwoFACode('');

        addNotification({
          id: Date.now(),
          type: 'success',
          title: '2FA Disabled',
          message: 'Two-factor authentication has been disabled.',
          read: false,
          createdAt: new Date(),
        });
      }
    } catch (err) {
      console.error('Failed to disable 2FA:', err);
      addNotification({
        id: Date.now(),
        type: 'danger',
        title: '2FA Disable Failed',
        message: err.message || 'Failed to disable 2FA.',
        read: false,
        createdAt: new Date(),
      });
    } finally {
      setDisabling2FA(false);
    }
  };

  const kycLabel = kycStatus === 'verified' ? 'Fully Verified ✓' : kycStatus === 'pending' ? 'Under Review' : 'Not Verified';
  const kycOk = kycStatus === 'verified';

  if (loading) {
    return (
      <DashboardLayout>
        <div className="page-header">
          <h1>My Profile</h1>
          <p>Loading profile...</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <span className="spinner" />
        </div>
      </DashboardLayout>
    );
  }

  if (error && !user) {
    return (
      <DashboardLayout>
        <div className="page-header">
          <h1>My Profile</h1>
          <p>Failed to load profile.</p>
        </div>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--danger)', marginBottom: '16px' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Manage your personal information and account details.</p>
      </div>

      {saved && <div className="alert alert-success animate-fade"><CheckCircle size={14} /> Profile updated successfully.</div>}
      {error && <div className="alert alert-danger animate-fade">{error}</div>}

      <div className="profile-layout animate-fade">
        <div>
          <div className="card profile-avatar-card">
            <div className="profile-avatar">
              {photo
                ? <img src={photo} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                : <span>{user?.initials || user?.firstName?.[0] || 'U'}</span>
              }
              <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files[0]; if (f) handlePhotoUpload(f); }} />
              <button className="profile-avatar-edit" aria-label="Change photo" onClick={() => photoInputRef.current.click()} disabled={uploadingPhoto}>
                <Camera size={14} />
              </button>
            </div>
            <h2 className="profile-name">{form.name}</h2>
            <p className="profile-email">{form.email}</p>
            <div className="divider" />
            <div className="profile-meta">
              <div className="profile-meta-item">
                <span className="profile-meta-label">Account #</span>
                <span className="profile-meta-value font-mono">{user?.id?.substring(0, 8).toUpperCase() || 'NV-XXXX'}</span>
              </div>
              <div className="profile-meta-item">
                <span className="profile-meta-label">Member Since</span>
                <span className="profile-meta-value">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '2024-01-01'}</span>
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
              { label: 'Full Name', key: 'name', type: 'text' },
              { label: 'Email Address', key: 'email', type: 'email' },
              { label: 'Phone Number', key: 'phone', type: 'tel' },
              { label: 'Address', key: 'address', type: 'text' },
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
              <input className="form-control" value={form.country} disabled />
            </div>
            {editing && (
              <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>

          <div className="card" style={{ marginTop: 20, padding: 24 }}>
            <h3 style={{ marginBottom: 16 }}>Security & Verification</h3>
            <div className="security-items">
              <div className="security-item">
                <div className="security-status ok" />
                <div className="security-info">
                  <div className="security-label">Password</div>
                  <div className="security-value">Change your account password</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowPasswordModal(true)}>Change</button>
              </div>
              <div className="security-item">
                <div className={`security-status ${twoFAStatus?.enabled ? 'ok' : 'warn'}`} />
                <div className="security-info">
                  <div className="security-label">2-Factor Auth</div>
                  <div className="security-value">{twoFAStatus?.enabled ? `Enabled via ${twoFAStatus.method}` : 'Not enabled'}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowTwoFAModal(true)}>
                  {twoFAStatus?.enabled ? 'Manage' : 'Enable'}
                </button>
              </div>
              <div className="security-item">
                <div className={`security-status ${kycOk ? 'ok' : 'warn'}`} />
                <div className="security-info">
                  <div className="security-label">KYC Verification</div>
                  <div className="security-value">{kycLabel}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/kyc')}>
                  {kycStatus === 'unverified' ? 'Verify' : 'View'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: 400, padding: 24 }}>
            <h3 style={{ marginBottom: 20 }}>Change Password</h3>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                type="password"
                className={`form-control ${passwordErrors.currentPassword ? 'is-invalid' : ''}`}
                value={passwordForm.currentPassword}
                onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                placeholder="Enter current password"
              />
              {passwordErrors.currentPassword && <span style={{ color: 'var(--danger)', fontSize: '12px' }}>{passwordErrors.currentPassword}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className={`form-control ${passwordErrors.newPassword ? 'is-invalid' : ''}`}
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                placeholder="Enter new password"
              />
              {passwordErrors.newPassword && <span style={{ color: 'var(--danger)', fontSize: '12px' }}>{passwordErrors.newPassword}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                className={`form-control ${passwordErrors.confirmPassword ? 'is-invalid' : ''}`}
                value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
              />
              {passwordErrors.confirmPassword && <span style={{ color: 'var(--danger)', fontSize: '12px' }}>{passwordErrors.confirmPassword}</span>}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button className="btn btn-ghost btn-full" onClick={() => setShowPasswordModal(false)} disabled={changingPassword}>Cancel</button>
              <button className="btn btn-primary btn-full" onClick={handleChangePassword} disabled={changingPassword}>
                {changingPassword ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Setup Modal */}
      {showTwoFAModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: 400, padding: 24 }}>
            <h3 style={{ marginBottom: 20 }}>{twoFAStatus?.enabled ? 'Manage 2FA' : 'Enable 2FA'}</h3>
            {!twoFAStatus?.enabled ? (
              <>
                <p style={{ marginBottom: 16, color: 'var(--text-muted)' }}>Choose your two-factor authentication method:</p>
                <div className="form-group">
                  <label className="form-label">2FA Method</label>
                  <select className="form-control" value={twoFAMethod} onChange={e => setTwoFAMethod(e.target.value)}>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                    <option value="totp">Authenticator App (TOTP)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                  <button className="btn btn-ghost btn-full" onClick={() => setShowTwoFAModal(false)} disabled={enabling2FA}>Cancel</button>
                  <button className="btn btn-primary btn-full" onClick={handleEnable2FA} disabled={enabling2FA}>
                    {enabling2FA ? 'Enabling...' : 'Enable 2FA'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p style={{ marginBottom: 16, color: 'var(--text-muted)' }}>2FA is currently enabled via {twoFAStatus.method}.</p>
                <div className="form-group">
                  <label className="form-label">Verification Code</label>
                  <input
                    type="text"
                    className="form-control"
                    value={twoFACode}
                    onChange={e => setTwoFACode(e.target.value)}
                    placeholder="Enter verification code"
                  />
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                  <button className="btn btn-ghost btn-full" onClick={() => setShowTwoFAModal(false)} disabled={disabling2FA}>Cancel</button>
                  <button className="btn btn-danger btn-full" onClick={handleDisable2FA} disabled={disabling2FA}>
                    {disabling2FA ? 'Disabling...' : 'Disable 2FA'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
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
