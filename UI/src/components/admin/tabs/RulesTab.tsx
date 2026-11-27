import React, { useCallback, useEffect, useState } from 'react';
import { Sliders, Plus, TrashSimple } from '@phosphor-icons/react';
import { api } from '../../../services/api';
import { AdminMessage } from '../types';

interface RulesTabProps {
  onMessage: (msg: AdminMessage) => void;
}

const RULE_TYPE_LABELS: Record<string, string> = {
  exclude_category: 'استثناء قسم كامل من النقاط',
  exclude_sku: 'استثناء صنف / باركود محدد',
  category_multiplier: 'مضاعفة النقاط على قسم',
  basket_bonus: 'بونص إضافي لسلة أكبر من حد معين',
};

export const RulesTab: React.FC<RulesTabProps> = ({ onMessage }) => {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    name: '',
    rule_type: 'category_multiplier' as
      | 'exclude_category'
      | 'exclude_sku'
      | 'category_multiplier'
      | 'basket_bonus',
    target_value: '',
    multiplier: '2',
    min_basket_egp: '500',
    bonus_points: '50',
    priority: '100',
  });

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAdminEarningRules();
      setRules(Array.isArray(data) ? data : []);
    } catch {
      onMessage({ text: 'تعذر تحميل قواعد احتساب النقاط', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [onMessage]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const payload: Record<string, any> = {
        name: form.name.trim(),
        rule_type: form.rule_type,
        priority: Number(form.priority) || 100,
      };
      if (form.rule_type === 'exclude_category' || form.rule_type === 'exclude_sku') {
        payload.target_value = form.target_value.trim();
      } else if (form.rule_type === 'category_multiplier') {
        payload.target_value = form.target_value.trim();
        payload.multiplier = Number(form.multiplier) || 2;
      } else if (form.rule_type === 'basket_bonus') {
        payload.min_basket_egp = Number(form.min_basket_egp) || 500;
        payload.bonus_points = parseInt(form.bonus_points, 10) || 50;
      }

      await api.createAdminEarningRule(payload);
      onMessage({ text: 'تمت إضافة قاعدة النقاط بنجاح', type: 'success' });
      setForm((p) => ({ ...p, name: '', target_value: '' }));
      await loadRules();
    } catch (err: any) {
      onMessage({ text: err?.message || 'فشل إنشاء القاعدة', type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (rule: any) => {
    try {
      await api.updateAdminEarningRule(rule.id, { is_active: !rule.is_active });
      await loadRules();
    } catch {
      onMessage({ text: 'تعذر تحديث حالة القاعدة', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteAdminEarningRule(id);
      onMessage({ text: 'تم حذف القاعدة', type: 'success' });
      await loadRules();
    } catch {
      onMessage({ text: 'تعذر حذف القاعدة', type: 'error' });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] p-6 rounded-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[var(--color-admin-border)] pb-3">
          <div className="flex items-center gap-2">
            <Sliders size={20} className="text-[var(--color-admin-primary)]" weight="duotone" />
            <h2 className="text-sm font-bold">محرك قواعد النقاط والأقسام (Earning Rules)</h2>
          </div>
          <span className="text-xs text-[var(--color-admin-text-muted)]">{rules.length} قاعدة</span>
        </div>

        <div className="flex flex-col gap-3">
          {rules.map((r) => (
            <div
              key={r.id}
              className="p-4 rounded-xl bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black">{r.name}</span>
                  <span className="px-2 py-0.5 rounded-full bg-[var(--color-admin-primary-soft)] text-[var(--color-admin-primary)] text-[10px] font-bold">
                    {RULE_TYPE_LABELS[r.rule_type] || r.rule_type}
                  </span>
                  <span className="text-[10px] text-[var(--color-admin-text-muted)] font-mono">
                    أولوية: {r.priority}
                  </span>
                </div>
                <div className="text-[11px] text-[var(--color-admin-text-muted)]">
                  {r.target_value && <span>الهدف: <strong className="text-[var(--color-admin-text)]">{r.target_value}</strong></span>}
                  {r.multiplier && <span> · مضاعف ×{r.multiplier}</span>}
                  {r.min_basket_egp && <span>سلة ≥ {r.min_basket_egp} ج.م</span>}
                  {r.bonus_points && <span> · بونص +{r.bonus_points} نقطة</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggle(r)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                    r.is_active ? 'bg-emerald-950 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {r.is_active ? 'مفعّلة' : 'متوقفة'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  className="p-1.5 rounded-lg text-[var(--color-admin-text-muted)] hover:text-rose-400 cursor-pointer"
                >
                  <TrashSimple size={14} />
                </button>
              </div>
            </div>
          ))}
          {!loading && rules.length === 0 && (
            <div className="py-10 text-center text-xs text-[var(--color-admin-text-muted)]">
              لا توجد قواعد مخصصة بعد — أضف قاعدة لاستثناء السجاير أو مضاعفة نقاط قسم الألبان أو منح بونص على السلال الكبيرة
            </div>
          )}
        </div>
      </div>

      <div className="bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] p-6 rounded-2xl flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-[var(--color-admin-border)] pb-3">
          <Plus size={18} className="text-emerald-400" />
          <h2 className="text-sm font-bold">إنشاء قاعدة جديدة</h2>
        </div>

        <form onSubmit={handleCreate} className="flex flex-col gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">اسم القاعدة</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="مثال: ضعف نقاط الألبان والأجبان"
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">نوع القاعدة</label>
            <select
              value={form.rule_type}
              onChange={(e) => setForm((p) => ({ ...p, rule_type: e.target.value as any }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
            >
              <option value="category_multiplier">مضاعفة نقاط قسم (Category ×)</option>
              <option value="exclude_category">استثناء قسم كامل من النقاط</option>
              <option value="exclude_sku">استثناء SKU أو باركود محدد</option>
              <option value="basket_bonus">بونص سلة عند تجاوز مبلغ (ج.م)</option>
            </select>
          </div>

          {form.rule_type !== 'basket_bonus' && (
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[var(--color-admin-text-muted)]">
                {form.rule_type === 'exclude_sku' ? 'رمز الصنف SKU أو الباركود' : 'اسم القسم كما يرسله الـ POS'}
              </label>
              <input
                type="text"
                required
                value={form.target_value}
                onChange={(e) => setForm((p) => ({ ...p, target_value: e.target.value }))}
                placeholder={form.rule_type === 'exclude_sku' ? 'CIG-001' : 'ألبان'}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
              />
            </div>
          )}

          {form.rule_type === 'category_multiplier' && (
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[var(--color-admin-text-muted)]">المضاعف (x)</label>
              <input
                type="number"
                step="0.25"
                min="0.1"
                max="20"
                required
                value={form.multiplier}
                onChange={(e) => setForm((p) => ({ ...p, multiplier: e.target.value }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none font-mono"
              />
            </div>
          )}

          {form.rule_type === 'basket_bonus' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-[var(--color-admin-text-muted)]">حد السلة (ج.م)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={form.min_basket_egp}
                  onChange={(e) => setForm((p) => ({ ...p, min_basket_egp: e.target.value }))}
                  className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2 rounded-xl outline-none font-mono"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-bold text-[var(--color-admin-text-muted)]">نقاط البونص</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={form.bonus_points}
                  onChange={(e) => setForm((p) => ({ ...p, bonus_points: e.target.value }))}
                  className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2 rounded-xl outline-none font-mono"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">الأولوية (الأصغر يُنفذ أولاً)</label>
            <input
              type="number"
              min="1"
              max="1000"
              value={form.priority}
              onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2 rounded-xl outline-none font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] font-black py-2.5 rounded-xl cursor-pointer mt-1"
          >
            {creating ? 'جارٍ الحفظ...' : 'إضافة القاعدة'}
          </button>
        </form>
      </div>
    </div>
  );
};
