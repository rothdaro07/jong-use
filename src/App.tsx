import React, { useState, useEffect } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { Home } from './pages/Home';
import { DashboardPage } from './pages/DashboardPage';
import { GoogleAuthModal } from './components/auth/GoogleAuthModal';
import { useUsageLog } from './hooks/useUsageLog';
import { useToast } from './hooks/useToast';
import { Language, SubtitleSegment } from './types';
import { subscribeToAuth, ensureAnonymousAuth } from './firebase';
import { User } from 'firebase/auth';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState<Language>('km');
  const [activeTab, setActiveTab] = useState<string>('home');
  const [user, setUser] = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [pendingTool, setPendingTool] = useState<{ name: string; id: string } | null>(null);

  const { logs, logActivity, clearHistory } = useUsageLog();
  const { toasts, showToast, removeToast } = useToast();

  useEffect(() => {
    // Listen to Firebase Auth state
    const unsubscribe = subscribeToAuth((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Sync title / html lang
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const handleRequireAuth = (featureName: string, toolId: string) => {
    setPendingTool({ name: featureName, id: toolId });
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = () => {
    showToast(
      lang === 'km' ? 'ចូលប្រើប្រាស់បានជោគជ័យ! សូមស្វាគមន៍' : 'Signed in successfully! Welcome',
      'success'
    );
    if (pendingTool && pendingTool.id !== 'dashboard' && pendingTool.id !== 'home') {
      setActiveTab(pendingTool.id);
    } else {
      setActiveTab('dashboard');
    }
    setPendingTool(null);
  };

  const handleSelectTab = (tab: string) => {
    if (tab === 'home') {
      setActiveTab('home');
      return;
    }

    // Check if user is logged in
    const isLoggedIn = !!user && !user.isAnonymous;
    if (!isLoggedIn) {
      handleRequireAuth(
        tab === 'dashboard'
          ? (lang === 'km' ? 'ផ្ទាំងគ្រប់គ្រង Dashboard' : 'User Dashboard')
          : (lang === 'km' ? 'មុខងារនេះ' : 'this feature'),
        tab
      );
      return;
    }

    setActiveTab(tab);
  };

  const renderActivePage = () => {
    if (activeTab === 'home') {
      return (
        <Home
          lang={lang}
          onNavigate={handleSelectTab}
          recentCount={logs.length}
          isLoggedIn={!!user && !user.isAnonymous}
          onRequireAuth={handleRequireAuth}
        />
      );
    }

    // Any other tab (dashboard, srt, videostyle, ocr, qr, tts, history) renders inside User Dashboard
    return (
      <DashboardPage
        lang={lang}
        user={user}
        initialTab={activeTab === 'dashboard' ? 'overview' : activeTab}
        onNavigateHome={() => setActiveTab('home')}
        logs={logs}
        logActivity={logActivity}
        clearHistory={clearHistory}
        showToast={showToast}
      />
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 text-stone-900 selection:bg-amber-500 selection:text-white">
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
                className="p-1 text-stone-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Main Header / Navbar */}
      <Navbar
        currentLang={lang}
        onLanguageChange={setLang}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        user={user}
        onOpenLoginModal={() => handleRequireAuth(lang === 'km' ? 'ផ្ទាំងគ្រប់គ្រង' : 'Creator Dashboard', 'dashboard')}
      />

      {/* Dynamic View Body */}
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            {renderActivePage()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Google Auth Modal */}
      <GoogleAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        lang={lang}
        targetFeatureName={pendingTool?.name}
      />

      {/* Footer */}
      <Footer currentLang={lang} />
    </div>
  );
}

