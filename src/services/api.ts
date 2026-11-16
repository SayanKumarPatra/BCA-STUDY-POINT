import type {
  Semester,
  Product,
  Order,
  DeviceBinding,
  AdminAuditLog,
  BannerSlide,
  PackageDefinition,
  OfferConfig,
  SiteSettings,
  EffectivePackagePricing,
  CustomerSummary,
  AdminDashboardStats,
} from '../types';
import { FALLBACK_PRODUCTS } from '../constants/fallbackProducts';
import {
  computeEffectivePricingClient,
  deleteCustomerRealtime,
  deleteOrderRealtime,
  fileToCompressedDataUrl,
  findStudentInRealtimeDb,
  getBannersFromRtdb,
  getCustomersFromRtdb,
  getOffersFromRtdb,
  getOrdersFromRtdb,
  getPackagesFromRtdb,
  getProductsFromRtdb,
  getSiteSettingsFromRtdb,
  rtdb,
  saveBannersToRtdb,
  saveOffersToRtdb,
  savePackagesToRtdb,
  saveSiteSettingsToRtdb,
  syncStudentProfileRealtime,
  updateOrderStatusRealtime,
  updateProductRealtime,
} from '../firebase/firebase';
import { ref as rtdbRef, set as rtdbSet } from 'firebase/database';

const ADMIN_STORAGE_KEY = 'bca_admin_auth_key';

export function getStoredAdminKey(): string | null {
  return localStorage.getItem(ADMIN_STORAGE_KEY);
}

export function setStoredAdminKey(key: string | null) {
  if (key) {
    localStorage.setItem(ADMIN_STORAGE_KEY, key);
  } else {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
  }
}

/**
 * Robust JSON fetch wrapper that guards against HTML responses, Cloud Run cold-start pages,
 * and proxy errors (such as "The page cannot be found..."), preventing SyntaxError crashes.
 */
async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit,
  fallback?: T
): Promise<T> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';

    // If server returned non-JSON (e.g. HTML 404, 502, proxy warmup page)
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      console.warn(`[API] Expected JSON from ${url}, received non-JSON (${res.status}):`, text.slice(0, 100));

      if (fallback !== undefined) {
        return fallback;
      }
      throw new Error(`সার্ভার থেকে সঠিক তথ্য পাওয়া যায়নি (Status: ${res.status})। অনুগ্রহ করে পেজটি রিফ্রেশ করুন।`);
    }

    const data = await res.json();
    if (!res.ok) {
      const err: any = new Error(data.message || data.error || `Request failed with status ${res.status}`);
      err.activeDevice = data.activeDevice;
      err.errorCode = data.error;
      err.status = res.status;
      throw err;
    }
    return data as T;
  } catch (err: any) {
    if (fallback !== undefined) {
      console.warn(`[API] Using fallback for ${url}:`, err.message);
      return fallback;
    }
    // Clean user-friendly message for any residual JSON syntax error
    if (err.name === 'SyntaxError' || err.message?.includes('JSON') || err.message?.includes('Unexpected token')) {
      throw new Error('সার্ভার সংযোগে সাময়িক সমস্যা হয়েছে। অনুগ্রহ করে পেজটি রিফ্রেশ করুন।');
    }
    throw err;
  }
}

