import React from 'react';
import { Language } from '../types';
import { translations } from '../lib/i18n';
import { Card } from '../components/ui/Card';
import {
  FileText,
  QrCode,
  Volume2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe2,
  FileCode,
  Video,
  Sparkles,
  LayoutDashboard,
  Lock,
} from 'lucide-react';

interface HomeProps {
  lang: Language;
  onNavigate: (tool: string) => void;
  recentCount?: number;
  isLoggedIn?: boolean;
  onRequireAuth?: (featureName: string, toolId: string) => void;
}

export const Home: React.FC<HomeProps> = ({
  lang,
  onNavigate,
  recentCount = 0,
  isLoggedIn = false,
  onRequireAuth,
}) => {
  const t = translations[lang];

  const tools = [
    {
      id: 'srt',
      titleKm: 'បង្កើត Subtitle (.SRT) ស្វ័យប្រវត្ត',
      titleEn: 'Generate Subtitle (.SRT)',
      descKm: 'សរសេរ ឬបិទភ្ជាប់ Script ដើម្បីបង្កើតឯកសារ .SRT ដែលមាន Timing និង Timecode ច្បាស់លាស់ ងាយស្រួលទាញយក',
      descEn: 'Generate perfectly-timed .SRT subtitle files from text/dialogue scripts with automatic speech pacing',
      icon: <FileCode className="w-6 h-6 text-amber-600" />,
      color: 'from-amber-500/10 to-amber-500/5',
      badge: 'New & Fast',
    },
    {
      id: 'videostyle',
      titleKm: 'កែសម្រួល Style Subtitle លើវីដេអូ',
      titleEn: 'Auto Edit Subtitle Style on Video',
      descKm: 'Upload វីដេអូ & .SRT ដើម្បីតុបតែង Font ខ្មែរស្អាតៗ (បាត់ដំបង គូលែន បាយ័ន) និង Export វីដេអូបានភ្លាមៗ',
      descEn: 'Drop video & SRT to style subtitles with Khmer fonts (Battambang, Koulen, Bayon) & export burned-in video',
      icon: <Video className="w-6 h-6 text-rose-600" />,
      color: 'from-rose-500/10 to-rose-500/5',
      badge: 'Khmer Fonts',
    },
    {
      id: 'ocr',
      titleKm: 'OCR អានអត្ថបទពីរូបភាព',
      titleEn: 'Document & Photo OCR',
      descKm: 'ស្រង់អក្សរខ្មែរ និងអង់គ្លេសពីរូបថត ឯកសារ វិក្កយបត្រ ព្រមទាំងបកប្រែស្វ័យប្រវត្ត',
      descEn: 'High-accuracy OCR for Khmer script and English texts with instant translation',
      icon: <FileText className="w-6 h-6 text-indigo-600" />,
      color: 'from-indigo-500/10 to-indigo-500/5',
      badge: 'Popular',
    },
    {
      id: 'qr',
      titleKm: 'បង្កើត QR Code ស្អាតៗ',
      titleEn: 'Custom Styled QR Generator',
      descKm: 'បង្កើត QR Code សម្រាប់ Link, Wi-Fi, អក្សរ ជាមួយពណ៌ និង Logo កណ្តាល',
      descEn: 'Create vector-sharp QR codes with custom styles, dots, and center branding',
      icon: <QrCode className="w-6 h-6 text-emerald-600" />,
      color: 'from-emerald-500/10 to-emerald-500/5',
      badge: 'Custom Style',
    },
    {
      id: 'tts',
      titleKm: 'អានអត្ថបទជាសំឡេង (TTS)',
      titleEn: 'Text-to-Speech Voice',
      descKm: 'បង្កើតសំឡេងអានភាសាខ្មែរ និងអង់គ្លេសយ៉ាងពីរោះរណ្តំ និងច្បាស់ល្អ',
      descEn: 'Natural sounding Khmer and English speech voice synthesis',
      icon: <Volume2 className="w-6 h-6 text-blue-600" />,
      color: 'from-blue-500/10 to-blue-500/5',
      badge: 'Natural Voice',
    },
  ];

  const handleToolClick = (toolId: string, toolTitle: string) => {
    if (isLoggedIn) {
      onNavigate(toolId);
    } else {
      if (onRequireAuth) {
        onRequireAuth(toolTitle, toolId);
      } else {
        onNavigate(toolId);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Hero Presentation */}
      <div className="text-center max-w-3xl mx-auto space-y-5">
        {!isLoggedIn && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold font-khmer">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>{lang === 'km' ? 'ឈុតឧបករណ៍ AI & Subtitle ខ្មែរទំនើប' : 'Next-Gen Khmer Subtitle & AI Studio'}</span>
          </div>
        )}

        <h1 className="text-4xl sm:text-5xl font-bayon text-stone-900 tracking-tight leading-tight">
          {t.appName} — {t.tagline}
        </h1>

        <p className="text-base sm:text-lg text-stone-600 font-khmer max-w-2xl mx-auto leading-relaxed">
          {t.subTagline}
        </p>

        {/* Hero CTA Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {isLoggedIn ? (
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold font-khmer text-sm rounded-2xl shadow-md hover:shadow-xl transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>{lang === 'km' ? 'ចូលទៅកាន់ផ្ទាំងគ្រប់គ្រង Dashboard' : 'Open User Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onRequireAuth && onRequireAuth(lang === 'km' ? 'ផ្ទាំងគ្រប់គ្រង Dashboard' : 'User Dashboard', 'dashboard')}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold font-khmer text-sm rounded-2xl shadow-md hover:shadow-xl transition-all flex items-center gap-2.5 cursor-pointer active:scale-95"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
              <span>{lang === 'km' ? 'ចូលប្រើជាមួយ Google (Sign in to use)' : 'Sign in with Google to Start'}</span>
            </button>
          )}

          <a
            href="#features-section"
            className="px-5 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold font-khmer text-sm rounded-2xl transition-colors inline-flex items-center gap-1.5"
          >
            <span>{lang === 'km' ? 'ស្វែងយល់មុខងារទាំងអស់' : 'Explore Features'}</span>
          </a>
        </div>

        {/* Feature trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4 text-xs text-stone-500 font-medium">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-emerald-500" />
            <span>{lang === 'km' ? 'លឿនរហ័ស គ្មានការរង់ចាំ' : 'Fast & Instant Processing'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Globe2 className="w-4 h-4 text-emerald-600" />
            <span>{lang === 'km' ? 'គាំទ្រភាសាខ្មែរ និងអន្តរជាតិ' : 'Khmer & Multilingual'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{lang === 'km' ? 'សុវត្ថិភាពទិន្នន័យលើ Cloud Firebase' : 'Secure Cloud Storage'}</span>
          </div>
        </div>
      </div>

      {/* Tools Grid */}
      <div id="features-section" className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bayon tracking-wide text-stone-900">
            {t.allTools}
          </h2>
          <span className="text-xs text-stone-500 font-mono font-medium">
            5 Essential Utilities
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => {
            const title = lang === 'km' ? tool.titleKm : tool.titleEn;
            return (
              <Card
                key={tool.id}
                id={`tool-card-${tool.id}`}
                hoverable
                onClick={() => handleToolClick(tool.id, title)}
                className="flex flex-col justify-between h-full group border-stone-200 hover:border-emerald-400 hover:shadow-lg transition-all cursor-pointer"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-stone-100 group-hover:bg-emerald-50 text-stone-700 group-hover:text-emerald-600 flex items-center justify-center transition-colors">
                      {tool.icon}
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200 group-hover:bg-emerald-100 group-hover:text-emerald-800 transition-colors">
                      {tool.badge}
                    </span>
                  </div>

                  <h3 className="font-bayon text-lg text-stone-900 group-hover:text-emerald-700 transition-colors mb-1">
                    {title}
                  </h3>
                  <p className="text-xs text-stone-600 font-khmer leading-relaxed mb-4">
                    {lang === 'km' ? tool.descKm : tool.descEn}
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-emerald-700 group-hover:translate-x-0.5 transition-transform font-khmer">
                  <span>
                    {isLoggedIn
                      ? (lang === 'km' ? 'បើកផ្ទាំង Studio' : 'Open in Dashboard')
                      : (lang === 'km' ? 'ចូល Google ដើម្បីប្រើប្រាស់' : 'Sign in to use')}
                  </span>
                  <div className="flex items-center gap-1">
                    {!isLoggedIn && <Lock className="w-3.5 h-3.5 text-stone-400" />}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};


