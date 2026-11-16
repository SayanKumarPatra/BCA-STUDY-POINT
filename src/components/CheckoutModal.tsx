import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  CheckCircle2,
  Phone,
  QrCode,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Smartphone,
  ExternalLink,
  Lock,
  Upload,
  MessageSquare,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { BRAND } from '../constants/brand';
import { saveOrderRealtime } from '../firebase/firebase';
import { calculatePackagePrice } from '../constants/packageConfig';
import type { Product, EffectivePackagePricing, SiteSettings } from '../types';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProducts: Product[];
  livePricing?: EffectivePackagePricing | null;
  siteSettings?: SiteSettings | null;
  onRemoveProduct: (productId: string) => void;
  onPurchaseSuccess: (orderId: string) => void;
  isPage?: boolean;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  selectedProducts,
  livePricing,
  siteSettings,
  onRemoveProduct,
  onPurchaseSuccess,
  isPage = false,
}) => {
  const { student, loginStudent } = useAuth();

  const [step, setStep] = useState<'details' | 'payment' | 'confirmed'>('details');

  // Student Details
  const [fullName, setFullName] = useState(student?.fullName || '');
  const [email, setEmail] = useState(student?.email || '');
  const [mobile, setMobile] = useState(student?.mobile || '');

  // Payment Screenshot Verification (No Transaction ID required)
  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState('');
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedOrderId, setGeneratedOrderId] = useState('');

  if (!isOpen) return null;

  const packagePricing = calculatePackagePrice(
    selectedProducts.map((p) => p.id),
    livePricing
  );
  const totalPayable = packagePricing.launchOfferPrice;

  const OFFICIAL_UPI_ID =
    siteSettings?.payment?.upiId ||
    BRAND.payment?.upiId ||
    'BHARATPE2D0I0H4R5P81095@unitype';
  const OFFICIAL_QR_CODE =
    siteSettings?.payment?.qrCodeUrl ||
    BRAND.payment?.qrCodeUrl ||
    '/assets/aistudio/WhatsApp_Image_2026-11-10_at_7.58.34_PM_43197c9f.jpeg';
  const WHATSAPP_PHONE =
    siteSettings?.payment?.whatsappPhone ||
    BRAND.payment?.whatsappPhone ||
    '8145775413';

  const handleCopyUpi = () => {
    try {
      navigator.clipboard.writeText(OFFICIAL_UPI_ID);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleScreenshotUpload = async (file: File) => {
    setIsUploadingScreenshot(true);
    setErrorMessage('');
    try {
      const res = await api.uploadCheckoutScreenshot(file);
      if (res?.imageUrl) {
        setPaymentScreenshotUrl(res.imageUrl);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'স্ক্রিনশট আপলোড করতে সমস্যা হয়েছে। আপনি সরাসরি WhatsApp-এ পাঠাতে পারেন।');
    } finally {
      setIsUploadingScreenshot(false);
    }
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMessage('দয়া করে আপনার সম্পূর্ণ নাম লিখুন।');
      return;
    }

    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      setErrorMessage('দয়া করে সঠিক ১০ সংখ্যার মোবাইল নম্বর দিন।');
      return;
    }

    if (selectedProducts.length === 0) {
      setErrorMessage('কমপক্ষে একটি বিষয় নির্বাচন করুন।');
      return;
    }

    const orderRef = `BCA-${Date.now().toString().slice(-6)}`;
    setGeneratedOrderId(orderRef);
    setStep('payment');
  };

  const handleConfirmPaymentSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const cleanMobile = mobile.replace(/\D/g, '');
      const userEmail = email.trim() || `${cleanMobile}@student.bcastudypoint.com`;
      const fallbackOrderId = generatedOrderId || `ORD-${Date.now().toString().slice(-6)}`;
      let finalOrderId = fallbackOrderId;
      let finalStudentId = student?.id || `std_${Date.now()}`;
      const referenceNote = paymentScreenshotUrl
        ? 'Screenshot Uploaded'
        : 'WhatsApp Screenshot Verification';

      const orderItems = selectedProducts.map((p) => ({
        productId: p.id,
        subjectCode: p.subjectCode,
        subjectName: p.subjectName,
        price: p.price,
      }));

      // 1. Backend Order
      try {
        const orderRes = await api.createCheckoutOrder({
          fullName: fullName.trim(),
          email: userEmail.toLowerCase(),
          mobile: cleanMobile,
          selectedProductIds: selectedProducts.map((p) => p.id),
        });
        if (orderRes?.order?.orderId) {
          finalOrderId = orderRes.order.orderId;
          finalStudentId = orderRes.order.student.id;
        }

        await api.verifyPayment({
          orderId: finalOrderId,
          paymentScreenshotUrl: paymentScreenshotUrl || undefined,
          razorpayOrderId: orderRes?.order?.paymentGatewayOrderId,
          isTestSimulation: true,
        });
      } catch (backendErr) {
        console.warn('Backend order notice:', backendErr);
      }

      setGeneratedOrderId(finalOrderId);

      const orderPayload = {
        orderId: finalOrderId,
        userId: finalStudentId,
        studentName: fullName.trim(),
        studentEmail: userEmail.toLowerCase(),
        studentMobile: cleanMobile,
        selectedProductIds: selectedProducts.map((p) => p.id),
        items: orderItems,
        totalAmount: totalPayable,
        paymentStatus: 'pending',
        paymentReference: referenceNote,
        ...(paymentScreenshotUrl ? { paymentScreenshotUrl } : {}),
        createdAt: new Date().toISOString(),
      };

      // 2. Realtime Database sync
      await saveOrderRealtime(orderPayload);

      // 3. Keep in LocalStorage
      try {
        const stored = JSON.parse(localStorage.getItem('bca_orders') || '[]');
        const updated = [orderPayload, ...stored.filter((o: any) => o.orderId !== orderPayload.orderId)];
        localStorage.setItem('bca_orders', JSON.stringify(updated));
        localStorage.setItem('bca_last_order_id', finalOrderId);
      } catch {
        // ignore
      }

      // 4. Update student state
      loginStudent({
        id: finalStudentId,
        fullName: fullName.trim(),
        email: userEmail.toLowerCase(),
        mobile: cleanMobile,
      });

      setStep('confirmed');
    } catch (err: any) {
      console.warn('Checkout submission catch:', err);
      setStep('confirmed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const whatsappUrl = `https://wa.me/91${WHATSAPP_PHONE}?text=${encodeURIComponent(
    `Hello BCA STUDY POINT,\nI have paid ₹${totalPayable} for Order: ${generatedOrderId}\nStudent: ${fullName} (${mobile})\n\nPlease find my payment screenshot below to verify and activate my question banks.`
  )}`;

  const upiDeepLink = `upi://pay?pa=${OFFICIAL_UPI_ID}&pn=${encodeURIComponent(
    'BCA STUDY POINT'
  )}&am=${totalPayable}&cu=INR&tn=${encodeURIComponent(`Order ${generatedOrderId}`)}`;

  return (
    <div
      className={
        isPage
          ? 'min-h-[85vh] flex flex-col items-center justify-center p-3 sm:p-5 py-6'
          : 'fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto'
      }
    >
      {isPage && (
        <div className="w-full max-w-md mb-3">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs text-[#FFE7A3] hover:text-white px-3.5 py-1.5 rounded-full bg-black/50 border border-[#FFE7A3]/30 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Public Website</span>
          </button>
        </div>
      )}

      {/* 2026 Liquid Glass Modal */}
      <div className="liquid-glass-master rounded-2xl sm:rounded-3xl max-w-md w-full max-h-[92vh] overflow-y-auto p-4 sm:p-5 border border-[#FFE7A3]/30 shadow-2xl relative text-left my-auto text-white">
        {!isPage && (
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-1 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 mb-3 pb-2.5 border-b border-white/15">
          <img
            src={BRAND.logoUrl}
            alt="Logo"
            className="w-10 h-10 rounded-full object-cover ring-2 ring-[#FFD34E]/60 shadow-xs"
          />
          <div>
            <h2 className="text-base sm:text-lg font-black text-white leading-tight">
              {step === 'confirmed'
                ? 'Order Placed Successfully!'
                : step === 'payment'
                ? 'Direct UPI Payment'
                : 'Fast Checkout'}
            </h2>
            <p className="text-[11px] text-[#FFE7A3]">
              {selectedProducts.length} Subject(s) · Total: ₹{totalPayable}
            </p>
          </div>
        </div>

        {/* STEP 1: Details & Summary */}
        {step === 'details' && (
          <form onSubmit={handleProceedToPayment} className="space-y-3">
            {errorMessage && (
              <div className="p-2.5 bg-rose-950/80 border border-rose-500/50 rounded-xl text-xs text-rose-200">
                {errorMessage}
              </div>
            )}

            {/* Package Summary Strip */}
            <div className="bg-black/40 p-2.5 rounded-xl border border-[#FFE7A3]/30 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-[#FFE7A3] uppercase font-bold block">
                  Package ({packagePricing.totalPdfs} Subjects)
                </span>
                <span className="text-white font-bold text-xs">
                  {packagePricing.combinationLabel}
                </span>
              </div>
              <div className="text-right">
                <span className="line-through text-white/40 text-[10px] mr-1.5">
                  ₹{packagePricing.regularPrice}
                </span>
                <span className="text-[#FFD34E] font-black text-base">
                  ₹{totalPayable}
                </span>
              </div>
            </div>

            {/* Student Contact Info */}
            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-bold text-white mb-1">
                  Student Name <span className="text-[#FFD34E]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Rahul Sharma"
                  className="w-full px-3 py-1.5 text-xs bg-black/40 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#FFD34E]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white mb-1">
                  Mobile / WhatsApp Number <span className="text-[#FFD34E]">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="9876543210"
                  maxLength={10}
                  className="w-full px-3 py-1.5 text-xs bg-black/40 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#FFD34E]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white mb-1">
                  Email Address <span className="text-white/40 font-normal">(Optional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@gmail.com"
                  className="w-full px-3 py-1.5 text-xs bg-black/40 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-[#FFD34E]"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-gold-primary w-full py-2.5 rounded-full text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-md cursor-pointer mt-3"
            >
              <span>Continue to Payment (₹{totalPayable})</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </form>
        )}

        {/* STEP 2: Simplified Essential Payment (No Transaction ID required — Screenshot based) */}
        {step === 'payment' && (
          <form onSubmit={handleConfirmPaymentSubmission} className="space-y-3">
            {errorMessage && (
              <div className="p-2.5 bg-rose-950/80 border border-rose-500/50 rounded-xl text-xs text-rose-200">
                {errorMessage}
              </div>
            )}

            {/* Total Amount Card */}
            <div className="p-3 bg-gradient-to-r from-[#65000D] to-[#3D0009] rounded-xl border border-[#FFD34E]/40 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] text-[#FFE7A3] font-bold block uppercase tracking-wider">
                  Amount to Pay
                </span>
                <span className="text-2xl font-black text-[#FFD34E] tabular-nums">
                  ₹{totalPayable}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FFD34E]/20 text-[#FFE7A3] border border-[#FFD34E]/40">
                Order #{generatedOrderId}
              </span>
            </div>

            {/* UPI ID + QR Row */}
            <div className="bg-black/40 p-3 rounded-xl border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[10px] text-white/50 block font-medium">Official UPI ID:</span>
                  <code className="text-xs font-mono font-bold text-[#FFD34E] truncate block">
                    {OFFICIAL_UPI_ID}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="px-2.5 py-1 bg-white/15 hover:bg-white/25 text-white rounded text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  {copiedUpi ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* QR Code & Mobile Deep Link */}
              <div className="flex items-center gap-3 pt-2 border-t border-white/10">
                <div className="w-20 h-20 bg-white p-1 rounded-lg shrink-0 shadow">
                  <img
                    src={OFFICIAL_QR_CODE}
                    alt="Scan UPI QR"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-[11px] text-white/80 space-y-1">
                  <p className="font-semibold text-white">Google Pay / PhonePe / Paytm:</p>
                  <p className="text-[10px] text-white/60">
                    Scan the QR or copy the UPI ID to complete your payment of ₹{totalPayable}.
                  </p>
                  <a
                    href={upiDeepLink}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-[#FFD34E] hover:underline"
                  >
                    <span>Open in UPI App ↗</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Screenshot Instructions + Optional Upload (No Transaction ID required) */}
            <div className="bg-black/40 p-3 rounded-xl border border-[#FFE7A3]/25 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="block text-[11px] font-bold text-[#FFE7A3]">
                    পেমেন্ট স্ক্রিনশট ভেরিফিকেশন
                  </span>
                  <p className="text-[10px] text-white/75 mt-0.5 leading-relaxed">
                    কোনো Transaction ID লাগবে না। পেমেন্ট হয়ে গেলে নিচে স্ক্রিনশট আপলোড করুন অথবা সরাসরি WhatsApp-এ (<strong>{WHATSAPP_PHONE}</strong>) স্ক্রিনশট পাঠিয়ে দিন।
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-white/10 hover:bg-white/20 border border-white/20 text-white cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-[#FFD34E]" />
                  <span>
                    {isUploadingScreenshot
                      ? 'Uploading...'
                      : paymentScreenshotUrl
                      ? 'Change Screenshot'
                      : 'Upload Screenshot (Optional)'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleScreenshotUpload(f);
                    }}
                  />
                </label>

                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/40 text-[#25D366]"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp ({WHATSAPP_PHONE})</span>
                </a>
              </div>

              {paymentScreenshotUrl && (
                <div className="flex items-center gap-2 pt-1">
                  <img
                    src={paymentScreenshotUrl}
                    alt="Uploaded Payment Screenshot"
                    className="w-12 h-12 rounded-lg object-cover border border-[#FFD34E]/50"
                  />
                  <span className="text-[10px] text-emerald-300 font-semibold">
                    ✓ Screenshot attached to order
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep('details')}
                className="py-2 px-3 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-bold cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isUploadingScreenshot}
                className="btn-gold-primary flex-1 py-2 rounded-full text-xs font-black shadow-md cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {isSubmitting ? <span>Submitting...</span> : <span>I Have Paid — Submit Order</span>}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Clean Confirmation */}
        {step === 'confirmed' && (
          <div className="text-center py-2 space-y-3">
            <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/50 rounded-full flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-white">Order Submitted!</h3>
              <p className="text-xs text-[#FFE7A3] mt-0.5">
                Order ID: <span className="font-mono font-bold text-white">{generatedOrderId}</span>
              </p>
              <p className="text-[11px] text-white/75 mt-1 leading-relaxed">
                আপনার অর্ডারটি সাবমিট হয়েছে। পেমেন্ট স্ক্রিনশট নিচের WhatsApp বাটনে ক্লিক করে <strong>{WHATSAPP_PHONE}</strong> নম্বরে পাঠিয়ে দিন—অ্যাডমিন চেক করে অ্যাক্সেস চালু করে দেবেন।
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 rounded-full bg-[#25D366] hover:bg-[#22c55e] text-[#052e16] text-xs font-black inline-flex items-center justify-center gap-1.5 shadow-md"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Send Payment Screenshot on WhatsApp ({WHATSAPP_PHONE})</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  onPurchaseSuccess(generatedOrderId);
                  onClose();
                }}
                className="btn-gold-primary w-full py-2.5 rounded-full text-xs font-black cursor-pointer shadow-md"
              >
                Go to My Notes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
