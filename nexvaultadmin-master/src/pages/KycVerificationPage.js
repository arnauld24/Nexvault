import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, UserCheck, UserX, FileText, Camera, CheckCircle2,
  Clock, AlertTriangle, ChevronDown, ChevronUp, Filter,
  Users, XCircle, Fingerprint, Globe, Calendar,
  CreditCard, Hash, Mail, User, ArrowRight, Zap, Image
} from 'lucide-react';

const normalizeKycStatus = (status) => {
  const normalized = (status || '').toString().trim().toLowerCase();
  if (['verified', 'approved', 'passed', 'complete'].includes(normalized)) return 'verified';
  if (['rejected', 'declined', 'denied', 'failed', 'unverified'].includes(normalized)) return 'rejected';
  if (['pending', 'in_review', 'review', 'submitted'].includes(normalized)) return 'pending';
  return normalized || 'pending';
};

// ─── Biometric score helper ──────────────────────────────────────────────────
const getBiometricScore = (userId) => {
  const seed = userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return (85 + (seed % 14) + (seed % 3) * 0.3).toFixed(1);
};

// ─── Risk level helper ───────────────────────────────────────────────────────
const getRiskLevel = (user) => {
  const score = parseFloat(getBiometricScore(user.id));
  if (score >= 96) return { label: 'Low Risk', color: '#059669', bg: '#d1fae5', border: 'rgba(5,150,105,0.2)' };
  if (score >= 91) return { label: 'Medium Risk', color: '#d97706', bg: '#fef3c7', border: 'rgba(217,119,6,0.2)' };
  return { label: 'High Risk', color: '#dc2626', bg: '#fee2e2', border: 'rgba(220,38,38,0.2)' };
};

// ─── Realistic document photo viewer ────────────────────────────────────────
function DocumentPhotoViewer({ label, documentType, documentId, documentUrl }) {
  const [imgSrc, setImgSrc] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = null;
    async function loadImage() {
      if (!documentUrl) {
        setImgSrc(null);
        return;
      }
      try {
        const resp = await fetch(`http://localhost:3001${documentUrl}`);
        if (!resp.ok) throw new Error('Image fetch failed');
        const blob = await resp.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setImgSrc(objectUrl);
      } catch (err) {
        if (!cancelled) setImgSrc(null);
      }
    }
    loadImage();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [documentUrl]);

  return (
    <div style={dv.outer}>
      {/* Dark photographic background */}
      <div style={dv.photoStage}>
        {/* Corner bracket markers */}
        <div style={{ ...dv.bracket, top: 10, left: 10, borderTop: '2px solid rgba(255,255,255,0.55)', borderLeft: '2px solid rgba(255,255,255,0.55)' }} />
        <div style={{ ...dv.bracket, top: 10, right: 10, borderTop: '2px solid rgba(255,255,255,0.55)', borderRight: '2px solid rgba(255,255,255,0.55)' }} />
        <div style={{ ...dv.bracket, bottom: 10, left: 10, borderBottom: '2px solid rgba(255,255,255,0.55)', borderLeft: '2px solid rgba(255,255,255,0.55)' }} />
        <div style={{ ...dv.bracket, bottom: 10, right: 10, borderBottom: '2px solid rgba(255,255,255,0.55)', borderRight: '2px solid rgba(255,255,255,0.55)' }} />

        {/* Document area with actual image or placeholder */}
        <div style={dv.docSurface}>
          {/* Watermark label */}
          <div style={dv.watermarkLabel}>{label}</div>

          {/* Display actual image if available */}
          {imgSrc ? (
            <img 
              src={imgSrc} 
              alt={`${documentType} submission`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '4px',
                objectPosition: 'center',
              }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling && (e.target.nextSibling.style.display = 'flex');
              }}
            />
          ) : null}

          {/* Photo upload placeholder (shown if no image or image fails to load) */}
          <div style={{...dv.placeholderContent, display: imgSrc ? 'none' : 'flex'}}>
            <div style={dv.imageIconWrap}>
              <Image size={28} style={{ color: '#94a3b8' }} />
            </div>
            <p style={dv.placeholderTitle}>Document photo submitted by user</p>
            <p style={dv.placeholderSub}>{documentType} · {documentId}</p>
          </div>

          {/* Subtle document type strip at bottom */}
          <div style={dv.docStrip}>
            <span style={dv.docStripText}>{documentType.toUpperCase()}</span>
            <span style={dv.docStripId}>{documentId}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelfieImage({ selfieUrl }) {
  const [imgSrc, setImgSrc] = React.useState(null);
  React.useEffect(() => {
    let cancelled = false;
    let objectUrl = null;
    async function load() {
      if (!selfieUrl) {
        setImgSrc(null);
        return;
      }
      try {
        const resp = await fetch(`http://localhost:3001${selfieUrl}`);
        if (!resp.ok) throw new Error('fetch failed');
        const blob = await resp.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setImgSrc(objectUrl);
      } catch (e) {
        if (!cancelled) setImgSrc(null);
      }
    }
    load();
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [selfieUrl]);

  if (!imgSrc) return (
    <div style={sv.placeholderContent}>
      <Image size={22} style={{ color: '#94a3b8', marginBottom: 6 }} />
      <span style={sv.placeholderText}>Selfie submitted</span>
    </div>
  );

  return <img src={imgSrc} alt="selfie" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} />;
}

