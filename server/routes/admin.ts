import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db, PDF_STORAGE_DIR, PUBLIC_UPLOADS_DIR } from '../db';
import { pdfService } from '../pdfService';
import { ADMIN_SECRET_KEY, isValidAdminKey, requireAdmin } from '../authMiddleware';

export const adminRouter = Router();

// Configure multer for private PDF storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(PDF_STORAGE_DIR)) {
      fs.mkdirSync(PDF_STORAGE_DIR, { recursive: true });
    }
    cb(null, PDF_STORAGE_DIR);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueSuffix = `${Date.now()}_${safeName}`;
    cb(null, uniqueSuffix);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only valid PDF files are allowed.'));
    }
  },
});

// Configure multer for public image uploads (banners, product covers, QR codes)
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(PUBLIC_UPLOADS_DIR)) {
      fs.mkdirSync(PUBLIC_UPLOADS_DIR, { recursive: true });
    }
    cb(null, PUBLIC_UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `img_${Date.now()}_${safeName}`);
  },
});

const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype.startsWith('image/') ||
      /\.(png|jpe?g|webp|gif|svg)$/i.test(file.originalname)
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only valid image files (PNG, JPG, WEBP, SVG) are allowed.'));
    }
  },
});

/**
 * Helper: format a timestamp to IST (Asia/Kolkata) YYYY-MM-DD
 */
function toIstDateKey(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

function getDateRangeBounds(range: string, startDate?: string, endDate?: string) {
  const now = new Date();
  const todayKey = toIstDateKey(now);

  const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayKey = toIstDateKey(yesterdayDate);

  const sevenDaysAgoKey = toIstDateKey(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));
  const monthPrefix = todayKey.slice(0, 7); // YYYY-MM

  return {
    todayKey,
    matches: (iso: string): boolean => {
      const key = toIstDateKey(iso);
      if (!key) return false;
      switch (range) {
        case 'today':
          return key === todayKey;
        case 'yesterday':
          return key === yesterdayKey;
        case '7days':
          return key >= sevenDaysAgoKey && key <= todayKey;
        case 'month':
          return key.startsWith(monthPrefix);
        case 'custom': {
          const from = startDate || '0000-00-00';
          const to = endDate || '9999-12-31';
          return key >= from && key <= to;
        }
        case 'all':
        default:
          return true;
      }
    },
  };
}

/**
 * POST /api/admin/login
 * Verify admin credentials (preserved untouched)
 */
adminRouter.post('/login', (req, res) => {
  const { secretKey } = req.body;
  if (isValidAdminKey(secretKey)) {
    const activeKey = (typeof secretKey === 'string' && secretKey.trim()) || ADMIN_SECRET_KEY;
    db.logAdminAction({
      adminId: 'admin_session',
      action: 'ADMIN_LOGIN',
      details: 'Administrator logged into management console.',
    });
    return res.json({
      success: true,
      message: 'Admin authenticated successfully',
      adminKey: activeKey,
    });
  }
  return res.status(401).json({
    success: false,
    error: 'INVALID_CREDENTIALS',
    message: 'ভুল Admin Secret Key দেওয়া হয়েছে। অনুগ্রহ করে সঠিক পাসওয়ার্ড দিন।',
  });
});

/**
 * POST /api/admin/upload-image
 * Upload banner, product thumbnail, or QR image to persistent server uploads directory
 */
adminRouter.post('/upload-image', requireAdmin, imageUpload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file uploaded.' });
    }
    const imageUrl = `/uploads/${path.basename(req.file.path)}`;
    db.logAdminAction({
      adminId: 'admin',
      action: 'UPLOAD_IMAGE',
      details: `Uploaded asset ${req.file.originalname} -> ${imageUrl}`,
    });
    res.json({ success: true, imageUrl });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/admin/stats
 * Dashboard overview metrics with real date filtering & real sales series
 */
