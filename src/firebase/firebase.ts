import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import {
  getDatabase,
  ref as rtdbRef,
  set as rtdbSet,
  get as rtdbGet,
  onValue as rtdbOnValue,
  update as rtdbUpdate,
} from 'firebase/database';
import { firebaseConfig } from './config';
import type {
  Product,
  Student,
  BannerSlide,
  PackageDefinition,
  EffectivePackagePricing,
  SiteSettings,
  OfferConfig,
  Order,
  CustomerSummary,
  CustomerPurchasedSubject,
} from '../types';
import { FALLBACK_PRODUCTS } from '../constants/fallbackProducts';

// Initialize Firebase App singleton with official config
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const rtdb = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.warn('Firebase Notice:', JSON.stringify(errInfo));
  return errInfo;
}

/**
 * Synchronize all official BCA products with 3D textbook covers
 * into Firebase Realtime Database (RTDB). Only invoke explicitly from Admin Panel or if RTDB is empty.
 */
export async function syncAllOfficialProductsToFirestore(): Promise<{ success: boolean; count: number; error?: string }> {
  const now = new Date().toISOString();

  try {
    const productsObj: Record<string, any> = {};
    for (const prod of FALLBACK_PRODUCTS) {
      productsObj[prod.id] = {
        ...prod,
        updatedAt: now,
      };
    }
    await rtdbSet(rtdbRef(rtdb, 'products'), productsObj);
    return { success: true, count: FALLBACK_PRODUCTS.length };
  } catch (err: any) {
    console.warn('RTDB sync notice:', err?.message || err);
    return { success: false, count: 0, error: err?.message };
  }
}

/**
 * Real-time Listener for Question Bank Products (RTDB)
 * Respects Admin-edited prices, descriptions, specialization, and images without overwriting them.
 */
export function subscribeToProductsRealtime(
  onUpdate: (products: Product[]) => void,
  onError?: (err: any) => void
): () => void {
  const productsRef = rtdbRef(rtdb, 'products');

  const unsubscribe = rtdbOnValue(
    productsRef,
    (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        onUpdate(FALLBACK_PRODUCTS);
        return;
      }

      const products: Product[] = [];
      const keys = Object.keys(data);
      for (const key of keys) {
        const item = data[key];
        if (!item || typeof item !== 'object') continue;
        const fallback = FALLBACK_PRODUCTS.find((p) => p.id === key || p.id === item.id);
        const resolvedCover = item.coverImageUrl ?? item.imageUrl ?? fallback?.coverImageUrl ?? '';

        products.push({
          id: item.id || key,
          semesterId: item.semesterId || 'sem-3',
          subjectCode: item.subjectCode || fallback?.subjectCode || '',
          subjectName: item.subjectName || fallback?.subjectName || '',
          description: item.description ?? fallback?.description ?? '',
          syllabusHighlights: item.syllabusHighlights || fallback?.syllabusHighlights || [],
          price: item.price !== undefined ? Number(item.price) : (fallback?.price ?? 20),
          originalPrice:
            item.originalPrice !== undefined
              ? Number(item.originalPrice)
              : fallback?.originalPrice,
          pageCount: Number(item.pageCount) || fallback?.pageCount || 30,
          privateStoragePath: item.privateStoragePath || fallback?.privateStoragePath || '',
          fileSizeKb: Number(item.fileSizeKb) || fallback?.fileSizeKb || 3000,
          published: item.published !== false,
          examYear: item.examYear || fallback?.examYear || '2024-2025 Edition',
          coverImageUrl: resolvedCover,
          imageUrl: resolvedCover,
          paperType: item.paperType || fallback?.paperType || 'core',
          specialization: item.specialization || fallback?.specialization,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString(),
        });
      }

      // Sort consistently by Core first, then Specialization
      products.sort((a, b) => {
        if (a.paperType === 'core' && b.paperType !== 'core') return -1;
        if (a.paperType !== 'core' && b.paperType === 'core') return 1;
        return a.subjectCode.localeCompare(b.subjectCode);
      });

      onUpdate(products);
    },
    (error) => {
      console.warn('Realtime Database products listener notice:', error);
      if (onError) onError(error);
    }
  );

  return unsubscribe;
}

/**
 * Real-time Listener for Homepage Sliding Banners
 */
export function subscribeToBannersRealtime(
  onUpdate: (banners: BannerSlide[]) => void
): () => void {
  const bannersRef = rtdbRef(rtdb, 'banners');
  return rtdbOnValue(
    bannersRef,
    (snapshot) => {
      const data = snapshot.val();
      if (!data || typeof data !== 'object') return;
      const list: BannerSlide[] = Object.values(data).filter(
        (b: any) => b && typeof b === 'object' && b.imageUrl
      ) as BannerSlide[];
      list.sort((a, b) => (a.order || 0) - (b.order || 0));
      onUpdate(list);
    },
    (err) => console.warn('RTDB banners listener notice:', err)
  );
}

/**
 * Real-time Listener for Effective Package & Offer Pricing
 */
