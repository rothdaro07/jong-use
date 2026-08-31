import React from 'react';
import { LangToggle } from '../ui/LangToggle';
import { Language } from '../../types';
import { translations } from '../../lib/i18n';
import { User } from 'firebase/auth';
import {
  Home,
  LayoutDashboard,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  user: User | null;
  onOpenLoginModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentLang,
  onLanguageChange,
  activeTab,
  onSelectTab,
  user,
  onOpenLoginModal,
}) => {
  const t = translations[currentLang];
  const isLoggedIn = !!user && !user.isAnonymous;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div
            id="brand-logo"
            onClick={() => onSelectTab('home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <img
              src="/logo.png"
              alt="JongUse Logo"
              className="w-10 h-10 rounded-2xl object-cover border border-stone-200/80 shadow-xs group-hover:scale-105 transition-transform"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bayon text-xl tracking-wide text-stone-900 group-hover:text-emerald-600 transition-colors">
                  ចង់ប្រើ
                </span>
                <span className="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Jong Use
                </span>
              </div>
            </div>
          </div>

          {/* Center Navigation Links (Hidden when logged in) */}
          {!isLoggedIn && (
            <nav className="flex items-center gap-1.5">
              <button
                id="nav-link-home"
                onClick={() => onSelectTab('home')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold font-khmer transition-all ${
                  activeTab === 'home'
                    ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 shadow-xs'
                    : 'text-stone-600 hover:text-stone-950 hover:bg-stone-100'
                }`}
              >
                <Home className="w-4 h-4 text-emerald-600" />
                <span>{currentLang === 'km' ? 'ទំព័រដើម' : 'Home'}</span>
              </button>

              <button
                id="nav-link-dashboard-preview"
                onClick={onOpenLoginModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold font-khmer text-stone-600 hover:text-stone-950 hover:bg-stone-100 transition-all cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4 text-emerald-600" />
                <span>{currentLang === 'km' ? 'ផ្ទាំងគ្រប់គ្រង' : 'Dashboard'}</span>
              </button>
            </nav>
          )}

          {/* Right Controls: Language Switcher, Google Auth Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Toggle */}
            <LangToggle currentLang={currentLang} onToggle={onLanguageChange} />

            {/* User Auth Section (Only show Sign-In button when logged out) */}
            {!isLoggedIn && (
              <button
                type="button"
                onClick={onOpenLoginModal}
                className="flex items-center gap-2 px-3 sm:px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold font-khmer text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#ffffff"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#ffffff"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#ffffff"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#ffffff"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{currentLang === 'km' ? 'ចូលប្រើប្រាស់' : 'Sign in'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};


