import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { Home } from './pages/Home';
import { DashboardPage } from './pages/DashboardPage';
import { useUsageLog } from './hooks/useUsageLog';
import { useToast } from './hooks/useToast';
import { Language } from './types';
import { subscribeToAuth, ensureAnonymousAuth } from './firebase';
import { User } from 'firebase/auth';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState<Language>('km');
  const [activeTab, setActiveTab] = useState<string>('home');
  const [user, setUser] = useState<User | null>(null);
  const initialRedirectDone = useRef<boolean>(false);

  const { logs, logActivity, clearHistory } = useUsageLog();
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    // Listen to Firebase auth state
    const unsubscribe = subscribeToAuth((currentUser) => {
      setUser(currentUser);

      // Auto-redirect to dashboard when user is logged in with Google on initial load
      if (currentUser && !currentUser.isAnonymous && !initialRedirectDone.current) {
        initialRedirectDone.current = true;
        setActiveTab('srt');
      }
    });

    // Fallback anonymous session if needed
    ensureAnonymousAuth().catch(console.error);

    return () => unsubscribe();
  }, []);

  // Sync html lang
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 selection:bg-emerald-500 selection:text-white">
      {/* Toast notifications container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              className={`p-3.5 rounded-2xl shadow-lg border pointer-events-auto flex items-center justify-between gap-3 text-xs font-semibold ${
                t.type === 'error'
                  ? 'bg-red-950 text-red-100 border-red-800'
                  : 'bg-stone-900 text-white border-stone-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {t.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span>{t.message}</span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="p-1 text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Main Clean Header (Logo on left, Single Language Flag on right) */}
      <Navbar
        currentLang={lang}
        onLanguageChange={setLang}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
      />

      {/* Content Rendering: Home Page OR Dashboard Tools */}
      <main className="flex-1">
        {activeTab === 'home' ? (
          <Home
            lang={lang}
            user={user}
            onNavigate={(tab) => setActiveTab(tab)}
            showToast={showToast}
            recentCount={logs.length}
          />
        ) : (
          <DashboardPage
            lang={lang}
            user={user}
            initialTab={activeTab}
            onNavigateHome={() => setActiveTab('home')}
            logs={logs}
            logActivity={logActivity}
            clearHistory={clearHistory}
            showToast={showToast}
          />
        )}
      </main>

      {/* Footer */}
      <Footer currentLang={lang} />
    </div>
  );
}
