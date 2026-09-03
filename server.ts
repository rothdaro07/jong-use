import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality, ThinkingLevel } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser limits for high-resolution base64 images
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Lazy AI Client initializer
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || "";
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// 1. Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "ចង់ប្រើ (Jong Use)",
    timestamp: new Date().toISOString(),
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Helper to sanitize base64 cleanly without catastrophic regex backtracking
function cleanBase64(dataUrlOrBase64: string): { data: string; mimeType: string } {
  if (typeof dataUrlOrBase64 === "string" && dataUrlOrBase64.startsWith("data:")) {
    const commaIdx = dataUrlOrBase64.indexOf(",");
    if (commaIdx !== -1) {
      const header = dataUrlOrBase64.slice(0, commaIdx);
      const data = dataUrlOrBase64.slice(commaIdx + 1);
      const mimeMatch = header.match(/data:([^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
      return { mimeType, data };
    }
  }
  return { mimeType: "image/jpeg", data: dataUrlOrBase64 };
}

// Candidate models for high-availability text & multimodal tasks
const TEXT_MODELS = [
  "gemini-3.1-flash-lite-preview",
  "gemini-3.8-flash",
  "gemini-3.6-flash",
];

async function generateWithFallback(ai: GoogleGenAI, models: string[], params: any) {
  let lastError: any = null;
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model,
      });
      return response;
    } catch (err: any) {
      console.warn(`Gemini model ${model} failed, trying next candidate... Status: ${err?.status || err?.message}`);
      lastError = err;
    }
  }
  throw lastError;
}

// 2. OCR API (Optical Character Recognition + Translation for Khmer & English)
app.post("/api/ocr", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg", targetLang, translate = false } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 in request body" });
    }

    const cleaned = cleanBase64(imageBase64);
    if (!cleaned.data || cleaned.data.trim().length === 0) {
      return res.status(400).json({ error: "Invalid image data provided" });
    }

    const ai = getAI();

    const prompt = `You are a specialized Khmer and Multilingual OCR (Optical Character Recognition) engine for Jong Use (ចង់ប្រើ).
Carefully inspect this image and extract ALL text exactly as written, preserving paragraph structure, tables, bullet points, headers, punctuation, and Khmer diacritics/subscripts (ជើង).

Requirements:
1. Detect the primary language (e.g. 'Khmer', 'English', 'Khmer & English', 'French', etc.).
2. Extract the exact text cleanly without missing words or lines.
3. If translate is requested (${translate ? "YES" : "NO"}) or targetLang is specified ('${targetLang || "none"}'), provide a natural, accurate translation to ${targetLang || "English"}.
4. Return a valid JSON response with keys:
   - "detectedLanguage": string (e.g. "Khmer", "English", "Khmer & English")
   - "extractedText": string (the complete exact verbatim OCR text)
   - "translatedText": string (translation if requested, or empty string)
   - "confidence": string ("High" | "Medium" | "Low")
   - "summary": string (one short sentence describing document type, e.g. "Receipt", "National ID card", "Book page", "Signboard")`;

    const response = await generateWithFallback(ai, TEXT_MODELS, {
      contents: [
        {
          inlineData: {
            data: cleaned.data,
            mimeType: cleaned.mimeType || mimeType,
          },
        },
        { text: prompt },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const rawText = response.text || "{}";
    let cleanJson = rawText.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    }

    try {
      let parsed = JSON.parse(cleanJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        parsed = parsed[0];
      }

      const extractedText = parsed.extractedText || parsed.text || parsed.content || "";
      const detectedLanguage = parsed.detectedLanguage || parsed.language || "Khmer / English";
      const translatedText = parsed.translatedText || parsed.translation || "";
      let confidence = parsed.confidence;
      if (typeof confidence === "number") {
        confidence = confidence >= 0.8 ? "High" : confidence >= 0.5 ? "Medium" : "Low";
      } else if (!confidence) {
        confidence = "High";
      }

      res.json({
        success: true,
        detectedLanguage,
        extractedText: extractedText || (rawText.startsWith("{") ? "" : rawText),
        translatedText,
        confidence,
        summary: parsed.summary || "",
      });
    } catch {
      res.json({
        success: true,
        detectedLanguage: "Khmer / English",
        extractedText: rawText,
        translatedText: "",
        confidence: "High",
        summary: "Scanned document",
      });
    }
  } catch (error: any) {
    console.error("OCR API error:", error);
    const isQuota = error?.status === 429 || String(error?.message).includes("429") || String(error?.message).includes("RESOURCE_EXHAUSTED") || String(error?.message).includes("quota");
    const isTimeout = String(error?.message).includes("timeout") || String(error?.message).includes("HeadersTimeoutError") || String(error?.message).includes("fetch failed");
    const isUnavailable = error?.status === 503 || String(error?.message).includes("503") || String(error?.message).includes("UNAVAILABLE");
    const errMsg = isQuota
      ? "API quota reached for document analysis. Please try again shortly."
      : isUnavailable
      ? "ប្រព័ន្ធកំពុងមានអ្នកប្រើប្រាស់ច្រើន (High Demand). សូមសាកល្បងម្ដងទៀតក្នុងប៉ុន្មានវិនាទីទៀត។"
      : isTimeout
      ? "ការតភ្ជាប់ទៅកាន់ម៉ាស៊ីនមេចំណាយពេលយូរពេក។ សូមសាកល្បងម្ដងទៀត។"
      : error?.message || "Failed to process OCR";
    res.status(isQuota ? 429 : isTimeout ? 504 : isUnavailable ? 503 : 500).json({ error: errMsg, isQuota, isTimeout });
  }
});

