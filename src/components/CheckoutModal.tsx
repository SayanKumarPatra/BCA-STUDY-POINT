import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Copy,
  Check,
  CheckCircle2,
  Phone,
  ArrowLeft,
  ShieldCheck,
  Upload,
  MessageSquare,
  UserPlus,
  Download,
  Lock,
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
  onOpenAuth?: (isRegister: boolean) => void;
  onPurchaseSuccess: (orderId: string) => void;
  onConfirmedExit?: (orderId: string) => void;
  isPage?: boolean;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  selectedProducts,
  livePricing,
  siteSettings,
  onOpenAuth,
  onPurchaseSuccess,
  onConfirmedExit,
  isPage = false,
}) => {
  const { student, loginStudent } = useAuth();

  const [step, setStep] = useState<'auth_required' | 'payment' | 'confirmed'>(() =>
    student ? 'payment' : 'auth_required'
  );

  // Payment Screenshot Verification (No Transaction ID required)
  const [paymentScreenshotUrl, setPaymentScreenshotUrl] = useState('');
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [qrDownloaded, setQrDownloaded] = useState(false);
  const [dynamicQrUrl, setDynamicQrUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedOrderId, setGeneratedOrderId] = useState(
    () => `BCA-${Date.now().toString().slice(-6)}`
  );

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

  const isDefaultBharatPe = OFFICIAL_UPI_ID === 'BHARATPE2D0I0H4R5P81095@unitype';
  const upiPayeeName = isDefaultBharatPe ? 'Sayan Kumar Patra' : 'BCA Study Point';
  const upiNote = 'BCA Study Point';
  const fixedAmountStr = Number(totalPayable || 0).toFixed(2);
  const lockedQrPaymentUri = `upi://pay?pa=${encodeURIComponent(
    OFFICIAL_UPI_ID
  )}&pn=${encodeURIComponent(upiPayeeName)}&am=${fixedAmountStr}&cu=INR&tn=${encodeURIComponent(upiNote)}`;

  useEffect(() => {
    if (step !== 'confirmed') {
      setStep(student ? 'payment' : 'auth_required');
    }
  }, [student?.id, step]);

  useEffect(() => {
    let cancelled = false;
    if (!isOpen || !totalPayable || totalPayable <= 0) {
      setDynamicQrUrl('');
      return;
    }
    QRCode.toDataURL(lockedQrPaymentUri, {
      width: 520,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (!cancelled) setDynamicQrUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDynamicQrUrl('');
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, lockedQrPaymentUri, totalPayable]);

  if (!isOpen) return null;

  const activeQrSrc = dynamicQrUrl || OFFICIAL_QR_CODE;

  const handleCopyUpi = () => {
    try {
      navigator.clipboard.writeText(OFFICIAL_UPI_ID);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 3000);
    } catch {
      // fallback
    }
  };

  const handleDownloadQr = async () => {
    const fileName = `BCA-Study-Point-Pay-Rs${totalPayable}.png`;
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = activeQrSrc;
      });

      const canvas = document.createElement('canvas');
      const pad = 40;
      const headerHeight = 90;
      const footerHeight = 68;
      const qrSize = 440;
      canvas.width = qrSize + pad * 2;
      canvas.height = qrSize + headerHeight + footerHeight + pad;

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No canvas context');

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#5F259F';
      ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BCA STUDY POINT', canvas.width / 2, 46);

      ctx.fillStyle = '#111827';
      ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
      ctx.fillText(`Fixed Amount: ₹${totalPayable} (Non-Editable)`, canvas.width / 2, 80);

      ctx.drawImage(img, pad, headerHeight + 10, qrSize, qrSize);

      ctx.fillStyle = '#4B5563';
      ctx.font = '600 18px monospace';
      ctx.fillText(OFFICIAL_UPI_ID, canvas.width / 2, headerHeight + qrSize + 48);

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setQrDownloaded(true);
      setTimeout(() => setQrDownloaded(false), 3500);
    } catch {
      const link = document.createElement('a');
      link.href = activeQrSrc;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setQrDownloaded(true);
      setTimeout(() => setQrDownloaded(false), 3500);
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

  const activeName = student?.fullName?.trim() || 'BCA Student';
  const activeMobile = (student?.mobile || '').replace(/\D/g, '');
  const activeEmail =
    (student?.email || '').trim().toLowerCase() ||
    (activeMobile ? `${activeMobile}@student.bcastudypoint.com` : '');

  const handleConfirmPaymentSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !student) return;

    if (selectedProducts.length === 0) {
      setErrorMessage('কমপক্ষে একটি বিষয় নির্বাচন করুন।');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const fallbackOrderId = generatedOrderId || `ORD-${Date.now().toString().slice(-6)}`;
      let finalOrderId = fallbackOrderId;
      let finalStudentId = student.id || `std_${Date.now()}`;
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
          fullName: activeName,
          email: activeEmail,
          mobile: activeMobile,
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
        studentName: activeName,
        studentEmail: activeEmail,
        studentMobile: activeMobile,
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
        fullName: activeName,
        email: activeEmail,
        mobile: activeMobile,
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
    `Hello BCA STUDY POINT,\nI have paid ₹${totalPayable} for Order: ${generatedOrderId}\nStudent: ${activeName} (${activeMobile})\n\nPlease find my payment screenshot below to verify and activate my question banks.`
  )}`;

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
            onClick={() => {
              if (step === 'confirmed' && onConfirmedExit) {
                onConfirmedExit(generatedOrderId);
              } else {
                onClose();
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs text-[#FFE7A3] hover:text-white px-3.5 py-1.5 rounded-full bg-black/50 border border-[#FFE7A3]/30 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Public Website</span>
          </button>
        </div>
      )}

      {/* 2026 Liquid Glass Modal — Compact Single-Screen Fit */}
      <div className="liquid-glass-master rounded-2xl sm:rounded-3xl max-w-md w-full max-h-[94vh] overflow-y-auto p-3.5 sm:p-4 border border-[#FFE7A3]/30 shadow-2xl relative text-left my-auto text-white">
        {!isPage && (
          <button
            onClick={() => {
              if (step === 'confirmed' && onConfirmedExit) {
                onConfirmedExit(generatedOrderId);
              } else {
                onClose();
              }
            }}
            className="absolute top-3 right-3 p-1 text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Compact Modal Header */}
        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/15">
          <img
            src={BRAND.logoUrl}
            alt="Logo"
            className="w-8 h-8 rounded-full object-cover ring-2 ring-[#FFD34E]/60 shadow-xs"
          />
          <div>
            <h2 className="text-sm sm:text-base font-black text-white leading-tight">
              {step === 'confirmed'
                ? 'Order Placed Successfully!'
                : step === 'payment'
                ? 'UPI QR Payment'
                : 'Registration Required'}
            </h2>
            <p className="text-[10.5px] text-[#FFE7A3]">
              {selectedProducts.length} Subject(s) · Fixed Total: ₹{totalPayable}
            </p>
          </div>
        </div>

        {/* STEP 1 (Fallback if reached without login): Prompt direct Registration / Login */}
        {step === 'auth_required' && (
          <div className="space-y-3 py-1">
            <div className="bg-black/40 p-3.5 rounded-2xl border border-[#FFE7A3]/35 space-y-2 text-center">
              <div className="w-11 h-11 rounded-full bg-[#FFD34E]/15 border border-[#FFD34E]/45 text-[#FFD34E] flex items-center justify-center mx-auto">
                <UserPlus className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-black text-white">
                আগে রেজিস্ট্রেশন বা লগইন করুন
              </h3>
              <p className="text-xs text-white/80 leading-relaxed">
                অর্ডার করার আগে আপনার নাম, মোবাইল নম্বর ও ইমেইল আইডি দিয়ে একবার <strong className="text-[#FFD34E]">রেজিস্ট্রেশন</strong> করে নিন। এটি ফায়ারবেস ও লাইভ সার্ভারে সেভ থাকবে — পরে লগআউট হয়ে গেলেও শুধু <strong className="text-white">ইমেইল আইডি</strong> দিয়েই লগইন করতে পারবেন।
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => onOpenAuth && onOpenAuth(true)}
                className="btn-gold-primary w-full py-2.5 rounded-full text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <UserPlus className="w-4 h-4 stroke-[2.5]" />
                <span>Register Now (নতুন অ্যাকাউন্ট)</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth && onOpenAuth(false)}
                className="w-full py-2.5 rounded-full text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 cursor-pointer"
              >
                ইতিমধ্যে অ্যাকাউন্ট আছে? Login করুন
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Single-Screen Compact PhonePe-Themed Fixed-Amount Payment */}
        {step === 'payment' && (
          <form onSubmit={handleConfirmPaymentSubmission} className="space-y-2">
            {errorMessage && (
              <div className="p-2 bg-rose-950/80 border border-rose-500/50 rounded-xl text-[11px] text-rose-200">
                {errorMessage}
              </div>
            )}

            {/* Ultra-Compact Verified Student Strip */}
            <div className="px-2.5 py-1 rounded-lg bg-black/40 border border-emerald-400/35 flex items-center justify-between gap-2 text-[10.5px]">
              <span className="text-emerald-200 font-semibold truncate">
                ✓ {activeName} · {activeMobile || activeEmail}
              </span>
              <span className="text-[10px] text-[#FFE7A3] font-bold shrink-0">
                {packagePricing.totalPdfs} Subjects
              </span>
            </div>

            {/* PhonePe Purple Theme Compact Fixed-Amount QR Card (Fits One Screen) */}
            <div className="bg-gradient-to-br from-[#5F259F] via-[#4A1A82] to-[#2F0D57] p-2.5 sm:p-3 rounded-2xl border border-[#C4B5FD]/40 shadow-xl space-y-2">
              {/* Top Row: Fixed Amount + PhonePe-Style Verified Badge */}
              <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/15">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10.5px] text-purple-100/85 font-bold">Pay Fixed:</span>
                  <span className="text-xl font-black text-white tabular-nums leading-none">
                    ₹{totalPayable}
                  </span>
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-400/20 text-emerald-200 border border-emerald-300/40">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Fixed</span>
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-white/15 text-white border border-white/25">
                  <ShieldCheck className="w-3 h-3 text-emerald-300 shrink-0" />
                  <span>BCA Study Point</span>
                </span>
              </div>

              {/* Side-by-Side QR Scanner + Download & Copy Controls (Saves Vertical Height) */}
              <div className="flex items-center gap-2.5 bg-black/25 p-2 rounded-xl border border-white/15">
                <div className="w-28 h-28 sm:w-32 sm:h-32 bg-white p-1.5 rounded-xl shrink-0 shadow-lg ring-2 ring-white/80">
                  <img
                    src={activeQrSrc}
                    alt={`Scan UPI QR to Pay Fixed ₹${totalPayable}`}
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="text-[10.5px] font-bold text-purple-100 leading-tight">
                    স্ক্যান করলেই <span className="text-[#FFD34E]">₹{totalPayable} ফিক্সড</span> দেখাবে (এডিট হবে না)
                  </p>
                  <p className="text-[9.5px] text-purple-200/80 leading-tight">
                    PhonePe / GPay / Paytm দিয়ে স্ক্যান বা Gallery থেকে পেমেন্ট করুন।
                  </p>

                  <button
                    type="button"
                    onClick={handleDownloadQr}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-purple-50 active:scale-[0.99] text-[#5F259F] text-[11px] font-black shadow-md cursor-pointer transition-all"
                  >
                    {qrDownloaded ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Download className="w-3.5 h-3.5" />}
                    <span>{qrDownloaded ? 'QR Saved!' : `Download QR (₹${totalPayable})`}</span>
                  </button>

                  <div className="flex items-center justify-between gap-1 bg-black/40 px-2 py-1 rounded-lg border border-white/15">
                    <code className="text-[9.5px] font-mono font-bold text-purple-100 truncate select-all">
                      {OFFICIAL_UPI_ID}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="px-1.5 py-0.5 bg-white/15 hover:bg-white/25 text-white rounded text-[9.5px] font-bold flex items-center gap-0.5 shrink-0 cursor-pointer"
                    >
                      {copiedUpi ? <Check className="w-2.5 h-2.5 text-emerald-300" /> : <Copy className="w-2.5 h-2.5" />}
                      <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Compact Single-Row Screenshot Upload + WhatsApp Verification */}
            <div className="bg-black/40 p-2 rounded-xl border border-[#FFE7A3]/20 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[10.5px] font-bold bg-white/10 hover:bg-white/20 border border-white/20 text-white cursor-pointer truncate">
                  <Upload className="w-3 h-3 text-[#FFD34E] shrink-0" />
                  <span className="truncate">
                    {isUploadingScreenshot
                      ? 'Uploading...'
                      : paymentScreenshotUrl
                      ? 'Screenshot Ready ✓'
                      : 'Upload Screenshot'}
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
                  className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[10.5px] font-bold bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/40 text-[#25D366] shrink-0"
                >
                  <MessageSquare className="w-3 h-3" />
                  <span>WhatsApp</span>
                </a>
              </div>

              {paymentScreenshotUrl && (
                <div className="flex items-center gap-2 pt-0.5">
                  <img
                    src={paymentScreenshotUrl}
                    alt="Uploaded Payment Screenshot"
                    className="w-9 h-9 rounded-md object-cover border border-[#FFD34E]/50"
                  />
                  <span className="text-[10px] text-emerald-300 font-semibold">
                    ✓ Screenshot attached to order
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex gap-2 pt-0.5">
              <button
                type="button"
                onClick={onClose}
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
                  if (!isPage) {
                    onClose();
                  }
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
