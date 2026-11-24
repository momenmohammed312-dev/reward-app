import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  Copy,
  DownloadSimple,
  Printer,
  QrCode,
  Storefront,
  X,
} from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';

export interface QrBranchInfo {
  id: string;
  name: string;
  location?: string;
}

interface BranchQrModalProps {
  branch: QrBranchInfo | null;
  tenantSlug: string;
  tenantName: string;
  onClose: () => void;
}

const TABLE_PRESETS = ['', '1', '2', '3', '4', '5'];

export const BranchQrModal: React.FC<BranchQrModalProps> = ({
  branch,
  tenantSlug,
  tenantName,
  onClose,
}) => {
  const [tableNumber, setTableNumber] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const trimmedTable = tableNumber.trim();
  const qrUrl = branch
    ? `${window.location.origin}/?tenant=${encodeURIComponent(tenantSlug)}&branch=${encodeURIComponent(branch.id)}${trimmedTable ? `&table=${encodeURIComponent(trimmedTable)}` : ''}`
    : '';

  useEffect(() => {
    setTableNumber('');
    setCopied(false);
  }, [branch?.id]);

  useEffect(() => {
    if (!qrUrl) {
      setQrDataUrl('');
      return;
    }

    let cancelled = false;
    QRCode.toDataURL(qrUrl, {
      width: 512,
      margin: 2,
      color: {
        dark: '#1f1a17',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('');
      });

    return () => {
      cancelled = true;
    };
  }, [qrUrl]);

  useEffect(() => {
    if (!branch) return;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [branch, onClose]);

  const handleCopy = async () => {
    if (!qrUrl) return;
    try {
      await navigator.clipboard.writeText(qrUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback ignored gracefully if clipboard API unavailable
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl || !branch) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qr-${branch.name.replace(/\s+/g, '-')}${trimmedTable ? `-table-${trimmedTable}` : ''}.png`;
    a.click();
  };

  const handlePrint = () => {
    if (!qrDataUrl || !branch || !qrDataUrl.startsWith('data:image/png;base64,')) return;
    const printWin = window.open('', '_blank', 'width=480,height=640');
    if (!printWin) return;
    const tableLabel = trimmedTable ? `طاولة رقم #${trimmedTable}` : 'مسح سريع للفرع';
    const doc = printWin.document;
    doc.open();
    doc.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8" />
<title></title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #fff; color: #1f1a17; }
  .card { width: 320px; padding: 28px 24px; border: 2px solid #d99b52; border-radius: 24px; text-align: center; box-shadow: 0 12px 30px rgba(0,0,0,0.08); }
  .brand { font-size: 20px; font-weight: 900; margin: 0 0 4px; color: #1f1a17; }
  .branch { font-size: 13px; font-weight: 700; color: #6b4a35; margin: 0 0 12px; }
  .pill { display: inline-block; padding: 4px 12px; border-radius: 999px; background: rgba(217,155,82,0.16); color: #6b4a35; font-size: 12px; font-weight: 800; margin-bottom: 16px; }
  img { width: 220px; height: 220px; display: block; margin: 0 auto 16px; border-radius: 12px; border: 1px solid #ece9e3; }
  .cta { font-size: 13px; font-weight: 700; margin: 0; color: #1f2937; }
  .sub { font-size: 11px; color: #6b7280; margin: 4px 0 0; }
</style>
</head>
<body>
  <div class="card">
    <h1 class="brand" id="qr-brand"></h1>
    <p class="branch" id="qr-branch"></p>
    <div class="pill" id="qr-pill"></div>
    <img id="qr-img" alt="QR Code" />
    <p class="cta">امسح الكود بالكاميرا واجمع نقاطك فوراً</p>
    <p class="sub">بدون تحميل تطبيق · تسجيل برقم الهاتف</p>
  </div>
</body>
</html>`);
    doc.close();
    doc.title = `QR - ${branch.name}`;
    const brandEl = doc.getElementById('qr-brand');
    const branchEl = doc.getElementById('qr-branch');
    const pillEl = doc.getElementById('qr-pill');
    const imgEl = doc.getElementById('qr-img') as HTMLImageElement | null;
    if (brandEl) brandEl.textContent = tenantName;
    if (branchEl) branchEl.textContent = branch.name;
    if (pillEl) pillEl.textContent = tableLabel;
    if (imgEl) imgEl.src = qrDataUrl;
    printWin.addEventListener('load', () => printWin.print(), { once: true });
    if (doc.readyState === 'complete') {
      setTimeout(() => printWin.print(), 50);
    }
  };

  return (
    <AnimatePresence>
      {branch && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="qr-modal-title"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
            className="w-full max-w-xl bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.55)] overflow-hidden"
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-admin-border)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[var(--color-admin-primary-soft)] border border-[var(--color-admin-primary)]/30 flex items-center justify-center text-[var(--color-admin-primary)]">
                  <QrCode size={20} weight="duotone" />
                </div>
                <div>
                  <h2 id="qr-modal-title" className="text-sm font-black text-[var(--color-admin-text)]">
                    استوديو QR للطاولات والفروع
                  </h2>
                  <p className="text-[11px] text-[var(--color-admin-text-muted)] flex items-center gap-1 mt-0.5">
                    <Storefront size={12} weight="duotone" />
                    {branch.name}
                    {branch.location ? ` · ${branch.location}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق"
                className="w-8 h-8 rounded-xl bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] flex items-center justify-center text-[var(--color-admin-text-muted)] hover:text-[var(--color-admin-text)] transition-colors cursor-pointer active:scale-[0.96]"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 max-h-[80vh] overflow-y-auto overscroll-contain flex flex-col gap-5">
              {/* Table Number Controls */}
              <div className="flex flex-col gap-2.5">
                <label htmlFor="qr-table-input" className="text-xs font-bold text-[var(--color-admin-text-muted)]">
                  تخصيص رقم الطاولة (اختياري)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {TABLE_PRESETS.map((preset) => {
                    const active = trimmedTable === preset;
                    return (
                      <button
                        key={preset || 'general'}
                        type="button"
                        onClick={() => setTableNumber(preset)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-colors duration-150 enabled:active:scale-[0.96] cursor-pointer ${
                          active
                            ? 'bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] border-transparent'
                            : 'bg-[var(--color-admin-bg)] text-[var(--color-admin-text-muted)] border-[var(--color-admin-border)] hover:text-[var(--color-admin-text)]'
                        }`}
                      >
                        {preset ? `طاولة ${preset}` : 'فرع عام'}
                      </button>
                    );
                  })}
                </div>
                <input
                  id="qr-table-input"
                  type="text"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="أو اكتب رقم/اسم الطاولة (مثال: A4 أو 12)..."
                  className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] focus:border-[var(--color-admin-primary)] rounded-xl px-3.5 py-2.5 text-xs text-[var(--color-admin-text)] outline-none transition-colors"
                />
              </div>

              {/* Standee Live Preview Card */}
              <div className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] rounded-2xl p-5 flex flex-col items-center text-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-[var(--color-admin-text)]">{tenantName}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--color-admin-primary-soft)] text-[var(--color-admin-primary)] border border-[var(--color-admin-primary)]/30">
                    {trimmedTable ? `طاولة #${trimmedTable}` : branch.name}
                  </span>
                </div>

                {qrDataUrl ? (
                  <div className="p-3 bg-white rounded-2xl shadow-lg ring-1 ring-black/10">
                    <img
                      src={qrDataUrl}
                      alt={`QR ${branch.name}`}
                      className="w-48 h-48 block rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="w-52 h-52 rounded-2xl bg-[var(--color-admin-surface)] animate-pulse" />
                )}

                <p className="text-xs font-bold text-[var(--color-admin-text)]">
                  امسح الكود بالكاميرا واكسب نقاطك فوراً
                </p>

                <div
                  dir="ltr"
                  className="w-full px-3 py-2 rounded-xl bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] text-[10px] font-mono text-[var(--color-admin-text-muted)] truncate"
                >
                  {qrUrl}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-4 py-2.5 rounded-xl bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] hover:border-[var(--color-admin-primary)] text-xs font-bold text-[var(--color-admin-text)] flex items-center justify-center gap-2 transition-colors active:scale-[0.96] cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check size={16} weight="bold" className="text-emerald-400" />
                      <span className="text-emerald-400">تم النسخ</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} weight="duotone" />
                      <span>نسخ الرابط</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!qrDataUrl}
                  className="px-4 py-2.5 rounded-xl bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] hover:border-[var(--color-admin-primary)] disabled:opacity-50 text-xs font-bold text-[var(--color-admin-text)] flex items-center justify-center gap-2 transition-colors active:scale-[0.96] cursor-pointer"
                >
                  <DownloadSimple size={16} weight="duotone" />
                  <span>تحميل PNG</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  disabled={!qrDataUrl}
                  className="px-4 py-2.5 rounded-xl bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] hover:opacity-95 disabled:opacity-50 text-xs font-black flex items-center justify-center gap-2 transition-opacity active:scale-[0.96] cursor-pointer"
                >
                  <Printer size={16} weight="duotone" />
                  <span>طباعة الكارت</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
