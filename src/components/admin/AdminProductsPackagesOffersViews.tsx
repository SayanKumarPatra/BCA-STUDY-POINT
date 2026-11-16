import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  RefreshCw,
  Upload,
  FileText,
  CheckCircle2,
  X,
  Package,
  Tag,
  Clock,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import type {
  Product,
  Semester,
  PackageDefinition,
  OfferConfig,
  EffectivePackagePricing,
} from '../../types';
import { api } from '../../services/api';
import { formatDateIST, formatInr, PRESET_BOOK_COVERS } from './adminTypes';
import { ConfirmModal } from './AdminModals';

// =========================================================================
// 1. PRODUCTS (PDF) MANAGEMENT VIEW
// =========================================================================

interface AdminProductsViewProps {
  products: Product[];
  semesters: Semester[];
  onRefresh: () => void;
  onSyncAllToFirebase: () => void;
  onNotify: (msg: string, isError?: boolean) => void;
}

export const AdminProductsView: React.FC<AdminProductsViewProps> = ({
  products,
  semesters,
  onRefresh,
  onSyncAllToFirebase,
  onNotify,
}) => {
  const [search, setSearch] = useState('');
  const [paperFilter, setPaperFilter] = useState<'all' | 'core' | 'specialization'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  // Form State
  const [semesterId, setSemesterId] = useState(semesters[0]?.id || 'sem-3');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(20);
  const [originalPrice, setOriginalPrice] = useState<number>(59);
  const [paperType, setPaperType] = useState<'core' | 'specialization'>('core');
  const [specialization, setSpecialization] = useState<string>('Core');
  const [examYear, setExamYear] = useState('2024-2025 Edition');
  const [pageCount, setPageCount] = useState<number>(30);
  const [highlights, setHighlights] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [published, setPublished] = useState(true);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (paperFilter !== 'all' && p.paperType !== paperFilter) return false;
      if (!q) return true;
      return (
        (p.subjectName || '').toLowerCase().includes(q) ||
        (p.subjectCode || '').toLowerCase().includes(q) ||
        (p.specialization || '').toLowerCase().includes(q)
      );
    });
  }, [products, search, paperFilter]);

  const openAddModal = () => {
    setEditingProduct(null);
    setSemesterId(semesters[0]?.id || 'sem-3');
    setSubjectCode('');
    setSubjectName('');
    setDescription('');
    setPrice(20);
    setOriginalPrice(59);
    setPaperType('core');
    setSpecialization('Core');
    setExamYear('2024-2025 Edition');
    setPageCount(30);
    setHighlights('');
    setCoverImageUrl(PRESET_BOOK_COVERS[0].url);
    setPublished(true);
    setPdfFile(null);
    setModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setSemesterId(p.semesterId || 'sem-3');
    setSubjectCode(p.subjectCode);
    setSubjectName(p.subjectName);
    setDescription(p.description || '');
    setPrice(Number(p.price ?? 20));
    setOriginalPrice(Number(p.originalPrice ?? Math.round((p.price || 20) * 2)));
    setPaperType(p.paperType || 'core');
    setSpecialization(p.specialization || (p.paperType === 'core' ? 'Core' : 'Specialization'));
    setExamYear(p.examYear || '2024-2025 Edition');
    setPageCount(Number(p.pageCount) || 30);
    setHighlights((p.syllabusHighlights || []).join(', '));
    setCoverImageUrl(p.coverImageUrl || p.imageUrl || '');
    setPublished(p.published !== false);
    setPdfFile(null);
    setModalOpen(true);
  };

  const handleCoverImageUpload = async (file: File) => {
    setIsUploadingImage(true);
    try {
      const res = await api.uploadAdminImage(file);
      if (res.imageUrl) {
        setCoverImageUrl(res.imageUrl);
        onNotify('Cover image uploaded successfully.');
      }
    } catch (err: any) {
      onNotify(err.message || 'Image upload failed', true);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('semesterId', semesterId);
      formData.append('subjectCode', subjectCode.trim());
      formData.append('subjectName', subjectName.trim());
      formData.append('description', description.trim());
      formData.append('price', String(Number(price)));
      formData.append('originalPrice', String(Number(originalPrice)));
      formData.append('paperType', paperType);
      formData.append('specialization', specialization.trim());
      formData.append('examYear', examYear.trim());
      formData.append('pageCount', String(Number(pageCount) || 30));
      formData.append('syllabusHighlights', highlights);
      formData.append('coverImageUrl', coverImageUrl.trim());
      formData.append('published', String(published));
      if (pdfFile) {
        formData.append('pdfFile', pdfFile);
      }

      if (editingProduct) {
        await api.updateProductWithPdf(editingProduct.id, formData);
        onNotify(`Updated "${subjectName.trim()}" and synced live.`);
      } else {
        await api.createProductWithPdf(formData);
        onNotify(`Created "${subjectName.trim()}" and synced live.`);
      }

      setModalOpen(false);
      onRefresh();
    } catch (err: any) {
      onNotify(err.message || 'Failed to save product', true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickTogglePublish = async (p: Product) => {
    try {
      await api.updateProduct(p.id, { published: p.published === false });
      onNotify(`${p.subjectCode} ${p.published === false ? 'activated' : 'deactivated'}.`);
      onRefresh();
    } catch (err: any) {
      onNotify(err.message || 'Failed to update product status', true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.deleteProduct(deleteTarget.id);
      onNotify(`Deleted "${deleteTarget.subjectName}".`);
      setDeleteTarget(null);
      onRefresh();
    } catch (err: any) {
      onNotify(err.message || 'Failed to delete product', true);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="liquid-glass-card rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              Products & PDF Catalog ({products.length})
            </h2>
            <p className="text-xs text-white/65">
              Upload new PDFs, replace files, edit prices & regular MRP, update covers, and toggle visibility live.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onSyncAllToFirebase}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#FFE7A3] bg-black/40 hover:bg-black/60 border border-[#FFE7A3]/30 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync RTDB</span>
            </button>
            <button
              type="button"
              onClick={openAddModal}
              className="btn-gold-primary inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add PDF Product</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: 'all', label: `All (${products.length})` },
                { id: 'core', label: `Core (${products.filter((p) => p.paperType === 'core').length})` },
                {
                  id: 'specialization',
                  label: `Optional / Spec (${products.filter((p) => p.paperType !== 'core').length})`,
                },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setPaperFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                  paperFilter === f.id
                    ? 'btn-gold-primary'
                    : 'bg-black/40 text-white/80 hover:text-white border border-white/15'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative sm:w-72">
            <Search className="w-3.5 h-3.5 text-[#FFE7A3]/60 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code, subject name..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-black/45 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#FFD34E]"
            />
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <div
            key={p.id}
            className={`liquid-glass-card rounded-2xl p-4 flex flex-col justify-between gap-3 transition-all ${
              p.published === false ? 'opacity-65' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-16 h-20 rounded-xl overflow-hidden bg-black/50 border border-white/15 shrink-0 flex items-center justify-center">
                {p.coverImageUrl || p.imageUrl ? (
                  <img
                    src={p.coverImageUrl || p.imageUrl}
                    alt={p.subjectName}
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <FileText className="w-6 h-6 text-[#FFE7A3]/50" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#FFD34E]/20 text-[#FFD34E] border border-[#FFD34E]/35">
                    {p.subjectCode}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-black/45 text-[#FFE7A3] border border-white/15 capitalize">
                    {p.specialization || p.paperType || 'core'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      p.published === false
                        ? 'bg-white/10 text-white/60'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/35'
                    }`}
                  >
                    {p.published === false ? 'Hidden' : 'Live'}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">
                  {p.subjectName}
                </h3>
                <p className="text-[11px] text-white/65 mt-1 line-clamp-2">{p.description}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-black text-[#FFD34E] tabular-nums">
                    {formatInr(p.price)}
                  </span>
                  {p.originalPrice && p.originalPrice > p.price && (
                    <span className="text-xs text-white/45 line-through tabular-nums">
                      {formatInr(p.originalPrice)}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-white/50 truncate max-w-[160px]" title={p.privateStoragePath}>
                  {p.pageCount || 30} pages · {p.privateStoragePath ? p.privateStoragePath.split('/').pop() : 'PDF ready'}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleQuickTogglePublish(p)}
                  className="p-2 rounded-xl text-white bg-white/10 hover:bg-white/20 cursor-pointer"
                  title={p.published === false ? 'Activate Product' : 'Deactivate Product'}
                >
                  {p.published === false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => openEditModal(p)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-[#FFD34E] bg-[#FFD34E]/15 hover:bg-[#FFD34E]/25 border border-[#FFD34E]/35 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(p)}
                  className="p-2 rounded-xl text-rose-300 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/35 cursor-pointer"
                  title="Delete Product"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="liquid-glass-master rounded-2xl max-w-2xl w-full border border-[#FFE7A3]/35 shadow-2xl overflow-hidden text-left my-auto text-white">
            <div className="px-5 py-4 bg-gradient-to-r from-[#970014] to-[#3D0009] border-b border-[#FFE7A3]/25 text-white flex items-center justify-between">
              <h3 className="text-base font-extrabold">
                {editingProduct ? `Edit Product — ${editingProduct.subjectCode}` : 'Add New PDF Product'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Semester</label>
                  <select
                    value={semesterId}
                    onChange={(e) => setSemesterId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-black/50 border border-white/20 text-white [color-scheme:dark]"
                  >
                    {semesters.map((s) => (
                      <option key={s.id} value={s.id} className="bg-[#240005]">
                        Sem {s.semesterNumber} — {s.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Subject Code *</label>
                  <input
                    type="text"
                    required
                    value={subjectCode}
                    onChange={(e) => setSubjectCode(e.target.value)}
                    placeholder="BCA-301"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-black/50 border border-white/20 text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Paper Group</label>
                  <select
                    value={paperType}
                    onChange={(e) => {
                      const val = e.target.value as 'core' | 'specialization';
                      setPaperType(val);
                      if (val === 'core') setSpecialization('Core');
                      else if (specialization === 'Core') setSpecialization('Elective');
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-black/50 border border-white/20 text-white [color-scheme:dark]"
                  >
                    <option value="core" className="bg-[#240005]">Core Subject</option>
                    <option value="specialization" className="bg-[#240005]">Optional / Specialization</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Subject Name *</label>
                  <input
                    type="text"
                    required
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="Data Structures & Algorithms"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-black/50 border border-white/20 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Specialization Label</label>
                  <input
                    type="text"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="Core / Language / AI & ML..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-black/50 border border-white/20 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-black/50 border border-white/20 text-[#FFD34E]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Regular Price (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-black/50 border border-white/20 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Page Count</label>
                  <input
                    type="number"
                    min={1}
                    value={pageCount}
                    onChange={(e) => setPageCount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-black/50 border border-white/20 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Status</label>
                  <select
                    value={published ? 'published' : 'hidden'}
                    onChange={(e) => setPublished(e.target.value === 'published')}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-black/50 border border-white/20 text-white [color-scheme:dark]"
                  >
                    <option value="published" className="bg-[#240005]">Published (Live)</option>
                    <option value="hidden" className="bg-[#240005]">Draft / Hidden</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Unit-wise solved question bank summary..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-black/50 border border-white/20 text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Edition / Exam Year</label>
                  <input
                    type="text"
                    value={examYear}
                    onChange={(e) => setExamYear(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-black/50 border border-white/20 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Syllabus Highlights (comma separated)</label>
                  <input
                    type="text"
                    value={highlights}
                    onChange={(e) => setHighlights(e.target.value)}
                    placeholder="Arrays & Linked Lists, Trees & Graphs"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-black/50 border border-white/20 text-white"
                  />
                </div>
              </div>

              {/* Cover Image Upload / URL / Presets */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/15 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-[11px] font-bold text-[#FFE7A3]">Cover Thumbnail Image</label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-[#3D0009] bg-[#FFD34E] hover:bg-[#FFE7A3] cursor-pointer">
                    <Upload className="w-3 h-3" />
                    <span>{isUploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleCoverImageUpload(f);
                      }}
                    />
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  {coverImageUrl && (
                    <img
                      src={coverImageUrl}
                      alt="Cover Preview"
                      className="w-12 h-16 rounded-lg object-contain bg-black/60 border border-white/20 p-0.5 shrink-0"
                    />
                  )}
                  <div className="flex-1 space-y-1.5">
                    <input
                      type="text"
                      value={coverImageUrl}
                      onChange={(e) => setCoverImageUrl(e.target.value)}
                      placeholder="/uploads/... or /assets/aistudio/... or https://..."
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-black/50 border border-white/20 text-white"
                    />
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) setCoverImageUrl(e.target.value);
                      }}
                      className="w-full px-2.5 py-1.5 text-[11px] rounded-lg bg-black/50 border border-white/20 text-white [color-scheme:dark]"
                    >
                      <option value="" className="bg-[#240005]">Or pick an existing 3D textbook cover preset...</option>
                      {PRESET_BOOK_COVERS.map((c) => (
                        <option key={c.url} value={c.url} className="bg-[#240005]">
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* PDF Upload / Replace */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-[#FFD34E]/35 space-y-2">
                <label className="block text-[11px] font-bold text-[#FFD34E]">
                  {editingProduct ? 'Replace PDF File (Optional — keeps existing PDF if empty)' : 'Upload Question Bank PDF *'}
                </label>
                {editingProduct?.privateStoragePath && (
                  <p className="text-[11px] text-white/65 font-mono">
                    Current file: {editingProduct.privateStoragePath}
                  </p>
                )}
                <input
                  type="file"
                  accept="application/pdf"
                  required={!editingProduct}
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-white/80 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#FFD34E] file:text-[#3D0009] hover:file:bg-[#FFE7A3] cursor-pointer"
                />
                {pdfFile && (
                  <p className="text-[11px] font-semibold text-emerald-300">
                    Selected: {pdfFile.name} ({Math.round(pdfFile.size / 1024)} KB)
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/20 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-gold-primary px-5 py-2 rounded-xl text-xs font-black cursor-pointer disabled:opacity-60"
                >
                  {isSaving ? 'Saving & Syncing...' : editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete PDF Product"
        description={`Are you sure you want to delete "${deleteTarget?.subjectName}" (${deleteTarget?.subjectCode})? Students who already bought past orders retain order history, but this product will be removed from the catalog.`}
        confirmLabel="Delete Product"
        isProcessing={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

// =========================================================================
// 2. PACKAGE MANAGEMENT VIEW
// =========================================================================

interface AdminPackagesViewProps {
  products: Product[];
  packages: PackageDefinition[];
  effectivePricing: EffectivePackagePricing | null;
  onRefresh: () => void;
  onNotify: (msg: string, isError?: boolean) => void;
}

export const AdminPackagesView: React.FC<AdminPackagesViewProps> = ({
  products,
  packages,
  effectivePricing,
  onRefresh,
  onNotify,
}) => {
  const activePkg = packages[0] || null;
  const [name, setName] = useState(activePkg?.name || 'BCA 3rd Semester Complete Study Package');
  const [description, setDescription] = useState(activePkg?.description || '');
  const [active, setActive] = useState(activePkg?.active !== false);
  const [compulsoryIds, setCompulsoryIds] = useState<string[]>(activePkg?.compulsoryProductIds || []);
  const [languageIds, setLanguageIds] = useState<string[]>(activePkg?.languageProductIds || []);
  const [specIds, setSpecIds] = useState<string[]>(activePkg?.specializationProductIds || []);

  const [coreReg, setCoreReg] = useState<number>(activePkg?.coreRegularPrice ?? 99);
  const [coreOffer, setCoreOffer] = useState<number>(activePkg?.coreOfferPrice ?? 69);
  const [langReg, setLangReg] = useState<number>(activePkg?.languageRegularPrice ?? 25);
  const [langOffer, setLangOffer] = useState<number>(activePkg?.languageOfferPrice ?? 10);
  const [specReg, setSpecReg] = useState<number>(activePkg?.specializationRegularPrice ?? 25);
  const [specOffer, setSpecOffer] = useState<number>(activePkg?.specializationOfferPrice ?? 20);
  const [fullReg, setFullReg] = useState<number>(activePkg?.fullPackageRegularPrice ?? 149);
  const [fullOffer, setFullOffer] = useState<number>(activePkg?.fullPackageOfferPrice ?? 99);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (packages[0]) {
      const p = packages[0];
      setName(p.name);
      setDescription(p.description);
      setActive(p.active !== false);
      setCompulsoryIds(p.compulsoryProductIds || []);
      setLanguageIds(p.languageProductIds || []);
      setSpecIds(p.specializationProductIds || []);
      setCoreReg(p.coreRegularPrice);
      setCoreOffer(p.coreOfferPrice);
      setLangReg(p.languageRegularPrice);
      setLangOffer(p.languageOfferPrice);
      setSpecReg(p.specializationRegularPrice);
      setSpecOffer(p.specializationOfferPrice);
      setFullReg(p.fullPackageRegularPrice);
      setFullOffer(p.fullPackageOfferPrice);
    }
  }, [packages]);

  const toggleProductInGroup = (group: 'core' | 'lang' | 'spec', productId: string) => {
    const toggle = (list: string[]) =>
      list.includes(productId) ? list.filter((x) => x !== productId) : [...list, productId];
    if (group === 'core') {
      setCompulsoryIds(toggle(compulsoryIds));
      setLanguageIds((prev) => prev.filter((x) => x !== productId));
      setSpecIds((prev) => prev.filter((x) => x !== productId));
    } else if (group === 'lang') {
      setLanguageIds(toggle(languageIds));
      setCompulsoryIds((prev) => prev.filter((x) => x !== productId));
      setSpecIds((prev) => prev.filter((x) => x !== productId));
    } else {
      setSpecIds(toggle(specIds));
      setCompulsoryIds((prev) => prev.filter((x) => x !== productId));
      setLanguageIds((prev) => prev.filter((x) => x !== productId));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.savePackage({
        id: activePkg?.id || 'pkg-bca-sem3-bundle',
        name: name.trim(),
        description: description.trim(),
        active,
        compulsoryProductIds: compulsoryIds,
        languageProductIds: languageIds,
        specializationProductIds: specIds,
        coreRegularPrice: Number(coreReg),
        coreOfferPrice: Number(coreOffer),
        languageRegularPrice: Number(langReg),
        languageOfferPrice: Number(langOffer),
        specializationRegularPrice: Number(specReg),
        specializationOfferPrice: Number(specOffer),
        fullPackageRegularPrice: Number(fullReg),
        fullPackageOfferPrice: Number(fullOffer),
      });
      onNotify('Package configuration saved and synced live to storefront.');
      onRefresh();
    } catch (err: any) {
      onNotify(err.message || 'Failed to save package', true);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="liquid-glass-card rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFD34E]/20 border border-[#FFD34E]/40 text-[#FFD34E] flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white">Package Management</h2>
            <p className="text-xs text-white/65">
              Configure package structure, subject tiers, regular prices & offer prices. Past verified orders stay unchanged.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="btn-gold-primary px-5 py-2.5 rounded-xl text-xs font-black shadow-sm cursor-pointer disabled:opacity-60"
        >
          {isSaving ? 'Saving...' : 'Save & Publish Package'}
        </button>
      </div>

      {/* Metadata + Active Status */}
      <div className="liquid-glass-card rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-white">Package Details & Tier Pricing</h3>
          <label className="inline-flex items-center gap-2 text-xs font-bold text-[#FFE7A3] cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-4 h-4 accent-[#FFD34E]"
            />
            <span>Package Active on Storefront</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Package Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/45 border border-white/20 text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/45 border border-white/20 text-white"
            />
          </div>
        </div>

        {/* Tier Prices Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-xl bg-black/40 border border-white/15 space-y-2">
            <span className="text-[11px] font-bold text-[#FFE7A3] block">Compulsory Core</span>
            <div>
              <label className="text-[10px] text-white/60 block">Offer Price (₹)</label>
              <input
                type="number"
                value={coreOffer}
                onChange={(e) => setCoreOffer(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg bg-black/50 border border-white/20 text-[#FFD34E]"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/60 block">Regular Price (₹)</label>
              <input
                type="number"
                value={coreReg}
                onChange={(e) => setCoreReg(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-black/50 border border-white/20 text-white"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/15 space-y-2">
            <span className="text-[11px] font-bold text-[#FFE7A3] block">Optional Language Add-on</span>
            <div>
              <label className="text-[10px] text-white/60 block">Offer Price (₹)</label>
              <input
                type="number"
                value={langOffer}
                onChange={(e) => setLangOffer(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg bg-black/50 border border-white/20 text-[#FFD34E]"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/60 block">Regular Price (₹)</label>
              <input
                type="number"
                value={langReg}
                onChange={(e) => setLangReg(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-black/50 border border-white/20 text-white"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-white/15 space-y-2">
            <span className="text-[11px] font-bold text-[#FFE7A3] block">Optional Specialization</span>
            <div>
              <label className="text-[10px] text-white/60 block">Offer Price (₹)</label>
              <input
                type="number"
                value={specOffer}
                onChange={(e) => setSpecOffer(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg bg-black/50 border border-white/20 text-[#FFD34E]"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/60 block">Regular Price (₹)</label>
              <input
                type="number"
                value={specReg}
                onChange={(e) => setSpecReg(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-black/50 border border-white/20 text-white"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#970014]/45 border border-[#FFD34E]/45 space-y-2">
            <span className="text-[11px] font-bold text-[#FFD34E] block">Full Package Bundle</span>
            <div>
              <label className="text-[10px] text-[#FFE7A3]/80 block">Offer Price (₹)</label>
              <input
                type="number"
                value={fullOffer}
                onChange={(e) => setFullOffer(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs font-black rounded-lg bg-black/50 border border-[#FFD34E]/40 text-[#FFD34E]"
              />
            </div>
            <div>
              <label className="text-[10px] text-[#FFE7A3]/80 block">Regular Price (₹)</label>
              <input
                type="number"
                value={fullReg}
                onChange={(e) => setFullReg(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-black/50 border border-white/20 text-white"
              />
            </div>
          </div>
        </div>

        {effectivePricing && (
          <div className="p-3 rounded-xl bg-black/40 border border-[#FFD34E]/35 text-xs text-[#FFE7A3] flex flex-wrap items-center justify-between gap-2">
            <span>
              Currently active storefront rate:{' '}
              <strong className="text-[#FFD34E]">
                Core {formatInr(effectivePricing.core.launchPrice)} · Full Package{' '}
                {formatInr(effectivePricing.fullPackageOfferPrice)}
              </strong>
            </span>
            <span className="text-[11px] font-semibold">
              {effectivePricing.offerActive ? 'Offer Pricing Active' : 'Regular Pricing Active (Offer Inactive/Expired)'}
            </span>
          </div>
        )}
      </div>

      {/* Product Assignment Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[
          { key: 'core' as const, title: `Compulsory Core Subjects (${compulsoryIds.length})`, ids: compulsoryIds },
          { key: 'lang' as const, title: `Optional Language Add-ons (${languageIds.length})`, ids: languageIds },
          { key: 'spec' as const, title: `Optional Specialization (${specIds.length})`, ids: specIds },
        ].map((grp) => (
          <div key={grp.key} className="liquid-glass-card rounded-2xl p-4 space-y-2.5">
            <h4 className="text-xs font-bold text-[#FFE7A3] pb-2 border-b border-white/15">{grp.title}</h4>
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {products.map((prod) => {
                const checked = grp.ids.includes(prod.id);
                return (
                  <label
                    key={`${grp.key}-${prod.id}`}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                      checked
                        ? 'liquid-glass-card-selected text-white font-semibold'
                        : 'bg-black/35 border-white/15 text-white/75 hover:bg-black/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleProductInGroup(grp.key, prod.id)}
                      className="accent-[#FFD34E] shrink-0"
                    />
                    <span className="font-mono text-[10px] font-bold text-[#FFD34E] shrink-0">
                      {prod.subjectCode}
                    </span>
                    <span className="truncate">{prod.subjectName}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </form>
  );
};

// =========================================================================
// 3. PRICING & OFFERS MANAGEMENT VIEW
// =========================================================================

interface AdminOffersViewProps {
  offers: OfferConfig[];
  effectivePricing: EffectivePackagePricing | null;
  onRefresh: () => void;
  onNotify: (msg: string, isError?: boolean) => void;
}

export const AdminOffersView: React.FC<AdminOffersViewProps> = ({
  offers,
  effectivePricing,
  onRefresh,
  onNotify,
}) => {
  const [editingOffer, setEditingOffer] = useState<Partial<OfferConfig> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OfferConfig | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const openNewOffer = () => {
    const today = new Date().toISOString().slice(0, 10);
    const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    setEditingOffer({
      title: 'Festive Full Package Offer',
      badgeText: 'Up to 34% OFF',
      bannerText: 'Limited Time Special Bundle Price',
      description: 'Special discounted pricing for BCA Semester 3 complete study package.',
      regularPrice: 149,
      offerPrice: 99,
      discountPercent: 34,
      startDate: today,
      expiryDate: nextMonth,
      active: true,
      isFullPackageOffer: true,
    });
  };

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOffer) return;
    setIsSaving(true);
    try {
      const reg = Number(editingOffer.regularPrice) || 149;
      const off = Number(editingOffer.offerPrice) || 99;
      const disc = reg > 0 ? Math.max(0, Math.round(((reg - off) / reg) * 100)) : 0;

      await api.saveOffer({
        ...editingOffer,
        regularPrice: reg,
        offerPrice: off,
        discountPercent: disc,
      });
      onNotify(`Saved offer "${editingOffer.title}" and synced live pricing.`);
      setEditingOffer(null);
      onRefresh();
    } catch (err: any) {
      onNotify(err.message || 'Failed to save offer', true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (offer: OfferConfig) => {
    try {
      await api.saveOffer({ ...offer, active: !offer.active });
      onNotify(`Offer "${offer.title}" ${!offer.active ? 'activated' : 'paused'}.`);
      onRefresh();
    } catch (err: any) {
      onNotify(err.message || 'Failed to toggle offer', true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.deleteOffer(deleteTarget.id);
      onNotify(`Deleted offer "${deleteTarget.title}".`);
      setDeleteTarget(null);
      onRefresh();
    } catch (err: any) {
      onNotify(err.message || 'Failed to delete offer', true);
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
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-white">
              Pricing & Offers Management
            </h2>
            <p className="text-xs text-white/65">
              Manage the ₹99 Full Package Offer & promotional pricing. Expired offers automatically fall back to regular prices on the server.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openNewOffer}
          className="btn-gold-primary inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Offer</span>
        </button>
      </div>

      {/* Live Storefront Effective Pricing Preview */}
      {effectivePricing && (
        <div className="liquid-glass-master rounded-2xl p-4 sm:p-5 border border-[#FFD34E]/40 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#FFD34E]" />
              <h3 className="text-sm font-bold text-white">Live Storefront Pricing Preview</h3>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                effectivePricing.offerActive
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                  : 'bg-amber-500/20 text-amber-200 border-amber-400/40'
              }`}
            >
              {effectivePricing.offerActive
                ? `Offer Live: ${effectivePricing.offerTitle}`
                : effectivePricing.offerExpired
                ? 'Offer Expired — Regular Price Active'
                : 'Offer Paused — Regular Price Active'}
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-black/40 border border-white/15">
              <span className="text-[11px] text-white/65 block">Compulsory Core (4)</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-lg font-black text-[#FFD34E] tabular-nums">
                  {formatInr(
                    effectivePricing.offerActive
                      ? effectivePricing.core.launchPrice
                      : effectivePricing.core.regularPrice
                  )}
                </span>
                {effectivePricing.offerActive && (
                  <span className="text-white/45 line-through">
                    {formatInr(effectivePricing.core.regularPrice)}
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/15">
              <span className="text-[11px] text-white/65 block">+ Language Add-on</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-lg font-black text-[#FFD34E] tabular-nums">
                  +{formatInr(
                    effectivePricing.offerActive
                      ? effectivePricing.language.launchPrice
                      : effectivePricing.language.regularPrice
                  )}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/15">
              <span className="text-[11px] text-white/65 block">+ Specialization</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-lg font-black text-[#FFD34E] tabular-nums">
                  +{formatInr(
                    effectivePricing.offerActive
                      ? effectivePricing.specialization.launchPrice
                      : effectivePricing.specialization.regularPrice
                  )}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#970014]/50 border border-[#FFD34E]/50">
              <span className="text-[11px] font-bold text-[#FFE7A3] block">Full Package Total</span>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-lg font-black text-[#FFD34E] tabular-nums">
                  {formatInr(
                    effectivePricing.offerActive
                      ? effectivePricing.fullPackageOfferPrice
                      : effectivePricing.fullPackageRegularPrice
                  )}
                </span>
                {effectivePricing.offerActive && (
                  <span className="text-white/45 line-through">
                    {formatInr(effectivePricing.fullPackageRegularPrice)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Offers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {offers.map((offer) => {
          const isExpired = offer.expiryDate ? Date.now() > new Date(`${offer.expiryDate}T23:59:59+05:30`).getTime() : false;
          return (
            <div
              key={offer.id}
              className="liquid-glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {offer.isFullPackageOffer && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFD34E]/20 text-[#FFD34E] border border-[#FFD34E]/40">
                        Main Full Package Offer
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/45 text-[#FFE7A3] border border-white/15">
                      {offer.badgeText}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      !offer.active
                        ? 'bg-white/10 text-white/60'
                        : isExpired
                        ? 'bg-rose-500/20 text-rose-200 border border-rose-400/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                    }`}
                  >
                    {!offer.active ? 'Inactive' : isExpired ? 'Expired' : 'Active'}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white">{offer.title}</h3>
                <p className="text-xs text-white/70">{offer.description || offer.bannerText}</p>

                <div className="flex flex-wrap items-baseline gap-2 pt-1">
                  <span className="text-2xl font-black text-[#FFD34E] tabular-nums">
                    {formatInr(offer.offerPrice)}
                  </span>
                  <span className="text-sm text-white/45 line-through tabular-nums">
                    {formatInr(offer.regularPrice)}
                  </span>
                  <span className="text-xs font-bold text-emerald-300">
                    ({offer.discountPercent}% OFF)
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-white/65 pt-1">
                  <Clock className="w-3.5 h-3.5 text-[#FFD34E]" />
                  <span>
                    Valid: {formatDateIST(offer.startDate)} → {formatDateIST(offer.expiryDate)}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/15 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleActive(offer)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer border ${
                    offer.active
                      ? 'text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 border-amber-400/40'
                      : 'text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-400/40'
                  }`}
                >
                  {offer.active ? 'Deactivate' : 'Activate'}
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditingOffer(offer)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-[#FFD34E] bg-[#FFD34E]/15 hover:bg-[#FFD34E]/25 border border-[#FFD34E]/35 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(offer)}
                    className="p-1.5 rounded-xl text-rose-300 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/35 cursor-pointer"
                    title="Delete Offer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit / Create Offer Modal */}
      {editingOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="liquid-glass-master rounded-2xl max-w-lg w-full border border-[#FFE7A3]/35 shadow-2xl overflow-hidden text-left my-auto text-white">
            <div className="px-5 py-4 bg-gradient-to-r from-[#970014] to-[#3D0009] border-b border-[#FFE7A3]/25 text-white flex items-center justify-between">
              <h3 className="text-base font-extrabold">
                {editingOffer.id ? 'Edit Offer' : 'Create Offer'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingOffer(null)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOffer} className="p-5 space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Offer Title *</label>
                <input
                  type="text"
                  required
                  value={editingOffer.title || ''}
                  onChange={(e) => setEditingOffer({ ...editingOffer, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-black/50 border border-white/20 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Discount Badge Text</label>
                  <input
                    type="text"
                    value={editingOffer.badgeText || ''}
                    onChange={(e) => setEditingOffer({ ...editingOffer, badgeText: e.target.value })}
                    placeholder="Up to 34% OFF"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-black/50 border border-white/20 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Promo Banner Text</label>
                  <input
                    type="text"
                    value={editingOffer.bannerText || ''}
                    onChange={(e) => setEditingOffer({ ...editingOffer, bannerText: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-black/50 border border-white/20 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Regular Price (₹)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editingOffer.regularPrice ?? 149}
                    onChange={(e) => setEditingOffer({ ...editingOffer, regularPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-black/50 border border-white/20 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Offer Price (₹)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={editingOffer.offerPrice ?? 99}
                    onChange={(e) => setEditingOffer({ ...editingOffer, offerPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl bg-black/50 border border-white/20 text-[#FFD34E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={(editingOffer.startDate || '').slice(0, 10)}
                    onChange={(e) => setEditingOffer({ ...editingOffer, startDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-black/50 border border-white/20 text-white [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={(editingOffer.expiryDate || '').slice(0, 10)}
                    onChange={(e) => setEditingOffer({ ...editingOffer, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-black/50 border border-white/20 text-white [color-scheme:dark]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#FFE7A3] mb-1">Offer Description</label>
                <textarea
                  rows={2}
                  value={editingOffer.description || ''}
                  onChange={(e) => setEditingOffer({ ...editingOffer, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-black/50 border border-white/20 text-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs">
                <label className="inline-flex items-center gap-2 font-semibold text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingOffer.active !== false}
                    onChange={(e) => setEditingOffer({ ...editingOffer, active: e.target.checked })}
                    className="accent-[#FFD34E]"
                  />
                  <span>Active Offer</span>
                </label>

                <label className="inline-flex items-center gap-2 font-semibold text-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(editingOffer.isFullPackageOffer)}
                    onChange={(e) =>
                      setEditingOffer({ ...editingOffer, isFullPackageOffer: e.target.checked })
                    }
                    className="accent-[#FFD34E]"
                  />
                  <span>Controls Main Package Pricing</span>
                </label>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-[11px] text-amber-200 flex items-start gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[#FFD34E]" />
                <span>
                  After the expiry date passes, the server automatically reverts storefront checkout totals to the regular package price.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/15">
                <button
                  type="button"
                  onClick={() => setEditingOffer(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/20 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-gold-primary px-5 py-2 rounded-xl text-xs font-black cursor-pointer disabled:opacity-60"
                >
                  {isSaving ? 'Saving...' : 'Save & Sync Offer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Offer"
        description={`Delete offer "${deleteTarget?.title}"? If no active offer remains, the storefront switches to regular prices automatically.`}
        confirmLabel="Delete Offer"
        isProcessing={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
