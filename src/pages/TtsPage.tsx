import React, { useState } from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { TtsForm } from '../components/tools/tts/TtsForm';
import { AudioPlayer } from '../components/tools/tts/AudioPlayer';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { generateTts } from '../lib/api';
import { Language } from '../types';
import { translations } from '../lib/i18n';
import { Volume2, Mic } from 'lucide-react';

interface TtsPageProps {
  lang: Language;
  onLogActivity: (tool: 'tts', title: string, summary?: string) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const TtsPage: React.FC<TtsPageProps> = ({ lang, onLogActivity, showToast }) => {
  const t = translations[lang];
  const [text, setText] = useState(
    lang === 'km'
      ? 'សូមស្វាគមន៍មកកាន់ ចង់ប្រើ (Jong Use) — បណ្តុំឧបករណ៍ AI សម្រាប់ភាសាខ្មែរ!'
      : 'Welcome to Jong Use, the Khmer and English digital AI utility suite!'
  );
  const [voice, setVoice] = useState('Kore');
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const data = await generateTts(text, lang, voice);
      setAudioUrl(data.audioBase64);
      onLogActivity('tts', `TTS Audio (${voice})`, text.slice(0, 80));
      showToast(lang === 'km' ? 'បានបង្កើតសំឡេងជោគជ័យ!' : 'Audio generated successfully!');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || t.errorOccurred, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title={t.ttsTitle}
      subtitle={t.ttsDesc}
      icon={<Volume2 className="w-5 h-5" />}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form */}
        <div className="lg:col-span-7">
          <TtsForm
            text={text}
            onChangeText={setText}
            voice={voice}
            onChangeVoice={setVoice}
            lang={lang}
            onGenerate={handleGenerate}
            loading={loading}
          />
        </div>

        {/* Right Column: Audio Player / Result */}
        <div className="lg:col-span-5 sticky top-24">
          {loading ? (
            <Card className="min-h-[320px] flex items-center justify-center">
              <Spinner
                size="lg"
                text={
                  lang === 'km'
                    ? 'កំពុងសំយោគសំឡេងអានបែបធម្មជាតិ...'
                    : 'Generating crystal clear speech audio with Gemini...'
                }
              />
            </Card>
          ) : audioUrl ? (
            <AudioPlayer audioUrl={audioUrl} lang={lang} textSnippet={text} />
          ) : (
            <Card className="min-h-[320px] flex flex-col items-center justify-center text-center p-8 border-dashed bg-stone-50/50">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <Mic className="w-7 h-7" />
              </div>
              <h4 className="font-bayon text-base text-stone-800 mb-1">
                {lang === 'km' ? 'សំឡេងអានត្រៀមជាស្រេច' : 'AI Speech Generator'}
              </h4>
              <p className="text-xs text-stone-500 max-w-xs font-khmer">
                {lang === 'km'
                  ? 'វាយបញ្ចូលអត្ថបទនៅខាងឆ្វេង ហើយចុច "បង្កើតសំឡេង" ដើម្បីស្តាប់'
                  : 'Enter or paste any text and click "Generate Speech Audio" to listen.'}
              </p>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
};
