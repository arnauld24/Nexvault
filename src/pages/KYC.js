import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle, Upload, User, BookOpen, CreditCard,
  ArrowRight, ArrowLeft, Info, Camera, Star,
  RefreshCw, X, ImagePlus,
} from 'lucide-react';
import { useKYC } from '../context/KYCContext';
import './KYC.css';

/* ─── Reusable file upload zone ─── */
function UploadZone({ label, hint, file, onFile, onClear, accept = 'image/*,application/pdf' }) {
  const inputRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  const handleChange = (e) => {
    const f = e.target.files[0];
    if (f) onFile(f);
  };

  if (file) {
    const isImage = file.type.startsWith('image/');
    const preview = isImage ? URL.createObjectURL(file) : null;
    return (
      <div className="kyc-upload-zone uploaded">
        {preview
          ? <img src={preview} alt="preview" className="kyc-upload-preview" />
          : <div className="kyc-upload-file-name">{file.name}</div>
        }
        <div className="kyc-upload-success-row">
          <CheckCircle size={16} className="kyc-check" />
          <span>{label} uploaded</span>
          <button className="kyc-upload-clear" onClick={onClear} aria-label="Remove">
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="kyc-upload-zone"
      onClick={() => inputRef.current.click()}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && inputRef.current.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleChange}
      />
      <Upload size={28} className="kyc-upload-icon" />
      <span className="kyc-upload-label">{label}</span>
      <span className="kyc-upload-hint">{hint || 'Tap to upload or take a photo'}</span>
      <div className="kyc-upload-options">
        <span className="kyc-upload-option"><ImagePlus size={12} /> Gallery</span>
        <span className="kyc-upload-option"><Camera size={12} /> Camera</span>
      </div>
      <span className="kyc-upload-formats">JPG, PNG, PDF — Max 10MB</span>
    </div>
  );
}

