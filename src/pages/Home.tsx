import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Language } from '../types';
import { translations } from '../lib/i18n';
import { Card } from '../components/ui/Card';
import { loginWithGoogle } from '../firebase';
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
  Loader2,
} from 'lucide-react';

interface HomeProps {
  lang: Language;
  user: User | null;
  onNavigate: (tool: string) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  recentCount?: number;
}

export const Home: React.FC<HomeProps> = ({
  lang,
  user,
  onNavigate,
  showToast,
}) => {
  const t = translations[lang];
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  const isLoggedIn = !!user && !user.isAnonymous;

  const handleStartTools = async (toolId: string = 'srt') => {
    if (isLoggedIn) {
      onNavigate(toolId);
      return;
    }

    try {
      setIsLoggingIn(true);
      const loggedUser = await loginWithGoogle();
      if (loggedUser) {
        showToast(
          lang === 'km'
            ? `សូមស្វាគមន៍ ${loggedUser.displayName || 'Creator'}! បានចូលគណនីជោគជ័យ`
            : `Welcome ${loggedUser.displayName || 'Creator'}! Signed in successfully`,
          'success'
        );
        onNavigate(toolId);
      }
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        showToast(
          lang === 'km'
            ? 'ការចូលគណនីត្រូវបានបោះបង់'
            : 'Sign in was cancelled',
          'error'
        );
      } else {
        showToast(
          lang === 'km'
            ? 'មានបញ្ហាក្នុងការចូលគណនី Google'
            : 'Failed to sign in with Google',
          'error'
        );
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const tools = [
    {
      id: 'srt',
      titleKm: 'បង្កើត Subtitle (.SRT) ស្វ័យប្រវត្ត',
      titleEn: 'Generate Subtitle (.SRT)',
      descKm: 'សរសេរ ឬបិទភ្ជាប់ Script ដើម្បីបង្កើតឯកសារ .SRT ដែលមាន Timing និង Timecode ច្បាស់លាស់ ងាយស្រួលទាញយក',
      descEn: 'Generate perfectly-timed .SRT subtitle files from text/dialogue scripts with automatic speech pacing',
      icon: <FileCode className="w-6 h-6 text-amber-600" />,
      badge: 'New & Fast',
    },
    {
      id: 'videostyle',
      titleKm: 'កែសម្រួល Style Subtitle លើវីដេអូ',
      titleEn: 'Auto Edit Subtitle Style on Video',
      descKm: 'Upload វីដេអូ & .SRT ដើម្បីតុបតែង Font ខ្មែរស្អាតៗ (បាត់ដំបង គូលែន បាយ័ន) និង Export វីដេអូបានភ្លាមៗ',
      descEn: 'Drop video & SRT to style subtitles with Khmer fonts (Battambang, Koulen, Bayon) & export burned-in video',
      icon: <Video className="w-6 h-6 text-rose-600" />,
      badge: 'Khmer Fonts',
    },
    {
      id: 'ocr',
      titleKm: 'OCR អានអត្ថបទពីរូបភាព',
      titleEn: 'Document & Photo OCR',
      descKm: 'ស្រង់អក្សរខ្មែរ និងអង់គ្លេសពីរូបថត ឯកសារ វិក្កយបត្រ ព្រមទាំងបកប្រែស្វ័យប្រវត្ត',
      descEn: 'High-accuracy OCR for Khmer script and English texts with instant translation',
      icon: <FileText className="w-6 h-6 text-indigo-600" />,
      badge: 'Popular',
    },
    {
      id: 'qr',
      titleKm: 'បង្កើត QR Code ស្អាតៗ',
      titleEn: 'Custom Styled QR Generator',
      descKm: 'បង្កើត QR Code សម្រាប់ Link, Wi-Fi, អក្សរ ជាមួយពណ៌ និង Logo កណ្តាល',
      descEn: 'Create vector-sharp QR codes with custom styles, dots, and center branding',
      icon: <QrCode className="w-6 h-6 text-emerald-600" />,
      badge: 'Custom Style',
    },
    {
      id: 'tts',
      titleKm: 'អានអត្ថបទជាសំឡេង (TTS)',
      titleEn: 'Text-to-Speech Voice',
      descKm: 'បង្កើតសំឡេងអានភាសាខ្មែរ និងអង់គ្លេសយ៉ាងពីរោះរណ្តំ និងច្បាស់ល្អ',
      descEn: 'Natural sounding Khmer and English speech voice synthesis',
      icon: <Volume2 className="w-6 h-6 text-blue-600" />,
      badge: 'Natural Voice',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Hero Presentation */}
      <div className="text-center max-w-3xl mx-auto space-y-5">
        <h1 className="text-4xl sm:text-5xl font-bayon text-stone-900 tracking-tight leading-tight">
          {t.appName} — {t.tagline}
        </h1>

        <p className="text-base sm:text-lg text-stone-600 font-khmer max-w-2xl mx-auto leading-relaxed">
          {t.subTagline}
        </p>

        {/* Hero CTA Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            disabled={isLoggingIn}
            onClick={() => handleStartTools('srt')}
            className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold font-khmer text-sm rounded-2xl shadow-md hover:shadow-xl transition-all flex items-center gap-2.5 cursor-pointer active:scale-95 disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isLoggingIn && (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            )}
            <span>
              {isLoggingIn
                ? (lang === 'km' ? 'កំពុងភ្ជាប់ Google Account...' : 'Connecting Google Account...')
                : (lang === 'km' ? 'ចាប់ផ្ដើមប្រើប្រាស់ឧបករណ៍ឥឡូវនេះ' : 'Start Using Studio Tools')}
            </span>
            {!isLoggingIn && <ArrowRight className="w-4 h-4" />}
          </button>

          <a
            href="#features-section"
            className="px-5 py-3.5 bg-white hover:bg-stone-100 text-stone-800 border border-stone-200 font-bold font-khmer text-sm rounded-2xl transition-colors inline-flex items-center gap-1.5 shadow-xs"
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
            <span>{lang === 'km' ? 'សុវត្ថិភាពទិន្នន័យលើ Cloud' : 'Secure Cloud Storage'}</span>
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
                onClick={() => handleStartTools(tool.id)}
                className="flex flex-col justify-between h-full group border-stone-200 hover:border-emerald-400 hover:shadow-lg transition-all cursor-pointer bg-white"
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
                    {lang === 'km' ? 'បើកប្រើប្រាស់ឧបករណ៍' : 'Open Tool'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
