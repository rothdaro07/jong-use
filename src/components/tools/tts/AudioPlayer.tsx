import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Volume2, RotateCcw } from 'lucide-react';
import { Button } from '../../ui/Button';
import { translations } from '../../../lib/i18n';
import { Language } from '../../../types';

interface AudioPlayerProps {
  audioUrl: string;
  lang: Language;
  textSnippet?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, lang, textSnippet }) => {
  const t = translations[lang];
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `jong_use_tts_${Date.now()}.wav`;
    a.click();
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-5">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        onLoadedMetadata={handleTimeUpdate}
      />

      <div className="flex items-center justify-between pb-3 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-stone-800 text-sm">Natural AI Speech</h3>
            <p className="text-xs text-stone-500 font-khmer line-clamp-1">{textSnippet}</p>
          </div>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={handleDownload}
          icon={<Download className="w-3.5 h-3.5" />}
        >
          {t.downloadAudio} (WAV)
        </Button>
      </div>

      {/* Waveform Animation */}
      <div className="h-20 bg-stone-900 rounded-2xl flex items-center justify-center gap-1.5 px-6 relative overflow-hidden">
        {[40, 65, 30, 90, 45, 80, 20, 95, 60, 35, 75, 50, 85, 40, 70, 30, 90, 50].map((height, i) => (
          <div
            key={i}
            className={`w-1.5 bg-gradient-to-t from-indigo-500 to-amber-400 rounded-full transition-all duration-300 ${
              isPlaying ? 'animate-pulse' : 'opacity-40'
            }`}
            style={{
              height: isPlaying ? `${Math.max(15, (height * (1 + (i % 3) * 0.2)) % 100)}%` : '20%',
              animationDelay: `${i * 0.08}s`,
            }}
          />
        ))}
      </div>

      {/* Controls & Scrubber */}
      <div className="space-y-2">
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-stone-200 rounded-lg appearance-none"
        />
        <div className="flex justify-between text-xs font-mono text-stone-500">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="w-12 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white flex items-center justify-center shadow-md hover:shadow-lg transition-all"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                setCurrentTime(0);
              }
            }}
            className="p-2.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600"
            title="Restart"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs">
          {[0.85, 1.0, 1.25, 1.5].map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => setPlaybackRate(rate)}
              className={`px-2 py-1 rounded-lg font-semibold transition-all ${
                playbackRate === rate
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