adminRouter.get('/stats', requireAdmin, async (req, res) => {
  try {
    await Promise.all([
      db.syncWithFirebaseOrders().catch(() => {}),
      db.syncWithFirebaseStudents().catch(() => {}),
    ]);

    const range = (req.query.range as string) || 'today';
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const { todayKey, matches } = getDateRangeBounds(range, startDate, endDate);

    const orders = db.getOrders();
    const verifiedOrders = orders.filter((o) => o.paymentStatus === 'verified');
    const pendingOrders = orders.filter((o) => o.paymentStatus === 'pending');
    const rejectedOrders = orders.filter(
      (o) => o.paymentStatus === 'rejected' || o.paymentStatus === 'failed'
    );

    const todayVerified = verifiedOrders.filter((o) => toIstDateKey(o.createdAt) === todayKey);
    const todaySales = todayVerified.length;
    const todayRevenue = todayVerified.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    const filteredVerified = verifiedOrders.filter((o) => matches(o.createdAt));
    const filteredSales = filteredVerified.length;
    const filteredRevenue = filteredVerified.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    const totalRevenue = verifiedOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);

    const customers = db.getCustomersSummary();
    const students = db.getStudents();
    const products = db.getProducts();
    const publishedProducts = products.filter((p) => p.published);
    const devices = db.getDevices();
    const activeDevices = devices.filter((d) => d.registrationStatus === 'active');
    const activeOffersCount = db
      .getOffers()
      .filter((o) => db.isOfferCurrentlyValid(o).isValid).length;

    // Build real date-grouped series from actual verified/all orders
    const seriesMap = new Map<string, { date: string; label: string; sales: number; revenue: number }>();
    const seriesSource = range === 'today' ? verifiedOrders : filteredVerified;
    for (const ord of seriesSource) {
      const dateKey = toIstDateKey(ord.createdAt);
      if (!dateKey) continue;
      const existing = seriesMap.get(dateKey) || {
        date: dateKey,
        label: new Date(`${dateKey}T00:00:00+05:30`).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
        }),
        sales: 0,
        revenue: 0,
      };
      existing.sales += 1;
      existing.revenue += Number(ord.totalAmount) || 0;
      seriesMap.set(dateKey, existing);
    }
    const salesSeries = Array.from(seriesMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);

    res.json({
      success: true,
      stats: {
        todaySales,
        todayRevenue,
        filteredSales,
        filteredRevenue,
        totalOrders: orders.length,
        verifiedOrders: verifiedOrders.length,
        pendingOrders: pendingOrders.length,
        rejectedOrders: rejectedOrders.length,
        totalRevenue,
        totalCustomers: customers.length,
        totalStudents: students.length,
        totalSubjects: products.length,
        publishedSubjects: publishedProducts.length,
        activeOffersCount,
        activeDevices: activeDevices.length,
        salesSeries,
      },
      recentOrders: orders.slice(0, 10),
      recentCustomers: customers.slice(0, 10),
      recentLogs: db.getAuditLogs().slice(0, 15),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- CUSTOMERS DIRECTORY ---
adminRouter.get('/customers', requireAdmin, async (req, res) => {
  try {
    await Promise.all([
      db.syncWithFirebaseOrders().catch(() => {}),
      db.syncWithFirebaseStudents().catch(() => {}),
    ]);
    const customers = db.getCustomersSummary();
    res.json({ success: true, customers });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

adminRouter.delete('/customers/:customerId', requireAdmin, async (req, res) => {
  try {
    const { customerId } = req.params;
    const { email, mobile, orderIds } = req.body || {};
    const result = await db.deleteCustomer(
      customerId,
      { email, mobile, orderIds },
      'admin'
    );
    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error });
    }
    res.json({
      success: true,
      message: `Customer "${result.deletedName || customerId}" permanently removed along with ${result.deletedOrderIds.length} order(s) and all PDF access.`,
      deletedOrderIds: result.deletedOrderIds,
      deletedUserIds: result.deletedUserIds,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- REAL REPORTS ---
adminRouter.get('/reports', requireAdmin, async (req, res) => {
  try {
    await db.syncWithFirebaseOrders().catch(() => {});
    const range = (req.query.range as string) || 'all';
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const { matches } = getDateRangeBounds(range, startDate, endDate);

    const allOrders = db.getOrders().filter((o) => matches(o.createdAt));
    const verifiedOrders = allOrders.filter((o) => o.paymentStatus === 'verified');

    const subjectCountMap = new Map<
      string,
      { productId: string; subjectCode: string; subjectName: string; count: number }
    >();
    const packageCountMap = new Map<string, { packageName: string; count: number; revenue: number }>();

    for (const ord of verifiedOrders) {
      const pkg = ord.packageName || 'BCA Question Bank Bundle';
      const pkgEntry = packageCountMap.get(pkg) || { packageName: pkg, count: 0, revenue: 0 };
      pkgEntry.count += 1;
      pkgEntry.revenue += Number(ord.totalAmount) || 0;
      packageCountMap.set(pkg, pkgEntry);

      for (const item of ord.items || []) {
        const prev = subjectCountMap.get(item.productId) || {
          productId: item.productId,
          subjectCode: item.subjectCode,
          subjectName: item.subjectName,
          count: 0,
        };
        prev.count += 1;
        subjectCountMap.set(item.productId, prev);
      }
    }

    res.json({
      success: true,
      summary: {
        totalOrders: allOrders.length,
        verifiedOrders: verifiedOrders.length,
        pendingOrders: allOrders.filter((o) => o.paymentStatus === 'pending').length,
        rejectedOrders: allOrders.filter(
          (o) => o.paymentStatus === 'rejected' || o.paymentStatus === 'failed'
        ).length,
        totalRevenue: verifiedOrders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0),
        averageOrderValue:
          verifiedOrders.length > 0
            ? Math.round(
                verifiedOrders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0) /
                  verifiedOrders.length
              )
            : 0,
      },
      topSubjects: Array.from(subjectCountMap.values()).sort((a, b) => b.count - a.count),
      packageBreakdown: Array.from(packageCountMap.values()).sort((a, b) => b.revenue - a.revenue),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- SEMESTERS MANAGEMENT ---

adminRouter.post('/semesters', requireAdmin, (req, res) => {
  try {
    const { semesterNumber, title, academicYear, description, published } = req.body;
    if (!semesterNumber || !title) {
      return res.status(400).json({ success: false, error: 'Semester number and title required.' });
    }

    const created = db.createSemester({
      semesterNumber: Number(semesterNumber),
      title: title.trim(),
      academicYear: academicYear?.trim() || `Year ${Math.ceil(Number(semesterNumber) / 2)}`,
      description: description?.trim() || '',
      published: published !== false,
    });

    db.logAdminAction({
      adminId: 'admin',
      action: 'CREATE_SEMESTER',
      targetId: created.id,
      targetType: 'SEMESTER',
      details: `Created semester: ${created.title}`,
    });

    res.json({ success: true, semester: created });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

adminRouter.put('/semesters/:id', requireAdmin, (req, res) => {
  try {
    const updated = db.updateSemester(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'Semester not found' });

    db.logAdminAction({
      adminId: 'admin',
      action: 'UPDATE_SEMESTER',
      targetId: req.params.id,
      targetType: 'SEMESTER',
      details: `Updated semester: ${updated.title} (Published: ${updated.published})`,
    });

    res.json({ success: true, semester: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- SUBJECTS & PDF MANAGEMENT ---

adminRouter.post('/products', requireAdmin, upload.single('pdfFile'), async (req, res) => {
  try {
    const {
      semesterId,
      subjectCode,
      subjectName,
      description,
      syllabusHighlights,
      price,
      originalPrice,
      examYear,
      published,
      paperType,
      specialization,
      coverImageUrl,
    } = req.body;

    if (!semesterId || !subjectCode || !subjectName || price === undefined || price === '') {
      return res.status(400).json({
        success: false,
        error: 'Semester ID, Subject Code, Subject Name, and Price are required.',
      });
    }

    let storagePath = 'pdfs/default_bca.pdf';
    let fileSizeKb = 1000;
    let pageCount = 30;

    if (req.file) {
      storagePath = `pdfs/${path.basename(req.file.path)}`;
      fileSizeKb = Math.round(req.file.size / 1024);
      pageCount = await pdfService.inspectPdfPageCount(req.file.path);
    }

    let parsedHighlights: string[] = [];
    if (typeof syllabusHighlights === 'string') {
      try {
        parsedHighlights = JSON.parse(syllabusHighlights);
      } catch {
        parsedHighlights = syllabusHighlights.split('\n').filter(Boolean);
      }
    } else if (Array.isArray(syllabusHighlights)) {
      parsedHighlights = syllabusHighlights;
    }

    const coverUrl = coverImageUrl?.trim() || '';

    const newProduct = db.createProduct({
      semesterId,
      subjectCode: subjectCode.trim().toUpperCase(),
      subjectName: subjectName.trim(),
      description: description?.trim() || '',
      syllabusHighlights: parsedHighlights,
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : Math.round(Number(price) * 2),
      pageCount: pageCount || 30,
      privateStoragePath: storagePath,
      fileSizeKb,
      published: published === true || published === 'true',
      examYear: examYear?.trim() || '2024-2025 Edition',
      paperType: paperType === 'specialization' ? 'specialization' : 'core',
      specialization: specialization?.trim() || undefined,
      coverImageUrl: coverUrl,
      imageUrl: coverUrl,
    });

    db.logAdminAction({
      adminId: 'admin',
      action: 'CREATE_SUBJECT',
      targetId: newProduct.id,
      targetType: 'PRODUCT',
      details: `Added subject ${newProduct.subjectCode} - ${newProduct.subjectName} (₹${newProduct.price})`,
    });

    res.json({ success: true, product: newProduct });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

adminRouter.put('/products/:id', requireAdmin, upload.single('pdfFile'), async (req, res) => {
  try {
    const existing = db.getProduct(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Product not found' });

    const updates: any = { ...req.body };

    if (updates.price !== undefined && updates.price !== '') updates.price = Number(updates.price);
    if (updates.originalPrice !== undefined && updates.originalPrice !== '') {
      updates.originalPrice = Number(updates.originalPrice);
    }
    if (updates.published !== undefined) {
      updates.published = updates.published === true || updates.published === 'true';
    }
    if (updates.coverImageUrl !== undefined) {
      updates.imageUrl = updates.coverImageUrl;
    } else if (updates.imageUrl !== undefined) {
      updates.coverImageUrl = updates.imageUrl;
    }

    if (req.file) {
      updates.privateStoragePath = `pdfs/${path.basename(req.file.path)}`;
      updates.fileSizeKb = Math.round(req.file.size / 1024);
      updates.pageCount = await pdfService.inspectPdfPageCount(req.file.path);
    }

    if (typeof updates.syllabusHighlights === 'string') {
      try {
        updates.syllabusHighlights = JSON.parse(updates.syllabusHighlights);
      } catch {
        updates.syllabusHighlights = updates.syllabusHighlights.split('\n').filter(Boolean);
      }
    }

    const updated = db.updateProduct(req.params.id, updates);

    db.logAdminAction({
      adminId: 'admin',
      action: 'UPDATE_SUBJECT',
      targetId: req.params.id,
      targetType: 'PRODUCT',
      details: `Updated subject ${updated?.subjectCode} (Price: ₹${updated?.price}, Regular: ₹${updated?.originalPrice}, Published: ${updated?.published}${req.file ? ', PDF replaced' : ''})`,
    });

    res.json({ success: true, product: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

adminRouter.delete('/products/:id', requireAdmin, (req, res) => {
  try {
    const prod = db.getProduct(req.params.id);
    const deleted = db.deleteProduct(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Product not found' });

    db.logAdminAction({
      adminId: 'admin',
      action: 'DELETE_SUBJECT',
      targetId: req.params.id,
      targetType: 'PRODUCT',
      details: `Deleted subject ${prod?.subjectCode} - ${prod?.subjectName}`,
    });

    res.json({ success: true, message: 'Subject deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- BANNERS / SLIDER MANAGEMENT ---

adminRouter.get('/banners', requireAdmin, (req, res) => {
  try {
    res.json({ success: true, banners: db.getBanners() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

adminRouter.post('/banners', requireAdmin, (req, res) => {
  try {
    const banner = db.saveBanner(req.body);
    db.logAdminAction({
      adminId: 'admin',
      action: 'CREATE_BANNER',
      targetId: banner.id,
      targetType: 'BANNER',
      details: `Created sliding banner "${banner.title}" (Order: ${banner.order}, Active: ${banner.active})`,
    });
    res.json({ success: true, banner, banners: db.getBanners() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

adminRouter.put('/banners/:id', requireAdmin, (req, res) => {
  try {
    const banner = db.saveBanner({ ...req.body, id: req.params.id });
    db.logAdminAction({
      adminId: 'admin',
      action: 'UPDATE_BANNER',
      targetId: banner.id,
      targetType: 'BANNER',
      details: `Updated sliding banner "${banner.title}" (Order: ${banner.order}, Active: ${banner.active})`,
    });
    res.json({ success: true, banner, banners: db.getBanners() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

adminRouter.post('/banners/reorder', requireAdmin, (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, error: 'orderedIds array required.' });
    }
    const banners = db.reorderBanners(orderedIds);
    db.logAdminAction({
      adminId: 'admin',
      action: 'REORDER_BANNERS',
      details: `Reordered ${banners.length} homepage sliding banners.`,
    });
    res.json({ success: true, banners });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

adminRouter.delete('/banners/:id', requireAdmin, (req, res) => {
  try {
    const deleted = db.deleteBanner(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Banner not found' });
    db.logAdminAction({
      adminId: 'admin',
      action: 'DELETE_BANNER',
      targetId: req.params.id,
      targetType: 'BANNER',
      details: `Deleted banner ${req.params.id}`,
    });
    res.json({ success: true, banners: db.getBanners() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- PACKAGES MANAGEMENT ---

adminRouter.get('/packages', requireAdmin, (req, res) => {
  try {
    res.json({
      success: true,
      packages: db.getPackages(),
      effectivePricing: db.getEffectivePackagePricing(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

adminRouter.post('/packages', requireAdmin, (req, res) => {
  try {
    const pkg = db.savePackage(req.body);
    db.logAdminAction({
      adminId: 'admin',
      action: 'CREATE_PACKAGE',
      targetId: pkg.id,
      targetType: 'PACKAGE',
      details: `Saved package "${pkg.name}" (Full Offer ₹${pkg.fullPackageOfferPrice}, Regular ₹${pkg.fullPackageRegularPrice})`,
    });
    res.json({
      success: true,
      package: pkg,
      packages: db.getPackages(),
      effectivePricing: db.getEffectivePackagePricing(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

adminRouter.put('/packages/:id', requireAdmin, (req, res) => {
  try {
    const pkg = db.savePackage({ ...req.body, id: req.params.id });
    db.logAdminAction({
      adminId: 'admin',
      action: 'UPDATE_PACKAGE',
      targetId: pkg.id,
      targetType: 'PACKAGE',
      details: `Updated package "${pkg.name}" (Core ₹${pkg.coreOfferPrice}/₹${pkg.coreRegularPrice}, Full ₹${pkg.fullPackageOfferPrice}/₹${pkg.fullPackageRegularPrice}, Active: ${pkg.active})`,
    });
    res.json({
      success: true,
      package: pkg,
      packages: db.getPackages(),
      effectivePricing: db.getEffectivePackagePricing(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

adminRouter.delete('/packages/:id', requireAdmin, (req, res) => {
  try {
    const deleted = db.deletePackage(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Package not found' });
    res.json({ success: true, packages: db.getPackages() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- OFFERS & PRICING MANAGEMENT ---

adminRouter.get('/offers', requireAdmin, (req, res) => {
  try {
    res.json({
      success: true,
      offers: db.getOffers(),
      effectivePricing: db.getEffectivePackagePricing(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

adminRouter.post('/offers', requireAdmin, (req, res) => {
  try {
    const offer = db.saveOffer(req.body);
    db.logAdminAction({
      adminId: 'admin',
      action: 'CREATE_OFFER',
      targetId: offer.id,
      targetType: 'OFFER',
      details: `Created offer "${offer.title}" (₹${offer.offerPrice} vs Regular ₹${offer.regularPrice}, Expiry: ${offer.expiryDate})`,
    });
    res.json({
      success: true,
      offer,
      offers: db.getOffers(),
      effectivePricing: db.getEffectivePackagePricing(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

adminRouter.put('/offers/:id', requireAdmin, (req, res) => {
  try {
    const offer = db.saveOffer({ ...req.body, id: req.params.id });
    db.logAdminAction({
      adminId: 'admin',
      action: 'UPDATE_OFFER',
      targetId: offer.id,
      targetType: 'OFFER',
      details: `Updated offer "${offer.title}" (₹${offer.offerPrice} / Regular ₹${offer.regularPrice}, Active: ${offer.active}, Expiry: ${offer.expiryDate})`,
    });
    res.json({
      success: true,
      offer,
      offers: db.getOffers(),
      effectivePricing: db.getEffectivePackagePricing(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

adminRouter.delete('/offers/:id', requireAdmin, (req, res) => {
  try {
    const deleted = db.deleteOffer(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Offer not found' });
    res.json({
      success: true,
      offers: db.getOffers(),
      effectivePricing: db.getEffectivePackagePricing(),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- WEBSITE SETTINGS MANAGEMENT ---

adminRouter.get('/site-settings', requireAdmin, (req, res) => {
  try {
    res.json({ success: true, siteSettings: db.getSiteSettings() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

adminRouter.put('/site-settings', requireAdmin, (req, res) => {
  try {
    const siteSettings = db.updateSiteSettings(req.body);
    db.logAdminAction({
      adminId: 'admin',
      action: 'UPDATE_SITE_SETTINGS',
      targetId: 'siteSettings',
      targetType: 'SETTINGS',
      details: `Updated website settings (Announcement: ${siteSettings.announcement.enabled ? 'ON' : 'OFF'}, UPI: ${siteSettings.payment.upiId})`,
    });
    res.json({ success: true, siteSettings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- ORDERS MANAGEMENT ---

adminRouter.get('/orders', requireAdmin, async (req, res) => {
  try {
    await db.syncWithFirebaseOrders();
    const orders = db.getOrders();
    res.json({ success: true, orders });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

adminRouter.post('/orders/:orderId/approve', requireAdmin, (req, res) => {
  try {
    const { orderId } = req.params;
    const result = db.approveOrder(orderId, 'admin');
    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error });
    }
    res.json({
      success: true,
      message: `Order ${orderId} approved successfully. Student access unlocked.`,
      order: result.order,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

adminRouter.post('/orders/:orderId/reject', requireAdmin, (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body || {};
    const result = db.rejectOrder(orderId, 'admin', reason);
    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error });
    }
    res.json({
      success: true,
      message: `Order ${orderId} rejected.`,
      order: result.order,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

adminRouter.delete('/orders/:orderId', requireAdmin, (req, res) => {
  try {
    const { orderId } = req.params;
    const result = db.deleteOrder(orderId, 'admin');
    if (!result.success) {
      return res.status(404).json({ success: false, error: result.error });
    }
    res.json({
      success: true,
      message: `Order ${orderId} deleted successfully.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- DEVICE MANAGEMENT & ADMIN DEVICE RESET ---

adminRouter.get('/devices', requireAdmin, (req, res) => {
  try {
    const devices = db.getDevices();
    res.json({ success: true, devices });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

adminRouter.post('/devices/reset', requireAdmin, (req, res) => {
  try {
    const { userId, reason } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: 'Student User ID is required.' });
    }

    const resetSuccess = db.resetStudentDevice(
      userId,
      'admin',
      reason || 'Student requested device migration.'
    );

    if (!resetSuccess) {
      return res.status(404).json({
        success: false,
        error: 'No active device registration found for this student.',
      });
    }

    res.json({
      success: true,
      message: 'Device binding successfully reset. Student can now bind their new device on next login.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

adminRouter.delete('/devices/:userId', requireAdmin, (req, res) => {
  try {
    const { userId } = req.params;
    const removed = db.deleteDevice(userId, 'admin');
    if (!removed) {
      return res.status(404).json({
        success: false,
        error: 'No device record found for this student.',
      });
    }
    res.json({
      success: true,
      message: 'Student device record removed successfully.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- AUDIT LOGS ---

adminRouter.get('/audit-logs', requireAdmin, (req, res) => {
  try {
    const logs = db.getAuditLogs();
    res.json({ success: true, logs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

adminRouter.post('/clear-test-data', requireAdmin, (req, res) => {
  try {
    db.clearOrdersAndStudentData('admin');
    res.json({
      success: true,
      message: 'All test orders, student profiles, purchases, and device bindings have been cleared successfully.',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