/* ─── Selfie camera component ─── */
function SelfieCapture({ onCapture, captured, onRetake }) {
  const videoRef = useRef();
  const canvasRef = useRef();
  const streamRef = useRef();
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [countdown, setCountdown] = useState(null);

  const startCamera = async () => {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play();
            setCameraReady(true);
          }
        };
      }
    } catch (err) {
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera access denied. Please allow camera permission and try again.'
          : 'Could not access camera. Make sure no other app is using it.'
      );
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  };

  useEffect(() => {
    if (!captured) startCamera();
    return () => stopCamera();
  }, [captured]); // eslint-disable-line

  const takePhoto = () => {
    if (!cameraReady || !videoRef.current || !canvasRef.current) return;
    // 3-second countdown
    let count = 3;
    setCountdown(count);
    const interval = setInterval(() => {
      count--;
      if (count === 0) {
        clearInterval(interval);
        setCountdown(null);
        try {
          const canvas = canvasRef.current;
          const video = videoRef.current;
          if (canvas && video) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);
            canvas.toBlob(blob => {
              if (blob) {
                const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
                stopCamera();
                onCapture(file);
              }
            }, 'image/jpeg', 0.92);
          }
        } catch (err) {
          console.error('Error taking photo:', err);
          setCameraError('Failed to capture photo. Please try again.');
          setCountdown(null);
        }
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  const handleRetake = () => {
    onRetake();
    setTimeout(() => startCamera(), 100);
  };

  if (captured) {
    return (
      <div className="kyc-selfie-captured">
        <img src={URL.createObjectURL(captured)} alt="selfie" className="kyc-selfie-img" />
        <div className="kyc-selfie-captured-badge">
          <CheckCircle size={16} /> Selfie captured
        </div>
        <button className="btn btn-outline btn-sm" onClick={handleRetake}>
          <RefreshCw size={14} /> Retake
        </button>
      </div>
    );
  }

  return (
    <div className="kyc-camera-wrap">
      {cameraError ? (
        <div className="kyc-camera-error">
          <Camera size={32} />
          <p>{cameraError}</p>
          <button className="btn btn-primary btn-sm" onClick={startCamera}>
            <RefreshCw size={14} /> Try Again
          </button>
        </div>
      ) : (
        <>
          <div className="kyc-video-wrap">
            <video ref={videoRef} className="kyc-video" playsInline muted autoPlay />
            <div className="kyc-video-oval" />
            {countdown !== null && (
              <div className="kyc-countdown">{countdown}</div>
            )}
            {!cameraReady && (
              <div className="kyc-camera-loading">
                <span className="spinner" />
                <span>Starting camera...</span>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <div className="kyc-selfie-tips">
            <div className="kyc-tip"><CheckCircle size={13} /> Good lighting on your face</div>
            <div className="kyc-tip"><CheckCircle size={13} /> Remove glasses or hats</div>
            <div className="kyc-tip"><CheckCircle size={13} /> Look directly at the camera</div>
            <div className="kyc-tip kyc-tip-no"><Info size={13} /> No filters or edited photos</div>
          </div>
          <button
            className="btn btn-primary btn-lg"
            onClick={takePhoto}
            disabled={!cameraReady || countdown !== null}
          >
            <Camera size={16} />
            {countdown !== null ? `Taking photo in ${countdown}...` : 'Take Selfie'}
          </button>
        </>
      )}
    </div>
  );
}

/* ─── Main KYC component ─── */
export function KYCVerification() {
  const navigate = useNavigate();
  const { submitKYC } = useKYC();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [docType, setDocType] = useState('passport');
  const [files, setFiles] = useState({ front: null, back: null, selfie: null });
  const [form, setForm] = useState({ dob: '', country: '', address: '', city: '', zip: '' });
  const [errors, setErrors] = useState({});

  const setFile = (key, file) => setFiles(f => ({ ...f, [key]: file }));
  const clearFile = (key) => setFiles(f => ({ ...f, [key]: null }));

  const validateStep = () => {
    const e = {};
    if (step === 1) {
      if (!form.dob) e.dob = 'Date of birth is required.';
      if (!form.country) e.country = 'Country is required.';
      if (!form.address.trim()) e.address = 'Address is required.';
      if (!form.city.trim()) e.city = 'City is required.';
    }
    if (step === 2) {
      if (!files.front) e.front = 'Please upload the front of your document.';
      if (docType !== 'passport' && !files.back) e.back = 'Please upload the back of your document.';
    }
    if (step === 3) {
      if (!files.selfie) e.selfie = 'Please take a selfie to continue.';
    }
    return e;
  };

  const handleNext = async () => {
    const e = validateStep();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    if (step < 3) { setStep(s => s + 1); return; }
    
    setLoading(true);
    try {
      // Construct formData with the collected information
      const submitData = {
        personalInfo: form,
        documentType: docType,
        idDocument: files.front, // front side of ID
        passportDocument: docType === 'passport' ? files.front : null,
        backDocument: files.back, // back side of ID (for non-passport)
        selfie: files.selfie,
        addressProof: files.back, // Use back as address proof placeholder
      };
      
      await submitKYC(submitData);
      // Brief success delay
      setTimeout(() => {
        navigate('/kyc-status');
      }, 500);
    } catch (err) {
      setErrors({ submit: err.message || 'Failed to submit KYC. Please try again.' });
      setLoading(false);
    }
  };

  const steps = ['Personal Info', 'Document Upload', 'Selfie'];

  const docTypes = [
    { id: 'passport', label: 'Passport', icon: <BookOpen size={18} /> },
    { id: 'drivers_license', label: "Driver's License", icon: <CreditCard size={18} /> },
    { id: 'national_id', label: 'National ID', icon: <CreditCard size={18} /> },
  ];

  return (
    <div className="kyc-page">
      <div className="kyc-container">
        <div className="kyc-header">
          <div className="kyc-logo" onClick={() => navigate('/')}>
            <div className="landing-logo-mark" style={{ width: 32, height: 32, fontSize: 16 }}>N</div>
            <span>NexVault</span>
          </div>
        </div>

        <div className="kyc-card animate-fade">
          <div className="kyc-card-header">
            <h1>Identity Verification</h1>
            <p>Complete KYC to unlock all wallet features and increase transaction limits.</p>
          </div>

          {/* Steps */}
          <div className="steps" style={{ margin: '28px 0' }}>
            {steps.map((s, i) => (
              <React.Fragment key={i}>
                <div className={`step ${step > i + 1 ? 'completed' : step === i + 1 ? 'active' : ''}`}>
                  <div className="step-circle">{step > i + 1 ? <CheckCircle size={14} /> : i + 1}</div>
                  <span className="step-label hide-mobile">{s}</span>
                </div>
                {i < steps.length - 1 && <div className={`step-line ${step > i + 1 ? 'active' : ''}`} />}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1 — Personal Info */}
          {step === 1 && (
            <div className="kyc-step animate-fade">
              <h3 className="kyc-step-title">Personal Information</h3>
              <p className="kyc-step-desc">Please provide your details exactly as they appear on your official ID.</p>
              <div className="kyc-form">
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input type="date" className={`form-control ${errors.dob ? 'input-error' : ''}`} value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} />
                  {errors.dob && <span className="field-error">{errors.dob}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Country of Residence</label>
                  <select className={`form-control ${errors.country ? 'input-error' : ''}`} value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}>
                    <option value="">Select country</option>
                    <option value="US">United States</option>
                    <option value="UK">United Kingdom</option>
                    <option value="CA">Canada</option>
                    <option value="AU">Australia</option>
                    <option value="NG">Nigeria</option>
                    <option value="GH">Ghana</option>
                    <option value="CM">Cameroon</option>
                    <option value="OTHER">Other</option>
                  </select>
                  {errors.country && <span className="field-error">{errors.country}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Street Address</label>
                  <input className={`form-control ${errors.address ? 'input-error' : ''}`} placeholder="248 Market Street" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                  {errors.address && <span className="field-error">{errors.address}</span>}
                </div>
                <div className="kyc-city-zip-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input className={`form-control ${errors.city ? 'input-error' : ''}`} placeholder="San Francisco" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
                    {errors.city && <span className="field-error">{errors.city}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">ZIP / Postal Code</label>
                    <input className="form-control" placeholder="94105" value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Document Upload */}
          {step === 2 && (
            <div className="kyc-step animate-fade">
              <h3 className="kyc-step-title">Document Upload</h3>
              <p className="kyc-step-desc">Upload a government-issued ID. You can take a photo directly with your camera or upload from your gallery.</p>

              <div className="kyc-doc-types">
                {docTypes.map(d => (
                  <button key={d.id} className={`kyc-doc-type ${docType === d.id ? 'selected' : ''}`} onClick={() => { setDocType(d.id); clearFile('back'); }}>
                    {d.icon}
                    <span>{d.label}</span>
                  </button>
                ))}
              </div>

              <div className="kyc-upload-grid">
                <UploadZone
                  label="Front"
                  hint="Tap to upload or take a photo"
                  file={files.front}
                  onFile={f => setFile('front', f)}
                  onClear={() => clearFile('front')}
                />
                {docType !== 'passport' && (
                  <UploadZone
                    label="Back"
                    hint="Tap to upload or take a photo"
                    file={files.back}
                    onFile={f => setFile('back', f)}
                    onClear={() => clearFile('back')}
                  />
                )}
              </div>

              {errors.front && <span className="field-error" style={{ marginTop: 8, display: 'block' }}>{errors.front}</span>}
              {errors.back && <span className="field-error" style={{ marginTop: 4, display: 'block' }}>{errors.back}</span>}

              <div className="alert alert-info" style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Info size={14} /> Make sure all four corners are visible and text is clearly legible.
              </div>
            </div>
          )}

          {/* Step 3 — Selfie */}
          {step === 3 && (
            <div className="kyc-step animate-fade">
              <h3 className="kyc-step-title">Selfie Verification</h3>
              <p className="kyc-step-desc">Take a live selfie using your camera. This confirms your identity matches your uploaded document.</p>
              <SelfieCapture
                captured={files.selfie}
                onCapture={f => setFile('selfie', f)}
                onRetake={() => clearFile('selfie')}
              />
              {errors.selfie && <span className="field-error" style={{ marginTop: 8, display: 'block', textAlign: 'center' }}>{errors.selfie}</span>}
            </div>
          )}

          {/* Actions */}
          <div className="kyc-actions">
            {step > 1 && (
              <button className="btn btn-outline" onClick={() => { setStep(s => s - 1); setErrors({}); }}>
                <ArrowLeft size={14} /> Back
              </button>
            )}
            <button className="btn btn-primary btn-lg" style={{ marginLeft: 'auto' }} onClick={handleNext} disabled={loading}>
              {loading ? <><span className="spinner" />Submitting...</> : step === 3 ? <>Submit for Review <ArrowRight size={16} /></> : <>Next Step <ArrowRight size={16} /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function KYCStatus() {
  const navigate = useNavigate();
  const { kycStatus, loading, error, refreshKycStatus } = useKYC();

  React.useEffect(() => {
    // Refresh status when component mounts
    refreshKycStatus();
  }, []);

  if (loading) {
    return (
      <div className="kyc-page">
        <div className="kyc-container">
          <div className="kyc-card" style={{ textAlign: 'center', padding: '40px' }}>
            <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
            <p style={{ marginTop: 16, color: 'var(--text-secondary)' }}>Loading your KYC status...</p>
          </div>
        </div>
      </div>
    );
  }

  const isVerified = kycStatus === 'verified';
  const isPending = kycStatus === 'pending';
  const isRejected = kycStatus === 'rejected';
  const isUnverified = kycStatus === 'unverified' || !kycStatus;

  return (
    <div className="kyc-page">
      <div className="kyc-container">
        <div className="kyc-header">
          <div className="kyc-logo" onClick={() => navigate('/')}>
            <div className="landing-logo-mark" style={{ width: 32, height: 32, fontSize: 16 }}>N</div>
            <span>NexVault</span>
          </div>
        </div>

        <div className="kyc-status-card animate-fade">
          {/* VERIFIED */}
          {isVerified && (
            <>
              <div className="kyc-status-icon verified"><CheckCircle size={36} /></div>
              <h2>Identity Verified!</h2>
              <p>Your KYC verification is complete. All NexVault features are now unlocked for your account.</p>

              <div className="kyc-status-items">
                {['Personal Information', 'Document Verification', 'Selfie Match', 'Sanctions Screening'].map((item, i) => (
                  <div key={i} className="kyc-status-item success">
                    <CheckCircle size={15} /> {item}
                  </div>
                ))}
              </div>

              <div className="kyc-limits">
                <h4>Your Account Limits</h4>
                <div className="kyc-limits-grid">
                  <div className="kyc-limit-item">
                    <div className="kyc-limit-label">Daily Send Limit</div>
                    <div className="kyc-limit-value">$50,000</div>
                  </div>
                  <div className="kyc-limit-item">
                    <div className="kyc-limit-label">Monthly Volume</div>
                    <div className="kyc-limit-value">$200,000</div>
                  </div>
                  <div className="kyc-limit-item">
                    <div className="kyc-limit-label">Verified Since</div>
                    <div className="kyc-limit-value">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                  </div>
                </div>
              </div>

              <button className="btn btn-primary btn-lg btn-full" onClick={() => navigate('/dashboard')}>
                Go to Dashboard <ArrowRight size={16} />
              </button>
            </>
          )}

          {/* PENDING */}
          {isPending && (
            <>
              <div className="kyc-status-icon pending" style={{ color: 'var(--warning)' }}><RefreshCw size={36} /></div>
              <h2>Verification in Progress</h2>
              <p>Your KYC documents have been submitted and are being reviewed by our team.</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 12 }}>This typically takes 24-48 hours. You'll receive an email notification when your verification is complete.</p>

              <div className="kyc-status-items">
                {['Personal Information', 'Document Verification', 'Selfie Match'].map((item, i) => (
                  <div key={i} className="kyc-status-item pending">
                    <RefreshCw size={15} /> {item}
                  </div>
                ))}
              </div>

              <button className="btn btn-outline btn-lg btn-full" onClick={() => navigate('/dashboard')}>
                Return to Dashboard
              </button>
            </>
          )}

          {/* REJECTED */}
          {isRejected && (
            <>
              <div className="kyc-status-icon rejected" style={{ color: 'var(--danger)' }}><X size={36} /></div>
              <h2>Verification Unsuccessful</h2>
              <p>Unfortunately, your KYC verification was not approved. This may be due to:</p>

              <div className="kyc-status-items" style={{ marginTop: 16 }}>
                <div className="kyc-status-item" style={{ color: 'var(--danger)' }}>
                  <Info size={15} /> Low document quality or clarity
                </div>
                <div className="kyc-status-item" style={{ color: 'var(--danger)' }}>
                  <Info size={15} /> Selfie doesn't match the document
                </div>
                <div className="kyc-status-item" style={{ color: 'var(--danger)' }}>
                  <Info size={15} /> Missing or expired documents
                </div>
              </div>

              <p style={{ marginTop: 16, color: 'var(--text-secondary)' }}>Please resubmit your documents with clear photos and a proper selfie.</p>

              <button className="btn btn-primary btn-lg btn-full" onClick={() => navigate('/kyc')}>
                Resubmit Documents
              </button>
              <button className="btn btn-outline btn-lg btn-full" style={{ marginTop: 12 }} onClick={() => navigate('/dashboard')}>
                Return to Dashboard
              </button>
            </>
          )}

          {/* UNVERIFIED */}
          {isUnverified && (
            <>
              <div className="kyc-status-icon" style={{ color: 'var(--primary)' }}><User size={36} /></div>
              <h2>Complete Your KYC</h2>
              <p>Start the identity verification process to unlock all NexVault features.</p>

              <div className="kyc-status-items">
                {[
                  { title: 'Personal Information', desc: 'Provide your name, address, and date of birth' },
                  { title: 'Document Upload', desc: 'Upload a valid passport, driver license, or national ID' },
                  { title: 'Selfie Verification', desc: 'Take a selfie to confirm your identity' }
                ].map((item, i) => (
                  <div key={i} className="kyc-status-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600 }}>
                        {i + 1}
                      </span>
                      <span style={{ fontWeight: 600 }}>{item.title}</span>
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 32 }}>{item.desc}</span>
                  </div>
                ))}
              </div>

              <button className="btn btn-primary btn-lg btn-full" onClick={() => navigate('/kyc')}>
                Start Verification <ArrowRight size={16} />
              </button>
            </>
          )}

          {error && (
            <div className="alert alert-danger" style={{ marginTop: 16 }}>
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Smart KYC Router - Routes to verification form or status page based on user status ─── */
const KYCRouter = React.memo(() => {
  const { kycStatus, loading } = useKYC();
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!loading && !hasLoaded) {
      setHasLoaded(true);
    }
  }, [loading, hasLoaded]);

  if (loading && !hasLoaded) {
    return (
      <div className="kyc-page">
        <div className="kyc-container">
          <div className="kyc-card" style={{ textAlign: 'center', padding: '40px' }}>
            <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
            <p style={{ marginTop: 16, color: 'var(--text-secondary)' }}>Loading KYC status...</p>
          </div>
        </div>
      </div>
    );
  }

  // If verified or has a status (pending/rejected), show status page
  // If unverified, show verification form
  if (kycStatus === 'verified' || kycStatus === 'pending' || kycStatus === 'rejected') {
    return <KYCStatus />;
  }

  return <KYCVerification />;
});

export { KYCRouter };
