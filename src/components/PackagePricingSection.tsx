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
  UserPlus,
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
  isLoggedIn?: boolean;
  studentName?: string;
  onSelectLanguage: (langId: string | null) => void;
  onSelectSpecialization: (specId: string | null) => void;
  onProceedToCheckout: () => void;
  onOpenAuth?: (isRegister: boolean) => void;
  onOpenViewer?: (productId: string) => void;
}

export const PackagePricingSection: React.FC<PackagePricingSectionProps> = ({
  products,
  selectedProductIds,
  purchasedProductIds = [],
  livePricing,
  siteSettings,
  isLoggedIn = false,
  studentName,
  onSelectLanguage,
  onSelectSpecialization,
  onProceedToCheckout,
  onOpenAuth,
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
      className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 mt-1.5 mb-2 sm:my-5 relative select-none"
      aria-label="Package Selection & Pricing Section"
    >
      <div id="subjects" className="absolute -top-16 left-0 pointer-events-none" />

      {/* Compact Liquid Glass Master Container */}
      <div className="liquid-glass-master rounded-2xl sm:rounded-3xl p-2.5 sm:p-5 border border-[#FFE7A3]/30 shadow-2xl relative overflow-hidden text-white">
        <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#FFD34E]/60 to-transparent pointer-events-none" />

        {/* Single-Row Compact Header */}
        <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 sm:mb-3 border-b border-[#FFE7A3]/20">
          <div className="min-w-0">
            <h2 className="text-sm sm:text-2xl font-black text-white tracking-tight truncate">
              {siteSettings?.homepage?.sectionTitle || 'Package Selection & Pricing'}
            </h2>
            <p className="text-[10px] sm:text-xs text-[#FFE7A3]/85 font-semibold truncate">
              {siteSettings?.homepage?.sectionBadge || 'BCA 3rd Semester · Solved Question Banks'}
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-[#970014] to-[#65000D] border border-[#FFD34E]/40 shadow-sm">
            <Sparkles className="w-3 h-3 text-[#FFD34E] shrink-0" />
            <span className="text-[10.5px] sm:text-xs font-black text-[#FFD34E] whitespace-nowrap">
              {livePricing?.offerBadgeText || 'Up to 34% OFF'}
            </span>
          </div>
        </div>

        {/* Responsive Grid: Packages (8 cols) & Single Order Summary (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-4 items-start">
          {/* Left Column: Compact Compulsory + Optional Add-ons */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-2 sm:space-y-3">

            {/* 1. COMPULSORY CORE PACKAGE — Emerald Green Fixed Theme */}
            <div className="rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 bg-gradient-to-br from-emerald-950/80 via-[#072a1d]/75 to-black/65 border border-emerald-400/50 shadow-md">
              <div className="flex items-center justify-between gap-1.5 pb-1.5 mb-2 border-b border-emerald-400/20">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-400 text-[#042416] shrink-0">
                      <Lock className="w-2.5 h-2.5 stroke-[2.5]" />
                      FIXED
                    </span>
                    <h3 className="text-xs sm:text-sm font-black text-white truncate">
                      Main Core ({coreProducts.length} Papers)
                    </h3>
                  </div>
                  <span className="block text-[9.5px] font-bold text-emerald-300 mt-0.5">
                    ✓ অটো-সিলেক্টেড · এগুলো বাদ দেওয়া যাবে না
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {coreTier.regularPrice > activeCorePrice && (
                    <span className="text-[10px] text-emerald-200/60 line-through font-medium">
                      ₹{coreTier.regularPrice}
                    </span>
                  )}
                  <span className="text-sm sm:text-base font-black text-emerald-300 tabular-nums">
                    ₹{activeCorePrice}
                  </span>
                </div>
              </div>

              {/* Compact 2x2 / 4-col Core Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                {coreProducts.map((prod) => {
                  const isPurchased = purchasedProductIds.includes(prod.id);
                  return (
                    <div
                      key={prod.id}
                      className="bg-emerald-950/45 rounded-lg p-1.5 sm:p-2 border border-emerald-400/30 flex items-center gap-1.5 sm:gap-2 text-left"
                    >
                      <div className="w-7 h-9 sm:w-9 sm:h-11 rounded overflow-hidden bg-black/60 shrink-0 border border-emerald-400/30">
                        {prod.coverImageUrl || prod.imageUrl ? (
                          <img
                            src={prod.coverImageUrl || prod.imageUrl}
                            alt={prod.subjectName}
                            className="w-full h-full object-contain p-0.5"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-emerald-900 text-emerald-100 font-bold text-[7px] p-0.5 text-center">
                            {prod.subjectCode}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[8.5px] font-mono font-bold text-emerald-300 truncate">
                            {prod.subjectCode}
                          </span>
                          {isPurchased && onOpenViewer ? (
                            <button
                              type="button"
                              onClick={() => onOpenViewer(prod.id)}
                              className="text-[8.5px] font-bold text-emerald-300 underline cursor-pointer shrink-0"
                            >
                              Read
                            </button>
                          ) : (
                            <Check className="w-3 h-3 text-emerald-400 stroke-[3] shrink-0" />
                          )}
                        </div>
                        <h4 className="font-bold text-[10.5px] text-white truncate">
                          {prod.subjectName}
                        </h4>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. OPTIONAL LANGUAGE SECTION — Sky Blue Choose Theme */}
            <div className="rounded-xl sm:rounded-2xl p-2.5 sm:p-3 bg-gradient-to-br from-sky-950/80 via-[#09243b]/75 to-black/65 border border-sky-400/45 shadow-md">
              <div className="flex items-center justify-between gap-1.5 pb-1.5 mb-2 border-b border-sky-400/20">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-sky-400 text-[#062133] shrink-0">
                      CHOOSE 1
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                      Language Add-on
                    </h3>
                  </div>
                  <span className="block text-[9.5px] font-bold text-sky-300 mt-0.5">
                    নিজে বেছে নিন (যেকোনো ১টি বা Skip)
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {pricing.selectedLanguageId && (
                    <button
                      type="button"
                      onClick={() => onSelectLanguage(null)}
                      className="text-[9.5px] font-bold text-rose-300 hover:text-rose-200 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-950/70 border border-rose-500/40 cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                      <span>Skip</span>
                    </button>
                  )}
                  <span className="text-xs sm:text-sm font-black text-sky-300">
                    +₹{activeLangPrice}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                {languageProducts.map((prod) => {
                  const isSelected = pricing.selectedLanguageId === prod.id;
                  return (
                    <div
                      key={prod.id}
                      onClick={() => onSelectLanguage(isSelected ? null : prod.id)}
                      className={`rounded-lg p-1.5 sm:p-2 border transition-all cursor-pointer flex items-center gap-2 text-left select-none ${
                        isSelected
                          ? 'bg-sky-900/65 border-[#FFD34E] ring-1 ring-[#FFD34E]/80 shadow-[0_0_12px_rgba(255,211,78,0.2)]'
                          : 'bg-sky-950/35 border-sky-400/30 hover:border-sky-300'
                      }`}
                    >
                      <div className="w-7 h-9 sm:w-9 sm:h-11 rounded overflow-hidden shrink-0 bg-black/60 border border-sky-400/25">
                        {prod.coverImageUrl || prod.imageUrl ? (
                          <img
                            src={prod.coverImageUrl || prod.imageUrl}
                            alt={prod.subjectName}
                            className="w-full h-full object-contain p-0.5"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-sky-900 text-sky-100 font-bold text-[7px] text-center">
                            {prod.subjectCode}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-[8.5px] font-mono font-bold text-sky-200">
                            {prod.subjectCode}
                          </span>
                          <span className="text-[9.5px] font-black text-[#FFD34E]">
                            +₹{activeLangPrice}
                          </span>
                        </div>
                        <h4 className="font-bold text-[10.5px] text-white truncate">
                          {prod.subjectName}
                        </h4>
                      </div>

                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-[#FFD34E] border-[#FFD34E] text-[#3D0009]'
                            : 'border-sky-300/50 bg-black/40'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. OPTIONAL SPECIALIZATION SECTION — Royal Violet Choose Theme */}
            <div className="rounded-xl sm:rounded-2xl p-2.5 sm:p-3 bg-gradient-to-br from-violet-950/80 via-[#221040]/75 to-black/65 border border-violet-400/45 shadow-md">
              <div className="flex items-center justify-between gap-1.5 pb-1.5 mb-2 border-b border-violet-400/20">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-violet-400 text-[#1d083d] shrink-0">
                      CHOOSE 1
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                      Specialization Add-on
                    </h3>
                  </div>
                  <span className="block text-[9.5px] font-bold text-violet-200 mt-0.5">
                    নিজে বেছে নিন (যেকোনো ১টি বা Skip)
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {pricing.selectedSpecializationId && (
                    <button
                      type="button"
                      onClick={() => onSelectSpecialization(null)}
                      className="text-[9.5px] font-bold text-rose-300 hover:text-rose-200 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-950/70 border border-rose-500/40 cursor-pointer"
                    >
                      <X className="w-2.5 h-2.5" />
                      <span>Skip</span>
                    </button>
                  )}
                  <span className="text-xs sm:text-sm font-black text-violet-200">
                    +₹{activeSpecPrice}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5 sm:gap-2">
                {specializationProducts.map((prod) => {
                  const isSelected = pricing.selectedSpecializationId === prod.id;
                  return (
                    <div
                      key={prod.id}
                      onClick={() => onSelectSpecialization(isSelected ? null : prod.id)}
                      className={`rounded-lg p-1.5 sm:p-2 border transition-all cursor-pointer flex items-center lg:flex-col lg:items-stretch gap-1.5 text-left select-none ${
                        isSelected
                          ? 'bg-violet-900/65 border-[#FFD34E] ring-1 ring-[#FFD34E]/80 shadow-[0_0_12px_rgba(255,211,78,0.2)]'
                          : 'bg-violet-950/35 border-violet-400/30 hover:border-violet-300'
                      }`}
                    >
                      <div className="w-7 h-9 lg:w-full lg:aspect-[3/4] lg:max-h-20 rounded overflow-hidden bg-black/60 shrink-0 border border-violet-400/25">
                        {prod.coverImageUrl || prod.imageUrl ? (
                          <img
                            src={prod.coverImageUrl || prod.imageUrl}
                            alt={prod.subjectName}
                            className="w-full h-full object-contain p-0.5"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-violet-900 text-violet-100 font-bold text-[7px] text-center">
                            {prod.subjectCode}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[8px] font-mono font-bold text-violet-200 truncate">
                            {prod.subjectCode}
                          </span>
                          <span className="text-[9px] font-black text-[#FFD34E] shrink-0">
                            +₹{activeSpecPrice}
                          </span>
                        </div>
                        <h4 className="font-bold text-[10px] sm:text-[11px] text-white truncate">
                          {prod.subjectName}
                        </h4>
                      </div>

                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 lg:hidden ${
                          isSelected
                            ? 'bg-[#FFD34E] border-[#FFD34E] text-[#3D0009]'
                            : 'border-violet-300/50 bg-black/60'
                        }`}
                      >
                        {isSelected && <Check className="w-2 h-2 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Royal Maroon-Gold Order Summary & Checkout CTA */}
          <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-20">
            <div className="rounded-xl sm:rounded-2xl p-3 sm:p-4 bg-gradient-to-br from-[#5A000B]/95 via-[#360007]/95 to-black/90 border border-[#FFD34E]/60 shadow-xl text-white space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-white/15">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#FFD34E]" />
                  <h3 className="font-black text-xs sm:text-sm text-white">Order Summary</h3>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#FFD34E]/20 text-[#FFE7A3] border border-[#FFD34E]/40">
                  <BookOpen className="w-3 h-3 text-[#FFD34E]" />
                  {pricing.totalPdfs} Subjects
                </span>
              </div>

              {/* Compact Selected Breakdown */}
              <div className="space-y-1 text-[11px] pb-2 border-b border-white/15">
                <div className="flex items-center justify-between text-white/90">
                  <span>✓ {coreProducts.length} Core Subjects (Compulsory)</span>
                  <span className="font-black text-[#FFD34E]">₹{activeCorePrice}</span>
                </div>
                {activeLanguageProduct && (
                  <div className="flex items-center justify-between text-white/90">
                    <span className="truncate pr-2">+ {activeLanguageProduct.subjectName}</span>
                    <span className="font-black text-[#FFD34E] shrink-0">+₹{activeLangPrice}</span>
                  </div>
                )}
                {activeSpecializationProduct && (
                  <div className="flex items-center justify-between text-white/90">
                    <span className="truncate pr-2">+ {activeSpecializationProduct.subjectName}</span>
                    <span className="font-black text-[#FFD34E] shrink-0">+₹{activeSpecPrice}</span>
                  </div>
                )}
              </div>

              {/* Total & Single Clear Payment CTA */}
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-black text-xs text-white/85">Total:</span>
                  <span className="text-2xl font-black text-[#FFD34E] tabular-nums leading-none">
                    ₹{pricing.launchOfferPrice}
                  </span>
                  {pricing.regularPrice > pricing.launchOfferPrice && (
                    <span className="text-[11px] line-through text-white/45">
                      ₹{pricing.regularPrice}
                    </span>
                  )}
                </div>
                {pricing.totalSavings > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-[#FFD34E]/15 text-[#FFD34E] border border-[#FFD34E]/35">
                    <TrendingDown className="w-3 h-3" />
                    Save ₹{pricing.totalSavings}
                  </span>
                )}
              </div>

              {!isLoggedIn ? (
                <div className="space-y-1.5 pt-0.5">
                  <p className="text-[10.5px] text-[#FFE7A3]/90 leading-snug">
                    পেমেন্টের আগে একবার <strong>Register</strong> করুন (পরে শুধু ইমেইল দিয়েই লগইন করতে পারবেন)।
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => (onOpenAuth ? onOpenAuth(true) : onProceedToCheckout())}
                      className="btn-gold-primary flex-1 py-2.5 px-3 rounded-full text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Register &amp; Pay (₹{pricing.launchOfferPrice})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => (onOpenAuth ? onOpenAuth(false) : onProceedToCheckout())}
                      className="px-3.5 py-2.5 rounded-full text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 cursor-pointer shrink-0"
                    >
                      Login
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 pt-0.5">
                  {studentName && (
                    <div className="px-2.5 py-1 rounded-lg bg-emerald-950/50 border border-emerald-400/35 text-[10.5px] text-emerald-200 flex items-center gap-1.5 font-semibold truncate">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">Account: {studentName}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={onProceedToCheckout}
                    className="btn-gold-primary w-full py-2.5 rounded-full text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                  >
                    <span>Proceed to Payment (₹{pricing.launchOfferPrice})</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
