import React, { useEffect, useState, useMemo } from 'react';
import {
  BookOpen,
  ShieldCheck,
  Laptop,
  ArrowRight,
  Loader2,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Search,
  FileText,
  CreditCard,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BRAND } from '../constants/brand';
import { FALLBACK_PRODUCTS } from '../constants/fallbackProducts';
import { subscribeToOrdersRealtime } from '../firebase/firebase';
import { PaymentReceiptModal } from './PaymentReceiptModal';
import type { Order } from '../types';

interface PurchasedContentProps {
  onOpenViewer: (productId: string) => void;
  onGoToCatalog: () => void;
  onOpenAuth: () => void;
}

export const PurchasedContent: React.FC<PurchasedContentProps> = ({
  onOpenViewer,
  onGoToCatalog,
  onOpenAuth,
}) => {
  const { student, loginStudent } = useAuth();
  const [allRtdbOrders, setAllRtdbOrders] = useState<Order[]>([]);
  const [apiOrders, setApiOrders] = useState<Order[]>([]);
  const [apiPurchases, setApiPurchases] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Primary Tab Switcher: 'notes' (Default clean view) vs 'payments' (Dedicated Payment History)
  const [activeTab, setActiveTab] = useState<'notes' | 'payments'>('notes');
  const [showLookup, setShowLookup] = useState(false);

  // Receipt Modal State
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);

  // Manual lookup state (for students searching by phone or order ID)
  const [lookupQuery, setLookupQuery] = useState('');
  const [lookupActiveQuery, setLookupActiveQuery] = useState('');

  const [hasLoadedLiveOrders, setHasLoadedLiveOrders] = useState(false);

  // 1. Subscribe to Firebase Realtime Database for all live orders
  useEffect(() => {
    const unsubscribe = subscribeToOrdersRealtime(
      (orders) => {
        setAllRtdbOrders(orders || []);
        setHasLoadedLiveOrders(true);
      },
      (err) => {
        console.warn('PurchasedContent RTDB orders notice:', err);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Fetch backend purchases & orders for current student
  const loadBackendPurchases = async (silent = false) => {
    const queryId = lookupActiveQuery || student?.id || student?.email || student?.mobile;
    if (!queryId) return;

    if (!silent) setIsLoading(true);
    setError('');

    try {
      const data = await api.getStudentPurchases(queryId);
      if (data?.orders) {
        setApiOrders(data.orders);
        setHasLoadedLiveOrders(true);
      }
      if (data?.purchases) setApiPurchases(data.purchases);
    } catch (err: any) {
      if (!silent) {
        console.warn('Backend API purchases fetch notice:', err?.message || err);
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBackendPurchases(false);

    // Auto-poll backend every 5 seconds
    const interval = setInterval(() => {
      loadBackendPurchases(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [student?.id, student?.email, student?.mobile, lookupActiveQuery]);

  // Read cached last order from localStorage ONLY as initial fallback before live sync completes
  const lastOrderId = typeof window !== 'undefined' ? localStorage.getItem('bca_last_order_id') || '' : '';
  const localCachedOrders: Order[] = useMemo(() => {
    if (typeof window === 'undefined' || hasLoadedLiveOrders) return [];
    try {
      return JSON.parse(localStorage.getItem('bca_orders') || '[]');
    } catch {
      return [];
    }
  }, [hasLoadedLiveOrders]);

  // 3. Merge and match orders for this student (live backend + RTDB are authoritative)
  const matchedOrders: Order[] = useMemo(() => {
    const map = new Map<string, Order>();
    const combined = [...allRtdbOrders, ...apiOrders, ...localCachedOrders];

    const cleanStudentEmail = (student?.email || '').toLowerCase().trim();
    const cleanStudentMobile = (student?.mobile || '').replace(/\D/g, '');
    const cleanLookup = lookupActiveQuery.trim().toLowerCase();
    const cleanLookupDigits = lookupActiveQuery.replace(/\D/g, '');

    for (const ord of combined) {
      if (!ord || !ord.orderId) continue;

      const ordEmail = (ord.studentEmail || '').toLowerCase().trim();
      const ordMobileDigits = (ord.studentMobile || '').replace(/\D/g, '');
      const ordId = ord.orderId.toUpperCase();

      let isMatch = false;

      // Match by explicit student login
      if (student?.id && ord.userId === student.id) isMatch = true;
      if (cleanStudentEmail && ordEmail === cleanStudentEmail) isMatch = true;
      if (cleanStudentMobile && cleanStudentMobile.length >= 10 && ordMobileDigits === cleanStudentMobile) isMatch = true;

      // Guest checkout fallback before login completes
      if (!student && lastOrderId && ordId === lastOrderId.toUpperCase()) isMatch = true;

      // Match by active search lookup
      if (cleanLookup) {
        if (ordId.includes(cleanLookup.toUpperCase())) isMatch = true;
        if (ordEmail && ordEmail.includes(cleanLookup)) isMatch = true;
        if (cleanLookupDigits.length >= 8 && ordMobileDigits.includes(cleanLookupDigits)) isMatch = true;
      }

      if (isMatch) {
        const existing = map.get(ord.orderId);
        // Prefer verified status over pending if any source is verified
        if (!existing || ord.paymentStatus === 'verified') {
          map.set(ord.orderId, { ...existing, ...ord });
        }
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [allRtdbOrders, apiOrders, localCachedOrders, student, lastOrderId, lookupActiveQuery]);

  // 4. Derive purchases list from both backend API purchases and verified RTDB orders
  const resolvedPurchases = useMemo(() => {
    const purchasesMap = new Map<string, any>();

    // 1. From API purchases
    for (const p of apiPurchases) {
      purchasesMap.set(p.productId, p);
    }

    // 2. From all matched orders in RTDB / Local
    for (const ord of matchedOrders) {
      const isVerified = ord.paymentStatus === 'verified';
      const items = ord.items && ord.items.length > 0
        ? ord.items
        : (ord.selectedProductIds || []).map((id) => {
            const fb = FALLBACK_PRODUCTS.find((p) => p.id === id);
            return {
              productId: id,
              subjectCode: fb?.subjectCode || 'BCA',
              subjectName: fb?.subjectName || 'Question Bank',
            };
          });

      for (const item of items) {
        const fallback = FALLBACK_PRODUCTS.find((p) => p.id === item.productId);
        const existing = purchasesMap.get(item.productId);

        if (!existing || isVerified) {
          purchasesMap.set(item.productId, {
            purchaseId: `pur-${ord.orderId}-${item.productId}`,
            productId: item.productId,
            orderId: ord.orderId,
            accessStatus: isVerified ? 'active' : 'pending_approval',
            purchasedAt: ord.createdAt,
            subjectName: item.subjectName || fallback?.subjectName || 'BCA Question Bank',
            subjectCode: item.subjectCode || fallback?.subjectCode || 'BCA',
            semesterId: fallback?.semesterId || 'sem-3',
            pageCount: fallback?.pageCount || 30,
            examYear: fallback?.examYear || '2024-2025 Edition',
          });
        }
      }
    }

    return Array.from(purchasesMap.values());
  }, [apiPurchases, matchedOrders]);

  const activePurchases = useMemo(
    () => resolvedPurchases.filter((p) => p.accessStatus === 'active'),
    [resolvedPurchases]
  );

  const pendingOrdersCount = useMemo(
    () => matchedOrders.filter((o) => o.paymentStatus === 'pending').length,
    [matchedOrders]
  );

  const verifiedOrders = useMemo(
    () => matchedOrders.filter((o) => o.paymentStatus === 'verified'),
    [matchedOrders]
  );

  // Consolidated all-in-one receipt only offered if student placed multiple separate verified orders
  const consolidatedVerifiedReceipt: Order | null = useMemo(() => {
    if (verifiedOrders.length <= 1) return null;
    const itemMap = new Map<string, any>();
    for (const ord of verifiedOrders) {
      const list =
        ord.items && ord.items.length > 0
          ? ord.items
          : (ord.selectedProductIds || []).map((id) => {
              const fb = FALLBACK_PRODUCTS.find((p) => p.id === id);
              return {
                productId: id,
                subjectCode: fb?.subjectCode || 'BCA',
                subjectName: fb?.subjectName || 'Question Bank',
                price: fb?.price || 20,
              };
            });
      for (const it of list) {
        if (!itemMap.has(it.productId)) {
          itemMap.set(it.productId, it);
        }
      }
    }
    const latest = verifiedOrders[0];
    return {
      ...latest,
      orderId: `ALL-${verifiedOrders.length}ORD-${latest.orderId.slice(-6)}`,
      items: Array.from(itemMap.values()),
      selectedProductIds: Array.from(itemMap.keys()),
      packageName: `Combined Receipt (${verifiedOrders.length} Purchases)`,
      totalAmount: verifiedOrders.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0),
      paymentReference: verifiedOrders.map((o) => o.orderId).join(', '),
    };
  }, [verifiedOrders]);

  const hasAnyItems = matchedOrders.length > 0 || resolvedPurchases.length > 0;

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupQuery.trim()) return;
    setLookupActiveQuery(lookupQuery.trim());

    // Auto login if 10-digit mobile number found in matching orders
    const cleanDigits = lookupQuery.replace(/\D/g, '');
    const found = allRtdbOrders.find(
      (o) =>
        (cleanDigits.length >= 10 && (o.studentMobile || '').replace(/\D/g, '') === cleanDigits) ||
        o.orderId.toUpperCase() === lookupQuery.trim().toUpperCase()
    );
    if (found && !student) {
      loginStudent({
        id: found.userId || `std_${found.orderId}`,
        fullName: found.studentName || 'Student',
        email: found.studentEmail || '',
        mobile: found.studentMobile || cleanDigits,
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-2.5 sm:py-5 px-3 sm:px-6 lg:px-8 space-y-2.5 sm:space-y-4">
      {/* 1. Ultra-Compact Top Header (Zero wasted vertical space on mobile) */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/15">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight truncate">
              My Notes
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 shrink-0">
              <Laptop className="w-3 h-3" />
              <span>1:1 Safe</span>
            </span>
          </div>
          {student && (
            <p className="text-[11px] text-[#FFE7A3]/85 truncate">
              {student.fullName} · {student.mobile || student.email}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {hasAnyItems && (
            <button
              type="button"
              onClick={() => setShowLookup((v) => !v)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                showLookup || lookupActiveQuery
                  ? 'bg-[#FFD34E] text-[#3D0009] border-[#FFD34E]'
                  : 'bg-black/40 text-[#FFE7A3] border-white/15 hover:bg-white/10'
              }`}
              title="অর্ডার খুঁজুন"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Find</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => loadBackendPurchases(false)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-black/40 text-[#FFE7A3] border border-white/15 hover:bg-white/10 transition-colors cursor-pointer"
            title="রিফ্রেশ করুন"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#FFD34E]' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. ORDER LOOKUP BAR (Shown automatically if empty, or toggled via Find button) */}
      {(showLookup || Boolean(lookupActiveQuery) || !hasAnyItems) && (
        <form
          onSubmit={handleLookupSubmit}
          className="flex items-center gap-1.5 bg-black/45 p-1.5 rounded-xl border border-[#FFE7A3]/25"
        >
          <div className="relative flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 text-[#FFD34E] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={lookupQuery}
              onChange={(e) => setLookupQuery(e.target.value)}
              placeholder="মোবাইল নম্বর বা অর্ডার আইডি..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-black/40 border border-white/15 rounded-lg text-white placeholder-white/45 focus:outline-none focus:border-[#FFD34E]"
            />
          </div>
          <button
            type="submit"
            className="btn-gold-primary px-3.5 py-1.5 text-xs font-black rounded-lg cursor-pointer shrink-0"
          >
            খুঁজুন
          </button>
          {lookupActiveQuery && (
            <button
              type="button"
              onClick={() => {
                setLookupQuery('');
                setLookupActiveQuery('');
              }}
              className="text-[11px] text-white/70 hover:text-white px-2 py-1 cursor-pointer shrink-0"
            >
              Clear
            </button>
          )}
        </form>
      )}

      {/* 3. SINGLE-ROW COMPACT TAB SWITCHER */}
      <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/15">
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
            activeTab === 'notes'
              ? 'bg-gradient-to-r from-[#970014] to-[#65000D] text-white border border-[#FFD34E]/60 shadow-sm'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-[#FFD34E] shrink-0" />
          <span className="truncate">
            Notes ({activePurchases.length > 0 ? activePurchases.length : resolvedPurchases.length})
          </span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer relative ${
            activeTab === 'payments'
              ? 'bg-gradient-to-r from-[#970014] to-[#65000D] text-white border border-[#FFD34E]/60 shadow-sm'
              : 'text-white/70 hover:text-white hover:bg-white/5'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5 text-[#FFD34E] shrink-0" />
          <span className="truncate">Receipts ({matchedOrders.length})</span>
          {pendingOrdersCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute top-1 right-1.5" />
          )}
        </button>
      </div>

      {/* 4. MAIN CONTENT AREA */}
      {isLoading && !hasAnyItems ? (
        <div className="flex flex-col items-center justify-center py-12 text-[#FFE7A3]">
          <Loader2 className="w-8 h-8 animate-spin text-[#FFD34E] mb-2" />
          <span className="text-xs font-semibold">লোড হচ্ছে...</span>
        </div>
      ) : error && !hasAnyItems ? (
        <div className="p-3 bg-rose-950/70 border border-rose-500/40 rounded-xl text-xs text-rose-200 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => loadBackendPurchases(false)}
            className="flex items-center gap-1 font-bold text-[#FFD34E] hover:underline cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      ) : !hasAnyItems ? (
        /* Compact Empty State */
        <div className="liquid-glass-master rounded-2xl p-6 text-center border border-[#FFE7A3]/30 shadow-xl space-y-3">
          <BookOpen className="w-8 h-8 text-[#FFE7A3] mx-auto" />
          <h3 className="text-sm font-extrabold text-white">No Question Banks Found</h3>
          <p className="text-xs text-white/75 max-w-md mx-auto">
            পেমেন্ট করে থাকলে ওপরের বক্সে আপনার <strong>১০ সংখ্যার মোবাইল নম্বর</strong> লিখে <strong>খুঁজুন</strong> চাপুন।
          </p>
          <div className="pt-1 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={onGoToCatalog}
              className="btn-gold-primary inline-flex items-center gap-1.5 px-4 py-2 text-xs font-extrabold rounded-full cursor-pointer"
            >
              <span>Subjects দেখুন</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <a
              href={`https://wa.me/91${BRAND.payment?.whatsappPhone || '8145775413'}?text=${encodeURIComponent(
                'Hello BCA STUDY POINT, I completed payment but need assistance accessing my study materials.'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600/85 hover:bg-emerald-500 rounded-full"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      ) : activeTab === 'notes' ? (
        /* ========================================================================= */
        /* TAB 1: COMPACT ALL-ON-FIRST-SCREEN STUDY MATERIALS                        */
        /* ========================================================================= */
        <div className="space-y-2">
          {/* Compact 1-line Pending Alert Strip */}
          {pendingOrdersCount > 0 && (
            <div className="px-3 py-1.5 bg-amber-950/60 border border-amber-400/45 rounded-xl flex items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 min-w-0 text-amber-200 font-semibold truncate">
                <Clock className="w-3.5 h-3.5 text-amber-300 shrink-0 animate-pulse" />
                <span className="truncate">{pendingOrdersCount}টি অর্ডার ভেরিফিকেশন চলছে</span>
              </div>
              <button
                onClick={() => setActiveTab('payments')}
                className="text-[#FFD34E] font-black hover:underline shrink-0 cursor-pointer"
              >
                Status →
              </button>
            </div>
          )}

          {resolvedPurchases.length === 0 ? (
            <div className="p-6 text-center text-white/70 space-y-1.5 bg-black/40 rounded-xl border border-white/10">
              <Clock className="w-6 h-6 text-amber-300 mx-auto animate-pulse" />
              <h4 className="text-xs font-bold text-white">পেমেন্ট ভেরিফিকেশন চলছে</h4>
              <p className="text-[11px] text-[#FFE7A3]">
                অনুমোদন দেওয়া মাত্রই এখানে পড়ার বাটন চলে আসবে।
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-2.5">
              {resolvedPurchases.map((item) => {
                const isActive = item.accessStatus === 'active';

                return (
                  <div
                    key={item.purchaseId || item.productId}
                    className={`rounded-xl px-3 py-2 border transition-all flex items-center justify-between gap-2.5 ${
                      isActive
                        ? 'border-emerald-500/40 hover:border-[#FFD34E]/60 bg-gradient-to-r from-[#65000D]/70 to-[#240005]/90'
                        : 'border-amber-400/40 bg-amber-950/25'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-mono text-[10px] font-black text-[#FFD34E] bg-black/50 px-1.5 py-0.5 rounded border border-[#FFE7A3]/25 shrink-0">
                          {item.subjectCode}
                        </span>
                        {isActive ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-300 shrink-0">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-200 shrink-0">
                            <Clock className="w-3 h-3 text-amber-300" />
                            <span>Pending</span>
                          </span>
                        )}
                      </div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-white leading-tight truncate">
                        {item.subjectName}
                      </h3>
                    </div>

                    <div className="shrink-0">
                      {isActive ? (
                        <button
                          onClick={() => onOpenViewer(item.productId)}
                          className="btn-gold-primary px-3 py-1.5 rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer shadow-sm hover:brightness-105 transition-all"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Read</span>
                        </button>
                      ) : (
                        <a
                          href={`https://wa.me/91${BRAND.payment?.whatsappPhone || '8145775413'}?text=${encodeURIComponent(
                            `Hello BCA STUDY POINT,\nPlease activate access for ${item.subjectCode} under order ${item.orderId}.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold text-emerald-300 bg-emerald-950/50 border border-emerald-500/40 rounded-lg hover:bg-emerald-900/50"
                          title="Notify on WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Verify</span>
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* TAB 2: DEDICATED PAYMENT HISTORY & OFFICIAL RECEIPTS OPTION               */
        /* ========================================================================= */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[#FFE7A3] px-1">
            <div>
              <span className="flex items-center gap-1.5 text-sm font-black text-white">
                <CreditCard className="w-4 h-4 text-[#FFD34E]" />
                <span>আপনার পেমেন্ট হিস্ট্রি ও অফিশিয়াল রসিদ ({matchedOrders.length})</span>
              </span>
              <span className="text-[11px] text-white/60 block mt-0.5">
                প্রতিটি অনুমোদিত পারচেজের জন্য সব বিষয়সহ ১টি একক মানি রসিদ তৈরি হয়।
              </span>
            </div>

            {consolidatedVerifiedReceipt && (
              <button
                type="button"
                onClick={() => setSelectedReceiptOrder(consolidatedVerifiedReceipt)}
                className="btn-gold-primary px-4 py-2 rounded-full text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>সকল পারচেজের ১টি একত্রিত রসিদ</span>
              </button>
            )}
          </div>

          <div className="space-y-3.5">
            {matchedOrders.map((ord) => {
              const isVerified = ord.paymentStatus === 'verified';
              const isFailed = ord.paymentStatus === 'rejected' || ord.paymentStatus === 'failed';
              const cleanRef = (ord.paymentReference || '').replace(/^upi_/i, '');

              return (
                <div
                  key={ord.orderId}
                  className={`liquid-glass-master rounded-2xl p-4 sm:p-5 border shadow-xl relative overflow-hidden transition-all ${
                    isVerified
                      ? 'border-emerald-500/40 bg-emerald-950/15'
                      : isFailed
                      ? 'border-rose-500/40 bg-rose-950/15'
                      : 'border-amber-400/50 bg-amber-950/20'
                  }`}
                >
                  {/* Order Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-white/10">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black text-[#FFD34E] bg-black/50 px-2.5 py-0.5 rounded border border-white/15">
                          {ord.orderId}
                        </span>
                        <span className="text-xs text-white/70">
                          {new Date(ord.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-white/90">
                        <span>
                          Paid Amount: <strong className="text-[#FFD34E] font-black text-sm">₹{ord.totalAmount}</strong>
                        </span>
                        {cleanRef && (
                          <span>
                            Ref: <strong className="font-mono text-[11px] bg-black/40 px-1.5 py-0.5 rounded text-white">{cleanRef}</strong>
                          </span>
                        )}
                        {ord.studentMobile && (
                          <span className="text-white/60">📱 {ord.studentMobile}</span>
                        )}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow-sm">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>অনুমোদিত ও সক্রিয় (Verified)</span>
                        </span>
                      ) : isFailed ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-400/50">
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                          <span>বাতিল (Rejected)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-200 border border-amber-400/60 shadow-sm animate-pulse">
                          <Clock className="w-4 h-4 text-amber-300" />
                          <span>যাচাইকরণ চলছে (Pending)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Purchased Subjects List */}
                  <div className="py-2.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-white/60 mr-1">অন্তর্ভুক্ত বিষয়:</span>
                    {ord.items && ord.items.length > 0 ? (
                      ord.items.map((it) => (
                        <span
                          key={it.productId}
                          className="px-2 py-0.5 rounded text-[11px] font-bold bg-white/10 text-[#FFE7A3] border border-white/15"
                        >
                          {it.subjectCode} - {it.subjectName}
                        </span>
                      ))
                    ) : (
                      (ord.selectedProductIds || []).map((pid) => {
                        const fb = FALLBACK_PRODUCTS.find((p) => p.id === pid);
                        return (
                          <span
                            key={pid}
                            className="px-2 py-0.5 rounded text-[11px] font-bold bg-white/10 text-[#FFE7A3] border border-white/15"
                          >
                            {fb?.subjectCode || pid} - {fb?.subjectName || ''}
                          </span>
                        );
                      })
                    )}
                  </div>

                  {/* Actions Row: Official Receipt only for Verified Orders */}
                  <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-[11px] text-white/70">
                      {isVerified ? (
                        <span className="text-emerald-300">✓ পেমেন্ট অনুমোদিত হয়েছে। সমস্ত বিষয়ের ১টি একক রসিদ সংগ্রহ করুন।</span>
                      ) : isFailed ? (
                        <span className="text-rose-300">✕ এই অর্ডারটি বাতিল করা হয়েছে।</span>
                      ) : (
                        <span className="text-amber-200">⏳ অ্যাডমিন পেমেন্ট যাচাই করছেন। অনুমোদনের পর অফিশিয়াল রসিদ পাবেন।</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isVerified && (
                        <button
                          type="button"
                          onClick={() => setSelectedReceiptOrder(ord)}
                          className="btn-gold-primary px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-105 transition-transform"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>রসিদ দেখুন / Receipt</span>
                        </button>
                      )}

                      {/* WhatsApp Help */}
                      <a
                        href={`https://wa.me/91${BRAND.payment?.whatsappPhone || '8145775413'}?text=${encodeURIComponent(
                          `Hello BCA STUDY POINT,\nInquiry about Order ${ord.orderId} (₹${ord.totalAmount}).\nRef: ${cleanRef || 'Screenshot'}\nStudent Name: ${ord.studentName || 'Student'}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-full bg-emerald-600/80 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>WhatsApp Help</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Official Payment Receipt Modal */}
      <PaymentReceiptModal
        order={selectedReceiptOrder}
        isOpen={!!selectedReceiptOrder}
        onClose={() => setSelectedReceiptOrder(null)}
      />
    </div>
  );
};
