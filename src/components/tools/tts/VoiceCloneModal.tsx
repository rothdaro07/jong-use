import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Upload,
  Square,
  Play,
  Pause,
  CheckCircle2,
  X,
  Volume2,
  RefreshCw,
  Info,
  Radio,
  FileAudio,
  AudioLines
} from 'lucide-react';
import { ClonedVoiceProfile, Language } from '../../../types';
import { translations } from '../../../lib/i18n';
import { cloneVoice } from '../../../lib/api';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';

interface VoiceCloneModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProfile: (profile: ClonedVoiceProfile) => void;
  lang: Language;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const CALIBRATION_PHRASES = [
  {
    titleKm: 'ឃ្លាគំរូទី ១ (ស្វាគមន៍ផ្លូវការ)',
    textKm: 'សូមស្វាគមន៍មកកាន់ប្រព័ន្ធសំឡេងឆ្លាតវៃ។ ខ្ញុំរីករាយណាស់ដែលបានចូលរួមបង្កើតសំឡេងអានជាភាសាខ្មែរដ៏ពិរោះ។',
  },
  {
    titleKm: 'ឃ្លាគំរូទី ២ (និទានរឿង & ព័ត៌មាន)',
    textKm: 'អរុណសួស្តីពុកម៉ែបងប្អូនទាំងអស់គ្នា! ថ្ងៃនេះខ្ញុំមានដំណឹងល្អ និងរឿងរ៉ាវគួរឱ្យចាប់អារម្មណ៍ជាច្រើនដើម្បីចែករំលែក។',
  },
  {
    titleKm: 'ឃ្លាគំរូទី ៣ (ការសន្ទនាទូទៅ)',
    textKm: 'បច្ចេកវិទ្យាបញ្ញាសិប្បនិម្មិត AI ជួយឱ្យជីវិតរស់នៅរបស់យើងកាន់តែងាយស្រួល និងបង្កើនផលិតភាពការងារបានយ៉ាងច្រើន។',
  },
];

