import React, { useCallback, useEffect, useState } from 'react';
import { Plus, PencilSimple, TrashSimple, Tag, Star, ArrowClockwise } from '@phosphor-icons/react';
import { api } from '../../../services/api';
import { Modal } from '../../ui/Modal';
import { AdminMessage } from '../types';

interface OffersTabProps {
  onMessage: (msg: AdminMessage) => void;
}

interface OfferItem {
  id: string;
  title: string;
  description?: string | null;
  category: string;
  original_price?: number | null;
  offer_price: number;
  image_url?: string | null;
  is_popular: boolean;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
}

export const OffersTab: React.FC<OffersTabProps> = ({ onMessage }) => {
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newOffer, setNewOffer] = useState({
    title: '',
    description: '',
    category: 'بقالة',
    original_price: '',
    offer_price: '',
    image_url: '',
    ends_at: '',
    is_popular: true,
  });

  const [editOffer, setEditOffer] = useState<OfferItem | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category: 'بقالة',
    original_price: '',
    offer_price: '',
    image_url: '',
    ends_at: '',
    is_popular: false,
    is_active: true,
  });

  const loadOffers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAdminOffers();
      setOffers(Array.isArray(data) ? data : []);
    } catch {
      onMessage({ text: 'تعذر تحميل العروض الأسبوعية', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [onMessage]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOffer.title.trim() || !Number(newOffer.offer_price)) return;
    setSaving(true);
    try {
      await api.createAdminOffer({
        title: newOffer.title.trim(),
        description: newOffer.description.trim() || undefined,
        category: newOffer.category,
        original_price: newOffer.original_price ? Number(newOffer.original_price) : null,
        offer_price: Number(newOffer.offer_price),
        image_url: newOffer.image_url.trim() || '',
        ends_at: newOffer.ends_at ? new Date(newOffer.ends_at).toISOString() : null,
        is_popular: newOffer.is_popular,
      });
      onMessage({ text: `تم إضافة عرض "${newOffer.title}" بنجاح`, type: 'success' });
      setNewOffer({
        title: '',
        description: '',
        category: 'بقالة',
        original_price: '',
        offer_price: '',
        image_url: '',
        ends_at: '',
        is_popular: true,
      });
      await loadOffers();
    } catch (err: any) {
      onMessage({ text: err?.message || 'فشل إضافة العرض', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (offer: OfferItem) => {
    setEditOffer(offer);
    setEditForm({
      title: offer.title,
      description: offer.description || '',
      category: offer.category || 'بقالة',
      original_price: offer.original_price ? String(offer.original_price) : '',
      offer_price: String(offer.offer_price),
      image_url: offer.image_url || '',
      ends_at: offer.ends_at ? offer.ends_at.slice(0, 10) : '',
      is_popular: offer.is_popular,
      is_active: offer.is_active,
    });
  };

  const handleEditSave = async () => {
    if (!editOffer) return;
    try {
      await api.updateAdminOffer(editOffer.id, {
        title: editForm.title.trim(),
        description: editForm.description.trim() || null,
        category: editForm.category,
        original_price: editForm.original_price ? Number(editForm.original_price) : null,
        offer_price: Number(editForm.offer_price),
        image_url: editForm.image_url.trim() || null,
        ends_at: editForm.ends_at ? new Date(editForm.ends_at).toISOString() : null,
        is_popular: editForm.is_popular,
        is_active: editForm.is_active,
      });
      onMessage({ text: 'تم تحديث العرض بنجاح', type: 'success' });
      setEditOffer(null);
      await loadOffers();
    } catch (err: any) {
      onMessage({ text: err?.message || 'فشل تحديث العرض', type: 'error' });
    }
  };

  const handleToggleActive = async (offer: OfferItem) => {
    try {
      await api.updateAdminOffer(offer.id, { is_active: !offer.is_active });
      await loadOffers();
    } catch (err: any) {
      onMessage({ text: err?.message || 'تعذر تغيير حالة العرض', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteAdminOffer(id);
      onMessage({ text: 'تم حذف العرض', type: 'success' });
      await loadOffers();
    } catch (err: any) {
      onMessage({ text: err?.message || 'فشل حذف العرض', type: 'error' });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] p-6 rounded-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[var(--color-admin-border)] pb-3">
          <div className="flex items-center gap-2">
            <Tag size={20} className="text-[var(--color-admin-primary)]" weight="duotone" />
            <h2 className="text-sm font-bold">مجلة العروض الأسبوعية (تظهر في تطبيق العميل)</h2>
          </div>
          <span className="text-xs text-[var(--color-admin-text-muted)]">{offers.length} عرض</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-[var(--color-admin-text-muted)] animate-pulse">
            جارٍ تحميل العروض...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {offers.map((offer) => {
              const discountPct =
                offer.original_price && offer.original_price > offer.offer_price
                  ? Math.round(((offer.original_price - offer.offer_price) / offer.original_price) * 100)
                  : null;
              return (
                <div
                  key={offer.id}
                  className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-4 rounded-xl flex gap-3 relative"
                >
                  <img
                    src={offer.image_url || 'https://picsum.photos/seed/grocery-offer/200/200'}
                    alt={offer.title}
                    className="w-16 h-16 rounded-lg object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-black truncate">{offer.title}</span>
                      {offer.is_popular && <Star size={12} weight="fill" className="text-amber-400" />}
                      {discountPct && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[9px] font-bold">
                          وفر {discountPct}%
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[var(--color-admin-text-muted)] line-clamp-2">
                      {offer.description || offer.category}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-black text-[var(--color-admin-primary)]">
                        {offer.offer_price} ج.م
                      </span>
                      {offer.original_price && (
                        <span className="text-[10px] line-through text-[var(--color-admin-text-muted)]">
                          {offer.original_price} ج.م
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(offer)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                          offer.is_active ? 'bg-emerald-950 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {offer.is_active ? 'نشط' : 'مخفي'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(offer)}
                        className="p-1 text-[var(--color-admin-text-muted)] hover:text-[var(--color-admin-primary)] cursor-pointer"
                      >
                        <PencilSimple size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(offer.id)}
                        className="p-1 text-[var(--color-admin-text-muted)] hover:text-rose-500 cursor-pointer"
                      >
                        <TrashSimple size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {offers.length === 0 && (
              <div className="md:col-span-2 py-10 text-center text-xs text-[var(--color-admin-text-muted)]">
                لا توجد عروض أسبوعية بعد — أضف أول عرض من النموذج الجانبي
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] p-6 rounded-2xl flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-[var(--color-admin-border)] pb-3">
          <Plus size={20} className="text-emerald-400" />
          <h2 className="text-sm font-bold">إضافة عرض أسبوعي</h2>
        </div>

        <form onSubmit={handleCreate} className="flex flex-col gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">عنوان العرض</label>
            <input
              type="text"
              required
              value={newOffer.title}
              onChange={(e) => setNewOffer((p) => ({ ...p, title: e.target.value }))}
              placeholder="مثال: باقة الألبان الأسبوعية"
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[var(--color-admin-text-muted)]">السعر بعد العرض (ج.م)</label>
              <input
                type="number"
                step="0.01"
                min="1"
                required
                value={newOffer.offer_price}
                onChange={(e) => setNewOffer((p) => ({ ...p, offer_price: e.target.value }))}
                placeholder="185"
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[var(--color-admin-text-muted)]">السعر قبل (اختياري)</label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={newOffer.original_price}
                onChange={(e) => setNewOffer((p) => ({ ...p, original_price: e.target.value }))}
                placeholder="220"
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[var(--color-admin-text-muted)]">القسم</label>
              <select
                value={newOffer.category}
                onChange={(e) => setNewOffer((p) => ({ ...p, category: e.target.value }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
              >
                <option value="بقالة">بقالة</option>
                <option value="ألبان وطازج">ألبان وطازج</option>
                <option value="مخبوزات">مخبوزات</option>
                <option value="منظفات">منظفات</option>
                <option value="لحوم ودواجن">لحوم ودواجن</option>
                <option value="خضار وفاكهة">خضار وفاكهة</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[var(--color-admin-text-muted)]">ينتهي في</label>
              <input
                type="date"
                value={newOffer.ends_at}
                onChange={(e) => setNewOffer((p) => ({ ...p, ends_at: e.target.value }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">رابط الصورة (اختياري)</label>
            <input
              type="url"
              value={newOffer.image_url}
              onChange={(e) => setNewOffer((p) => ({ ...p, image_url: e.target.value }))}
              placeholder="https://..."
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">الوصف</label>
            <textarea
              value={newOffer.description}
              onChange={(e) => setNewOffer((p) => ({ ...p, description: e.target.value }))}
              placeholder="تفاصيل الأصناف داخل العرض..."
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none h-16 resize-none"
            />
          </div>

          <label className="flex items-center gap-2 font-bold">
            <input
              type="checkbox"
              checked={newOffer.is_popular}
              onChange={(e) => setNewOffer((p) => ({ ...p, is_popular: e.target.checked }))}
            />
            تمييز العرض كنجم الأسبوع
          </label>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] font-black py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-2"
          >
            {saving ? <ArrowClockwise className="animate-spin" size={16} /> : 'نشر العرض الأسبوعي'}
          </button>
        </form>
      </div>

      <Modal isOpen={!!editOffer} onClose={() => setEditOffer(null)} title="تعديل العرض الأسبوعي">
        <div className="flex flex-col gap-3 text-xs">
          <input
            type="text"
            value={editForm.title}
            onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
            className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="0.01"
              value={editForm.offer_price}
              onChange={(e) => setEditForm((p) => ({ ...p, offer_price: e.target.value }))}
              placeholder="السعر"
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
            />
            <input
              type="number"
              step="0.01"
              value={editForm.original_price}
              onChange={(e) => setEditForm((p) => ({ ...p, original_price: e.target.value }))}
              placeholder="قبل الخصم"
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
            />
          </div>
          <textarea
            value={editForm.description}
            onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
            className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none h-16 resize-none"
          />
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 font-bold">
              <input
                type="checkbox"
                checked={editForm.is_active}
                onChange={(e) => setEditForm((p) => ({ ...p, is_active: e.target.checked }))}
              />
              نشط
            </label>
            <label className="flex items-center gap-1.5 font-bold">
              <input
                type="checkbox"
                checked={editForm.is_popular}
                onChange={(e) => setEditForm((p) => ({ ...p, is_popular: e.target.checked }))}
              />
              مميز
            </label>
          </div>
          <button
            type="button"
            onClick={handleEditSave}
            className="w-full bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] font-black py-2.5 rounded-xl cursor-pointer"
          >
            حفظ التعديل
          </button>
        </div>
      </Modal>
    </div>
  );
};
