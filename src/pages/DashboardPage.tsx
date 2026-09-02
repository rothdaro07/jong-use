import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Language, SubtitleSegment } from '../types';
import { translations } from '../lib/i18n';
import { logoutUser } from '../firebase';
import { SubtitleGeneratorPage } from './SubtitleGeneratorPage';
import { VideoSubtitleStylerPage } from './VideoSubtitleStylerPage';
import { OcrPage } from './OcrPage';
import { QrPage } from './QrPage';
import { TtsPage } from './TtsPage';
import { HistoryPage } from './HistoryPage';
import {
  FileCode,
  Video,
  FileText,
  QrCode,
  Volume2,
  History,
  LogOut,
  Search,
  Settings,
  HelpCircle,
  Home,
  Menu,
  X,
} from 'lucide-react';

interface DashboardPageProps {
  lang: Language;
  user: User | null;
  initialTab?: string;
  onNavigateHome: () => void;
  logs: any[];
  logActivity: (tool: any, title: string, summary: string, previewUrl?: string) => void;
  clearHistory: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  lang,
  user,
  initialTab = 'srt',
  onNavigateHome,
  logs,
  logActivity,
  clearHistory,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<string>(
    initialTab === 'dashboard' || initialTab === 'overview' ? 'srt' : initialTab
  );
  const [leftSidebarOpen, setLeftSidebarOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sharedSrt, setSharedSrt] = useState<string>('');
  const [sharedSegments, setSharedSegments] = useState<SubtitleSegment[]>([]);

  const t = translations[lang];

