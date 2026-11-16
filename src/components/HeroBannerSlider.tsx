import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import type { BannerSlide } from '../types';

const DEFAULT_SLIDES: BannerSlide[] = [
  {
    id: 'banner-welcome',
    title: 'Welcome to BCA STUDY POINT - Your Complete Exam Preparation Partner',
    imageUrl: '/assets/aistudio/Welcome_to_BCA_Study_Point_005ca426.png',
    alt: 'Welcome to BCA STUDY POINT - Smart Study Materials for BCA Students: Notes, Question Bank, PYQ, Video Explanation, Practice Sets',
    order: 1,
    active: true,
  },
  {
    id: 'banner-launch-offer',
    title: 'Special Launch Offer - BCA 3rd Semester Complete Study Package at ₹99 Only',
    imageUrl: '/assets/aistudio/BCA_3rd_Semester_Launch_Offer_b41d8881.png',
    alt: 'Special Launch Offer - BCA 3rd Semester Complete Study Package at ₹99 Only (Regular ₹199) - Limited Time Offer',
    order: 2,
    active: true,
  },
  {
    id: 'banner-benefits-policies',
    title: 'Our Benefits & Policies - What You Get & How We Work',
    imageUrl: '/assets/aistudio/BCA_Study_Point_Benefits___Policies_6c4db866.png',
    alt: 'Our Benefits & Policies - Key Benefits and Policy Guidelines for BCA Students',
    order: 3,
    active: true,
  },
];

interface HeroBannerSliderProps {
  onExploreClick: () => void;
  banners?: BannerSlide[];
}

export const HeroBannerSlider: React.FC<HeroBannerSliderProps> = ({ onExploreClick, banners }) => {
  const activeSlides = React.useMemo(() => {
    if (banners && banners.length > 0) {
      const filtered = banners
        .filter((b) => b.active !== false && b.imageUrl)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      if (filtered.length > 0) return filtered;
    }
    return DEFAULT_SLIDES;
  }, [banners]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    if (currentIdx >= activeSlides.length) {
      setCurrentIdx(0);
    }
  }, [activeSlides.length, currentIdx]);

  // Auto-slide every 4.5 seconds
  useEffect(() => {
    if (isPaused || activeSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % activeSlides.length);
    }, 4500);

    return () => clearInterval(interval);
  }, [isPaused, activeSlides.length]);

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIdx((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIdx((prev) => (prev + 1) % activeSlides.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const deltaX = touchStartX.current - touchEndX;
    const deltaY = touchStartY.current - touchEndY;

    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleSlideAction = (slide: BannerSlide, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const link = (slide.buttonLink || '').trim();
    if (link.startsWith('#')) {
      const target = document.getElementById(link.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    } else if (link.startsWith('http://') || link.startsWith('https://')) {
      window.location.href = link;
      return;
    }
    onExploreClick();
  };

  return (
    <div
      className="w-full max-w-5xl mx-auto my-1.5 sm:my-2.5 relative select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div
        onClick={onExploreClick}
        className="relative w-full aspect-[3.2/1] min-h-[120px] sm:min-h-[175px] max-h-[310px] rounded-2xl sm:rounded-3xl overflow-hidden border border-[#FFE7A3]/30 shadow-[0_10px_30px_rgba(0,0,0,0.65)] bg-black/70 cursor-pointer group"
      >
        <div className="absolute inset-x-6 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FFE7A3]/60 to-transparent pointer-events-none z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/15 pointer-events-none z-10" />

        {activeSlides.map((slide, idx) => {
          const hasTextOverlay = Boolean(
            slide.heading?.trim() || slide.subtitle?.trim() || slide.description?.trim() || slide.buttonText?.trim()
          );

          return (
            <div
              key={slide.id}
              onClick={(e) => handleSlideAction(slide, e)}
              className={`absolute inset-0 w-full h-full transition-opacity duration-500 ease-in-out ${
                idx === currentIdx ? 'opacity-100 z-0' : 'opacity-0 -z-10 pointer-events-none'
              }`}
            >
              <img
                src={slide.imageUrl}
                alt={slide.alt || slide.title}
                className="w-full h-full object-cover object-center"
                loading={idx === 0 ? 'eager' : 'lazy'}
              />

              {hasTextOverlay && (
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent flex items-end sm:items-center p-4 sm:p-8 z-10">
                  <div className="max-w-lg space-y-1.5 text-left">
                    {slide.subtitle && (
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#FFD34E] text-[#3D0009]">
                        {slide.subtitle}
                      </span>
                    )}
                    {slide.heading && (
                      <h2 className="text-sm sm:text-2xl font-black text-white leading-tight drop-shadow">
                        {slide.heading}
                      </h2>
                    )}
                    {slide.description && (
                      <p className="hidden sm:block text-xs text-white/85 line-clamp-2">
                        {slide.description}
                      </p>
                    )}
                    {slide.buttonText && (
                      <button
                        type="button"
                        onClick={(e) => handleSlideAction(slide, e)}
                        className="btn-gold-primary inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-black mt-1 cursor-pointer"
                      >
                        <span>{slide.buttonText}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {activeSlides.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous Slide"
              className="absolute left-2 sm:left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-black/60 hover:bg-black/85 border border-white/25 flex items-center justify-center text-white/90 hover:text-[#FFD34E] transition-all cursor-pointer z-20 backdrop-blur-xs shadow-md"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              type="button"
              onClick={handleNext}
              aria-label="Next Slide"
              className="absolute right-2 sm:right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-black/60 hover:bg-black/85 border border-white/25 flex items-center justify-center text-white/90 hover:text-[#FFD34E] transition-all cursor-pointer z-20 backdrop-blur-xs shadow-md"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </>
        )}
      </div>

      {activeSlides.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {activeSlides.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setCurrentIdx(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                currentIdx === idx
                  ? 'w-6 h-1.5 bg-[#FFD34E] shadow-[0_0_8px_rgba(255,211,78,0.7)]'
                  : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
