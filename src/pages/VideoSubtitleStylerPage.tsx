import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Language, SubtitleSegment, SubtitleStyleConfig, SubtitlePreset } from '../types';
import { translations } from '../lib/i18n';
import {
  parseSrt,
  segmentsToSrt,
  SUBTITLE_PRESETS,
  KHMER_FONTS,
  drawStyledSubtitle,
  msToSrtTime,
  srtTimeToMs,
  splitSegmentsToShortWords,
  adjustSegmentsSpeed,
  realignSegmentsTimecodes,
} from '../lib/subtitle';
import {
  Video,
  Upload,
  FileText,
  Play,
  Pause,
  Download,
  RotateCcw,
  Sliders,
  Type,
  Palette,
  Layout,
  Layers,
  Check,
  Volume2,
  VolumeX,
  Maximize2,
  Clock,
  Film,
  Plus,
  Trash2,
  ArrowUpRight,
  RefreshCw,
  Zap,
  FastForward,
  Rewind,
  Scissors,
  Wand2,
  Flame,
  Smile,
  Compass,
  Box,
  Mic,
  AlertCircle,
  Eye,
  X,
} from 'lucide-react';

interface VideoSubtitleStylerPageProps {
  lang?: Language;
  onLogActivity?: (tool: 'videostyle', title: string, summary?: string, previewUrl?: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
  initialSrt?: string;
  initialSegments?: SubtitleSegment[];
  tokens?: number;
  onCheckAndDeductTokens?: (cost: number, tool: string, title: string, summary?: string) => Promise<boolean>;
}

export const VideoSubtitleStylerPage: React.FC<VideoSubtitleStylerPageProps> = ({
  lang = 'km',
  onLogActivity,
  showToast,
  initialSrt = '',
  initialSegments = [],
  tokens,
  onCheckAndDeductTokens,
}) => {
  const t = (key: keyof typeof translations['km']) => {
    return translations[lang]?.[key] || translations['km'][key] || key;
  };

  // Video State
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1);

  // Subtitle State
  const [segments, setSegments] = useState<SubtitleSegment[]>(initialSegments);
  const [rawSrt, setRawSrt] = useState<string>(initialSrt);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(-1);

  // Style State
  const [selectedPreset, setSelectedPreset] = useState<SubtitlePreset | 'custom'>('bold_pop_viral');
  const [styleConfig, setStyleConfig] = useState<SubtitleStyleConfig>(
    SUBTITLE_PRESETS.bold_pop_viral || SUBTITLE_PRESETS.tiktok_yellow
  );
  const [showFineTuning, setShowFineTuning] = useState<boolean>(true);

  // Export State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportStatusText, setExportStatusText] = useState<string>('');
  const [exportMode, setExportMode] = useState<'frame_by_frame' | 'realtime'>('frame_by_frame');
  const [exportQuality, setExportQuality] = useState<'original' | '1080p' | '720p'>('original');
  const [exportedVideoUrl, setExportedVideoUrl] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const exportedBlobRef = useRef<Blob | null>(null);
  const isCancelledRef = useRef<boolean>(false);

  // DOM & Audio Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const srtInputRef = useRef<HTMLInputElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioDestNodeRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const exportIntervalRef = useRef<any>(null);
  const [exportedMimeType, setExportedMimeType] = useState<string>('video/webm');

  // Sync initial props if updated
  useEffect(() => {
    if (initialSrt && (!rawSrt || rawSrt !== initialSrt)) {
      setRawSrt(initialSrt);
      const parsed = initialSegments.length > 0 ? initialSegments : parseSrt(initialSrt);
      setSegments(parsed);
    }
  }, [initialSrt, initialSegments]);

  // Handle Preset change
  const handlePresetSelect = (presetKey: SubtitlePreset) => {
    setSelectedPreset(presetKey);
    const presetObj = SUBTITLE_PRESETS[presetKey];
    if (presetObj) {
      const newConfig = { ...presetObj };
      setStyleConfig(newConfig);
      setTimeout(() => {
        renderFrame();
      }, 0);
    }
  };

  // Update a single style property
  const updateStyle = (key: keyof SubtitleStyleConfig, val: any) => {
    setSelectedPreset('custom');
    setStyleConfig((prev) => ({ ...prev, [key]: val }));
    setTimeout(() => {
      renderFrame();
    }, 0);
  };

  // Handle Video file upload
  const handleVideoUpload = (file: File) => {
    if (!file || !file.type.startsWith('video/')) return;
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setVideoName(file.name);
    setIsPlaying(false);
    setCurrentTime(0);
    setExportedVideoUrl(null);
  };

