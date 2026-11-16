import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  BookOpen,
  Package,
  Calendar,
  ShoppingBag,
  Laptop,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';
import type { CustomerSummary, Order } from '../../types';
import { formatDateTimeIST, formatDateIST, formatInr } from './adminTypes';

export const OrderStatusBadge: React.FC<{ status: Order['paymentStatus'] | string }> = ({ status }) => {
  if (status === 'verified') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
        <CheckCircle2 className="w-3 h-3" />
        Verified
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-200 border border-amber-400/40">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-200 border border-rose-400/40">
      <XCircle className="w-3 h-3" />
      {status === 'rejected' ? 'Rejected' : 'Failed'}
    </span>
  );
};

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  isProcessing?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  tone = 'danger',
  isProcessing = false,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="liquid-glass-master rounded-2xl max-w-md w-full p-5 sm:p-6 border border-[#FFE7A3]/30 shadow-2xl text-left text-white">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              tone === 'danger'
                ? 'bg-rose-500/20 text-rose-300 border-rose-400/40'
                : 'bg-[#FFD34E]/20 text-[#FFD34E] border-[#FFD34E]/40'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-extrabold text-white">{title}</h3>
            <p className="text-xs sm:text-sm text-white/80 mt-1 leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 mt-5 pt-4 border-t border-white/15">
          <button
            type="button"
            disabled={isProcessing}
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-60 ${
              tone === 'danger'
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'btn-gold-primary'
            }`}
          >
            {isProcessing ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

interface RejectOrderModalProps {
  order: Order | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

export const RejectOrderModal: React.FC<RejectOrderModalProps> = ({
  order,
  isSubmitting,
  onClose,
  onSubmit,
}) => {
  const [reason, setReason] = useState('Fake payment receipt / Screenshot not received');

  useEffect(() => {
    if (order) {
      setReason('Fake payment receipt / Screenshot not received');
    }
  }, [order]);

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="liquid-glass-master rounded-2xl max-w-md w-full p-5 sm:p-6 border border-[#FFE7A3]/30 shadow-2xl text-left text-white">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/15">
          <div>
            <h3 className="text-base font-extrabold text-white">Reject Payment</h3>
            <p className="text-xs text-[#FFE7A3] mt-0.5 font-mono">{order.orderId}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(reason.trim() || 'Rejected by Admin');
          }}
          className="space-y-4"
        >
          <div className="bg-black/40 rounded-xl p-3 border border-white/15 text-xs space-y-1">
            <div className="font-bold text-white">{order.studentName}</div>
            <div className="text-white/75">
              Mobile: {order.studentMobile || '—'} · Amount:{' '}
              <span className="font-bold text-[#FFD34E]">{formatInr(order.totalAmount)}</span>
            </div>
            <div className="font-mono text-white/60">
              Ref: {order.paymentReference || 'Screenshot Verification'}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#FFE7A3] mb-1.5">
              Rejection Reason
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this payment is rejected..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-black/45 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-[#FFD34E]"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-white/10 hover:bg-white/20 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? 'Rejecting...' : 'Confirm Reject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface OrderDetailsModalProps {
  order: Order | null;
  onClose: () => void;
  onApprove: (orderId: string) => void;
  onRejectClick: (order: Order) => void;
  onDeleteClick: (order: Order) => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  onClose,
  onApprove,
  onRejectClick,
  onDeleteClick,
}) => {
  if (!order) return null;

  const cleanMobile = (order.studentMobile || '').replace(/\D/g, '');
  const whatsappHref = cleanMobile
    ? `https://wa.me/91${cleanMobile}?text=${encodeURIComponent(
        `Hello ${order.studentName}, regarding your BCA STUDY POINT Order ${order.orderId} (${formatInr(
          order.totalAmount
        )}).`
      )}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="liquid-glass-master rounded-2xl max-w-2xl w-full border border-[#FFE7A3]/35 shadow-2xl overflow-hidden text-left my-auto text-white">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#970014] to-[#3D0009] border-b border-[#FFE7A3]/25 text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#FFE7A3] block">
              Order Details
            </span>
            <h3 className="text-base sm:text-lg font-black font-mono">{order.orderId}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Status + Amount Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-black/40 border border-white/15">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <OrderStatusBadge status={order.paymentStatus} />
                {order.packageName && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFD34E]/15 text-[#FFE7A3] border border-[#FFD34E]/35">
                    {order.packageName}
                  </span>
                )}
              </div>
              <p className="text-xs text-white/65">
                Placed: {formatDateTimeIST(order.createdAt)}
                {order.verifiedAt ? ` · Verified: ${formatDateTimeIST(order.verifiedAt)}` : ''}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#FFE7A3]/70 block">
                Total Amount
              </span>
              <span className="text-2xl font-black text-[#FFD34E] tabular-nums">
                {formatInr(order.totalAmount)}
              </span>
            </div>
          </div>

          {/* Customer Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-black/35 border border-white/15 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#FFE7A3]/70 block">
                Customer Information
              </span>
              <div className="text-sm font-bold text-white">{order.studentName}</div>
              <div className="text-xs text-white/80 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#FFD34E]" />
                <span>{order.studentMobile || '—'}</span>
              </div>
              <div className="text-xs text-white/80 flex items-center gap-1.5 break-all">
                <Mail className="w-3.5 h-3.5 text-[#FFD34E] shrink-0" />
                <span>{order.studentEmail || '—'}</span>
              </div>
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-emerald-300 hover:underline"
                >
                  <span>Message on WhatsApp</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-black/35 border border-white/15 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#FFE7A3]/70 block">
                Payment Verification
              </span>
              <div className="text-xs text-white/80">
                Reference:{' '}
                <code className="font-mono font-bold text-[#FFD34E] bg-black/50 px-1.5 py-0.5 rounded">
                  {order.paymentReference || 'WhatsApp Screenshot'}
                </code>
              </div>
              <div className="text-xs text-white/80">
                Method:{' '}
                <span className="font-semibold text-white">
                  {order.paymentMethod || 'UPI / Screenshot Verification'}
                </span>
              </div>
              {order.rejectionReason && (
                <div className="text-xs text-rose-300 font-semibold mt-1">
                  Rejection Reason: {order.rejectionReason}
                </div>
              )}
            </div>
          </div>

          {/* Payment Screenshot Preview if Uploaded */}
          {order.paymentScreenshotUrl && (
            <div className="p-3.5 rounded-xl bg-black/40 border border-[#FFD34E]/35 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#FFE7A3]">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#FFD34E]" />
                  Attached Payment Screenshot
                </span>
                <a
                  href={order.paymentScreenshotUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[#FFD34E] hover:underline inline-flex items-center gap-1"
                >
                  <span>Open Full Size</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <img
                src={order.paymentScreenshotUrl}
                alt="Payment Screenshot"
                className="max-h-60 rounded-lg border border-white/15 object-contain bg-black/60"
              />
            </div>
          )}

          {/* Purchased Subjects Breakdown */}
          <div className="border border-white/15 rounded-xl overflow-hidden bg-black/35">
            <div className="px-4 py-2.5 bg-black/45 border-b border-white/15 text-xs font-bold text-[#FFE7A3] flex items-center justify-between">
              <span>Subjects Included ({order.items?.length || 0})</span>
              <span>Line Price</span>
            </div>
            <div className="divide-y divide-white/10">
              {(order.items || []).map((item, idx) => (
                <div
                  key={`${item.productId}-${idx}`}
                  className="px-4 py-2.5 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-[#FFD34E] mr-2">
                      {item.subjectCode}
                    </span>
                    <span className="font-semibold text-white">{item.subjectName}</span>
                  </div>
                  <span className="font-bold text-[#FFE7A3] tabular-nums">
                    {formatInr(item.price)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/15">
            <button
              type="button"
              onClick={() => {
                onClose();
                onDeleteClick(order);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:bg-rose-950/60 border border-rose-500/40 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Order</span>
            </button>

            <div className="flex items-center gap-2">
              {order.paymentStatus !== 'rejected' && order.paymentStatus !== 'failed' && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRejectClick(order);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-rose-200 bg-rose-950/70 hover:bg-rose-900 border border-rose-500/40 cursor-pointer"
                >
                  Reject Payment
                </button>
              )}
              {order.paymentStatus !== 'verified' && (
                <button
                  type="button"
                  onClick={() => {
                    onApprove(order.orderId);
                    onClose();
                  }}
                  className="btn-gold-primary px-4 py-2 rounded-xl text-xs font-black shadow-sm cursor-pointer"
                >
                  Verify & Activate Access
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface CustomerProfileModalProps {
  customer: CustomerSummary | null;
  onClose: () => void;
  onSelectOrder: (order: Order) => void;
  onDeleteCustomerClick?: (customer: CustomerSummary) => void;
}

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({
  customer,
  onClose,
  onSelectOrder,
  onDeleteCustomerClick,
}) => {
  if (!customer) return null;

  const cleanMobile = (customer.mobile || '').replace(/\D/g, '');
  const whatsappHref = cleanMobile
    ? `https://wa.me/91${cleanMobile}?text=${encodeURIComponent(
        `Hello ${customer.fullName}, greetings from BCA STUDY POINT!`
      )}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="liquid-glass-master rounded-2xl max-w-3xl w-full border border-[#FFE7A3]/35 shadow-2xl overflow-hidden text-left my-auto text-white">
        {/* Top Header */}
        <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-[#970014] via-[#65000D] to-[#3D0009] border-b border-[#FFE7A3]/25 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[#FFD34E]/20 border border-[#FFD34E]/50 text-[#FFD34E] flex items-center justify-center font-black text-lg shrink-0">
              {(customer.fullName || 'S').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#FFE7A3] block">
                Customer Profile
              </span>
              <h3 className="text-base sm:text-xl font-black truncate">{customer.fullName}</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Contact + KPI Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 p-4 rounded-xl bg-black/40 border border-white/15 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#FFE7A3]/75">
                  Student Contact & Registration
                </span>
                {whatsappHref && (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[11px] font-bold hover:bg-emerald-500/30"
                  >
                    <Phone className="w-3 h-3" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 text-white/90">
                  <Phone className="w-3.5 h-3.5 text-[#FFD34E] shrink-0" />
                  <span className="font-semibold">{customer.mobile || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2 text-white/90 break-all">
                  <Mail className="w-3.5 h-3.5 text-[#FFD34E] shrink-0" />
                  <span className="font-semibold">{customer.email || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-2 text-white/75">
                  <Calendar className="w-3.5 h-3.5 text-white/50 shrink-0" />
                  <span>Registered: {formatDateIST(customer.registeredAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-white/75">
                  <User className="w-3.5 h-3.5 text-white/50 shrink-0" />
                  <span>
                    ID: <span className="font-mono text-[11px]">{customer.customerId}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-br from-[#970014]/50 to-black/60 border border-[#FFD34E]/40 flex flex-col justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#FFE7A3]">
                Lifetime Summary
              </span>
              <div className="mt-2">
                <div className="text-2xl font-black text-[#FFD34E] tabular-nums">
                  {formatInr(customer.totalAmountSpent)}
                </div>
                <div className="text-xs text-white/85 mt-0.5 tabular-nums">
                  {customer.purchasedSubjectCount} Subjects · {customer.totalOrders} Orders
                </div>
                <div className="text-[11px] text-white/60 mt-1">
                  Last Purchase: {formatDateIST(customer.lastPurchaseDate)}
                </div>
              </div>
            </div>
          </div>

          {/* Packages + Connected Device */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-black/35 border border-white/15 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#FFE7A3]">
                <Package className="w-4 h-4 text-[#FFD34E]" />
                <span>Purchased Packages</span>
              </div>
              {customer.purchasedPackageNames.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {customer.purchasedPackageNames.map((pkg, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#FFD34E]/15 text-[#FFE7A3] border border-[#FFD34E]/35"
                    >
                      {pkg}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-white/55">No package orders recorded yet.</p>
              )}
            </div>

            <div className="p-4 rounded-xl bg-black/35 border border-white/15 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#FFE7A3]">
                <Laptop className="w-4 h-4 text-[#FFD34E]" />
                <span>Bound Reading Device</span>
              </div>
              {customer.deviceInfo ? (
                <div className="text-xs text-white/80 space-y-0.5">
                  <div className="font-semibold text-white">
                    {customer.deviceInfo.os} · {customer.deviceInfo.browser}
                  </div>
                  <div className="text-[11px] text-white/60">
                    Status:{' '}
                    <span className="font-bold uppercase text-[#FFD34E]">
                      {customer.deviceInfo.registrationStatus}
                    </span>{' '}
                    · Last Seen: {formatDateTimeIST(customer.deviceInfo.lastSeenAt)}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-white/55">No active device bound yet.</p>
              )}
            </div>
          </div>

          {/* All Purchased Subjects */}
          <div className="border border-white/15 rounded-xl overflow-hidden bg-black/35">
            <div className="px-4 py-2.5 bg-black/45 border-b border-white/15 flex items-center justify-between">
              <span className="text-xs font-bold text-[#FFE7A3] flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#FFD34E]" />
                Purchased Products / Subjects ({customer.purchasedSubjectCount})
              </span>
            </div>
            {customer.purchasedProducts.length > 0 ? (
              <div className="divide-y divide-white/10">
                {customer.purchasedProducts.map((subj) => (
                  <div
                    key={subj.productId}
                    className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-mono font-bold text-[#FFD34E] mr-2">
                        {subj.subjectCode || subj.productId}
                      </span>
                      <span className="font-semibold text-white">{subj.subjectName}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          subj.accessStatus === 'active'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                            : subj.accessStatus === 'pending'
                            ? 'bg-amber-500/20 text-amber-200 border border-amber-400/40'
                            : 'bg-rose-500/20 text-rose-200 border border-rose-400/40'
                        }`}
                      >
                        {subj.accessStatus}
                      </span>
                      <span className="font-bold text-[#FFE7A3] tabular-nums">
                        {formatInr(subj.price)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-xs text-white/55">
                This registered student has not purchased any subjects yet.
              </div>
            )}
          </div>

          {/* Complete Order History */}
          <div className="border border-white/15 rounded-xl overflow-hidden bg-black/35">
            <div className="px-4 py-2.5 bg-black/45 border-b border-white/15 flex items-center gap-1.5 text-xs font-bold text-[#FFE7A3]">
              <ShoppingBag className="w-4 h-4 text-[#FFD34E]" />
              <span>Order History ({customer.orderHistory.length})</span>
            </div>
            {customer.orderHistory.length > 0 ? (
              <div className="divide-y divide-white/10">
                {customer.orderHistory.map((ord) => (
                  <div
                    key={ord.orderId}
                    onClick={() => onSelectOrder(ord)}
                    className="px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs hover:bg-white/5 cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="font-mono font-bold text-white">{ord.orderId}</div>
                      <div className="text-[11px] text-white/60">
                        {formatDateTimeIST(ord.createdAt)} · {ord.items?.length || 0} subjects ·{' '}
                        {ord.paymentReference || 'Screenshot'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <OrderStatusBadge status={ord.paymentStatus} />
                      <span className="font-black text-[#FFD34E] tabular-nums">
                        {formatInr(ord.totalAmount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-6 text-center text-xs text-white/55">
                No order history available.
              </div>
            )}
          </div>

          {onDeleteCustomerClick && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/15">
              <p className="text-[11px] text-white/55">
                Removing this customer deletes their profile, orders, PDF access &amp; bound device.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDeleteCustomerClick(customer);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:bg-rose-950/60 border border-rose-500/40 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Customer</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
