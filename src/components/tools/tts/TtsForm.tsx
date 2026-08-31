import React from 'react';
import { Language } from '../../../types';
import { translations } from '../../../lib/i18n';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Volume2, Languages, Mic2 } from 'lucide-react';

interface TtsFormProps {
  text: string;
  onChangeText: (text: string) => void;
  voice: string;
  onChangeVoice: (voice: string) => void;
  lang: Language;
  onGenerate: () => void;
  loading: boolean;
}

export const TtsForm: React.FC<TtsFormProps> = ({
  text,
  onChangeText,
  voice,
  onChangeVoice,
  lang,
  onGenerate,
  loading,
}) => {
  const t = translations[lang];

  const samplePhrases = [
    {
      labelKm: 'ស្វាគមន៍មកកាន់កម្ពុជា',
      textKm: 'សូមស្វាគមន៍មកកាន់ប្រទេសកម្ពុជា ទឹកដីនៃប្រាសាទអង្គរវត្ត និងវប្បធម៌ដ៏រុងរឿង!',
      labelEn: 'Welcome to Cambodia',
      textEn: 'Welcome to Cambodia, the Kingdom of Wonder and rich cultural heritage!',
    },
    {
      labelKm: 'សួស្តីពេលព្រឹក',
      textKm: 'អរុណសួស្តី! សូមជូនពរឱ្យថ្ងៃនេះជាថ្ងៃដ៏ស្រស់បំព្រង និងពោរពេញដោយភាពជោគជ័យ។',
      labelEn: 'Good morning greeting',
      textEn: 'Good morning! Wishing you a wonderful, productive, and cheerful day ahead.',
    },
    {
      labelKm: 'សុភាសិតខ្មែរ',
      textKm: 'ចេះដប់មិនស្មើប្រសប់មួយ ចេះច្បាស់មិនស្មើអនុវត្តជាក់ស្តែង។',
      labelEn: 'Inspiring thought',
      textEn: 'Knowledge is power, but practice and dedication bring true mastery.',
    },
  ];

  const voices = [
    { id: 'Kore', name: 'Kore (Warm & Natural)', gender: 'Female' },
    { id: 'Puck', name: 'Puck (Lively & Clear)', gender: 'Male' },
    { id: 'Zephyr', name: 'Zephyr (Smooth & Friendly)', gender: 'Female' },
    { id: 'Fenrir', name: 'Fenrir (Deep & Authoritative)', gender: 'Male' },
    { id: 'Aoede', name: 'Aoede (Melodic & Gentle)', gender: 'Female' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Text Input Card */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-indigo-600" />
            {t.ttsTitle}
          </label>
          <span className="text-xs text-stone-400 font-mono">
            {text.length} chars
          </span>
        </div>

        <textarea
          rows={5}
          value={text}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder={t.ttsInputPlaceholder}
          className="w-full p-4 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-khmer text-sm leading-relaxed"
        />

        {/* Sample phrases */}
        <div>
          <span className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">
            {t.ttsSamplePhrases}:
          </span>
          <div className="flex flex-wrap gap-2">
            {samplePhrases.map((phrase, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onChangeText(lang === 'km' ? phrase.textKm : phrase.textEn)}
                className="px-2.5 py-1 rounded-lg border border-stone-200 bg-stone-50 hover:bg-indigo-50 hover:border-indigo-200 text-stone-700 hover:text-indigo-700 text-xs font-khmer transition-all"
              >
                {lang === 'km' ? phrase.labelKm : phrase.labelEn}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* 2. Voice Selection Card */}
      <Card className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
          <Mic2 className="w-4 h-4 text-indigo-600" />
          <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
            {t.ttsVoice}
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {voices.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onChangeVoice(v.id)}
              className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                voice === v.id
                  ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-bold ring-2 ring-indigo-200'
                  : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
              }`}
            >
              <span className="text-xs">{v.name}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-500">
                {v.gender}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* Generate button */}
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={onGenerate}
        loading={loading}
        disabled={!text.trim()}
        icon={<Volume2 className="w-4 h-4" />}
      >
        {t.ttsGenerate}
      </Button>
    </div>
  );
};
