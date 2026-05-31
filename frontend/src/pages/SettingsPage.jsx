import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { useAuth } from '../hooks/useAuth';
import { useLanguage } from '../context/LanguageContext';
import Header from '../components/Layout/Header';
import { toast } from 'react-toastify';
import { HiPlus } from 'react-icons/hi';

// Helper to safely convert raw ASCII SVG to a standard Base64 Data URL
const svgToBase64 = (svgMarkup) => {
  return `data:image/svg+xml;base64,${btoa(svgMarkup.trim())}`;
};

const storeSvg = `
<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" rx="50" fill="#E0F2FE"/>
  <rect x="25" y="55" width="50" height="25" rx="2" fill="#0EA5E9"/>
  <path d="M20 45h60l-5 12H25l-5-12z" fill="#0284C7"/>
  <path d="M20 45l5-8h50l5 8H20z" fill="#0369A1"/>
  <rect x="42" y="62" width="16" height="18" rx="1" fill="#F8FAFC"/>
  <circle cx="46" cy="71" r="1.5" fill="#64748B"/>
  <rect x="29" y="62" width="10" height="10" rx="1" fill="#38BDF8"/>
  <rect x="61" y="62" width="10" height="10" rx="1" fill="#38BDF8"/>
</svg>
`;

const maleSvg = `
<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" rx="50" fill="#E6F4F1"/>
  <path d="M22 82c0-8 8-15 17-17h22c9 0 17 7 17 15v6H22v-6z" fill="#0D9488"/>
  <rect x="45" y="52" width="10" height="12" fill="#F3B395"/>
  <circle cx="50" cy="42" r="16" fill="#F8C4AD"/>
  <path d="M34 38c2-10 10-14 16-14s14 4 16 14c-1-5-6-8-16-8s-15 3-16 8z" fill="#2E2219"/>
  <path d="M33 38c0-3 3-8 8-10h18c5 2 8 7 8 10v4h-4c-2-3-6-4-10-4s-8 1-10 4h-2v-4z" fill="#2E2219"/>
  <circle cx="45" cy="42" r="1.8" fill="#2E2219"/>
  <circle cx="55" cy="42" r="1.8" fill="#2E2219"/>
  <path d="M47 48.5c1.5 1.5 4.5 1.5 6 0" stroke="#2E2219" stroke-width="1.8" stroke-linecap="round"/>
</svg>
`;

const femaleSvg = `
<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" rx="50" fill="#FDF2F8"/>
  <path d="M22 82c0-8 8-15 17-17h22c9 0 17 7 17 15v6H22v-6z" fill="#EC4899"/>
  <rect x="45" y="52" width="10" height="12" fill="#F3B395"/>
  <circle cx="50" cy="42" r="16" fill="#F8C4AD"/>
  <path d="M34 44c-1-8 4-16 16-16s17 8 16 16c0 10-2 15-4 17-2-6-5-9-12-9s-10 3-12 9c-2-2-4-7-4-17z" fill="#4B3621"/>
  <path d="M34 35c3-6 10-7 16-7s13 1 16 7" stroke="#4B3621" stroke-width="3" stroke-linecap="round"/>
  <circle cx="45" cy="42" r="1.8" fill="#2E2219"/>
  <circle cx="55" cy="42" r="1.8" fill="#2E2219"/>
  <path d="M47 48.5c1.5 1.5 4.5 1.5 6 0" stroke="#2E2219" stroke-width="1.8" stroke-linecap="round"/>
</svg>
`;

const ledgerSvg = `
<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" rx="50" fill="#FFFBEB"/>
  <rect x="30" y="28" width="40" height="48" rx="4" fill="#F59E0B"/>
  <rect x="34" y="28" width="36" height="48" rx="2" fill="#D97706"/>
  <rect x="26" y="34" width="8" height="3" rx="1.5" fill="#9CA3AF"/>
  <rect x="26" y="44" width="8" height="3" rx="1.5" fill="#9CA3AF"/>
  <rect x="26" y="54" width="8" height="3" rx="1.5" fill="#9CA3AF"/>
  <rect x="26" y="64" width="8" height="3" rx="1.5" fill="#9CA3AF"/>
  <path d="M44 42h12M44 47h9M49 42c3.5 0 5 2 5 4s-1.5 4-5 4h-4l6 7" stroke="#FFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`;

const presets = [
  { label: 'Store', value: svgToBase64(storeSvg) },
  { label: 'Male Merchant', value: svgToBase64(maleSvg) },
  { label: 'Female Merchant', value: svgToBase64(femaleSvg) },
  { label: 'Ledger Book', value: svgToBase64(ledgerSvg) }
];

