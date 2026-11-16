import React, { useMemo } from 'react';
import {
  Check,
  CheckCircle2,
  Sparkles,
  Layers,
  BookOpen,
  ArrowRight,
  Lock,
  X,
  TrendingDown,
  Info,
} from 'lucide-react';
import type { Product, EffectivePackagePricing, SiteSettings } from '../types';
import {
  CORE_SUBJECT_IDS,
  LANGUAGE_SUBJECT_IDS,
  SPECIALIZATION_SUBJECT_IDS,
  calculatePackagePrice,
  PACKAGE_PRICING,
} from '../constants/packageConfig';

interface PackagePricingSectionProps {
  products: Product[];
  selectedProductIds: string[];
  purchasedProductIds?: string[];
  livePricing?: EffectivePackagePricing | null;
  siteSettings?: SiteSettings | null;
  onSelectLanguage: (langId: string | null) => void;
  onSelectSpecialization: (specId: string | null) => void;
  onProceedToCheckout: () => void;
  onOpenViewer?: (productId: string) => void;
}

export const PackagePricingSection: React.FC<PackagePricingSectionProps> = ({
  products,
  selectedProductIds,
  purchasedProductIds = [],
  livePricing,
  siteSettings,
  onSelectLanguage,
  onSelectSpecialization,
  onProceedToCheckout,
  onOpenViewer,
}) => {
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.filter((p) => p.published !== false).forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const coreIds = useMemo(
    () => (livePricing?.compulsoryProductIds?.length ? livePricing.compulsoryProductIds : [...CORE_SUBJECT_IDS]),
    [livePricing]
  );
  const langIds = useMemo(
    () => (livePricing?.languageProductIds?.length ? livePricing.languageProductIds : [...LANGUAGE_SUBJECT_IDS]),
    [livePricing]
  );
  const specIds = useMemo(
    () => (livePricing?.specializationProductIds?.length ? livePricing.specializationProductIds : [...SPECIALIZATION_SUBJECT_IDS]),
    [livePricing]
  );

  const coreProducts = useMemo(() => {
    return coreIds.map((id) => productMap.get(id)).filter(Boolean) as Product[];
  }, [coreIds, productMap]);

  const languageProducts = useMemo(() => {
    return langIds.map((id) => productMap.get(id)).filter(Boolean) as Product[];
  }, [langIds, productMap]);

  const specializationProducts = useMemo(() => {
    return specIds.map((id) => productMap.get(id)).filter(Boolean) as Product[];
  }, [specIds, productMap]);

  const pricing = useMemo(() => {
    return calculatePackagePrice(selectedProductIds, livePricing);
  }, [selectedProductIds, livePricing]);

  const coreTier = livePricing?.core || PACKAGE_PRICING.core;
  const langTier = livePricing?.language || PACKAGE_PRICING.language;
  const specTier = livePricing?.specialization || PACKAGE_PRICING.specialization;
  const isOfferActive = livePricing ? livePricing.offerActive : true;
  const activeCorePrice = isOfferActive ? coreTier.launchPrice : coreTier.regularPrice;
  const activeLangPrice = isOfferActive ? langTier.launchPrice : langTier.regularPrice;
  const activeSpecPrice = isOfferActive ? specTier.launchPrice : specTier.regularPrice;

  const activeLanguageProduct = pricing.selectedLanguageId
    ? productMap.get(pricing.selectedLanguageId)
    : null;

  const activeSpecializationProduct = pricing.selectedSpecializationId
    ? productMap.get(pricing.selectedSpecializationId)
    : null;

  return (
    <section
      id="packages-pricing"
      className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 my-3 sm:my-6 relative select-none pb-20 lg:pb-6"
      aria-label="Package Selection & Pricing Section"
    >
      <div id="subjects" className="absolute -top-16 left-0 pointer-events-none" />

      {/* 2026 Liquid Glass Master Container */}
      <div className="liquid-glass-master rounded-2xl sm:rounded-3xl p-3 sm:p-5 border border-[#FFE7A3]/30 shadow-2xl relative overflow-hidden text-white">
        {/* Specular Rim Glow */}
        <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FFD34E]/60 to-transparent pointer-events-none" />

        {/* Compact Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 mb-3 sm:mb-4 border-b border-[#FFE7A3]/20">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FFD34E]/15 border border-[#FFD34E]/40 text-[#FFE7A3] text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3 text-[#FFD34E] animate-pulse" />
              <span>{siteSettings?.homepage?.sectionBadge || 'BCA 3rd Semester · Solved Question Banks'}</span>
            </div>
            <h2 className="text-base sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>{siteSettings?.homepage?.sectionTitle || 'Package Selection & Pricing'}</span>
              <span className="hidden sm:inline-block text-[#FFD34E] text-[11px] font-bold px-2 py-0.5 rounded-full bg-black/40 border border-[#FFD34E]/30">
                {siteSettings?.homepage?.editionLabel || '2024-2025 Edition'}
              </span>
            </h2>
          </div>

          <div className="shrink-0 flex items-center gap-2 px-3 py-1 rounded-xl bg-gradient-to-r from-[#970014] to-[#65000D] border border-[#FFD34E]/40 shadow-sm">
            <span className="text-sm">🔥</span>
            <div>
              <span className="block text-[8px] uppercase font-black text-[#FFE7A3] tracking-wide">
                {livePricing?.offerTitle || 'Special Launch Offer'}
              </span>
              <span className="text-xs sm:text-sm font-black text-[#FFD34E] leading-tight">
                {livePricing?.offerBadgeText || 'Up to 34% OFF'}
              </span>
            </div>
          </div>
        </div>

        {/* Responsive Grid: Packages (8 cols) & Order Summary (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 lg:gap-5 items-start">
          {/* Left Column: Compact Compulsory + Optional Add-ons */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-3 sm:space-y-4">

            {/* ========================================================
                1. COMPULSORY CORE PACKAGE (Compact 2026 Layout)
                ======================================================== */}
            <div className="liquid-glass-card rounded-xl sm:rounded-2xl p-3 sm:p-3.5 border border-[#FFE7A3]/30 shadow-md relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 mb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-black bg-[#FFD34E] text-[#3D0009] shadow-xs">
                    <Lock className="w-2.5 h-2.5 stroke-[2.5]" />
                    COMPULSORY
                  </span>
                  <h3 className="text-xs sm:text-sm font-black text-white">
                    Main Core Package ({coreProducts.length} Subjects)
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  {coreTier.regularPrice > activeCorePrice && (
                    <span className="text-[11px] text-[#FFE7A3]/60 line-through font-medium">
                      ₹{coreTier.regularPrice}
                    </span>
                  )}
                  <span className="text-sm sm:text-base font-black text-[#FFD34E] tabular-nums">
                    ₹{activeCorePrice}
                  </span>
                  {coreTier.regularPrice > activeCorePrice && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#FFD34E]/20 text-[#FFE7A3] border border-[#FFD34E]/30">
                      Save ₹{coreTier.regularPrice - activeCorePrice}
                    </span>
                  )}
                </div>
              </div>

              {/* Explicit Compulsory Notice */}
              <div className="mb-2.5 px-2.5 py-1.5 rounded-lg bg-black/40 border border-[#FFD34E]/30 flex items-center gap-2 text-[11px] text-amber-200">
                <Info className="w-3.5 h-3.5 text-[#FFD34E] shrink-0" />
                <span className="font-semibold text-white/95">
                  <strong className="text-[#FFD34E]">Compulsory:</strong>{' '}
                  {siteSettings?.homepage?.compulsoryNotice || 'Students must select all 4 compulsory subjects.'}
                </span>
              </div>

              {/* Compact 4-Subject Grid (Clean, reduced vertical height) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {coreProducts.map((prod) => {
                  const isPurchased = purchasedProductIds.includes(prod.id);
                  return (
                    <div
                      key={prod.id}
                      className="bg-black/40 rounded-xl p-2 border border-white/10 hover:border-[#FFE7A3]/40 flex flex-col justify-between text-left transition-all group"
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-9 h-12 rounded overflow-hidden bg-black/60 shrink-0 border border-white/15">
                          {prod.coverImageUrl || prod.imageUrl ? (
                            <img
                              src={prod.coverImageUrl || prod.imageUrl}
                              alt={prod.subjectName}
                              className="w-full h-full object-contain p-0.5"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-[#65000D] text-[#FFE7A3] font-bold text-[8px] p-0.5 text-center">
                              {prod.subjectCode}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] font-mono font-bold text-[#FFD34E] block">
                            {prod.subjectCode}
                          </span>
                          <h4 className="font-bold text-[11px] text-white line-clamp-1 group-hover:text-[#FFE7A3]">
                            {prod.subjectName}
                          </h4>
                        </div>
                      </div>

                      <div className="pt-1 border-t border-white/10 flex items-center justify-between text-[10px]">
                        <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Included</span>
                        </span>
                        {isPurchased && onOpenViewer && (
                          <button
                            type="button"
                            onClick={() => onOpenViewer(prod.id)}
                            className="text-[9px] font-bold text-emerald-300 underline cursor-pointer"
                          >
                            Read
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Explanatory Bridge Banner for Optional Sections */}
            <div className="px-3 py-2 rounded-xl bg-gradient-to-r from-black/50 via-[#65000D]/30 to-black/50 border border-white/15 flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#FFD34E]/20 text-[#FFE7A3] border border-[#FFD34E]/30 uppercase shrink-0">
                OPTIONAL
              </span>
              <p className="text-[11px] text-white/90">
                <strong className="text-[#FFD34E]">Optional:</strong>{' '}
                {siteSettings?.homepage?.optionalNotice || '2 additional optional sections are available. Students can choose them according to their preference.'}
              </p>
            </div>

            {/* ========================================================
                2. OPTIONAL LANGUAGE SECTION (Bengali / Sanskrit)
                ======================================================== */}
            <div className="liquid-glass-card rounded-xl sm:rounded-2xl p-3 sm:p-3.5 border border-white/15 shadow-md">
              <div className="flex items-center justify-between gap-1.5 pb-2 mb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFD34E]/20 text-[#FFE7A3] border border-[#FFD34E]/40">
                    OPTIONAL 1
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-white">
                    Language Add-on (Select Max 1)
                  </h3>
                </div>

                <div className="flex items-center gap-1">
                  {langTier.regularPrice > activeLangPrice && (
                    <span className="text-[11px] text-[#FFE7A3]/60 line-through">
                      +₹{langTier.regularPrice}
                    </span>
                  )}
                  <span className="text-xs sm:text-sm font-black text-[#FFD34E]">
                    +₹{activeLangPrice}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between mb-2 text-[11px]">
                <p className="text-white/70">
                  Select your language paper, or skip:
                </p>
                {pricing.selectedLanguageId && (
                  <button
                    type="button"
                    onClick={() => onSelectLanguage(null)}
                    className="text-[10px] font-bold text-rose-300 hover:text-rose-200 flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/60 border border-rose-500/30 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Skip Language</span>
                  </button>
                )}
              </div>

              {/* 2 Language Cards (Side-by-side) */}
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                {languageProducts.map((prod) => {
                  const isSelected = pricing.selectedLanguageId === prod.id;
                  return (
                    <div
                      key={prod.id}
                      onClick={() => onSelectLanguage(isSelected ? null : prod.id)}
                      className={`rounded-xl p-2 sm:p-2.5 border transition-all cursor-pointer flex items-center gap-2 sm:gap-2.5 text-left select-none relative ${
                        isSelected
                          ? 'liquid-glass-card-selected border-[#FFD34E] ring-2 ring-[#FFD34E]/60 shadow-[0_0_15px_rgba(255,211,78,0.25)]'
                          : 'bg-black/35 border-white/15 hover:border-[#FFE7A3]/40 hover:bg-black/45'
                      }`}
                    >
                      <div className="w-9 sm:w-10 aspect-[3/4] rounded overflow-hidden shrink-0 bg-black/60 border border-white/15 relative">
                        {prod.coverImageUrl || prod.imageUrl ? (
                          <img
                            src={prod.coverImageUrl || prod.imageUrl}
                            alt={prod.subjectName}
                            className="w-full h-full object-contain p-0.5"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#65000D] text-[#FFE7A3] font-bold text-[8px] p-0.5 text-center">
                            {prod.subjectCode}
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 bg-[#FFD34E]/30 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 text-[#FFD34E] stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-mono font-bold text-[#FFE7A3]">
                            {prod.subjectCode}
                          </span>
                          <span className="text-[10px] font-black text-[#FFD34E]">
                            +₹{activeLangPrice}
                          </span>
                        </div>
                        <h4 className="font-bold text-[11px] text-white truncate mt-0.5">
                          {prod.subjectName}
                        </h4>
                        <span className="text-[9px] text-[#FFE7A3]/70 block truncate">
                          {isSelected ? '✓ Selected' : 'Tap to Add'}
                        </span>
                      </div>

                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-[#FFD34E] border-[#FFD34E] text-[#3D0009]'
                            : 'border-white/30 bg-black/40'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ========================================================
                3. OPTIONAL SPECIALIZATION SECTION (5 Options)
                ======================================================== */}
            <div className="liquid-glass-card rounded-xl sm:rounded-2xl p-3 sm:p-3.5 border border-white/15 shadow-md">
              <div className="flex items-center justify-between gap-1.5 pb-2 mb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFD34E]/20 text-[#FFE7A3] border border-[#FFD34E]/40">
                    OPTIONAL 2
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-white">
                    Specialization Add-on (Select Max 1)
                  </h3>
                </div>

                <div className="flex items-center gap-1">
                  {specTier.regularPrice > activeSpecPrice && (
                    <span className="text-[11px] text-[#FFE7A3]/60 line-through">
                      +₹{specTier.regularPrice}
                    </span>
                  )}
                  <span className="text-xs sm:text-sm font-black text-[#FFD34E]">
                    +₹{activeSpecPrice}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between mb-2 text-[11px]">
                <p className="text-white/70">
                  Select 1 elective specialization paper, or skip:
                </p>
                {pricing.selectedSpecializationId && (
                  <button
                    type="button"
                    onClick={() => onSelectSpecialization(null)}
                    className="text-[10px] font-bold text-rose-300 hover:text-rose-200 flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/60 border border-rose-500/30 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Skip Specialization</span>
                  </button>
                )}
              </div>

              {/* Compact 2/3/5 Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {specializationProducts.map((prod) => {
                  const isSelected = pricing.selectedSpecializationId === prod.id;
                  return (
                    <div
                      key={prod.id}
                      onClick={() => onSelectSpecialization(isSelected ? null : prod.id)}
                      className={`rounded-xl p-2 border transition-all cursor-pointer flex flex-col justify-between text-left select-none relative group ${
                        isSelected
                          ? 'liquid-glass-card-selected border-[#FFD34E] ring-2 ring-[#FFD34E]/60 shadow-[0_0_12px_rgba(255,211,78,0.25)]'
                          : 'bg-black/35 border-white/15 hover:border-[#FFE7A3]/40 hover:bg-black/45'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[8px] font-mono font-bold px-1 py-0.2 rounded bg-black/60 text-[#FFE7A3] border border-white/10">
                          {prod.subjectCode}
                        </span>
                        <div
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-[#FFD34E] border-[#FFD34E] text-[#3D0009]'
                              : 'border-white/30 bg-black/60'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </div>

                      <div className="aspect-[3/4] max-h-20 sm:max-h-24 w-full rounded overflow-hidden bg-black/60 mb-1 border border-white/15 relative">
                        {prod.coverImageUrl || prod.imageUrl ? (
                          <img
                            src={prod.coverImageUrl || prod.imageUrl}
                            alt={prod.subjectName}
                            className="w-full h-full object-contain p-0.5 group-hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#65000D] text-[#FFE7A3] font-bold text-[8px] p-0.5 text-center">
                            {prod.subjectCode}
                          </div>
                        )}
                      </div>

                      <div>
                        <h4 className="font-bold text-[10px] sm:text-[11px] text-white truncate group-hover:text-[#FFE7A3]">
                          {prod.subjectName}
                        </h4>
                        <div className="flex items-center justify-between text-[9px] mt-0.5">
                          <span className="font-black text-[#FFD34E]">
                            +₹{activeSpecPrice}
                          </span>
                          {specTier.regularPrice > activeSpecPrice && (
                            <span className="text-white/40 line-through">
                              ₹{specTier.regularPrice}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Live Order Summary (Sticky on Desktop) */}
          <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-20">
            <div className="liquid-glass-card rounded-2xl p-3.5 sm:p-4.5 border border-[#FFE7A3]/40 shadow-xl text-white">
              {/* Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-white/15">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-b from-[#e6001a] to-[#970014] flex items-center justify-center text-white shadow-xs border border-white/20">
                    <Layers className="w-3.5 h-3.5 text-[#FFE7A3]" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-white leading-tight">
                      Order Summary
                    </h3>
                    <span className="text-[10px] text-[#FFE7A3]/80">
                      Real-time Package Total
                    </span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-[#FFD34E]/20 text-[#FFE7A3] border border-[#FFD34E]/40">
                  <BookOpen className="w-3 h-3 text-[#FFD34E]" />
                  {pricing.totalPdfs} Subjects
                </span>
              </div>

              {/* Items Breakdown */}
              <div className="py-2.5 space-y-2 text-xs border-b border-white/15">
                {/* 1. Core */}
                <div className="bg-black/35 p-2 rounded-xl border border-white/10 flex items-center justify-between">
                  <div>
                    <span className="text-[#FFE7A3] text-[11px] font-bold block">
                      ✓ {coreProducts.length} Core Subjects (Compulsory)
                    </span>
                    <span className="text-[9px] text-white/60">
                      {coreProducts.map((c) => c.subjectCode).join(', ')}
                    </span>
                  </div>
                  <span className="text-[#FFD34E] font-black text-xs">
                    ₹{activeCorePrice}
                  </span>
                </div>

                {/* 2. Language */}
                <div className="bg-black/35 p-2 rounded-xl border border-white/10 flex items-center justify-between text-[11px]">
                  <div>
                    <span className="font-bold text-[#FFE7A3]">Language:</span>
                    <span className="text-[10px] text-white/80 block">
                      {activeLanguageProduct ? activeLanguageProduct.subjectName : 'None (Skipped)'}
                    </span>
                  </div>
                  {activeLanguageProduct ? (
                    <div className="flex items-center gap-1">
                      <span className="font-black text-[#FFD34E] text-xs">
                        +₹{activeLangPrice}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectLanguage(null)}
                        className="text-white/40 hover:text-rose-400 p-0.5 cursor-pointer"
                        title="Remove"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-white/40 text-[10px]">₹0</span>
                  )}
                </div>

                {/* 3. Specialization */}
                <div className="bg-black/35 p-2 rounded-xl border border-white/10 flex items-center justify-between text-[11px]">
                  <div>
                    <span className="font-bold text-[#FFE7A3]">Specialization:</span>
                    <span className="text-[10px] text-white/80 block">
                      {activeSpecializationProduct ? activeSpecializationProduct.subjectName : 'None (Skipped)'}
                    </span>
                  </div>
                  {activeSpecializationProduct ? (
                    <div className="flex items-center gap-1">
                      <span className="font-black text-[#FFD34E] text-xs">
                        +₹{activeSpecPrice}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectSpecialization(null)}
                        className="text-white/40 hover:text-rose-400 p-0.5 cursor-pointer"
                        title="Remove"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-white/40 text-[10px]">₹0</span>
                  )}
                </div>
              </div>

              {/* Price Calculation & Checkout */}
              <div className="pt-2.5 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-white/60">
                  <span>Regular Total Price:</span>
                  <span className="line-through text-[#FFE7A3]/50">
                    ₹{pricing.regularPrice}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-black text-sm text-white">Total Amount:</span>
                  <span className="text-2xl font-black text-[#FFD34E] tabular-nums">
                    ₹{pricing.launchOfferPrice}
                  </span>
                </div>

                <div className="bg-[#FFD34E]/15 border border-[#FFD34E]/40 text-[#FFE7A3] px-2.5 py-1 rounded-lg flex items-center justify-between text-[11px] font-bold">
                  <span className="flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-[#FFD34E]" />
                    Total Savings:
                  </span>
                  <span className="text-[#FFD34E]">Save ₹{pricing.totalSavings}</span>
                </div>

                <button
                  type="button"
                  onClick={onProceedToCheckout}
                  className="btn-gold-primary w-full py-2.5 rounded-full text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-lg mt-1"
                >
                  <span>Proceed to Payment</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Quick-Checkout Action Bar (Mobile-First optimization) */}
      <div className="lg:hidden fixed bottom-14 left-0 right-0 z-40 p-2.5 bg-[#3D0009]/95 backdrop-blur-md border-t border-[#FFD34E]/30 shadow-[0_-5px_20px_rgba(0,0,0,0.8)]">
        <div className="max-w-md mx-auto flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-[#FFE7A3] font-bold block">
              {pricing.totalPdfs} Subjects Selected
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-[#FFD34E] leading-tight">
                ₹{pricing.launchOfferPrice}
              </span>
              <span className="text-[10px] text-white/50 line-through">
                ₹{pricing.regularPrice}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onProceedToCheckout}
            className="btn-gold-primary py-2 px-5 rounded-full text-xs font-black flex items-center gap-1 shadow-md cursor-pointer shrink-0"
          >
            <span>Proceed to Pay</span>
            <ArrowRight className="w-3 h-3 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </section>
  );
};
