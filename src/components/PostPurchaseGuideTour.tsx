import React, { useState, useEffect, useCallback } from 'react';
import { ArrowDown, ArrowUp, Check, ChevronRight, Sparkles, X } from 'lucide-react';
import type { AppView } from '../types';

export interface GuideStepConfig {
  id: string;
  selectors: string[];
  title: string;
  description: string;
  ctaLabel: string;
  ensureView?: AppView;
}

interface PostPurchaseGuideTourProps {
  isOpen: boolean;
  currentView: AppView;
  onNavigateView: (view: AppView) => void;
  onClose: () => void;
}

const GUIDE_STEPS: GuideStepConfig[] = [
  {
    id: 'my-notes',
    selectors: ['[data-tour="my-notes-mobile"]', '[data-tour="my-notes-desktop"]'],
    title: 'এই যে আপনার "My Notes" বাটন!',
    description:
      'পারচেজ করার পর যখনই আপনার নোটস পড়তে বা অর্ডার স্ট্যাটাস দেখতে চাইবেন, এখানে "My Notes"-এ ক্লিক করলেই সব পেয়ে যাবেন।',
    ctaLabel: 'Got it',
  },
  {
    id: 'notes-tab',
    selectors: ['[data-tour="notes-tab"]'],
    title: 'এখানে সব Notes & PDF পাবেন',
    description:
      'অ্যাডমিন পেমেন্ট অ্যাপ্রুভ করলেই আপনার কেনা প্রতিটি বিষয়ের পাশে "Open Notes / Read PDF" বাটন চালু হয়ে যাবে।',
    ctaLabel: 'Got it',
    ensureView: 'purchased',
  },
  {
    id: 'receipts-tab',
    selectors: ['[data-tour="receipts-tab"]'],
    title: 'Payment Receipt ও Order Status',
    description:
      'এখানে ক্লিক করে যেকোনো সময় আপনার অর্ডার স্ট্যাটাস (Pending / Paid) এবং অফিশিয়াল পেমেন্ট রিসিট দেখতে বা ডাউনলোড করতে পারবেন।',
    ctaLabel: 'Got it, Finish',
    ensureView: 'purchased',
  },
];

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

function findVisibleTargetRect(selectors: string[]): { rect: TargetRect; element: HTMLElement } | null {
  for (const selector of selectors) {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      return {
        element: el,
        rect: {
          top: r.top,
          left: r.left,
          width: r.width,
          height: r.height,
          bottom: r.bottom,
          right: r.right,
        },
      };
    }
  }
  return null;
}