// ─── Selfie viewer ───────────────────────────────────────────────────────────
function SelfieViewer({ user, biometricScore, selfieUrl }) {
  const score = parseFloat(biometricScore);
  const matchColor = score >= 95 ? '#28A745' : score >= 90 ? '#d97706' : '#DC3545';
  const matchLabel = score >= 95 ? 'Strong Match' : score >= 90 ? 'Partial Match' : 'Weak Match';
  const livenessOk = score >= 88;

  return (
    <div style={sv.wrap}>
      {/* Left: camera-style selfie frame */}
      <div style={sv.photoStage}>
        {/* Corner brackets */}
        <div style={{ ...sv.bracket, top: 10, left: 10, borderTop: '2px solid rgba(255,255,255,0.55)', borderLeft: '2px solid rgba(255,255,255,0.55)' }} />
        <div style={{ ...sv.bracket, top: 10, right: 10, borderTop: '2px solid rgba(255,255,255,0.55)', borderRight: '2px solid rgba(255,255,255,0.55)' }} />
        <div style={{ ...sv.bracket, bottom: 10, left: 10, borderBottom: '2px solid rgba(255,255,255,0.55)', borderLeft: '2px solid rgba(255,255,255,0.55)' }} />
        <div style={{ ...sv.bracket, bottom: 10, right: 10, borderBottom: '2px solid rgba(255,255,255,0.55)', borderRight: '2px solid rgba(255,255,255,0.55)' }} />

        {/* Oval face outline */}
        <div style={sv.ovalFrame}>
          <SelfieImage selfieUrl={selfieUrl} />
        </div>

        {/* Liveness chip overlay */}
        <div style={{ ...sv.livenessChip, background: livenessOk ? 'rgba(40,167,69,0.9)' : 'rgba(220,53,69,0.9)' }}>
          {livenessOk ? <CheckCircle2 size={10} color="#fff" /> : <XCircle size={10} color="#fff" />}
          <span style={sv.livenessText}>{livenessOk ? 'Live' : 'Failed'}</span>
        </div>
      </div>

      {/* Right: biometric score panel */}
      <div style={sv.scorePanel}>
        <div style={sv.scoreHeader}>
          <Fingerprint size={16} style={{ color: matchColor }} />
          <span style={sv.scoreTitle}>Biometric Analysis</span>
        </div>

        <div style={sv.scoreRow}>
          <span style={sv.scoreLabel}>Match Score</span>
          <span style={{ ...sv.scoreValue, color: matchColor }}>{biometricScore}%</span>
        </div>
        <div style={sv.scoreBarTrack}>
          <div style={{ ...sv.scoreBarFill, width: `${biometricScore}%`, background: matchColor }} />
        </div>

        <div style={{ ...sv.matchBadge, background: `${matchColor}18`, border: `1px solid ${matchColor}40`, color: matchColor }}>
          <div style={{ ...sv.matchDot, background: matchColor }} />
          {matchLabel}
        </div>

        <div style={sv.metaRows}>
          {[
            { label: 'Capture Mode', value: 'Live Camera' },
            { label: 'Liveness Check', value: livenessOk ? 'Passed' : 'Failed', color: livenessOk ? '#28A745' : '#DC3545' },
            { label: 'Deepfake Scan', value: 'Clean' },
          ].map(row => (
            <div key={row.label} style={sv.metaRow}>
              <span style={sv.metaLabel}>{row.label}</span>
              <span style={{ ...sv.metaVal, color: row.color || 'var(--text-dark)' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Single KYC card ─────────────────────────────────────────────────────────
function KycCard({ user, onVerify, onDecline, index }) {
  const [expanded, setExpanded] = useState(index === 0);
  const [checklist, setChecklist] = useState({
    identity: false,
    document: false,
    biometric: false,
    address: false,
  });
  const [actionDone, setActionDone] = useState(null); // 'approved' | 'declined'

  const biometricScore = getBiometricScore(user.id);
  const risk = getRiskLevel(user);
  const kycStatus = normalizeKycStatus(user.kyc);
  const isVerified = kycStatus === 'verified';
  const isRejected = kycStatus === 'rejected';
  const allChecked = Object.values(checklist).every(Boolean);
  const initials = user.name.split(' ').map(n => n[0]).join('');
  const isDisabled = user.status === 'disabled';
  const hasFront = Boolean(user.documentUrls?.front);
  const hasBack = Boolean(user.documentUrls?.back || user.documentUrls?.address_proof);
  const docLabel = (user.documentType || 'DOCUMENT').toUpperCase();

  const handleVerify = () => {
    if (isDisabled) return;
    setActionDone('approved');
    setTimeout(() => onVerify(user.id), 600);
  };
  const handleDecline = () => {
    setActionDone('declined');
    setTimeout(() => onDecline(user.id), 600);
  };
  const toggleCheck = (key) =>
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));

  const checklistItems = [
    { key: 'identity', label: 'Identity details match submitted info', icon: User },
    { key: 'document', label: 'Document is valid and legible', icon: FileText },
    { key: 'biometric', label: 'Selfie matches document photo', icon: Fingerprint },
    { key: 'address', label: 'No duplicate account detected', icon: Globe },
  ];

  if (actionDone) {
    return (
      <div className="card animate-fade" style={{
        ...s.card,
        border: actionDone === 'approved' ? '1px solid #10b981' : '1px solid #ef4444',
        opacity: 0.6,
      }}>
        <div style={s.actionFlash}>
          {actionDone === 'approved'
            ? <><CheckCircle2 size={20} style={{ color: '#10b981' }} /> KYC Approved for {user.name}</>
            : <><XCircle size={20} style={{ color: '#ef4444' }} /> KYC Declined for {user.name}</>}
        </div>
      </div>
    );
  }

  return (
    <div className="card animate-fade" style={s.card}>
      {/* ── Card Header ── */}
      <div style={s.cardHeader}>
        <div style={s.userIdentity}>
          <div style={s.avatarRing}>
            <div className="avatar" style={s.avatar}>{initials}</div>
            <span style={s.avatarPulse} />
          </div>
          <div>
            <div style={s.userName}>{user.name}</div>
            <div style={s.userMeta}>
              <Mail size={11} style={{ opacity: 0.5 }} />
              <span>{user.email}</span>
              <span style={s.metaDot} />
              <Calendar size={11} style={{ opacity: 0.5 }} />
              <span>Submitted {user.joined}</span>
            </div>
          </div>
        </div>

        <div style={s.headerRight}>
          <span style={{ ...s.riskBadge, color: risk.color, background: risk.bg, border: `1px solid ${risk.border}` }}>
            {risk.label === 'Low Risk' ? <Zap size={11} /> : <AlertTriangle size={11} />}
            {risk.label}
          </span>
          <span
            className={`badge ${isVerified ? 'badge-success' : isRejected ? 'badge-danger' : 'badge-warning'}`}
            style={{
              ...s.pendingBadge,
              color: isVerified ? '#059669' : isRejected ? '#dc2626' : '#d97706',
              background: isVerified ? '#d1fae5' : isRejected ? '#fee2e2' : '#fef3c7',
            }}
          >
            {isVerified ? <ShieldCheck size={10} /> : isRejected ? <XCircle size={10} /> : <Clock size={10} />}
            {isVerified ? 'Verified' : isRejected ? 'Declined' : 'Pending Review'}
          </span>
          <code style={s.uuid}>{user.id}</code>
          <button style={s.expandBtn} onClick={() => setExpanded(e => !e)} aria-label="Toggle details">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* ── Progress bar (checklist completion) ── */}
      <div style={s.progressTrack}>
        <div style={{
          ...s.progressFill,
          width: `${(Object.values(checklist).filter(Boolean).length / 4) * 100}%`,
        }} />
      </div>

      {/* ── Expanded body ── */}
      {expanded && (
        <div style={s.body}>
          {/* Left column: identity claim + checklist */}
          <div style={s.leftColumn}>
            {/* Identity claim card */}
            <div style={s.sectionLabel}><User size={13} /> Identity Claim</div>
            <div style={s.claimCard}>
              {[
                { label: 'Full Name', value: user.name, icon: User },
                { label: 'Date of Birth', value: user.dob || 'Not provided', icon: Calendar },
                { label: 'Email Address', value: user.email, icon: Mail },
              ].map(row => (
                <div key={row.label} style={s.claimRow}>
                  <span style={s.claimLabel}><row.icon size={11} /> {row.label}</span>
                  <span style={s.claimValue}>{row.value}</span>
                </div>
              ))}

              <div style={s.claimDivider} />

              {[
                { label: 'Document Type', value: user.documentType, icon: CreditCard },
                { label: 'Document ID', value: user.documentId, icon: Hash, mono: true },
                { label: 'Registered', value: user.joined, icon: Calendar },
              ].map(row => (
                <div key={row.label} style={s.claimRow}>
                  <span style={s.claimLabel}><row.icon size={11} /> {row.label}</span>
                  <span style={row.mono ? s.claimMono : s.claimValue}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Audit checklist */}
            <div style={{ ...s.sectionLabel, marginTop: '20px' }}><CheckCircle2 size={13} /> Audit Checklist</div>
            <div style={s.checklist}>
              {checklistItems.map(item => (
                <label key={item.key} style={s.checkRow} onClick={() => toggleCheck(item.key)}>
                  <div style={{
                    ...s.checkbox,
                    background: checklist[item.key] ? 'var(--success)' : 'transparent',
                    borderColor: checklist[item.key] ? 'var(--success)' : 'var(--border)',
                  }}>
                    {checklist[item.key] && <CheckCircle2 size={12} color="#fff" />}
                  </div>
                  <item.icon size={13} style={{ color: checklist[item.key] ? 'var(--success)' : 'var(--text-light)', flexShrink: 0 }} />
                  <span style={{ ...s.checkLabel, color: checklist[item.key] ? 'var(--text-dark)' : 'var(--text-muted)', textDecoration: checklist[item.key] ? 'line-through' : 'none' }}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>

            {!allChecked && (
              <div style={s.checklistHint}>
                <AlertTriangle size={12} style={{ color: '#d97706', flexShrink: 0 }} />
                Complete all checklist items before approving
              </div>
            )}
          </div>

          {/* Right column: documents + selfie */}
          <div style={s.rightColumn}>
            {/* Document section */}
            <div style={s.sectionLabel}><FileText size={13} /> Identity Documents</div>

            {user.documentType === 'Passport' ? (
              <DocumentPhotoViewer
                label="PASSPORT"
                documentType={user.documentType}
                documentId={user.documentIds?.passport}
                documentUrl={user.documentUrls?.passport}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {!hasFront && !hasBack ? (
                  <DocumentPhotoViewer
                    label={docLabel}
                    documentType={user.documentType}
                    documentId={user.documentId}
                    documentUrl={user.documentUrls?.front || user.documentUrls?.back || user.documentUrls?.address_proof}
                  />
                ) : (
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {hasFront && (
                      <div style={{ flex: '1 1 220px', minWidth: '220px' }}>
                        <div style={{ ...s.sectionLabel, marginBottom: '8px' }}><FileText size={13} /> Front side</div>
                        <DocumentPhotoViewer
                          label={`${docLabel} — FRONT`}
                          documentType={user.documentType}
                          documentId={user.documentIds?.front}
                          documentUrl={user.documentUrls?.front}
                        />
                      </div>
                    )}
                    {hasBack && (
                      <div style={{ flex: '1 1 220px', minWidth: '220px' }}>
                        <div style={{ ...s.sectionLabel, marginBottom: '8px' }}><FileText size={13} /> Back side</div>
                        <DocumentPhotoViewer
                          label={`${docLabel} — BACK`}
                          documentType={user.documentType}
                          documentId={user.documentIds?.back || user.documentIds?.address_proof}
                          documentUrl={user.documentUrls?.back || user.documentUrls?.address_proof}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Selfie section */}
            <div style={{ ...s.sectionLabel, marginTop: '20px' }}><Camera size={13} /> Selfie Verification</div>
            <SelfieViewer user={user} biometricScore={biometricScore} selfieUrl={user.documentUrls && user.documentUrls.selfie} />
          </div>
        </div>
      )}

      {/* ── Footer actions ── */}
      <div style={s.footer}>
        <div style={s.footerLeft}>
          <span style={s.footerMeta}>
            <Clock size={12} style={{ opacity: 0.5 }} /> Submitted {user.joined}
          </span>
          <span style={s.footerMeta}>
            <CreditCard size={12} style={{ opacity: 0.5 }} /> {user.documentType} · {user.documentId}
          </span>
        </div>
        <div style={s.footerActions}>
          {isDisabled && (
            <span style={s.disabledWarning}>
              <XCircle size={13} /> Account is disabled — cannot approve KYC
            </span>
          )}
          <button
            onClick={handleDecline}
            style={s.declineBtn}
            className="btn btn-outline"
          >
            <UserX size={14} /> Decline
          </button>
          <button
            onClick={handleVerify}
            disabled={!allChecked || isDisabled}
            style={{ ...s.approveBtn, opacity: (allChecked && !isDisabled) ? 1 : 0.45, cursor: (allChecked && !isDisabled) ? 'pointer' : 'not-allowed' }}
            className="btn btn-success"
          >
            <UserCheck size={14} /> Approve KYC
            {allChecked && !isDisabled && <ArrowRight size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Summary stats bar ───────────────────────────────────────────────────────
function KycStatsBar({ stats, users = [] }) {
  const normalizedUsers = users.map((user) => ({ ...user, kyc: normalizeKycStatus(user.kyc) }));
  const pending = stats?.pending ?? normalizedUsers.filter((u) => u.kyc === 'pending').length;
  const verified = stats?.verified ?? normalizedUsers.filter((u) => u.kyc === 'verified').length;
  const rejected = stats?.rejected ?? normalizedUsers.filter((u) => u.kyc === 'rejected').length;
  const total = stats?.total_documents ?? normalizedUsers.length;
  const declined = stats
    ? total - pending - verified - rejected
    : normalizedUsers.filter((u) => u.kyc === 'rejected').length;

  const statsData = [
    { label: 'Total Users', value: total, icon: Users, color: '#0056B3', bg: '#e8f0fb' },
    { label: 'Pending Review', value: pending, icon: Clock, color: '#d97706', bg: '#fef3c7' },
    { label: 'Verified', value: verified, icon: ShieldCheck, color: '#059669', bg: '#d1fae5' },
    { label: 'Declined', value: declined, icon: AlertTriangle, color: '#dc2626', bg: '#fee2e2' },
  ];

  return (
    <div style={bar.grid}>
      {statsData.map(stat => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="card" style={bar.card}>
            <div style={{ ...bar.iconWrap, background: stat.bg, color: stat.color }}>
              <Icon size={18} />
            </div>
            <div>
              <div style={bar.value}>{stat.value}</div>
              <div style={bar.label}>{stat.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function KycVerificationPage({ users, stats, onVerify, onDecline }) {
  const [filter, setFilter] = useState('pending');
  const normalizedUsers = users.map((user) => ({ ...user, kyc: normalizeKycStatus(user.kyc) }));
  const pendingUsers = normalizedUsers.filter((u) => u.kyc === 'pending');
  const displayUsers = filter === 'all'
    ? normalizedUsers
    : filter === 'pending'
    ? pendingUsers
    : filter === 'verified'
    ? normalizedUsers.filter((u) => u.kyc === 'verified')
    : normalizedUsers.filter((u) => u.kyc === 'rejected');

  const statusCounts = {
    pending: stats?.pending ?? pendingUsers.length,
    verified: stats?.verified ?? normalizedUsers.filter((u) => u.kyc === 'verified').length,
    unverified: stats?.rejected ?? normalizedUsers.filter((u) => u.kyc === 'rejected').length,
    all: stats?.total_documents ?? normalizedUsers.length,
  };

  const pendingCount = statusCounts.pending;
  const verifiedCount = statusCounts.verified;
  const rejectedCount = statusCounts.unverified;
  const totalCount = statusCounts.all;
  const unverifiedCount = stats
    ? totalCount - pendingCount - verifiedCount - rejectedCount
    : normalizedUsers.filter((u) => u.kyc === 'rejected').length;

  return (
    <div className="animate-fade" style={page.root}>
      {/* ── Page header ── */}
      <div style={page.header}>
        <div style={page.headerLeft}>
          <div style={page.iconWrap}>
            <ShieldCheck size={20} style={{ color: '#818cf8' }} />
          </div>
          <div>
            <h2 style={page.title}>KYC Verification</h2>
            <p style={page.subtitle}>
              Review and audit identity submissions before granting platform access.
              {pendingUsers.length > 0 && (
                <span style={page.pendingPill}>
                  <Clock size={11} /> {pendingUsers.length} pending
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={page.filterRow}>
          <Filter size={13} style={{ color: 'var(--text-light)' }} />
          {[
            { key: 'pending', label: 'Pending' },
            { key: 'verified', label: 'Verified' },
            { key: 'unverified', label: 'Declined' },
            { key: 'all', label: 'All' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{ ...page.filterBtn, ...(filter === f.key ? page.filterBtnActive : {}) }}
            >
              {f.label}
              <span style={{ ...page.filterCount, ...(filter === f.key ? page.filterCountActive : {}) }}>
                {statusCounts[f.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats bar ── */}
      <KycStatsBar stats={stats} />

      {/* ── Content ── */}
      {displayUsers.length > 0 ? (
        <div style={page.list}>
          {displayUsers.map((u, i) => (
            <KycCard
              key={u.id}
              user={u}
              onVerify={onVerify}
              onDecline={onDecline}
              index={i}
            />
          ))}
        </div>
      ) : (
        <div className="card" style={page.emptyState}>
          <div style={page.emptyIcon}>
            <CheckCircle2 size={44} style={{ color: '#10b981' }} />
          </div>
          <h3 style={page.emptyTitle}>Queue is clear</h3>
          <p style={page.emptyDesc}>
            {filter === 'pending'
              ? 'All identity applications have been reviewed. No pending submissions.'
              : `No users found with status: ${filter}.`}
          </p>
          {filter !== 'all' && (
            <button className="btn btn-outline" style={{ marginTop: '16px' }} onClick={() => setFilter('all')}>
              View All Users
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const page = {
  root: { width: '100%', fontFamily: "'Inter', sans-serif" },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '16px',
    marginBottom: '24px',
  },
  headerLeft: { display: 'flex', alignItems: 'flex-start', gap: '14px' },
  iconWrap: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: 'rgba(79,70,229,0.1)',
    border: '1px solid rgba(79,70,229,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: '2px',
  },
  title: { fontSize: '22px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '4px' },
  subtitle: { fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  pendingPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    background: '#fef3c7',
    color: '#d97706',
    border: '1px solid rgba(217,119,6,0.2)',
    padding: '2px 8px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 600,
  },
  filterRow: { display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' },
  filterBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 14px',
    borderRadius: '8px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border)',
    background: 'var(--bg-white)',
    color: 'var(--text-muted)',
    fontSize: '12.5px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  filterBtnActive: {
    background: 'var(--primary)',
    borderColor: 'var(--primary)',
    color: '#ffffff',
  },
  filterCount: {
    background: 'var(--border-light)',
    color: 'var(--text-muted)',
    padding: '1px 6px',
    borderRadius: '999px',
    fontSize: '10.5px',
    fontWeight: 700,
  },
  filterCountActive: { background: 'rgba(255,255,255,0.2)', color: '#fff' },
  list: { display: 'flex', flexDirection: 'column', gap: '20px' },
  emptyState: {
    padding: '56px 32px',
    textAlign: 'center',
    maxWidth: '480px',
    margin: '32px auto 0',
  },
  emptyIcon: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: '#d1fae5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px',
  },
  emptyTitle: { fontSize: '18px', fontWeight: 700, marginBottom: '8px' },
  emptyDesc: { fontSize: '13.5px', color: 'var(--text-muted)', lineHeight: 1.6 },
};

const bar = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    marginBottom: '24px',
  },
  card: {
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  iconWrap: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  value: { fontSize: '22px', fontWeight: 700, color: 'var(--text-dark)', lineHeight: 1.1 },
  label: { fontSize: '11.5px', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' },
};

const s = {
  card: {
    padding: 0,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'all 0.2s',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  userIdentity: { display: 'flex', alignItems: 'center', gap: '14px' },
  avatarRing: { position: 'relative', flexShrink: 0 },
  avatar: { width: '46px', height: '46px', fontSize: '14px' },
  avatarPulse: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: '11px',
    height: '11px',
    background: '#f59e0b',
    border: '2px solid white',
    borderRadius: '50%',
  },
  userName: { fontSize: '15px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '4px' },
  userMeta: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-muted)', flexWrap: 'wrap' },
  metaDot: { width: '3px', height: '3px', borderRadius: '50%', background: 'var(--border)', display: 'inline-block' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  riskBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '11px',
    fontWeight: 700,
  },
  pendingBadge: { fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' },
  uuid: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--text-light)',
    background: 'var(--border-light)',
    padding: '3px 8px',
    borderRadius: '6px',
  },
  expandBtn: {
    background: 'var(--border-light)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '5px 8px',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
  },
  progressTrack: {
    height: '3px',
    background: 'var(--border-light)',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--primary), #10b981)',
    transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
    borderRadius: '999px',
  },
  body: {
    display: 'flex',
    gap: '24px',
    padding: '24px',
    flexWrap: 'wrap',
    borderTop: '1px solid var(--border-light)',
  },
  leftColumn: { flex: '0 0 280px', minWidth: '240px', display: 'flex', flexDirection: 'column' },
  rightColumn: { flex: 1, minWidth: '320px', display: 'flex', flexDirection: 'column' },
  sectionLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '10px',
  },
  claimCard: {
    background: 'var(--bg-light)',
    border: '1px solid var(--border-light)',
    borderRadius: '12px',
    padding: '16px',
  },
  claimRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '6px 0',
    borderBottom: '1px solid var(--border-light)',
  },
  claimDivider: { height: '1px', background: 'var(--border)', margin: '6px 0' },
  claimLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '11.5px',
    color: 'var(--text-muted)',
    fontWeight: 500,
    minWidth: '90px',
  },
  claimValue: { fontSize: '12px', color: 'var(--text-dark)', fontWeight: 600, textAlign: 'right', maxWidth: '160px', wordBreak: 'break-all' },
  claimMono: { fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--primary)', fontWeight: 600 },
  checklist: {
    background: 'var(--bg-light)',
    border: '1px solid var(--border-light)',
    borderRadius: '12px',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  checkRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.15s',
    userSelect: 'none',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    borderRadius: '6px',
    border: '1.5px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.2s',
  },
  checkLabel: { fontSize: '12.5px', fontWeight: 500, lineHeight: 1.3, transition: 'all 0.2s' },
  checklistHint: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '10px',
    fontSize: '11.5px',
    color: '#d97706',
    padding: '8px 12px',
    background: '#fef3c7',
    borderRadius: '8px',
    border: '1px solid rgba(217,119,6,0.2)',
    fontWeight: 500,
  },
  docTabRow: { display: 'flex', gap: '4px', marginBottom: '10px' },
  docTab: {
    padding: '6px 14px',
    borderRadius: '8px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border)',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  docTabActive: {
    background: 'var(--primary)',
    borderColor: 'var(--primary)',
    color: '#fff',
  },
  footer: {
    borderTop: '1px solid var(--border-light)',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    background: 'var(--bg-light)',
  },
  footerLeft: { display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' },
  footerMeta: { display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-light)', fontWeight: 500 },
  footerActions: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' },
  disabledWarning: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#DC3545',
    background: '#f8d7da',
    border: '1px solid rgba(220,53,69,0.2)',
    padding: '6px 12px',
    borderRadius: '8px',
  },
  declineBtn: {
    padding: '9px 18px',
    fontSize: '13px',
    fontWeight: 600,
    gap: '6px',
    borderColor: '#ef4444',
    color: '#ef4444',
  },
  approveBtn: {
    padding: '9px 20px',
    fontSize: '13px',
    fontWeight: 600,
    gap: '6px',
    transition: 'all 0.2s',
  },
  actionFlash: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '18px 24px',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-muted)',
  },
};

// ─── Document viewer styles ──────────────────────────────────────────────────
const dv = {
  outer: {
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid var(--border)',
  },
  photoStage: {
    background: '#1e2535',
    padding: '20px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
  },
  bracket: {
    position: 'absolute',
    width: '18px',
    height: '18px',
  },
  docSurface: {
    background: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 6px 32px rgba(0,0,0,0.45)',
    width: '100%',
    maxWidth: '440px',
    minHeight: '150px',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  watermarkLabel: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-15deg)',
    fontSize: '36px',
    fontWeight: 900,
    color: 'rgba(0,86,179,0.06)',
    letterSpacing: '0.12em',
    fontFamily: "'Outfit', sans-serif",
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    userSelect: 'none',
    zIndex: 0,
  },
  placeholderContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '28px 20px 16px',
    position: 'relative',
    zIndex: 1,
    gap: '6px',
  },
  imageIconWrap: {
    width: '52px',
    height: '52px',
    borderRadius: '12px',
    background: '#f1f5f9',
    border: '1.5px dashed #cbd5e1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '4px',
  },
  placeholderTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#475569',
    margin: 0,
  },
  placeholderSub: {
    fontSize: '11px',
    color: '#94a3b8',
    fontFamily: "'Fira Code', monospace",
    margin: 0,
  },
  docStrip: {
    background: '#f8fafc',
    borderTop: '1px solid #e2e8f0',
    padding: '8px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  docStripText: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#64748b',
    letterSpacing: '0.08em',
  },
  docStripId: {
    fontSize: '10px',
    fontFamily: "'Fira Code', monospace",
    color: '#0056B3',
    fontWeight: 600,
  },
};

// ─── Selfie viewer styles ────────────────────────────────────────────────────
const sv = {
  wrap: {
    display: 'flex',
    gap: '20px',
    background: 'var(--bg-light)',
    border: '1px solid var(--border-light)',
    borderRadius: '12px',
    padding: '20px',
    flexWrap: 'wrap',
  },
  photoStage: {
    width: '150px',
    height: '180px',
    background: '#1e2535',
    borderRadius: '12px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  bracket: {
    position: 'absolute',
    width: '16px',
    height: '16px',
  },
  ovalFrame: {
    width: '108px',
    height: '136px',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    background: 'rgba(255,255,255,0.04)',
    position: 'relative',
    zIndex: 1,
  },
  placeholderContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
  },
  placeholderText: {
    fontSize: '9px',
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    fontWeight: 500,
  },
  livenessChip: {
    position: 'absolute',
    bottom: 8,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    borderRadius: '999px',
    zIndex: 2,
  },
  livenessText: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#fff',
  },
  scorePanel: { flex: 1, minWidth: '180px', display: 'flex', flexDirection: 'column', gap: '10px' },
  scoreHeader: { display: 'flex', alignItems: 'center', gap: '8px' },
  scoreTitle: { fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)' },
  scoreRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  scoreLabel: { fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 },
  scoreValue: { fontSize: '20px', fontWeight: 800, letterSpacing: '-0.03em' },
  scoreBarTrack: { height: '6px', background: 'var(--border)', borderRadius: '999px', overflow: 'hidden' },
  scoreBarFill: { height: '100%', borderRadius: '999px', transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)' },
  matchBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 12px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 700,
    alignSelf: 'flex-start',
  },
  matchDot: { width: '7px', height: '7px', borderRadius: '50%' },
  metaRows: { display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' },
  metaRow: { display: 'flex', justifyContent: 'space-between', fontSize: '11.5px' },
  metaLabel: { color: 'var(--text-muted)' },
  metaVal: { fontWeight: 600 },
};
