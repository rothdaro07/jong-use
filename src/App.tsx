import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { Home } from './pages/Home';
import { DashboardPage } from './pages/DashboardPage';
import { useUsageLog } from './hooks/useUsageLog';
import { useUserAccount } from './hooks/useUserAccount';
import { useToast } from './hooks/useToast';
import { Language } from './types';
import { subscribeToAuth, ensureAnonymousAuth, logoutUser } from './firebase';
import { User } from 'firebase/auth';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { SubscriptionModal } from './components/subscription/SubscriptionModal';
import { TokenUsageModal } from './components/subscription/TokenUsageModal';
import { TokenDepletedModal } from './components/subscription/TokenDepletedModal';
import { GoogleAuthModal } from './components/auth/GoogleAuthModal';

export default function App() {
  const [lang, setLang] = useState<Language>('km');
  const [activeTab, setActiveTab] = useState<string>('home');
  const [user, setUser] = useState<User | null>(null);
  const initialRedirectDone = useRef<boolean>(false);

  // Modals state
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState<boolean>(false);
  const [usageModalOpen, setUsageModalOpen] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [tokenDepletedModal, setTokenDepletedModal] = useState<{
    isOpen: boolean;
    requiredTokens: number;
    toolName?: string;
  }>({
    isOpen: false,
    requiredTokens: 10,
    toolName: '',
  });

  const { logs, logActivity, clearHistory } = useUsageLog();
  const { toasts, showToast, removeToast } = useToast();

  // Integrated User Account & Token System
  const {
    account,
    tokens,
    plan,
    deductTokens,
    subscribeToPlan,
    refillTokens,
    tokenLogs,
    hasEnoughTokens,
  } = useUserAccount(user);

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

  const handleLogout = async () => {
    try {
      await logoutUser();
      showToast(lang === 'km' ? 'បានចាកចេញពីគណនីជោគជ័យ' : 'Signed out successfully', 'success');
      setActiveTab('home');
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  const handleOpenTokenDepleted = (requiredTokens: number, toolName: string) => {
    setTokenDepletedModal({
      isOpen: true,
      requiredTokens,
      toolName,
    });
  };

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

      {/* Main Header with Token Balance Pill, Subscribe Button, Account Avatar */}
      <Navbar
        currentLang={lang}
        onLanguageChange={setLang}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        tokens={tokens}
        plan={plan}
        user={user}
        onOpenSubscription={() => setSubscriptionModalOpen(true)}
        onOpenUsageModal={() => setUsageModalOpen(true)}
        onOpenLogin={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
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
            onOpenSubscription={() => setSubscriptionModalOpen(true)}
            onOpenUsageModal={() => setUsageModalOpen(true)}
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
            tokens={tokens}
            plan={plan}
            account={account}
            onOpenSubscription={() => setSubscriptionModalOpen(true)}
            onOpenUsageModal={() => setUsageModalOpen(true)}
            deductTokens={deductTokens}
            hasEnoughTokens={hasEnoughTokens}
            onOpenTokenDepleted={handleOpenTokenDepleted}
          />
        )}
      </main>

      {/* Footer */}
      <Footer currentLang={lang} />

      {/* Subscription & Pricing Modal */}
      <SubscriptionModal
        isOpen={subscriptionModalOpen}
        onClose={() => setSubscriptionModalOpen(false)}
        lang={lang}
        user={user}
        currentPlan={plan}
        currentTokens={tokens}
        onSubscribe={subscribeToPlan}
        onTopup={refillTokens}
        onRequireAuth={() => {
          setSubscriptionModalOpen(false);
          setAuthModalOpen(true);
        }}
        showToast={showToast}
      />

      {/* Token & Usage Logs Modal */}
      <TokenUsageModal
        isOpen={usageModalOpen}
        onClose={() => setUsageModalOpen(false)}
        lang={lang}
        user={user}
        account={account}
        tokenLogs={tokenLogs}
        onOpenSubscription={() => {
          setUsageModalOpen(false);
          setSubscriptionModalOpen(true);
        }}
        onOpenLogin={() => {
          setUsageModalOpen(false);
          setAuthModalOpen(true);
        }}
      />

      {/* Insufficient Token Alert Modal */}
      <TokenDepletedModal
        isOpen={tokenDepletedModal.isOpen}
        onClose={() => setTokenDepletedModal((prev) => ({ ...prev, isOpen: false }))}
        lang={lang}
        requiredTokens={tokenDepletedModal.requiredTokens}
        currentTokens={tokens}
        toolName={tokenDepletedModal.toolName}
        onOpenSubscription={() => {
          setTokenDepletedModal((prev) => ({ ...prev, isOpen: false }));
          setSubscriptionModalOpen(true);
        }}
      />

      {/* Google Sign In Modal */}
      <GoogleAuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => {
          showToast(lang === 'km' ? 'បានចូលគណនីជោគជ័យ!' : 'Signed in successfully!', 'success');
        }}
        lang={lang}
      />
    </div>
  );
}
