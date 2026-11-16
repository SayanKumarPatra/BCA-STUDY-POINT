import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Lock,
  Menu,
  RefreshCw,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Search,
  Bell,
  ShieldCheck,
} from 'lucide-react';
import { api, getStoredAdminKey, setStoredAdminKey } from '../services/api';
import { BRAND } from '../constants/brand';
import {
  subscribeToOrdersRealtime,
  syncAllOfficialProductsToFirestore,
  updateOrderStatusRealtime,
  deleteOrderRealtime,
  deleteCustomerRealtime,
} from '../firebase/firebase';
import type {
  AdminDashboardStats,
  AdminAuditLog,
  BannerSlide,
  CustomerSummary,
  DeviceBinding,
  EffectivePackagePricing,
  OfferConfig,
  Order,
  PackageDefinition,
  Product,
  Semester,
  SiteSettings,
} from '../types';
import type { AdminNavTab, DateRangePreset } from './admin/adminTypes';
import { AdminSidebar } from './admin/AdminSidebar';
import { AdminDashboardView } from './admin/AdminDashboardView';
import { AdminOrdersView, AdminCustomersView } from './admin/AdminCustomersOrdersViews';
import {
  AdminProductsView,
  AdminPackagesView,
  AdminOffersView,
} from './admin/AdminProductsPackagesOffersViews';
import { AdminBannersView, AdminWebsiteView } from './admin/AdminWebsiteViews';
import { AdminReportsView, AdminSettingsView } from './admin/AdminSystemViews';
import {
  ConfirmModal,
  CustomerProfileModal,
  OrderDetailsModal,
  RejectOrderModal,
} from './admin/AdminModals';

const TAB_TITLES: Record<AdminNavTab, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Dashboard Overview',
    subtitle: 'Real-time sales, revenue, pending approvals, and quick shortcuts',
  },
  orders: {
    title: 'Orders & Sales',
    subtitle: 'Manage customer orders, verify payment screenshots, approve or reject transactions',
  },
  customers: {
    title: 'Customers',
    subtitle: 'View customer profiles, purchased subjects, packages & spend history',
  },
  products: {
    title: 'Products (PDF)',
    subtitle: 'Manage BCA question bank PDFs, prices, regular MRP, covers & availability',
  },
  packages: {
    title: 'Package Management',
    subtitle: 'Configure compulsory & optional study bundles and package tier pricing',
  },
  offers: {
    title: 'Pricing & Offers',
    subtitle: 'Control ₹99 Full Package Offer & promotional offers with auto-expiry',
  },
  banners: {
    title: 'Banner / Slider Management',
    subtitle: 'Upload, edit, reorder, and publish homepage sliding hero banners',
  },
  website: {
    title: 'Website Management',
    subtitle: 'Manage top announcement bar, promotional labels & UPI payment settings',
  },
  reports: {
    title: 'Sales & Subject Reports',
    subtitle: 'Track real performance across dates, top-selling subjects & packages',
  },
  settings: {
    title: 'System Settings & Security',
    subtitle: 'Semesters, 1:1 device bindings, security audit logs & Firebase sync',
  },
};

const toIstDateKeyClient = (isoOrDate: string | Date): string => {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
};

