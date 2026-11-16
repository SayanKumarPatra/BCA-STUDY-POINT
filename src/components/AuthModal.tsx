import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Phone,
  User,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BRAND } from '../constants/brand';
import { api } from '../services/api';

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

  // Register fields (ONLY Full Name, WhatsApp/Mobile, Email ID)
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');

  // Sign In field (ONLY Mobile Number or Email ID)
  const [loginIdentifier, setLoginIdentifier] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRegister(defaultIsRegister);
      setError('');
    }
  }, [defaultIsRegister, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isRegister) {
      const trimmedName = fullName.trim();
      const cleanMobile = mobile.replace(/\D/g, '');
      const cleanEmail = email.trim().toLowerCase();

      if (trimmedName.length < 2) {
        setError('দয়া করে আপনার সম্পূর্ণ নাম লিখুন।');
        return;
      }
      if (cleanMobile.length < 10) {
        setError('দয়া করে সঠিক ১০ সংখ্যার WhatsApp / মোবাইল নম্বর লিখুন।');
        return;
      }
      if (!cleanEmail || !cleanEmail.includes('@')) {
        setError('দয়া করে সঠিক ইমেইল আইডি দিন।');
        return;
      }

      setIsLoading(true);
      try {
        const regRes = await api.studentRegister({
          fullName: trimmedName,
          mobile: cleanMobile,
          email: cleanEmail,
          deviceInfo,
        });

        loginStudent({
          id: regRes.student.id,
          fullName: regRes.student.fullName,
          email: regRes.student.email,
          mobile: regRes.student.mobile,
        });

        if (onSuccess) onSuccess();
        onClose();
      } catch (err: any) {
        setError(err.message || 'রেজিস্ট্রেশন সম্পন্ন করা যায়নি।');
      } finally {
        setIsLoading(false);
      }
    } else {
      const cleanIdentifier = loginIdentifier.trim();
      if (!cleanIdentifier) {
        setError('দয়া করে আপনার মোবাইল নম্বর অথবা ইমেইল আইডি লিখুন।');
        return;
      }

      setIsLoading(true);
      try {
        const loginRes = await api.studentLogin(cleanIdentifier, deviceInfo);

        loginStudent({
          id: loginRes.student.id,
          fullName: loginRes.student.fullName,
          email: loginRes.student.email,
          mobile: loginRes.student.mobile,
        });

        if (onSuccess) onSuccess();
        onClose();
      } catch (err: any) {
        setError(
          err.message ||
            'এই মোবাইল নম্বর বা ইমেইল আইডিতে কোনো অ্যাকাউন্ট পাওয়া যায়নি। অনুগ্রহ করে Register করুন।'
        );
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div
      className={
        isPage
          ? 'min-h-[80vh] flex flex-col items-center justify-center p-3 sm:p-4 py-6'
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
            <span>Return to Home</span>
          </button>
        </div>
      )}

      <div className="liquid-glass-master rounded-2xl sm:rounded-3xl max-w-sm w-full p-5 sm:p-6 border border-[#FFE7A3]/30 shadow-[0_20px_60px_rgba(0,0,0,0.85)] relative my-auto text-white">
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
        <div className="text-center mb-4">
          <img
            src={BRAND.logoUrl}
            alt="BCA STUDY POINT"
            className="w-12 h-12 rounded-full object-cover mx-auto mb-2 ring-2 ring-[#FFD34E] shadow-[0_0_18px_rgba(255,211,78,0.35)]"
          />
          <h2 className="text-lg font-black text-white tracking-tight">
            {isRegister ? 'Student Registration' : 'Student Login'}
          </h2>
          <p className="text-[11px] text-[#FFE7A3]/80 mt-0.5">
            {isRegister
              ? 'নাম, WhatsApp/মোবাইল নম্বর ও ইমেইল দিয়ে রেজিস্টার করুন'
              : 'আপনার মোবাইল নম্বর অথবা ইমেইল আইডি দিয়ে লগইন করুন'}
          </p>
        </div>

        {/* Clean Tab Switcher */}
        <div className="flex bg-black/50 p-1 rounded-xl text-xs font-bold mb-4 border border-white/10">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setError('');
            }}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              !isRegister ? 'btn-gold-primary shadow-sm' : 'text-white/70 hover:text-white'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setError('');
            }}
            className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
              isRegister ? 'btn-gold-primary shadow-sm' : 'text-white/70 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="p-3 bg-rose-950/90 border border-rose-500/60 rounded-xl text-xs text-rose-200 text-left space-y-1.5 shadow-md">
              <p>{error}</p>
              {!isRegister && (
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(true);
                    setError('');
                  }}
                  className="text-xs font-bold text-[#FFD34E] hover:underline block cursor-pointer"
                >
                  👉 নতুন অ্যাকাউন্ট তৈরি করতে Register-এ ক্লিক করুন
                </button>
              )}
            </div>
          )}

          {isRegister ? (
            <>
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
                    placeholder="আপনার সম্পূর্ণ নাম"
                    className="w-full pl-8 pr-3 py-2 text-xs bg-black/40 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#FFD34E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white mb-1">
                  WhatsApp / Mobile Number <span className="text-[#FFD34E]">*</span>
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
                    className="w-full pl-8 pr-3 py-2 text-xs bg-black/40 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#FFD34E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white mb-1">
                  Email ID <span className="text-[#FFD34E]">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-white/50 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@gmail.com"
                    className="w-full pl-8 pr-3 py-2 text-xs bg-black/40 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#FFD34E]"
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-[11px] font-bold text-white mb-1">
                Mobile Number or Email ID <span className="text-[#FFD34E]">*</span>
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-white/50 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="9876543210 বা student@gmail.com"
                  className="w-full pl-8 pr-3 py-2 text-xs bg-black/40 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#FFD34E]"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-gold-primary w-full py-2.5 px-4 text-xs font-black rounded-full cursor-pointer shadow-[0_6px_20px_rgba(255,211,78,0.35)] mt-2 flex items-center justify-center"
          >
            {isLoading ? 'Please Wait...' : isRegister ? 'Register Now' : 'Login Now'}
          </button>
        </form>
      </div>
    </div>
  );
};
