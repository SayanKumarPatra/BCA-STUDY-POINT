import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  ArrowUp,
  ArrowDown,
  Upload,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Globe,
  X,
  QrCode,
  Megaphone,
  Layout,
  Save,
} from 'lucide-react';
import type { BannerSlide, Product, SiteSettings } from '../../types';
import { api } from '../../services/api';
import { ConfirmModal } from './AdminModals';

// =========================================================================
// 1. BANNER / SLIDER MANAGEMENT VIEW
// =========================================================================

interface AdminBannersViewProps {
  banners: BannerSlide[];
  onRefresh: () => void;
  onNotify: (msg: string, isError?: boolean) => void;
}

export const AdminBannersView: React.FC<AdminBannersViewProps> = ({
  banners,
  onRefresh,
  onNotify,
}) => {
  const [editingBanner, setEditingBanner] = useState<Partial<BannerSlide> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BannerSlide | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const sorted = [...banners].sort((a, b) => (a.order || 0) - (b.order || 0));

  const openAddBanner = () => {
    setEditingBanner({
      title: 'New Promotional Banner',
      heading: '',
      subtitle: '',
      description: '',
      buttonText: 'Explore Packages',
      buttonLink: '#packages-pricing',
      imageUrl: '',
      alt: 'BCA Study Point Banner',
      active: true,
      order: sorted.length + 1,
    });
  };

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const res = await api.uploadAdminImage(file);
      if (res.imageUrl && editingBanner) {
        setEditingBanner({ ...editingBanner, imageUrl: res.imageUrl });
        onNotify('Banner image uploaded.');
      }
    } catch (err: any) {
      onNotify(err.message || 'Image upload failed', true);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner) return;
    if (!editingBanner.imageUrl?.trim()) {
      onNotify('Please upload or paste a Banner Image URL.', true);
      return;
    }

    setIsSaving(true);
    try {
      if (editingBanner.id) {
        await api.updateBanner(editingBanner.id, editingBanner);
        onNotify('Banner updated and published live.');
      } else {
        await api.createBanner(editingBanner);
        onNotify('New banner added and published live.');
      }
      setEditingBanner(null);
      onRefresh();
    } catch (err: any) {
      onNotify(err.message || 'Failed to save banner', true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMove = async (idx: number, dir: -1 | 1) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;
    const next = [...sorted];
    const [moved] = next.splice(idx, 1);
    next.splice(targetIdx, 0, moved);
    try {
      await api.reorderBanners(next.map((b) => b.id));
      onNotify('Banner order updated live.');
      onRefresh();
    } catch (err: any) {
      onNotify(err.message || 'Failed to reorder banners', true);
    }
  };

  const handleToggleActive = async (banner: BannerSlide) => {
    try {
      await api.updateBanner(banner.id, { active: banner.active === false });
      onNotify(`Banner "${banner.title}" ${banner.active === false ? 'activated' : 'hidden'}.`);
      onRefresh();
    } catch (err: any) {
      onNotify(err.message || 'Failed to toggle banner', true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.deleteBanner(deleteTarget.id);
      onNotify(`Banner "${deleteTarget.title}" removed.`);
      setDeleteTarget(null);
      onRefresh();
    } catch (err: any) {
      onNotify(err.message || 'Failed to delete banner', true);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="liquid-glass-card rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFD34E]/20 border border-[#FFD34E]/40 text-[#FFD34E] flex items-center justify-center">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              Homepage Banner / Slider Management ({sorted.length})
            </h2>
            <p className="text-xs text-white/65">
              Upload new slides, edit overlay text &amp; CTA buttons, reorder sequence, toggle active status, and publish straight to the homepage.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openAddBanner}
          className="btn-gold-primary inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Banner</span>
        </button>
      </div>

      {/* Banners List */}
      <div className="space-y-4">
        {sorted.map((banner, idx) => (
          <div
            key={banner.id}
            className={`liquid-glass-card rounded-2xl p-4 flex flex-col lg:flex-row gap-4 items-start lg:items-center transition-all ${
              banner.active === false ? 'opacity-60' : ''
            }`}
          >
            {/* Preview Thumbnail */}
            <div className="w-full lg:w-72 aspect-[3.2/1] rounded-xl overflow-hidden bg-black/70 border border-[#FFE7A3]/25 relative shrink-0">
              <img
                src={banner.imageUrl}
                alt={banner.alt || banner.title}
                className="w-full h-full object-cover"
              />
              {(banner.heading || banner.subtitle) && (
                <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent p-3 flex flex-col justify-end text-left">
                  {banner.subtitle && (
                    <span className="text-[9px] font-bold uppercase text-[#FFD34E]">
                      {banner.subtitle}
                    </span>
                  )}
                  {banner.heading && (
                    <span className="text-xs font-extrabold text-white line-clamp-1">
                      {banner.heading}
                    </span>
                  )}
                </div>
              )}
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/75 text-[#FFE7A3] border border-white/15">
                Slide #{idx + 1}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold text-white truncate">{banner.title}</h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    banner.active === false
                      ? 'bg-white/10 text-white/60'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                  }`}
                >
                  {banner.active === false ? 'Hidden' : 'Active Live'}
                </span>
              </div>
              {banner.heading && (
                <p className="text-xs font-semibold text-[#FFD34E]">Heading: {banner.heading}</p>
              )}
              {banner.description && (
                <p className="text-xs text-white/70 line-clamp-2">{banner.description}</p>
              )}
              <div className="text-[11px] text-white/45 font-mono truncate">
                {banner.buttonText ? `CTA: "${banner.buttonText}" → ${banner.buttonLink || '#'} · ` : ''}
                {banner.imageUrl}
              </div>
            </div>

            {/* Reorder + Action Controls */}
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              <button
                type="button"
                disabled={idx === 0}
                onClick={() => handleMove(idx, -1)}
                className="p-2 rounded-xl text-white bg-white/10 hover:bg-white/20 disabled:opacity-40 cursor-pointer"
                title="Move Up"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={idx === sorted.length - 1}
                onClick={() => handleMove(idx, 1)}
                className="p-2 rounded-xl text-white bg-white/10 hover:bg-white/20 disabled:opacity-40 cursor-pointer"
                title="Move Down"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleToggleActive(banner)}
                className="p-2 rounded-xl text-white bg-white/10 hover:bg-white/20 cursor-pointer"
                title={banner.active === false ? 'Activate Slide' : 'Hide Slide'}
              >
                {banner.active === false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setEditingBanner(banner)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-[#FFD34E] bg-[#FFD34E]/15 hover:bg-[#FFD34E]/25 border border-[#FFD34E]/35 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(banner)}
                className="p-2 rounded-xl text-rose-300 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/35 cursor-pointer"
                title="Delete Banner"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Banner Modal */}
      {editingBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="liquid-glass-master rounded-2xl max-w-xl w-full border border-[#FFE7A3]/35 shadow-2xl overflow-hidden text-left my-auto text-white">
            <div className="px-5 py-4 bg-gradient-to-r from-[#970014] to-[#3D0009] border-b border-[#FFE7A3]/25 text-white flex items-center justify-between">
              <h3 className="text-base font-extrabold">
                {editingBanner.id ? 'Edit Banner Slide' : 'Add New Banner Slide'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingBanner(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="p-5 space-y-3.5 max-h-[82vh] overflow-y-auto">
              {/* Live Slide Preview */}
              {editingBanner.imageUrl && (
                <div className="w-full aspect-[3.2/1] rounded-xl overflow-hidden bg-black border border-[#FFE7A3]/30 relative">
                  <img
                    src={editingBanner.imageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  {(editingBanner.heading || editingBanner.subtitle || editingBanner.buttonText) && (
                    <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-transparent p-4 flex flex-col justify-end text-left">
                      {editingBanner.subtitle && (
                        <span className="text-[10px] font-bold uppercase text-[#FFD34E]">
                          {editingBanner.subtitle}
                        </span>
                      )}
                      {editingBanner.heading && (
                        <h4 className="text-sm sm:text-base font-black text-white">
                          {editingBanner.heading}
                        </h4>
                      )}
                      {editingBanner.description && (
                        <p className="text-[11px] text-white/80 line-clamp-1">{editingBanner.description}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Admin Label / Title *</label>
                <input
                  type="text"
                  required
                  value={editingBanner.title || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-black/50 border border-white/20 text-white"
                />
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/15 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-[#FFE7A3]">Banner Image *</label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold text-[#3D0009] bg-[#FFD34E] hover:bg-[#FFE7A3] cursor-pointer">
                    <Upload className="w-3 h-3" />
                    <span>{isUploading ? 'Uploading...' : 'Upload Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleImageUpload(f);
                      }}
                    />
                  </label>
                </div>
                <input
                  type="text"
                  required
                  value={editingBanner.imageUrl || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, imageUrl: e.target.value })}
                  placeholder="/uploads/... or /assets/aistudio/... or https://..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/50 border border-white/20 text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">
                    Overlay Heading <span className="text-white/45 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={editingBanner.heading || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, heading: e.target.value })}
                    placeholder="Leave empty for full artwork"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-black/50 border border-white/20 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">
                    Overlay Subtitle / Badge
                  </label>
                  <input
                    type="text"
                    value={editingBanner.subtitle || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                    placeholder="e.g. Limited Offer"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-black/50 border border-white/20 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Overlay Description</label>
                <input
                  type="text"
                  value={editingBanner.description || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-black/50 border border-white/20 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Button Text</label>
                  <input
                    type="text"
                    value={editingBanner.buttonText || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, buttonText: e.target.value })}
                    placeholder="Explore Offer"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-black/50 border border-white/20 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Button Link / Anchor</label>
                  <input
                    type="text"
                    value={editingBanner.buttonLink || ''}
                    onChange={(e) => setEditingBanner({ ...editingBanner, buttonLink: e.target.value })}
                    placeholder="#packages-pricing"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-black/50 border border-white/20 text-white"
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-semibold text-white cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={editingBanner.active !== false}
                  onChange={(e) => setEditingBanner({ ...editingBanner, active: e.target.checked })}
                  className="accent-[#FFD34E]"
                />
                <span>Active on Homepage Slider</span>
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => setEditingBanner(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/20 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-gold-primary px-5 py-2 rounded-xl text-xs font-black cursor-pointer disabled:opacity-60"
                >
                  {isSaving ? 'Publishing...' : 'Publish Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Banner Slide"
        description={`Remove "${deleteTarget?.title}" from the homepage slider?`}
        confirmLabel="Delete Banner"
        isProcessing={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

// =========================================================================
// 2. WEBSITE MANAGEMENT VIEW
// =========================================================================

interface AdminWebsiteViewProps {
  siteSettings: SiteSettings | null;
  products: Product[];
  onRefresh: () => void;
  onNotify: (msg: string, isError?: boolean) => void;
}

export const AdminWebsiteView: React.FC<AdminWebsiteViewProps> = ({
  siteSettings,
  products,
  onRefresh,
  onNotify,
}) => {
  const [form, setForm] = useState<SiteSettings>({
    tagline: siteSettings?.tagline || 'Learn Smart. Score High.',
    announcement: siteSettings?.announcement || {
      enabled: false,
      text: '',
      link: '#packages-pricing',
    },
    homepage: siteSettings?.homepage || {
      sectionBadge: 'BCA 3rd Semester · Solved Question Banks',
      sectionTitle: 'Package Selection & Pricing',
      editionLabel: '2024-2025 Edition',
      compulsoryNotice: 'Students must select all 4 compulsory subjects.',
      optionalNotice:
        '2 additional optional sections are available. Students can choose them according to their preference.',
      howItWorksTitle: 'How It Works',
      featuredProductIds: [],
    },
    payment: siteSettings?.payment || {
      upiId: 'BHARATPE2D0I0H4R5P81095@unitype',
      qrCodeUrl: '/assets/aistudio/WhatsApp_Image_2026-11-10_at_7.58.34_PM_43197c9f.jpeg',
      primaryPhone: '8145775413',
      whatsappPhone: '8145775413',
    },
    updatedAt: siteSettings?.updatedAt || new Date().toISOString(),
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingQr, setIsUploadingQr] = useState(false);

  useEffect(() => {
    if (siteSettings) {
      setForm(siteSettings);
    }
  }, [siteSettings]);

  const handleUploadQr = async (file: File) => {
    setIsUploadingQr(true);
    try {
      const res = await api.uploadAdminImage(file);
      if (res.imageUrl) {
        setForm((prev) => ({
          ...prev,
          payment: { ...prev.payment, qrCodeUrl: res.imageUrl },
        }));
        onNotify('UPI QR Code uploaded.');
      }
    } catch (err: any) {
      onNotify(err.message || 'QR upload failed', true);
    } finally {
      setIsUploadingQr(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateSiteSettings(form);
      onNotify('Website settings saved and pushed live.');
      onRefresh();
    } catch (err: any) {
      onNotify(err.message || 'Failed to save website settings', true);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFeatured = (prodId: string) => {
    const current = form.homepage.featuredProductIds || [];
    const next = current.includes(prodId) ? current.filter((x) => x !== prodId) : [...current, prodId];
    setForm((prev) => ({
      ...prev,
      homepage: { ...prev.homepage, featuredProductIds: next },
    }));
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="liquid-glass-card rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFD34E]/20 border border-[#FFD34E]/40 text-[#FFD34E] flex items-center justify-center">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white">Website Management</h2>
            <p className="text-xs text-white/65">
              Update live announcement bar, homepage notices &amp; labels, UPI payment details, and support contacts.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="btn-gold-primary inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-black shadow-sm cursor-pointer disabled:opacity-60"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'Saving...' : 'Save Website Settings'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top Announcement Bar */}
        <div className="liquid-glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#FFD34E]" />
              <h3 className="text-sm font-bold text-white">Top Announcement Bar</h3>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-bold text-[#FFE7A3] cursor-pointer">
              <input
                type="checkbox"
                checked={form.announcement.enabled}
                onChange={(e) =>
                  setForm({
                    ...form,
                    announcement: { ...form.announcement, enabled: e.target.checked },
                  })
                }
                className="accent-[#FFD34E]"
              />
              <span>Show Bar</span>
            </label>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Announcement Text</label>
            <input
              type="text"
              value={form.announcement.text}
              onChange={(e) =>
                setForm({ ...form, announcement: { ...form.announcement, text: e.target.value } })
              }
              placeholder="🔥 Exam Season Offer: Complete 3rd Sem Package only ₹99!"
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/45 border border-white/20 text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Link / Anchor Target</label>
            <input
              type="text"
              value={form.announcement.link}
              onChange={(e) =>
                setForm({ ...form, announcement: { ...form.announcement, link: e.target.value } })
              }
              placeholder="#packages-pricing"
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/45 border border-white/20 text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Navbar Brand Tagline</label>
            <input
              type="text"
              value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/45 border border-white/20 text-white"
            />
          </div>
        </div>

        {/* UPI Payment & Support Contact Settings */}
        <div className="liquid-glass-card rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-[#FFD34E]" />
            <h3 className="text-sm font-bold text-white">Checkout UPI &amp; Support Details</h3>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Official UPI ID</label>
            <input
              type="text"
              value={form.payment.upiId}
              onChange={(e) =>
                setForm({ ...form, payment: { ...form.payment, upiId: e.target.value } })
              }
              className="w-full px-3 py-2 text-xs font-mono rounded-xl bg-black/45 border border-white/20 text-[#FFD34E]"
            />
          </div>

          <div className="flex items-center gap-3">
            {form.payment.qrCodeUrl && (
              <img
                src={form.payment.qrCodeUrl}
                alt="UPI QR"
                className="w-16 h-16 rounded-xl border border-white/20 object-contain p-1 bg-white shrink-0"
              />
            )}
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#FFE7A3]">UPI QR Code Image</label>
                <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-[#3D0009] bg-[#FFD34E] hover:bg-[#FFE7A3] cursor-pointer">
                  <Upload className="w-3 h-3" />
                  <span>{isUploadingQr ? 'Uploading...' : 'Upload QR'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadQr(f);
                    }}
                  />
                </label>
              </div>
              <input
                type="text"
                value={form.payment.qrCodeUrl}
                onChange={(e) =>
                  setForm({ ...form, payment: { ...form.payment, qrCodeUrl: e.target.value } })
                }
                className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/45 border border-white/20 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Primary Contact Phone</label>
              <input
                type="text"
                value={form.payment.primaryPhone}
                onChange={(e) =>
                  setForm({ ...form, payment: { ...form.payment, primaryPhone: e.target.value } })
                }
                className="w-full px-3 py-2 text-xs rounded-xl bg-black/45 border border-white/20 text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Official WhatsApp Phone</label>
              <input
                type="text"
                value={form.payment.whatsappPhone}
                onChange={(e) =>
                  setForm({ ...form, payment: { ...form.payment, whatsappPhone: e.target.value } })
                }
                className="w-full px-3 py-2 text-xs rounded-xl bg-black/45 border border-white/20 text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Homepage Promotional Labels & Notices */}
      <div className="liquid-glass-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Layout className="w-4 h-4 text-[#FFD34E]" />
          <h3 className="text-sm font-bold text-white">Homepage Package Labels & Notices</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Section Badge</label>
            <input
              type="text"
              value={form.homepage.sectionBadge}
              onChange={(e) =>
                setForm({ ...form, homepage: { ...form.homepage, sectionBadge: e.target.value } })
              }
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/45 border border-white/20 text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Section Heading</label>
            <input
              type="text"
              value={form.homepage.sectionTitle}
              onChange={(e) =>
                setForm({ ...form, homepage: { ...form.homepage, sectionTitle: e.target.value } })
              }
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/45 border border-white/20 text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Edition Pill Label</label>
            <input
              type="text"
              value={form.homepage.editionLabel}
              onChange={(e) =>
                setForm({ ...form, homepage: { ...form.homepage, editionLabel: e.target.value } })
              }
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/45 border border-white/20 text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Compulsory Notice</label>
            <input
              type="text"
              value={form.homepage.compulsoryNotice}
              onChange={(e) =>
                setForm({
                  ...form,
                  homepage: { ...form.homepage, compulsoryNotice: e.target.value },
                })
              }
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/45 border border-white/20 text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Optional Section Notice</label>
            <input
              type="text"
              value={form.homepage.optionalNotice}
              onChange={(e) =>
                setForm({
                  ...form,
                  homepage: { ...form.homepage, optionalNotice: e.target.value },
                })
              }
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/45 border border-white/20 text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1.5">
            Featured Products ({form.homepage.featuredProductIds?.length || 0} selected)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {products.map((p) => {
              const active = (form.homepage.featuredProductIds || []).includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleFeatured(p.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-colors max-w-full truncate ${
                    active
                      ? 'btn-gold-primary border-[#FFD34E]'
                      : 'bg-black/40 text-white/75 border-white/15 hover:bg-black/60'
                  }`}
                >
                  {p.subjectCode} · {p.subjectName}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </form>
  );
};