  // Handle SRT file upload
  const handleSrtUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || '';
      setRawSrt(content);
      const parsed = parseSrt(content);
      setSegments(parsed);
    };
    reader.readAsText(file);
  };

  // Load Sample Demo Video & Khmer Subtitles for 1-click test
  const handleLoadDemo = () => {
    // Generate a simple animated demo video canvas or sample video
    const sampleKhmerSrt = `1
00:00:00,500 --> 00:00:03,500
សូមស្វាគមន៍មកកាន់ កម្មវិធី ចង់ប្រើ (Jong Use)

2
00:00:04,000 --> 00:00:07,500
ឧបករណ៍កែសម្រួល Subtitle វីដេអូ ដោយស្វ័យប្រវត្ត

3
00:00:08,000 --> 00:00:11,500
គាំទ្រពុម្ពអក្សរខ្មែរ បាត់ដំបង គូលែន និងបាយ័ន

4
00:00:12,000 --> 00:00:15,000
Export វីដេអូបានច្បាស់ត្រជាក់ភ្នែក ឥតគិតថ្លៃ!`;

    setRawSrt(sampleKhmerSrt);
    const parsed = parseSrt(sampleKhmerSrt);
    setSegments(parsed);

    // Create demo synthetic video via canvas recording if no video is loaded
    createDemoVideoBlob().then((url) => {
      setVideoSrc(url);
      setVideoName('khmer_subtitle_demo.mp4');
    });
  };

  // Helper to create a short 15s synthetic demo video
  const createDemoVideoBlob = async (): Promise<string> => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d')!;

    const captureStreamFunc = (canvas as any).captureStream || (canvas as any).mozCaptureStream;
    const stream = captureStreamFunc ? captureStreamFunc.call(canvas, 30) : null;
    
    let mime = 'video/webm';
    if (typeof MediaRecorder !== 'undefined') {
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) mime = 'video/webm;codecs=vp9';
      else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) mime = 'video/webm;codecs=vp8';
      else if (MediaRecorder.isTypeSupported('video/mp4')) mime = 'video/mp4';
    }

    const mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
    const chunks: Blob[] = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    return new Promise((resolve) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mime });
        resolve(URL.createObjectURL(blob));
      };

      mediaRecorder.start();
      let frame = 0;
      const totalFrames = 30 * 15; // 15 seconds

      const interval = setInterval(() => {
        frame++;
        const progress = frame / totalFrames;

        // Draw animated gradient background
        const grad = ctx.createLinearGradient(0, 0, 1280, 720);
        grad.addColorStop(0, `hsl(${(progress * 360) % 360}, 65%, 25%)`);
        grad.addColorStop(0.5, `hsl(${((progress * 360) + 60) % 360}, 50%, 15%)`);
        grad.addColorStop(1, `hsl(${((progress * 360) + 120) % 360}, 70%, 10%)`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1280, 720);

        // Draw decorative subtle grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let x = 0; x < 1280; x += 60) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, 720);
          ctx.stroke();
        }

        // Draw centered glowing badge
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.font = '700 36px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Jong Use • Auto Video Subtitle Styler', 640, 220);

        ctx.font = '400 20px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillText(`Demo Video Preview • ${Math.floor(frame / 30)}s / 15s`, 640, 260);

        if (frame >= totalFrames) {
          clearInterval(interval);
          mediaRecorder.stop();
        }
      }, 1000 / 30);
    });
  };

  // Find active subtitle segment for given current time (seconds)
  const getActiveSegment = useCallback(
    (timeSec: number): SubtitleSegment | null => {
      const timeMs = Math.round(timeSec * 1000);
      return (
        segments.find(
          (seg) => timeMs >= seg.startMs && timeMs <= seg.endMs
        ) || null
      );
    },
    [segments]
  );

  // Render loop to draw video frame and overlay styled subtitles on canvas
  const renderFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions to match video aspect ratio
    if (video.videoWidth && video.videoHeight) {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
    }

    const width = canvas.width || 1280;
    const height = canvas.height || 720;

    // Clear and draw video frame
    ctx.clearRect(0, 0, width, height);
    if (video.readyState >= 2) {
      ctx.drawImage(video, 0, 0, width, height);
    }

    // Check active subtitle with timing for dynamic pop & rotate animation
    const timeMs = Math.round(video.currentTime * 1000);
    const activeSegIdx = segments.findIndex(
      (seg) => timeMs >= seg.startMs && timeMs <= seg.endMs
    );
    const activeSeg = activeSegIdx !== -1 ? segments[activeSegIdx] : null;
    if (activeSeg) {
      drawStyledSubtitle(ctx, activeSeg.text, width, height, styleConfig, {
        currentMs: timeMs,
        startMs: activeSeg.startMs,
        endMs: activeSeg.endMs,
        segmentIndex: activeSegIdx,
      });
    } else if (segments.length > 0) {
      // Show first segment so user sees the chosen style on the video canvas immediately
      const seg = segments[0];
      drawStyledSubtitle(ctx, seg.text, width, height, styleConfig, {
        currentMs: seg.startMs,
        startMs: seg.startMs,
        endMs: seg.endMs,
        segmentIndex: 0,
      });
    } else {
      // Fallback sample preview
      drawStyledSubtitle(ctx, 'វីដេអូ លេចធ្លោ ខ្មែរ\nJong Use Subtitle', width, height, styleConfig, {
        currentMs: 0,
        startMs: 0,
        endMs: 3000,
        segmentIndex: 0,
      });
    }

    if (!video.paused && !video.ended) {
      animationFrameRef.current = requestAnimationFrame(renderFrame);
    }
  }, [segments, styleConfig]);

  // Re-render frame whenever styleConfig or video source changes
  useEffect(() => {
    renderFrame();
  }, [styleConfig, segments, videoSrc, renderFrame]);

  // Handle Video Time Update
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    setCurrentTime(cur);

    // Update active segment index
    const timeMs = Math.round(cur * 1000);
    const activeIdx = segments.findIndex(
      (seg) => timeMs >= seg.startMs && timeMs <= seg.endMs
    );
    setActiveSegmentIndex(activeIdx);

    renderFrame();
  };

  // Toggle Play / Pause
  const handleTogglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
      animationFrameRef.current = requestAnimationFrame(renderFrame);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      renderFrame();
    }
  };

  // Seek video
  const handleSeek = (timeSec: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = timeSec;
    setCurrentTime(timeSec);
    renderFrame();
  };

  // Jump to specific segment
  const handleJumpToSegment = (seg: SubtitleSegment) => {
    if (!videoRef.current) return;
    const targetTime = seg.startMs / 1000;
    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    }
    renderFrame();
  };

  // Toggle Mute
  const handleToggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  // Helper: Seek video to specific timestamp and wait for seeked event
  const seekVideoTo = (video: HTMLVideoElement, timeSec: number): Promise<void> => {
    return new Promise((resolve) => {
      if (Math.abs(video.currentTime - timeSec) < 0.02) {
        resolve();
        return;
      }

      let isDone = false;
      const onSeeked = () => {
        if (!isDone) {
          isDone = true;
          video.removeEventListener('seeked', onSeeked);
          resolve();
        }
      };

      video.addEventListener('seeked', onSeeked, { once: true });
      try {
        video.currentTime = timeSec;
      } catch (e) {
        if (!isDone) {
          isDone = true;
          resolve();
        }
      }

      // Safety timeout in case seeked doesn't fire (e.g. at end of stream)
      setTimeout(() => {
        if (!isDone) {
          isDone = true;
          video.removeEventListener('seeked', onSeeked);
          resolve();
        }
      }, 180);
    });
  };

  // Cancel Ongoing Video Export
  const handleCancelExport = () => {
    isCancelledRef.current = true;
    if (exportIntervalRef.current) {
      clearInterval(exportIntervalRef.current);
      exportIntervalRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setIsExporting(false);
    setExportProgress(0);
    setExportStatusText('');
    setExportError(lang === 'km' ? 'បានបោះបង់ការ Render តាមការស្នើសុំ' : 'Export cancelled by user');
  };

  // Handle Export Video with Burned-in Subtitles
  const handleExportVideo = async () => {
    if (!videoRef.current || !videoSrc) {
      setExportError(lang === 'km' ? 'សូមបញ្ចូល ឬជ្រើសរើសវីដេអូជាមុនសិន' : 'Please load a video first before exporting');
      return;
    }

    if (onCheckAndDeductTokens) {
      const allowed = await onCheckAndDeductTokens(
        8,
        'videostyle',
        `Export Video Subtitles (${styleConfig.fontFamily})`,
        `Exported burned-in video at ${exportQuality}`
      );
      if (!allowed) return;
    }

    const video = videoRef.current;
    isCancelledRef.current = false;
    setIsExporting(true);
    setExportProgress(0);
    setExportStatusText(lang === 'km' ? 'កំពុងរៀបចំប្រព័ន្ធ Render...' : 'Initializing render engine...');
    setExportError(null);
    setExportedVideoUrl(null);
    exportedBlobRef.current = null;

    // Pause current playback
    video.pause();
    setIsPlaying(false);

    const originalTime = video.currentTime;
    const originalMuted = video.muted;

    try {
      // Ensure web fonts are ready before canvas draw
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      // Determine dimensions
      let vWidth = video.videoWidth > 0 ? video.videoWidth : 1280;
      let vHeight = video.videoHeight > 0 ? video.videoHeight : 720;

      if (exportQuality === '1080p') {
        const aspect = vWidth / vHeight;
        vHeight = 1080;
        vWidth = Math.round(1080 * aspect);
      } else if (exportQuality === '720p') {
        const aspect = vWidth / vHeight;
        vHeight = 720;
        vWidth = Math.round(720 * aspect);
      }

      // Make dimensions even numbers (required by many video encoders)
      vWidth = vWidth % 2 === 0 ? vWidth : vWidth - 1;
      vHeight = vHeight % 2 === 0 ? vHeight : vHeight - 1;

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = vWidth;
      exportCanvas.height = vHeight;
      const exportCtx = exportCanvas.getContext('2d', { alpha: false })!;

      // Capture stream from canvas
      const captureStreamFunc = (exportCanvas as any).captureStream || (exportCanvas as any).mozCaptureStream;
      if (!captureStreamFunc) {
        throw new Error('Canvas captureStream is not supported in this browser. Please try another browser.');
      }

      // Draw initial frame
      try {
        exportCtx.drawImage(video, 0, 0, vWidth, vHeight);
      } catch (e) {
        console.warn('Initial draw failed:', e);
      }

      const fps = 30;
      const canvasStream: MediaStream = captureStreamFunc.call(exportCanvas, fps);

      // Safe Audio Capture (never crash or stall export)
      let audioStreamTracks: MediaStreamTrack[] = [];
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          if (!audioCtxRef.current) {
            audioCtxRef.current = new AudioContextClass();
          }
          if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            await audioCtxRef.current.resume().catch(() => {});
          }
          if (audioCtxRef.current && !audioSourceNodeRef.current && video) {
            audioSourceNodeRef.current = audioCtxRef.current.createMediaElementSource(video);
            audioDestNodeRef.current = audioCtxRef.current.createMediaStreamDestination();
            audioSourceNodeRef.current.connect(audioDestNodeRef.current);
            audioSourceNodeRef.current.connect(audioCtxRef.current.destination);
          }
          if (audioDestNodeRef.current) {
            audioStreamTracks = audioDestNodeRef.current.stream.getAudioTracks();
          }
        }
      } catch (audioErr) {
        console.warn('Audio capture bypassed or fallback used:', audioErr);
      }

      const combinedTracks = [
        ...canvasStream.getVideoTracks(),
        ...audioStreamTracks,
      ];
      const combinedStream = new MediaStream(combinedTracks);

      // Determine supported mimeType
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4;codecs=avc1,mp4a.40.2',
        'video/mp4',
        '',
      ];
      let selectedMime = 'video/webm';
      for (const m of mimeTypes) {
        if (m === '' || (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m))) {
          selectedMime = m;
          break;
        }
      }
      setExportedMimeType(selectedMime || 'video/webm');

      const recorderOptions: MediaRecorderOptions = {
        videoBitsPerSecond: 6000000,
      };
      if (selectedMime) recorderOptions.mimeType = selectedMime;

      const recorder = new MediaRecorder(combinedStream, recorderOptions);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      const totalDuration = (Number.isFinite(video.duration) && video.duration > 0)
        ? video.duration
        : (segments.length > 0 ? (segments[segments.length - 1].endMs / 1000) + 1.0 : 10);

      recorder.start(200);

      if (exportMode === 'frame_by_frame') {
        // === ENGINE 1: BULLETPROOF FRAME-BY-FRAME RENDERER ===
        const totalFrames = Math.max(1, Math.ceil(totalDuration * fps));

        for (let frame = 0; frame < totalFrames; frame++) {
          if (isCancelledRef.current) {
            recorder.stop();
            throw new Error('Export cancelled');
          }

          const targetTime = Math.min(totalDuration, frame / fps);
          await seekVideoTo(video, targetTime);

          // Draw video frame to export canvas
          exportCtx.clearRect(0, 0, vWidth, vHeight);
          try {
            exportCtx.drawImage(video, 0, 0, vWidth, vHeight);
          } catch (drawErr) {
            console.warn('Frame draw warning:', drawErr);
          }

          // Draw styled subtitle overlay with exact frame timing
          const targetMs = Math.round(targetTime * 1000);
          const activeSegIdx = segments.findIndex(
            (seg) => targetMs >= seg.startMs && targetMs <= seg.endMs
          );
          const activeSeg = activeSegIdx !== -1 ? segments[activeSegIdx] : null;
          if (activeSeg) {
            drawStyledSubtitle(exportCtx, activeSeg.text, vWidth, vHeight, styleConfig, {
              currentMs: targetMs,
              startMs: activeSeg.startMs,
              endMs: activeSeg.endMs,
              segmentIndex: activeSegIdx,
            });
          }

          // Mirror to visible canvas for live interactive preview
          if (canvasRef.current) {
            const visibleCtx = canvasRef.current.getContext('2d');
            if (visibleCtx) {
              visibleCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              visibleCtx.drawImage(exportCanvas, 0, 0, canvasRef.current.width, canvasRef.current.height);
            }
          }

          // Request frame on stream if supported
          const videoTrack = canvasStream.getVideoTracks()[0];
          if (videoTrack && (videoTrack as any).requestFrame) {
            (videoTrack as any).requestFrame();
          }

          // Update progress
          const progressPercent = Math.min(99, Math.round(((frame + 1) / totalFrames) * 100));
          setExportProgress(progressPercent);
          setExportStatusText(
            lang === 'km'
              ? `កំពុង Render: ${frame + 1} / ${totalFrames} ស៊ុម (${targetTime.toFixed(1)}s / ${totalDuration.toFixed(1)}s)`
              : `Rendering: ${frame + 1} / ${totalFrames} frames (${targetTime.toFixed(1)}s / ${totalDuration.toFixed(1)}s)`
          );

          // Small yield for browser to encode stream chunk
          await new Promise((r) => setTimeout(r, 12));
        }
      } else {
        // === ENGINE 2: REALTIME PLAYBACK RECORDING ===
        video.currentTime = 0;
        await seekVideoTo(video, 0);

        await video.play().catch((playErr) => {
          console.warn('Auto-play restriction, continuing muted...', playErr);
          video.muted = true;
          return video.play();
        });

        await new Promise<void>((resolve) => {
          exportIntervalRef.current = setInterval(() => {
            if (isCancelledRef.current || video.ended || video.currentTime >= totalDuration - 0.05) {
              if (exportIntervalRef.current) {
                clearInterval(exportIntervalRef.current);
                exportIntervalRef.current = null;
              }
              video.pause();
              resolve();
              return;
            }

            const curTime = video.currentTime;
            const progressPercent = Math.min(99, Math.max(1, Math.round((curTime / totalDuration) * 100)));
            setExportProgress(progressPercent);
            setExportStatusText(
              lang === 'km'
                ? `កំពុងថត: ${curTime.toFixed(1)}s / ${totalDuration.toFixed(1)}s`
                : `Recording: ${curTime.toFixed(1)}s / ${totalDuration.toFixed(1)}s`
            );

            try {
              exportCtx.drawImage(video, 0, 0, vWidth, vHeight);
              const curTimeMs = Math.round(curTime * 1000);
              const activeSegIdx = segments.findIndex(
                (seg) => curTimeMs >= seg.startMs && curTimeMs <= seg.endMs
              );
              const activeSeg = activeSegIdx !== -1 ? segments[activeSegIdx] : null;
              if (activeSeg) {
                drawStyledSubtitle(exportCtx, activeSeg.text, vWidth, vHeight, styleConfig, {
                  currentMs: curTimeMs,
                  startMs: activeSeg.startMs,
                  endMs: activeSeg.endMs,
                  segmentIndex: activeSegIdx,
                });
              }
            } catch (e) {
              console.warn('Draw error:', e);
            }
          }, 1000 / fps);
        });
      }

      // Finish Recording and finalize Blob
      const finalBlob = await new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => {
          const mime = selectedMime || 'video/webm';
          const blob = new Blob(chunks, { type: mime });
          resolve(blob);
        };
        recorder.onerror = (e) => reject(e);
        try {
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
        } catch (e) {
          console.warn('Error stopping recorder:', e);
          const mime = selectedMime || 'video/webm';
          resolve(new Blob(chunks, { type: mime }));
        }
      });

      const downloadUrl = URL.createObjectURL(finalBlob);
      exportedBlobRef.current = finalBlob;
      setExportedVideoUrl(downloadUrl);
      setIsExporting(false);
      setExportProgress(100);
      setExportStatusText(lang === 'km' ? 'បានបញ្ចប់ការ Render ជោគជ័យ ១០០%!' : 'Render completed successfully 100%!');

      // Reset video to original time and restore settings
      video.currentTime = originalTime;
      video.muted = originalMuted;
      renderFrame();

      if (onLogActivity) {
        onLogActivity(
          'videostyle',
          `Video with Subtitles (${styleConfig.fontFamily})`,
          `Exported video with ${styleConfig.fontFamily} styled subtitles`
        );
      }
      if (showToast) {
        showToast(t('videoExportSuccess'));
      }
    } catch (err: any) {
      console.error('Export video error:', err);
      if (exportIntervalRef.current) {
        clearInterval(exportIntervalRef.current);
        exportIntervalRef.current = null;
      }
      setIsExporting(false);
      video.currentTime = originalTime;
      video.muted = originalMuted;
      setExportError(err.message || (lang === 'km' ? 'ការ Export វីដេអូបានបរាជ័យ សូមព្យាយាមម្តងទៀត' : 'Failed to export video. Please try again.'));
    }
  };

  // Download Exported Video with Bulletproof Fallbacks
  const handleDownloadExportedVideo = (customFormat?: 'mp4' | 'webm') => {
    if (!exportedVideoUrl && !exportedBlobRef.current) {
      if (showToast) showToast('No video available to download', 'error');
      return;
    }

    const isWebm = (exportedMimeType || '').includes('webm');
    const ext = customFormat || (isWebm ? 'webm' : 'mp4');
    const fileName = `jong_use_styled_${styleConfig.fontFamily.toLowerCase()}_${Date.now()}.${ext}`;

    const urlToDownload = exportedVideoUrl || (exportedBlobRef.current ? URL.createObjectURL(exportedBlobRef.current) : null);
    if (!urlToDownload) return;

    try {
      const a = document.createElement('a');
      a.href = urlToDownload;
      a.download = fileName;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
      }, 1500);

      if (showToast) {
        showToast(lang === 'km' ? 'កំពុងទាញយកវីដេអូ...' : 'Downloading video...');
      }
    } catch (err) {
      console.warn('Programmatic download anchor failed, opening in new tab:', err);
      window.open(urlToDownload, '_blank');
    }
  };

  // Open Exported Video in New Tab (Bypasses iframe sandbox download blocks)
  const handleOpenExportedInNewTab = () => {
    if (!exportedVideoUrl) return;
    window.open(exportedVideoUrl, '_blank');
  };

  // Direct Download of Original / Loaded Source Video
  const handleDownloadSourceVideo = () => {
    if (!videoSrc) return;
    const a = document.createElement('a');
    a.href = videoSrc;
    a.download = videoName || `source_video_${Date.now()}.mp4`;
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
    }, 1000);
  };

  // Capture Current Frame as HD Image (.PNG)
  const handleDownloadCurrentFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `subtitle_snapshot_${styleConfig.fontFamily.toLowerCase()}_${Date.now()}.png`;
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a);
      }
    }, 1000);
    if (showToast) {
      showToast(lang === 'km' ? 'បានទាញយករូបភាព Snapshot ដោយជោគជ័យ!' : 'Snapshot image downloaded successfully!');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 font-khmer">
              {t('videoStyleTitle')}
            </h1>
            <p className="text-sm text-stone-500 font-khmer">
              {t('videoStyleDesc')}
            </p>
          </div>
        </div>

        {/* Quick Demo button */}
        {!videoSrc && (
          <button
            onClick={handleLoadDemo}
            className="px-4 py-2 rounded-xl bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200 text-xs font-khmer font-bold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Video className="w-4 h-4 text-amber-600" />
            <span>{t('videoUseSampleVideo')}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left / Main Column: Video Player & Subtitle Timeline (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Video Preview Card */}
          <div className="bg-stone-950 rounded-2xl p-4 border border-stone-800 shadow-xl overflow-hidden">
            {/* Hidden Source Video */}
            {videoSrc && (
              <video
                ref={videoRef}
                src={videoSrc}
                className="hidden"
                playsInline
                crossOrigin="anonymous"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={(e) => {
                  setDuration(e.currentTarget.duration);
                  renderFrame();
                }}
                onEnded={() => {
                  setIsPlaying(false);
                  if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
                }}
              />
            )}

            {/* Display Canvas with Burned Subtitles */}
            <div className="relative aspect-video w-full bg-stone-900 rounded-xl overflow-hidden flex items-center justify-center group">
              {videoSrc ? (
                <canvas
                  ref={canvasRef}
                  onClick={handleTogglePlay}
                  className="w-full h-full object-contain cursor-pointer"
                />
              ) : (
                <div className="text-center p-8 space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-stone-800 text-stone-400 flex items-center justify-center mx-auto">
                    <Film className="w-8 h-8 stroke-[1.5]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-200 font-khmer">
                      {t('videoNoVideoYet')}
                    </p>
                    <p className="text-xs text-stone-500 font-khmer mt-1">
                      {t('videoDropVideo')}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => videoInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold font-khmer transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Video</span>
                    </button>
                    <button
                      onClick={handleLoadDemo}
                      className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-khmer transition-colors border border-stone-700 flex items-center gap-1.5"
                    >
                      <Video className="w-3.5 h-3.5 text-amber-400" />
                      <span>{t('videoUseSampleVideo')}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Centered Large Play Overlay Button */}
              {videoSrc && !isPlaying && (
                <button
                  onClick={handleTogglePlay}
                  className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-all transform hover:scale-105 shadow-xl"
                >
                  <Play className="w-7 h-7 fill-white translate-x-0.5" />
                </button>
              )}
            </div>

            {/* Video Controls Bar */}
            {videoSrc && (
              <div className="mt-3 px-2 pt-2 space-y-2 text-stone-300">
                {/* Seek Bar */}
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.05"
                    value={currentTime}
                    onChange={(e) => handleSeek(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:h-2 transition-all"
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleTogglePlay}
                      className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-200 transition-colors"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-stone-200" />}
                    </button>

                    <button
                      onClick={handleToggleMute}
                      className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-200 transition-colors"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>

                    <span className="font-mono text-stone-400">
                      {msToSrtTime(currentTime * 1000).slice(3, 8)} / {msToSrtTime(duration * 1000).slice(3, 8)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleDownloadCurrentFrame}
                      title="ទាញយករូបភាព Frame បច្ចុប្បន្ន (PNG Snapshot)"
                      className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 font-khmer text-xs transition-colors flex items-center gap-1 border border-stone-700/60"
                    >
                      <Download className="w-3 h-3 text-amber-400" />
                      <span>Snapshot HD</span>
                    </button>

                    <button
                      onClick={handleDownloadSourceVideo}
                      title="ទាញយកវីដេអូដើម (Source Video)"
                      className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 font-khmer text-xs transition-colors flex items-center gap-1 border border-stone-700/60"
                    >
                      <Film className="w-3 h-3 text-emerald-400" />
                      <span>Video ដើម</span>
                    </button>

                    <button
                      onClick={() => videoInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 font-khmer text-xs transition-colors flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" />
                      <span>ប្តូរវីដេអូ</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Hidden File Inputs */}
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleVideoUpload(file);
            }}
          />
          <input
            ref={srtInputRef}
            type="file"
            accept=".srt,.vtt,text/plain"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleSrtUpload(file);
            }}
          />

          {/* Subtitle Timeline List */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-stone-900 font-khmer">
                  Subtitle Timeline ({segments.length} ឃ្លា)
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => srtInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-khmer flex items-center gap-1 transition-colors"
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload .SRT</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-stone-400 font-khmer">
              {t('videoTimelineJump')}
            </p>

            {/* Quick Action Ribbon for Short Words and Speed */}
            {segments.length > 0 && (
              <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/80 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-stone-500 font-khmer flex items-center gap-1 mr-1">
                    <Scissors className="w-3 h-3 text-amber-600" />
                    កែសម្រួល:
                  </span>
                  <button
                    onClick={() => {
                      const splitted = splitSegmentsToShortWords(segments, 16, 3);
                      setSegments(splitted);
                      setRawSrt(segmentsToSrt(splitted));
                      if (showToast) showToast(lang === 'km' ? `បានបំបែកជា ${splitted.length} ពាក្យខ្លីៗ (TikTok / Shorts)!` : `Split into ${splitted.length} short words!`);
                    }}
                    title="បំបែកឃ្លាវែងៗទៅជាពាក្យខ្លីៗ 1-3 ពាក្យ (Short Words)"
                    className="px-2 py-1 text-xs rounded-lg bg-white hover:bg-amber-50 hover:text-amber-900 text-stone-700 border border-stone-200 font-khmer transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>{t('srtSplitToWords')}</span>
                  </button>

                  <button
                    onClick={() => {
                      const adjusted = adjustSegmentsSpeed(segments, 1.5);
                      setSegments(adjusted);
                      setRawSrt(segmentsToSrt(adjusted));
                      if (showToast) showToast(lang === 'km' ? 'បង្កើនល្បឿន 1.5x ជោគជ័យ!' : 'Speed up 1.5x');
                    }}
                    title="បង្កើនល្បឿននិយាយ Fast Speak 1.5x"
                    className="px-2 py-1 text-xs rounded-lg bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 font-khmer transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <FastForward className="w-3 h-3 text-emerald-600" />
                    <span>{t('srtSpeedUp15x')}</span>
                  </button>

                  <button
                    onClick={() => {
                      const adjusted = adjustSegmentsSpeed(segments, 2.0);
                      setSegments(adjusted);
                      setRawSrt(segmentsToSrt(adjusted));
                      if (showToast) showToast(lang === 'km' ? 'បង្កើនល្បឿន 2.0x យ៉ាងលឿន!' : 'Speed up 2.0x');
                    }}
                    title="បង្កើនល្បឿននិយាយ Ultra Fast 2.0x"
                    className="px-2 py-1 text-xs rounded-lg bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 font-khmer transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <FastForward className="w-3 h-3 text-amber-600" />
                    <span>{t('srtSpeedUp20x')}</span>
                  </button>

                  <button
                    onClick={() => {
                      const adjusted = adjustSegmentsSpeed(segments, 0.8);
                      setSegments(adjusted);
                      setRawSrt(segmentsToSrt(adjusted));
                      if (showToast) showToast(lang === 'km' ? 'បន្ថយល្បឿន 0.8x' : 'Slowed down 0.8x');
                    }}
                    title="បន្ថយល្បឿន 0.8x"
                    className="px-2 py-1 text-xs rounded-lg bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 font-khmer transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <Rewind className="w-3 h-3 text-emerald-600" />
                    <span>{t('srtSlowDown')}</span>
                  </button>
                </div>

                <button
                  onClick={() => {
                    const realigned = realignSegmentsTimecodes(segments, 0, 180);
                    setSegments(realigned);
                    setRawSrt(segmentsToSrt(realigned));
                    if (showToast) showToast(lang === 'km' ? 'បានរៀបចំ Timecode ឡើងវិញ!' : 'Realigned timecodes!');
                  }}
                  title="រៀបចំពេលវេលា Timecode ឡើងវិញដោយស្វ័យប្រវត្ត"
                  className="px-2 py-1 text-xs rounded-lg bg-stone-200/70 hover:bg-stone-200 text-stone-800 font-khmer transition-colors flex items-center gap-1"
                >
                  <Clock className="w-3 h-3 text-stone-600" />
                  <span>{t('srtRealignTimings')}</span>
                </button>
              </div>
            )}

            {segments.length === 0 ? (
              <div className="py-8 text-center text-stone-400 text-xs font-khmer border border-dashed border-stone-200 rounded-xl">
                {t('videoNoSrtYet')}
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {segments.map((seg, idx) => {
                  const isActive = activeSegmentIndex === idx;
                  return (
                    <div
                      key={seg.id || idx}
                      onClick={() => handleJumpToSegment(seg)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                        isActive
                          ? 'border-amber-500 bg-amber-50/80 shadow-xs'
                          : 'border-stone-200/80 bg-stone-50/50 hover:bg-stone-100/80'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 flex-1">
                        <span
                          className={`w-5 h-5 rounded text-[10px] font-mono font-bold flex items-center justify-center mt-0.5 ${
                            isActive ? 'bg-amber-500 text-white' : 'bg-stone-200 text-stone-600'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <div className="font-mono text-[11px] text-stone-400 mb-0.5">
                            {seg.startTime} ➔ {seg.endTime}
                          </div>
                          <div
                            className="text-sm font-semibold text-stone-800 leading-snug"
                            style={{ fontFamily: `"${styleConfig.fontFamily}", system-ui` }}
                          >
                            {seg.text}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJumpToSegment(seg);
                        }}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isActive ? 'text-amber-700 hover:bg-amber-100' : 'text-stone-400 hover:text-stone-700'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Modern Style Presets & Quick Tuning (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Dark Control Container */}
          <div className="bg-[#0b0f19] border border-stone-800/90 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-5">
            {/* Header & Quick Tuning Toggle */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-stone-800/80">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white font-khmer">
                  {lang === 'km' ? 'ម៉ូតអក្សរពេញនិយម (Style Presets)' : 'Subtitle Style Presets'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFineTuning(!showFineTuning)}
                className={`px-3 py-1.5 rounded-xl text-xs font-khmer font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                  showFineTuning
                    ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                    : 'bg-[#111625] border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{showFineTuning ? (lang === 'km' ? 'លាក់ការកែប្រែ' : 'Hide Tuning') : (lang === 'km' ? 'កែសម្រួលបន្ថែម' : 'Fine Tune')}</span>
              </button>
            </div>

            {/* Style Presets Grid: Direct 1-Click Live Activation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                {
                  id: 'bold_pop_viral',
                  title: 'Bold Pop Viral',
                  subKh: 'ពាក្យលោតបែប TikTok',
                  badge: 'Trending #1',
                  icon: Zap,
                  font: 'Kantumruy Pro',
                  description: 'Kantumruy Pro Bold with electric yellow word-pop and strong black outline.',
                  palette: ['#FFE600', '#FFFFFF', '#000000'],
                  preview: (
                    <div className="text-sm sm:text-base font-bold font-khmer text-white tracking-wide" style={{ fontFamily: '"Kantumruy Pro", sans-serif' }}>
                      <span>វីដេអូ </span>
                      <span className="text-[#FFE600] drop-shadow-[0_0_8px_rgba(255,230,0,0.85)] font-black text-base sm:text-lg">លេចធ្លោ</span>
                      <span> ខ្មែរ</span>
                    </div>
                  ),
                },
                {
                  id: 'karaoke_gold_sweep',
                  title: 'Karaoke Gold Sweep',
                  subKh: 'អក្សរខារ៉ាអូខេពន្លឺមាស',
                  badge: 'Classic',
                  icon: Mic,
                  font: 'Battambang',
                  description: 'Battambang Bold with smooth golden karaoke sweep as spoken.',
                  palette: ['#F59E0B', '#FFFFFF', '#0F172A'],
                  preview: (
                    <div className="text-sm sm:text-base font-bold font-khmer text-white tracking-wide" style={{ fontFamily: '"Battambang", sans-serif' }}>
                      <span>វីដេអូ </span>
                      <span className="text-[#FBBF24] drop-shadow-[0_0_10px_#F59E0B] font-black underline decoration-[#F59E0B]/60 underline-offset-4">លេចធ្លោ</span>
                      <span> ខ្មែរ</span>
                    </div>
                  ),
                },
                {
                  id: 'cyber_neon_glow',
                  title: 'Cyber Neon Glow',
                  subKh: 'ពន្លឺណេអុងស៊ីប័រ',
                  badge: 'Modern Cyber',
                  icon: Wand2,
                  font: 'Moul',
                  description: 'Moul display font with electric cyan neon glow over translucent backdrop.',
                  palette: ['#22D3EE', '#EC4899', '#020617'],
                  preview: (
                    <div className="text-sm sm:text-base font-normal font-khmer text-white tracking-wide" style={{ fontFamily: '"Moul", serif' }}>
                      <span>វីដេអូ </span>
                      <span className="text-[#22D3EE] drop-shadow-[0_0_12px_#06B6D4] font-semibold">លេចធ្លោ</span>
                      <span> ខ្មែរ</span>
                    </div>
                  ),
                },
                {
                  id: 'boxed_pill_highlight',
                  title: 'Boxed Pill Highlight',
                  subKh: 'ប្រអប់ពណ៌លើពាក្យ',
                  badge: 'Punchy',
                  icon: AlertCircle,
                  font: 'Koulen',
                  description: 'Koulen bold font with energetic yellow pill badge behind active words.',
                  palette: ['#FFE600', '#000000', '#FFFFFF'],
                  preview: (
                    <div className="text-sm sm:text-base font-bold font-khmer text-white flex items-center justify-center gap-1.5" style={{ fontFamily: '"Koulen", sans-serif' }}>
                      <span>វីដេអូ</span>
                      <span className="bg-[#FFE600] text-black px-2 py-0.5 rounded font-black text-xs sm:text-sm shadow-md">លេចធ្លោ</span>
                      <span>ខ្មែរ</span>
                    </div>
                  ),
                },
                {
                  id: 'minimal_modern',
                  title: 'Minimal Modern',
                  subKh: 'ម៉ូតសាមញ្ញទាន់សម័យ',
                  badge: 'Elegant',
                  icon: Eye,
                  font: 'Kantumruy Pro',
                  description: 'Clean minimalist typography with subtle backdrop shadow for vlogs.',
                  palette: ['#FFFFFF', '#94A3B8', '#0F172A'],
                  preview: (
                    <div className="text-sm sm:text-base font-medium font-khmer text-stone-100 tracking-wide drop-shadow-md" style={{ fontFamily: '"Kantumruy Pro", sans-serif' }}>
                      <span>វីដេអូ </span>
                      <span className="text-white font-bold underline decoration-white/40">លេចធ្លោ</span>
                      <span> ខ្មែរ</span>
                    </div>
                  ),
                },
                {
                  id: 'flame_amber_pop',
                  title: 'Flame Amber Pop',
                  subKh: 'ភ្លើងពណ៌ទឹកក្រូចក្រហម',
                  badge: 'Action / Vlog',
                  icon: Flame,
                  font: 'Koulen',
                  description: 'Energetic flame amber typography designed for high-retention reels.',
                  palette: ['#F97316', '#EF4444', '#000000'],
                  preview: (
                    <div className="text-sm sm:text-base font-bold font-khmer text-white tracking-wide" style={{ fontFamily: '"Koulen", sans-serif' }}>
                      <span>វីដេអូ </span>
                      <span className="text-[#F97316] drop-shadow-[0_0_12px_#EA580C] font-black text-base sm:text-lg">លេចធ្លោ</span>
                      <span> ខ្មែរ</span>
                    </div>
                  ),
                },
                {
                  id: 'hormozi_green',
                  title: 'Hormozi 3D Impact',
                  subKh: 'ពាក្យធំ 3D ម៉ូដ Hormozi',
                  badge: 'Viral 3D',
                  icon: Zap,
                  font: 'Koulen',
                  description: 'Ultra high-contrast electric green with heavy 3D extrusion.',
                  palette: ['#22C55E', '#052E16', '#000000'],
                  preview: (
                    <div className="text-sm sm:text-base font-black font-khmer text-white tracking-wider" style={{ fontFamily: '"Koulen", sans-serif', transform: 'rotate(-2deg)' }}>
                      <span>វីដេអូ </span>
                      <span className="text-[#22C55E] drop-shadow-[0_4px_0_#052E16] font-black text-base sm:text-lg">លេចធ្លោ</span>
                      <span> ខ្មែរ</span>
                    </div>
                  ),
                },
                {
                  id: 'mrbeast_pop',
                  title: 'MrBeast Punch',
                  subKh: 'ពាក្យលោតបែប MrBeast',
                  badge: 'High Retention',
                  icon: Zap,
                  font: 'Koulen',
                  description: 'Bold punchy gold text with comic red outline for maximal retention.',
                  palette: ['#FFD700', '#DC2626', '#000000'],
                  preview: (
                    <div className="text-sm sm:text-base font-black font-khmer tracking-wider" style={{ fontFamily: '"Koulen", sans-serif', color: '#FFD700', textShadow: '-1.5px -1.5px 0 #DC2626, 1.5px -1.5px 0 #DC2626, -1.5px 1.5px 0 #DC2626, 1.5px 1.5px 0 #DC2626' }}>
                      <span>វីដេអូ </span>
                      <span className="text-white text-base sm:text-lg">លេចធ្លោ</span>
                      <span> ខ្មែរ</span>
                    </div>
                  ),
                },
              ].map((card) => {
                const isSelected = selectedPreset === card.id;
                const Icon = card.icon;
                return (
                  <div
                    key={card.id}
                    onClick={() => {
                      handlePresetSelect(card.id as SubtitlePreset);
                      if (showToast) showToast(`បានអនុវត្តស្ទីល ${card.title} រួចរាល់!`, 'success');
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between group ${
                      isSelected
                        ? 'border-amber-500 bg-[#121829] shadow-lg shadow-amber-500/15 ring-2 ring-amber-500/50'
                        : 'border-stone-800/80 bg-[#101524]/90 hover:bg-[#141b2e] hover:border-amber-500/50'
                    }`}
                  >
                    {/* Card Top Row */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                            : 'bg-[#182035] border-stone-700/60 text-stone-400 group-hover:text-amber-400'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-stone-100 leading-tight">
                            {card.title}
                          </h4>
                          <p className="text-[11px] text-stone-400 font-khmer mt-0.5">
                            {card.subKh}
                          </p>
                        </div>
                      </div>
                      {isSelected ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 flex items-center gap-1 shrink-0">
                          <Check className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#182035] text-stone-300 border border-stone-700/60 shrink-0">
                          {card.badge}
                        </span>
                      )}
                    </div>

                    {/* Live Text Preview Box */}
                    <div className="bg-[#080b13] border border-stone-800/80 rounded-xl p-3 my-2 flex items-center justify-center text-center min-h-[58px]">
                      {card.preview}
                    </div>

                    {/* Description */}
                    <p className="text-[11px] leading-relaxed text-stone-400 font-sans mb-3 line-clamp-2">
                      {card.description}
                    </p>

                    {/* Card Bottom / Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-stone-800/70 text-[11px]">
                      <div className="flex items-center gap-1.5 text-stone-400">
                        <span>Palette:</span>
                        <div className="flex items-center gap-1">
                          {card.palette.map((c, i) => (
                            <span
                              key={i}
                              className="w-2.5 h-2.5 rounded-full border border-stone-700 inline-block shrink-0"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="font-mono text-amber-400/90 font-medium">
                        {card.font}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Collapsible Fine Tuning Controls */}
            {showFineTuning && (
              <div className="space-y-4 pt-4 border-t border-stone-800 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-stone-300 font-khmer flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    <span>{lang === 'km' ? 'កែសម្រួលពុម្ពអក្សរ & ទំហំ (Quick Tuning)' : 'Quick Tuning Controls'}</span>
                  </h4>
                  <span className="text-[11px] text-stone-400 font-mono">
                    Font: {styleConfig.fontFamily}
                  </span>
                </div>

                {/* Font Selector Chips */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {KHMER_FONTS.map((f) => {
                    const isSelected = styleConfig.fontFamily === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => updateStyle('fontFamily', f.id)}
                        className={`py-2 px-1 rounded-xl text-center transition-all border text-xs ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500/20 text-amber-300 font-bold'
                            : 'border-stone-800 bg-[#111625] text-stone-300 hover:bg-[#182035]'
                        }`}
                      >
                        <div className="truncate font-khmer" style={{ fontFamily: `"${f.id}", sans-serif` }}>
                          {f.id === 'Battambang' ? 'បាត់ដំបង' : f.id === 'Koulen' ? 'គូលែន' : f.id === 'Bayon' ? 'បាយ័ន' : f.id === 'Siemreap' ? 'សៀមរាប' : f.id === 'Moul' ? 'មូល' : f.name}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Sliders: Size, Position Y, Stroke Width */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-[#111625] border border-stone-800">
                  {/* Font Size */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-stone-300 font-khmer mb-1">
                      <span>{t('videoFontSize')}</span>
                      <span className="font-mono text-amber-400">{styleConfig.fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="18"
                      max="68"
                      value={styleConfig.fontSize}
                      onChange={(e) => updateStyle('fontSize', parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  {/* Position Y */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-stone-300 font-khmer mb-1">
                      <span>{t('videoPositionY')}</span>
                      <span className="font-mono text-amber-400">{styleConfig.positionY}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="92"
                      value={styleConfig.positionY}
                      onChange={(e) => updateStyle('positionY', parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  {/* Stroke Width */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-stone-300 font-khmer mb-1">
                      <span>{t('videoStrokeWidth')}</span>
                      <span className="font-mono text-amber-400">{styleConfig.strokeWidth}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="12"
                      value={styleConfig.strokeWidth}
                      onChange={(e) => updateStyle('strokeWidth', parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Export Action Card */}
          <div className="bg-stone-900 text-white rounded-2xl p-6 shadow-xl border border-stone-800 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-bold font-khmer text-amber-400 flex items-center gap-2">
                  <Film className="w-4 h-4" />
                  <span>{t('videoExportBtn')}</span>
                </h3>
                <p className="text-xs text-stone-400 font-khmer mt-1">
                  {lang === 'km'
                    ? `Render អក្សររត់ខ្មែរ (${styleConfig.fontFamily}) ដោយផ្ទាល់ចូលទៅក្នុងស៊ុមវីដេអូ`
                    : `Burn Khmer styled subtitles (${styleConfig.fontFamily}) directly into video frames`}
                </p>
              </div>

              {!isExporting && !exportedVideoUrl && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-mono font-semibold border border-amber-500/30">
                  HD 60fps
                </span>
              )}
            </div>

            {/* Export Settings: Mode & Quality (when not exporting and no exported result yet) */}
            {!isExporting && !exportedVideoUrl && (
              <div className="p-3 bg-stone-950/70 rounded-xl border border-stone-800/80 space-y-3">
                {/* Render Engine Selector */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-stone-400 font-khmer mb-1.5">
                    <span>{lang === 'km' ? 'បច្ចេកវិទ្យា Render (Engine):' : 'Render Engine:'}</span>
                    <span className="text-amber-400 font-mono">
                      {exportMode === 'frame_by_frame' ? (lang === 'km' ? 'Frame-by-Frame (គ្មានទាក់)' : 'Frame Precision') : 'Realtime'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setExportMode('frame_by_frame')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-khmer transition-all border text-left flex items-center gap-1.5 ${
                        exportMode === 'frame_by_frame'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-200 font-bold'
                          : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <div>
                        <div className="leading-tight">{lang === 'km' ? 'Frame-by-Frame' : 'Frame by Frame'}</div>
                        <div className="text-[9px] text-stone-400 font-normal leading-tight">
                          {lang === 'km' ? '១០០% គ្មានរំលងស៊ុម' : '100% frame accurate'}
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setExportMode('realtime')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-khmer transition-all border text-left flex items-center gap-1.5 ${
                        exportMode === 'realtime'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-200 font-bold'
                          : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <FastForward className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <div>
                        <div className="leading-tight">{lang === 'km' ? 'Realtime Record' : 'Realtime Speed'}</div>
                        <div className="text-[9px] text-stone-400 font-normal leading-tight">
                          {lang === 'km' ? 'ថតផ្ទាល់តាម Playback' : 'Direct live recording'}
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Resolution Selector */}
                <div className="pt-1 border-t border-stone-800/60">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-stone-400 font-khmer mb-1.5">
                    <span>{lang === 'km' ? 'កម្រិតច្បាស់ (Resolution):' : 'Resolution:'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'original', label: lang === 'km' ? 'ទំហំដើម (Original)' : 'Original' },
                      { id: '1080p', label: '1080p FHD' },
                      { id: '720p', label: '720p HD' },
                    ].map((res) => (
                      <button
                        key={res.id}
                        onClick={() => setExportQuality(res.id as any)}
                        className={`py-1 px-2 rounded-lg text-xs font-khmer border transition-colors text-center ${
                          exportQuality === res.id
                            ? 'bg-stone-800 border-amber-500/80 text-amber-300 font-bold'
                            : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {res.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {exportError && (
              <div className="p-3.5 rounded-xl bg-red-950/90 border border-red-800/90 text-red-200 text-xs font-khmer space-y-2">
                <div className="flex items-center gap-2 font-bold text-red-300">
                  <span>{exportError}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setExportError(null);
                      setExportMode(exportMode === 'frame_by_frame' ? 'realtime' : 'frame_by_frame');
                    }}
                    className="px-2.5 py-1 bg-red-900/60 hover:bg-red-800 text-white rounded-lg text-[11px] font-khmer transition-colors"
                  >
                    {lang === 'km' ? 'ប្តូរទៅ Engine ផ្សេងទៀត' : 'Switch Engine & Retry'}
                  </button>
                  <button
                    onClick={handleDownloadCurrentFrame}
                    className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-lg text-[11px] font-khmer transition-colors"
                  >
                    {lang === 'km' ? 'ទាញយក Frame PNG' : 'Save Frame PNG'}
                  </button>
                </div>
              </div>
            )}

            {isExporting ? (
              <div className="space-y-3 py-2">
                <div className="flex items-center justify-between text-xs font-khmer text-stone-300">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                    <span className="font-semibold text-amber-300">{t('videoExporting')}</span>
                  </span>
                  <span className="font-mono font-bold text-base text-amber-400">{exportProgress}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-3 bg-stone-800 rounded-full overflow-hidden p-0.5 border border-stone-700">
                  <div
                    className="h-full bg-linear-to-r from-amber-500 via-amber-400 to-emerald-400 transition-all duration-100 rounded-full"
                    style={{ width: `${Math.max(3, exportProgress)}%` }}
                  />
                </div>

                {exportStatusText && (
                  <p className="text-[11px] font-mono text-stone-400 text-center font-khmer">
                    {exportStatusText}
                  </p>
                )}

                <div className="flex justify-between items-center pt-2">
                  <span className="text-[10px] text-stone-500 font-khmer">
                    {lang === 'km' ? 'វីដេអូកំពុងត្រូវបាន Render និង Burn-in Subtitles...' : 'Rendering video frames...'}
                  </span>
                  <button
                    onClick={handleCancelExport}
                    className="px-3 py-1 bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 rounded-lg text-xs font-khmer transition-colors"
                  >
                    {lang === 'km' ? 'បោះបង់ (Cancel)' : 'Cancel Export'}
                  </button>
                </div>
              </div>
            ) : exportedVideoUrl ? (
              <div className="space-y-4 pt-1">
                <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-700/80 text-emerald-300 text-xs font-khmer flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400 font-bold shrink-0" />
                    <span className="font-bold">{t('videoExportSuccess')}</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400">100%</span>
                </div>

                {/* Built-in Video Player of Exported Media with Direct Controls */}
                <div className="rounded-xl overflow-hidden border border-stone-700 bg-black aspect-video relative group">
                  <video
                    src={exportedVideoUrl}
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="space-y-2">
                  {/* Primary 1-Click Download Button */}
                  <button
                    onClick={() => handleDownloadExportedVideo()}
                    className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold text-sm font-khmer shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {lang === 'km' ? 'ទាញយកវីដេអូ Subtitle ខ្មែរ (Download Video)' : 'Download Exported Video'}
                    </span>
                  </button>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                    <button
                      onClick={() => handleDownloadExportedVideo('mp4')}
                      className="py-2 px-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-khmer border border-stone-700/80 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>{lang === 'km' ? 'ទាញយក .MP4' : 'Save .MP4'}</span>
                    </button>
                    <button
                      onClick={() => handleDownloadExportedVideo('webm')}
                      className="py-2 px-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-khmer border border-stone-700/80 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{lang === 'km' ? 'ទាញយក .WEBM' : 'Save .WEBM'}</span>
                    </button>
                    <button
                      onClick={handleOpenExportedInNewTab}
                      title="បើកមើលក្នុង Tab ថ្មី (ករណី Browser ទប់ស្កាត់ការទាញយក)"
                      className="col-span-2 sm:col-span-1 py-2 px-2.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-khmer border border-stone-700/80 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{lang === 'km' ? 'បើក Tab ថ្មី' : 'Open Tab'}</span>
                    </button>
                  </div>

                  <div className="pt-2.5 flex items-center justify-between border-t border-stone-800">
                    <button
                      onClick={() => {
                        setExportedVideoUrl(null);
                        exportedBlobRef.current = null;
                      }}
                      className="text-xs text-stone-400 hover:text-amber-400 font-khmer transition-colors flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>{lang === 'km' ? 'កែ Style ហើយ Render ម្តងទៀត' : 'Adjust Style & Re-export'}</span>
                    </button>
                    <button
                      onClick={handleDownloadCurrentFrame}
                      className="text-xs text-stone-400 hover:text-stone-200 font-khmer transition-colors flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      <span>Snapshot PNG</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={handleExportVideo}
                  disabled={!videoSrc || segments.length === 0}
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm font-khmer shadow-lg hover:shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Video className="w-4 h-4 text-white" />
                  <span>{t('videoExportBtn')}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-800 text-emerald-100 font-bold ml-1">
                    8 Tokens
                  </span>
                </button>

                <div className="flex items-center justify-between pt-1 text-[11px] text-stone-400 font-khmer">
                  <button
                    onClick={handleDownloadSourceVideo}
                    disabled={!videoSrc}
                    className="hover:text-stone-200 disabled:opacity-40 transition-colors flex items-center gap-1"
                  >
                    <Film className="w-3 h-3 text-emerald-400" />
                    <span>{lang === 'km' ? 'ទាញយក Video ដើម' : 'Download source video'}</span>
                  </button>
                  <button
                    onClick={handleDownloadCurrentFrame}
                    disabled={!videoSrc}
                    className="hover:text-stone-200 disabled:opacity-40 transition-colors flex items-center gap-1"
                  >
                    <Download className="w-3 h-3 text-amber-400" />
                    <span>{lang === 'km' ? 'ទាញយក Frame Snapshot' : 'Save frame snapshot'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