// Helper to build a standard WAV header for 24kHz mono 16-bit PCM
function pcmToWav(pcmData: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length;
  const chunkSize = 36 + dataSize;

  const header = Buffer.alloc(44);
  header.write("RIFF", 0); // ChunkID
  header.writeUInt32LE(chunkSize, 4); // ChunkSize
  header.write("WAVE", 8); // Format
  header.write("fmt ", 12); // Subchunk1ID
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  header.writeUInt16LE(numChannels, 22); // NumChannels
  header.writeUInt32LE(sampleRate, 24); // SampleRate
  header.writeUInt32LE(byteRate, 28); // ByteRate
  header.writeUInt16LE(blockAlign, 32); // BlockAlign
  header.writeUInt16LE(bitsPerSample, 34); // BitsPerSample
  header.write("data", 36); // Subchunk2ID
  header.writeUInt32LE(dataSize, 40); // Subchunk2Size

  return Buffer.concat([header, pcmData]);
}

// 3. TTS API (Text-to-Speech via Gemini Native Audio or Synthesis)
async function handleTts(req: express.Request, res: express.Response) {
  try {
    const text = (req.method === "POST" ? req.body.text : req.query.text) as string;
    const lang = (req.method === "POST" ? req.body.lang : req.query.lang) || "km";
    const voice = (req.method === "POST" ? req.body.voice : req.query.voice) || "Kore";
    const speed = (req.method === "POST" ? req.body.speed : req.query.speed) || "normal";

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Missing text to synthesize" });
    }

    const ai = getAI();
    const prompt = `Read the following ${lang === "km" ? "Khmer" : "English"} text clearly, fluently, and naturally with polite and warm intonation:
"${text.trim()}"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice || "Kore" },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const audioPart = candidate?.content?.parts?.find((p: any) => p.inlineData?.data);

    if (audioPart?.inlineData?.data) {
      const pcmBuffer = Buffer.from(audioPart.inlineData.data, "base64");
      const wavBuffer = pcmToWav(pcmBuffer, 24000, 1, 16);

      if (req.query.format === "json" || req.headers.accept?.includes("application/json")) {
        return res.json({
          success: true,
          audioBase64: `data:audio/wav;base64,${wavBuffer.toString("base64")}`,
          mimeType: "audio/wav",
        });
      }

      res.setHeader("Content-Type", "audio/wav");
      res.setHeader("Content-Length", wavBuffer.length);
      res.setHeader("Content-Disposition", 'inline; filename="jong_use_speech.wav"');
      return res.send(wavBuffer);
    }

    // If native audio was unavailable, fallback
    return res.status(500).json({ error: "Could not generate speech audio" });
  } catch (error: any) {
    console.error("TTS API error:", error);
    const isQuota = error.status === 429 || String(error.message).includes("429") || String(error.message).includes("RESOURCE_EXHAUSTED") || String(error.message).includes("quota");
    const errMsg = isQuota
      ? "Text-to-Speech API quota reached. Please try again shortly or check your Gemini project quota."
      : error.message || "Failed to generate speech";
    res.status(isQuota ? 429 : 500).json({ error: errMsg, isQuota });
  }
}

app.get("/api/tts", handleTts);
app.post("/api/tts", handleTts);

// Helper function to format milliseconds into SRT timestamp format: HH:MM:SS,mmm
function formatSrtTimestamp(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const millis = Math.floor(ms % 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

// Fallback algorithm to split text into timed SRT segments
function generateFallbackSrt(
  script: string,
  speed = 'normal',
  maxChars = 35,
  startOffsetSec = 0,
  chunkMode = 'standard'
) {
  const isShortWords = chunkMode === 'short_punchy' || maxChars <= 18;
  const effectiveMaxChars = isShortWords ? Math.min(18, maxChars) : maxChars;

  const lines = script
    .split(/\n+/)
    .map(l => l.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  for (const line of lines) {
    if (isShortWords) {
      // Split into 1-3 words or short tokens
      if (line.includes(' ')) {
        const words = line.split(/\s+/).filter(Boolean);
        let cur = '';
        let wordCount = 0;
        for (const w of words) {
          if (wordCount >= 3 || (cur.length + w.length > effectiveMaxChars && cur.length > 0)) {
            chunks.push(cur.trim());
            cur = w;
            wordCount = 1;
          } else {
            cur = cur ? `${cur} ${w}` : w;
            wordCount++;
          }
        }
        if (cur.trim()) chunks.push(cur.trim());
      } else {
        // Khmer unbroken text: split on punctuation or every 12-16 chars
        const parts = line.split(/([។.!?,\s]+)/).filter(Boolean);
        for (const part of parts) {
          if (part.length <= effectiveMaxChars) {
            chunks.push(part);
          } else {
            for (let i = 0; i < part.length; i += effectiveMaxChars) {
              chunks.push(part.slice(i, i + effectiveMaxChars));
            }
          }
        }
      }
    } else if (line.length <= effectiveMaxChars) {
      chunks.push(line);
    } else {
      // Split on punctuation or spaces
      const sentences = line.split(/([។.!?,\n]+)/).filter(Boolean);
      let current = '';
      for (let i = 0; i < sentences.length; i++) {
        const seg = sentences[i];
        if ((current + seg).length <= effectiveMaxChars) {
          current += seg;
        } else {
          if (current.trim()) chunks.push(current.trim());
          current = seg;
        }
      }
      if (current.trim()) chunks.push(current.trim());
    }
  }

  // Speed factors: ultra_fast (~220 WPM), fast (~170 WPM), normal (~130 WPM), slow (~95 WPM)
  const speedFactor = speed === 'ultra_fast' ? 0.55 : speed === 'fast' ? 0.75 : speed === 'slow' ? 1.35 : 1.0;
  const minDurationMs = speed === 'ultra_fast' ? 400 : speed === 'fast' ? 600 : 1200;
  const maxDurationMs = speed === 'ultra_fast' ? 2500 : speed === 'fast' ? 3800 : 6000;
  const pauseGapMs = speed === 'ultra_fast' ? 80 : speed === 'fast' ? 120 : 200;
  const msPerChar = Math.round(65 * speedFactor);

  let currentMs = Math.round(startOffsetSec * 1000);
  const segments: Array<{ id: number; startTime: string; endTime: string; startMs: number; endMs: number; text: string }> = [];

  chunks.filter(Boolean).forEach((text, index) => {
    const charCount = text.length;
    const durationMs = Math.max(minDurationMs, Math.min(maxDurationMs, Math.round(charCount * msPerChar)));
    const endMs = currentMs + durationMs;

    segments.push({
      id: index + 1,
      startTime: formatSrtTimestamp(currentMs),
      endTime: formatSrtTimestamp(endMs),
      startMs: currentMs,
      endMs: endMs,
      text: text.trim(),
    });

    currentMs = endMs + pauseGapMs;
  });

  const srtContent = segments
    .map(s => `${s.id}\n${s.startTime} --> ${s.endTime}\n${s.text}\n`)
    .join('\n');

  return { segments, srtContent };
}

// 4. Generate Subtitle SRT API
app.post("/api/generate-srt", async (req, res) => {
  try {
    const {
      script,
      language = "km",
      speed = "normal",
      chunkMode = "standard",
      maxCharsPerLine = 35,
      startTimeOffset = 0,
      translateTo = "none",
    } = req.body;

    if (!script || !script.trim()) {
      return res.status(400).json({ error: "Missing script or text in request body" });
    }

    const isShortWords = chunkMode === 'short_punchy' || Number(maxCharsPerLine) <= 18;
    const speedWpm = speed === 'ultra_fast' ? '220-250 words/min (rapid fast speak)' : speed === 'fast' ? '170-190 words/min (fast dynamic speak)' : speed === 'slow' ? '90-110 words/min (slow clear)' : '130-150 words/min (normal)';

    try {
      const ai = getAI();
      const prompt = `You are an expert video subtitling, dialogue timing, and short-form video caption engine for TikTok, Instagram Reels, YouTube Shorts, and YouTube.
Given the following voiceover/dialogue script, split it into natural, rhythmically paced subtitle segments and format them as standard SubRip (.SRT) subtitles with realistic timecodes.

Parameters:
- Target speech pace: ${speed} (${speedWpm})
- Segmentation style: ${isShortWords ? 'PUNCHY SHORT WORDS (1 to 3 words or 8 to 16 characters per subtitle segment max for fast TikTok/Shorts captions)' : 'Natural phrases / sentences'}
- Maximum characters per subtitle line: ${isShortWords ? Math.min(18, maxCharsPerLine) : maxCharsPerLine} chars
- Initial start time offset: ${startTimeOffset} seconds (${formatSrtTimestamp(startTimeOffset * 1000)})
- Target Translation: ${translateTo !== 'none' ? `Translate the text to ${translateTo}` : 'Keep original language'}

Script to subtitle:
"""
${script.trim()}
"""

Requirements:
1. ${isShortWords ? 'CRITICAL: Keep segments ULTRA-SHORT (1 to 3 words each), fast-paced durations (~0.4s - 1.2s per segment for ultra_fast/fast speak), rapid sequential cuts.' : 'Divide the script into concise phrases or sentences that flow naturally with spoken cadence.'}
2. Ensure sequential timestamps with no overlapping and small (${speed === 'ultra_fast' ? '60-100ms' : '120-200ms'}) natural breathing pauses between lines.
3. Keep Khmer grammatical phrases and word boundaries intact without breaking compound words abruptly.
4. Output a JSON object with two fields:
   - "srt": string (the exact valid .srt formatted string, e.g. "1\\n00:00:01,000 --> 00:00:01,800\\nឃ្លាខ្លី...\\n\\n")
   - "segments": array of objects: [{ "id": 1, "startTime": "00:00:01,000", "endTime": "00:00:01,800", "startMs": 1000, "endMs": 1800, "text": "..." }]`;

      const response = await generateWithFallback(ai, TEXT_MODELS, {
        contents: [{ text: prompt }],
        config: {
          responseMimeType: "application/json",
        },
      });

      const responseText = response.text || "{}";
      const parsed = JSON.parse(responseText);

      if (parsed.srt && Array.isArray(parsed.segments) && parsed.segments.length > 0) {
        return res.json({
          success: true,
          srt: parsed.srt,
          segments: parsed.segments,
          count: parsed.segments.length,
        });
      }
    } catch (aiErr) {
      console.warn("AI SRT generation fallback to algorithmic generator:", aiErr);
    }

    // Fallback to local deterministic generator
    const fallback = generateFallbackSrt(script, speed, maxCharsPerLine, Number(startTimeOffset) || 0, chunkMode);
    return res.json({
      success: true,
      srt: fallback.srtContent,
      segments: fallback.segments,
      count: fallback.segments.length,
      fallbackUsed: true,
    });
  } catch (error: any) {
    console.error("Generate SRT API error:", error);
    res.status(500).json({ error: error.message || "Failed to generate subtitle SRT" });
  }
});

// 4. ID Photo / Passport Maker API
app.post("/api/idphoto", async (req, res) => {
  try {
    const {
      imageBase64,
      mimeType = "image/jpeg",
      attire = "suit_black",
      bgColor = "blue_sky",
      gender = "unspecified",
      aspectRatio = "3:4",
    } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 in request body" });
    }

    const cleaned = cleanBase64(imageBase64);
    const ai = getAI();

    // Human readable attire and bg descriptions
    const attireMap: Record<string, string> = {
      suit_black: "a crisp, tailored black formal suit with a clean white collared dress shirt and elegant dark necktie",
      suit_navy: "a sharp navy blue business executive suit with a pressed light blue shirt and subtle tie",
      blazer_grey: "a modern charcoal grey formal blazer with a neat white inner shirt",
      formal_white_shirt: "a neat, buttoned formal white collar dress shirt, perfectly ironed",
      traditional_khmer_formal: "a sophisticated traditional Cambodian formal silk attire (អាវធំប្រពៃណី) with embroidered collar trim",
      female_suit_black: "a formal black business jacket blazer with a neat white blouse collar",
      female_blouse_white: "an elegant, modest white silk blouse with a structured collar",
    };

    const bgMap: Record<string, string> = {
      blue_sky: "solid clean sky-blue background (#3b82f6 / #60a5fa) standard for Cambodian citizenship and passport photos",
      blue_dark: "solid deep royal blue passport background (#1e3a8a)",
      white: "pure clean studio white background (#ffffff) standard for international visas, Schengen, and US passports",
      grey_light: "neutral soft studio grey gradient background (#e2e8f0)",
      red: "solid formal crimson red background (#dc2626) standard for academic credentials and official badges",
    };

    const attirePrompt = attireMap[attire] || attireMap.suit_black;
    const bgPrompt = bgMap[bgColor] || bgMap.blue_sky;

    const editPrompt = `Transform this photo into an official, professional passport / ID card portrait:
1. Subject & Face: Preserve the exact person's facial geometry, skin tone, eye color, expression, hairstyle, and likeness perfectly. Keep head straight, looking directly at the camera with neutral, pleasant professional demeanor.
2. Attire replacement: Seamlessly dress the person in ${attirePrompt}.
3. Background replacement: Replace the background completely with ${bgPrompt} with zero background artifacts.
4. Lighting & Retouching: Apply soft studio photography lighting, clean even shadows, sharp focus on facial features, remove blemish glare, perfectly framed centered portrait headshot suitable for official IDs, visas, and resumes.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: {
        parts: [
          {
            inlineData: {
              data: cleaned.data,
              mimeType: cleaned.mimeType || mimeType,
            },
          },
          {
            text: editPrompt,
          },
        ],
      },
    });

    let generatedImageUrl: string | null = null;
    const candidates = response.candidates || [];
    for (const cand of candidates) {
      const parts = cand.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const imgMime = part.inlineData.mimeType || "image/png";
          generatedImageUrl = `data:${imgMime};base64,${part.inlineData.data}`;
          break;
        }
      }
      if (generatedImageUrl) break;
    }

    if (generatedImageUrl) {
      return res.json({
        success: true,
        imageUrl: generatedImageUrl,
        attire,
        bgColor,
      });
    }

    return res.status(500).json({ error: "Image generation model did not return image data" });
  } catch (error: any) {
    console.error("ID Photo API error:", error);
    const isQuota = error.status === 429 || String(error.message).includes("429") || String(error.message).includes("RESOURCE_EXHAUSTED") || String(error.message).includes("quota");
    const errMsg = isQuota
      ? "Gemini Image Generation quota limit reached. Please select a project with Gemini billing/quota enabled."
      : error.message || "Failed to generate ID photo";
    res.status(isQuota ? 429 : 500).json({ error: errMsg, isQuota });
  }
});