export const VoiceCloneModal: React.FC<VoiceCloneModalProps> = ({
  isOpen,
  onClose,
  onSaveProfile,
  lang,
  showToast,
}) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'record' | 'upload'>('record');
  const [customName, setCustomName] = useState('');
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  
  // Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileMimeType, setFileMimeType] = useState<string>('audio/webm');

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [clonedProfile, setClonedProfile] = useState<ClonedVoiceProfile | null>(null);

  // Audio Playback
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // MediaRecorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopRecording();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setCustomName('');
    setRecordedBlob(null);
    setRecordedAudioUrl(null);
    setUploadedFile(null);
    setUploadedAudioUrl(null);
    setFileBase64(null);
    setClonedProfile(null);
    setIsPlayingPreview(false);
    setRecordDuration(0);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  // 1. Microphone Recording Logic
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let mime = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mime = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mime = 'audio/mp4';
      }

      const recorder = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const fullBlob = new Blob(audioChunksRef.current, { type: mime });
        setRecordedBlob(fullBlob);
        const url = URL.createObjectURL(fullBlob);
        setRecordedAudioUrl(url);

        // Convert blob to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          setFileBase64(reader.result as string);
          setFileMimeType(mime.split(';')[0]);
        };
        reader.readAsDataURL(fullBlob);

        // Stop all media tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(200);
      setIsRecording(true);
      setRecordDuration(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordDuration((prev) => {
          if (prev >= 20) {
            stopRecording();
            return 20;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error('Microphone access error:', err);
      showToast(
        lang === 'km'
          ? 'មិនអាចបើក Microphone បានទេ។ សូមអនុញ្ញាត Microphone permission ក្នុង Browser របស់អ្នក។'
          : 'Cannot access microphone. Please enable microphone permission.',
        'error'
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn(err);
      }
    }
    setIsRecording(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  // 2. File Upload Logic
  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('audio/') && !file.name.endsWith('.mp3') && !file.name.endsWith('.wav') && !file.name.endsWith('.m4a')) {
      showToast(lang === 'km' ? 'សូមជ្រើសរើសឯកសារសំឡេង (MP3, WAV, M4A, WebM)' : 'Please select an audio file', 'error');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      showToast(lang === 'km' ? 'ឯកសារធំពេក (លើសពី 15MB)' : 'File is too large (> 15MB)', 'error');
      return;
    }

    setUploadedFile(file);
    const url = URL.createObjectURL(file);
    setUploadedAudioUrl(url);

    const reader = new FileReader();
    reader.onloadend = () => {
      setFileBase64(reader.result as string);
      setFileMimeType(file.type || 'audio/wav');
    };
    reader.readAsDataURL(file);

    if (!customName) {
      setCustomName(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  // 3. Audio Preview
  const togglePlayAudio = (url: string) => {
    if (!audioPreviewRef.current) {
      audioPreviewRef.current = new Audio(url);
      audioPreviewRef.current.onended = () => setIsPlayingPreview(false);
    }

    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current.src = url;
      audioPreviewRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  // 4. Submit to Clone Voice API
  const handleCloneSubmit = async () => {
    if (!fileBase64) {
      showToast(lang === 'km' ? 'សូមថតសំឡេង ឬ Upload ឯកសារសំឡេងជាមុនសិន' : 'Please record or upload an audio sample first', 'error');
      return;
    }

    setAnalyzing(true);
    try {
      const profile = await cloneVoice(
        fileBase64,
        fileMimeType,
        customName.trim() || undefined
      );

      // Keep reference to audio preview
      profile.sampleAudioUrl = recordedAudioUrl || uploadedAudioUrl || fileBase64;
      setClonedProfile(profile);
      showToast(t.ttsCloneSuccess, 'success');
    } catch (err: any) {
      console.error('Clone voice error:', err);
      showToast(err.message || 'Failed to clone voice', 'error');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveAndSelect = () => {
    if (clonedProfile) {
      onSaveProfile(clonedProfile);
      onClose();
    }
  };

  if (!isOpen) return null;

  const currentPreviewUrl = activeTab === 'record' ? recordedAudioUrl : uploadedAudioUrl;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-gradient-to-r from-emerald-50/50 via-white to-amber-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-200">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bayon text-base text-stone-900">
                {t.ttsCloneVoice}
              </h3>
              <p className="text-xs text-stone-500 font-khmer">
                {t.ttsCloneVoiceDesc}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Step 1: Tabs for Record vs Upload */}
          <div className="flex p-1 bg-stone-100 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('record');
                if (audioPreviewRef.current) audioPreviewRef.current.pause();
                setIsPlayingPreview(false);
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold font-khmer flex items-center justify-center gap-2 transition-all ${
                activeTab === 'record'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Mic className="w-4 h-4" />
              {t.ttsRecordAudio}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('upload');
                if (audioPreviewRef.current) audioPreviewRef.current.pause();
                setIsPlayingPreview(false);
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold font-khmer flex items-center justify-center gap-2 transition-all ${
                activeTab === 'upload'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Upload className="w-4 h-4" />
              {t.ttsUploadAudio}
            </button>
          </div>

          {/* TAB 1: RECORD LIVE */}
          {activeTab === 'record' && (
            <div className="space-y-4">
              {/* Calibration prompts */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 text-xs font-bold">
                  <Info className="w-4 h-4 text-amber-600" />
                  <span>{t.ttsRecordPrompt}</span>
                </div>
                <div className="space-y-2">
                  {CALIBRATION_PHRASES.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white/90 rounded-xl border border-amber-200/50 text-xs font-khmer text-stone-700 leading-relaxed"
                    >
                      <span className="font-bold text-amber-900 block mb-0.5 text-[11px]">
                        {item.titleKm}:
                      </span>
                      "{item.textKm}"
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Record Box */}
              <div className="p-6 rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50/60 flex flex-col items-center justify-center text-center space-y-4">
                {isRecording ? (
                  <div className="space-y-3">
                    <div className="relative flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full bg-red-500/20 animate-ping absolute" />
                      <div className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-300">
                        <Radio className="w-8 h-8 animate-pulse" />
                      </div>
                    </div>
                    <div className="font-mono text-xl font-bold text-red-600">
                      00:{recordDuration < 10 ? `0${recordDuration}` : recordDuration}
                    </div>
                    <p className="text-xs text-stone-600 font-khmer font-bold">
                      {t.ttsRecordingLive} (អានឃ្លាខាងលើឱ្យឮច្បាស់)
                    </p>
                    <Button
                      variant="danger"
                      size="md"
                      onClick={stopRecording}
                      icon={<Square className="w-4 h-4" />}
                    >
                      {t.ttsStopRecord}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                      <Mic className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-bayon text-sm text-stone-800">
                        {recordedBlob ? 'បានថតរួចរាល់! អាចថតម្តងទៀតបាន' : 'ថតសំឡេងគំរូ ៥ - ១៥ វិនាទី'}
                      </h4>
                      <p className="text-xs text-stone-500 font-khmer mt-1">
                        ចុចប៊ូតុងខាងក្រោម រួចអានឃ្លាគំរូខាងលើដោយសំឡេងធម្មជាតិរបស់អ្នក
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={startRecording}
                      icon={<Mic className="w-4 h-4" />}
                    >
                      {recordedBlob ? 'ថតម្តងទៀត (Record Again)' : t.ttsStartRecord}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD AUDIO */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileChange(e.dataTransfer.files[0]);
                  }
                }}
                className="p-8 rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50/60 hover:bg-stone-100/50 transition-colors flex flex-col items-center justify-center text-center cursor-pointer space-y-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <FileAudio className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-bayon text-sm text-stone-800">
                    {uploadedFile ? uploadedFile.name : 'ចុច ឬអូសទម្លាក់ឯកសារសំឡេង (MP3, WAV, M4A)'}
                  </h4>
                  <p className="text-xs text-stone-500 font-khmer mt-1">
                    {uploadedFile
                      ? `${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB • ${uploadedFile.type || 'audio'}`
                      : 'គាំទ្រទំហំរហូតដល់ 15MB សម្រាប់ចម្លងសំឡេង'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Upload className="w-4 h-4" />}
                  type="button"
                >
                  {uploadedFile ? 'ជ្រើសរើសឯកសារផ្សេង' : 'Browse File'}
                </Button>
              </div>
            </div>
          )}

          {/* Audio Sample Preview */}
          {currentPreviewUrl && (
            <div className="p-3 bg-stone-100 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => togglePlayAudio(currentPreviewUrl)}
                  className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-colors shadow-sm"
                >
                  {isPlayingPreview ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
                <div>
                  <span className="text-xs font-bold text-stone-800 block">
                    {t.ttsListenSample}
                  </span>
                  <span className="text-[11px] text-stone-500 font-khmer">
                    សំឡេងគំរូសម្រាប់វិភាគ Voice Biometrics
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700 px-2.5 py-1 bg-white rounded-lg border border-stone-200">
                Ready
              </span>
            </div>
          )}

          {/* Custom Name input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              ឈ្មោះសំឡេងចម្លង (Voice Name)
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder={t.ttsVoiceNamePlaceholder}
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-khmer"
            />
            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {['សំឡេងខ្ញុំផ្ទាល់', 'សំឡេងនិទានរឿង', 'សំឡេងព័ត៌មានផ្លូវការ', 'សំឡេងស្វាគមន៍'].map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setCustomName(name)}
                  className="text-[11px] font-khmer px-2 py-0.5 rounded-md bg-stone-100 hover:bg-emerald-50 hover:text-emerald-700 text-stone-600 transition-colors"
                >
                  + {name}
                </button>
              ))}
            </div>
          </div>

          {/* Analyze & Clone Action */}
          {!clonedProfile && (
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!fileBase64 || analyzing}
              loading={analyzing}
              onClick={handleCloneSubmit}
              icon={<AudioLines className="w-5 h-5" />}
            >
              {analyzing ? t.ttsAnalyzingVoice : 'វិភាគ និងចម្លងសំឡេង (Analyze & Clone Voice)'}
            </Button>
          )}

          {/* Biometrics Result Preview */}
          {clonedProfile && (
            <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-200/60">
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="font-bayon text-sm">{t.ttsCloneSuccess}</span>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                  AI Calibrated
                </span>
              </div>

              {/* Grid of detected traits */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-white rounded-xl border border-emerald-100 text-center">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block mb-0.5">Gender</span>
                  <span className="text-xs font-bold text-stone-800">{clonedProfile.gender}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-emerald-100 text-center">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block mb-0.5">Pitch</span>
                  <span className="text-xs font-bold text-stone-800">{clonedProfile.pitch}</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-emerald-100 text-center">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block mb-0.5">Timbre</span>
                  <span className="text-xs font-bold text-stone-800 truncate block" title={clonedProfile.timbre}>
                    {clonedProfile.timbre}
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-emerald-100 text-center">
                  <span className="text-[10px] uppercase font-bold text-stone-400 block mb-0.5">Pace</span>
                  <span className="text-xs font-bold text-stone-800">{clonedProfile.pace}</span>
                </div>
              </div>

              {/* Instructions summary */}
              <div className="p-3 bg-white rounded-xl border border-emerald-100 text-xs font-khmer text-stone-600 space-y-1">
                <span className="font-bold text-emerald-950 block text-[11px]">
                  {t.ttsVoiceTraits}:
                </span>
                <p className="text-[11px] leading-relaxed text-stone-700">
                  {clonedProfile.prosodyInstructions}
                </p>
                {clonedProfile.transcription && (
                  <p className="text-[11px] text-stone-500 italic mt-1">
                    ពាក្យដែលបាននិយាយ: "{clonedProfile.transcription}"
                  </p>
                )}
              </div>

              {/* Save and Select Button */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setClonedProfile(null)}
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                  វិភាគម្តងទៀត
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSaveAndSelect}
                  className="flex-[2]"
                  icon={<CheckCircle2 className="w-4 h-4" />}
                >
                  រក្សាទុក និងជ្រើសរើសសំឡេងនេះ (Use Voice)
                </Button>
              </div>
            </div>
          )}

          <p className="text-[11px] text-stone-400 text-center font-khmer">
            {t.ttsCloneNotice}
          </p>
        </div>
      </div>
    </div>
  );
};