  const handleNavigateToVideoStyler = (srtContent: string, segments: SubtitleSegment[]) => {
    setSharedSrt(srtContent);
    setSharedSegments(segments);
    setActiveTab('videostyle');
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
      showToast(lang === 'km' ? 'បានចាកចេញដោយជោគជ័យ' : 'Signed out successfully', 'success');
      onNavigateHome();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const toolsList = [
    {
      id: 'srt',
      titleKm: 'បង្កើត Subtitle (.SRT)',
      titleEn: 'Subtitle SRT Generator',
      icon: FileCode,
      descKm: 'បម្លែង Script ទៅជា SRT មាន Timing ច្បាស់',
      descEn: 'Generate timed subtitle files automatically',
      badge: 'Popular',
    },
    {
      id: 'videostyle',
      titleKm: 'Style Subtitle លើវីដេអូ',
      titleEn: 'Video Subtitle Styler',
      icon: Video,
      descKm: 'តុបតែង Font ខ្មែរ (គូលែន បាត់ដំបង) លើវីដេអូ',
      descEn: 'Burn-in Khmer animated captions onto video',
      badge: 'Viral',
    },
    {
      id: 'ocr',
      titleKm: 'OCR អានអក្សរពីរូបភាព',
      titleEn: 'Image & Doc OCR',
      icon: FileText,
      descKm: 'ស្រង់អក្សរខ្មែរ និងអង់គ្លេសពីរូបថត ឯកសារ',
      descEn: 'Extract text from photos and PDFs',
      badge: 'AI Vision',
    },
    {
      id: 'qr',
      titleKm: 'បង្កើត QR Code ស្អាតៗ',
      titleEn: 'Custom QR Code',
      icon: QrCode,
      descKm: 'បង្កើត QR Code ជាមួយ Logo និងពណ៌ទាន់សម័យ',
      descEn: 'Generate branded QR codes with logos',
      badge: 'Design',
    },
    {
      id: 'tts',
      titleKm: 'អានសំឡេង TTS',
      titleEn: 'Khmer Voice TTS',
      icon: Volume2,
      descKm: 'បម្លែងអត្ថបទទៅជាសំឡេងនិយាយភាសាខ្មែរពីរោះ',
      descEn: 'Convert text to natural Khmer audio',
      badge: 'Audio',
    },
    {
      id: 'history',
      titleKm: 'ប្រវត្តិ & Cloud Files',
      titleEn: 'Cloud Projects',
      icon: History,
      descKm: 'ឯកសារដែលបានរក្សាទុកក្នុងគណនី',
      descEn: 'Saved cloud projects & exports',
      badge: `${logs.length}`,
    },
  ];

  const filteredTools = toolsList.filter((item) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.titleKm.toLowerCase().includes(query) ||
      item.titleEn.toLowerCase().includes(query) ||
      item.descKm.toLowerCase().includes(query) ||
      item.descEn.toLowerCase().includes(query)
    );
  });

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-[#f8fafc]">
      {/* Mobile Header Bar: Clean White Background with Menu Icon & Title on the Left */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white text-stone-900 border-b border-stone-200 shadow-xs sticky top-16 z-30">
        <button
          type="button"
          onClick={() => setLeftSidebarOpen(true)}
          className="flex items-center gap-2.5 p-1.5 -ml-1.5 rounded-xl hover:bg-stone-100 active:scale-95 text-stone-800 transition-all cursor-pointer"
          title="Open tools menu"
        >
          <Menu className="w-5 h-5 text-stone-700 shrink-0" />
          <span className="font-bold font-khmer text-sm text-stone-900">
            {lang === 'km' ? 'ឧបករណ៍ទាំងអស់' : 'All Tools'}
          </span>
        </button>

        <span className="text-xs font-khmer font-semibold px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
          {toolsList.find((t) => t.id === activeTab)?.titleKm || 'Studio'}
        </span>
      </div>

      {/* Mobile Overlay Backdrop */}
      {leftSidebarOpen && (
        <div
          onClick={() => setLeftSidebarOpen(false)}
          className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs z-50 md:hidden transition-opacity"
        />
      )}

      {/* Left Sidebar (Slide-in Drawer from Left with high z-index on Mobile, Fixed Sidebar on Desktop) */}
      <aside
        id="dashboard-left-sidebar"
        className={`
          fixed inset-y-0 left-0 z-50 w-72 sm:w-80 bg-white border-r border-stone-200 flex flex-col justify-between p-4 sm:p-5 shadow-2xl transition-transform duration-300 ease-in-out
          md:static md:z-auto md:w-72 lg:w-80 md:bg-[#f8fafc] md:shadow-xs md:translate-x-0
          ${leftSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="space-y-4">
          {/* Mobile Drawer Top Header with Title and Close Button */}
          <div className="flex md:hidden items-center justify-between pb-3 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <Menu className="w-5 h-5 text-emerald-600" />
              <span className="font-bold font-khmer text-sm text-stone-900">
                {lang === 'km' ? 'ឧបករណ៍ទាំងអស់' : 'All Tools'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLeftSidebarOpen(false)}
              className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder={lang === 'km' ? 'ស្វែងរកឧបករណ៍...' : 'Search tools...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-stone-200 text-xs font-khmer text-stone-900 placeholder:text-stone-400 focus:outline-emerald-500 shadow-xs"
            />
          </div>

          {/* Main Navigation Menu */}
          <div className="space-y-1">
            <div className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-stone-400 font-khmer">
              {lang === 'km' ? 'ឧបករណ៍ទាំងអស់' : 'All Tools'}
            </div>

            {filteredTools.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTab === tool.id;
              const title = lang === 'km' ? tool.titleKm : tool.titleEn;

              return (
                <button
                  key={tool.id}
                  id={`sidebar-tool-${tool.id}`}
                  onClick={() => {
                    setActiveTab(tool.id);
                    setLeftSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer font-khmer text-xs ${
                    isActive
                      ? 'bg-emerald-600 text-white font-bold shadow-sm'
                      : 'text-stone-700 hover:text-stone-950 hover:bg-stone-100 md:hover:bg-stone-200/70 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-stone-500'}`} />
                    <span className="truncate">{title}</span>
                  </div>

                  {tool.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ml-1.5 ${
                        isActive
                          ? 'bg-emerald-700/80 text-white'
                          : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {tool.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Secondary Navigation */}
          <div className="pt-2 border-t border-stone-200 space-y-1">
            <div className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-stone-400 font-khmer">
              {lang === 'km' ? 'ការកំណត់ & ជំនួយ' : 'Settings & Help'}
            </div>

            <button
              type="button"
              onClick={() => showToast(lang === 'km' ? 'ប្រព័ន្ធដំណើរការកំណែចុងក្រោយ v2.5' : 'System running v2.5', 'success')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs text-stone-600 hover:text-stone-900 hover:bg-stone-100 md:hover:bg-stone-200/70 transition-colors font-khmer cursor-pointer"
            >
              <Settings className="w-4 h-4 text-stone-400 shrink-0" />
              <span>{lang === 'km' ? 'ការកំណត់' : 'Settings'}</span>
            </button>

            <button
              type="button"
              onClick={() => showToast(lang === 'km' ? 'ជំនួយតាម Telegram @jonguse_support' : 'Support via Telegram', 'success')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs text-stone-600 hover:text-stone-900 hover:bg-stone-100 md:hover:bg-stone-200/70 transition-colors font-khmer cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-stone-400 shrink-0" />
              <span>{lang === 'km' ? 'ជំនួយ & ឯកសារ' : 'Help & Docs'}</span>
            </button>
          </div>
        </div>

        {/* User Status / Info Card */}
        <div className="pt-4 mt-6 border-t border-stone-200 space-y-2.5">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 md:bg-white border border-stone-200 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="User"
                    className="w-8 h-8 rounded-full object-cover border border-emerald-500"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                    {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'J'}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-stone-900 truncate font-khmer">
                  {user?.displayName || (lang === 'km' ? 'អ្នកបង្កើតមាតិកា' : 'Creator')}
                </div>
                <div className="text-[10px] text-stone-400 truncate">
                  {lang === 'km' ? 'ស្ទូឌីយោរួចរាល់' : 'Studio Active'}
                </div>
              </div>
            </div>

            {user && !user.isAnonymous && (
              <button
                type="button"
                onClick={handleSignOut}
                className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onNavigateHome}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold font-khmer text-stone-600 hover:text-stone-950 hover:bg-stone-100 md:hover:bg-stone-200/70 transition-colors cursor-pointer"
          >
            <Home className="w-3.5 h-3.5 text-stone-500" />
            <span>{lang === 'km' ? 'ត្រឡប់ទៅទំព័រដើម (Home)' : 'Back to Home'}</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Stage */}
      <main className="flex-1 min-w-0 p-3 sm:p-6 lg:p-8 bg-[#f8fafc] overflow-y-auto">
        <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xs p-3.5 sm:p-6 min-h-[600px]">
          {activeTab === 'srt' && (
            <SubtitleGeneratorPage
              lang={lang}
              onLogActivity={(tool, title, sum) => logActivity(tool, title, sum)}
              showToast={showToast}
              onNavigateToVideoStyler={handleNavigateToVideoStyler}
            />
          )}

          {activeTab === 'videostyle' && (
            <VideoSubtitleStylerPage
              lang={lang}
              onLogActivity={(tool, title, sum, preview) => logActivity(tool, title, sum, preview)}
              showToast={showToast}
              initialSrt={sharedSrt}
              initialSegments={sharedSegments}
            />
          )}

          {activeTab === 'ocr' && (
            <OcrPage
              lang={lang}
              onLogActivity={(tool, title, sum, preview) => logActivity(tool, title, sum, preview)}
              showToast={showToast}
            />
          )}

          {activeTab === 'qr' && (
            <QrPage
              lang={lang}
              onLogActivity={(tool, title, sum) => logActivity(tool, title, sum)}
            />
          )}

          {activeTab === 'tts' && (
            <TtsPage
              lang={lang}
              onLogActivity={(tool, title, sum) => logActivity(tool, title, sum)}
              showToast={showToast}
            />
          )}

          {activeTab === 'history' && (
            <HistoryPage
              lang={lang}
              logs={logs}
              onClearHistory={clearHistory}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}
        </div>
      </main>
    </div>
  );
};
