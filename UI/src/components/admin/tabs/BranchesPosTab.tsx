import React, { useCallback, useEffect, useState } from 'react';
import {
  Storefront,
  Plus,
  MapPin,
  DeviceMobile,
  QrCode,
  PencilSimple,
  TrashSimple,
  WarningCircle,
  PlugsConnected,
  Copy,
  Key,
  Play,
  X,
} from '@phosphor-icons/react';
import { api } from '../../../services/api';
import { Modal } from '../../ui/Modal';
import { AdminMessage, Branch } from '../types';

interface BranchesPosTabProps {
  branches: Branch[];
  businessType: string;
  onOpenQrModal: (branch: Branch) => void;
  onMessage: (msg: AdminMessage) => void;
  onBranchesChanged: () => Promise<void>;
}

const SAMPLE_POS_PAYLOAD = JSON.stringify(
  {
    event: 'order.paid',
    invoice_id: 'MKT-TEST-901',
    customer_phone: '01012345678',
    customer_name: 'متسوّق تجريبي',
    total_amount: 650,
    branch_id: 'nasr-city-1',
    items: [
      { name: 'زيت طعام 1 لتر + أرز', category: 'بقالة', amount: 500 },
      { name: 'علبة سجائر LM', category: 'تبغ', amount: 150 },
    ],
  },
  null,
  2
);

