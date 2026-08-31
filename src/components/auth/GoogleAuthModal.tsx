import React, { useState } from 'react';
import { Sparkles, ShieldCheck, Cloud, Zap, X, AlertCircle } from 'lucide-react';
import { loginWithGoogle, ensureAnonymousAuth } from '../../firebase';
import { Language } from '../../types';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  lang: Language;
  targetFeatureName?: string;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  lang,
  targetFeatureName,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Google Sign In failed:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setError(lang === 'km' ? 'អ្នកបានបិទផ្ទាំង Login។ សូមព្យាយាមម្តងទៀត។' : 'Popup closed. Please try again.');
      } else if (err?.code === 'auth/popup-blocked') {
        setError(lang === 'km' ? 'កម្មវិធីរុករករបស់អ្នកបានរារាំង Popup។ សូមអនុញ្ញាត Popups សម្រាប់គេហទំព័រនេះ។' : 'Popup blocked by browser. Please allow popups.');
      } else {
        setError(lang === 'km' ? 'មិនអាចចូលគណនី Google បានទេ៖ ' + (err.message || 'សូមព្យាយាមម្តងទៀត') : 'Google Sign-in failed: ' + (err.message || 'Please try again'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuestContinue = async () => {
    setLoading(true);
    setError(null);
    try {
      await ensureAnonymousAuth();
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Guest login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0b0f19] border border-stone-800 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative text-stone-100 overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-full hover:bg-stone-800/80 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand & Logo Header */}
        <div className="text-center mb-6">
          <div className="inline-block relative mb-3">
            <img
              src="/logo.png"
              alt="JongUse Logo"
              className="w-16 h-16 rounded-2xl border border-stone-700 shadow-xl object-cover mx-auto"
            />
            <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-500 border-2 border-[#0b0f19] flex items-center justify-center text-stone-950 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>

          <h3 className="text-xl font-bold font-khmer text-white tracking-tight">
            {lang === 'km' ? 'ចូលគណនី Google ដើម្បីប្រើប្រាស់' : 'Sign in with Google'}
          </h3>
          <p className="text-xs text-stone-400 font-khmer mt-1.5 max-w-xs mx-auto leading-relaxed">
            {targetFeatureName
              ? (lang === 'km' ? `ដើម្បីប្រើប្រាស់ "${targetFeatureName}" និងផ្ទាំងគ្រប់គ្រង Creator Studio សូមចូលគណនីរបស់អ្នក` : `Sign in to access "${targetFeatureName}" and your Creator Studio`)
              : (lang === 'km' ? 'ចូលទៅកាន់ផ្ទាំងគ្រប់គ្រង Dashboard និងឧបករណ៍ AI ទាំងអស់' : 'Access your Creator Dashboard & All AI utilities')}
          </p>
        </div>

        {/* Value Highlights */}
        <div className="space-y-2.5 bg-[#101524] border border-stone-800/90 rounded-2xl p-3.5 mb-6 text-xs font-khmer text-stone-300">
          <div className="flex items-center gap-2.5">
            <Cloud className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{lang === 'km' ? 'រក្សាទុកឯកសារ Subtitle, OCR, QR លើ Cloud ស្វ័យប្រវត្ត' : 'Auto Cloud Sync for Subtitles, OCR & QR'}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{lang === 'km' ? 'ប្រើប្រាស់មុខងារ Video Subtitle Styler ឥតដែនកំណត់' : 'Full access to Video Subtitle Styler & Tools'}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{lang === 'km' ? 'សុវត្ថិភាពខ្ពស់ និងឥតគិតថ្លៃ 100%' : '100% Free & Secure Firebase Database'}</span>
          </div>
        </div>

        {/* Error notice */}
        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300 font-khmer flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Sign In Button */}
        <div className="space-y-3">
          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleLogin}
            className="w-full py-3.5 px-4 bg-white hover:bg-stone-100 text-stone-900 font-bold font-khmer text-sm rounded-2xl shadow-lg flex items-center justify-center gap-3 transition-all active:scale-98 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-stone-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
            )}
            <span>{lang === 'km' ? 'ចូលប្រើប្រាស់ជាមួយ Google' : 'Continue with Google'}</span>
          </button>

          {/* Quick Guest Continue Option */}
          <button
            type="button"
            disabled={loading}
            onClick={handleGuestContinue}
            className="w-full py-2.5 px-3 text-xs text-stone-400 hover:text-stone-200 font-khmer text-center rounded-xl hover:bg-stone-900/60 transition-colors"
          >
            {lang === 'km' ? 'ឬចូលប្រើប្រាស់ជាភ្ញៀវ (Guest Mode)' : 'Or continue as Guest'}
          </button>
        </div>
      </div>
    </div>
  );
};