export const PostPurchaseGuideTour: React.FC<PostPurchaseGuideTourProps> = ({
  isOpen,
  currentView,
  onNavigateView,
  onClose,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 375,
    height: typeof window !== 'undefined' ? window.innerHeight : 667,
  });

  // Reset to step 0 whenever tour opens
  useEffect(() => {
    if (isOpen) {
      setStepIndex(0);
    }
  }, [isOpen]);

  const currentStep = GUIDE_STEPS[stepIndex];

  // Ensure the required view is open for the current guide step
  useEffect(() => {
    if (!isOpen || !currentStep) return;
    if (currentStep.ensureView && currentView !== currentStep.ensureView) {
      onNavigateView(currentStep.ensureView);
    }
  }, [isOpen, currentStep, currentView, onNavigateView]);

  const measureTarget = useCallback(() => {
    if (!isOpen || !currentStep) return;
    setViewport({
      width: window.innerWidth,
      height: window.innerHeight,
    });
    const found = findVisibleTargetRect(currentStep.selectors);
    if (found) {
      setTargetRect(found.rect);
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep]);

  useEffect(() => {
    if (!isOpen) return;
    measureTarget();
    const t1 = setTimeout(measureTarget, 80);
    const t2 = setTimeout(measureTarget, 260);
    window.addEventListener('resize', measureTarget);
    window.addEventListener('scroll', measureTarget, true);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', measureTarget);
      window.removeEventListener('scroll', measureTarget, true);
    };
  }, [isOpen, stepIndex, currentView, measureTarget]);

  if (!isOpen || !currentStep) return null;

  const isLastStep = stepIndex >= GUIDE_STEPS.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onClose();
      return;
    }
    const nextStep = GUIDE_STEPS[stepIndex + 1];
    if (nextStep?.ensureView && currentView !== nextStep.ensureView) {
      onNavigateView(nextStep.ensureView);
    }
    setStepIndex((prev) => prev + 1);
  };

  // Calculate card & arrow placement relative to spotlighted target
  const cardWidth = Math.min(320, viewport.width - 24);
  const pad = 6;
  const spotLeft = targetRect ? Math.max(4, targetRect.left - pad) : viewport.width / 2 - 40;
  const spotTop = targetRect ? Math.max(4, targetRect.top - pad) : viewport.height / 2 - 20;
  const spotWidth = targetRect ? targetRect.width + pad * 2 : 80;
  const spotHeight = targetRect ? targetRect.height + pad * 2 : 40;
  const spotCenterX = targetRect ? targetRect.left + targetRect.width / 2 : viewport.width / 2;
  const isTargetInBottomHalf = targetRect ? spotTop > viewport.height * 0.55 : false;

  const clampedCardLeft = Math.max(
    12,
    Math.min(spotCenterX - cardWidth / 2, viewport.width - cardWidth - 12)
  );

  // Arrow X position relative to viewport
  const arrowLeft = Math.max(20, Math.min(spotCenterX - 18, viewport.width - 56));

  const tooltipStyle: React.CSSProperties = targetRect
    ? isTargetInBottomHalf
      ? {
          position: 'fixed',
          left: `${clampedCardLeft}px`,
          bottom: `${Math.max(16, viewport.height - spotTop + 44)}px`,
          width: `${cardWidth}px`,
          zIndex: 10002,
        }
      : {
          position: 'fixed',
          left: `${clampedCardLeft}px`,
          top: `${Math.min(viewport.height - 210, spotTop + spotHeight + 44)}px`,
          width: `${cardWidth}px`,
          zIndex: 10002,
        }
    : {
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: `${cardWidth}px`,
        zIndex: 10002,
      };

  return (
    <div className="fixed inset-0 z-[10000]" role="dialog" aria-modal="true" aria-label="Website Guide">
      {/* Click-blocker dark overlay when target isn't measured yet */}
      {!targetRect && <div className="fixed inset-0 bg-black/80 backdrop-blur-[2px]" onClick={onClose} />}

      {/* Spotlight Cutout + Glowing Gold Ring */}
      {targetRect && (
        <>
          <div
            onClick={handleNext}
            style={{
              position: 'fixed',
              left: `${spotLeft}px`,
              top: `${spotTop}px`,
              width: `${spotWidth}px`,
              height: `${spotHeight}px`,
              borderRadius: '14px',
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.78), 0 0 24px rgba(255, 211, 78, 0.85)',
              border: '2.5px solid #FFD34E',
              zIndex: 10001,
              cursor: 'pointer',
            }}
            className="animate-pulse transition-all duration-300"
          />

          {/* Bouncing Pointer Arrow directly targeting the highlighted button */}
          <div
            style={{
              position: 'fixed',
              left: `${arrowLeft}px`,
              ...(isTargetInBottomHalf
                ? { top: `${Math.max(12, spotTop - 40)}px` }
                : { top: `${spotTop + spotHeight + 6}px` }),
              zIndex: 10003,
              pointerEvents: 'none',
            }}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-[#FFD34E] text-[#3D0009] shadow-[0_0_20px_rgba(255,211,78,0.9)] animate-bounce"
          >
            {isTargetInBottomHalf ? (
              <ArrowDown className="w-5 h-5 stroke-[3]" />
            ) : (
              <ArrowUp className="w-5 h-5 stroke-[3]" />
            )}
          </div>
        </>
      )}

      {/* Floating Guide Card (Got it / Skip) */}
      <div
        style={tooltipStyle}
        className="rounded-2xl bg-gradient-to-b from-[#4B000B] via-[#2D0007] to-[#170003] border-2 border-[#FFD34E]/80 shadow-[0_20px_60px_rgba(0,0,0,0.95)] p-3.5 text-white space-y-2.5 transition-all duration-300"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFD34E]/20 border border-[#FFD34E]/45 text-[10px] font-black text-[#FFD34E]">
            <Sparkles className="w-3 h-3" />
            <span>
              Guide {stepIndex + 1} / {GUIDE_STEPS.length}
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-white/60 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
            aria-label="Close guide"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-1">
          <h4 className="text-sm font-black text-white leading-snug">{currentStep.title}</h4>
          <p className="text-xs text-[#FFE7A3]/90 leading-relaxed">{currentStep.description}</p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-full text-xs font-bold text-white/75 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="btn-gold-primary px-4 py-1.5 rounded-full text-xs font-black inline-flex items-center gap-1 shadow-md cursor-pointer"
          >
            {isLastStep ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
            <span>{currentStep.ctaLabel}</span>
            {!isLastStep ? <ChevronRight className="w-3.5 h-3.5 stroke-[3]" /> : null}
          </button>
        </div>
      </div>
    </div>
  );
};