export const BranchesPosTab: React.FC<BranchesPosTabProps> = ({
  branches,
  businessType,
  onOpenQrModal,
  onMessage,
  onBranchesChanged,
}) => {
  const [createOpen, setCreateOpen] = useState(false);
  const [newBranch, setNewBranch] = useState({
    name: '',
    city: '',
    posType: 'manual',
    timezone: 'Africa/Cairo',
    openingTime: '',
    closingTime: '',
  });
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    city: '',
    posType: 'manual',
    is_active: true,
    timezone: 'Africa/Cairo',
    openingTime: '',
    closingTime: '',
  });
  const [deleteBranchId, setDeleteBranchId] = useState<string | null>(null);

  // POS Bridge state
  const [posConfig, setPosConfig] = useState<any | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [testJson, setTestJson] = useState(SAMPLE_POS_PAYLOAD);
  const [testTier, setTestTier] = useState('bronze');
  const [testResult, setTestResult] = useState<any | null>(null);
  const [testing, setTesting] = useState(false);

  const loadPosConfig = useCallback(async () => {
    try {
      const cfg = await api.getAdminPosConfig();
      setPosConfig(cfg);
      setKeywords(Array.isArray(cfg.excluded_item_keywords) ? cfg.excluded_item_keywords : []);
    } catch {
      // Ignore if backend route unavailable in offline mock
    }
  }, []);

  useEffect(() => {
    loadPosConfig();
  }, [loadPosConfig]);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranch.name) return;
    try {
      await api.createBranch(newBranch);
      onMessage({ text: 'تم إنشاء الفرع بنجاح', type: 'success' });
      setCreateOpen(false);
      setNewBranch({ name: '', city: '', posType: 'manual', timezone: 'Africa/Cairo', openingTime: '', closingTime: '' });
      await Promise.all([onBranchesChanged(), loadPosConfig()]);
    } catch (err: any) {
      onMessage({ text: err?.message || 'فشل إنشاء الفرع', type: 'error' });
    }
  };

  const openEdit = (b: Branch) => {
    setEditBranch(b);
    setEditForm({
      name: b.name,
      city: b.location,
      posType: b.posType,
      is_active: b.active,
      timezone: b.timezone,
      openingTime: b.openingTime || '',
      closingTime: b.closingTime || '',
    });
  };

  const handleEditBranch = async () => {
    if (!editBranch) return;
    try {
      await api.updateBranch(editBranch.id, editForm);
      onMessage({ text: 'تم تحديث الفرع بنجاح', type: 'success' });
      setEditBranch(null);
      await Promise.all([onBranchesChanged(), loadPosConfig()]);
    } catch (err: any) {
      onMessage({ text: err?.message || 'فشل تحديث الفرع', type: 'error' });
    }
  };

  const handleDeleteBranch = async () => {
    if (!deleteBranchId) return;
    try {
      await api.deleteBranch(deleteBranchId);
      onMessage({ text: 'تم حذف الفرع', type: 'success' });
      setDeleteBranchId(null);
      await Promise.all([onBranchesChanged(), loadPosConfig()]);
    } catch (err: any) {
      onMessage({ text: err?.message || 'فشل حذف الفرع', type: 'error' });
    }
  };

  const handleSaveKeywords = async (nextList: string[]) => {
    setKeywords(nextList);
    try {
      await api.updateTenantSettings({ excluded_item_keywords: nextList });
      onMessage({ text: 'تم تحديث قائمة الأصناف المستبعدة', type: 'success' });
    } catch (err: any) {
      onMessage({ text: err?.message || 'تعذر حفظ الأصناف المستبعدة', type: 'error' });
    }
  };

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newKeyword.trim();
    if (!trimmed || keywords.includes(trimmed)) return;
    setNewKeyword('');
    await handleSaveKeywords([...keywords, trimmed]);
  };

  const handleRunSimulation = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const parsed = JSON.parse(testJson);
      const res = await api.testAdminPosWebhook(parsed, testTier);
      setTestResult(res);
    } catch (err: any) {
      onMessage({ text: err?.message || 'تأكد من صحة JSON الفاتورة', type: 'error' });
    } finally {
      setTesting(false);
    }
  };

  const handleRegenerateKey = async (branchId: string) => {
    try {
      await api.regenerateBranchApiKey(branchId);
      onMessage({ text: 'تم توليد مفتاح API جديد للفرع', type: 'success' });
      await loadPosConfig();
    } catch {
      onMessage({ text: 'فشل إعادة توليد المفتاح', type: 'error' });
    }
  };

  const apiRoot = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');
  const webhookCustomUrl = posConfig ? `${apiRoot}/webhooks/custom_api/${posConfig.tenant_id}` : '';

  return (
    <div className="flex flex-col gap-6">
      {/* Branches Grid */}
      <div className="bg-[var(--color-admin-surface)] backdrop-blur-xl border border-[var(--color-admin-border)] p-6 rounded-2xl">
        <div className="flex items-center justify-between border-b border-[var(--color-admin-border)] pb-3 mb-6">
          <div className="flex items-center gap-2">
            <Storefront size={22} style={{ color: 'var(--color-admin-primary)' }} />
            <h2 className="text-sm font-bold">إدارة الفروع وأكواد QR</h2>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] text-xs font-black px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer hover:opacity-90 transition-all"
          >
            <Plus size={14} /> تسجيل فرع جديد
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-5 rounded-2xl flex flex-col gap-3 relative"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-[var(--color-admin-text)]">{branch.name}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    branch.active
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
                      : 'bg-rose-950 text-rose-400 border border-rose-800/40'
                  }`}
                >
                  {branch.active ? 'نشط' : 'معطل'}
                </span>
              </div>
              <div className="flex flex-col gap-1 text-[11px] text-[var(--color-admin-text-muted)]">
                <span className="flex items-center gap-1.5">
                  <MapPin size={12} /> {branch.location}
                </span>
                <span className="flex items-center gap-1.5">
                  <DeviceMobile size={12} /> {branch.posType}
                </span>
                <span className="flex items-center gap-1.5 text-[10px]">{branch.timezone}</span>
              </div>
              <div className="flex gap-2 mt-2 pt-3 border-t border-[var(--color-admin-border)]">
                <button
                  type="button"
                  onClick={() => onOpenQrModal(branch)}
                  className="flex-1 bg-[var(--color-admin-primary-soft)] hover:bg-[var(--color-admin-primary)] hover:text-[var(--color-admin-bg)] border border-[var(--color-admin-primary)]/25 text-[var(--color-admin-primary)] text-[10px] font-bold py-1.5 px-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <QrCode size={13} weight="duotone" />
                  {businessType === 'cafe' ? 'كود QR للطاولات' : 'كود QR للفرع'}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(branch)}
                  className="bg-[var(--color-admin-bg)] hover:bg-[var(--color-admin-border)] text-[10px] font-bold py-1.5 px-2.5 rounded-lg cursor-pointer text-[var(--color-admin-text-muted)] flex items-center justify-center gap-1"
                >
                  <PencilSimple size={12} /> تعديل
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteBranchId(branch.id)}
                  className="bg-rose-950/30 hover:bg-rose-950/50 p-1.5 rounded-lg text-rose-500 cursor-pointer"
                >
                  <TrashSimple size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* POS Bridge & Dry-Run Webhook Tester */}
      {posConfig && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] p-6 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-[var(--color-admin-border)] pb-3">
              <PlugsConnected size={20} className="text-[var(--color-admin-primary)]" weight="duotone" />
              <h2 className="text-sm font-bold">ربط الكاشير المحلي (Odoo / Custom POS API)</h2>
            </div>

            <div className="flex flex-col gap-1.5 text-xs">
              <label className="text-[11px] font-bold text-[var(--color-admin-text-muted)]">
                رابط Webhook المخصص للسوبر ماركت (POST Async)
              </label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  dir="ltr"
                  value={webhookCustomUrl}
                  className="flex-1 bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2 rounded-xl font-mono text-[11px]"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(webhookCustomUrl);
                    onMessage({ text: 'تم نسخ رابط الـ Webhook', type: 'success' });
                  }}
                  className="p-2 rounded-xl bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] cursor-pointer"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] flex flex-col gap-1 text-[11px]">
              <span className="font-bold text-[var(--color-admin-primary)]">
                نقاط الربط اللحظي المتزامنة للكاشير (Sync POS API عبر Header: x-api-key)
              </span>
              <div className="font-mono text-[10px] text-[var(--color-admin-text-muted)] space-y-0.5" dir="ltr">
                <div>GET  {apiRoot}/pos/customer/:identifier</div>
                <div>POST {apiRoot}/pos/earn</div>
                <div>POST {apiRoot}/pos/redeem</div>
                <div>POST {apiRoot}/pos/refund</div>
              </div>
            </div>

            <div className="flex flex-col gap-2 text-xs">
              <label className="text-[11px] font-bold text-[var(--color-admin-text-muted)]">
                مفاتيح الـ API لكل فرع (لتوقيع HMAC-SHA256)
              </label>
              {(posConfig.branches || []).map((b: any) => (
                <div
                  key={b.id}
                  className="p-2.5 rounded-xl bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-[11px]">{b.name}</div>
                    <div className="font-mono text-[10px] text-[var(--color-admin-text-muted)] truncate" dir="ltr">
                      {b.api_key || 'غير مولد'}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {b.api_key && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(b.api_key);
                          onMessage({ text: 'تم نسخ المفتاح', type: 'success' });
                        }}
                        className="p-1.5 rounded-lg border border-[var(--color-admin-border)] cursor-pointer"
                        title="نسخ المفتاح"
                      >
                        <Copy size={12} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRegenerateKey(b.id)}
                      className="px-2 py-1 rounded-lg border border-[var(--color-admin-border)] text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Key size={11} /> تجديد
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Excluded Keywords */}
            <div className="flex flex-col gap-2 border-t border-[var(--color-admin-border)] pt-3">
              <label className="text-[11px] font-bold text-[var(--color-admin-text-muted)]">
                الأصناف المستبعدة من النقاط (تُخصم تلقائياً من فاتورة الـ POS)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-950/40 border border-rose-800/40 text-rose-300 text-[11px] font-bold"
                  >
                    {kw}
                    <button
                      type="button"
                      onClick={() => handleSaveKeywords(keywords.filter((k) => k !== kw))}
                      className="hover:text-white cursor-pointer"
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
              <form onSubmit={handleAddKeyword} className="flex gap-2">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="أضف صنف مستبعد (مثال: ألبان أطفال)..."
                  className="flex-1 bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] px-3 py-1.5 rounded-xl text-xs outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] text-xs font-black cursor-pointer"
                >
                  إضافة
                </button>
              </form>
            </div>
          </div>

          {/* Dry-Run Simulator */}
          <div className="bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] p-6 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[var(--color-admin-border)] pb-3">
              <h2 className="text-sm font-bold">مُختبر فاتورة POS (محاكاة بدون تسجيل)</h2>
              <select
                value={testTier}
                onChange={(e) => setTestTier(e.target.value)}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] px-2.5 py-1 rounded-lg text-[11px]"
              >
                <option value="bronze">فئة عادي</option>
                <option value="silver">فئة فضي</option>
                <option value="gold">فئة ذهبي</option>
                <option value="platinum">فئة بلاتيني</option>
              </select>
            </div>

            <textarea
              dir="ltr"
              value={testJson}
              onChange={(e) => setTestJson(e.target.value)}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-3 rounded-xl font-mono text-[11px] h-48 outline-none resize-none"
            />

            <button
              type="button"
              disabled={testing}
              onClick={handleRunSimulation}
              className="w-full bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Play size={14} weight="fill" />
              {testing ? 'جارٍ الاختبار...' : 'اختبر الحسبة واستبعاد الأصناف'}
            </button>

            {testResult && (
              <div className="p-3.5 rounded-xl bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] text-xs flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <span className="text-[var(--color-admin-text-muted)]">إجمالي الفاتورة:</span>
                  <span className="font-mono font-bold">{testResult.rawTotal} ج.م</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-admin-text-muted)]">المستبعد (سجائر/شحن...):</span>
                  <span className="font-mono font-bold text-rose-400">-{testResult.excludedTotal} ج.م</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--color-admin-text-muted)]">الصافي المؤهل للنقاط:</span>
                  <span className="font-mono font-bold">{testResult.eligibleTotal} ج.م</span>
                </div>
                <div className="flex justify-between border-t border-[var(--color-admin-border)] pt-1.5 mt-1">
                  <span className="font-bold">النقاط المستحقة للعميل:</span>
                  <span className="font-mono font-black text-emerald-400">+{testResult.pointsEarned} نقطة</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals for Branch CRUD */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="تسجيل فرع جديد">
        <form onSubmit={handleCreateBranch} className="flex flex-col gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">اسم الفرع</label>
            <input
              type="text"
              value={newBranch.name}
              onChange={(e) => setNewBranch((p) => ({ ...p, name: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">المدينة</label>
            <input
              type="text"
              value={newBranch.city}
              onChange={(e) => setNewBranch((p) => ({ ...p, city: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">نظام POS</label>
            <select
              value={newBranch.posType}
              onChange={(e) => setNewBranch((p) => ({ ...p, posType: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
            >
              <option value="manual">يدوي (شاشة الكاشير)</option>
              <option value="custom_api">API عام / POS سوبر ماركت (Odoo / ERP)</option>
              <option value="foodics">Foodics</option>
              <option value="square">Square</option>
              <option value="toast">Toast</option>
            </select>
          </div>
          <button
            type="submit"
            className="bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] font-black py-2.5 rounded-xl cursor-pointer mt-2"
          >
            إنشاء الفرع
          </button>
        </form>
      </Modal>

      <Modal isOpen={!!editBranch} onClose={() => setEditBranch(null)} title="تعديل الفرع">
        <div className="flex flex-col gap-3 text-xs">
          <input
            type="text"
            value={editForm.name}
            onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
            className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
          />
          <input
            type="text"
            value={editForm.city}
            onChange={(e) => setEditForm((p) => ({ ...p, city: e.target.value }))}
            className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
          />
          <select
            value={editForm.posType}
            onChange={(e) => setEditForm((p) => ({ ...p, posType: e.target.value }))}
            className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
          >
            <option value="manual">يدوي (شاشة الكاشير)</option>
            <option value="custom_api">API عام / POS سوبر ماركت (Odoo / ERP)</option>
            <option value="foodics">Foodics</option>
            <option value="square">Square</option>
            <option value="toast">Toast</option>
          </select>
          <label className="flex items-center gap-2 font-bold">
            <input
              type="checkbox"
              checked={editForm.is_active}
              onChange={(e) => setEditForm((p) => ({ ...p, is_active: e.target.checked }))}
            />
            فرع نشط
          </label>
          <button
            type="button"
            onClick={handleEditBranch}
            className="bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] font-black py-2.5 rounded-xl cursor-pointer"
          >
            حفظ التغييرات
          </button>
        </div>
      </Modal>

      <Modal isOpen={!!deleteBranchId} onClose={() => setDeleteBranchId(null)} title="تأكيد حذف الفرع">
        <div className="flex flex-col gap-4 text-xs">
          <div className="flex items-center gap-2 p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl text-rose-400">
            <WarningCircle size={18} />
            <span>سيتم حذف الفرع وجميع إعداداته. هذا الإجراء نهائي.</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDeleteBranch}
              className="flex-1 bg-rose-600 text-white font-bold py-2.5 rounded-xl cursor-pointer"
            >
              تأكيد الحذف
            </button>
            <button
              type="button"
              onClick={() => setDeleteBranchId(null)}
              className="px-4 py-2.5 rounded-xl border border-[var(--color-admin-border)] font-bold cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
