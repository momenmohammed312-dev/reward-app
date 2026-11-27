import React, { useEffect, useRef, useState } from 'react';
import { Camera, WarningCircle, X } from '@phosphor-icons/react';

declare global {
  interface BarcodeDetectorResult {
    rawValue: string;
    format: string;
  }
  class BarcodeDetector {
    constructor(options?: { formats?: string[] });
    detect(image: ImageBitmapSource): Promise<BarcodeDetectorResult[]>;
  }
}

interface CameraScannerModalProps {
  isOpen: boolean;
  title?: string;
  onDetected: (value: string) => void;
  onClose: () => void;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  title = 'مسح باركود / QR بالكاميرا',
  onDetected,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let stream: MediaStream | null = null;
    let rafId = 0;
    let cancelled = false;

    const startScanner = async () => {
      setErrorMsg(null);
      if (typeof window === 'undefined' || !('BarcodeDetector' in window)) {
        setErrorMsg(
          'متصفحك الحالي لا يدعم القراءة المباشرة بالكاميرا (BarcodeDetector). يمكنك استخدام سكانر الـ USB أو كتابة الكود يدوياً.'
        );
        return;
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorMsg('تعذر الوصول إلى الكاميرا في هذا المتصفح.');
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const detector = new BarcodeDetector({
          formats: ['qr_code', 'code_128', 'ean_13', 'code_39'],
        });

        const scanFrame = async () => {
          if (cancelled) return;
          try {
            if (videoRef.current && videoRef.current.readyState >= 2) {
              const codes = await detector.detect(videoRef.current);
              if (codes.length > 0 && codes[0].rawValue) {
                onDetected(codes[0].rawValue.trim());
                onClose();
                return;
              }
            }
          } catch {
            // Keep scanning next frame
          }
          rafId = requestAnimationFrame(scanFrame);
        };

        rafId = requestAnimationFrame(scanFrame);
      } catch {
        if (!cancelled) {
          setErrorMsg('لم يتم منح صلاحية الكاميرا أو لا توجد كاميرا متاحة.');
        }
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen, onDetected, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-admin-border)]">
          <div className="flex items-center gap-2 text-xs font-black text-[var(--color-admin-text)]">
            <Camera size={18} className="text-[var(--color-admin-primary)]" weight="duotone" />
            <span>{title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="w-7 h-7 rounded-lg bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] flex items-center justify-center text-[var(--color-admin-text-muted)] cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          {errorMsg ? (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-700/40 text-amber-200 text-xs flex items-start gap-2.5 leading-relaxed">
              <WarningCircle size={18} className="shrink-0 mt-0.5 text-amber-400" />
              <span>{errorMsg}</span>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-[4/3] border border-[var(--color-admin-border)]">
              <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-8 border-2 border-[var(--color-admin-primary)]/70 rounded-xl pointer-events-none" />
            </div>
          )}
          <p className="text-[11px] text-center text-[var(--color-admin-text-muted)]">
            وجّه الكاميرا نحو باركود بطاقة العميل أو قسيمة الخصم، أو استخدم سكانر الـ USB مباشرة.
          </p>
        </div>
      </div>
    </div>
  );
};
