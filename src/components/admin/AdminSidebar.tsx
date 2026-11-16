import React from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  BookOpen,
  Package,
  Tag,
  Image as ImageIcon,
  Globe,
  BarChart3,
  Settings,
  LogOut,
  ArrowLeft,
  X,
} from 'lucide-react';
import { BRAND } from '../../constants/brand';
import type { AdminNavTab } from './adminTypes';

interface AdminSidebarProps {
  activeTab: AdminNavTab;
  onSelectTab: (tab: AdminNavTab) => void;
  pendingOrdersCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onExitToStorefront: () => void;
  onLogout: () => void;
}

interface NavGroup {
  label?: string;
  items: Array<{
    id: AdminNavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }>;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  onSelectTab,
  pendingOrdersCount,
  mobileOpen,
  onCloseMobile,
  onExitToStorefront,
  onLogout,
}) => {
  const navGroups: NavGroup[] = [
    {
      items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }],
    },
    {
      label: 'Business',
      items: [
        { id: 'orders', label: 'Orders / Sales', icon: ShoppingBag, badge: pendingOrdersCount },
        { id: 'customers', label: 'Customers', icon: Users },
      ],
    },
    {
      label: 'Products',
      items: [
        { id: 'products', label: 'Products (PDF)', icon: BookOpen },
        { id: 'packages', label: 'Package Management', icon: Package },
        { id: 'offers', label: 'Pricing & Offers', icon: Tag },
      ],
    },
    {
      label: 'Website',
      items: [
        { id: 'banners', label: 'Banner / Slider Management', icon: ImageIcon },
        { id: 'website', label: 'Website Management', icon: Globe },
      ],
    },
    {
      label: 'System',
      items: [
        { id: 'reports', label: 'Reports', icon: BarChart3 },
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  const renderContent = (isMobileDrawer = false) => (
    <div className="flex flex-col h-full bg-[#3D0009]/95 backdrop-blur-xl border-r border-[#FFE7A3]/20 select-none text-white">
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-[#FFE7A3]/20 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={BRAND.logoUrl}
            alt="BCA Study Point"
            className="w-9 h-9 rounded-full object-cover ring-2 ring-[#FFD34E]/70 shadow-xs shrink-0"
          />
          <div className="min-w-0">
            <span className="block font-black text-sm text-white tracking-tight truncate">
              BCA STUDY POINT
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#FFD34E] bg-black/40 px-1.5 py-0.2 rounded-md border border-[#FFE7A3]/25">
              Admin Workspace
            </span>
          </div>
        </div>
        {isMobileDrawer && (
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer"
            aria-label="Close Navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {group.label && (
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#FFE7A3]/55">
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    if (isMobileDrawer) onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-left ${
                    isActive
                      ? 'btn-gold-primary shadow-md'
                      : 'text-white/80 hover:text-[#FFE7A3] hover:bg-white/10 border border-transparent hover:border-[#FFE7A3]/20'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-[#3D0009]' : 'text-[#FFD34E]/80'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </span>

                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black tabular-nums shrink-0 ${
                        isActive
                          ? 'bg-[#3D0009] text-[#FFD34E]'
                          : 'bg-amber-500/20 text-amber-200 border border-amber-400/40'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer Quick Actions */}
      <div className="p-3 border-t border-[#FFE7A3]/20 space-y-1.5 shrink-0 bg-black/30">
        <button
          type="button"
          onClick={onExitToStorefront}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-[#FFE7A3] hover:bg-white/10 border border-transparent hover:border-[#FFE7A3]/25 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#FFD34E]" />
          <span>Public Website</span>
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:bg-rose-950/60 border border-transparent hover:border-rose-500/40 transition-all cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Admin Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:block w-56 xl:w-64 shrink-0 sticky top-0 h-screen">
        {renderContent(false)}
      </aside>

      {/* Mobile / Tablet Slide-over Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10">
            {renderContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