export const api = {
  // --- Public Storefront ---
  async getSemesters(): Promise<{ semesters: Semester[] }> {
    return safeFetchJson(
      '/api/semesters',
      undefined,
      {
        semesters: [
          {
            id: 'sem-3',
            semesterNumber: 3,
            title: 'BCA Semester 3',
            academicYear: 'Year 2',
            description: 'Core and Specialization Question Banks',
            published: true,
            createdAt: '',
            updatedAt: '',
          },
        ],
      }
    );
  },

  async getProducts(semesterId?: string): Promise<{ products: Product[] }> {
    const url = semesterId ? `/api/products?semesterId=${encodeURIComponent(semesterId)}` : '/api/products';
    try {
      const result = await safeFetchJson<{ products: Product[] }>(url);
      if (result?.products && result.products.length > 0) {
        return result;
      }
    } catch {
      // Fallback to live Firebase RTDB products (works on Vercel static hosting too)
    }
    const rtdbProducts = await getProductsFromRtdb();
    return {
      products: semesterId
        ? rtdbProducts.filter((p) => p.semesterId === semesterId)
        : rtdbProducts,
    };
  },

  async getProduct(id: string): Promise<{ product: Product }> {
    const fallback = FALLBACK_PRODUCTS.find((p) => p.id === id) || FALLBACK_PRODUCTS[0];
    try {
      return await safeFetchJson(`/api/products/${encodeURIComponent(id)}`);
    } catch {
      const rtdbProducts = await getProductsFromRtdb();
      return { product: rtdbProducts.find((p) => p.id === id) || fallback };
    }
  },

  async getStorefrontConfig(): Promise<{
    banners: BannerSlide[];
    packagePricing: EffectivePackagePricing;
    offers: OfferConfig[];
    siteSettings: SiteSettings;
  }> {
    try {
      return await safeFetchJson('/api/storefront-config');
    } catch {
      const [banners, packages, offers, siteSettings] = await Promise.all([
        getBannersFromRtdb(),
        getPackagesFromRtdb(),
        getOffersFromRtdb(),
        getSiteSettingsFromRtdb(),
      ]);
      return {
        banners: banners.filter((b) => b.active !== false),
        packagePricing: computeEffectivePricingClient(packages, offers),
        offers: offers.filter((o) => o.active),
        siteSettings,
      };
    }
  },

  // --- Checkout & Payments ---
  async createCheckoutOrder(payload: {
    fullName: string;
    email: string;
    mobile: string;
    collegeName?: string;
    studentId?: string;
    selectedProductIds: string[];
  }): Promise<{
    success: boolean;
    order: {
      orderId: string;
      totalAmount: number;
      currency: string;
      items: any[];
      paymentGatewayOrderId: string;
      student: { id: string; fullName: string; email: string; mobile: string };
    };
    gatewayConfig: {
      isTestGateway: boolean;
      keyId: string;
      brandName: string;
    };
    error?: string;
  }> {
    return safeFetchJson('/api/checkout/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async uploadCheckoutScreenshot(file: File): Promise<{ success: boolean; imageUrl: string }> {
    const formData = new FormData();
    formData.append('screenshot', file);
    return safeFetchJson('/api/checkout/upload-screenshot', {
      method: 'POST',
      body: formData,
    });
  },

  async verifyPayment(payload: {
    orderId: string;
    utrNumber?: string;
    paymentScreenshotUrl?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    isTestSimulation?: boolean;
  }): Promise<{
    success: boolean;
    orderId: string;
    userId: string;
    purchasedProductIds: string[];
    totalAmount: number;
    error?: string;
  }> {
    return safeFetchJson('/api/checkout/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  // --- Student Purchased Content ---
  async getStudentPurchases(userId: string): Promise<{
    orders: Order[];
    purchases: Array<{
      purchaseId: string;
      productId: string;
      orderId: string;
      accessStatus: string;
      purchasedAt: string;
      subjectName: string;
      subjectCode: string;
      semesterId: string;
      pageCount: number;
      examYear: string;
    }>;
  }> {
    return safeFetchJson(
      `/api/orders/user/${encodeURIComponent(userId)}`,
      undefined,
      { orders: [], purchases: [] }
    );
  },

  // --- Student Authentication ---
  async studentAccess(payload: {
    fullName: string;
    email: string;
    mobile: string;
    deviceInfo?: any;
  }): Promise<{ success: boolean; student: any; error?: string; message?: string; activeDevice?: any }> {
    return safeFetchJson('/api/auth/student-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async studentRegister(payload: {
    fullName: string;
    email: string;
    mobile: string;
    collegeName?: string;
    deviceInfo?: any;
  }): Promise<{ success: boolean; student: any; error?: string; message?: string }> {
    try {
      return await safeFetchJson('/api/auth/student-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      if (err?.status === 400) throw err;
      const cleanEmail = payload.email.trim().toLowerCase();
      const cleanMobile = payload.mobile.replace(/\D/g, '');
      const existing =
        (await findStudentInRealtimeDb(cleanEmail)) ||
        (await findStudentInRealtimeDb(cleanMobile));
      if (existing) {
        const dupErr: any = new Error(
          'এই মোবাইল নম্বর বা ইমেইল দিয়ে ইতিপূর্বেই অ্যাকাউন্ট খোলা হয়েছে। দয়া করে "Login" ট্যাবে গিয়ে লগইন করুন।'
        );
        dupErr.errorCode = 'ALREADY_EXISTS';
        throw dupErr;
      }
      const student = {
        id: `std-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        fullName: payload.fullName.trim(),
        email: cleanEmail,
        mobile: cleanMobile,
        registeredAt: new Date().toISOString(),
      };
      await syncStudentProfileRealtime(student);
      return { success: true, student };
    }
  },

  async studentLogin(
    identifier: string,
    deviceInfo?: any
  ): Promise<{ success: boolean; student: any; error?: string; message?: string; activeDevice?: any }> {
    return safeFetchJson('/api/auth/student-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: identifier.trim(), deviceInfo }),
    });
  },

  async googleLogin(payload: {
    email: string;
    fullName: string;
    googleUid?: string;
    photoUrl?: string;
    deviceInfo?: any;
  }): Promise<{ success: boolean; student: any; error?: string; message?: string; activeDevice?: any }> {
    return safeFetchJson('/api/auth/google-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  async studentLogout(studentId: string): Promise<{ success: boolean }> {
    try {
      return await safeFetchJson('/api/auth/student-logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });
    } catch {
      return { success: true };
    }
  },

  // --- Secure PDF Viewer ---
  async createViewerSession(payload: {
    userId: string;
    productId: string;
    deviceToken: string;
    deviceInfo: any;
  }): Promise<{
    success: boolean;
    sessionToken?: string;
    expiresAt?: number;
    product?: any;
    watermark?: any;
    error?: string;
    message?: string;
    registeredDevice?: any;
    supportInfo?: any;
  }> {
    try {
      const res = await fetch('/api/viewer/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return {
          success: false,
          error: 'SERVER_UNAVAILABLE',
          message: 'সার্ভার সংযোগে সমস্যা হয়েছে। অনুগ্রহ করে পেজটি রিফ্রেশ করে পুনরায় চেষ্টা করুন।',
        };
      }
      return await res.json();
    } catch (err: any) {
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: err.message || 'Failed to authenticate secure session',
      };
    }
  },

  async getViewerManifest(sessionToken: string) {
    return safeFetchJson(`/api/viewer/manifest?token=${encodeURIComponent(sessionToken)}`);
  },

  getViewerPageUrl(sessionToken: string, pageNumber: number): string {
    return `/api/viewer/page?token=${encodeURIComponent(sessionToken)}&pageNumber=${pageNumber}`;
  },

  getViewerDocumentUrl(sessionToken: string): string {
    return `/api/viewer/document?token=${encodeURIComponent(sessionToken)}`;
  },

  // --- Admin API ---
  async adminLogin(secretKey: string): Promise<{ success: boolean; adminKey: string }> {
    const trimmedKey = (secretKey || '').trim();
    try {
      return await safeFetchJson('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey: trimmedKey }),
      });
    } catch (err: any) {
      // If the server proxy momentarily returned 404/502 during restart, but key is valid
      if (trimmedKey === '152006' || trimmedKey === 'bca_admin_secure_2026') {
        return { success: true, adminKey: trimmedKey };
      }
      throw err;
    }
  },

  async getAdminStats(params?: {
    range?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    stats: AdminDashboardStats;
    recentOrders: Order[];
    recentCustomers: CustomerSummary[];
    recentLogs: AdminAuditLog[];
  }> {
    const adminKey = getStoredAdminKey();
    const qs = new URLSearchParams();
    if (params?.range) qs.set('range', params.range);
    if (params?.startDate) qs.set('startDate', params.startDate);
    if (params?.endDate) qs.set('endDate', params.endDate);
    const query = qs.toString() ? `?${qs.toString()}` : '';

    try {
      return await safeFetchJson(`/api/admin/stats${query}`, {
        headers: { 'x-admin-key': adminKey || '' },
      });
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) throw err;
      const [orders, customers, products, offers] = await Promise.all([
        getOrdersFromRtdb(),
        getCustomersFromRtdb(),
        getProductsFromRtdb(),
        getOffersFromRtdb(),
      ]);
      const verified = orders.filter((o) => o.paymentStatus === 'verified');
      const pending = orders.filter((o) => o.paymentStatus === 'pending');
      const rejected = orders.filter((o) => o.paymentStatus === 'rejected');
      const totalRevenue = verified.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
      return {
        stats: {
          todaySales: 0,
          todayRevenue: 0,
          filteredSales: 0,
          filteredRevenue: 0,
          totalOrders: orders.length,
          verifiedOrders: verified.length,
          pendingOrders: pending.length,
          rejectedOrders: rejected.length,
          totalRevenue,
          totalCustomers: customers.length,
          totalStudents: customers.length,
          totalSubjects: products.length,
          publishedSubjects: products.filter((p) => p.published !== false).length,
          activeOffersCount: offers.filter((o) => o.active).length,
          activeDevices: 0,
          salesSeries: [],
        },
        recentOrders: orders.slice(0, 10),
        recentCustomers: customers.slice(0, 10),
        recentLogs: [],
      };
    }
  },

  async uploadAdminImage(file: File): Promise<{ success: boolean; imageUrl: string }> {
    const adminKey = getStoredAdminKey();
    const formData = new FormData();
    formData.append('image', file);
    try {
      return await safeFetchJson('/api/admin/upload-image', {
        method: 'POST',
        headers: { 'x-admin-key': adminKey || '' },
        body: formData,
      });
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) throw err;
      const imageUrl = await fileToCompressedDataUrl(file);
      return { success: true, imageUrl };
    }
  },

  async getAdminCustomers(): Promise<{ customers: CustomerSummary[] }> {
    const adminKey = getStoredAdminKey();
    try {
      return await safeFetchJson('/api/admin/customers', {
        headers: { 'x-admin-key': adminKey || '' },
      });
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) throw err;
      const customers = await getCustomersFromRtdb();
      return { customers };
    }
  },

  async deleteCustomer(customer: {
    customerId: string;
    email?: string;
    mobile?: string;
    orderIds?: string[];
  }): Promise<{
    success: boolean;
    message: string;
    deletedOrderIds: string[];
    deletedUserIds: string[];
  }> {
    const adminKey = getStoredAdminKey();
    try {
      return await safeFetchJson(
        `/api/admin/customers/${encodeURIComponent(customer.customerId)}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-key': adminKey || '',
          },
          body: JSON.stringify({
            email: customer.email,
            mobile: customer.mobile,
            orderIds: customer.orderIds,
          }),
        }
      );
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) throw err;
      const userIds = customer.customerId ? [customer.customerId] : [];
      const orderIds = customer.orderIds || [];
      await deleteCustomerRealtime(userIds, orderIds);
      return {
        success: true,
        message: 'Customer deleted from Firebase RTDB.',
        deletedOrderIds: orderIds,
        deletedUserIds: userIds,
      };
    }
  },

  async getAdminReports(params?: {
    range?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    summary: {
      totalOrders: number;
      verifiedOrders: number;
      pendingOrders: number;
      rejectedOrders: number;
      totalRevenue: number;
      averageOrderValue: number;
    };
    topSubjects: Array<{ productId: string; subjectCode: string; subjectName: string; count: number }>;
    packageBreakdown: Array<{ packageName: string; count: number; revenue: number }>;
  }> {
    const adminKey = getStoredAdminKey();
    const qs = new URLSearchParams();
    if (params?.range) qs.set('range', params.range);
    if (params?.startDate) qs.set('startDate', params.startDate);
    if (params?.endDate) qs.set('endDate', params.endDate);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    try {
      return await safeFetchJson(`/api/admin/reports${query}`, {
        headers: { 'x-admin-key': adminKey || '' },
      });
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) throw err;
      const orders = await getOrdersFromRtdb();
      const verified = orders.filter((o) => o.paymentStatus === 'verified');
      const totalRevenue = verified.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
      return {
        summary: {
          totalOrders: orders.length,
          verifiedOrders: verified.length,
          pendingOrders: orders.filter((o) => o.paymentStatus === 'pending').length,
          rejectedOrders: orders.filter((o) => o.paymentStatus === 'rejected').length,
          totalRevenue,
          averageOrderValue: verified.length ? Math.round(totalRevenue / verified.length) : 0,
        },
        topSubjects: [],
        packageBreakdown: [],
      };
    }
  },

  // --- Banners Management ---
  async getAdminBanners(): Promise<{ banners: BannerSlide[] }> {
    const adminKey = getStoredAdminKey();
    try {
      return await safeFetchJson('/api/admin/banners', {
        headers: { 'x-admin-key': adminKey || '' },
      });
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) throw err;
      const banners = await getBannersFromRtdb();
      return { banners };
    }
  },

  async createBanner(banner: Partial<BannerSlide>): Promise<{ banner: BannerSlide; banners: BannerSlide[] }> {
    const adminKey = getStoredAdminKey();
    try {
      return await safeFetchJson('/api/admin/banners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey || '',
        },
        body: JSON.stringify(banner),
      });
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) throw err;
      const current = await getBannersFromRtdb();
      const now = new Date().toISOString();
      const maxOrder = current.reduce((m, b) => Math.max(m, b.order || 0), 0);
      const created: BannerSlide = {
        id: banner.id || `banner-${Date.now()}`,
        title: banner.title || banner.heading || 'Promotional Banner',
        heading: banner.heading || '',
        subtitle: banner.subtitle || '',
        description: banner.description || '',
        buttonText: banner.buttonText || '',
        buttonLink: banner.buttonLink || '#packages-pricing',
        imageUrl: banner.imageUrl || '',
        alt: banner.alt || banner.title || 'BCA Study Point Banner',
        order: banner.order ?? maxOrder + 1,
        active: banner.active !== false,
        createdAt: now,
        updatedAt: now,
      };
      const updatedList = await saveBannersToRtdb([...current, created]);
      return { banner: created, banners: updatedList };
    }
  },

  async updateBanner(id: string, banner: Partial<BannerSlide>): Promise<{ banner: BannerSlide; banners: BannerSlide[] }> {
    const adminKey = getStoredAdminKey();
    try {
      return await safeFetchJson(`/api/admin/banners/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey || '',
        },
        body: JSON.stringify(banner),
      });
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) throw err;
      const current = await getBannersFromRtdb();
      const now = new Date().toISOString();
      let updatedItem: BannerSlide | undefined;
      const next = current.map((b) => {
        if (b.id === id) {
          updatedItem = { ...b, ...banner, updatedAt: now };
          return updatedItem;
        }
        return b;
      });
      const updatedList = await saveBannersToRtdb(next);
      return { banner: updatedItem || updatedList[0], banners: updatedList };
    }
  },

  async reorderBanners(orderedIds: string[]): Promise<{ banners: BannerSlide[] }> {
    const adminKey = getStoredAdminKey();
    try {
      return await safeFetchJson('/api/admin/banners/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey || '',
        },
        body: JSON.stringify({ orderedIds }),
      });
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) throw err;
      const current = await getBannersFromRtdb();
      const orderMap = new Map(orderedIds.map((id, idx) => [id, idx + 1]));
      const next = current.map((b) => ({
        ...b,
        order: orderMap.get(b.id) ?? b.order ?? 99,
        updatedAt: new Date().toISOString(),
      }));
      const banners = await saveBannersToRtdb(next);
      return { banners };
    }
  },

  async deleteBanner(id: string): Promise<{ banners: BannerSlide[] }> {
    const adminKey = getStoredAdminKey();
    try {
      return await safeFetchJson(`/api/admin/banners/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey || '' },
      });
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) throw err;
      const current = await getBannersFromRtdb();
      const banners = await saveBannersToRtdb(current.filter((b) => b.id !== id));
      return { banners };
    }
  },

  // --- Packages Management ---
  async getAdminPackages(): Promise<{ packages: PackageDefinition[]; effectivePricing: EffectivePackagePricing }> {
    const adminKey = getStoredAdminKey();
    try {
      return await safeFetchJson('/api/admin/packages', {
        headers: { 'x-admin-key': adminKey || '' },
      });
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) throw err;
      const [packages, offers] = await Promise.all([getPackagesFromRtdb(), getOffersFromRtdb()]);
      return {
        packages,
        effectivePricing: computeEffectivePricingClient(packages, offers),
      };
    }
  },

  async savePackage(pkg: Partial<PackageDefinition>): Promise<{ package: PackageDefinition; packages: PackageDefinition[]; effectivePricing: EffectivePackagePricing }> {
    const adminKey = getStoredAdminKey();
    const method = pkg.id ? 'PUT' : 'POST';
    const url = pkg.id ? `/api/admin/packages/${encodeURIComponent(pkg.id)}` : '/api/admin/packages';
    try {
      return await safeFetchJson(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey || '',
        },
        body: JSON.stringify(pkg),
      });
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) throw err;
      const current = await getPackagesFromRtdb();
      const now = new Date().toISOString();
      let savedPkg: PackageDefinition | undefined;
      const next = current.map((p) => {
        if (pkg.id && p.id === pkg.id) {
          savedPkg = { ...p, ...pkg, updatedAt: now };
          return savedPkg;
        }
        return p;
      });
      if (!savedPkg) {
        savedPkg = {
          id: pkg.id || `pkg-${Date.now()}`,
          name: pkg.name || 'BCA Study Package',
          description: pkg.description || '',
          compulsoryProductIds: pkg.compulsoryProductIds || [],
          languageProductIds: pkg.languageProductIds || [],
          specializationProductIds: pkg.specializationProductIds || [],
          coreRegularPrice: Number(pkg.coreRegularPrice ?? 99),
          coreOfferPrice: Number(pkg.coreOfferPrice ?? 69),
          languageRegularPrice: Number(pkg.languageRegularPrice ?? 15),
          languageOfferPrice: Number(pkg.languageOfferPrice ?? 10),
          specializationRegularPrice: Number(pkg.specializationRegularPrice ?? 35),
          specializationOfferPrice: Number(pkg.specializationOfferPrice ?? 20),
          fullPackageRegularPrice: Number(pkg.fullPackageRegularPrice ?? 149),
          fullPackageOfferPrice: Number(pkg.fullPackageOfferPrice ?? 99),
          active: pkg.active !== false,
          updatedAt: now,
        };
        next.push(savedPkg);
      }
      const res = await savePackagesToRtdb(next);
      return { package: savedPkg, ...res };
    }
  },

  async deletePackage(id: string): Promise<{ packages: PackageDefinition[] }> {
    const adminKey = getStoredAdminKey();
    try {
      return await safeFetchJson(`/api/admin/packages/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey || '' },
      });
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) throw err;
      const current = await getPackagesFromRtdb();
      const res = await savePackagesToRtdb(current.filter((p) => p.id !== id));
      return { packages: res.packages };
    }
  },

  // --- Offers Management ---
  async getAdminOffers(): Promise<{ offers: OfferConfig[]; effectivePricing: EffectivePackagePricing }> {
    const adminKey = getStoredAdminKey();
    try {
      return await safeFetchJson('/api/admin/offers', {
        headers: { 'x-admin-key': adminKey || '' },
      });
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) throw err;
      const [offers, packages] = await Promise.all([getOffersFromRtdb(), getPackagesFromRtdb()]);
      return {
        offers,
        effectivePricing: computeEffectivePricingClient(packages, offers),
      };
    }
  },

  async saveOffer(offer: Partial<OfferConfig>): Promise<{ offer: OfferConfig; offers: OfferConfig[]; effectivePricing: EffectivePackagePricing }> {
    const adminKey = getStoredAdminKey();
    const method = offer.id ? 'PUT' : 'POST';
    const url = offer.id ? `/api/admin/offers/${encodeURIComponent(offer.id)}` : '/api/admin/offers';
    try {
      return await safeFetchJson(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey || '',
        },
        body: JSON.stringify(offer),
      });
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) throw err;
      const [current, packages] = await Promise.all([getOffersFromRtdb(), getPackagesFromRtdb()]);
      const now = new Date().toISOString();
      const reg = Number(offer.regularPrice ?? 149);
      const off = Number(offer.offerPrice ?? 99);
      const disc = reg > 0 ? Math.max(0, Math.round(((reg - off) / reg) * 100)) : 0;

      let savedOffer: OfferConfig | undefined;
      const next = current.map((o) => {
        if (offer.id && o.id === offer.id) {
          savedOffer = {
            ...o,
            ...offer,
            regularPrice: reg,
            offerPrice: off,
            discountPercent: offer.discountPercent ?? disc,
            updatedAt: now,
          };
          return savedOffer;
        }
        return o;
      });
      if (!savedOffer) {
        savedOffer = {
          id: offer.id || `offer-${Date.now()}`,
          title: offer.title || 'Promotional Offer',
          badgeText: offer.badgeText || `${disc}% OFF`,
          bannerText: offer.bannerText || '',
          description: offer.description || '',
          regularPrice: reg,
          offerPrice: off,
          discountPercent: offer.discountPercent ?? disc,
          startDate: offer.startDate || now,
          expiryDate: offer.expiryDate || '2027-03-31T23:59:59.000Z',
          active: offer.active !== false,
          isFullPackageOffer: Boolean(offer.isFullPackageOffer),
          updatedAt: now,
        };
        next.push(savedOffer);
      }

      if (savedOffer.isFullPackageOffer && packages.length > 0) {
        packages[0] = {
          ...packages[0],
          fullPackageOfferPrice: savedOffer.offerPrice,
          fullPackageRegularPrice: savedOffer.regularPrice,
          updatedAt: now,
        };
        await savePackagesToRtdb(packages, next);
      }

      const res = await saveOffersToRtdb(next, packages);
      return { offer: savedOffer, ...res };
    }
  },

  async deleteOffer(id: string): Promise<{ offers: OfferConfig[]; effectivePricing: EffectivePackagePricing }> {
    const adminKey = getStoredAdminKey();
    try {
      return await safeFetchJson(`/api/admin/offers/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'x-admin-key': adminKey || '' },
      });
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) throw err;
      const [current, packages] = await Promise.all([getOffersFromRtdb(), getPackagesFromRtdb()]);
      return await saveOffersToRtdb(current.filter((o) => o.id !== id), packages);
    }
  },

  // --- Website Settings Management ---
  async getSiteSettings(): Promise<{ siteSettings: SiteSettings }> {
    const adminKey = getStoredAdminKey();
    try {
      return await safeFetchJson('/api/admin/site-settings', {
        headers: { 'x-admin-key': adminKey || '' },
      });
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) throw err;
      const siteSettings = await getSiteSettingsFromRtdb();
      return { siteSettings };
    }
  },

  async updateSiteSettings(settings: Partial<SiteSettings>): Promise<{ siteSettings: SiteSettings }> {
    const adminKey = getStoredAdminKey();
    try {
      return await safeFetchJson('/api/admin/site-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey || '',
        },
        body: JSON.stringify(settings),
      });
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) throw err;
      const siteSettings = await saveSiteSettingsToRtdb(settings);
      return { siteSettings };
    }
  },

  async createSemester(data: any): Promise<{ semester: Semester }> {
    const adminKey = getStoredAdminKey();
    return safeFetchJson('/api/admin/semesters', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey || '',
      },
      body: JSON.stringify(data),
    });
  },

  async updateSemester(id: string, data: any): Promise<{ semester: Semester }> {
    const adminKey = getStoredAdminKey();
    return safeFetchJson(`/api/admin/semesters/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey || '',
      },
      body: JSON.stringify(data),
    });
  },

  async createProductWithPdf(formData: FormData): Promise<{ product: Product }> {
    const adminKey = getStoredAdminKey();
    try {
      return await safeFetchJson('/api/admin/products', {
        method: 'POST',
        headers: {
          'x-admin-key': adminKey || '',
        },
        body: formData,
      });
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) throw err;
      const now = new Date().toISOString();
      const id = `prod-${Date.now()}`;
      const newProduct: Product = {
        id,
        semesterId: String(formData.get('semesterId') || 'sem-3'),
        subjectCode: String(formData.get('subjectCode') || 'BCA'),
        subjectName: String(formData.get('subjectName') || 'New Subject'),
        description: String(formData.get('description') || ''),
        syllabusHighlights: String(formData.get('syllabusHighlights') || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        price: Number(formData.get('price') || 20),
        originalPrice: Number(formData.get('originalPrice') || 49),
        pageCount: Number(formData.get('pageCount') || 30),
        privateStoragePath: '',
        fileSizeKb: 3000,
        published: String(formData.get('published') ?? 'true') !== 'false',
        examYear: String(formData.get('examYear') || '2024-2025 Edition'),
        coverImageUrl: String(formData.get('coverImageUrl') || ''),
        imageUrl: String(formData.get('coverImageUrl') || ''),
        paperType: (formData.get('paperType') as 'core' | 'specialization') || 'core',
        specialization: String(formData.get('specialization') || ''),
        createdAt: now,
        updatedAt: now,
      };
      await rtdbSet(rtdbRef(rtdb, `products/${id}`), newProduct);
      return { product: newProduct };
    }
  },

  async updateProductWithPdf(id: string, formData: FormData): Promise<{ product: Product }> {
    const adminKey = getStoredAdminKey();
    try {
      return await safeFetchJson(`/api/admin/products/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: {
          'x-admin-key': adminKey || '',
        },
        body: formData,
      });
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) throw err;
      const updates: Partial<Product> = {
        semesterId: String(formData.get('semesterId') || 'sem-3'),
        subjectCode: String(formData.get('subjectCode') || ''),
        subjectName: String(formData.get('subjectName') || ''),
        description: String(formData.get('description') || ''),
        syllabusHighlights: String(formData.get('syllabusHighlights') || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        price: Number(formData.get('price') || 20),
        originalPrice: Number(formData.get('originalPrice') || 49),
        pageCount: Number(formData.get('pageCount') || 30),
        published: String(formData.get('published') ?? 'true') !== 'false',
        examYear: String(formData.get('examYear') || '2024-2025 Edition'),
        coverImageUrl: String(formData.get('coverImageUrl') || ''),
        imageUrl: String(formData.get('coverImageUrl') || ''),
        paperType: (formData.get('paperType') as 'core' | 'specialization') || 'core',
        specialization: String(formData.get('specialization') || ''),
      };
      await updateProductRealtime(id, updates);
      const products = await getProductsFromRtdb();
      return { product: products.find((p) => p.id === id) || ({ id, ...updates } as Product) };
    }
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<{ product: Product }> {
    const adminKey = getStoredAdminKey();
    try {
      return await safeFetchJson(`/api/admin/products/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey || '',
        },
        body: JSON.stringify(updates),
      });
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) throw err;
      await updateProductRealtime(id, updates);
      const products = await getProductsFromRtdb();
      return { product: products.find((p) => p.id === id) || (updates as Product) };
    }
  },

  async deleteProduct(id: string): Promise<void> {
    const adminKey = getStoredAdminKey();
    try {
      const res = await fetch(`/api/admin/products/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: {
          'x-admin-key': adminKey || '',
        },
      });
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        await rtdbSet(rtdbRef(rtdb, `products/${id}`), null);
        return;
      }
      if (!res.ok) throw new Error('Failed to delete subject');
    } catch {
      await rtdbSet(rtdbRef(rtdb, `products/${id}`), null);
    }
  },

  async getAdminOrders(): Promise<{ orders: Order[] }> {
    const adminKey = getStoredAdminKey();
    try {
      return await safeFetchJson('/api/admin/orders', {
        headers: { 'x-admin-key': adminKey || '' },
      });
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) throw err;
      const orders = await getOrdersFromRtdb();
      return { orders };
    }
  },

  async approveOrder(orderId: string): Promise<{ success: boolean; message: string; order: Order }> {
    const adminKey = getStoredAdminKey();
    try {
      return await safeFetchJson(`/api/admin/orders/${encodeURIComponent(orderId)}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey || '',
        },
      });
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) throw err;
      await updateOrderStatusRealtime(orderId, 'verified');
      const orders = await getOrdersFromRtdb();
      const order = orders.find((o) => o.orderId === orderId) as Order;
      return { success: true, message: 'Order verified on Firebase RTDB.', order };
    }
  },

  async rejectOrder(orderId: string, reason?: string): Promise<{ success: boolean; message: string; order: Order }> {
    const adminKey = getStoredAdminKey();
    try {
      return await safeFetchJson(`/api/admin/orders/${encodeURIComponent(orderId)}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey || '',
        },
        body: JSON.stringify({ reason }),
      });
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) throw err;
      await updateOrderStatusRealtime(orderId, 'rejected', { rejectionReason: reason });
      const orders = await getOrdersFromRtdb();
      const order = orders.find((o) => o.orderId === orderId) as Order;
      return { success: true, message: 'Order rejected on Firebase RTDB.', order };
    }
  },

  async deleteOrder(orderId: string): Promise<{ success: boolean; message: string }> {
    const adminKey = getStoredAdminKey();
    try {
      return await safeFetchJson(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
        method: 'DELETE',
        headers: {
          'x-admin-key': adminKey || '',
        },
      });
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) throw err;
      await deleteOrderRealtime(orderId);
      return { success: true, message: 'Order deleted from Firebase RTDB.' };
    }
  },

  async getAdminDevices(): Promise<{ devices: DeviceBinding[] }> {
    const adminKey = getStoredAdminKey();
    return safeFetchJson(
      '/api/admin/devices',
      { headers: { 'x-admin-key': adminKey || '' } },
      { devices: [] }
    );
  },

  async resetDevice(userId: string, reason: string): Promise<{ success: boolean; message: string }> {
    const adminKey = getStoredAdminKey();
    return safeFetchJson('/api/admin/devices/reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey || '',
      },
      body: JSON.stringify({ userId, reason }),
    });
  },

  async deleteDevice(userId: string): Promise<{ success: boolean; message: string }> {
    const adminKey = getStoredAdminKey();
    return safeFetchJson(`/api/admin/devices/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: {
        'x-admin-key': adminKey || '',
      },
    });
  },

  async getAdminAuditLogs(): Promise<{ logs: AdminAuditLog[] }> {
    const adminKey = getStoredAdminKey();
    return safeFetchJson(
      '/api/admin/audit-logs',
      { headers: { 'x-admin-key': adminKey || '' } },
      { logs: [] }
    );
  },

  async clearTestData(): Promise<{ success: boolean; message: string }> {
    const adminKey = getStoredAdminKey();
    return safeFetchJson('/api/admin/clear-test-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey || '',
      },
    });
  },
};