export function subscribeToEffectivePricingRealtime(
  onUpdate: (pricing: EffectivePackagePricing) => void
): () => void {
  const pricingRef = rtdbRef(rtdb, 'packagePricing');
  return rtdbOnValue(
    pricingRef,
    (snapshot) => {
      const data = snapshot.val();
      if (data && typeof data === 'object' && data.core) {
        onUpdate(data as EffectivePackagePricing);
      }
    },
    (err) => console.warn('RTDB packagePricing listener notice:', err)
  );
}

/**
 * Real-time Listener for Offers
 */
export function subscribeToOffersRealtime(
  onUpdate: (offers: OfferConfig[]) => void
): () => void {
  const offersRef = rtdbRef(rtdb, 'offers');
  return rtdbOnValue(
    offersRef,
    (snapshot) => {
      const data = snapshot.val();
      if (!data || typeof data !== 'object') return;
      onUpdate(Object.values(data) as OfferConfig[]);
    },
    (err) => console.warn('RTDB offers listener notice:', err)
  );
}

/**
 * Real-time Listener for Website Settings (Announcements, Payment Info, Homepage Copy)
 */
export function subscribeToSiteSettingsRealtime(
  onUpdate: (settings: SiteSettings) => void
): () => void {
  const settingsRef = rtdbRef(rtdb, 'siteSettings');
  return rtdbOnValue(
    settingsRef,
    (snapshot) => {
      const data = snapshot.val();
      if (data && typeof data === 'object') {
        onUpdate(data as SiteSettings);
      }
    },
    (err) => console.warn('RTDB siteSettings listener notice:', err)
  );
}

/**
 * Real-time Update Product in Firebase Realtime Database
 */
export async function updateProductRealtime(
  productId: string,
  updates: Partial<Product>
): Promise<void> {
  const now = new Date().toISOString();
  const payload = {
    ...updates,
    updatedAt: now,
  };

  try {
    await rtdbUpdate(rtdbRef(rtdb, `products/${productId}`), payload);
  } catch (e) {
    console.warn('RTDB product update error:', e);
  }
}

/**
 * Real-time Student Profile Sync
 * Saves student registration and details securely to Firebase Firestore & Realtime Database
 * Note: PASSWORDS ARE NEVER STORED IN FIRESTORE OR DATABASE.
 */
export async function saveStudentProfileFirestore(student: {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  collegeName?: string;
  studentId?: string;
}): Promise<void> {
  const now = new Date().toISOString();
  const safeProfile = {
    id: student.id,
    fullName: student.fullName,
    email: student.email,
    mobile: student.mobile,
    collegeName: student.collegeName || '',
    studentId: student.studentId || '',
    updatedAt: now,
  };

  try {
    await setDoc(doc(firestore, 'students', student.id), safeProfile, { merge: true });
  } catch (err) {
    console.warn('Firestore profile save note:', err);
  }
}

export async function getStudentProfileFirestore(studentId: string): Promise<any | null> {
  try {
    const snap = await getDoc(doc(firestore, 'students', studentId));
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    console.warn('Firestore profile get note:', err);
    return null;
  }
}

export async function syncStudentProfileRealtime(student: {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  collegeName?: string;
  studentId?: string;
  registeredAt?: string;
}): Promise<void> {
  const now = new Date().toISOString();
  const studentData: Record<string, any> = {
    id: student.id,
    fullName: student.fullName,
    email: student.email.trim().toLowerCase(),
    mobile: student.mobile,
    collegeName: student.collegeName || '',
    studentId: student.studentId || '',
    registeredAt: student.registeredAt || now,
    updatedAt: now,
    lastActive: now,
  };

  try {
    await rtdbUpdate(rtdbRef(rtdb, `students/${student.id}`), studentData);
  } catch (e) {
    console.warn('RTDB student sync error:', e);
  }

  // Also sync to Firestore for cross-database redundancy
  saveStudentProfileFirestore(student).catch(() => {});
}

/**
 * Direct Firebase Realtime Database lookup for student login by Email ID or Mobile Number
 */
export async function findStudentInRealtimeDb(identifier: string): Promise<Student | null> {
  const clean = identifier.trim().toLowerCase();
  const cleanDigits = identifier.replace(/\D/g, '');
  if (!clean) return null;

  try {
    const snap = await rtdbGet(rtdbRef(rtdb, 'students'));
    const data = snap.val();
    if (data && typeof data === 'object') {
      for (const [key, val] of Object.entries<any>(data)) {
        if (!val || typeof val !== 'object') continue;
        const email = String(val.email || '').trim().toLowerCase();
        const mobile = String(val.mobile || '').replace(/\D/g, '');
        if (
          (email && email === clean) ||
          (cleanDigits.length >= 10 && mobile === cleanDigits)
        ) {
          return {
            id: val.id || key,
            fullName: val.fullName || 'BCA Student',
            email: email || `${mobile}@student.bcastudypoint.com`,
            mobile: val.mobile || mobile,
            collegeName: val.collegeName,
            studentId: val.studentId,
            registeredAt: val.registeredAt || val.createdAt || val.updatedAt || new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };
        }
      }
    }

    // Fallback: check existing orders in RTDB
    const ordSnap = await rtdbGet(rtdbRef(rtdb, 'orders'));
    const ordData = ordSnap.val();
    if (ordData && typeof ordData === 'object') {
      for (const val of Object.values<any>(ordData)) {
        if (!val || typeof val !== 'object') continue;
        const email = String(val.studentEmail || '').trim().toLowerCase();
        const mobile = String(val.studentMobile || '').replace(/\D/g, '');
        if (
          (email && email === clean) ||
          (cleanDigits.length >= 10 && mobile === cleanDigits)
        ) {
          return {
            id: val.userId || `std_${val.orderId || Date.now()}`,
            fullName: val.studentName || 'BCA Student',
            email: email || `${mobile}@student.bcastudypoint.com`,
            mobile: val.studentMobile || mobile,
            registeredAt: val.createdAt || new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };
        }
      }
    }
  } catch (e) {
    console.warn('RTDB findStudentInRealtimeDb notice:', e);
  }

  return null;
}

