'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Photo {
  url: string;
  alt?: string;
}

interface PhotoCarouselProps {
  photos: Photo[];
  dogName: string;
  className?: string;
}

export default function PhotoCarousel({ photos, dogName, className = '' }: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set([0]));
  const [errorImages, setErrorImages] = useState<Set<number>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter out error images
  const validPhotos = photos?.filter((_, index) => !errorImages.has(index)) || [];
  const validIndices = photos?.map((_, index) => index).filter(index => !errorImages.has(index)) || [];
  const currentValidIndex = validIndices.indexOf(currentIndex);
  const actualCurrentIndex = currentValidIndex >= 0 ? currentValidIndex : 0;


  // Auto-hide controls after 1.5s
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    hideControlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 1500);
  }, []);

  // Preload next image
  const preloadImage = useCallback((index: number) => {
    if (index >= 0 && index < validPhotos.length && !loadedImages.has(index)) {
      const img = new Image();
      img.onload = () => {
        setLoadedImages(prev => new Set([...prev, index]));
      };
      img.src = validPhotos[index].url;
    }
  }, [validPhotos, loadedImages]);

  // Navigate to next/previous photo
  const goToNext = useCallback(() => {
    if (validPhotos.length <= 1) return;
    const nextIndex = (actualCurrentIndex + 1) % validPhotos.length;
    const originalIndex = validIndices[nextIndex];
    setCurrentIndex(originalIndex);
    showControlsTemporarily();
    preloadImage((nextIndex + 1) % validPhotos.length);
  }, [validPhotos.length, actualCurrentIndex, validIndices, showControlsTemporarily, preloadImage]);

  const goToPrevious = useCallback(() => {
    if (validPhotos.length <= 1) return;
    const prevIndex = actualCurrentIndex === 0 ? validPhotos.length - 1 : actualCurrentIndex - 1;
    const originalIndex = validIndices[prevIndex];
    setCurrentIndex(originalIndex);
    showControlsTemporarily();
    preloadImage(prevIndex === 0 ? validPhotos.length - 1 : prevIndex - 1);
  }, [validPhotos.length, actualCurrentIndex, validIndices, showControlsTemporarily, preloadImage]);

  const goToSlide = useCallback((index: number) => {
    if (index >= 0 && index < validPhotos.length) {
      const originalIndex = validIndices[index];
      setCurrentIndex(originalIndex);
      showControlsTemporarily();
    }
  }, [validPhotos.length, validIndices, showControlsTemporarily]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goToPrevious();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goToNext();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
  }, [goToPrevious, goToNext]);

  // Handle touch/swipe events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    setDragStart(e.touches[0].clientX);
    setDragOffset(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    setDragOffset(currentX - dragStart);
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const threshold = 50;
    if (Math.abs(dragOffset) > threshold) {
      if (dragOffset > 0) {
        goToPrevious();
      } else {
        goToNext();
      }
    }
    setDragOffset(0);
  }, [isDragging, dragOffset, goToPrevious, goToNext]);

  // Handle mouse events for desktop
  const handleMouseEnter = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    hideControlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 1500);
  }, []);

  // Handle image load error
  const handleImageError = useCallback((index: number) => {
    setErrorImages(prev => new Set([...prev, index]));
  }, []);

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, []);

  // Preload adjacent images
  useEffect(() => {
    preloadImage(actualCurrentIndex + 1);
    preloadImage(actualCurrentIndex === 0 ? validPhotos.length - 1 : actualCurrentIndex - 1);
  }, [actualCurrentIndex, validPhotos.length, preloadImage]);

  // Don't render if no photos or only one photo
  if (!photos || photos.length <= 1) {
    return (
      <div className={`relative aspect-square overflow-hidden rounded-lg ${className}`}>
        <img
          src={photos?.[0]?.url || '/placeholder-dog.jpg'}
          alt={photos?.[0]?.alt || `${dogName} photo`}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      </div>
    );
  }

  // If all images errored out, show placeholder
  if (validPhotos.length === 0) {
    return (
      <div className={`relative aspect-square overflow-hidden rounded-lg bg-gray-200 flex items-center justify-center ${className}`}>
        <span className="text-gray-500 text-sm">No photos available</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative aspect-square overflow-hidden rounded-lg group ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={(e) => e.stopPropagation()} // Prevent click from bubbling to parent
      role="region"
      aria-roledescription="carousel"
      aria-label={`${dogName} photos`}
    >
      {/* Main Image */}
      <div
        className="relative w-full h-full"
        style={{
          transform: isDragging ? `translateX(${dragOffset * 0.1}px)` : 'translateX(0)',
          transition: isDragging ? 'none' : 'transform 0.3s ease-in-out'
        }}
      >
        <img
          src={validPhotos[actualCurrentIndex]?.url}
          alt={validPhotos[actualCurrentIndex]?.alt || `${dogName} photo ${actualCurrentIndex + 1}`}
          className="w-full h-full object-cover select-none"
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => handleImageError(validIndices[actualCurrentIndex])}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          aria-label={`${dogName} photo ${actualCurrentIndex + 1} of ${validPhotos.length}`}
        />
      </div>

      {/* Navigation Arrows */}
      {validPhotos.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className={`absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
              showControls ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            aria-label="Previous photo"
            type="button"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          
          <button
            onClick={goToNext}
            className={`absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
              showControls ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            aria-label="Next photo"
            type="button"
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>
        </>
      )}

      {/* Pagination Dots */}
      {validPhotos.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-2">
          {validPhotos.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === actualCurrentIndex
                  ? 'bg-white scale-125'
                  : 'bg-white/60 hover:bg-white/80'
              }`}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={index === actualCurrentIndex}
              type="button"
            />
          ))}
        </div>
      )}

      {/* Photo Count Badge */}
      {validPhotos.length > 1 && (
        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
          {validPhotos.length} photos
        </div>
      )}

      {/* Screen Reader Announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Slide {actualCurrentIndex + 1} of {validPhotos.length}
      </div>
    </div>
  );
}