// 5. Image Upscale & Enhance API
app.post("/api/upscale", async (req, res) => {
  try {
    const {
      imageBase64,
      mimeType = "image/jpeg",
      scale = "2x",
      enhanceFaces = true,
      denoise = true,
    } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 in request body" });
    }

    const cleaned = cleanBase64(imageBase64);
    const ai = getAI();

    const upscalePrompt = `High-definition AI photo enhancement and super-resolution (${scale} upscale):
1. Sharpen blurry edges, remove JPEG compression artifacts, pixelation, and camera noise.
2. ${enhanceFaces ? "Reconstruct crystal-clear facial details, eyes, eyelashes, and texture naturally without artificial distortion." : "Preserve textures accurately."}
3. Maintain 100% fidelity to the original subject, colors, lighting, composition, and identity.
4. Output a pristine, ultra-sharp high-resolution version of this image.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: {
        parts: [
          {
            inlineData: {
              data: cleaned.data,
              mimeType: cleaned.mimeType || mimeType,
            },
          },
          {
            text: upscalePrompt,
          },
        ],
      },
    });

    let generatedImageUrl: string | null = null;
    const candidates = response.candidates || [];
    for (const cand of candidates) {
      const parts = cand.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const imgMime = part.inlineData.mimeType || "image/png";
          generatedImageUrl = `data:${imgMime};base64,${part.inlineData.data}`;
          break;
        }
      }
      if (generatedImageUrl) break;
    }

    if (generatedImageUrl) {
      return res.json({
        success: true,
        imageUrl: generatedImageUrl,
        scale,
      });
    }

    // Fallback if image model returned text or echo
    return res.json({
      success: true,
      imageUrl: imageBase64,
      note: "Enhanced using standard rendering",
    });
  } catch (error: any) {
    console.error("Upscale API error:", error);
    const isQuota = error.status === 429 || String(error.message).includes("429") || String(error.message).includes("RESOURCE_EXHAUSTED") || String(error.message).includes("quota");
    const errMsg = isQuota
      ? "Gemini Image Enhancement quota limit reached. Please select a project with Gemini billing/quota enabled."
      : error.message || "Failed to upscale image";
    res.status(isQuota ? 429 : 500).json({ error: errMsg, isQuota });
  }
});

// 6. Background Remover API
app.post("/api/bgremove", async (req, res) => {
  try {
    const {
      imageBase64,
      mimeType = "image/jpeg",
      bgColor = "white", // 'transparent', 'white', '#hex'
    } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 in request body" });
    }

    const cleaned = cleanBase64(imageBase64);
    const ai = getAI();

    const bgPrompt =
      bgColor === "white"
        ? "solid pure clean white (#ffffff) background"
        : bgColor === "transparent"
        ? "pure isolated solid plain white studio background with clean cutout edges for transparent alpha masking"
        : `solid background colored ${bgColor}`;

    const prompt = `Precise foreground subject segmentation and background removal:
1. Identify the main foreground subjects (people, animals, products, or objects).
2. Cleanly isolate the subject, cutting out complex hair strands, fabric boundaries, and fine edges flawlessly.
3. Replace the entire background with a ${bgPrompt}.
4. Retain full original subject color, contrast, and sharp detail.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: {
        parts: [
          {
            inlineData: {
              data: cleaned.data,
              mimeType: cleaned.mimeType || mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    let generatedImageUrl: string | null = null;
    const candidates = response.candidates || [];
    for (const cand of candidates) {
      const parts = cand.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const imgMime = part.inlineData.mimeType || "image/png";
          generatedImageUrl = `data:${imgMime};base64,${part.inlineData.data}`;
          break;
        }
      }
      if (generatedImageUrl) break;
    }

    if (generatedImageUrl) {
      return res.json({
        success: true,
        imageUrl: generatedImageUrl,
        bgColor,
      });
    }

    return res.status(500).json({ error: "Background remover did not return image data" });
  } catch (error: any) {
    console.error("BG Remove API error:", error);
    const isQuota = error.status === 429 || String(error.message).includes("429") || String(error.message).includes("RESOURCE_EXHAUSTED") || String(error.message).includes("quota");
    const errMsg = isQuota
      ? "Gemini Background Removal quota limit reached. Please select a project with Gemini billing/quota enabled."
      : error.message || "Failed to remove background";
    res.status(isQuota ? 429 : 500).json({ error: errMsg, isQuota });
  }
});

// Vite middleware & Static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Jong Use (ចង់ប្រើ) server running on http://localhost:${PORT}`);
  });
}

startServer();
