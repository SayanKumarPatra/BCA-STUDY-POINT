import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  Semester,
  Product,
  Student,
  Order,
  Purchase,
  DeviceBinding,
  ViewerSession,
  AdminAuditLog,
  BannerSlide,
  PackageDefinition,
  OfferConfig,
  SiteSettings,
  EffectivePackagePricing,
  CustomerSummary,
  CustomerPurchasedSubject,
} from '../src/types';
import { firebaseSync } from './firebaseSync';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'bca_database.json');
export const PDF_STORAGE_DIR = path.join(DATA_DIR, 'private_storage', 'pdfs');
export const PUBLIC_UPLOADS_DIR = path.join(DATA_DIR, 'public_uploads');

interface DatabaseSchema {
  semesters: Semester[];
  products: Product[];
  students: Student[];
  orders: Order[];
  purchases: Purchase[];
  devices: DeviceBinding[];
  viewerSessions: ViewerSession[];
  adminAuditLogs: AdminAuditLog[];
  banners: BannerSlide[];
  packages: PackageDefinition[];
  offers: OfferConfig[];
  siteSettings: SiteSettings;
}

// Initial seed data for BCA Study Point - Focused strictly on BCA Semester 3
const SEED_SEMESTERS: Semester[] = [
  {
    id: 'sem-3',
    semesterNumber: 3,
    title: 'BCA Semester 3',
    academicYear: '2nd Year (3rd Semester)',
    description: 'BCA Semester 3 core question banks & specialization pack with verified solutions.',
    published: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const SEED_PRODUCTS: Product[] = [
  // Core Papers (Semester 3)
  {
    id: 'prod-bca-maj3',
    semesterId: 'sem-3',
    subjectCode: 'MAJ-3',
    subjectName: 'COMPUTER ARCHITECTURE MAJ-3',
    description: 'Complete 3rd semester university question bank for Computer Architecture (MAJ-3). Processor organization, ALU design, memory hierarchy, pipelining, and instruction cycles.',
    syllabusHighlights: [
      'CPU Organization & Instruction Set Architecture (ISA)',
      'Memory Hierarchy: Cache Mapping & Virtual Memory',
      'Pipelining Hazards: Structural, Data, & Control',
      'I/O Organization & DMA Controller Architecture',
    ],
    price: 20,
    originalPrice: 49,
    pageCount: 38,
    privateStoragePath: 'pdfs/bca_maj3_computer_architecture.pdf',
    fileSizeKb: 3450,
    published: true,
    examYear: '2024-2025 Edition',
    paperType: 'core',
    coverImageUrl: '/assets/aistudio/Computer_Architecture__BCA_Study_Point_18218658.png',
    imageUrl: '/assets/aistudio/Computer_Architecture__BCA_Study_Point_18218658.png',
    createdAt: '2026-11-10T00:00:00.000Z',
    updatedAt: '2026-11-10T00:00:00.000Z',
  },
  {
    id: 'prod-bca-min3',
    semesterId: 'sem-3',
    subjectCode: 'MIN-3',
    subjectName: 'BUSINESS ENVIRONMENT MIN-3',
    description: 'Comprehensive solved question bank for Business Environment (MIN-3). Macroeconomic factors, fiscal & monetary policies, corporate governance, and industrial policies.',
    syllabusHighlights: [
      'Economic, Political & Technological Environment Analysis',
      'Industrial Policies & Make in India Initiatives',
      'Monetary and Fiscal Policies & RBI Framework',
      'Globalization, EXIM Policies, and WTO Regulations',
    ],
    price: 20,
    originalPrice: 49,
    pageCount: 32,
    privateStoragePath: 'pdfs/bca_min3_business_environment.pdf',
    fileSizeKb: 2890,
    published: true,
    examYear: '2024-2025 Edition',
    paperType: 'core',
    coverImageUrl: '/assets/aistudio/Business_Environment_Study_Guide___BCA_d342aa56.png',
    imageUrl: '/assets/aistudio/Business_Environment_Study_Guide___BCA_d342aa56.png',
    createdAt: '2026-11-10T00:00:00.000Z',
    updatedAt: '2026-11-10T00:00:00.000Z',
  },
  {
    id: 'prod-bca-mdc3',
    semesterId: 'sem-3',
    subjectCode: 'MDC-3',
    subjectName: 'BUSNIESS ETHICS & CSR MDC-3',
    description: 'Solved question bank for Business Ethics & Corporate Social Responsibility (MDC-3). Moral standards in management, corporate governance scandals, CSR initiatives, and case studies.',
    syllabusHighlights: [
      'Theories of Ethics: Utilitarianism, Deontology & Virtue Ethics',
      'Corporate Governance Frameworks & Board Accountability',
      'Companies Act 2013 Section 135 CSR Mandate',
      'Environmental Sustainability & Green Business Models',
    ],
    price: 20,
    originalPrice: 49,
    pageCount: 28,
    privateStoragePath: 'pdfs/bca_mdc3_business_ethics.pdf',
    fileSizeKb: 2450,
    published: true,
    examYear: '2024-2025 Edition',
    paperType: 'core',
    coverImageUrl: '/assets/aistudio/BCA_Business_Ethics___CSR_Study_Guide_61e7d68f.png',
    imageUrl: '/assets/aistudio/BCA_Business_Ethics___CSR_Study_Guide_61e7d68f.png',
    createdAt: '2026-11-10T00:00:00.000Z',
    updatedAt: '2026-11-10T00:00:00.000Z',
  },
  {
    id: 'prod-bca-sec3',
    semesterId: 'sem-3',
    subjectCode: 'SEC-3',
    subjectName: 'ADVANCED DATABASES SYSTEMS SEC-3',
    description: 'Complete examination question bank with verified solutions for Advanced Database Systems (SEC-3). Query optimization, indexing, ACID transactions, NoSQL schemas, and concurrency control.',
    syllabusHighlights: [
      'Advanced Relational Algebra & Cost-Based Query Optimization',
      'Transaction Processing, Two-Phase Locking (2PL) & Serializability',
      'B+ Trees, Bitmap Indexes & Hash Clustering',
      'Distributed Databases, CAP Theorem, & MongoDB NoSQL Schemas',
    ],
    price: 20,
    originalPrice: 49,
    pageCount: 46,
    privateStoragePath: 'pdfs/bca_sec3_advanced_databases.pdf',
    fileSizeKb: 4120,
    published: true,
    examYear: '2024-2025 Edition',
    paperType: 'core',
    coverImageUrl: '/assets/aistudio/Advanced_Database_Systems_Cover_f9561bdc.png',
    imageUrl: '/assets/aistudio/Advanced_Database_Systems_Cover_f9561bdc.png',
    createdAt: '2026-11-10T00:00:00.000Z',
    updatedAt: '2026-11-10T00:00:00.000Z',
  },
  {
    id: 'prod-bca-aec3-bengali',
    semesterId: 'sem-3',
    subjectCode: 'AEC-3',
    subjectName: 'BENGALI AEC-3',
    description: 'University syllabus-aligned question bank for Bengali AEC-3. Selected essays, modern prose, grammar, composition, and previous year university paper solutions.',
    syllabusHighlights: [
      'Selected Bengali Literary Works & Thematic Analysis',
      'Grammar, Vocabulary Enrichment & Orthography',
      'Comprehension, Report Writing & Official Correspondence',
      'Past 5 Years Solved University Questions with Model Answers',
    ],
    price: 20,
    originalPrice: 49,
    pageCount: 30,
    privateStoragePath: 'pdfs/bca_aec3_bengali.pdf',
    fileSizeKb: 2650,
    published: true,
    examYear: '2024-2025 Edition',
    paperType: 'core',
    coverImageUrl: '/assets/aistudio/Bengali_AEC-3_Study_Guide_Cover_be6e35e1.png',
    imageUrl: '/assets/aistudio/Bengali_AEC-3_Study_Guide_Cover_be6e35e1.png',
    createdAt: '2026-11-10T00:00:00.000Z',
    updatedAt: '2026-11-10T00:00:00.000Z',
  },
  {
    id: 'prod-bca-aec3-sanskrit',
    semesterId: 'sem-3',
    subjectCode: 'AEC-3',
    subjectName: 'SANSKRIT AEC-3',
    description: 'Curated question bank for Sanskrit AEC-3. Shlokas, translations, classical grammar rules, sandhi, samasa, and probable semester questions.',
    syllabusHighlights: [
      'Prescribed Sanskrit Subhashitani & Literary Passages',
      'Paninian Grammar Fundamentals: Sandhi, Karaka & Samasa',
      'Translation from Sanskrit to Bengali / English',
      'University Examination Probable Questions & Answers',
    ],
    price: 20,
    originalPrice: 49,
    pageCount: 26,
    privateStoragePath: 'pdfs/bca_aec3_sanskrit.pdf',
    fileSizeKb: 2310,
    published: true,
    examYear: '2024-2025 Edition',
    paperType: 'core',
    coverImageUrl: '/assets/aistudio/BCA_Sanskrit_Study_Guide_Cover_b154f707.png',
    imageUrl: '/assets/aistudio/BCA_Sanskrit_Study_Guide_Cover_b154f707.png',
    createdAt: '2026-11-10T00:00:00.000Z',
    updatedAt: '2026-11-10T00:00:00.000Z',
  },

  // Specialization Pack (Semester 3)
  {
    id: 'prod-spec-ai',
    semesterId: 'sem-3',
    subjectCode: 'SPEC-AI',
    subjectName: 'ARTIFICIAL INTELLIGENCE (AI)',
    description: 'Specialization pack question bank for Artificial Intelligence. Heuristic search algorithms (A*, AO*), knowledge representation, first-order logic, rule-based expert systems, and NLP basics.',
    syllabusHighlights: [
      'State-Space Search, A* Heuristic & Minimax Game Trees',
      'Propositional & First-Order Predicate Logic (FOPL)',
      'Unification & Resolution Refutation Proofs',
      'Expert Systems Architecture & Forward/Backward Chaining',
    ],
    price: 20,
    originalPrice: 49,
    pageCount: 42,
    privateStoragePath: 'pdfs/bca_spec_ai.pdf',
    fileSizeKb: 3950,
    published: true,
    examYear: '2024-2025 Edition',
    paperType: 'specialization',
    coverImageUrl: '/assets/aistudio/BCA_Artificial_Intelligence_Question_Bank_afd929e2.png',
    imageUrl: '/assets/aistudio/BCA_Artificial_Intelligence_Question_Bank_afd929e2.png',
    createdAt: '2026-11-10T00:00:00.000Z',
    updatedAt: '2026-11-10T00:00:00.000Z',
  },
  {
    id: 'prod-spec-ml',
    semesterId: 'sem-3',
    subjectCode: 'SPEC-ML',
    subjectName: 'MACHINE LEARNING (ML)',
    description: 'Specialization pack question bank for Machine Learning. Supervised & unsupervised algorithms, regression, classification, decision trees, neural network backpropagation, and model evaluation.',
    syllabusHighlights: [
      'Linear & Logistic Regression, Cost Functions & Gradient Descent',
      'Decision Trees, ID3/C4.5, Entropy & Information Gain',
      'Support Vector Machines (SVM) & Kernel Functions',
      'K-Means Clustering, PCA & Cross-Validation Metrics',
    ],
    price: 20,
    originalPrice: 49,
    pageCount: 44,
    privateStoragePath: 'pdfs/bca_spec_ml.pdf',
    fileSizeKb: 4200,
    published: true,
    examYear: '2024-2025 Edition',
    paperType: 'specialization',
    coverImageUrl: '/assets/aistudio/Machine_Learning_BCA_Question_Bank_1e49d965.png',
    imageUrl: '/assets/aistudio/Machine_Learning_BCA_Question_Bank_1e49d965.png',
    createdAt: '2026-11-10T00:00:00.000Z',
    updatedAt: '2026-11-10T00:00:00.000Z',
  },
  {
    id: 'prod-spec-ds',
    semesterId: 'sem-3',
    subjectCode: 'SPEC-DS',
    subjectName: 'DATA SCIENCE (DS)',
    description: 'Specialization pack question bank for Data Science. Statistical inference, data wrangling with Pandas/NumPy, exploratory data analysis (EDA), hypothesis testing, and predictive modeling.',
    syllabusHighlights: [
      'Probability Distributions, Central Limit Theorem & p-Values',
      'Data Cleaning, Imputation & Outlier Detection in Python',
      'Exploratory Data Analysis (EDA) & Matplotlib/Seaborn Workflows',
      'Dimensionality Reduction & Feature Selection Techniques',
    ],
    price: 20,
    originalPrice: 49,
    pageCount: 40,
    privateStoragePath: 'pdfs/bca_spec_ds.pdf',
    fileSizeKb: 3880,
    published: true,
    examYear: '2024-2025 Edition',
    paperType: 'specialization',
    coverImageUrl: '/assets/aistudio/Data_Science_Question_Bank_Cover_f9489954.png',
    imageUrl: '/assets/aistudio/Data_Science_Question_Bank_Cover_f9489954.png',
    createdAt: '2026-11-10T00:00:00.000Z',
    updatedAt: '2026-11-10T00:00:00.000Z',
  },
  {
    id: 'prod-spec-cs',
    semesterId: 'sem-3',
    subjectCode: 'SPEC-CS',
    subjectName: 'CYBER SECURITY (CS)',
    description: 'Specialization pack question bank for Cyber Security. Cryptography (RSA, AES), network security protocols (SSL/TLS, IPSec), firewall architectures, ethical hacking, and vulnerability assessments.',
    syllabusHighlights: [
      'Symmetric & Asymmetric Ciphers: DES, AES & RSA Cryptosystems',
      'Digital Signatures, Hash Functions (SHA-256) & PKI',
      'Network Attack Vectors: MITM, DDoS, SQL Injection & XSS',
      'Firewalls, IDS/IPS Configuration & Security Incident Audits',
    ],
    price: 20,
    originalPrice: 49,
    pageCount: 40,
    privateStoragePath: 'pdfs/bca_spec_cs.pdf',
    fileSizeKb: 3790,
    published: true,
    examYear: '2024-2025 Edition',
    paperType: 'specialization',
    coverImageUrl: '/assets/aistudio/Cyber_Security_Question_Bank_Cover_b9a7e2d8.png',
    imageUrl: '/assets/aistudio/Cyber_Security_Question_Bank_Cover_b9a7e2d8.png',
    createdAt: '2026-11-10T00:00:00.000Z',
    updatedAt: '2026-11-10T00:00:00.000Z',
  },
  {
    id: 'prod-spec-iot',
    semesterId: 'sem-3',
    subjectCode: 'SPEC-IOT',
    subjectName: 'ITES & IOT (ITES)',
    description: 'Specialization pack question bank for ITES & Internet of Things. Sensor interfacing, microcontroller architectures (Arduino/ESP32), IoT communication protocols (MQTT, CoAP), and cloud IoT platforms.',
    syllabusHighlights: [
      'IoT Architecture: Perception, Network, & Application Layers',
      'Sensor & Actuator Interfacing with Embedded Controllers',
      'IoT Communication: MQTT, CoAP, ZigBee, and LoRaWAN',
      'Cloud IoT Integration, Edge Computing & Smart City Case Studies',
    ],
    price: 20,
    originalPrice: 49,
    pageCount: 36,
    privateStoragePath: 'pdfs/bca_spec_iot.pdf',
    fileSizeKb: 3600,
    published: true,
    examYear: '2024-2025 Edition',
    paperType: 'specialization',
    coverImageUrl: '/assets/aistudio/ITES___IoT_BCA_Study_Guide_4a8dde20.png',
    imageUrl: '/assets/aistudio/ITES___IoT_BCA_Study_Guide_4a8dde20.png',
    createdAt: '2026-11-10T00:00:00.000Z',
    updatedAt: '2026-11-10T00:00:00.000Z',
  },
];

const SEED_BANNERS: BannerSlide[] = [
  {
    id: 'banner-welcome',
    title: 'Welcome to BCA STUDY POINT - Your Complete Exam Preparation Partner',
    heading: '',
    subtitle: '',
    description: '',
    buttonText: '',
    buttonLink: '#packages-pricing',
    imageUrl: '/assets/aistudio/Welcome_to_BCA_Study_Point_005ca426.png',
    alt: 'Welcome to BCA STUDY POINT - Smart Study Materials for BCA Students: Notes, Question Bank, PYQ, Video Explanation, Practice Sets',
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
    alt: 'Special Launch Offer - BCA 3rd Semester Complete Study Package at ₹99 Only (Regular ₹199) - Limited Time Offer',
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

const SEED_PACKAGES: PackageDefinition[] = [
  {
    id: 'pkg-bca-sem3-full',
    name: 'BCA 3rd Semester Complete Study Package',
    description: 'Includes 4 Compulsory Core Subjects + Optional Language Add-on + Optional Specialization Paper.',
    compulsoryProductIds: [
      'prod-bca-maj3',
      'prod-bca-min3',
      'prod-bca-mdc3',
      'prod-bca-sec3',
    ],
    languageProductIds: [
      'prod-bca-aec3-bengali',
      'prod-bca-aec3-sanskrit',
    ],
    specializationProductIds: [
      'prod-spec-ds',
      'prod-spec-ai',
      'prod-spec-cs',
      'prod-spec-ml',
      'prod-spec-iot',
    ],
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

const SEED_OFFERS: OfferConfig[] = [
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

const SEED_SITE_SETTINGS: SiteSettings = {
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
    featuredProductIds: [
      'prod-bca-maj3',
      'prod-bca-min3',
      'prod-bca-mdc3',
      'prod-bca-sec3',
    ],
  },
  payment: {
    upiId: 'BHARATPE2D0I0H4R5P81095@unitype',
    qrCodeUrl: '/assets/aistudio/WhatsApp_Image_2026-11-10_at_7.58.34_PM_43197c9f.jpeg',
    primaryPhone: '8145775413',
    whatsappPhone: '8145775413',
  },
  updatedAt: '2026-11-10T00:00:00.000Z',
};

class Database {
  private data: DatabaseSchema;
  private deletedOrderTombstones = new Map<string, number>();
  private deletedStudentTombstones = new Map<string, number>();

  constructor() {
    this.ensureDirs();
    this.data = this.load();

    // Only ensure undefined prices have a fallback; NEVER overwrite admin-edited prices!
    let migrated = false;
    for (const prod of this.data.products) {
      if (prod.price === undefined || prod.price === null || Number.isNaN(Number(prod.price))) {
        prod.price = 20;
        prod.originalPrice = prod.originalPrice ?? 49;
        migrated = true;
      }
    }
    if (
      this.data.siteSettings?.payment &&
      (this.data.siteSettings.payment.whatsappPhone === '9382040746' ||
        this.data.siteSettings.payment.primaryPhone === '9382040746')
    ) {
      this.data.siteSettings.payment.primaryPhone = '8145775413';
      this.data.siteSettings.payment.whatsappPhone = '8145775413';
      migrated = true;
    }
    if (migrated) {
      this.persist();
    }

    // Initial and periodic synchronization with Firebase Realtime Database
    this.syncWithFirebaseOrders().catch(() => {});
    this.syncWithFirebaseStudents().catch(() => {});
    setInterval(() => {
      this.syncWithFirebaseOrders().catch(() => {});
    }, 4000);
  }

  async syncWithFirebaseOrders(): Promise<void> {
    try {
      const rtdbOrders = await firebaseSync.fetchOrders();
      if (!rtdbOrders) return;
      let changed = false;
      const now = Date.now();
      for (const [key, val] of Object.entries<any>(rtdbOrders)) {
        if (!val || typeof val !== 'object') continue;
        const ordId = val.orderId || key;
        const deletedAt = this.deletedOrderTombstones.get(ordId);
        if (deletedAt && now - deletedAt < 120_000) continue;
        const existing = this.data.orders.find((o) => o.orderId === ordId);
        if (!existing) {
          const newOrder: Order = {
            orderId: ordId,
            userId: val.userId || `std_${ordId}`,
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
            ipAddress: val.ipAddress || '127.0.0.1',
            userAgent: val.userAgent || '',
            createdAt: val.createdAt || new Date().toISOString(),
            verifiedAt: val.verifiedAt,
            rejectionReason: val.rejectionReason,
          };
          this.data.orders.push(newOrder);
          changed = true;

          // If the order is already verified, grant purchases
          if (newOrder.paymentStatus === 'verified') {
            for (const prodId of newOrder.selectedProductIds) {
              const hasPur = this.data.purchases.some((p) => p.userId === newOrder.userId && p.productId === prodId);
              if (!hasPur) {
                this.data.purchases.push({
                  purchaseId: `pur-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                  userId: newOrder.userId,
                  productId: prodId,
                  orderId: newOrder.orderId,
                  accessStatus: 'active',
                  createdAt: newOrder.createdAt,
                });
              }
            }
          }
        } else {
          // If status changed in RTDB
          if (val.paymentStatus && existing.paymentStatus !== val.paymentStatus) {
            existing.paymentStatus = val.paymentStatus;
            existing.verifiedAt = val.verifiedAt || existing.verifiedAt;
            changed = true;
            if (val.paymentStatus === 'verified') {
              for (const prodId of existing.selectedProductIds) {
                const pItem = this.data.purchases.find((p) => p.userId === existing.userId && p.productId === prodId);
                if (pItem) {
                  pItem.accessStatus = 'active';
                } else {
                  this.data.purchases.push({
                    purchaseId: `pur-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                    userId: existing.userId,
                    productId: prodId,
                    orderId: existing.orderId,
                    accessStatus: 'active',
                    createdAt: new Date().toISOString(),
                  });
                }
              }
            }
          }
        }
      }
      if (changed) {
        this.persist();
      }
    } catch (e) {
      console.warn('syncWithFirebaseOrders notice:', e);
    }
  }

  async syncWithFirebaseStudents(): Promise<void> {
    try {
      const rtdbStudents = await firebaseSync.fetchStudents();
      if (!rtdbStudents || typeof rtdbStudents !== 'object') return;
      let changed = false;
      const now = Date.now();
      for (const [key, val] of Object.entries<any>(rtdbStudents)) {
        if (!val || typeof val !== 'object') continue;
        const uid = val.id || key;
        const deletedAt = this.deletedStudentTombstones.get(uid);
        if (deletedAt && now - deletedAt < 120_000) continue;
        const email = (val.email || '').trim().toLowerCase();
        const mobile = (val.mobile || '').replace(/\D/g, '');
        const existing = this.data.students.find(
          (s) =>
            s.id === uid ||
            (email && s.email.toLowerCase() === email) ||
            (mobile.length >= 10 && s.mobile.replace(/\D/g, '') === mobile)
        );
        if (!existing && (email || mobile || val.fullName)) {
          this.data.students.push({
            id: val.id || key,
            email: email || `${mobile || key}@student.bcastudypoint.com`,
            fullName: val.fullName || 'BCA Student',
            mobile: val.mobile || '',
            collegeName: val.collegeName,
            studentId: val.studentId,
            registeredAt: val.registeredAt || val.createdAt || val.updatedAt || new Date().toISOString(),
            lastLoginAt: val.lastLoginAt || val.lastActive || val.updatedAt || new Date().toISOString(),
          });
          changed = true;
        }
      }
      if (changed) {
        this.persist();
      }
    } catch (e) {
      console.warn('syncWithFirebaseStudents notice:', e);
    }
  }

  private ensureDirs() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(PDF_STORAGE_DIR)) {
      fs.mkdirSync(PDF_STORAGE_DIR, { recursive: true });
    }
    if (!fs.existsSync(PUBLIC_UPLOADS_DIR)) {
      fs.mkdirSync(PUBLIC_UPLOADS_DIR, { recursive: true });
    }
  }

  private load(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        const loaded: DatabaseSchema = {
          semesters: parsed.semesters || SEED_SEMESTERS,
          products: parsed.products || SEED_PRODUCTS,
          students: parsed.students || [],
          orders: parsed.orders || [],
          purchases: parsed.purchases || [],
          devices: parsed.devices || [],
          viewerSessions: parsed.viewerSessions || [],
          adminAuditLogs: parsed.adminAuditLogs || [],
          banners: Array.isArray(parsed.banners) && parsed.banners.length > 0 ? parsed.banners : SEED_BANNERS,
          packages: Array.isArray(parsed.packages) && parsed.packages.length > 0 ? parsed.packages : SEED_PACKAGES,
          offers: Array.isArray(parsed.offers) && parsed.offers.length > 0 ? parsed.offers : SEED_OFFERS,
          siteSettings: parsed.siteSettings
            ? {
                ...SEED_SITE_SETTINGS,
                ...parsed.siteSettings,
                announcement: { ...SEED_SITE_SETTINGS.announcement, ...(parsed.siteSettings.announcement || {}) },
                homepage: { ...SEED_SITE_SETTINGS.homepage, ...(parsed.siteSettings.homepage || {}) },
                payment: { ...SEED_SITE_SETTINGS.payment, ...(parsed.siteSettings.payment || {}) },
              }
            : SEED_SITE_SETTINGS,
        };
        return loaded;
      }
    } catch (e) {
      console.error('Failed to parse database file, re-initializing seeds', e);
    }

    const initial: DatabaseSchema = {
      semesters: SEED_SEMESTERS,
      products: SEED_PRODUCTS,
      students: [],
      orders: [],
      purchases: [],
      devices: [],
      viewerSessions: [],
      adminAuditLogs: [
        {
          id: 'log-seed-1',
          adminId: 'system',
          action: 'SYSTEM_BOOTSTRAP',
          details: 'Initialized BCA Study Point core semesters and question banks.',
          timestamp: new Date().toISOString(),
        },
      ],
      banners: SEED_BANNERS,
      packages: SEED_PACKAGES,
      offers: SEED_OFFERS,
      siteSettings: SEED_SITE_SETTINGS,
    };
    this.saveData(initial);
    return initial;
  }

  private saveData(dataToSave: DatabaseSchema) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving database to file:', err);
    }
  }

  private persist() {
    this.saveData(this.data);
  }

  // --- SEMESTERS ---
  getSemesters(): Semester[] {
    return this.data.semesters;
  }

  getPublishedSemesters(): Semester[] {
    return this.data.semesters.filter((s) => s.published);
  }

  getSemester(id: string): Semester | undefined {
    return this.data.semesters.find((s) => s.id === id);
  }

  createSemester(sem: Omit<Semester, 'id' | 'createdAt' | 'updatedAt'>): Semester {
    const newSem: Semester = {
      ...sem,
      id: `sem-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.semesters.push(newSem);
    this.persist();
    return newSem;
  }

  updateSemester(id: string, updates: Partial<Semester>): Semester | undefined {
    const idx = this.data.semesters.findIndex((s) => s.id === id);
    if (idx === -1) return undefined;
    this.data.semesters[idx] = {
      ...this.data.semesters[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    return this.data.semesters[idx];
  }

  // --- PRODUCTS ---
  getProducts(): Product[] {
    return this.data.products;
  }

  getPublishedProducts(): Product[] {
    return this.data.products.filter((p) => p.published);
  }

  getProduct(id: string): Product | undefined {
    return this.data.products.find((p) => p.id === id);
  }

  createProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Product {
    const newProduct: Product = {
      ...product,
      id: `prod-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.products.push(newProduct);
    this.persist();
    firebaseSync.syncSingleProduct(newProduct).catch(() => {});
    return newProduct;
  }

  updateProduct(id: string, updates: Partial<Product>): Product | undefined {
    const idx = this.data.products.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    this.data.products[idx] = {
      ...this.data.products[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
    firebaseSync.syncSingleProduct(this.data.products[idx]).catch(() => {});
    return this.data.products[idx];
  }

  deleteProduct(id: string): boolean {
    const initialLen = this.data.products.length;
    this.data.products = this.data.products.filter((p) => p.id !== id);
    if (this.data.products.length !== initialLen) {
      this.persist();
      firebaseSync.deleteProduct(id).catch(() => {});
      return true;
    }
    return false;
  }

  // --- STUDENTS ---
  getStudents(): Student[] {
    return this.data.students;
  }

  getStudent(id: string): Student | undefined {
    return this.data.students.find((s) => s.id === id);
  }

  getStudentByEmail(email: string): Student | undefined {
    return this.data.students.find(
      (s) => s.email.toLowerCase().trim() === email.toLowerCase().trim()
    );
  }

  getStudentByEmailOrMobile(identifier: string): Student | undefined {
    const clean = identifier.trim().toLowerCase();
    const cleanDigits = clean.replace(/\D/g, '');
    return this.data.students.find((s) => {
      const emailMatch = s.email.toLowerCase().trim() === clean;
      const mobileMatch = cleanDigits.length >= 10 && s.mobile.replace(/\D/g, '') === cleanDigits;
      return emailMatch || mobileMatch;
    });
  }

  upsertStudent(studentData: {
    email: string;
    fullName: string;
    mobile: string;
    collegeName?: string;
    studentId?: string;
    ip?: string;
  }): Student {
    let student = this.getStudentByEmail(studentData.email);
    if (!student && studentData.mobile) {
      student = this.getStudentByEmailOrMobile(studentData.mobile);
    }

    if (student) {
      student.fullName = studentData.fullName || student.fullName;
      student.mobile = studentData.mobile || student.mobile;
      if (studentData.collegeName) student.collegeName = studentData.collegeName;
      if (studentData.studentId) student.studentId = studentData.studentId;
      student.lastLoginAt = new Date().toISOString();
      if (studentData.ip) student.lastIp = studentData.ip;
      this.persist();
      return student;
    }

    student = {
      id: `std-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      email: studentData.email.toLowerCase().trim(),
      fullName: studentData.fullName,
      mobile: studentData.mobile,
      collegeName: studentData.collegeName,
      studentId: studentData.studentId,
      registeredAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      lastIp: studentData.ip,
    };
    this.data.students.push(student);
    this.persist();
    firebaseSync.syncStudent(student).catch(() => {});
    return student;
  }

  // --- ORDERS ---
  getOrders(): Order[] {
    return this.data.orders.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getOrder(orderId: string): Order | undefined {
    return this.data.orders.find((o) => o.orderId === orderId);
  }

  getStudentOrders(identifier: string): Order[] {
    if (!identifier) return [];
    const clean = identifier.trim().toLowerCase();
    const cleanMobile = identifier.replace(/\D/g, '');

    // Find student in DB by ID, email, or mobile
    const student = this.data.students.find(
      (s) =>
        s.id === identifier ||
        s.email.toLowerCase() === clean ||
        (cleanMobile.length >= 10 && s.mobile.replace(/\D/g, '') === cleanMobile)
    );

    const matchEmails = new Set<string>();
    const matchMobiles = new Set<string>();
    const matchUserIds = new Set<string>([identifier]);

    if (student) {
      matchUserIds.add(student.id);
      if (student.email) matchEmails.add(student.email.toLowerCase());
      if (student.mobile) matchMobiles.add(student.mobile.replace(/\D/g, ''));
    }
    if (clean.includes('@')) {
      matchEmails.add(clean);
    }
    if (cleanMobile.length >= 10) {
      matchMobiles.add(cleanMobile);
    }

    return this.data.orders
      .filter((o) => {
        if (matchUserIds.has(o.userId)) return true;
        if (o.studentEmail && matchEmails.has(o.studentEmail.toLowerCase())) return true;
        if (o.studentMobile && matchMobiles.has(o.studentMobile.replace(/\D/g, ''))) return true;
        return false;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  createOrder(order: Order): Order {
    this.data.orders.push(order);
    this.persist();
    firebaseSync.syncOrder(order).catch(() => {});
    return order;
  }

  updateOrder(orderId: string, updates: Partial<Order>): Order | undefined {
    const idx = this.data.orders.findIndex((o) => o.orderId === orderId);
    if (idx === -1) return undefined;
    this.data.orders[idx] = {
      ...this.data.orders[idx],
      ...updates,
    };
    this.persist();
    firebaseSync.syncOrder(this.data.orders[idx]).catch(() => {});
    return this.data.orders[idx];
  }

  approveOrder(orderId: string, adminId: string = 'admin'): { success: boolean; order?: Order; error?: string } {
    const order = this.getOrder(orderId);
    if (!order) return { success: false, error: 'Order not found' };

    order.paymentStatus = 'verified';
    order.verifiedAt = new Date().toISOString();

    // Activate all purchases linked to this order or student
    for (const prodId of order.selectedProductIds) {
      const existing = this.data.purchases.find(
        (p) => p.userId === order.userId && p.productId === prodId
      );
      if (existing) {
        existing.accessStatus = 'active';
        existing.orderId = order.orderId;
      } else {
        this.data.purchases.push({
          purchaseId: `pur-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId: order.userId,
          productId: prodId,
          orderId: order.orderId,
          accessStatus: 'active',
          createdAt: new Date().toISOString(),
        });
      }
    }

    this.logAdminAction({
      adminId,
      action: 'APPROVE_ORDER',
      targetId: orderId,
      targetType: 'ORDER',
      details: `Approved payment for order ${orderId} (${order.studentName}, ₹${order.totalAmount}). Full PDF access granted for ${order.selectedProductIds.length} subjects.`,
    });

    this.persist();
    firebaseSync.syncOrder(order).catch(() => {});
    return { success: true, order };
  }

  rejectOrder(orderId: string, adminId: string = 'admin', reason?: string): { success: boolean; order?: Order; error?: string } {
    const order = this.getOrder(orderId);
    if (!order) return { success: false, error: 'Order not found' };

    order.paymentStatus = 'rejected';

    for (const prodId of order.selectedProductIds) {
      const purchase = this.data.purchases.find(
        (p) => p.userId === order.userId && p.productId === prodId && p.orderId === orderId
      );
      if (purchase) {
        purchase.accessStatus = 'revoked';
      }
    }

    this.logAdminAction({
      adminId,
      action: 'REJECT_ORDER',
      targetId: orderId,
      targetType: 'ORDER',
      details: `Rejected order ${orderId} (${order.studentName}). Reason: ${reason || 'Payment verification failed'}`,
    });

    this.persist();
    firebaseSync.syncOrder(order).catch(() => {});
    return { success: true, order };
  }

  deleteOrder(orderId: string, adminId: string = 'admin'): { success: boolean; error?: string } {
    const idx = this.data.orders.findIndex((o) => o.orderId === orderId);
    if (idx === -1) return { success: false, error: 'Order not found' };

    const order = this.data.orders[idx];
    this.data.orders.splice(idx, 1);

    // Remove any purchases directly tied to this order
    this.data.purchases = this.data.purchases.filter((p) => p.orderId !== orderId);

    this.logAdminAction({
      adminId,
      action: 'DELETE_ORDER',
      targetId: orderId,
      targetType: 'ORDER',
      details: `Deleted order ${orderId} (${order.studentName}, ₹${order.totalAmount}) and associated access records.`,
    });

    this.deletedOrderTombstones.set(orderId, Date.now());
    this.persist();
    firebaseSync.deleteOrder(orderId).catch(() => {});
    return { success: true };
  }

  async deleteCustomer(
    customerId: string,
    options?: { email?: string; mobile?: string; orderIds?: string[] },
    adminId: string = 'admin'
  ): Promise<{
    success: boolean;
    deletedName?: string;
    deletedOrderIds: string[];
    deletedUserIds: string[];
    error?: string;
  }> {
    const cleanEmail = (options?.email || '').trim().toLowerCase();
    const cleanMobile = (options?.mobile || '').replace(/\D/g, '');
    const seedOrderIds = Array.isArray(options?.orderIds) ? options!.orderIds : [];

    const userIdsToDelete = new Set<string>();
    const emailsToDelete = new Set<string>();
    const mobilesToDelete = new Set<string>();
    const orderIdsToDelete = new Set<string>(seedOrderIds);

    if (customerId) {
      if (customerId.startsWith('cust-')) {
        orderIdsToDelete.add(customerId.slice(5));
      } else {
        userIdsToDelete.add(customerId);
      }
    }
    if (cleanEmail) emailsToDelete.add(cleanEmail);
    if (cleanMobile.length >= 10) mobilesToDelete.add(cleanMobile);

    let deletedName = '';

    // 1. Collect matching student IDs, emails, and mobiles
    for (const s of this.data.students) {
      const sEmail = (s.email || '').trim().toLowerCase();
      const sMobile = (s.mobile || '').replace(/\D/g, '');
      const matches =
        s.id === customerId ||
        (sEmail && emailsToDelete.has(sEmail)) ||
        (sMobile.length >= 10 && mobilesToDelete.has(sMobile));

      if (matches) {
        userIdsToDelete.add(s.id);
        if (sEmail) emailsToDelete.add(sEmail);
        if (sMobile.length >= 10) mobilesToDelete.add(sMobile);
        if (!deletedName && s.fullName) deletedName = s.fullName;
      }
    }

    // 2. Collect matching order IDs and linked user IDs
    for (const o of this.data.orders) {
      const oEmail = (o.studentEmail || '').trim().toLowerCase();
      const oMobile = (o.studentMobile || '').replace(/\D/g, '');
      const matches =
        orderIdsToDelete.has(o.orderId) ||
        userIdsToDelete.has(o.userId) ||
        `cust-${o.orderId}` === customerId ||
        (oEmail && emailsToDelete.has(oEmail)) ||
        (oMobile.length >= 10 && mobilesToDelete.has(oMobile));

      if (matches) {
        orderIdsToDelete.add(o.orderId);
        if (o.userId) userIdsToDelete.add(o.userId);
        if (oEmail) emailsToDelete.add(oEmail);
        if (oMobile.length >= 10) mobilesToDelete.add(oMobile);
        if (!deletedName && o.studentName) deletedName = o.studentName;
      }
    }

    const beforeStudents = this.data.students.length;
    const beforeOrders = this.data.orders.length;

    // 3. Remove from all local collections
    this.data.students = this.data.students.filter((s) => {
      const sEmail = (s.email || '').trim().toLowerCase();
      const sMobile = (s.mobile || '').replace(/\D/g, '');
      return !(
        userIdsToDelete.has(s.id) ||
        (sEmail && emailsToDelete.has(sEmail)) ||
        (sMobile.length >= 10 && mobilesToDelete.has(sMobile))
      );
    });

    this.data.orders = this.data.orders.filter((o) => {
      const oEmail = (o.studentEmail || '').trim().toLowerCase();
      const oMobile = (o.studentMobile || '').replace(/\D/g, '');
      return !(
        orderIdsToDelete.has(o.orderId) ||
        userIdsToDelete.has(o.userId) ||
        (oEmail && emailsToDelete.has(oEmail)) ||
        (oMobile.length >= 10 && mobilesToDelete.has(oMobile))
      );
    });

    this.data.purchases = this.data.purchases.filter(
      (p) => !userIdsToDelete.has(p.userId) && (!p.orderId || !orderIdsToDelete.has(p.orderId))
    );

    this.data.devices = this.data.devices.filter((d) => {
      const dEmail = (d.userEmail || '').trim().toLowerCase();
      return !userIdsToDelete.has(d.userId) && !(dEmail && emailsToDelete.has(dEmail));
    });

    this.data.viewerSessions = this.data.viewerSessions.filter(
      (vs) => !userIdsToDelete.has(vs.userId)
    );

    const removedStudentsCount = beforeStudents - this.data.students.length;
    const removedOrdersCount = beforeOrders - this.data.orders.length;

    if (removedStudentsCount === 0 && removedOrdersCount === 0 && userIdsToDelete.size === 0) {
      return {
        success: false,
        deletedOrderIds: [],
        deletedUserIds: [],
        error: 'Customer record not found.',
      };
    }

    const displayLabel = deletedName || cleanEmail || cleanMobile || customerId;
    this.logAdminAction({
      adminId,
      action: 'DELETE_CUSTOMER',
      targetId: customerId,
      targetType: 'STUDENT',
      details: `Permanently deleted customer "${displayLabel}" (${removedOrdersCount} order(s) removed, all PDF access & device bindings revoked).`,
    });

    const now = Date.now();
    for (const uid of userIdsToDelete) {
      this.deletedStudentTombstones.set(uid, now);
    }
    for (const oid of orderIdsToDelete) {
      this.deletedOrderTombstones.set(oid, now);
    }

    this.persist();

    // 4. Clean up matching RTDB entries asynchronously in the background so Delete returns immediately
    const rtdbPromises: Promise<any>[] = [];
    for (const uid of userIdsToDelete) {
      rtdbPromises.push(firebaseSync.deleteStudent(uid));
    }
    for (const oid of orderIdsToDelete) {
      rtdbPromises.push(firebaseSync.deleteOrder(oid));
    }
    Promise.allSettled(rtdbPromises).catch(() => {});

    return {
      success: true,
      deletedName: displayLabel,
      deletedOrderIds: Array.from(orderIdsToDelete),
      deletedUserIds: Array.from(userIdsToDelete),
    };
  }

  // --- PURCHASES ---
  getPurchases(): Purchase[] {
    return this.data.purchases;
  }

  getStudentPurchases(identifier: string): Purchase[] {
    const studentOrders = this.getStudentOrders(identifier);
    const orderIds = new Set(studentOrders.map((o) => o.orderId));
    const userIds = new Set(studentOrders.map((o) => o.userId));
    if (identifier) userIds.add(identifier);

    return this.data.purchases.filter(
      (p) =>
        (userIds.has(p.userId) || (p.orderId && orderIds.has(p.orderId))) &&
        (p.accessStatus === 'active' || p.accessStatus === 'pending_approval')
    );
  }

  hasPurchased(userId: string, productId: string): boolean {
    const purchases = this.getStudentPurchases(userId);
    return purchases.some(
      (p) => p.productId === productId && p.accessStatus === 'active'
    );
  }

  getPurchaseStatus(userId: string, productId: string): 'active' | 'pending_approval' | 'revoked' | 'unpurchased' {
    const purchases = this.getStudentPurchases(userId);
    const p = purchases.find((pur) => pur.productId === productId);
    if (!p) return 'unpurchased';
    return p.accessStatus;
  }

  grantPurchases(
    userId: string,
    orderId: string,
    productIds: string[],
    status: 'active' | 'pending_approval' = 'active'
  ): Purchase[] {
    const created: Purchase[] = [];
    for (const prodId of productIds) {
      const exists = this.data.purchases.find(
        (p) => p.userId === userId && p.productId === prodId
      );
      if (exists) {
        exists.accessStatus = status;
        exists.orderId = orderId;
        created.push(exists);
      } else {
        const purchase: Purchase = {
          purchaseId: `pur-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId,
          productId: prodId,
          orderId,
          accessStatus: status,
          createdAt: new Date().toISOString(),
        };
        this.data.purchases.push(purchase);
        created.push(purchase);
      }
    }
    this.persist();
    return created;
  }

  // --- DEVICE BINDING ---
  getDevices(): DeviceBinding[] {
    return this.data.devices;
  }

  getStudentDevice(userId: string): DeviceBinding | undefined {
    return this.data.devices.find(
      (d) => d.userId === userId && d.registrationStatus === 'active'
    );
  }

  registerDevice(deviceData: {
    userId: string;
    userEmail: string;
    studentName: string;
    deviceTokenHash: string;
    deviceDescription: string;
    os: string;
    browser: string;
    ip: string;
  }): { success: boolean; device?: DeviceBinding; error?: string } {
    const existing = this.data.devices.find(
      (d) => d.userId === deviceData.userId && d.registrationStatus === 'active'
    );

    if (existing) {
      if (existing.deviceTokenHash === deviceData.deviceTokenHash) {
        existing.lastSeenAt = new Date().toISOString();
        existing.lastIp = deviceData.ip;
        this.persist();
        return { success: true, device: existing };
      } else {
        return {
          success: false,
          error: 'DEVICE_MISMATCH',
          device: existing,
        };
      }
    }

    const newDevice: DeviceBinding = {
      id: `dev-${Date.now()}`,
      userId: deviceData.userId,
      userEmail: deviceData.userEmail,
      studentName: deviceData.studentName,
      deviceTokenHash: deviceData.deviceTokenHash,
      deviceDescription: deviceData.deviceDescription,
      os: deviceData.os,
      browser: deviceData.browser,
      registeredAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      lastIp: deviceData.ip,
      registrationStatus: 'active',
      resetCount: 0,
    };

    this.data.devices.push(newDevice);
    this.persist();
    return { success: true, device: newDevice };
  }

  resetStudentDevice(userId: string, adminId: string, reason: string): boolean {
    const devices = this.data.devices.filter(
      (d) => d.userId === userId && d.registrationStatus === 'active'
    );
    if (devices.length === 0) return false;

    for (const d of devices) {
      d.registrationStatus = 'revoked';
      d.resetCount += 1;
    }

    // Invalidate any active viewer sessions for this user
    this.data.viewerSessions = this.data.viewerSessions.filter((s) => s.userId !== userId);

    firebaseSync.clearActiveDevice(userId).catch(() => {});

    this.logAdminAction({
      adminId,
      action: 'DEVICE_RESET',
      targetId: userId,
      targetType: 'STUDENT',
      details: `Revoked registered device for user ${userId}. Reason: ${reason}`,
    });

    this.persist();
    return true;
  }

  deleteDevice(userId: string, adminId: string): boolean {
    const initialLen = this.data.devices.length;
    this.data.devices = this.data.devices.filter((d) => d.userId !== userId);
    this.data.viewerSessions = this.data.viewerSessions.filter((s) => s.userId !== userId);
    firebaseSync.clearActiveDevice(userId).catch(() => {});
    this.persist();
    this.logAdminAction({
      adminId,
      action: 'DEVICE_DELETED',
      targetId: userId,
      targetType: 'STUDENT',
      details: `Permanently removed device binding for student ${userId}`,
    });
    return this.data.devices.length < initialLen;
  }

  releaseStudentDevice(userId: string): boolean {
    const devices = this.data.devices.filter(
      (d) => d.userId === userId && d.registrationStatus === 'active'
    );
    for (const d of devices) {
      d.registrationStatus = 'logged_out';
      d.lastSeenAt = new Date().toISOString();
    }
    this.data.viewerSessions = this.data.viewerSessions.filter((s) => s.userId !== userId);
    this.persist();
    firebaseSync.clearActiveDevice(userId).catch(() => {});
    return true;
  }

  checkAndBindStudentDevice(deviceData: {
    userId: string;
    userEmail: string;
    studentName: string;
    deviceToken: string;
    deviceDescription?: string;
    os?: string;
    browser?: string;
    ip?: string;
  }): { success: boolean; device?: DeviceBinding; error?: string; message?: string; activeDevice?: any } {
    const clientIp = deviceData.ip || '127.0.0.1';
    const tokenHash = crypto.createHash('sha256').update(deviceData.deviceToken).digest('hex');

    // Look for currently active device for this user
    const existing = this.data.devices.find(
      (d) => d.userId === deviceData.userId && d.registrationStatus === 'active'
    );

    if (existing) {
      // If it's the exact same registered device (same browser token)
      if (existing.deviceTokenHash === tokenHash) {
        existing.lastSeenAt = new Date().toISOString();
        existing.lastIp = clientIp;
        if (deviceData.os) existing.os = deviceData.os;
        if (deviceData.browser) existing.browser = deviceData.browser;
        this.persist();
        firebaseSync.syncActiveDevice(deviceData.userId, existing).catch(() => {});
        return { success: true, device: existing };
      }

      // If a DIFFERENT device is already logged in and active
      return {
        success: false,
        error: 'DEVICE_ALREADY_ACTIVE',
        message: 'আপনার অ্যাকাউন্টটি ইতিমধ্যে অন্য একটি ডিভাইসে সক্রিয় রয়েছে (বর্তমানে লগইন আছে)। একটি অ্যাকাউন্টে একসাথে কেবল ১টি ডিভাইসে লগইন রাখা অনুমোদিত। অনুগ্রহ করে আপনার পূর্বের ডিভাইস থেকে লগআউট করুন, অথবা কলেজ অ্যাডমিনের সহায়তা নিন।',
        activeDevice: {
          deviceDescription: existing.deviceDescription,
          os: existing.os,
          browser: existing.browser,
          lastSeenAt: existing.lastSeenAt,
          registeredAt: existing.registeredAt,
        },
      };
    }

    // No active device currently bound -> bind this device as active
    const newDevice: DeviceBinding = {
      id: `dev-${Date.now()}`,
      userId: deviceData.userId,
      userEmail: deviceData.userEmail,
      studentName: deviceData.studentName,
      deviceTokenHash: tokenHash,
      deviceDescription: deviceData.deviceDescription || `${deviceData.os || 'Device'} · ${deviceData.browser || 'Browser'}`,
      os: deviceData.os || 'Unknown OS',
      browser: deviceData.browser || 'Browser',
      registeredAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      lastIp: clientIp,
      registrationStatus: 'active',
      resetCount: 0,
    };

    this.data.devices.push(newDevice);
    this.persist();
    firebaseSync.syncActiveDevice(deviceData.userId, newDevice).catch(() => {});
    return { success: true, device: newDevice };
  }

  // --- VIEWER SESSIONS ---
  createViewerSession(session: ViewerSession): ViewerSession {
    this.cleanExpiredSessions();
    this.data.viewerSessions.push(session);
    this.persist();
    return session;
  }

  getViewerSession(token: string): ViewerSession | undefined {
    this.cleanExpiredSessions();
    return this.data.viewerSessions.find((s) => s.token === token);
  }

  private cleanExpiredSessions() {
    const now = Date.now();
    this.data.viewerSessions = this.data.viewerSessions.filter(
      (s) => s.expiresAt > now
    );
  }

  // --- AUDIT LOGS ---
  logAdminAction(log: Omit<AdminAuditLog, 'id' | 'timestamp'>): AdminAuditLog {
    const fullLog: AdminAuditLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.data.adminAuditLogs.unshift(fullLog);
    if (this.data.adminAuditLogs.length > 500) {
      this.data.adminAuditLogs = this.data.adminAuditLogs.slice(0, 500);
    }
    this.persist();
    return fullLog;
  }

  clearOrdersAndStudentData(adminId: string = 'admin') {
    this.data.orders = [];
    this.data.purchases = [];
    this.data.students = [];
    this.data.devices = [];
    this.data.viewerSessions = [];
    this.persist();
    this.logAdminAction({
      adminId,
      action: 'SYSTEM_DATA_CLEARED',
      details: 'All old orders, test purchases, students, and device sessions cleared.',
    });
    return true;
  }

  getAuditLogs(): AdminAuditLog[] {
    return this.data.adminAuditLogs;
  }

  // --- BANNERS MANAGEMENT ---
  getBanners(): BannerSlide[] {
    return [...this.data.banners].sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  getActiveBanners(): BannerSlide[] {
    return this.getBanners().filter((b) => b.active !== false);
  }

  saveBanner(bannerInput: Partial<BannerSlide> & { id?: string }): BannerSlide {
    const now = new Date().toISOString();
    if (bannerInput.id) {
      const idx = this.data.banners.findIndex((b) => b.id === bannerInput.id);
      if (idx !== -1) {
        this.data.banners[idx] = {
          ...this.data.banners[idx],
          ...bannerInput,
          updatedAt: now,
        };
        this.persist();
        firebaseSync.syncBanners(this.data.banners).catch(() => {});
        return this.data.banners[idx];
      }
    }

    const maxOrder = this.data.banners.reduce((m, b) => Math.max(m, b.order || 0), 0);
    const created: BannerSlide = {
      id: bannerInput.id || `banner-${Date.now()}`,
      title: bannerInput.title || bannerInput.heading || 'Promotional Banner',
      heading: bannerInput.heading || '',
      subtitle: bannerInput.subtitle || '',
      description: bannerInput.description || '',
      buttonText: bannerInput.buttonText || '',
      buttonLink: bannerInput.buttonLink || '#packages-pricing',
      imageUrl: bannerInput.imageUrl || '',
      alt: bannerInput.alt || bannerInput.title || 'BCA Study Point Banner',
      order: bannerInput.order ?? maxOrder + 1,
      active: bannerInput.active !== false,
      createdAt: now,
      updatedAt: now,
    };
    this.data.banners.push(created);
    this.persist();
    firebaseSync.syncBanners(this.data.banners).catch(() => {});
    return created;
  }

  deleteBanner(id: string): boolean {
    const initialLen = this.data.banners.length;
    this.data.banners = this.data.banners.filter((b) => b.id !== id);
    if (this.data.banners.length !== initialLen) {
      this.persist();
      firebaseSync.syncBanners(this.data.banners).catch(() => {});
      return true;
    }
    return false;
  }

  reorderBanners(orderedIds: string[]): BannerSlide[] {
    const idOrderMap = new Map<string, number>();
    orderedIds.forEach((id, idx) => idOrderMap.set(id, idx + 1));
    this.data.banners = this.data.banners.map((b) => ({
      ...b,
      order: idOrderMap.get(b.id) ?? b.order ?? 99,
      updatedAt: new Date().toISOString(),
    }));
    this.persist();
    firebaseSync.syncBanners(this.data.banners).catch(() => {});
    return this.getBanners();
  }

  // --- PACKAGES MANAGEMENT ---
  getPackages(): PackageDefinition[] {
    return this.data.packages;
  }

  savePackage(pkgInput: Partial<PackageDefinition> & { id?: string }): PackageDefinition {
    const now = new Date().toISOString();
    if (pkgInput.id) {
      const idx = this.data.packages.findIndex((p) => p.id === pkgInput.id);
      if (idx !== -1) {
        this.data.packages[idx] = {
          ...this.data.packages[idx],
          ...pkgInput,
          updatedAt: now,
        };
        this.persist();
        firebaseSync.syncPackages(this.data.packages).catch(() => {});
        firebaseSync.syncEffectivePricing(this.getEffectivePackagePricing()).catch(() => {});
        return this.data.packages[idx];
      }
    }

    const created: PackageDefinition = {
      id: pkgInput.id || `pkg-${Date.now()}`,
      name: pkgInput.name || 'BCA Study Package',
      description: pkgInput.description || '',
      compulsoryProductIds: pkgInput.compulsoryProductIds || [],
      languageProductIds: pkgInput.languageProductIds || [],
      specializationProductIds: pkgInput.specializationProductIds || [],
      coreRegularPrice: Number(pkgInput.coreRegularPrice ?? 99),
      coreOfferPrice: Number(pkgInput.coreOfferPrice ?? 69),
      languageRegularPrice: Number(pkgInput.languageRegularPrice ?? 15),
      languageOfferPrice: Number(pkgInput.languageOfferPrice ?? 10),
      specializationRegularPrice: Number(pkgInput.specializationRegularPrice ?? 35),
      specializationOfferPrice: Number(pkgInput.specializationOfferPrice ?? 20),
      fullPackageRegularPrice: Number(pkgInput.fullPackageRegularPrice ?? 149),
      fullPackageOfferPrice: Number(pkgInput.fullPackageOfferPrice ?? 99),
      active: pkgInput.active !== false,
      updatedAt: now,
    };
    this.data.packages.push(created);
    this.persist();
    firebaseSync.syncPackages(this.data.packages).catch(() => {});
    firebaseSync.syncEffectivePricing(this.getEffectivePackagePricing()).catch(() => {});
    return created;
  }

  deletePackage(id: string): boolean {
    const initialLen = this.data.packages.length;
    this.data.packages = this.data.packages.filter((p) => p.id !== id);
    if (this.data.packages.length !== initialLen) {
      this.persist();
      firebaseSync.syncPackages(this.data.packages).catch(() => {});
      return true;
    }
    return false;
  }

  // --- OFFERS & PRICING MANAGEMENT (WITH SERVER-SIDE EXPIRY) ---
  getOffers(): OfferConfig[] {
    return this.data.offers;
  }

  isOfferCurrentlyValid(offer: OfferConfig): { isValid: boolean; isExpired: boolean } {
    if (!offer.active) {
      return { isValid: false, isExpired: false };
    }
    const now = Date.now();
    const startMs = offer.startDate ? new Date(offer.startDate).getTime() : 0;
    const expiryMs = offer.expiryDate ? new Date(offer.expiryDate).getTime() : Number.MAX_SAFE_INTEGER;
    if (Number.isFinite(expiryMs) && now > expiryMs) {
      return { isValid: false, isExpired: true };
    }
    if (Number.isFinite(startMs) && now < startMs) {
      return { isValid: false, isExpired: false };
    }
    return { isValid: true, isExpired: false };
  }

  saveOffer(offerInput: Partial<OfferConfig> & { id?: string }): OfferConfig {
    const now = new Date().toISOString();
    const regularPrice = Number(offerInput.regularPrice ?? 149);
    const offerPrice = Number(offerInput.offerPrice ?? 99);
    const computedDiscount =
      regularPrice > 0 ? Math.max(0, Math.round(((regularPrice - offerPrice) / regularPrice) * 100)) : 0;

    if (offerInput.id) {
      const idx = this.data.offers.findIndex((o) => o.id === offerInput.id);
      if (idx !== -1) {
        const updated: OfferConfig = {
          ...this.data.offers[idx],
          ...offerInput,
          regularPrice,
          offerPrice,
          discountPercent: offerInput.discountPercent ?? computedDiscount,
          updatedAt: now,
        };
        this.data.offers[idx] = updated;

        // If this is the Full Package Offer, keep main package's fullPackage pricing synchronized
        if (updated.isFullPackageOffer && this.data.packages.length > 0) {
          this.data.packages[0].fullPackageOfferPrice = updated.offerPrice;
          this.data.packages[0].fullPackageRegularPrice = updated.regularPrice;
          this.data.packages[0].updatedAt = now;
        }

        this.persist();
        firebaseSync.syncOffers(this.data.offers).catch(() => {});
        firebaseSync.syncPackages(this.data.packages).catch(() => {});
        firebaseSync.syncEffectivePricing(this.getEffectivePackagePricing()).catch(() => {});
        return updated;
      }
    }

    const created: OfferConfig = {
      id: offerInput.id || `offer-${Date.now()}`,
      title: offerInput.title || 'Promotional Offer',
      badgeText: offerInput.badgeText || `${computedDiscount}% OFF`,
      bannerText: offerInput.bannerText || '',
      description: offerInput.description || '',
      regularPrice,
      offerPrice,
      discountPercent: offerInput.discountPercent ?? computedDiscount,
      startDate: offerInput.startDate || now,
      expiryDate: offerInput.expiryDate || '2027-03-31T23:59:59.000Z',
      active: offerInput.active !== false,
      isFullPackageOffer: Boolean(offerInput.isFullPackageOffer),
      updatedAt: now,
    };
    this.data.offers.push(created);
    this.persist();
    firebaseSync.syncOffers(this.data.offers).catch(() => {});
    firebaseSync.syncEffectivePricing(this.getEffectivePackagePricing()).catch(() => {});
    return created;
  }

  deleteOffer(id: string): boolean {
    const initialLen = this.data.offers.length;
    this.data.offers = this.data.offers.filter((o) => o.id !== id);
    if (this.data.offers.length !== initialLen) {
      this.persist();
      firebaseSync.syncOffers(this.data.offers).catch(() => {});
      firebaseSync.syncEffectivePricing(this.getEffectivePackagePricing()).catch(() => {});
      return true;
    }
    return false;
  }

  /**
   * Authoritative server-side effective package & offer pricing.
   * Automatically reverts launch/offer prices to regular prices if the offer is inactive or expired.
   */
  getEffectivePackagePricing(): EffectivePackagePricing {
    const primaryPkg = this.data.packages.find((p) => p.active) || this.data.packages[0] || SEED_PACKAGES[0];
    const fullOffer =
      this.data.offers.find((o) => o.isFullPackageOffer) ||
      this.data.offers[0] ||
      SEED_OFFERS[0];

    const offerValidity = fullOffer
      ? this.isOfferCurrentlyValid(fullOffer)
      : { isValid: false, isExpired: false };

    const coreRegular = Number(primaryPkg.coreRegularPrice) || 99;
    const coreOffer = offerValidity.isValid ? Number(primaryPkg.coreOfferPrice) || 69 : coreRegular;

    const langRegular = Number(primaryPkg.languageRegularPrice) || 15;
    const langOffer = offerValidity.isValid ? Number(primaryPkg.languageOfferPrice) || 10 : langRegular;

    const specRegular = Number(primaryPkg.specializationRegularPrice) || 35;
    const specOffer = offerValidity.isValid ? Number(primaryPkg.specializationOfferPrice) || 20 : specRegular;

    const fullRegular =
      Number(fullOffer?.regularPrice) ||
      Number(primaryPkg.fullPackageRegularPrice) ||
      coreRegular + langRegular + specRegular;
    const fullOfferPrice = offerValidity.isValid
      ? Number(fullOffer?.offerPrice) || Number(primaryPkg.fullPackageOfferPrice) || coreOffer + langOffer + specOffer
      : fullRegular;

    return {
      packageName: primaryPkg.name,
      packageDescription: primaryPkg.description,
      packageActive: primaryPkg.active !== false,
      compulsoryProductIds: primaryPkg.compulsoryProductIds,
      languageProductIds: primaryPkg.languageProductIds,
      specializationProductIds: primaryPkg.specializationProductIds,
      offerActive: offerValidity.isValid,
      offerExpired: offerValidity.isExpired,
      offerTitle: fullOffer?.title || 'Special Launch Offer',
      offerBadgeText: offerValidity.isValid
        ? fullOffer?.badgeText || `Up to ${Math.max(0, Math.round(((fullRegular - fullOfferPrice) / (fullRegular || 1)) * 100))}% OFF`
        : 'Regular Price',
      offerExpiryDate: fullOffer?.expiryDate || '',
      core: {
        title: `Main Core Package (${primaryPkg.compulsoryProductIds.length} PDFs)`,
        pdfCount: primaryPkg.compulsoryProductIds.length,
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

  /**
   * Server-trusted order total calculator based on selected products, packages, and live offers.
   */
  calculateOrderTotal(selectedProductIds: string[]): {
    totalAmount: number;
    packageName: string;
  } {
    const pricing = this.getEffectivePackagePricing();
    const selectedSet = new Set(selectedProductIds);

    const hasCorePackage =
      pricing.packageActive &&
      pricing.compulsoryProductIds.length > 0 &&
      pricing.compulsoryProductIds.every((cid) => selectedSet.has(cid));

    if (hasCorePackage) {
      const hasLang = pricing.languageProductIds.some((lid) => selectedSet.has(lid));
      const hasSpec = pricing.specializationProductIds.some((sid) => selectedSet.has(sid));

      // Check for any extra selected items outside standard core+1 lang+1 spec
      const chosenLang = pricing.languageProductIds.find((lid) => selectedSet.has(lid));
      const chosenSpec = pricing.specializationProductIds.find((sid) => selectedSet.has(sid));
      const standardSet = new Set<string>(pricing.compulsoryProductIds);
      if (chosenLang) standardSet.add(chosenLang);
      if (chosenSpec) standardSet.add(chosenSpec);

      let extraTotal = 0;
      for (const pid of selectedProductIds) {
        if (!standardSet.has(pid)) {
          const prod = this.getProduct(pid);
          if (prod) extraTotal += Number(prod.price) || 0;
        }
      }

      if (hasLang && hasSpec) {
        return {
          totalAmount: pricing.fullPackageOfferPrice + extraTotal,
          packageName: pricing.packageName || 'Complete Full Package',
        };
      }

      let pkgTotal = pricing.core.launchPrice;
      let label = 'Main Core Package';
      if (hasLang) {
        pkgTotal += pricing.language.launchPrice;
        label = 'Main + Language Add-on';
      }
      if (hasSpec) {
        pkgTotal += pricing.specialization.launchPrice;
        label = 'Main + Specialization Add-on';
      }

      return {
        totalAmount: pkgTotal + extraTotal,
        packageName: label,
      };
    }

    // Individual product selection sum
    let sum = 0;
    for (const pid of selectedProductIds) {
      const prod = this.getProduct(pid);
      if (prod) sum += Number(prod.price) || 0;
    }
    return {
      totalAmount: sum,
      packageName: selectedProductIds.length === 1 ? 'Single Subject PDF' : 'Custom Subject Selection',
    };
  }

  // --- WEBSITE SETTINGS MANAGEMENT ---
  getSiteSettings(): SiteSettings {
    return this.data.siteSettings;
  }

  updateSiteSettings(updates: Partial<SiteSettings>): SiteSettings {
    const current = this.data.siteSettings;
    const next: SiteSettings = {
      ...current,
      ...updates,
      announcement: {
        ...current.announcement,
        ...(updates.announcement || {}),
      },
      homepage: {
        ...current.homepage,
        ...(updates.homepage || {}),
      },
      payment: {
        ...current.payment,
        ...(updates.payment || {}),
      },
      updatedAt: new Date().toISOString(),
    };
    this.data.siteSettings = next;
    this.persist();
    firebaseSync.syncSiteSettings(next).catch(() => {});
    return next;
  }

  // --- CUSTOMER DIRECTORY AGGREGATION (REAL DATA ONLY) ---
  getCustomersSummary(): CustomerSummary[] {
    const productsMap = new Map<string, Product>();
    this.data.products.forEach((p) => productsMap.set(p.id, p));

    interface CustomerAccumulator {
      customerId: string;
      fullName: string;
      mobile: string;
      email: string;
      collegeName?: string;
      registeredAt: string | null;
      lastLoginAt: string | null;
      orders: Order[];
      userIds: Set<string>;
    }

    const customersByKey = new Map<string, CustomerAccumulator>();

    const resolveKey = (email?: string, mobile?: string, userId?: string): string => {
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanMobile = (mobile || '').replace(/\D/g, '');
      // Check existing bucket by email, mobile, or userId
      for (const [k, acc] of customersByKey.entries()) {
        if (cleanEmail && acc.email && acc.email === cleanEmail) return k;
        if (cleanMobile.length >= 10 && acc.mobile && acc.mobile.replace(/\D/g, '') === cleanMobile) return k;
        if (userId && acc.userIds.has(userId)) return k;
      }
      if (cleanEmail && !cleanEmail.endsWith('@student.bcastudypoint.com')) return `email:${cleanEmail}`;
      if (cleanMobile.length >= 10) return `mob:${cleanMobile}`;
      if (cleanEmail) return `email:${cleanEmail}`;
      return `uid:${userId || 'unknown'}`;
    };

    // 1. Seed from registered students
    for (const s of this.data.students) {
      const key = resolveKey(s.email, s.mobile, s.id);
      const existing = customersByKey.get(key);
      if (!existing) {
        customersByKey.set(key, {
          customerId: s.id,
          fullName: s.fullName || 'Student',
          mobile: s.mobile || '',
          email: (s.email || '').toLowerCase(),
          collegeName: s.collegeName,
          registeredAt: s.registeredAt || null,
          lastLoginAt: s.lastLoginAt || null,
          orders: [],
          userIds: new Set([s.id]),
        });
      } else {
        existing.userIds.add(s.id);
        if (!existing.fullName && s.fullName) existing.fullName = s.fullName;
        if (!existing.mobile && s.mobile) existing.mobile = s.mobile;
        if (!existing.collegeName && s.collegeName) existing.collegeName = s.collegeName;
        if (!existing.registeredAt && s.registeredAt) existing.registeredAt = s.registeredAt;
      }
    }

    // 2. Merge all orders (ensuring direct checkout customers are included accurately)
    for (const ord of this.getOrders()) {
      const key = resolveKey(ord.studentEmail, ord.studentMobile, ord.userId);
      let acc = customersByKey.get(key);
      if (!acc) {
        acc = {
          customerId: ord.userId || `cust-${ord.orderId}`,
          fullName: ord.studentName || 'Student',
          mobile: ord.studentMobile || '',
          email: (ord.studentEmail || '').toLowerCase(),
          collegeName: ord.collegeName,
          registeredAt: null,
          lastLoginAt: null,
          orders: [],
          userIds: new Set(ord.userId ? [ord.userId] : []),
        };
        customersByKey.set(key, acc);
      }
      if (ord.userId) acc.userIds.add(ord.userId);
      if (ord.studentName && (!acc.fullName || acc.fullName === 'Student')) acc.fullName = ord.studentName;
      if (ord.studentMobile && !acc.mobile) acc.mobile = ord.studentMobile;
      if (ord.collegeName && !acc.collegeName) acc.collegeName = ord.collegeName;
      acc.orders.push(ord);
    }

    // 3. Build rich CustomerSummary records
    const summaries: CustomerSummary[] = [];
    const pricing = this.getEffectivePackagePricing();

    for (const acc of customersByKey.values()) {
      const sortedOrders = [...acc.orders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const verifiedOrders = sortedOrders.filter((o) => o.paymentStatus === 'verified');
      const pendingOrders = sortedOrders.filter((o) => o.paymentStatus === 'pending');
      const totalAmountSpent = verifiedOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

      // Collect unique purchased subjects from verified orders + active purchases
      const subjectMap = new Map<string, CustomerPurchasedSubject>();
      const packageSet = new Set<string>();

      for (const ord of verifiedOrders) {
        if (ord.packageName) {
          packageSet.add(ord.packageName);
        } else {
          // Derive package label honestly from order items if packageName wasn't recorded on legacy order
          const prodIds = ord.selectedProductIds || ord.items.map((i) => i.productId);
          const hasCore = pricing.compulsoryProductIds.every((id) => prodIds.includes(id));
          const hasLang = pricing.languageProductIds.some((id) => prodIds.includes(id));
          const hasSpec = pricing.specializationProductIds.some((id) => prodIds.includes(id));
          if (hasCore && hasLang && hasSpec) {
            packageSet.add('Complete Full Package');
          } else if (hasCore && hasLang) {
            packageSet.add('Main Core + Language');
          } else if (hasCore && hasSpec) {
            packageSet.add('Main Core + Specialization');
          } else if (hasCore) {
            packageSet.add('Main Core Package');
          } else if (prodIds.length > 0) {
            packageSet.add('Individual Subject(s)');
          }
        }

        if (Array.isArray(ord.items) && ord.items.length > 0) {
          for (const item of ord.items) {
            const prod = productsMap.get(item.productId);
            subjectMap.set(item.productId, {
              productId: item.productId,
              subjectCode: item.subjectCode || prod?.subjectCode || item.productId,
              subjectName: item.subjectName || prod?.subjectName || item.productId,
              price: Number(item.price) || prod?.price || 0,
              accessStatus: 'active',
            });
          }
        } else {
          for (const pid of ord.selectedProductIds || []) {
            const prod = productsMap.get(pid);
            subjectMap.set(pid, {
              productId: pid,
              subjectCode: prod?.subjectCode || pid,
              subjectName: prod?.subjectName || pid,
              price: prod?.price || 0,
              accessStatus: 'active',
            });
          }
        }
      }

      // Also check Purchases table for active access tied to any userId of this customer
      for (const pur of this.data.purchases) {
        if (acc.userIds.has(pur.userId) && pur.accessStatus === 'active' && !subjectMap.has(pur.productId)) {
          const prod = productsMap.get(pur.productId);
          subjectMap.set(pur.productId, {
            productId: pur.productId,
            subjectCode: prod?.subjectCode || pur.productId,
            subjectName: prod?.subjectName || pur.productId,
            price: prod?.price || 0,
            accessStatus: pur.accessStatus,
          });
        }
      }

      const purchasedProducts = Array.from(subjectMap.values());
      const deviceInfo =
        this.data.devices.find(
          (d) =>
            acc.userIds.has(d.userId) ||
            (acc.email && d.userEmail.toLowerCase() === acc.email.toLowerCase())
        ) || null;

      summaries.push({
        customerId: acc.customerId,
        fullName: acc.fullName,
        mobile: acc.mobile,
        email: acc.email,
        collegeName: acc.collegeName,
        registeredAt: acc.registeredAt,
        lastLoginAt: acc.lastLoginAt,
        purchasedSubjectCount: purchasedProducts.length,
        purchasedProductNames: purchasedProducts.map((p) => p.subjectName),
        purchasedProducts,
        purchasedPackageNames: Array.from(packageSet),
        totalAmountSpent,
        totalOrders: sortedOrders.length,
        verifiedOrdersCount: verifiedOrders.length,
        pendingOrdersCount: pendingOrders.length,
        lastPurchaseDate: verifiedOrders[0]?.createdAt || sortedOrders[0]?.createdAt || null,
        orderHistory: sortedOrders,
        deviceInfo,
      });
    }

    // Sort by most recent purchase or registration
    summaries.sort((a, b) => {
      const timeA = new Date(a.lastPurchaseDate || a.registeredAt || 0).getTime();
      const timeB = new Date(b.lastPurchaseDate || b.registeredAt || 0).getTime();
      return timeB - timeA;
    });

    return summaries;
  }
}

export const db = new Database();
