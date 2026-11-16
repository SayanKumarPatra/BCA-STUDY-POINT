import React from 'react';
import {
  ShoppingBag,
  IndianRupee,
  Users,
  BookOpen,
  Tag,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  ArrowUpRight,
  Image as ImageIcon,
  BarChart3,
} from 'lucide-react';
import type { AdminDashboardStats, Order } from '../../types';
import type { AdminNavTab, DateRangePreset } from './adminTypes';
import { formatInr } from './adminTypes';

interface AdminDashboardViewProps {
  stats: AdminDashboardStats | null;
  pendingOrders: Order[];
  dateRange: DateRangePreset;
  customStartDate: string;
  customEndDate: string;
  onChangeDateRange: (range: DateRangePreset) => void;
  onChangeCustomDates: (start: string, end: string) => void;
  onNavigateTab: (tab: AdminNavTab) => void;
  onSelectOrder: (order: Order) => void;
  onApproveOrder: (orderId: string) => void;
  onRejectOrderClick: (order: Order) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  stats,
  pendingOrders,
  dateRange,
  customStartDate,
  customEndDate,
  onChangeDateRange,
  onChangeCustomDates,
  onNavigateTab,
  onSelectOrder,
  onApproveOrder,
  onRejectOrderClick,
}) => {
  const s = stats || {
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
    totalSubjects: 0,
    publishedSubjects: 0,
    activeOffersCount: 0,
    activeDevices: 0,
    salesSeries: [],
  };

  const todayOrdersTotal = s.todayOrders ?? s.todaySales;
  const todayPendingCount = s.todayPendingOrders ?? 0;
  const todayPendingAmt = s.todayPendingRevenue ?? 0;

  const kpiCards = [
    {
      label: "Today's Sales",
      value: String(s.todaySales),
      sub:
        todayPendingCount > 0
          ? `${todayOrdersTotal} ordered today (${todayPendingCount} pending)`
          : `${todayOrdersTotal} ordered today · ${s.filteredSales} in range`,
      icon: ShoppingBag,
      tab: 'orders' as AdminNavTab,
    },
    {
      label: "Today's Revenue",
      value: formatInr(s.todayRevenue),
      sub:
        todayPendingAmt > 0
          ? `+ ${formatInr(todayPendingAmt)} pending approval today`
          : `${formatInr(s.totalRevenue)} lifetime verified`,
      icon: IndianRupee,
      tab: 'reports' as AdminNavTab,
    },
    {
      label: 'Total Orders',
      value: String(s.totalOrders),
      sub: `${s.verifiedOrders} verified · ${s.pendingOrders} pending`,
      icon: CheckCircle2,
      tab: 'orders' as AdminNavTab,
    },
    {
      label: 'Total Customers',
      value: String(s.totalCustomers),
      sub: `${s.activeDevices} active reading devices`,
      icon: Users,
      tab: 'customers' as AdminNavTab,
    },
    {
      label: 'Total Products',
      value: String(s.totalSubjects),
      sub: `${s.publishedSubjects} published on storefront`,
      icon: BookOpen,
      tab: 'products' as AdminNavTab,
    },
    {
      label: 'Active Offers',
      value: String(s.activeOffersCount),
      sub: `${s.rejectedOrders} rejected orders`,
      icon: Tag,
      tab: 'offers' as AdminNavTab,
    },
  ];

  const series = s.salesSeries || [];
  const maxRevenue = Math.max(1, ...series.map((d) => d.revenue));

  return (
    <div className="space-y-6">
      {/* Date Filter Bar */}
      <div className="liquid-glass-card rounded-2xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FFD34E]/20 border border-[#FFD34E]/40 text-[#FFD34E] flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Business Overview</h2>
            <p className="text-[11px] text-[#FFE7A3]/75">
              Live figures from database · IST timezone (Asia/Kolkata)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '7days', label: 'Last 7 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'all', label: 'All Time' },
              { id: 'custom', label: 'Custom' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChangeDateRange(opt.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                dateRange === opt.id
                  ? 'btn-gold-primary shadow-sm'
                  : 'bg-black/40 text-white/80 hover:text-white border border-white/15 hover:border-[#FFE7A3]/35'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {dateRange === 'custom' && (
          <div className="w-full flex flex-wrap items-center gap-2 pt-2 border-t border-white/15 text-xs">
            <label className="text-[#FFE7A3] font-semibold">From:</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => onChangeCustomDates(e.target.value, customEndDate)}
              className="px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/20 text-white text-xs [color-scheme:dark]"
            />
            <label className="text-[#FFE7A3] font-semibold">To:</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => onChangeCustomDates(customStartDate, e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/20 text-white text-xs [color-scheme:dark]"
            />
          </div>
        )}
      </div>

      {/* 6 Real KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              type="button"
              onClick={() => onNavigateTab(card.tab)}
              className="liquid-glass-card rounded-2xl p-4 flex flex-col justify-between text-left hover:border-[#FFD34E]/50 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2 w-full">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#FFE7A3]/80">
                  {card.label}
                </span>
                <div className="w-8 h-8 rounded-xl bg-[#FFD34E]/20 border border-[#FFD34E]/35 text-[#FFD34E] flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 w-full">
                <div className="text-2xl font-black text-white tabular-nums tracking-tight">
                  {card.value}
                </div>
                <div className="text-[11px] text-white/65 mt-1 truncate">{card.sub}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Pending Approvals Alert Bar */}
      {pendingOrders.length > 0 && (
        <div className="liquid-glass-master rounded-2xl border border-[#FFD34E]/45 overflow-hidden">
          <div className="px-4 sm:px-5 py-3 bg-[#970014]/60 border-b border-[#FFD34E]/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#FFD34E] animate-pulse" />
              <h3 className="text-xs sm:text-sm font-black text-[#FFE7A3]">
                Pending Payment Approvals ({pendingOrders.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('orders')}
              className="text-xs font-bold text-[#FFD34E] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Manage All Orders</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-white/10">
            {pendingOrders.slice(0, 4).map((ord) => (
              <div
                key={ord.orderId}
                className="px-4 sm:px-5 py-3 flex flex-wrap items-center justify-between gap-3 hover:bg-white/5 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-[#FFD34E]">{ord.orderId}</span>
                    <span className="text-xs font-semibold text-white truncate">
                      {ord.studentName}
                    </span>
                    <span className="text-xs text-white/65">({ord.studentMobile})</span>
                  </div>
                  <div className="text-[11px] text-white/70 mt-0.5">
                    Ref: <code className="font-mono text-[#FFE7A3]">{ord.paymentReference || 'Screenshot'}</code> ·{' '}
                    {ord.items?.length || 0} subjects ·{' '}
                    <span className="font-bold text-[#FFD34E]">{formatInr(ord.totalAmount)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectOrder(ord)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-white/10 hover:bg-white/20 cursor-pointer"
                  >
                    Inspect
                  </button>
                  <button
                    type="button"
                    onClick={() => onRejectOrderClick(ord)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-rose-200 bg-rose-950/70 hover:bg-rose-900 border border-rose-500/40 cursor-pointer flex items-center gap-1"
                  >
                    <XCircle className="w-3 h-3" />
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => onApproveOrder(ord.orderId)}
                    className="btn-gold-primary px-3 py-1.5 rounded-lg text-[11px] font-black cursor-pointer flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full-Width Verified Revenue Trend + Quick Shortcuts */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-8 liquid-glass-card rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Verified Revenue Trend</h3>
              <p className="text-[11px] text-white/65">
                Real daily verified collections for the selected window
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FFD34E]/20 text-[#FFE7A3] border border-[#FFD34E]/40 tabular-nums">
              Period Total: {formatInr(s.filteredRevenue)}
            </span>
          </div>

          {series.length > 0 ? (
            <div className="space-y-3">
              <div className="h-52 flex items-end gap-1.5 sm:gap-2 pt-4 pb-1 px-1 border-b border-white/15 overflow-x-auto">
                {series.map((pt) => {
                  const pct =
                    pt.revenue > 0 ? Math.max(8, Math.round((pt.revenue / maxRevenue) * 100)) : 3;
                  return (
                    <div
                      key={pt.date}
                      className="flex-1 min-w-[26px] flex flex-col items-center justify-end h-full group"
                      title={`${pt.label}: ${formatInr(pt.revenue)} (${pt.sales} sales)`}
                    >
                      <span className="text-[10px] font-bold text-[#FFD34E] tabular-nums opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                        {pt.revenue > 0 ? formatInr(pt.revenue) : ''}
                      </span>
                      <div
                        style={{ height: `${pct}%` }}
                        className={`w-full max-w-[38px] rounded-t-lg transition-all ${
                          pt.revenue > 0
                            ? 'bg-gradient-to-t from-[#E6B528] via-[#FFD34E] to-[#FFE7A3] shadow-[0_0_12px_rgba(255,211,78,0.25)]'
                            : 'bg-white/10'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between gap-1 text-[10px] text-[#FFE7A3]/65 font-medium overflow-x-auto">
                {series.map((pt) => (
                  <span key={pt.date} className="flex-1 min-w-[26px] text-center truncate">
                    {pt.label}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-xs text-white/50">
              No sales data in the selected window yet.
            </div>
          )}
        </div>

        {/* Clean Quick Management Shortcuts */}
        <div className="xl:col-span-4 liquid-glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white">Quick Management</h3>
            <p className="text-[11px] text-white/60 mt-0.5">
              Jump straight to any section to manage live website data
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2.5">
            {(
              [
                {
                  tab: 'orders' as AdminNavTab,
                  title: 'Orders & Sales',
                  sub: `${s.verifiedOrders} verified · ${s.pendingOrders} pending`,
                  icon: ShoppingBag,
                },
                {
                  tab: 'customers' as AdminNavTab,
                  title: 'Customer Directory',
                  sub: `${s.totalCustomers} registered / buyers`,
                  icon: Users,
                },
                {
                  tab: 'banners' as AdminNavTab,
                  title: 'Sliding Hero Banners',
                  sub: 'Update live homepage slides',
                  icon: ImageIcon,
                },
                {
                  tab: 'reports' as AdminNavTab,
                  title: 'Analytics & Reports',
                  sub: 'Subject & bundle performance',
                  icon: BarChart3,
                },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.tab}
                  type="button"
                  onClick={() => onNavigateTab(item.tab)}
                  className="w-full p-3 rounded-xl bg-black/35 hover:bg-white/10 border border-white/10 hover:border-[#FFD34E]/40 flex items-center justify-between gap-3 transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#FFD34E]/15 border border-[#FFD34E]/30 text-[#FFD34E] flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{item.title}</div>
                      <div className="text-[11px] text-white/60 truncate">{item.sub}</div>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#FFD34E] shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
