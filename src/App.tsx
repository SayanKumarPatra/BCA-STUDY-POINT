/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { HeroBannerSlider } from './components/HeroBannerSlider';
import { HowItWorks } from './components/HowItWorks';
import { CheckoutModal } from './components/CheckoutModal';
import { PurchasedContent } from './components/PurchasedContent';
import { SecurePdfViewer } from './components/SecurePdfViewer';
import { DeviceLockedModal } from './components/DeviceLockedModal';
import { AdminPanel } from './components/AdminPanel';
import { AuthModal } from './components/AuthModal';
import { AboutModal } from './components/AboutModal';
import { ContactModal } from './components/ContactModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { PackagePricingSection } from './components/PackagePricingSection';
import {
  CORE_SUBJECT_IDS,
  LANGUAGE_SUBJECT_IDS,
  SPECIALIZATION_SUBJECT_IDS,
  calculatePackagePrice,
} from './constants/packageConfig';
import { api } from './services/api';
import { FALLBACK_PRODUCTS } from './constants/fallbackProducts';
import {
  subscribeToProductsRealtime,
  subscribeToBannersRealtime,
  subscribeToEffectivePricingRealtime,
  subscribeToSiteSettingsRealtime,
} from './firebase/firebase';
import type {
  Product,
  AppView,
  BannerSlide,
  EffectivePackagePricing,
  SiteSettings,
} from './types';

