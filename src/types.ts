/**
 * Types and interfaces for BCA STUDY POINT
 */

export interface Semester {
  id: string;
  semesterNumber: number;
  title: string;
  academicYear: string; // e.g. "Year 1", "Year 2", "Year 3"
  description: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  semesterId: string;
  subjectCode: string; // e.g. "BCA-101"
  subjectName: string; // e.g. "Programming in C & Data Types"
  description: string;
  syllabusHighlights: string[];
  price: number; // Selling price in INR
  originalPrice?: number; // Regular price / MRP in INR
  pageCount: number;
  privateStoragePath: string; // e.g. "pdfs/bca_101_c_programming.pdf"
  fileSizeKb: number;
  published: boolean;
  examYear: string; // e.g. "2024-2025 Edition"
  coverImageUrl?: string;
  imageUrl?: string;
  paperType?: 'core' | 'specialization';
  specialization?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Student {
  id: string;
  email: string;
  fullName: string;
  mobile: string;
  collegeName?: string;
  studentId?: string;
  passwordHash?: string;
  registeredDeviceHash?: string;
  registeredDeviceName?: string;
  registeredAt: string;
  lastLoginAt: string;
  lastIp?: string;
}

export interface OrderItem {
  productId: string;
  subjectName: string;
  subjectCode: string;
  price: number;
}

export interface Order {
  orderId: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  studentMobile: string;
  collegeName?: string;
  studentId?: string;
  selectedProductIds: string[];
  items: OrderItem[];
  packageName?: string;
  totalAmount: number;
  paymentGatewayOrderId?: string;
  paymentGatewayPaymentId?: string;
  paymentGatewaySignature?: string;
  paymentReference?: string;
  paymentScreenshotUrl?: string;
  paymentStatus: 'pending' | 'verified' | 'failed' | 'cancelled' | 'rejected';
  paymentMethod?: string;
  createdAt: string;
  verifiedAt?: string;
  rejectionReason?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface Purchase {
  purchaseId: string;
  userId: string;
  productId: string;
  orderId: string;
  accessStatus: 'active' | 'pending_approval' | 'revoked';
  createdAt: string;
}

export interface DeviceBinding {
  id: string;
  userId: string;
  userEmail: string;
  studentName: string;
  deviceTokenHash: string;
  deviceDescription: string;
  os: string;
  browser: string;
  registeredAt: string;
  lastSeenAt: string;
  lastIp: string;
  registrationStatus: 'active' | 'revoked' | 'logged_out';
  resetCount: number;
}

export interface ViewerSession {
  sessionId: string;
  token: string;
  userId: string;
  productId: string;
  deviceTokenHash: string;
  studentName: string;
  studentEmail: string;
  orderId: string;
  expiresAt: number; // Unix timestamp
  createdAt: string;
}

export interface AdminAuditLog {
  id: string;
  adminId: string;
  action: string;
  targetId?: string;
  targetType?: string;
  details: string;
  timestamp: string;
  ipAddress?: string;
}

export interface BannerSlide {
  id: string;
  title: string;
  heading?: string;
  subtitle?: string;
  description?: string;
  buttonText?: string;
  buttonLink?: string;
  imageUrl: string;
  alt: string;
  order: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PackageDefinition {
  id: string;
  name: string;
  description: string;
  compulsoryProductIds: string[];
  languageProductIds: string[];
  specializationProductIds: string[];
  coreRegularPrice: number;
  coreOfferPrice: number;
  languageRegularPrice: number;
  languageOfferPrice: number;
  specializationRegularPrice: number;
  specializationOfferPrice: number;
  fullPackageRegularPrice: number;
  fullPackageOfferPrice: number;
  active: boolean;
  updatedAt: string;
}

export interface OfferConfig {
  id: string;
  title: string;
  badgeText: string;
  bannerText: string;
  description: string;
  regularPrice: number;
  offerPrice: number;
  discountPercent: number;
  startDate: string;
  expiryDate: string;
  active: boolean;
  isFullPackageOffer?: boolean;
  updatedAt: string;
}

export interface SiteSettings {
  tagline: string;
  announcement: {
    enabled: boolean;
    text: string;
    link: string;
  };
  homepage: {
    sectionBadge: string;
    sectionTitle: string;
    editionLabel: string;
    compulsoryNotice: string;
    optionalNotice: string;
    howItWorksTitle: string;
    featuredProductIds: string[];
  };
  payment: {
    upiId: string;
    qrCodeUrl: string;
    primaryPhone: string;
    whatsappPhone: string;
  };
  updatedAt: string;
}

export interface EffectivePackagePricing {
  packageName: string;
  packageDescription: string;
  packageActive: boolean;
  compulsoryProductIds: string[];
  languageProductIds: string[];
  specializationProductIds: string[];
  offerActive: boolean;
  offerExpired: boolean;
  offerTitle: string;
  offerBadgeText: string;
  offerExpiryDate: string;
  core: {
    title: string;
    pdfCount: number;
    launchPrice: number;
    regularPrice: number;
  };
  language: {
    title: string;
    pdfCount: number;
    launchPrice: number;
    regularPrice: number;
  };
  specialization: {
    title: string;
    pdfCount: number;
    launchPrice: number;
    regularPrice: number;
  };
  fullPackageOfferPrice: number;
  fullPackageRegularPrice: number;
}

export interface CustomerPurchasedSubject {
  productId: string;
  subjectCode: string;
  subjectName: string;
  price: number;
  accessStatus: string;
}

export interface CustomerSummary {
  customerId: string;
  fullName: string;
  mobile: string;
  email: string;
  collegeName?: string;
  registeredAt: string | null;
  lastLoginAt: string | null;
  purchasedSubjectCount: number;
  purchasedProductNames: string[];
  purchasedProducts: CustomerPurchasedSubject[];
  purchasedPackageNames: string[];
  totalAmountSpent: number;
  totalOrders: number;
  verifiedOrdersCount: number;
  pendingOrdersCount: number;
  lastPurchaseDate: string | null;
  orderHistory: Order[];
  deviceInfo: DeviceBinding | null;
}

export interface AdminDashboardStats {
  todaySales: number;
  todayRevenue: number;
  filteredSales: number;
  filteredRevenue: number;
  totalOrders: number;
  verifiedOrders: number;
  pendingOrders: number;
  rejectedOrders: number;
  totalRevenue: number;
  totalCustomers: number;
  totalStudents: number;
  totalSubjects: number;
  publishedSubjects: number;
  activeOffersCount: number;
  activeDevices: number;
  salesSeries: Array<{
    date: string;
    label: string;
    sales: number;
    revenue: number;
  }>;
}

export type AppView = 'catalog' | 'purchased' | 'admin' | 'auth' | 'checkout' | 'about' | 'contact';