export const AdminPanel: React.FC<{ onExit: () => void }> = ({ onExit }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(Boolean(getStoredAdminKey()));
  const [loginInput, setLoginInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Navigation & Responsive Drawer
  const [activeTab, setActiveTab] = useState<AdminNavTab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Global Date Filter (IST Asia/Kolkata)
  const [dateRange, setDateRange] = useState<DateRangePreset>('today');
  const [customStartDate, setCustomStartDate] = useState<string>(() =>
    toIstDateKeyClient(new Date(Date.now() - 7 * 86400000))
  );
  const [customEndDate, setCustomEndDate] = useState<string>(() =>
    toIstDateKeyClient(new Date())
  );

  // Real Backend + RTDB Data State
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<BannerSlide[]>([]);
  const [packages, setPackages] = useState<PackageDefinition[]>([]);
  const [offers, setOffers] = useState<OfferConfig[]>([]);
  const [effectivePricing, setEffectivePricing] = useState<EffectivePackagePricing | null>(null);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [devices, setDevices] = useState<DeviceBinding[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; isError: boolean } | null>(null);

  // Inspection / Action Modals
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);
  const [deleteOrderTarget, setDeleteOrderTarget] = useState<Order | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const [deleteCustomerTarget, setDeleteCustomerTarget] = useState<CustomerSummary | null>(null);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);

  // Header Quick Jump Search
  const [quickJump, setQuickJump] = useState('');

  const notify = useCallback((message: string, isError = false) => {
    setToast({ message, isError });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadAllData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const [
        statsRes,
        ordersRes,
        customersRes,
        semsRes,
        prodsRes,
        bannersRes,
        pkgsRes,
        offersRes,
        settingsRes,
        devicesRes,
        logsRes,
      ] = await Promise.all([
        api.getAdminStats({
          range: dateRange,
          startDate: customStartDate,
          endDate: customEndDate,
        }),
        api.getAdminOrders(),
        api.getAdminCustomers(),
        api.getSemesters(),
        api.getProducts(),
        api.getAdminBanners().catch(() => ({ banners: [] })),
        api.getAdminPackages().catch(() => ({ packages: [], effectivePricing: null })),
        api.getAdminOffers().catch(() => ({ offers: [], effectivePricing: null })),
        api.getSiteSettings().catch(() => ({ siteSettings: null })),
        api.getAdminDevices(),
        api.getAdminAuditLogs(),
      ]);

      setStats(statsRes.stats || null);
      setOrders(ordersRes.orders || statsRes.recentOrders || []);
      setCustomers(customersRes.customers || statsRes.recentCustomers || []);
      setSemesters(semsRes.semesters || []);
      setProducts(prodsRes.products || []);
      setBanners(bannersRes.banners || []);
      setPackages(pkgsRes.packages || []);
      setOffers(offersRes.offers || []);
      setEffectivePricing(offersRes.effectivePricing || pkgsRes.effectivePricing || null);
      setSiteSettings(settingsRes.siteSettings || null);
      setDevices(devicesRes.devices || []);
      setAuditLogs(logsRes.logs || statsRes.recentLogs || []);
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        setStoredAdminKey(null);
        setIsAuthenticated(false);
        setLoginError('Admin session expired. Please sign in again.');
      } else {
        notify(err.message || 'Failed to sync dashboard data.', true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, dateRange, customStartDate, customEndDate, notify]);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadAllData();

    // Real-time Firebase RTDB Order subscription so newly submitted orders show up immediately
    const unsubscribeOrders = subscribeToOrdersRealtime((rtdbOrders) => {
      if (!rtdbOrders || rtdbOrders.length === 0) return;
      setOrders((prev) => {
        const mergedMap = new Map<string, Order>();
        rtdbOrders.forEach((o: Order) => mergedMap.set(o.orderId, o));
        prev.forEach((o: Order) => {
          if (!mergedMap.has(o.orderId)) mergedMap.set(o.orderId, o);
        });
        return Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
    });

    return () => {
      unsubscribeOrders();
    };
  }, [isAuthenticated, loadAllData]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const res = await api.adminLogin(loginInput);
      setStoredAdminKey(res.adminKey);
      setIsAuthenticated(true);
      setLoginInput('');
    } catch (err: any) {
      setLoginError(err.message || 'Invalid Administrator Password / Key.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setStoredAdminKey(null);
    setIsAuthenticated(false);
    setStats(null);
  };

  const handleApproveOrder = async (orderId: string) => {
    try {
      const nowIso = new Date().toISOString();
      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === orderId
            ? { ...o, paymentStatus: 'verified', verifiedAt: o.verifiedAt || nowIso }
            : o
        )
      );
      await updateOrderStatusRealtime(orderId, 'verified');
      await api.approveOrder(orderId);
      notify(`Order ${orderId} verified and student PDF access activated.`);
      loadAllData();
    } catch (err: any) {
      notify(err.message || 'Failed to approve order', true);
      loadAllData();
    }
  };

  const handleRejectOrderSubmit = async (reason: string) => {
    if (!rejectingOrder) return;
    setIsSubmittingReject(true);
    try {
      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === rejectingOrder.orderId
            ? { ...o, paymentStatus: 'rejected', rejectionReason: reason }
            : o
        )
      );
      await updateOrderStatusRealtime(rejectingOrder.orderId, 'rejected', {
        rejectionReason: reason,
      });
      await api.rejectOrder(rejectingOrder.orderId, reason);
      notify(`Order ${rejectingOrder.orderId} rejected.`);
      setRejectingOrder(null);
      loadAllData();
    } catch (err: any) {
      notify(err.message || 'Failed to reject order', true);
      loadAllData();
    } finally {
      setIsSubmittingReject(false);
    }
  };

  const handleConfirmDeleteOrder = async () => {
    if (!deleteOrderTarget) return;
    const target = deleteOrderTarget;
    setIsDeletingOrder(true);
    try {
      await api.deleteOrder(target.orderId);
      setOrders((prev) => prev.filter((o) => o.orderId !== target.orderId));
      setDeleteOrderTarget(null);
      notify(`Deleted order ${target.orderId}.`);
      deleteOrderRealtime(target.orderId).catch(() => {});
      loadAllData();
    } catch (err: any) {
      notify(err.message || 'Failed to delete order', true);
    } finally {
      setIsDeletingOrder(false);
    }
  };

  const handleConfirmDeleteCustomer = async () => {
    if (!deleteCustomerTarget) return;
    const target = deleteCustomerTarget;
    setIsDeletingCustomer(true);
    try {
      const orderIds = (target.orderHistory || []).map((o) => o.orderId);
      const userIds = Array.from(
        new Set([target.customerId, ...(target.orderHistory || []).map((o) => o.userId)])
      ).filter(Boolean);

      const res = await api.deleteCustomer({
        customerId: target.customerId,
        email: target.email,
        mobile: target.mobile,
        orderIds,
      });

      const removedOrderSet = new Set([...orderIds, ...(res.deletedOrderIds || [])]);
      const removedEmail = (target.email || '').trim().toLowerCase();
      const removedMobile = (target.mobile || '').replace(/\D/g, '');

      // Instantly remove from UI state so there is zero perceived wait
      setCustomers((prev) =>
        prev.filter((c) => {
          if (c.customerId === target.customerId) return false;
          if (removedEmail && (c.email || '').trim().toLowerCase() === removedEmail) return false;
          if (removedMobile.length >= 10 && (c.mobile || '').replace(/\D/g, '') === removedMobile) {
            return false;
          }
          return true;
        })
      );
      setOrders((prev) => prev.filter((o) => !removedOrderSet.has(o.orderId)));
      setDeleteCustomerTarget(null);
      if (selectedCustomer?.customerId === target.customerId) {
        setSelectedCustomer(null);
      }
      notify(
        res.message ||
          `Permanently deleted customer "${target.fullName}" and revoked all PDF access.`
      );

      // Run client Firebase RTDB cleanup & stats refresh silently in background
      deleteCustomerRealtime(
        Array.from(new Set([...userIds, ...(res.deletedUserIds || [])])),
        Array.from(removedOrderSet)
      ).catch(() => {});
      loadAllData();
    } catch (err: any) {
      notify(err.message || 'Failed to delete customer', true);
    } finally {
      setIsDeletingCustomer(false);
    }
  };

  const handleSyncAllToFirebase = async () => {
    try {
      const res = await syncAllOfficialProductsToFirestore();
      if (res.success) {
        notify(`Synchronized ${res.count} products to Firebase RTDB.`);
        loadAllData();
      } else {
        notify(res.error || 'Firebase RTDB sync encountered an issue.', true);
      }
    } catch (err: any) {
      notify(err.message || 'Firebase RTDB sync failed', true);
    }
  };

  const pendingOrders = useMemo(
    () => orders.filter((o) => o.paymentStatus === 'pending'),
    [orders]
  );

  // Reconcile backend stats with live in-memory orders (from API + Firebase RTDB) in IST
  // so Today's Sales, Today's Orders & Today's Revenue update instantaneously without lag or stale zeros
  const effectiveStats = useMemo<AdminDashboardStats>(() => {
    const base: AdminDashboardStats = stats || {
      todaySales: 0,
      todayRevenue: 0,
      todayOrders: 0,
      todayPendingOrders: 0,
      todayPendingRevenue: 0,
      filteredSales: 0,
      filteredRevenue: 0,
      totalOrders: 0,
      verifiedOrders: 0,
      pendingOrders: 0,
      rejectedOrders: 0,
      totalRevenue: 0,
      totalCustomers: 0,
      totalStudents: 0,
      totalSubjects: products.length,
      publishedSubjects: products.filter((p) => p.published).length,
      activeOffersCount: offers.filter((o) => o.active).length,
      activeDevices: devices.filter((d) => d.registrationStatus === 'active').length,
      salesSeries: [],
    };

    if (orders.length === 0) return base;

    const now = new Date();
    const todayKey = toIstDateKeyClient(now);
    const yesterdayKey = toIstDateKeyClient(new Date(now.getTime() - 24 * 60 * 60 * 1000));
    const sevenDaysAgoKey = toIstDateKeyClient(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));
    const monthPrefix = todayKey.slice(0, 7);

    const matchesRange = (iso?: string): boolean => {
      if (!iso) return false;
      const key = toIstDateKeyClient(iso);
      if (!key) return false;
      switch (dateRange) {
        case 'today':
          return key === todayKey;
        case 'yesterday':
          return key === yesterdayKey;
        case '7days':
          return key >= sevenDaysAgoKey && key <= todayKey;
        case 'month':
          return key.startsWith(monthPrefix);
        case 'custom':
          return key >= (customStartDate || '0000-00-00') && key <= (customEndDate || '9999-12-31');
        case 'all':
        default:
          return true;
      }
    };

    const verifiedList = orders.filter((o) => o.paymentStatus === 'verified');
    const pendingList = orders.filter((o) => o.paymentStatus === 'pending');
    const rejectedList = orders.filter(
      (o) => o.paymentStatus === 'rejected' || o.paymentStatus === 'failed'
    );

    const todayOrdersList = orders.filter(
      (o) =>
        o.paymentStatus !== 'rejected' &&
        o.paymentStatus !== 'failed' &&
        toIstDateKeyClient(o.createdAt) === todayKey
    );
    const todayPendingList = todayOrdersList.filter((o) => o.paymentStatus === 'pending');

    const todayVerifiedList = verifiedList.filter(
      (o) =>
        toIstDateKeyClient(o.createdAt) === todayKey ||
        (o.verifiedAt ? toIstDateKeyClient(o.verifiedAt) === todayKey : false)
    );
    const filteredVerifiedList = verifiedList.filter(
      (o) => matchesRange(o.createdAt) || (o.verifiedAt ? matchesRange(o.verifiedAt) : false)
    );

    const seriesMap = new Map<string, { date: string; label: string; sales: number; revenue: number }>();
    const seriesSource = dateRange === 'today' ? verifiedList : filteredVerifiedList;
    for (const ord of seriesSource) {
      const dk = toIstDateKeyClient(ord.verifiedAt || ord.createdAt) || toIstDateKeyClient(ord.createdAt);
      if (!dk) continue;
      const existing = seriesMap.get(dk) || {
        date: dk,
        label: new Date(`${dk}T12:00:00+05:30`).toLocaleDateString('en-IN', {
          timeZone: 'Asia/Kolkata',
          day: 'numeric',
          month: 'short',
        }),
        sales: 0,
        revenue: 0,
      };
      existing.sales += 1;
      existing.revenue += Number(ord.totalAmount) || 0;
      seriesMap.set(dk, existing);
    }

    const salesSeries = Array.from(seriesMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);

    return {
      ...base,
      todaySales: todayVerifiedList.length,
      todayRevenue: todayVerifiedList.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0),
      todayOrders: todayOrdersList.length,
      todayPendingOrders: todayPendingList.length,
      todayPendingRevenue: todayPendingList.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0),
      filteredSales: filteredVerifiedList.length,
      filteredRevenue: filteredVerifiedList.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0),
      totalOrders: orders.length,
      verifiedOrders: verifiedList.length,
      pendingOrders: pendingList.length,
      rejectedOrders: rejectedList.length,
      totalRevenue: verifiedList.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0),
      totalCustomers: customers.length > 0 ? customers.length : base.totalCustomers,
      totalSubjects: products.length > 0 ? products.length : base.totalSubjects,
      publishedSubjects:
        products.length > 0 ? products.filter((p) => p.published).length : base.publishedSubjects,
      activeDevices:
        devices.length > 0
          ? devices.filter((d) => d.registrationStatus === 'active').length
          : base.activeDevices,
      salesSeries,
    };
  }, [stats, orders, customers, products, offers, devices, dateRange, customStartDate, customEndDate]);

  // Quick global search match
  const quickMatchResults = useMemo(() => {
    const q = quickJump.trim().toLowerCase();
    if (q.length < 2) return null;
    const matchedCustomers = customers
      .filter(
        (c) =>
          (c.fullName || '').toLowerCase().includes(q) ||
          (c.mobile || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q)
      )
      .slice(0, 4);
    const matchedOrders = orders
      .filter(
        (o) =>
          (o.orderId || '').toLowerCase().includes(q) ||
          (o.paymentReference || '').toLowerCase().includes(q) ||
          (o.studentName || '').toLowerCase().includes(q)
      )
      .slice(0, 4);
    return { matchedCustomers, matchedOrders };
  }, [quickJump, customers, orders]);

  // =========================================================================
  // ADMIN LOGIN SCREEN (Website Crimson/Burgundy & Gold Liquid Glass Theme)
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-radial-[at_50%_0%] from-[#970014] via-[#65000D] to-[#240005] text-white flex flex-col justify-center items-center p-4 selection:bg-[#FFD34E] selection:text-[#3D0009]">
        <div className="w-full max-w-md liquid-glass-master rounded-3xl border border-[#FFE7A3]/30 shadow-2xl overflow-hidden">
          <div className="px-6 py-6 bg-gradient-to-b from-[#65000D]/90 to-[#3D0009]/95 border-b border-[#FFE7A3]/25 text-white text-center relative">
            <img
              src={BRAND.logoUrl}
              alt="BCA STUDY POINT"
              className="w-14 h-14 rounded-full object-cover mx-auto mb-3 ring-2 ring-[#FFD34E] shadow-lg"
            />
            <h1 className="text-xl font-extrabold tracking-tight text-white">BCA STUDY POINT</h1>
            <p className="text-xs text-[#FFE7A3]/85 mt-0.5 font-medium">
              Admin Management & Business Dashboard
            </p>
          </div>

          <form onSubmit={handleLogin} className="p-6 sm:p-7 space-y-4">
            <div className="flex items-center gap-2 text-xs text-[#FFE7A3]/90 bg-black/35 border border-[#FFE7A3]/20 rounded-xl px-3 py-2">
              <ShieldCheck className="w-4 h-4 text-[#FFD34E] shrink-0" />
              <span>Enter your existing Administrator Password / Secret Key to sign in.</span>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-200 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#FFE7A3] mb-1.5">
                Admin Password / Secret Key
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#FFD34E]/80 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  autoFocus
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-black/45 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#FFD34E]/30 focus:border-[#FFD34E]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="btn-gold-primary w-full py-2.5 rounded-xl text-sm font-bold shadow-lg cursor-pointer disabled:opacity-60 transition-all"
            >
              {isLoggingIn ? 'Signing in...' : 'Sign In to Admin Panel'}
            </button>

            <button
              type="button"
              onClick={onExit}
              className="w-full py-2 rounded-xl text-xs font-semibold text-[#FFE7A3]/85 hover:text-white hover:bg-white/10 inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Public Storefront</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  const currentMeta = TAB_TITLES[activeTab];

  // =========================================================================
  // AUTHENTICATED WEBSITE-THEMED DASHBOARD SHELL (Crimson/Burgundy & Gold)
  // =========================================================================
  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-radial-[at_50%_0%] from-[#970014] via-[#65000D] to-[#240005] text-white flex selection:bg-[#FFD34E] selection:text-[#3D0009]">
      {/* Sidebar (Sticky Desktop + Mobile Drawer) */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingOrdersCount={pendingOrders.length}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onExitToStorefront={onExit}
        onLogout={handleLogout}
      />

      {/* Right Main Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Sticky Brand-Themed Top Bar */}
        <header className="sticky top-0 z-30 bg-[#3D0009]/90 backdrop-blur-xl border-b border-[#FFE7A3]/25 px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-[#FFE7A3] hover:text-white hover:bg-white/10 cursor-pointer shrink-0"
              aria-label="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-extrabold text-white truncate">
                {currentMeta.title}
              </h1>
              <p className="hidden sm:block text-[11px] text-[#FFE7A3]/70 truncate">
                {currentMeta.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Global Quick Customer / Order Search */}
            <div className="relative hidden md:block w-64">
              <Search className="w-3.5 h-3.5 text-[#FFD34E]/80 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={quickJump}
                onChange={(e) => setQuickJump(e.target.value)}
                placeholder="Quick find customer or order..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-white/15 bg-black/45 text-white placeholder-white/45 focus:outline-none focus:ring-2 focus:ring-[#FFD34E]/25 focus:border-[#FFD34E]"
              />
              {quickMatchResults &&
                (quickMatchResults.matchedCustomers.length > 0 ||
                  quickMatchResults.matchedOrders.length > 0) && (
                  <div className="absolute right-0 mt-1.5 w-80 liquid-glass-master rounded-2xl border border-[#FFE7A3]/30 shadow-2xl p-2 z-50 space-y-2 text-left text-white">
                    {quickMatchResults.matchedCustomers.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-[10px] font-bold uppercase text-[#FFE7A3]/70">
                          Customers
                        </div>
                        {quickMatchResults.matchedCustomers.map((c) => (
                          <button
                            key={c.customerId}
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(c);
                              setQuickJump('');
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-xs flex items-center justify-between cursor-pointer"
                          >
                            <span className="font-bold text-white truncate">{c.fullName}</span>
                            <span className="text-[11px] text-[#FFE7A3]/80">{c.mobile}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {quickMatchResults.matchedOrders.length > 0 && (
                      <div>
                        <div className="px-2 py-1 text-[10px] font-bold uppercase text-[#FFE7A3]/70">
                          Orders
                        </div>
                        {quickMatchResults.matchedOrders.map((o) => (
                          <button
                            key={o.orderId}
                            type="button"
                            onClick={() => {
                              setSelectedOrder(o);
                              setQuickJump('');
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-xs flex items-center justify-between cursor-pointer"
                          >
                            <span className="font-mono font-bold text-[#FFD34E]">{o.orderId}</span>
                            <span className="text-[11px] text-white/75 truncate max-w-[140px]">
                              {o.studentName}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
            </div>

            {pendingOrders.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-200 border border-amber-400/40 hover:bg-amber-500/30 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 text-[#FFD34E]" />
                <span className="tabular-nums">{pendingOrders.length}</span>
                <span className="hidden sm:inline">Pending</span>
              </button>
            )}

            <button
              type="button"
              onClick={loadAllData}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#FFE7A3] bg-white/10 hover:bg-white/20 border border-[#FFE7A3]/25 cursor-pointer disabled:opacity-60"
              title="Refresh live data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#FFD34E]' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        {/* Global Toast Feedback Banner */}
        {toast && (
          <div className="px-4 sm:px-6 pt-4">
            <div
              className={`rounded-2xl px-4 py-3 text-xs font-semibold flex items-center justify-between gap-3 border shadow-md backdrop-blur-md ${
                toast.isError
                  ? 'bg-rose-950/85 text-rose-200 border-rose-400/40'
                  : 'bg-emerald-950/85 text-emerald-200 border-emerald-400/40'
              }`}
            >
              <div className="flex items-center gap-2">
                {toast.isError ? (
                  <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                )}
                <span>{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-[11px] font-bold opacity-80 hover:opacity-100 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Active View Content */}
        <main className="flex-1 min-w-0 p-3 sm:p-5 lg:p-6 max-w-[1680px] w-full mx-auto">
          {activeTab === 'dashboard' && (
            <AdminDashboardView
              stats={effectiveStats}
              pendingOrders={pendingOrders}
              dateRange={dateRange}
              customStartDate={customStartDate}
              customEndDate={customEndDate}
              onChangeDateRange={setDateRange}
              onChangeCustomDates={(s, e) => {
                setCustomStartDate(s);
                setCustomEndDate(e);
              }}
              onNavigateTab={setActiveTab}
              onSelectOrder={setSelectedOrder}
              onApproveOrder={handleApproveOrder}
              onRejectOrderClick={setRejectingOrder}
            />
          )}

          {activeTab === 'orders' && (
            <AdminOrdersView
              orders={orders}
              onApproveOrder={handleApproveOrder}
              onRejectOrderClick={setRejectingOrder}
              onDeleteOrderClick={setDeleteOrderTarget}
              onSelectOrder={setSelectedOrder}
            />
          )}

          {activeTab === 'customers' && (
            <AdminCustomersView
              customers={customers}
              onSelectCustomer={setSelectedCustomer}
              onDeleteCustomerClick={setDeleteCustomerTarget}
            />
          )}

          {activeTab === 'products' && (
            <AdminProductsView
              products={products}
              semesters={semesters}
              onRefresh={loadAllData}
              onSyncAllToFirebase={handleSyncAllToFirebase}
              onNotify={notify}
            />
          )}

          {activeTab === 'packages' && (
            <AdminPackagesView
              products={products}
              packages={packages}
              effectivePricing={effectivePricing}
              onRefresh={loadAllData}
              onNotify={notify}
            />
          )}

          {activeTab === 'offers' && (
            <AdminOffersView
              offers={offers}
              effectivePricing={effectivePricing}
              onRefresh={loadAllData}
              onNotify={notify}
            />
          )}

          {activeTab === 'banners' && (
            <AdminBannersView
              banners={banners}
              onRefresh={loadAllData}
              onNotify={notify}
            />
          )}

          {activeTab === 'website' && (
            <AdminWebsiteView
              siteSettings={siteSettings}
              products={products}
              onRefresh={loadAllData}
              onNotify={notify}
            />
          )}

          {activeTab === 'reports' && (
            <AdminReportsView
              dateRange={dateRange}
              customStartDate={customStartDate}
              customEndDate={customEndDate}
              onChangeDateRange={setDateRange}
              onChangeCustomDates={(s, e) => {
                setCustomStartDate(s);
                setCustomEndDate(e);
              }}
            />
          )}

          {activeTab === 'settings' && (
            <AdminSettingsView
              semesters={semesters}
              devices={devices}
              auditLogs={auditLogs}
              onRefresh={loadAllData}
              onSyncAllToFirebase={handleSyncAllToFirebase}
              onNotify={notify}
            />
          )}
        </main>
      </div>

      {/* Shared Modals */}
      <CustomerProfileModal
        customer={selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        onSelectOrder={(ord) => {
          setSelectedCustomer(null);
          setSelectedOrder(ord);
        }}
        onDeleteCustomerClick={setDeleteCustomerTarget}
      />

      <OrderDetailsModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onApprove={handleApproveOrder}
        onRejectClick={setRejectingOrder}
        onDeleteClick={setDeleteOrderTarget}
      />

      <RejectOrderModal
        order={rejectingOrder}
        isSubmitting={isSubmittingReject}
        onClose={() => setRejectingOrder(null)}
        onSubmit={handleRejectOrderSubmit}
      />

      <ConfirmModal
        isOpen={Boolean(deleteOrderTarget)}
        title="Delete Order Record"
        description={`Delete order ${deleteOrderTarget?.orderId} by ${deleteOrderTarget?.studentName}? Any active PDF purchases tied to this order will also be revoked.`}
        confirmLabel="Delete Order"
        isProcessing={isDeletingOrder}
        onCancel={() => setDeleteOrderTarget(null)}
        onConfirm={handleConfirmDeleteOrder}
      />

      <ConfirmModal
        isOpen={Boolean(deleteCustomerTarget)}
        title="Delete Customer & Revoke All Access"
        description={`Permanently delete ${deleteCustomerTarget?.fullName} (${
          deleteCustomerTarget?.mobile || deleteCustomerTarget?.email || deleteCustomerTarget?.customerId
        })? This will remove their customer record, ${
          deleteCustomerTarget?.totalOrders || 0
        } order(s), all active PDF access, and bound device(s) from both the server and Firebase.`}
        confirmLabel="Delete Customer"
        isProcessing={isDeletingCustomer}
        onCancel={() => setDeleteCustomerTarget(null)}
        onConfirm={handleConfirmDeleteCustomer}
      />
    </div>
  );
};