function AppContent() {
  const { student } = useAuth();

  // Navigation View - Dedicated Full Page Architecture
  const [currentView, setCurrentView] = useState<AppView>('catalog');

  // Catalog & Live Storefront Config State
  const [products, setProducts] = useState<Product[]>(FALLBACK_PRODUCTS);
  const [banners, setBanners] = useState<BannerSlide[]>([]);
  const [livePricing, setLivePricing] = useState<EffectivePackagePricing | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);

  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState('');

  // Dynamic Tier Subject IDs synced with Admin Package Management
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

  // Cart & Selection State - Compulsory Core subjects included by default
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([...CORE_SUBJECT_IDS]);

  // Purchased IDs set for current logged in student
  const [purchasedProductIds, setPurchasedProductIds] = useState<string[]>([]);

  // Modals & Viewer State
  const [activeViewerProductId, setActiveViewerProductId] = useState<string | null>(null);
  const [deviceMismatchData, setDeviceMismatchData] = useState<{
    registeredDevice: any;
    supportInfo: any;
  } | null>(null);
  const [authDefaultRegister, setAuthDefaultRegister] = useState(false);

  const loadCatalog = () => {
    setIsLoadingCatalog(true);
    setCatalogError('');
    api.getProducts()
      .then((res) => {
        if (res?.products?.length > 0) {
          setProducts(res.products);
        }
      })
      .catch((err) => {
        console.warn('API products fallback:', err);
        setCatalogError('Failed to load products. Please try again.');
      })
      .finally(() => {
        setIsLoadingCatalog(false);
      });
  };

  // Load catalog, storefront config, & real-time Firebase RTDB listeners
  useEffect(() => {
    loadCatalog();

    api
      .getStorefrontConfig()
      .then((cfg) => {
        if (cfg?.banners?.length) setBanners(cfg.banners);
        if (cfg?.packagePricing) setLivePricing(cfg.packagePricing);
        if (cfg?.siteSettings) setSiteSettings(cfg.siteSettings);
      })
      .catch(() => {});

    const unsubProducts = subscribeToProductsRealtime((realtimeProducts) => {
      if (realtimeProducts && realtimeProducts.length > 0) {
        setProducts(realtimeProducts);
        setIsLoadingCatalog(false);
      }
    });
    const unsubBanners = subscribeToBannersRealtime((realtimeBanners) => {
      if (realtimeBanners && realtimeBanners.length > 0) {
        setBanners(realtimeBanners);
      }
    });
    const unsubPricing = subscribeToEffectivePricingRealtime((realtimePricing) => {
      if (realtimePricing) {
        setLivePricing(realtimePricing);
      }
    });
    const unsubSettings = subscribeToSiteSettingsRealtime((realtimeSettings) => {
      if (realtimeSettings) {
        setSiteSettings(realtimeSettings);
      }
    });

    return () => {
      unsubProducts();
      unsubBanners();
      unsubPricing();
      unsubSettings();
    };
  }, []);

  // Sync student purchases when logged in
  useEffect(() => {
    if (student?.id) {
      api
        .getStudentPurchases(student.id)
        .then((data) => {
          const activeIds = data.purchases
            .filter((p: any) => p.accessStatus === 'active')
            .map((p: any) => p.productId);
          const allPurchasedIds = data.purchases.map((p: any) => p.productId);

          setPurchasedProductIds(activeIds);
          setSelectedProductIds((prev) => prev.filter((id) => !allPurchasedIds.includes(id)));
        })
        .catch((err) => {
          console.error('Error fetching student purchases:', err);
        });
    } else {
      setPurchasedProductIds([]);
    }
  }, [student?.id]);

  // Handle optional Language selection (Max 1 or null)
  const handleSelectLanguage = (langId: string | null) => {
    setSelectedProductIds((prev) => {
      const withoutLang = prev.filter((id) => !langIds.includes(id));
      const nextSet = new Set([...withoutLang, ...coreIds]);
      if (langId) {
        nextSet.add(langId);
      }
      return Array.from(nextSet);
    });
  };

  // Handle optional Specialization selection (Max 1 or null)
  const handleSelectSpecialization = (specId: string | null) => {
    setSelectedProductIds((prev) => {
      const withoutSpec = prev.filter((id) => !specIds.includes(id));
      const nextSet = new Set([...withoutSpec, ...coreIds]);
      if (specId) {
        nextSet.add(specId);
      }
      return Array.from(nextSet);
    });
  };

  const handleRemoveFromCart = (productId: string) => {
    if (coreIds.includes(productId)) return;
    setSelectedProductIds((prev) => prev.filter((id) => id !== productId));
  };

  const selectedProducts = useMemo(() => {
    return products.filter((p) => selectedProductIds.includes(p.id) && p.published !== false);
  }, [products, selectedProductIds]);

  // If Admin portal is open, render AdminPanel
  if (currentView === 'admin') {
    return <AdminPanel onExit={() => setCurrentView('catalog')} />;
  }

  const announcement = siteSettings?.announcement;

  return (
    <div className="min-h-screen flex flex-col bg-radial-[at_50%_0%] from-[#970014] via-[#65000D] to-[#240005] text-white selection:bg-[#FFD34E] selection:text-[#3D0009] pb-14 md:pb-0">
      {/* Optional Live Announcement Bar from Admin Website Management */}
      {announcement?.enabled && announcement.text && (
        <div className="bg-[#FFD34E] text-[#3D0009] text-[11px] sm:text-xs font-bold px-3 py-1.5 text-center border-b border-[#3D0009]/15">
          {announcement.link ? (
            <a
              href={announcement.link}
              onClick={(e) => {
                if (announcement.link.startsWith('#')) {
                  e.preventDefault();
                  document.getElementById(announcement.link.slice(1))?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="hover:underline inline-flex items-center gap-1.5"
            >
              <span>{announcement.text}</span>
            </a>
          ) : (
            <span>{announcement.text}</span>
          )}
        </div>
      )}

      {/* 1. Header: Logo & Name on Left, Login/Register on Right (Zero overflow on mobile) */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        selectedCount={selectedProductIds.length}
        tagline={siteSettings?.tagline}
        onOpenCart={() => setCurrentView('checkout')}
        onOpenAuth={(isRegister = false) => {
          setAuthDefaultRegister(isRegister);
          setCurrentView('auth');
        }}
        onOpenAbout={() => setCurrentView('about')}
        onOpenContact={() => setCurrentView('contact')}
      />

      {/* Main View Switcher - Full Page Rendering */}
      <main className="flex-1">
        {currentView === 'auth' ? (
          <AuthModal
            isOpen={true}
            isPage={true}
            onClose={() => setCurrentView('catalog')}
            defaultIsRegister={authDefaultRegister}
            onSuccess={() => {
              setCurrentView('purchased');
            }}
          />
        ) : currentView === 'checkout' ? (
          <CheckoutModal
            isOpen={true}
            isPage={true}
            onClose={() => setCurrentView('catalog')}
            selectedProducts={selectedProducts}
            livePricing={livePricing}
            siteSettings={siteSettings}
            onRemoveProduct={handleRemoveFromCart}
            onPurchaseSuccess={() => {
              const activeStudent = student || JSON.parse(localStorage.getItem('bca_logged_in_student') || 'null');
              if (activeStudent?.id || activeStudent?.email || activeStudent?.mobile) {
                const queryId = activeStudent.id || activeStudent.email || activeStudent.mobile;
                api.getStudentPurchases(queryId).then((data) => {
                  setPurchasedProductIds(
                    data.purchases.filter((p: any) => p.accessStatus === 'active').map((p: any) => p.productId)
                  );
                }).catch(() => {});
              }
              setSelectedProductIds([]);
              setCurrentView('purchased');
            }}
          />
        ) : currentView === 'about' ? (
          <AboutModal
            isOpen={true}
            isPage={true}
            onClose={() => setCurrentView('catalog')}
          />
        ) : currentView === 'contact' ? (
          <ContactModal
            isOpen={true}
            isPage={true}
            siteSettings={siteSettings}
            onClose={() => setCurrentView('catalog')}
          />
        ) : currentView === 'purchased' ? (
          <PurchasedContent
            onOpenViewer={(prodId) => setActiveViewerProductId(prodId)}
            onGoToCatalog={() => setCurrentView('catalog')}
            onOpenAuth={() => {
              setAuthDefaultRegister(false);
              setCurrentView('auth');
            }}
          />
        ) : (
          /* Public Storefront Layout Clean & Streamlined */
          <>
            {/* 2. Sliding Banner Carousel directly beneath the Navbar */}
            <div className="pt-2 px-2 sm:px-4">
              <HeroBannerSlider
                banners={banners}
                onExploreClick={() => {
                  document.getElementById('packages-pricing')?.scrollIntoView({ behavior: 'smooth' });
                }}
              />
            </div>

            {/* 3. BCA STUDY POINT – Package Selection & Pricing Section */}
            <PackagePricingSection
              products={products}
              selectedProductIds={selectedProductIds}
              purchasedProductIds={purchasedProductIds}
              livePricing={livePricing}
              siteSettings={siteSettings}
              onSelectLanguage={handleSelectLanguage}
              onSelectSpecialization={handleSelectSpecialization}
              onProceedToCheckout={() => setCurrentView('checkout')}
              onOpenViewer={(prodId) => setActiveViewerProductId(prodId)}
            />

            {/* 4. How It Works: Simple 1, 2, 3, 4 numbered points */}
            <HowItWorks title={siteSettings?.homepage?.howItWorksTitle} />
          </>
        )}
      </main>


      {/* Fast, Clean Online PDF Viewer for Purchased Content */}
      {activeViewerProductId && (
        <SecurePdfViewer
          productId={activeViewerProductId}
          onClose={() => setActiveViewerProductId(null)}
          onDeviceMismatch={(registeredDevice, supportInfo) => {
            setDeviceMismatchData({ registeredDevice, supportInfo });
          }}
        />
      )}

      {/* Device Locked Modal */}
      <DeviceLockedModal
        isOpen={Boolean(deviceMismatchData)}
        onClose={() => setDeviceMismatchData(null)}
        registeredDevice={deviceMismatchData?.registeredDevice}
        supportInfo={deviceMismatchData?.supportInfo}
      />

      {/* 7. Native Mobile App Style Bottom Navigation Bar */}
      <MobileBottomNav
        currentView={currentView}
        setCurrentView={setCurrentView}
        selectedCount={selectedProductIds.length}
        whatsappPhone={siteSettings?.payment?.whatsappPhone || '8145775413'}
        onOpenCart={() => setCurrentView('checkout')}
        onOpenAuth={() => {
          setAuthDefaultRegister(false);
          setCurrentView('auth');
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
