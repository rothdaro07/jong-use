import React from 'react';
import { LangToggle } from '../ui/LangToggle';
import { Language } from '../../types';

interface NavbarProps {
  currentLang: Language;
  onLanguageChange: (lang: Language) => void;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentLang,
  onLanguageChange,
  onSelectTab,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div
            id="brand-logo"
            onClick={() => onSelectTab?.('home')}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <img
              src="/logo.png"
              alt="JongUse Logo"
              className="w-10 h-10 rounded-2xl object-cover border border-stone-200/80 shadow-xs group-hover:scale-105 transition-transform"
            />
            <div className="flex items-center gap-2">
              <span className="font-bayon text-xl tracking-wide text-stone-900 group-hover:text-emerald-600 transition-colors">
                ចង់ប្រើ
              </span>
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-sans">
                JONGUSE
              </span>
            </div>
          </div>

          {/* Right Controls: Single Flag Language Switcher */}
          <div className="flex items-center gap-3">
            <LangToggle currentLang={currentLang} onToggle={onLanguageChange} />
          </div>
        </div>
      </div>
    </header>
  );
};
