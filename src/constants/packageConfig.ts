import type { EffectivePackagePricing } from '../types';

export const CORE_SUBJECT_IDS = [
  'prod-bca-maj3',
  'prod-bca-min3',
  'prod-bca-mdc3',
  'prod-bca-sec3',
] as const;

export const LANGUAGE_SUBJECT_IDS = [
  'prod-bca-aec3-bengali',
  'prod-bca-aec3-sanskrit',
] as const;

export const SPECIALIZATION_SUBJECT_IDS = [
  'prod-spec-ds',
  'prod-spec-ai',
  'prod-spec-cs',
  'prod-spec-ml',
  'prod-spec-iot',
] as const;

export interface PackagePricingConfig {
  core: {
    launchPrice: number;
    regularPrice: number;
    pdfCount: number;
    title: string;
  };
  language: {
    launchPrice: number;
    regularPrice: number;
    pdfCount: number;
    title: string;
  };
  specialization: {
    launchPrice: number;
    regularPrice: number;
    pdfCount: number;
    title: string;
  };
}

export const PACKAGE_PRICING: PackagePricingConfig = {
  core: {
    title: 'Main Core Package (4 PDFs)',
    pdfCount: 4,
    launchPrice: 69,
    regularPrice: 99,
  },
  language: {
    title: 'Language Add-on (1 PDF)',
    pdfCount: 1,
    launchPrice: 10,
    regularPrice: 15,
  },
  specialization: {
    title: 'Specialization Add-on (1 PDF)',
    pdfCount: 1,
    launchPrice: 20,
    regularPrice: 35,
  },
};

export interface PackageCalculationResult {
  hasCore: boolean;
  selectedLanguageId: string | null;
  selectedSpecializationId: string | null;
  selectedProductIds: string[];
  totalPdfs: number;
  launchOfferPrice: number;
  regularPrice: number;
  totalSavings: number;
  combinationLabel: string;
  offerActive: boolean;
  offerExpired: boolean;
}

/**
 * Calculates live package pricing based on selected product IDs and dynamic Admin pricing/offer config.
 * Automatically applies regular price if the active offer has expired or been deactivated.
 */
export function calculatePackagePrice(
  productIds: string[],
  liveConfig?: EffectivePackagePricing | null
): PackageCalculationResult {
  const coreIds: readonly string[] =
    liveConfig?.compulsoryProductIds?.length ? liveConfig.compulsoryProductIds : CORE_SUBJECT_IDS;
  const langIds: readonly string[] =
    liveConfig?.languageProductIds?.length ? liveConfig.languageProductIds : LANGUAGE_SUBJECT_IDS;
  const specIds: readonly string[] =
    liveConfig?.specializationProductIds?.length
      ? liveConfig.specializationProductIds
      : SPECIALIZATION_SUBJECT_IDS;

  const corePricing = liveConfig?.core || PACKAGE_PRICING.core;
  const langPricing = liveConfig?.language || PACKAGE_PRICING.language;
  const specPricing = liveConfig?.specialization || PACKAGE_PRICING.specialization;

  const offerActive = liveConfig ? liveConfig.offerActive : true;
  const offerExpired = liveConfig ? liveConfig.offerExpired : false;

  const currentSet = new Set(productIds);

  const selectedLanguageId = langIds.find((id) => currentSet.has(id)) || null;
  const selectedSpecializationId = specIds.find((id) => currentSet.has(id)) || null;

  const finalProductIds: string[] = [...coreIds];
  if (selectedLanguageId) finalProductIds.push(selectedLanguageId);
  if (selectedSpecializationId) finalProductIds.push(selectedSpecializationId);

  let launchOfferPrice = offerActive ? corePricing.launchPrice : corePricing.regularPrice;
  let regularPrice = corePricing.regularPrice;
  let totalPdfs = coreIds.length;

  if (selectedLanguageId) {
    launchOfferPrice += offerActive ? langPricing.launchPrice : langPricing.regularPrice;
    regularPrice += langPricing.regularPrice;
    totalPdfs += 1;
  }

  if (selectedSpecializationId) {
    launchOfferPrice += offerActive ? specPricing.launchPrice : specPricing.regularPrice;
    regularPrice += specPricing.regularPrice;
    totalPdfs += 1;
  }

  // If Complete Full Package is selected and liveConfig specifies fullPackageOfferPrice, use it
  if (selectedLanguageId && selectedSpecializationId && liveConfig) {
    regularPrice = liveConfig.fullPackageRegularPrice || regularPrice;
    launchOfferPrice = offerActive
      ? liveConfig.fullPackageOfferPrice || launchOfferPrice
      : regularPrice;
  }

  const totalSavings = Math.max(0, regularPrice - launchOfferPrice);

  let combinationLabel = 'Main Core Package';
  if (selectedLanguageId && selectedSpecializationId) {
    combinationLabel = liveConfig?.packageName || 'Main + Language + Specialization (Complete Pack)';
  } else if (selectedLanguageId) {
    combinationLabel = 'Main + Language Add-on';
  } else if (selectedSpecializationId) {
    combinationLabel = 'Main + Specialization Add-on';
  }

  return {
    hasCore: true,
    selectedLanguageId,
    selectedSpecializationId,
    selectedProductIds: finalProductIds,
    totalPdfs,
    launchOfferPrice,
    regularPrice,
    totalSavings,
    combinationLabel,
    offerActive,
    offerExpired,
  };
}

export const CORE_SUBJECT_NAMES = [
  'Computer Architecture',
  'Business Environment',
  'Business Ethics & CSR',
  'Advanced Database System',
];
