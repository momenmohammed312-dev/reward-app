import React, { useState } from 'react';
import { Plus, PencilSimple, TrashSimple, ArrowClockwise, WarningCircle } from '@phosphor-icons/react';
import { api } from '../../../services/api';
import { Modal } from '../../ui/Modal';
import { AdminMessage } from '../types';

interface RewardsTabProps {
  rewards: any[];
  businessType: string;
  onMessage: (msg: AdminMessage) => void;
  onRewardsChanged: () => Promise<void>;
}

export const RewardsTab: React.FC<RewardsTabProps> = ({
  rewards,
  businessType,
  onMessage,
  onRewardsChanged,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newReward, setNewReward] = useState({
    title: '',
    description: '',
    pointsRequired: '',
    category: businessType === 'supermarket' ? 'قسائم خصم' : 'عام',
    expiryDays: '30',
    rewardType: (businessType === 'supermarket' ? 'discount_fixed' : 'free_item') as
      | 'free_item'
      | 'discount_fixed'
      | 'discount_percent'
      | 'free_upgrade',
    discountValue: '',
    minOrderEgp: '',
    maxRedemptions: '',
  });

  const [editReward, setEditReward] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    pointsRequired: '',
    category: '',
    expiryDays: '',
    is_active: true,
    rewardType: 'free_item' as 'free_item' | 'discount_fixed' | 'discount_percent' | 'free_upgrade',
    discountValue: '',
    minOrderEgp: '',
    maxRedemptions: '',
  });
  const [deleteRewardId, setDeleteRewardId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReward.title || !newReward.pointsRequired) return;
    setIsCreating(true);
    try {
      await api.createReward({
        title: newReward.title,
        description: newReward.description || undefined,
        points_required: Number(newReward.pointsRequired),
        category: newReward.category,
        expiry_days: Number(newReward.expiryDays) || 30,
        reward_type: newReward.rewardType,
        discount_value: newReward.discountValue ? Number(newReward.discountValue) : undefined,
        min_order_egp: newReward.minOrderEgp ? Number(newReward.minOrderEgp) : undefined,
        max_redemptions: newReward.maxRedemptions ? Number(newReward.maxRedemptions) : undefined,
      });
      onMessage({ text: `تم إنشاء مكافأة "${newReward.title}" بنجاح!`, type: 'success' });
      setNewReward({
        title: '',
        description: '',
        pointsRequired: '',
        category: businessType === 'supermarket' ? 'قسائم خصم' : 'عام',
        expiryDays: '30',
        rewardType: businessType === 'supermarket' ? 'discount_fixed' : 'free_item',
        discountValue: '',
        minOrderEgp: '',
        maxRedemptions: '',
      });
      setShowCreateForm(false);
      await onRewardsChanged();
    } catch (err: any) {
      onMessage({ text: err?.message || 'فشل إنشاء المكافأة', type: 'error' });
    } finally {
      setIsCreating(false);
    }
  };

  const openEdit = (r: any) => {
    setEditReward(r);
    setEditForm({
      title: r.title,
      description: r.description || '',
      pointsRequired: String(r.pointsRequired),
      category: r.category || 'عام',
      expiryDays: String(r.expiryDays || 30),
      is_active: r.is_active !== false,
      rewardType: r.reward_type || 'free_item',
      discountValue: r.discountValue ? String(r.discountValue) : '',
      minOrderEgp: r.minOrderEgp ? String(r.minOrderEgp) : '',
      maxRedemptions: r.maxRedemptions ? String(r.maxRedemptions) : '',
    });
  };

  const handleEditSave = async () => {
    if (!editReward) return;
    try {
      await api.updateReward(editReward.id, {
        title: editForm.title,
        description: editForm.description,
        points_required: Number(editForm.pointsRequired),
        category: editForm.category,
        expiry_days: Number(editForm.expiryDays),
        is_active: editForm.is_active,
        reward_type: editForm.rewardType,
        discount_value: editForm.discountValue ? Number(editForm.discountValue) : null,
        min_order_egp: editForm.minOrderEgp ? Number(editForm.minOrderEgp) : null,
        max_redemptions: editForm.maxRedemptions ? Number(editForm.maxRedemptions) : null,
      });
      onMessage({ text: 'تم تحديث المكافأة بنجاح', type: 'success' });
      await onRewardsChanged();
    } catch (err: any) {
      onMessage({ text: err?.message || 'فشل تحديث المكافأة', type: 'error' });
    }
    setEditReward(null);
  };

  const handleDelete = async () => {
    if (!deleteRewardId) return;
    try {
      await api.deleteReward(deleteRewardId);
      onMessage({ text: 'تم حذف المكافأة', type: 'success' });
      await onRewardsChanged();
    } catch (err: any) {
      onMessage({ text: err?.message || 'فشل حذف المكافأة', type: 'error' });
    }
    setDeleteRewardId(null);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 flex flex-col gap-4">
        <div className="bg-[var(--color-admin-surface)] backdrop-blur-xl border border-[var(--color-admin-border)] p-6 rounded-2xl">
          <div className="flex items-center justify-between border-b border-[var(--color-admin-border)] pb-3 mb-4">
            <h2 className="text-sm font-bold">المكافآت وقسائم الخصم</h2>
            <button
              type="button"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] text-xs font-black px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer hover:opacity-95 transition-opacity"
            >
              <Plus size={14} /> إضافة مكافأة
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rewards.map((reward) => (
              <div
                key={reward.id}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-4 rounded-xl flex gap-3 relative overflow-hidden group"
              >
                <img
                  src={reward.imageUrl}
                  alt={reward.title}
                  className="w-16 h-16 rounded-lg object-cover outline-1 -outline-offset-1 outline-white/10 shrink-0"
                />
                <div className="flex flex-col gap-1 text-right flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-[var(--color-admin-text)]">{reward.title}</span>
                    {reward.reward_type === 'discount_fixed' && reward.discountValue ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                        خصم {reward.discountValue} ج.م
                      </span>
                    ) : reward.reward_type === 'discount_percent' && reward.discountValue ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                        خصم {reward.discountValue}%
                      </span>
                    ) : null}
                  </div>
                  <span className="text-[10px] text-[var(--color-admin-text-muted)] line-clamp-2">
                    {reward.description}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black" style={{ color: 'var(--color-admin-primary)' }}>
                      {reward.pointsRequired} نقطة
                    </span>
                    {reward.minOrderEgp ? (
                      <span className="text-[9px] text-[var(--color-admin-text-muted)]">
                        · حد أدنى {reward.minOrderEgp} ج.م
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 max-md:opacity-100 transition-opacity">
                  <button
                    type="button"
                    aria-label={`تعديل ${reward.title}`}
                    onClick={() => openEdit(reward)}
                    className="p-1.5 rounded-lg bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] text-[var(--color-admin-text-muted)] hover:text-[var(--color-admin-primary)] transition-colors cursor-pointer"
                  >
                    <PencilSimple size={12} />
                  </button>
                  <button
                    type="button"
                    aria-label={`حذف ${reward.title}`}
                    onClick={() => setDeleteRewardId(reward.id)}
                    className="p-1.5 rounded-lg bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] text-[var(--color-admin-text-muted)] hover:text-rose-500 transition-colors cursor-pointer"
                  >
                    <TrashSimple size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className={`bg-[var(--color-admin-surface)] backdrop-blur-xl border border-[var(--color-admin-border)] p-6 rounded-2xl flex flex-col gap-4 ${
          !showCreateForm ? 'hidden lg:flex' : ''
        }`}
      >
        <div className="flex items-center gap-2 border-b border-[var(--color-admin-border)] pb-3">
          <Plus size={22} className="text-emerald-500" />
          <h2 className="text-sm font-bold">إضافة مكافأة جديدة</h2>
        </div>
        <form onSubmit={handleCreate} className="flex flex-col gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <label className="text-[var(--color-admin-text-muted)] font-bold">اسم المكافأة</label>
            <input
              type="text"
              placeholder="مثال: قسيمة خصم 50 ج.م"
              value={newReward.title}
              onChange={(e) => setNewReward((p) => ({ ...p, title: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl text-[var(--color-admin-text)] outline-none focus:border-[var(--color-admin-primary)]"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[var(--color-admin-text-muted)] font-bold">نوع المكافأة</label>
              <select
                value={newReward.rewardType}
                onChange={(e) => setNewReward((p) => ({ ...p, rewardType: e.target.value as any }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl text-[var(--color-admin-text)] outline-none"
              >
                <option value="free_item">منتج مجاني</option>
                <option value="discount_fixed">خصم ثابت (ج.م)</option>
                <option value="discount_percent">خصم نسبة (%)</option>
                <option value="free_upgrade">ترقية مجانية</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[var(--color-admin-text-muted)] font-bold">النقاط المطلوبة</label>
              <input
                type="number"
                placeholder="150"
                value={newReward.pointsRequired}
                onChange={(e) => setNewReward((p) => ({ ...p, pointsRequired: e.target.value }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl text-[var(--color-admin-text)] outline-none focus:border-[var(--color-admin-primary)]"
                required
              />
            </div>
          </div>
          {(newReward.rewardType === 'discount_fixed' || newReward.rewardType === 'discount_percent') && (
            <div className="flex flex-col gap-1">
              <label className="text-[var(--color-admin-text-muted)] font-bold">
                {newReward.rewardType === 'discount_fixed' ? 'قيمة الخصم (ج.م)' : 'نسبة الخصم (%)'}
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                placeholder={newReward.rewardType === 'discount_fixed' ? '50' : '10'}
                value={newReward.discountValue}
                onChange={(e) => setNewReward((p) => ({ ...p, discountValue: e.target.value }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl text-[var(--color-admin-text)] outline-none"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[var(--color-admin-text-muted)] font-bold">حد أدنى للفاتورة (ج.م)</label>
              <input
                type="number"
                step="1"
                min="1"
                placeholder="اختياري"
                value={newReward.minOrderEgp}
                onChange={(e) => setNewReward((p) => ({ ...p, minOrderEgp: e.target.value }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl text-[var(--color-admin-text)] outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[var(--color-admin-text-muted)] font-bold">الحد الأقصى للصرف</label>
              <input
                type="number"
                min="1"
                placeholder="بلا حد"
                value={newReward.maxRedemptions}
                onChange={(e) => setNewReward((p) => ({ ...p, maxRedemptions: e.target.value }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl text-[var(--color-admin-text)] outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[var(--color-admin-text-muted)] font-bold">القسم</label>
              <select
                value={newReward.category}
                onChange={(e) => setNewReward((p) => ({ ...p, category: e.target.value }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl text-[var(--color-admin-text)] outline-none"
              >
                <option value="عام">عام</option>
                <option value="قسائم خصم">قسائم خصم</option>
                <option value="بقالة">بقالة</option>
                <option value="ألبان وطازج">ألبان وطازج</option>
                <option value="مخبوزات">مخبوزات</option>
                <option value="منظفات">منظفات</option>
                <option value="عروض أسبوعية">عروض أسبوعية</option>
                <option value="مشروبات">مشروبات</option>
                <option value="حلويات">حلويات</option>
                <option value="وجبات">وجبات</option>
                <option value="خصومات">خصومات</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[var(--color-admin-text-muted)] font-bold">الصلاحية (أيام)</label>
              <input
                type="number"
                placeholder="30"
                value={newReward.expiryDays}
                onChange={(e) => setNewReward((p) => ({ ...p, expiryDays: e.target.value }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl text-[var(--color-admin-text)] outline-none"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[var(--color-admin-text-muted)] font-bold">الوصف</label>
            <textarea
              placeholder="شروط المكافأة..."
              value={newReward.description}
              onChange={(e) => setNewReward((p) => ({ ...p, description: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl text-[var(--color-admin-text)] outline-none h-20 resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={isCreating}
            className="w-full bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] font-black py-3 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isCreating ? <ArrowClockwise className="animate-spin" size={16} /> : 'إنشاء المكافأة'}
          </button>
        </form>
      </div>

      <Modal isOpen={!!editReward} onClose={() => setEditReward(null)} title="تعديل المكافأة">
        <div className="flex flex-col gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">اسم المكافأة</label>
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none focus:border-[var(--color-admin-primary)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[var(--color-admin-text-muted)]">نوع المكافأة</label>
              <select
                value={editForm.rewardType}
                onChange={(e) => setEditForm((p) => ({ ...p, rewardType: e.target.value as any }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
              >
                <option value="free_item">منتج مجاني</option>
                <option value="discount_fixed">خصم ثابت (ج.م)</option>
                <option value="discount_percent">خصم نسبة (%)</option>
                <option value="free_upgrade">ترقية مجانية</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[var(--color-admin-text-muted)]">النقاط المطلوبة</label>
              <input
                type="number"
                value={editForm.pointsRequired}
                onChange={(e) => setEditForm((p) => ({ ...p, pointsRequired: e.target.value }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none focus:border-[var(--color-admin-primary)]"
              />
            </div>
          </div>
          {(editForm.rewardType === 'discount_fixed' || editForm.rewardType === 'discount_percent') && (
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[var(--color-admin-text-muted)]">
                {editForm.rewardType === 'discount_fixed' ? 'قيمة الخصم (ج.م)' : 'نسبة الخصم (%)'}
              </label>
              <input
                type="number"
                step="0.01"
                min="1"
                value={editForm.discountValue}
                onChange={(e) => setEditForm((p) => ({ ...p, discountValue: e.target.value }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[var(--color-admin-text-muted)]">حد أدنى للفاتورة (ج.م)</label>
              <input
                type="number"
                step="1"
                min="1"
                placeholder="اختياري"
                value={editForm.minOrderEgp}
                onChange={(e) => setEditForm((p) => ({ ...p, minOrderEgp: e.target.value }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[var(--color-admin-text-muted)]">الحد الأقصى للصرف</label>
              <input
                type="number"
                min="1"
                placeholder="بلا حد"
                value={editForm.maxRedemptions}
                onChange={(e) => setEditForm((p) => ({ ...p, maxRedemptions: e.target.value }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">القسم</label>
            <select
              value={editForm.category}
              onChange={(e) => setEditForm((p) => ({ ...p, category: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
            >
              <option value="عام">عام</option>
              <option value="قسائم خصم">قسائم خصم</option>
              <option value="بقالة">بقالة</option>
              <option value="ألبان وطازج">ألبان وطازج</option>
              <option value="مخبوزات">مخبوزات</option>
              <option value="منظفات">منظفات</option>
              <option value="عروض أسبوعية">عروض أسبوعية</option>
              <option value="مشروبات">مشروبات</option>
              <option value="حلويات">حلويات</option>
              <option value="وجبات">وجبات</option>
              <option value="خصومات">خصومات</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">الصلاحية (أيام)</label>
            <input
              type="number"
              value={editForm.expiryDays}
              onChange={(e) => setEditForm((p) => ({ ...p, expiryDays: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">الوصف</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none h-16 resize-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="reward_active"
              checked={editForm.is_active}
              onChange={(e) => setEditForm((p) => ({ ...p, is_active: e.target.checked }))}
            />
            <label htmlFor="reward_active" className="text-xs font-bold">
              مكافأة نشطة
            </label>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={handleEditSave}
              className="flex-1 bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] font-black py-2.5 rounded-xl cursor-pointer hover:opacity-90 transition-all text-xs"
            >
              حفظ التغييرات
            </button>
            <button
              type="button"
              onClick={() => setEditReward(null)}
              className="px-4 py-2.5 rounded-xl border border-[var(--color-admin-border)] text-xs font-bold cursor-pointer hover:bg-[var(--color-admin-bg)] transition-all"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteRewardId} onClose={() => setDeleteRewardId(null)} title="تأكيد حذف المكافأة">
        <div className="flex flex-col gap-4 text-xs">
          <div className="flex items-center gap-2 p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl text-rose-400">
            <WarningCircle size={18} />
            <span>سيتم حذف المكافأة بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDelete}
              className="flex-1 bg-rose-600 text-white font-bold py-2.5 rounded-xl cursor-pointer hover:bg-rose-700 transition-all text-xs"
            >
              تأكيد الحذف
            </button>
            <button
              type="button"
              onClick={() => setDeleteRewardId(null)}
              className="px-4 py-2.5 rounded-xl border border-[var(--color-admin-border)] text-xs font-bold cursor-pointer hover:bg-[var(--color-admin-bg)] transition-all"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