/**
 * Firebase Auth: Register with Email and Password
 * Passwords are encrypted and handled exclusively by Firebase Authentication
 */
export async function registerWithEmailPassword(
  email: string,
  pass: string,
  profile: { fullName: string; mobile: string; collegeName?: string }
) {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  if (cred.user) {
    await syncStudentProfileRealtime({
      id: cred.user.uid,
      fullName: profile.fullName,
      email: cred.user.email || email,
      mobile: profile.mobile,
      collegeName: profile.collegeName,
    });
  }
  return cred;
}

/**
 * Firebase Auth: Login with Email and Password
 */
export async function loginWithEmailPassword(email: string, pass: string) {
  return await signInWithEmailAndPassword(auth, email, pass);
}

/**
 * Real-time Student Profile Subscription via Realtime Database
 */
export function subscribeToStudentProfile(
  studentId: string,
  onUpdate: (student: Student | null) => void
): () => void {
  const studentRef = rtdbRef(rtdb, `students/${studentId}`);
  return rtdbOnValue(
    studentRef,
    (snapshot) => {
      const data = snapshot.val();
      if (data) {
        onUpdate({
          id: studentId,
          fullName: data.fullName || '',
          email: data.email || '',
          mobile: data.mobile || '',
          collegeName: data.collegeName,
          studentId: data.studentId,
          registeredAt: data.registeredAt || data.createdAt || new Date().toISOString(),
          lastLoginAt: data.lastLoginAt || new Date().toISOString(),
        });
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.warn('Student profile RTDB subscription notice:', err);
    }
  );
}

/**
 * Real-time Active Device Session Sync for Single-Device Enforcement
 */
export async function syncActiveDeviceRealtime(studentId: string, deviceData: any): Promise<void> {
  if (!studentId) return;
  const now = new Date().toISOString();
  try {
    await rtdbSet(rtdbRef(rtdb, `students/${studentId}/activeDevice`), {
      ...deviceData,
      loggedIn: true,
      lastSeenAt: now,
    });
  } catch (e) {
    console.warn('RTDB active device sync error:', e);
  }
}

/**
 * Real-time Release Active Device Session on Logout
 */
export async function releaseActiveDeviceRealtime(studentId: string): Promise<void> {
  if (!studentId) return;
  try {
    await rtdbSet(rtdbRef(rtdb, `students/${studentId}/activeDevice`), null);
  } catch (e) {
    console.warn('RTDB release active device error:', e);
  }
}

/**
 * Subscribe to student's active device changes in Realtime Database
 */
export function subscribeToActiveDeviceRealtime(
  studentId: string,
  onUpdate: (device: any) => void
): () => void {
  const deviceRef = rtdbRef(rtdb, `students/${studentId}/activeDevice`);
  return rtdbOnValue(deviceRef, (snapshot) => {
    onUpdate(snapshot.val());
  });
}

/**
 * Real-time Order Sync
 * Stores the order directly in Firebase Realtime Database
 */
export async function saveOrderRealtime(order: any): Promise<void> {
  const orderId = order.orderId || `ord_${Date.now()}`;
  const now = new Date().toISOString();
  const orderData = {
    ...order,
    orderId,
    updatedAt: now,
  };

  try {
    await rtdbSet(rtdbRef(rtdb, `orders/${orderId}`), orderData);
  } catch (e) {
    console.warn('RTDB order save error:', e);
  }
}

/**
 * Real-time Subscription to all Orders from Firebase Realtime Database
 * Used by AdminPanel to show all incoming live orders instantly
 * and by student My Notes to track verification status
 */
export function subscribeToOrdersRealtime(
  onUpdate: (orders: any[]) => void,
  onError?: (err: any) => void
): () => void {
  const ordersRef = rtdbRef(rtdb, 'orders');
  return rtdbOnValue(
    ordersRef,
    (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        onUpdate([]);
        return;
      }

      const ordersList: any[] = [];
      const keys = Object.keys(data);
      for (const key of keys) {
        const val = data[key];
        if (!val || typeof val !== 'object') continue;
        ordersList.push({
          orderId: val.orderId || key,
          userId: val.userId || `std_${val.orderId || key}`,
          studentName: val.studentName || 'Student',
          studentEmail: val.studentEmail || '',
          studentMobile: val.studentMobile || '',
          collegeName: val.collegeName || '',
          studentId: val.studentId || '',
          selectedProductIds: val.selectedProductIds || (val.items ? val.items.map((i: any) => i.productId) : []),
          items: val.items || [],
          totalAmount: Number(val.totalAmount) || 20,
          paymentStatus: val.paymentStatus || 'pending',
          paymentReference: val.paymentReference || val.utrNumber || '',
          paymentGatewayOrderId: val.paymentGatewayOrderId || '',
          paymentGatewayPaymentId: val.paymentGatewayPaymentId || '',
          paymentGatewaySignature: val.paymentGatewaySignature || '',
          ipAddress: val.ipAddress || '',
          userAgent: val.userAgent || '',
          createdAt: val.createdAt || new Date().toISOString(),
          verifiedAt: val.verifiedAt,
          rejectionReason: val.rejectionReason,
        });
      }

      // Sort newest orders first
      ordersList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(ordersList);
    },
    (err) => {
      console.warn('RTDB orders subscription notice:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Approve or update order status directly in Firebase Realtime Database
 */
export async function updateOrderStatusRealtime(
  orderId: string,
  paymentStatus: 'pending' | 'verified' | 'failed' | 'rejected',
  additionalData?: any
): Promise<void> {
  const now = new Date().toISOString();
  try {
    await rtdbUpdate(rtdbRef(rtdb, `orders/${orderId}`), {
      paymentStatus,
      updatedAt: now,
      ...(paymentStatus === 'verified' ? { verifiedAt: now } : {}),
      ...(additionalData || {}),
    });
  } catch (e) {
    console.warn('RTDB updateOrderStatusRealtime notice:', e);
  }
}

/**
 * Delete order from Firebase Realtime Database
 */
export async function deleteOrderRealtime(orderId: string): Promise<void> {
  try {
    await rtdbSet(rtdbRef(rtdb, `orders/${orderId}`), null);
  } catch (e) {
    console.warn('RTDB deleteOrderRealtime notice:', e);
  }
}

/**
 * Delete customer profile, orders, and device session from Firebase RTDB & Firestore
 */
export async function deleteCustomerRealtime(
  userIds: string[],
  orderIds: string[]
): Promise<void> {
  try {
    const ops: Promise<any>[] = [];
    for (const oid of orderIds) {
      if (oid) {
        ops.push(rtdbSet(rtdbRef(rtdb, `orders/${oid}`), null).catch(() => {}));
      }
    }
    for (const uid of userIds) {
      if (uid && !uid.startsWith('cust-')) {
        ops.push(rtdbSet(rtdbRef(rtdb, `students/${uid}`), null).catch(() => {}));
        // Fire-and-forget Firestore cleanup (Firestore client SDK can wait 15-30s on permission retries if awaited)
        deleteDoc(doc(firestore, 'students', uid)).catch(() => {});
      }
    }
    await Promise.race([
      Promise.allSettled(ops),
      new Promise<void>((resolve) => setTimeout(resolve, 1500)),
    ]);
  } catch (e) {
    console.warn('RTDB deleteCustomerRealtime notice:', e);
  }
}

// =========================================================================
// DIRECT FIREBASE RTDB FALLBACK ADAPTER (FOR VERCEL / STATIC LIVE HOSTING)
// Ensures Banners, Packages, Offers, SiteSettings, Products, Orders, and
// Customers load & save live even without the Express /api server.
// =========================================================================

const DEFAULT_CLIENT_BANNERS: BannerSlide[] = [
  {
    id: 'banner-welcome',
    title: 'Welcome to BCA STUDY POINT',
    heading: '',
    subtitle: '',
    description: '',
    buttonText: '',
    buttonLink: '#packages-pricing',
    imageUrl: '/assets/aistudio/Welcome_to_BCA_Study_Point_Banner_ba2211d3.png',
    alt: 'Welcome to BCA STUDY POINT - Complete Exam Preparation Platform',
    order: 1,
    active: true,
    createdAt: '2026-11-10T00:00:00.000Z',
    updatedAt: '2026-11-10T00:00:00.000Z',
  },
  {
    id: 'banner-launch-offer',
    title: 'Special Launch Offer - BCA 3rd Semester Complete Study Package at ₹99 Only',
    heading: '',
    subtitle: '',
    description: '',
    buttonText: '',
    buttonLink: '#packages-pricing',
    imageUrl: '/assets/aistudio/BCA_3rd_Semester_Launch_Offer_b41d8881.png',
    alt: 'Special Launch Offer - BCA 3rd Semester Complete Study Package at ₹99 Only',
    order: 2,
    active: true,
    createdAt: '2026-11-10T00:00:00.000Z',
    updatedAt: '2026-11-10T00:00:00.000Z',
  },
  {
    id: 'banner-benefits-policies',
    title: 'Our Benefits & Policies - What You Get & How We Work',
    heading: '',
    subtitle: '',
    description: '',
    buttonText: '',
    buttonLink: '#packages-pricing',
    imageUrl: '/assets/aistudio/BCA_Study_Point_Benefits___Policies_6c4db866.png',
    alt: 'Our Benefits & Policies - Key Benefits and Policy Guidelines for BCA Students',
    order: 3,
    active: true,
    createdAt: '2026-11-10T00:00:00.000Z',
    updatedAt: '2026-11-10T00:00:00.000Z',
  },
];

const DEFAULT_CLIENT_PACKAGES: PackageDefinition[] = [
  {
    id: 'pkg-bca-sem3-full',
    name: 'BCA 3rd Semester Complete Study Package',
    description: 'Includes 4 Compulsory Core Subjects + Optional Language Add-on + Optional Specialization Paper.',
    compulsoryProductIds: ['prod-bca-maj3', 'prod-bca-min3', 'prod-bca-mdc3', 'prod-bca-sec3'],
    languageProductIds: ['prod-bca-aec3-bengali', 'prod-bca-aec3-sanskrit'],
    specializationProductIds: ['prod-spec-ds', 'prod-spec-ai', 'prod-spec-cs', 'prod-spec-ml', 'prod-spec-iot'],
    coreRegularPrice: 99,
    coreOfferPrice: 69,
    languageRegularPrice: 15,
    languageOfferPrice: 10,
    specializationRegularPrice: 35,
    specializationOfferPrice: 20,
    fullPackageRegularPrice: 149,
    fullPackageOfferPrice: 99,
    active: true,
    updatedAt: '2026-11-10T00:00:00.000Z',
  },
];

const DEFAULT_CLIENT_OFFERS: OfferConfig[] = [
  {
    id: 'offer-launch-99',
    title: 'Special Launch Offer',
    badgeText: 'Up to 34% OFF',
    bannerText: 'BCA 3rd Semester Complete Study Package at ₹99 Only',
    description: '4 Compulsory Core + 1 Language + 1 Specialization complete exam question bank bundle.',
    regularPrice: 149,
    offerPrice: 99,
    discountPercent: 34,
    startDate: '2026-11-01T00:00:00.000Z',
    expiryDate: '2027-03-31T23:59:59.000Z',
    active: true,
    isFullPackageOffer: true,
    updatedAt: '2026-11-10T00:00:00.000Z',
  },
];

const DEFAULT_CLIENT_SITE_SETTINGS: SiteSettings = {
  tagline: 'Your Exam Preparation Partner',
  announcement: {
    enabled: false,
    text: '🔥 BCA 3rd Semester Complete Study Package Launch Offer: Get all 6 Subjects at ₹99 Only!',
    link: '#packages-pricing',
  },
  homepage: {
    sectionBadge: 'BCA 3rd Semester · Solved Question Banks',
    sectionTitle: 'Package Selection & Pricing',
    editionLabel: '2024-2025 Edition',
    compulsoryNotice: 'Students must select all 4 compulsory subjects.',
    optionalNotice: '2 additional optional sections are available. Students can choose them according to their preference.',
    howItWorksTitle: 'How It Works',
    featuredProductIds: ['prod-bca-maj3', 'prod-bca-min3', 'prod-bca-mdc3', 'prod-bca-sec3'],
  },
  payment: {
    upiId: 'BHARATPE2D0I0H4R5P81095@unitype',
    qrCodeUrl: '/assets/aistudio/WhatsApp_Image_2026-11-10_at_7.58.34_PM_43197c9f.jpeg',
    primaryPhone: '8145775413',
    whatsappPhone: '8145775413',
  },
  updatedAt: '2026-11-10T00:00:00.000Z',
};

export function computeEffectivePricingClient(
  packagesList: PackageDefinition[],
  offersList: OfferConfig[]
): EffectivePackagePricing {
  const primaryPkg =
    packagesList.find((p) => p.active !== false) || packagesList[0] || DEFAULT_CLIENT_PACKAGES[0];
  const fullOffer =
    offersList.find((o) => o.isFullPackageOffer) || offersList[0] || DEFAULT_CLIENT_OFFERS[0];

  const now = Date.now();
  const startMs = fullOffer?.startDate ? new Date(fullOffer.startDate).getTime() : 0;
  const expiryMs = fullOffer?.expiryDate
    ? new Date(fullOffer.expiryDate.includes('T') ? fullOffer.expiryDate : `${fullOffer.expiryDate}T23:59:59+05:30`).getTime()
    : Number.MAX_SAFE_INTEGER;
  const isExpired = Boolean(fullOffer?.active && Number.isFinite(expiryMs) && now > expiryMs);
  const isValid = Boolean(
    fullOffer?.active &&
      !isExpired &&
      (!Number.isFinite(startMs) || now >= startMs)
  );

  const coreRegular = Number(primaryPkg.coreRegularPrice) || 99;
  const coreOffer = isValid ? Number(primaryPkg.coreOfferPrice) || 69 : coreRegular;
  const langRegular = Number(primaryPkg.languageRegularPrice) || 15;
  const langOffer = isValid ? Number(primaryPkg.languageOfferPrice) || 10 : langRegular;
  const specRegular = Number(primaryPkg.specializationRegularPrice) || 35;
  const specOffer = isValid ? Number(primaryPkg.specializationOfferPrice) || 20 : specRegular;

  const fullRegular =
    Number(fullOffer?.regularPrice) ||
    Number(primaryPkg.fullPackageRegularPrice) ||
    coreRegular + langRegular + specRegular;
  const fullOfferPrice = isValid
    ? Number(fullOffer?.offerPrice) || Number(primaryPkg.fullPackageOfferPrice) || coreOffer + langOffer + specOffer
    : fullRegular;

  const discPct = Math.max(0, Math.round(((fullRegular - fullOfferPrice) / (fullRegular || 1)) * 100));

  return {
    packageName: primaryPkg.name,
    packageDescription: primaryPkg.description,
    packageActive: primaryPkg.active !== false,
    compulsoryProductIds: primaryPkg.compulsoryProductIds || [],
    languageProductIds: primaryPkg.languageProductIds || [],
    specializationProductIds: primaryPkg.specializationProductIds || [],
    offerActive: isValid,
    offerExpired: isExpired,
    offerTitle: fullOffer?.title || 'Special Launch Offer',
    offerBadgeText: isValid ? fullOffer?.badgeText || `Up to ${discPct}% OFF` : 'Regular Price',
    offerExpiryDate: fullOffer?.expiryDate || '',
    core: {
      title: `Main Core Package (${(primaryPkg.compulsoryProductIds || []).length} PDFs)`,
      pdfCount: (primaryPkg.compulsoryProductIds || []).length,
      launchPrice: coreOffer,
      regularPrice: coreRegular,
    },
    language: {
      title: 'Language Add-on (1 PDF)',
      pdfCount: 1,
      launchPrice: langOffer,
      regularPrice: langRegular,
    },
    specialization: {
      title: 'Specialization Add-on (1 PDF)',
      pdfCount: 1,
      launchPrice: specOffer,
      regularPrice: specRegular,
    },
    fullPackageOfferPrice: fullOfferPrice,
    fullPackageRegularPrice: fullRegular,
  };
}

export async function getBannersFromRtdb(): Promise<BannerSlide[]> {
  try {
    const snap = await rtdbGet(rtdbRef(rtdb, 'banners'));
    const data = snap.val();
    if (data && typeof data === 'object') {
      const list = Object.values(data).filter((b: any) => b && typeof b === 'object' && b.id) as BannerSlide[];
      if (list.length > 0) {
        return list.sort((a, b) => (a.order || 0) - (b.order || 0));
      }
    }
  } catch (e) {
    console.warn('getBannersFromRtdb notice:', e);
  }
  return DEFAULT_CLIENT_BANNERS;
}

export async function saveBannersToRtdb(banners: BannerSlide[]): Promise<BannerSlide[]> {
  const map: Record<string, BannerSlide> = {};
  for (const b of banners) {
    map[b.id] = b;
  }
  await rtdbSet(rtdbRef(rtdb, 'banners'), map);
  return [...banners].sort((a, b) => (a.order || 0) - (b.order || 0));
}

export async function getPackagesFromRtdb(): Promise<PackageDefinition[]> {
  try {
    const snap = await rtdbGet(rtdbRef(rtdb, 'packages'));
    const data = snap.val();
    if (data && typeof data === 'object') {
      const list = Object.values(data).filter((p: any) => p && typeof p === 'object' && p.id) as PackageDefinition[];
      if (list.length > 0) return list;
    }
  } catch (e) {
    console.warn('getPackagesFromRtdb notice:', e);
  }
  return DEFAULT_CLIENT_PACKAGES;
}

export async function savePackagesToRtdb(
  packages: PackageDefinition[],
  offers?: OfferConfig[]
): Promise<{ packages: PackageDefinition[]; effectivePricing: EffectivePackagePricing }> {
  const map: Record<string, PackageDefinition> = {};
  for (const p of packages) {
    map[p.id] = p;
  }
  await rtdbSet(rtdbRef(rtdb, 'packages'), map);
  const resolvedOffers = offers || (await getOffersFromRtdb());
  const effectivePricing = computeEffectivePricingClient(packages, resolvedOffers);
  await rtdbSet(rtdbRef(rtdb, 'packagePricing'), effectivePricing);
  return { packages, effectivePricing };
}

export async function getOffersFromRtdb(): Promise<OfferConfig[]> {
  try {
    const snap = await rtdbGet(rtdbRef(rtdb, 'offers'));
    const data = snap.val();
    if (data && typeof data === 'object') {
      const list = Object.values(data).filter((o: any) => o && typeof o === 'object' && o.id) as OfferConfig[];
      if (list.length > 0) return list;
    }
  } catch (e) {
    console.warn('getOffersFromRtdb notice:', e);
  }
  return DEFAULT_CLIENT_OFFERS;
}

export async function saveOffersToRtdb(
  offers: OfferConfig[],
  packages?: PackageDefinition[]
): Promise<{ offers: OfferConfig[]; effectivePricing: EffectivePackagePricing }> {
  const map: Record<string, OfferConfig> = {};
  for (const o of offers) {
    map[o.id] = o;
  }
  await rtdbSet(rtdbRef(rtdb, 'offers'), map);
  const resolvedPackages = packages || (await getPackagesFromRtdb());
  const effectivePricing = computeEffectivePricingClient(resolvedPackages, offers);
  await rtdbSet(rtdbRef(rtdb, 'packagePricing'), effectivePricing);
  return { offers, effectivePricing };
}

export async function getSiteSettingsFromRtdb(): Promise<SiteSettings> {
  try {
    const snap = await rtdbGet(rtdbRef(rtdb, 'siteSettings'));
    const data = snap.val();
    if (data && typeof data === 'object') {
      return {
        ...DEFAULT_CLIENT_SITE_SETTINGS,
        ...data,
        announcement: { ...DEFAULT_CLIENT_SITE_SETTINGS.announcement, ...(data.announcement || {}) },
        homepage: { ...DEFAULT_CLIENT_SITE_SETTINGS.homepage, ...(data.homepage || {}) },
        payment: { ...DEFAULT_CLIENT_SITE_SETTINGS.payment, ...(data.payment || {}) },
      };
    }
  } catch (e) {
    console.warn('getSiteSettingsFromRtdb notice:', e);
  }
  return DEFAULT_CLIENT_SITE_SETTINGS;
}

export async function saveSiteSettingsToRtdb(settings: Partial<SiteSettings>): Promise<SiteSettings> {
  const current = await getSiteSettingsFromRtdb();
  const next: SiteSettings = {
    ...current,
    ...settings,
    announcement: { ...current.announcement, ...(settings.announcement || {}) },
    homepage: { ...current.homepage, ...(settings.homepage || {}) },
    payment: { ...current.payment, ...(settings.payment || {}) },
    updatedAt: new Date().toISOString(),
  };
  await rtdbSet(rtdbRef(rtdb, 'siteSettings'), next);
  return next;
}

export async function getProductsFromRtdb(): Promise<Product[]> {
  try {
    const snap = await rtdbGet(rtdbRef(rtdb, 'products'));
    const data = snap.val();
    if (data && typeof data === 'object') {
      const list: Product[] = [];
      for (const [key, item] of Object.entries<any>(data)) {
        if (!item || typeof item !== 'object') continue;
        const fallback = FALLBACK_PRODUCTS.find((p) => p.id === key || p.id === item.id);
        const resolvedCover = item.coverImageUrl ?? item.imageUrl ?? fallback?.coverImageUrl ?? '';
        list.push({
          id: item.id || key,
          semesterId: item.semesterId || 'sem-3',
          subjectCode: item.subjectCode || fallback?.subjectCode || '',
          subjectName: item.subjectName || fallback?.subjectName || '',
          description: item.description ?? fallback?.description ?? '',
          syllabusHighlights: item.syllabusHighlights || fallback?.syllabusHighlights || [],
          price: item.price !== undefined ? Number(item.price) : (fallback?.price ?? 20),
          originalPrice: item.originalPrice !== undefined ? Number(item.originalPrice) : fallback?.originalPrice,
          pageCount: Number(item.pageCount) || fallback?.pageCount || 30,
          privateStoragePath: item.privateStoragePath || fallback?.privateStoragePath || '',
          fileSizeKb: Number(item.fileSizeKb) || fallback?.fileSizeKb || 3000,
          published: item.published !== false,
          examYear: item.examYear || fallback?.examYear || '2024-2025 Edition',
          coverImageUrl: resolvedCover,
          imageUrl: resolvedCover,
          paperType: item.paperType || fallback?.paperType || 'core',
          specialization: item.specialization || fallback?.specialization,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: item.updatedAt || new Date().toISOString(),
        });
      }
      if (list.length > 0) {
        return list.sort((a, b) => {
          if (a.paperType === 'core' && b.paperType !== 'core') return -1;
          if (a.paperType !== 'core' && b.paperType === 'core') return 1;
          return a.subjectCode.localeCompare(b.subjectCode);
        });
      }
    }
  } catch (e) {
    console.warn('getProductsFromRtdb notice:', e);
  }
  return FALLBACK_PRODUCTS;
}

export async function getOrdersFromRtdb(): Promise<Order[]> {
  try {
    const snap = await rtdbGet(rtdbRef(rtdb, 'orders'));
    const data = snap.val();
    if (!data || typeof data !== 'object') return [];
    const list: Order[] = Object.entries<any>(data)
      .filter(([, val]) => val && typeof val === 'object')
      .map(([key, val]) => ({
        orderId: val.orderId || key,
        userId: val.userId || `std_${key}`,
        studentName: val.studentName || 'Student',
        studentEmail: val.studentEmail || '',
        studentMobile: val.studentMobile || '',
        collegeName: val.collegeName || '',
        studentId: val.studentId || '',
        selectedProductIds: val.selectedProductIds || (val.items ? val.items.map((i: any) => i.productId) : []),
        items: val.items || [],
        packageName: val.packageName,
        totalAmount: Number(val.totalAmount) || 0,
        paymentStatus: val.paymentStatus || 'pending',
        paymentReference: val.paymentReference || '',
        paymentScreenshotUrl: val.paymentScreenshotUrl,
        createdAt: val.createdAt || new Date().toISOString(),
        verifiedAt: val.verifiedAt,
        rejectionReason: val.rejectionReason,
      }));
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (e) {
    console.warn('getOrdersFromRtdb notice:', e);
    return [];
  }
}

export async function getCustomersFromRtdb(): Promise<CustomerSummary[]> {
  try {
    const [studSnap, orders, products] = await Promise.all([
      rtdbGet(rtdbRef(rtdb, 'students')),
      getOrdersFromRtdb(),
      getProductsFromRtdb(),
    ]);
    const studData = studSnap.val() || {};
    const studentsList: any[] = Object.entries<any>(studData)
      .filter(([, v]) => v && typeof v === 'object')
      .map(([k, v]) => ({ id: v.id || k, ...v }));

    const grouped = new Map<string, CustomerSummary>();
    const prodMap = new Map(products.map((p) => [p.id, p]));

    const resolveKey = (mobile?: string, email?: string, fallbackId?: string) => {
      const m = (mobile || '').replace(/\D/g, '');
      const e = (email || '').trim().toLowerCase();
      if (m.length >= 10) return `m:${m}`;
      if (e) return `e:${e}`;
      return `id:${fallbackId || Date.now()}`;
    };

    for (const s of studentsList) {
      const key = resolveKey(s.mobile, s.email, s.id);
      if (!grouped.has(key)) {
        grouped.set(key, {
          customerId: s.id,
          fullName: s.fullName || 'Student',
          mobile: s.mobile || '',
          email: s.email || '',
          collegeName: s.collegeName,
          registeredAt: s.registeredAt || s.createdAt || null,
          lastLoginAt: s.lastLoginAt || s.lastActive || null,
          purchasedSubjectCount: 0,
          purchasedProductNames: [],
          purchasedProducts: [],
          purchasedPackageNames: [],
          totalAmountSpent: 0,
          totalOrders: 0,
          verifiedOrdersCount: 0,
          pendingOrdersCount: 0,
          lastPurchaseDate: null,
          orderHistory: [],
          deviceInfo: null,
        });
      }
    }

    for (const ord of orders) {
      const key = resolveKey(ord.studentMobile, ord.studentEmail, ord.userId);
      let cust = grouped.get(key);
      if (!cust) {
        cust = {
          customerId: ord.userId || `cust-${ord.orderId}`,
          fullName: ord.studentName || 'Student',
          mobile: ord.studentMobile || '',
          email: ord.studentEmail || '',
          registeredAt: ord.createdAt,
          lastLoginAt: ord.createdAt,
          purchasedSubjectCount: 0,
          purchasedProductNames: [],
          purchasedProducts: [],
          purchasedPackageNames: [],
          totalAmountSpent: 0,
          totalOrders: 0,
          verifiedOrdersCount: 0,
          pendingOrdersCount: 0,
          lastPurchaseDate: null,
          orderHistory: [],
          deviceInfo: null,
        };
        grouped.set(key, cust);
      }

      cust.totalOrders += 1;
      cust.orderHistory.push(ord);
      if (!cust.lastPurchaseDate || new Date(ord.createdAt) > new Date(cust.lastPurchaseDate)) {
        cust.lastPurchaseDate = ord.createdAt;
      }
      if (ord.paymentStatus === 'verified') {
        cust.verifiedOrdersCount += 1;
        cust.totalAmountSpent += Number(ord.totalAmount) || 0;
        if (ord.packageName && !cust.purchasedPackageNames.includes(ord.packageName)) {
          cust.purchasedPackageNames.push(ord.packageName);
        }
        for (const pid of ord.selectedProductIds || []) {
          const prod = prodMap.get(pid);
          const item = (ord.items || []).find((i) => i.productId === pid);
          const name = item?.subjectName || prod?.subjectName || pid;
          if (!cust.purchasedProductNames.includes(name)) {
            cust.purchasedProductNames.push(name);
            const subj: CustomerPurchasedSubject = {
              productId: pid,
              subjectCode: item?.subjectCode || prod?.subjectCode || 'BCA',
              subjectName: name,
              price: Number(item?.price ?? prod?.price ?? 20),
              accessStatus: 'active',
            };
            cust.purchasedProducts.push(subj);
          }
        }
        cust.purchasedSubjectCount = cust.purchasedProducts.length;
      } else if (ord.paymentStatus === 'pending') {
        cust.pendingOrdersCount += 1;
      }
    }

    return Array.from(grouped.values()).sort((a, b) => {
      const da = a.lastPurchaseDate || a.registeredAt || '';
      const db = b.lastPurchaseDate || b.registeredAt || '';
      return db.localeCompare(da);
    });
  } catch (e) {
    console.warn('getCustomersFromRtdb notice:', e);
    return [];
  }
}

export async function fileToCompressedDataUrl(file: File, maxWidth = 1400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(String(reader.result || ''));
      img.onload = () => {
        try {
          const scale = img.width > maxWidth ? maxWidth / img.width : 1;
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(String(reader.result || ''));
            return;
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/webp', 0.85));
        } catch {
          resolve(String(reader.result || ''));
        }
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