const SettingsPage = () => {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [form, setForm] = useState({
    name: user?.name || '',
    storeName: user?.storeName || '',
    phone: user?.phone || '',
    upiId: user?.upiId || '',
    avatar: user?.avatar || '',
  });
  const [saving, setSaving] = useState(false);
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const startSimulation = async () => {
    setSimulating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const { data } = await API.post('/auth/setup-security', {
        isBiometricEnabled: true,
        biometricCredentialId: 'simulated_credential_id_' + Date.now()
      });
      updateUser(data.data);
      toast.success('Simulated biometric login enabled');
      setShowSimulateModal(false);
    } catch (err) {
      toast.error('Simulated biometric registration failed');
    } finally {
      setSimulating(false);
    }
  };

  // Security Toggling States
  const [deviceSupportsBio, setDeviceSupportsBio] = useState(false);

  useEffect(() => {
    const checkBiometricSupport = async () => {
      if (window.PublicKeyCredential) {
        try {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setDeviceSupportsBio(available);
        } catch (e) {
          setDeviceSupportsBio(false);
        }
      }
    };
    checkBiometricSupport();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, avatar: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await API.put('/auth/me', form);
      updateUser(data.data);
      toast.success(t('profileUpdated'));
    } catch (err) {
      toast.error('Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBiometrics = async () => {
    if (user?.isBiometricEnabled) {
      try {
        const { data } = await API.post('/auth/setup-security', { isBiometricEnabled: false });
        updateUser(data.data);
        toast.success('Biometric login disabled');
      } catch (err) {
        toast.error('Failed to update biometric setting');
      }
    } else {
      if (!deviceSupportsBio) {
        setShowSimulateModal(true);
        return;
      }
      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const createOptions = {
          publicKey: {
            challenge,
            rp: { name: "Udhaar Khata" },
            user: {
              id: new TextEncoder().encode(user._id),
              name: user.email,
              displayName: user.name
            },
            pubKeyCredParams: [{ type: "public-key", alg: -7 }],
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "required"
            },
            timeout: 60000
          }
        };
        const credential = await navigator.credentials.create(createOptions);
        if (credential) {
          const { data } = await API.post('/auth/setup-security', {
            isBiometricEnabled: true,
            biometricCredentialId: credential.id
          });
          updateUser(data.data);
          toast.success('Biometric login enabled');
        }
      } catch (err) {
        console.warn("WebAuthn error:", err);
        toast.error('Biometric registration failed or cancelled');
      }
    }
  };

  return (
    <>
      <Header title={t('settings')} subtitle={t('manageProfile')} />
      <div className="space-y-6 max-w-xl mx-auto md:mx-0">
        
        {/* Profile Card */}
        <div className="bg-pure-white border border-soft-gray rounded-2xl p-7 shadow-sm">
          <h3 className="text-lg font-bold text-deep-navy mb-5 mt-0">{t('storeProfile')}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Profile Picture Section */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider mb-2">{t('profilePicture')}</label>
              <div className="flex items-center gap-6 p-4 bg-soft-white border border-soft-gray rounded-xl w-full flex-wrap sm:flex-nowrap">
                {/* Avatar Preview */}
                <div className="relative w-20 h-20 flex-shrink-0">
                  <div 
                    className="w-20 h-20 rounded-full bg-pure-white border-2 border-orange flex items-center justify-center overflow-hidden cursor-pointer shadow-sm hover:scale-105 transition-transform"
                    onClick={() => fileInputRef.current.click()}
                  >
                    {form.avatar ? (
                      <img src={form.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-slate-gray font-bold">Upload</span>
                    )}
                  </div>
                  {/* Plus badge */}
                  <div className="absolute bottom-0 right-0 bg-orange w-6 h-6 rounded-full flex items-center justify-center text-pure-white border-2 border-pure-white cursor-pointer shadow pointer-events-none">
                    <HiPlus size={14} />
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                </div>

                {/* Presets Selection */}
                <div className="space-y-1.5 flex-1">
                  <span className="text-xs font-bold text-slate-gray mb-1.5 block">
                    {t('selectPresetOrUpload')}
                  </span>
                  <div className="flex gap-3 flex-wrap">
                    {presets.map((p, idx) => {
                      const isSelected = form.avatar === p.value;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setForm({ ...form, avatar: p.value })}
                          className={`w-11 h-11 rounded-full bg-pure-white border cursor-pointer flex items-center justify-center overflow-hidden p-0 transition-all ${
                            isSelected 
                              ? 'border-orange ring-2 ring-orange/20 scale-105' 
                              : 'border-soft-gray hover:border-slate-gray/30'
                          }`}
                        >
                          <img src={p.value} alt={p.label} className="w-full h-full object-cover" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('yourName')}</label>
              <input className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('storeName')}</label>
              <input className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" value={form.storeName} onChange={(e) => setForm({ ...form, storeName: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('phoneNumber')}</label>
              <input className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-gray uppercase tracking-wider">{t('upiId')}</label>
              <input className="w-full px-4 py-2.5 bg-pure-white border border-soft-gray rounded-xl text-sm focus:outline-none focus:border-orange transition-all" value={form.upiId} onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                placeholder={t('upiPlaceholder')} />
              <p className="text-xs text-slate-gray/80 mt-1">
                This UPI ID will be included in payment reminder messages as a collection link.
              </p>
            </div>
            <button className="inline-flex items-center justify-center px-5 py-2.5 bg-orange hover:bg-orange-hover text-pure-white rounded-xl text-sm font-bold border-none cursor-pointer transition-colors shadow-sm hover:shadow disabled:opacity-50 mt-2" type="submit" disabled={saving}>
              {saving ? t('saving') : t('saveChanges')}
            </button>
          </form>
        </div>

        {/* App Security Card */}
        <div className="bg-pure-white border border-soft-gray rounded-2xl p-7 shadow-sm">
          <h3 className="text-lg font-bold text-deep-navy mb-5 mt-0">App Security</h3>
          <div className="space-y-4">
            
            <div className="flex justify-between items-center py-2.5 border-b border-soft-gray/40">
              <div className="text-left">
                <h4 className="text-sm font-bold text-deep-navy m-0">Security PIN</h4>
                <p className="text-xs text-slate-gray m-0 mt-0.5">Protect your credit register with a secure 4-digit PIN</p>
              </div>
              <button 
                onClick={() => navigate('/security-setup')}
                className="px-4 py-2 bg-light-cream border border-soft-gray hover:border-orange rounded-xl text-xs font-bold text-deep-navy hover:text-orange transition-colors cursor-pointer"
              >
                Change PIN
              </button>
            </div>

            <div className="flex justify-between items-center py-2.5">
              <div className="text-left">
                <h4 className="text-sm font-bold text-deep-navy m-0">Biometric Unlock</h4>
                <p className="text-xs text-slate-gray m-0 mt-0.5">Use device fingerprint scanner or face camera to unlock</p>
              </div>
              <div className="flex items-center">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={user?.isBiometricEnabled || false} 
                    onChange={handleToggleBiometrics}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-soft-gray rounded-full peer peer-focus:ring-2 peer-focus:ring-orange/20 peer-checked:after:translate-x-full peer-checked:after:border-pure-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-pure-white after:border-soft-gray after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange"></div>
                </label>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Simulated Biometric Authenticator Modal */}
      {showSimulateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-deep-navy/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-pure-white border border-soft-gray p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-5 max-w-sm w-full mx-4 text-center animate-in zoom-in-95 duration-200">
            <div className="relative w-20 h-20 rounded-full bg-orange/10 flex items-center justify-center text-orange">
              {simulating && (
                <span className="absolute inset-0 rounded-full border-2 border-orange animate-ping opacity-75" />
              )}
              <svg className="w-10 h-10 text-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.105-1.343-2-3-2s-3 .895-3 2M12 11c0 1.105 1.343 2 3 2s3-.895 3-2M12 11V7a3 3 0 10-6 0v4M12 11v4a3 3 0 106 0v-4m-6 8a7 7 0 100-14 7 7 0 000 14z" />
              </svg>
            </div>
            
            <div>
              <h2 className="text-lg font-bold text-deep-navy font-outfit">Biometric Verification</h2>
              <p className="text-xs text-slate-gray mt-2 leading-relaxed">
                {simulating 
                  ? 'Configuring device authenticators...' 
                  : 'Please approve the simulated device biometric request to enable biometric login.'}
              </p>
            </div>

            <div className="w-full space-y-2.5">
              {!simulating ? (
                <>
                  <button
                    onClick={startSimulation}
                    className="w-full py-3 px-4 bg-orange hover:bg-orange-hover text-pure-white font-bold text-sm rounded-xl border-none cursor-pointer shadow-md transition-all"
                  >
                    Simulate Fingerprint Scan
                  </button>
                  <button
                    onClick={() => setShowSimulateModal(false)}
                    className="w-full py-2.5 px-4 bg-transparent border border-soft-gray text-slate-gray font-semibold text-sm rounded-xl cursor-pointer hover:bg-soft-white"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <div className="flex justify-center items-center py-4">
                  <div className="w-8 h-8 border-4 border-orange border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SettingsPage;
