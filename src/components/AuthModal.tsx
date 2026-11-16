import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  Phone,
  User,
  ArrowLeft,
  ShieldAlert,
  Smartphone,
  Clock,
  Globe,
  Copy,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Sparkles,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BRAND } from '../constants/brand';

import { api } from '../services/api';
import {
  auth,
  googleProvider,
  registerWithEmailPassword,
  loginWithEmailPassword,
  syncStudentProfileRealtime,
} from '../firebase/firebase';
import { signInWithPopup } from 'firebase/auth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultIsRegister?: boolean;
  onSuccess?: () => void;
  isPage?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultIsRegister = false,
  onSuccess,
  isPage = false,
}) => {
  const { loginStudent, deviceInfo } = useAuth();
  const [isRegister, setIsRegister] = useState(defaultIsRegister);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [error, setError] = useState('');
  const [blockedActiveDevice, setBlockedActiveDevice] = useState<any>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError('');
    setBlockedActiveDevice(null);
    setUnauthorizedDomain(null);
    setIsLoading(true);
    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        const cleanMobile = res.user.phoneNumber?.replace(/\D/g, '') || '';
        const userEmail = res.user.email || `${res.user.uid}@student.bcastudypoint.com`;
        const userName = res.user.displayName || userEmail.split('@')[0] || 'BCA Student';

        // 1. Verify and bind on server with 1-device policy
        const loginRes = await api.googleLogin({
          email: userEmail,
          fullName: userName,
          googleUid: res.user.uid,
          photoUrl: res.user.photoURL || undefined,
          deviceInfo,
        });

        // 2. Realtime sync student profile in Firebase
        await syncStudentProfileRealtime({
          id: res.user.uid,
          fullName: userName,
          email: userEmail,
          mobile: cleanMobile,
        });

        loginStudent({
          id: loginRes.student?.id || res.user.uid,
          email: loginRes.student?.email || userEmail,
          fullName: loginRes.student?.fullName || userName,
          mobile: loginRes.student?.mobile || cleanMobile,
          collegeName: loginRes.student?.collegeName,
        });

        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err: any) {
      console.warn('Google sign in note:', err);
      if (err.errorCode === 'DEVICE_ALREADY_ACTIVE' || err.activeDevice) {
        await auth.signOut().catch(() => {});
        setBlockedActiveDevice(err.activeDevice || true);
        setError(err.message || 'আপনার অ্যাকাউন্টটি ইতিমধ্যে অন্য একটি ডিভাইসে সক্রিয় রয়েছে।');
      } else if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'bcastudypoint.vercel.app';
        setUnauthorizedDomain(currentHost);
        setError(`Google Sign-in চালু করতে Firebase Console-এ ডোমেইনটি যুক্ত করতে হবে।`);
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Google Sign-In বাতিল হয়েছে। প্রয়োজনে নীচের ফর্মের সাহায্যে লগইন করুন।');
      } else {
        setError(err.message || 'Google Sign-in সম্পন্ন করা যায়নি। আপনি নাম ও পাসওয়ার্ড দিয়ে লগইন করতে পারেন।');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBlockedActiveDevice(null);
    setUnauthorizedDomain(null);

    const cleanMobile = mobile.replace(/\D/g, '');

    if (isRegister) {
      if (!fullName.trim() || fullName.trim().length < 2) {
        setError('দয়া করে আপনার সম্পূর্ণ নাম লিখুন।');
        return;
      }
      if (cleanMobile.length < 10) {
        setError('দয়া করে একটি সঠিক ১০ সংখ্যার মোবাইল নম্বর লিখুন।');
        return;
      }
      if (!email.trim() || !email.includes('@')) {
        setError('দয়া করে সঠিক ইমেইল আইডি দিন।');
        return;
      }
      if (!password || password.length < 6) {
        setError('পাসওয়ার্ডটি অন্তত ৬ অক্ষরের হতে হবে।');
        return;
      }

      setIsLoading(true);
      try {
        const cleanEmail = email.trim().toLowerCase();

        // 1. Register with Firebase Auth (Passwords handled exclusively by Firebase, NEVER stored in plain DB)
        let firebaseUid = '';
        try {
          const cred = await registerWithEmailPassword(cleanEmail, password, {
            fullName: fullName.trim(),
            mobile: cleanMobile,
            collegeName: collegeName.trim() || undefined,
          });
          firebaseUid = cred.user.uid;
        } catch (firebaseErr: any) {
          if (firebaseErr.code === 'auth/email-already-in-use') {
            setError('এই ইমেইল দিয়ে ইতিপূর্বেই অ্যাকাউন্ট তৈরি করা হয়েছে। দয়া করে "Sign In" করুন।');
            setIsLoading(false);
            return;
          }
          console.warn('Firebase Auth note:', firebaseErr.message);
        }

        // 2. Register with server database & bind current device
        const regRes = await api.studentRegister({
          fullName: fullName.trim(),
          email: cleanEmail,
          mobile: cleanMobile,
          collegeName: collegeName.trim() || undefined,
          deviceInfo,
        });

        const activeId = firebaseUid || regRes.student.id;

        loginStudent({
          id: activeId,
          fullName: regRes.student.fullName,
          email: regRes.student.email,
          mobile: regRes.student.mobile,
          collegeName: regRes.student.collegeName,
        });

        if (onSuccess) onSuccess();
        onClose();
      } catch (err: any) {
        setError(err.message || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে। অন্য মোবাইল নম্বর বা ইমেইল দিয়ে চেষ্টা করুন।');
      } finally {
        setIsLoading(false);
      }
    } else {
      // SIGN IN MODE: Supports Firebase Email/Password AND registered Mobile login
      const identifier = email.trim();
      if (!identifier) {
        setError('দয়া করে আপনার রেজিস্টার্ড ইমেইল বা ১০ সংখ্যার মোবাইল নম্বর লিখুন।');
        return;
      }

      setIsLoading(true);
      try {
        let authSuccess = false;

        // If email and password provided, authenticate via Firebase Auth
        if (identifier.includes('@') && password) {
          try {
            const cred = await loginWithEmailPassword(identifier.toLowerCase(), password);
            if (cred.user) {
              authSuccess = true;
            }
          } catch (fbLoginErr: any) {
            console.warn('Firebase email login check:', fbLoginErr.code);
            if (fbLoginErr.code === 'auth/wrong-password' || fbLoginErr.code === 'auth/invalid-credential') {
              setError('ভুল পাসওয়ার্ড। অনুগ্রহ করে পুনরায় সঠিক পাসওয়ার্ড দিয়ে চেষ্টা করুন।');
              setIsLoading(false);
              return;
            }
          }
        }

        // Validate on backend with single active device verification
        const loginRes = await api.studentLogin(identifier, deviceInfo);

        loginStudent({
          id: loginRes.student.id,
          fullName: loginRes.student.fullName,
          email: loginRes.student.email,
          mobile: loginRes.student.mobile,
          collegeName: loginRes.student.collegeName,
        });

        if (onSuccess) onSuccess();
        onClose();
      } catch (err: any) {
        if (err.errorCode === 'DEVICE_ALREADY_ACTIVE' || err.activeDevice) {
          setBlockedActiveDevice(err.activeDevice || true);
          setError(err.message || 'আপনার অ্যাকাউন্টটি ইতিমধ্যে অন্য একটি ডিভাইসে সক্রিয় রয়েছে।');
        } else {
          setError(err.message || 'এই তথ্যে কোনো অ্যাকাউন্ট পাওয়া যায়নি। সঠিক ইমেইল/পাসওয়ার্ড দিন অথবা Register করুন।');
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div
      className={
        isPage
          ? 'min-h-[85vh] flex flex-col items-center justify-center p-3 sm:p-4 py-6'
          : 'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto'
      }
    >
      {isPage && (
        <div className="w-full max-w-sm mb-3">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs text-[#FFE7A3] hover:text-white px-3.5 py-1.5 rounded-full bg-black/50 border border-[#FFE7A3]/30 transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Public Website</span>
          </button>
        </div>
      )}

      {/* 2026 Liquid Glass Modal Container */}
      <div className="liquid-glass-master rounded-2xl sm:rounded-3xl max-w-sm w-full p-5 sm:p-6 border border-[#FFE7A3]/30 shadow-[0_20px_60px_rgba(0,0,0,0.85)] relative my-auto text-white">
        {/* Specular Top Rim */}
        <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FFD34E]/60 to-transparent pointer-events-none" />

        {!isPage && (
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-1 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Brand Header */}
        <div className="text-center mb-4 sm:mb-5">
          <div className="relative inline-block mb-2">
            <img
              src={BRAND.logoUrl}
              alt="Official Logo"
              className="w-13 h-13 sm:w-15 sm:h-15 rounded-full object-cover mx-auto ring-2 ring-[#FFD34E] shadow-[0_0_20px_rgba(255,211,78,0.4)]"
            />
          </div>

          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center justify-center gap-1.5">
            <span>{isRegister ? 'Student Registration' : 'Student Sign In'}</span>
          </h2>
          <p className="text-[11px] text-[#FFE7A3]/80 mt-0.5">
            Secure cross-device access to your BCA Question Banks
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-black/50 p-1 rounded-xl text-xs font-bold mb-4 border border-white/10">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError('');
            }}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              !isRegister
                ? 'btn-gold-primary shadow-sm'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError('');
            }}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              isRegister
                ? 'btn-gold-primary shadow-sm'
                : 'text-white/70 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {/* Google 1-Click Sign-In */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full mb-3 py-2 px-3 bg-white text-gray-900 rounded-full font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{isLoading ? 'Connecting Google...' : 'Continue with Google'}</span>
        </button>

        {/* Guided instructions if domain is unauthorized in Firebase */}
        {unauthorizedDomain && (
          <div className="mb-3.5 p-3 bg-amber-950/90 border border-amber-500/70 rounded-xl text-left text-xs text-amber-100 shadow-md space-y-2">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                <Globe className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Google Sign-in ডোমেইন অনুমোদন</span>
              </div>
              <button
                type="button"
                onClick={() => setUnauthorizedDomain(null)}
                className="text-white/40 hover:text-white p-0.5"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-black/60 p-2 rounded-lg border border-white/10 flex items-center justify-between gap-2">
              <div className="truncate">
                <span className="text-[9px] text-white/50 block">যোগ করার ডোমেইন:</span>
                <code className="text-xs text-[#FFD34E] font-mono font-bold">{unauthorizedDomain}</code>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(unauthorizedDomain);
                  setCopiedDomain(true);
                  setTimeout(() => setCopiedDomain(false), 2500);
                }}
                className="px-2 py-1 bg-white/15 hover:bg-white/25 text-white rounded text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
              >
                {copiedDomain ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedDomain ? 'কপি হয়েছে' : 'Copy'}</span>
              </button>
            </div>

            <a
              href="https://console.firebase.google.com/project/bcastudypoint-cdfdf/authentication/settings"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-1 py-1.5 px-2 bg-[#FFD34E] text-black font-extrabold text-[11px] rounded-lg shadow hover:bg-[#FFE7A3]"
            >
              <span>Firebase Settings খুলুন (Authorized Domains)</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-px bg-white/15" />
          <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">
            {isRegister ? 'Or with Email & Password' : 'Or with Email / Mobile'}
          </span>
          <div className="flex-1 h-px bg-white/15" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && !unauthorizedDomain && (
            <div className="p-3 bg-rose-950/90 border border-rose-500/60 rounded-xl text-xs text-rose-200 text-left space-y-1.5 shadow-md">
              {blockedActiveDevice ? (
                <div>
                  <div className="flex items-center gap-1.5 text-amber-300 font-bold mb-1">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>অন্য ডিভাইসে সক্রিয় রয়েছে!</span>
                  </div>
                  <p className="text-[11px] text-white/90 leading-snug">
                    একটি অ্যাকাউন্টে একসাথে কেবল ১টি সক্রিয় ডিভাইসে লগইন অনুমোদিত।
                  </p>
                  {typeof blockedActiveDevice === 'object' && blockedActiveDevice.os && (
                    <div className="mt-1.5 p-1.5 bg-black/50 border border-white/10 rounded text-[10px] text-white/80">
                      <span>বর্তমানে সক্রিয়: {blockedActiveDevice.os} ({blockedActiveDevice.browser || 'Browser'})</span>
                    </div>
                  )}
                  <p className="text-[10px] text-[#FFE7A3] mt-1.5">
                    👉 আগের ডিভাইস থেকে Logout করুন, অথবা অ্যাডমিনের সহায়তা নিন।
                  </p>
                </div>
              ) : (
                <>
                  <p>{error}</p>
                  {!isRegister && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegister(true);
                        setError('');
                      }}
                      className="mt-1 text-xs font-bold text-[#FFD34E] hover:underline block cursor-pointer"
                    >
                      👉 নতুন একাউন্ট রেজিস্টার করতে এখানে ক্লিক করুন
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {isRegister && (
            <div>
              <label className="block text-[11px] font-bold text-white mb-1">
                Full Name <span className="text-[#FFD34E]">*</span>
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-white/50 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Rahul Sharma"
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-black/40 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#FFD34E]"
                />
              </div>
            </div>
          )}

          {isRegister && (
            <div>
              <label className="block text-[11px] font-bold text-white mb-1">
                Mobile / WhatsApp Number <span className="text-[#FFD34E]">*</span>
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-white/50 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="9876543210"
                  maxLength={10}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-black/40 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#FFD34E]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-bold text-white mb-1">
              {isRegister ? 'Email Address' : 'Registered Email or Mobile'} <span className="text-[#FFD34E]">*</span>
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-white/50 absolute left-3 top-2.5" />
              <input
                type={isRegister ? 'email' : 'text'}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isRegister ? 'student@gmail.com' : 'student@gmail.com or 9876543210'}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-black/40 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#FFD34E]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-white">
                Password {isRegister ? <span className="text-[#FFD34E]">*</span> : <span className="text-white/40 text-[10px] font-normal">(Optional for mobile)</span>}
              </label>
            </div>
            <div className="relative">
              <KeyRound className="w-3.5 h-3.5 text-white/50 absolute left-3 top-2.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required={isRegister}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRegister ? 'Min 6 characters' : 'Enter password if set'}
                className="w-full pl-8 pr-8 py-1.5 text-xs bg-black/40 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#FFD34E]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-2 text-white/50 hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-[10px] font-medium text-white/80 mb-1">
                College Name <span className="text-white/40">(Optional)</span>
              </label>
              <input
                type="text"
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                placeholder="e.g. Guru Gobind Singh IPU"
                className="w-full px-3 py-1.5 text-xs bg-black/40 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#FFD34E]"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-gold-primary w-full py-2.5 px-4 text-xs font-black rounded-full cursor-pointer shadow-[0_6px_20px_rgba(255,211,78,0.35)] mt-2 flex items-center justify-center gap-1.5"
          >
            {isLoading ? (
              <span>Processing...</span>
            ) : (
              <span>{isRegister ? 'Create Secure Account' : 'Sign In Now'}</span>
            )}
          </button>
        </form>

        <p className="text-[10px] text-[#FFE7A3]/70 text-center mt-3">
          🔒 Secure Firebase Auth &amp; Real-time synchronization active.
        </p>
      </div>
    </div>
  );
};
