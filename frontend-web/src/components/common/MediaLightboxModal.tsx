import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  Star,
} from 'lucide-react';
import SafeImage from './SafeImage';

export interface LightboxMediaItem {
  id: string;
  url: string;
  title?: string;
  caption?: string;
  isThumbnail?: boolean;
  sizeBytes?: number;
  uploadedAt?: string;
}

interface MediaLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaItems: LightboxMediaItem[];
  initialIndex?: number;
}

export const MediaLightboxModal: React.FC<MediaLightboxModalProps> = ({
  isOpen,
  onClose,
  mediaItems,
  initialIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Sync index when initialIndex changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, mediaItems.length - 1)));
      setZoomLevel(1);
    }
  }, [isOpen, initialIndex, mediaItems.length]);

  const handleNext = useCallback(() => {
    if (mediaItems.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % mediaItems.length);
    setZoomLevel(1);
  }, [mediaItems.length]);

  const handlePrev = useCallback(() => {
    if (mediaItems.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
    setZoomLevel(1);
  }, [mediaItems.length]);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  // Keyboard navigation & accessibility
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleResetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNext, handlePrev, onClose]);

  if (!isOpen || mediaItems.length === 0) return null;

  const currentItem = mediaItems[currentIndex] || mediaItems[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Media Preview Lightbox"
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/92 backdrop-blur-md transition-opacity duration-200 select-none"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 text-white z-20">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
            {currentIndex + 1} / {mediaItems.length}
          </span>
          <div className="truncate">
            <h4 className="text-xs sm:text-sm font-bold truncate text-slate-100 flex items-center gap-2">
              {currentItem.title || `Media Asset ${currentIndex + 1}`}
              {currentItem.isThumbnail && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-600 text-white">
                  <Star className="h-2.5 w-2.5 fill-white" />
                  Cover
                </span>
              )}
            </h4>
            {currentItem.caption && (
              <p className="text-[11px] text-slate-400 truncate">{currentItem.caption}</p>
            )}
          </div>
        </div>

        {/* Top Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Zoom controls */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-800/80 rounded-xl px-2 py-1 border border-slate-700">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.5}
              title="Zoom out (-)"
              className="p-1 hover:text-blue-400 disabled:opacity-30 transition"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <span className="text-[11px] font-bold text-slate-300 px-1 w-12 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 3}
              title="Zoom in (+)"
              className="p-1 hover:text-blue-400 disabled:opacity-30 transition"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            {zoomLevel !== 1 && (
              <button
                type="button"
                onClick={handleResetZoom}
                title="Reset zoom (0)"
                className="p-1 hover:text-blue-400 text-slate-400 transition ml-1"
                aria-label="Reset zoom"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Open full-res in new tab */}
          <a
            href={currentItem.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open original high resolution in new window"
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
            aria-label="Open original image"
          >
            <ExternalLink className="h-4 w-4" />
          </a>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition"
            aria-label="Close preview (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Preview Area */}
      <div className="relative flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden">
        {/* Navigation Arrows */}
        {mediaItems.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700/60 shadow-xl transition hover:scale-105 z-20"
              aria-label="Previous photo (Left arrow)"
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700/60 shadow-xl transition hover:scale-105 z-20"
              aria-label="Next photo (Right arrow)"
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </>
        )}

        {/* Display Image with Smooth Transition and Zoom */}
        <div
          className="relative max-h-[75vh] max-w-[90vw] flex items-center justify-center transition-transform duration-200"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <SafeImage
            src={currentItem.url}
            alt={currentItem.title || 'Media preview'}
            className="max-h-[75vh] max-w-[90vw] w-auto h-auto object-contain rounded-xl shadow-2xl"
          />
        </div>
      </div>

      {/* Bottom Thumbnail Strip */}
      {mediaItems.length > 1 && (
        <div className="px-4 py-3 bg-slate-950/80 border-t border-slate-800/80 overflow-x-auto flex items-center justify-center gap-2 z-20">
          {mediaItems.map((item, idx) => (
            <button
              key={item.id || idx}
              type="button"
              onClick={() => {
                setCurrentIndex(idx);
                setZoomLevel(1);
              }}
              className={`h-12 w-16 sm:h-14 sm:w-20 rounded-lg overflow-hidden shrink-0 border-2 transition relative ${
                idx === currentIndex
                  ? 'border-blue-500 scale-105 shadow-md shadow-blue-500/20'
                  : 'border-slate-700 opacity-60 hover:opacity-100 hover:border-slate-500'
              }`}
            >
              <SafeImage src={item.url} alt={item.title || ''} className="w-full h-full object-cover" />
              {item.isThumbnail && (
                <div className="absolute bottom-0.5 right-0.5 bg-blue-600 rounded-xs p-0.5">
                  <Star className="h-2 w-2 text-white fill-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaLightboxModal;
