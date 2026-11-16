import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  CheckCircle2,
  XCircle,
  Trash2,
  Eye,
  Phone,
  BookOpen,
  Calendar,
} from 'lucide-react';
import type { CustomerSummary, Order } from '../../types';
import { exportCsv, formatDateIST, formatDateTimeIST, formatInr } from './adminTypes';
import { OrderStatusBadge } from './AdminModals';

interface AdminOrdersViewProps {
  orders: Order[];
  onApproveOrder: (orderId: string) => void;
  onRejectOrderClick: (order: Order) => void;
  onDeleteOrderClick: (order: Order) => void;
  onSelectOrder: (order: Order) => void;
}

export const AdminOrdersView: React.FC<AdminOrdersViewProps> = ({
  orders,
  onApproveOrder,
  onRejectOrderClick,
  onDeleteOrderClick,
  onSelectOrder,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter === 'pending' && o.paymentStatus !== 'pending') return false;
      if (statusFilter === 'verified' && o.paymentStatus !== 'verified') return false;
      if (statusFilter === 'rejected' && o.paymentStatus !== 'rejected' && o.paymentStatus !== 'failed') {
        return false;
      }

      if (dateFrom) {
        const d = (o.createdAt || '').slice(0, 10);
        if (d < dateFrom) return false;
      }
      if (dateTo) {
        const d = (o.createdAt || '').slice(0, 10);
        if (d > dateTo) return false;
      }

      if (!q) return true;
      return (
        (o.orderId || '').toLowerCase().includes(q) ||
        (o.studentName || '').toLowerCase().includes(q) ||
        (o.studentMobile || '').toLowerCase().includes(q) ||
        (o.studentEmail || '').toLowerCase().includes(q) ||
        (o.paymentReference || '').toLowerCase().includes(q) ||
        (o.items || []).some((it) => (it.subjectName || '').toLowerCase().includes(q))
      );
    });
  }, [orders, search, statusFilter, dateFrom, dateTo]);

  const counts = useMemo(() => {
    return {
      all: orders.length,
      pending: orders.filter((o) => o.paymentStatus === 'pending').length,
      verified: orders.filter((o) => o.paymentStatus === 'verified').length,
      rejected: orders.filter((o) => o.paymentStatus === 'rejected' || o.paymentStatus === 'failed').length,
    };
  }, [orders]);

  const handleExport = () => {
    exportCsv(
      `bca_orders_${new Date().toISOString().slice(0, 10)}.csv`,
      ['Order ID', 'Date', 'Customer Name', 'Mobile', 'Email', 'Subjects', 'Package', 'Reference', 'Amount', 'Status'],
      filtered.map((o) => [
        o.orderId,
        formatDateTimeIST(o.createdAt),
        o.studentName,
        o.studentMobile || '',
        o.studentEmail || '',
        (o.items || []).map((i) => i.subjectCode || i.subjectName).join('; '),
        o.packageName || 'Custom Selection',
        o.paymentReference || 'Screenshot',
        o.totalAmount,
        o.paymentStatus,
      ])
    );
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      {/* Header & Controls */}
      <div className="liquid-glass-card rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-extrabold text-white">Orders & Sales</h2>
            <p className="text-xs text-white/65">
              Check customer screenshots, inspect purchased subjects, approve or reject orders.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#FFE7A3] bg-[#FFD34E]/15 hover:bg-[#FFD34E]/25 border border-[#FFD34E]/35 cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Status Tabs + Search + Date Filter */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: 'all', label: `All (${counts.all})` },
                { id: 'pending', label: `Pending (${counts.pending})` },
                { id: 'verified', label: `Verified (${counts.verified})` },
                { id: 'rejected', label: `Rejected (${counts.rejected})` },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setStatusFilter(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === t.id
                    ? 'btn-gold-primary shadow-xs'
                    : 'bg-black/40 text-white/80 hover:text-white border border-white/15'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <div className="relative flex-1 min-w-[180px] sm:w-60 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-[#FFE7A3]/60 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order ID, name, mobile..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-black/45 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#FFD34E]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-black/45 border border-white/20 text-white text-xs [color-scheme:dark] max-w-full"
                title="From Date"
              />
              <span className="text-white/40">—</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-black/45 border border-white/20 text-white text-xs [color-scheme:dark] max-w-full"
                title="To Date"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Viewport-Safe Orders List (Never clips horizontally on any screen size) */}
      <div className="liquid-glass-card rounded-2xl overflow-hidden">
        {/* Desktop Header Bar */}
        <div className="hidden xl:grid xl:grid-cols-12 gap-3 px-4 py-3 bg-black/45 border-b border-[#FFE7A3]/20 text-[11px] font-bold uppercase tracking-wider text-[#FFE7A3]">
          <div className="col-span-3">Order &amp; Date</div>
          <div className="col-span-3">Customer</div>
          <div className="col-span-3">Subjects &amp; Proof</div>
          <div className="col-span-1 text-right">Amount</div>
          <div className="col-span-2 text-right">Status &amp; Actions</div>
        </div>

        <div className="divide-y divide-white/10">
          {filtered.map((ord) => (
            <div
              key={ord.orderId}
              onClick={() => onSelectOrder(ord)}
              className="p-3.5 sm:px-4 sm:py-3.5 hover:bg-[#970014]/25 cursor-pointer transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              {/* Left 100%-contained Info Grid */}
              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-10 gap-2.5 items-center">
                {/* Order ID + Date */}
                <div className="xl:col-span-3 min-w-0">
                  <div className="font-mono font-bold text-xs text-[#FFD34E] truncate">{ord.orderId}</div>
                  <div className="text-[11px] text-white/60 truncate">{formatDateTimeIST(ord.createdAt)}</div>
                </div>

                {/* Customer */}
                <div className="xl:col-span-3 min-w-0">
                  <div className="font-bold text-xs text-white truncate">{ord.studentName}</div>
                  <div className="text-[11px] text-white/65 truncate">
                    {ord.studentMobile || '—'} · {ord.studentEmail || '—'}
                  </div>
                </div>

                {/* Subjects + Verification */}
                <div className="xl:col-span-3 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-xs text-[#FFE7A3] truncate">
                      {ord.packageName || `${ord.items?.length || 0} Subject(s)`}
                    </span>
                    {ord.paymentScreenshotUrl ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/35 shrink-0">
                        Screenshot
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/10 text-white/75 truncate max-w-[110px]">
                        {ord.paymentReference || 'Manual'}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-white/60 truncate mt-0.5">
                    {(ord.items || []).map((i) => i.subjectCode || i.subjectName).join(', ')}
                  </div>
                </div>

                {/* Amount + Status (Compact) */}
                <div className="xl:col-span-1 flex sm:flex-col items-center sm:items-end justify-between gap-1 min-w-0">
                  <span className="font-black text-sm text-[#FFD34E] tabular-nums">
                    {formatInr(ord.totalAmount)}
                  </span>
                  <div className="xl:hidden">
                    <OrderStatusBadge status={ord.paymentStatus} />
                  </div>
                </div>
              </div>

              {/* Right Pinned Status + Action Buttons (Always visible inside screen) */}
              <div
                className="shrink-0 flex flex-wrap items-center justify-between md:justify-end gap-1.5 pt-2.5 md:pt-0 border-t md:border-t-0 border-white/10"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="hidden xl:block mr-1">
                  <OrderStatusBadge status={ord.paymentStatus} />
                </div>

                <div className="inline-flex flex-wrap items-center gap-1.5 ml-auto">
                  <button
                    type="button"
                    onClick={() => onSelectOrder(ord)}
                    className="p-1.5 rounded-lg text-white bg-white/10 hover:bg-white/20 cursor-pointer"
                    title="Order Details"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  {ord.paymentStatus !== 'verified' && (
                    <button
                      type="button"
                      onClick={() => onApproveOrder(ord.orderId)}
                      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 cursor-pointer"
                      title="Approve Order"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Approve</span>
                    </button>
                  )}
                  {ord.paymentStatus !== 'rejected' && ord.paymentStatus !== 'failed' && (
                    <button
                      type="button"
                      onClick={() => onRejectOrderClick(ord)}
                      className="p-1.5 rounded-lg text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 cursor-pointer"
                      title="Reject Order"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDeleteOrderClick(ord)}
                    className="p-1.5 rounded-lg text-rose-300 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 cursor-pointer"
                    title="Delete Order"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="py-12 text-center text-xs text-white/50">
              No matching orders found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface AdminCustomersViewProps {
  customers: CustomerSummary[];
  onSelectCustomer: (customer: CustomerSummary) => void;
  onDeleteCustomerClick: (customer: CustomerSummary) => void;
}

export const AdminCustomersView: React.FC<AdminCustomersViewProps> = ({
  customers,
  onSelectCustomer,
  onDeleteCustomerClick,
}) => {
  const [search, setSearch] = useState('');
  const [onlyBuyers, setOnlyBuyers] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (onlyBuyers && c.purchasedSubjectCount === 0) return false;
      if (dateFrom && c.lastPurchaseDate) {
        if (c.lastPurchaseDate.slice(0, 10) < dateFrom) return false;
      } else if (dateFrom && !c.lastPurchaseDate) {
        return false;
      }
      if (dateTo && c.lastPurchaseDate) {
        if (c.lastPurchaseDate.slice(0, 10) > dateTo) return false;
      }
      if (!q) return true;
      return (
        (c.fullName || '').toLowerCase().includes(q) ||
        (c.mobile || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        c.purchasedProductNames.some((n) => n.toLowerCase().includes(q)) ||
        c.purchasedPackageNames.some((p) => p.toLowerCase().includes(q))
      );
    });
  }, [customers, search, onlyBuyers, dateFrom, dateTo]);

  const handleExport = () => {
    exportCsv(
      `bca_customers_${new Date().toISOString().slice(0, 10)}.csv`,
      [
        'Customer Name',
        'Mobile Number',
        'Email ID',
        'Registration Date',
        'Subjects Purchased',
        'Purchased Products',
        'Packages',
        'Total Spent',
        'Last Purchase Date',
      ],
      filtered.map((c) => [
        c.fullName,
        c.mobile || '',
        c.email || '',
        formatDateIST(c.registeredAt),
        c.purchasedSubjectCount,
        c.purchasedProductNames.join('; '),
        c.purchasedPackageNames.join('; '),
        c.totalAmountSpent,
        formatDateTimeIST(c.lastPurchaseDate),
      ])
    );
  };

  const buyersCount = useMemo(
    () => customers.filter((c) => c.purchasedSubjectCount > 0).length,
    [customers]
  );

  return (
    <div className="space-y-4 w-full min-w-0">
      {/* Header & Filters */}
      <div className="liquid-glass-card rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              Customer Directory ({customers.length})
            </h2>
            <p className="text-xs text-white/65">
              View every customer&apos;s name, mobile, email, subject count, purchased PDFs &amp; spend. Click any customer to inspect full profile.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#FFE7A3] bg-[#FFD34E]/15 hover:bg-[#FFD34E]/25 border border-[#FFD34E]/35 cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setOnlyBuyers(false)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                !onlyBuyers
                  ? 'btn-gold-primary'
                  : 'bg-black/40 text-white/80 hover:text-white border border-white/15'
              }`}
            >
              All Customers ({customers.length})
            </button>
            <button
              type="button"
              onClick={() => setOnlyBuyers(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                onlyBuyers
                  ? 'btn-gold-primary'
                  : 'bg-black/40 text-white/80 hover:text-white border border-white/15'
              }`}
            >
              With Purchases ({buyersCount})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <div className="relative flex-1 min-w-[180px] sm:w-64 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-[#FFE7A3]/60 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, mobile, email, subject..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-black/45 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#FFD34E]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-[#FFE7A3]/60 hidden sm:inline shrink-0" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-black/45 border border-white/20 text-white text-xs [color-scheme:dark] max-w-full"
                title="Last Purchase From"
              />
              <span className="text-white/40">—</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-black/45 border border-white/20 text-white text-xs [color-scheme:dark] max-w-full"
                title="Last Purchase To"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 100% Viewport-Safe Customer List (Never clips buttons or columns on the right side) */}
      <div className="liquid-glass-card rounded-2xl overflow-hidden w-full">
        {/* Desktop Column Labels */}
        <div className="hidden xl:flex items-center justify-between gap-3 px-4 py-3 bg-black/45 border-b border-[#FFE7A3]/20 text-[11px] font-bold uppercase tracking-wider text-[#FFE7A3]">
          <div className="flex-1 min-w-0 grid grid-cols-12 gap-3">
            <div className="col-span-3">Customer</div>
            <div className="col-span-3">Mobile &amp; Email</div>
            <div className="col-span-4">Purchased Subjects</div>
            <div className="col-span-2 text-right">Spent &amp; Date</div>
          </div>
          <div className="w-[190px] shrink-0 text-right">Actions</div>
        </div>

        <div className="divide-y divide-white/10">
          {filtered.map((c) => {
            const cleanMobile = (c.mobile || '').replace(/\D/g, '');
            const previewProducts = c.purchasedProducts.slice(0, 2);
            const extraCount = Math.max(0, c.purchasedProducts.length - 2);

            return (
              <div
                key={c.customerId}
                onClick={() => onSelectCustomer(c)}
                className="p-3.5 sm:px-4 sm:py-3.5 hover:bg-[#970014]/25 cursor-pointer transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                {/* Left Flexible Info Grid (shrinks gracefully inside viewport) */}
                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-2.5 sm:gap-3 items-center">
                  {/* Customer Name */}
                  <div className="xl:col-span-3 min-w-0 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#FFD34E]/15 border border-[#FFD34E]/35 text-[#FFD34E] font-black text-xs flex items-center justify-center shrink-0">
                      {(c.fullName || 'S').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-sm text-white truncate">
                        {c.fullName}
                      </div>
                      <div className="text-[10px] text-white/55 truncate">
                        Joined {formatDateIST(c.registeredAt)}
                      </div>
                    </div>
                  </div>

                  {/* Mobile & Email */}
                  <div className="xl:col-span-3 min-w-0">
                    <div className="font-semibold text-xs text-white/95 tabular-nums truncate">
                      {c.mobile || '—'}
                    </div>
                    <div className="text-[11px] text-white/60 truncate" title={c.email || ''}>
                      {c.email || '—'}
                    </div>
                  </div>

                  {/* Purchased Subjects */}
                  <div className="xl:col-span-4 min-w-0">
                    {c.purchasedSubjectCount > 0 ? (
                      <div className="flex items-center flex-wrap gap-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFD34E]/20 text-[#FFD34E] border border-[#FFD34E]/40 tabular-nums shrink-0">
                          <BookOpen className="w-3 h-3" />
                          {c.purchasedSubjectCount}
                        </span>
                        {previewProducts.map((p) => (
                          <span
                            key={p.productId}
                            className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-black/45 border border-white/15 text-white/90 truncate max-w-[95px]"
                            title={p.subjectName}
                          >
                            {p.subjectCode || p.subjectName}
                          </span>
                        ))}
                        {extraCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold text-[#FFE7A3] bg-white/10 border border-white/15 shrink-0">
                            +{extraCount} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-white/45">No purchases yet</span>
                    )}
                  </div>

                  {/* Spent & Date */}
                  <div className="xl:col-span-2 min-w-0 flex sm:flex-col items-center sm:items-end justify-between gap-1 text-right">
                    <div className="font-black text-xs sm:text-sm text-[#FFD34E] tabular-nums">
                      {formatInr(c.totalAmountSpent)}{' '}
                      <span className="text-[10px] font-normal text-white/60">
                        ({c.totalOrders})
                      </span>
                    </div>
                    <div className="text-[10px] text-white/60 truncate max-w-full">
                      {formatDateTimeIST(c.lastPurchaseDate || c.registeredAt)}
                    </div>
                  </div>
                </div>

                {/* Right Pinned Action Bar (Guaranteed 100% visible inside card on all viewports) */}
                <div
                  className="shrink-0 flex items-center justify-end gap-1.5 pt-2.5 md:pt-0 border-t md:border-t-0 border-white/10"
                  onClick={(e) => e.stopPropagation()}
                >
                  {cleanMobile && (
                    <a
                      href={`https://wa.me/91${cleanMobile}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 shrink-0"
                      title="WhatsApp Customer"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelectCustomer(c)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-[#FFD34E] bg-[#FFD34E]/15 hover:bg-[#FFD34E]/25 border border-[#FFD34E]/30 cursor-pointer shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Profile</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteCustomerClick(c)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-rose-300 bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/40 cursor-pointer shrink-0"
                    title="Delete Customer & Revoke Access"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="py-12 text-center text-xs text-white/50">
              No customers match your filter criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
