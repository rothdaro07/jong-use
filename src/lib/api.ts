import { OcrResult, SubtitleSegment } from '../types';

export interface OcrRequest {
  imageBase64: string;
  mimeType?: string;
  targetLang?: string;
  translate?: boolean;
}

export interface GenerateSrtRequest {
  script: string;
  language?: string;
  speed?: 'ultra_fast' | 'fast' | 'normal' | 'slow';
  chunkMode?: 'short_punchy' | 'medium_short' | 'standard';
  maxCharsPerLine?: number;
  startTimeOffset?: number;
  translateTo?: string;
}

export interface GenerateSrtResponse {
  success: boolean;
  srt: string;
  segments: SubtitleSegment[];
  count: number;
  fallbackUsed?: boolean;
}

export async function generateSrt(req: GenerateSrtRequest): Promise<GenerateSrtResponse> {
  const res = await fetch('/api/generate-srt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'SRT generation failed' }));
    throw new Error(err.error || 'Failed to generate SRT subtitles');
  }

  return res.json();
}

export interface IdPhotoRequest {
  imageBase64: string;
  mimeType?: string;
  attire: string;
  bgColor: string;
  gender?: string;
}

export interface UpscaleRequest {
  imageBase64: string;
  mimeType?: string;
  scale?: string;
  enhanceFaces?: boolean;
  denoise?: boolean;
}

export interface BgRemoveRequest {
  imageBase64: string;
  mimeType?: string;
  bgColor?: string;
}

export async function processOcr(req: OcrRequest): Promise<OcrResult> {
  const res = await fetch('/api/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || 'Failed to process OCR');
  }

  return res.json();
}

export async function generateIdPhoto(req: IdPhotoRequest): Promise<{ success: boolean; imageUrl: string }> {
  const res = await fetch('/api/idphoto', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || 'Failed to generate ID photo');
  }

  return res.json();
}

export async function generateTts(text: string, lang = 'km', voice = 'Kore'): Promise<{ audioBase64: string; audioUrl: string }> {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ text, lang, voice }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Speech generation failed' }));
    throw new Error(err.error || 'Failed to synthesize speech');
  }

  const data = await res.json();
  return {
    audioBase64: data.audioBase64,
    audioUrl: data.audioBase64,
  };
}

export async function processUpscale(req: UpscaleRequest): Promise<{ success: boolean; imageUrl: string }> {
  const res = await fetch('/api/upscale', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upscale failed' }));
    throw new Error(err.error || 'Failed to upscale image');
  }

  return res.json();
}

export async function processBgRemove(req: BgRemoveRequest): Promise<{ success: boolean; imageUrl: string }> {
  const res = await fetch('/api/bgremove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Background removal failed' }));
    throw new Error(err.error || 'Failed to remove background');
  }

  return res.json();
}
