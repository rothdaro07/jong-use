import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Camera, Image as ImageIcon, X, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { translations } from '../../lib/i18n';
import { Language } from '../../types';

interface FileDropzoneProps {
  onImageSelected: (base64: string, file?: File) => void;
  selectedImage?: string | null;
  onClear?: () => void;
  lang?: Language;
  title?: string;
  subtitle?: string;
  acceptCamera?: boolean;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  onImageSelected,
  selectedImage,
  onClear,
  lang = 'km',
  title,
  subtitle,
  acceptCamera = true,
}) => {
  const t = translations[lang];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Clean up camera stream
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (PNG, JPG, WebP)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onImageSelected(reader.result, file);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Camera handling
  const startCamera = async () => {
    setCameraError(null);
    setShowCamera(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(err.message || 'Could not access camera device');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      onImageSelected(dataUrl);
      stopCamera();
    }
  };

  if (selectedImage) {
    return (
      <div className="relative rounded-2xl overflow-hidden border border-stone-200 bg-stone-900 group">
        <div className="relative max-h-96 flex items-center justify-center p-2 bg-stone-950/90">
          <img
            src={selectedImage}
            alt="Selected upload"
            className="max-h-80 w-auto object-contain rounded-lg"
          />
        </div>
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {onClear && (
            <button
              id="clear-selected-image"
              type="button"
              onClick={onClear}
              className="p-1.5 rounded-full bg-stone-900/80 hover:bg-red-600 text-white backdrop-blur-md transition-all shadow-md"
              title={t.reset}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="p-3 bg-white border-t border-stone-200 flex items-center justify-between">
          <span className="text-xs font-medium text-stone-500 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
            {t.upload}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            {t.upload}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>
    );
  }

  if (showCamera) {
    return (
      <div className="relative rounded-2xl overflow-hidden border border-stone-300 bg-stone-950 p-4 flex flex-col items-center">
        {cameraError ? (
          <div className="py-8 text-center px-4">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-200 mb-4">{cameraError}</p>
            <Button size="sm" variant="outline" onClick={stopCamera}>
              {t.reset}
            </Button>
          </div>
        ) : (
          <>
            <div className="relative w-full max-w-md aspect-4/3 rounded-xl overflow-hidden bg-black flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover mirror-mode"
                onLoadedMetadata={() => videoRef.current?.play()}
              />
              <div className="absolute inset-0 border-2 border-white/20 pointer-events-none rounded-xl" />
            </div>
            <div className="flex items-center gap-3 mt-4">
              <Button
                variant="secondary"
                size="md"
                onClick={capturePhoto}
                icon={<Camera className="w-4 h-4" />}
              >
                {t.camera}
              </Button>
              <Button variant="outline" size="md" onClick={stopCamera}>
                {t.reset}
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center ${
        isDragging
          ? 'border-indigo-500 bg-indigo-50/70 scale-[1.01]'
          : 'border-stone-300 hover:border-indigo-400 hover:bg-stone-50/80 bg-white/70'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 shadow-xs">
        <UploadCloud className="w-7 h-7" />
      </div>
      <h4 className="text-sm font-bold text-stone-800 mb-1">
        {title || t.dragDrop}
      </h4>
      <p className="text-xs text-stone-500 max-w-xs mb-4">
        {subtitle || t.maxSizeNotice}
      </p>

      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          icon={<UploadCloud className="w-3.5 h-3.5" />}
        >
          {t.upload}
        </Button>
        {acceptCamera && (
          <Button
            size="sm"
            variant="ghost"
            onClick={startCamera}
            icon={<Camera className="w-3.5 h-3.5" />}
          >
            {t.camera}
          </Button>
        )}
      </div>
    </div>
  );
};
