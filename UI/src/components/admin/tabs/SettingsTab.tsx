import React, { useState } from 'react';
import { Coins, Star } from '@phosphor-icons/react';
import { api } from '../../../services/api';
import { AdminMessage, TenantSettingsForm, TierSetting, tierDisplay } from '../types';

interface SettingsTabProps {
  settingsForm: TenantSettingsForm;
  setSettingsForm: React.Dispatch<React.SetStateAction<TenantSettingsForm>>;
  tierSettings: TierSetting[];
  setTierSettings: React.Dispatch<React.SetStateAction<TierSetting[]>>;
  onMessage: (msg: AdminMessage) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  settingsForm,
  setSettingsForm,
  tierSettings,
  setTierSettings,
  onMessage,
}) => {
  const [tiersSaving, setTiersSaving] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateTenantSettings({
        points_per_egp: Number(settingsForm.points_per_egp),
        min_purchase_egp: Number(settingsForm.min_purchase_egp),
        points_expiry_days: settingsForm.points_expiry_days ? Number(settingsForm.points_expiry_days) : null,
        business_type: settingsForm.business_type,
        code_prefix: settingsForm.code_prefix,
        show_menu: settingsForm.show_menu,
        point_value_egp: settingsForm.point_value_egp ? Number(settingsForm.point_value_egp) : 0.05,
        cashier_max_invoice_egp: settingsForm.cashier_max_invoice_egp
          ? Number(settingsForm.cashier_max_invoice_egp)
          : null,
        welcome_bonus_points: settingsForm.welcome_bonus_points
          ? parseInt(settingsForm.welcome_bonus_points, 10)
          : 0,
      });
      onMessage({ text: 'تم حفظ إعدادات الولاء والنشاط بنجاح', type: 'success' });
    } catch (err: any) {
      onMessage({ text: err?.message || 'فشل حفظ الإعدادات', type: 'error' });
    }
  };

  const handleSaveTiers = async (e: React.FormEvent) => {
    e.preventDefault();
    setTiersSaving(true);
    try {
      await api.updateAdminTiers(tierSettings);
      onMessage({ text: 'تم حفظ قواعد فئات العملاء والمضاعفات بنجاح', type: 'success' });
    } catch (err: any) {
      onMessage({ text: err?.message || 'فشل حفظ إعدادات الفئات', type: 'error' });
    } finally {
      setTiersSaving(false);
    }
  };

  const applySupermarketTierPreset = () => {
    setTierSettings([
      { tier_name: 'bronze', multiplier: 1.0, min_earned_points: 0 },
      { tier_name: 'silver', multiplier: 1.1, min_earned_points: 1000 },
      { tier_name: 'gold', multiplier: 1.25, min_earned_points: 3000 },
      { tier_name: 'platinum', multiplier: 1.5, min_earned_points: 8000 },
    ]);
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateTenantSettings({
        name: settingsForm.name,
        primary_color: settingsForm.primary_color,
        accent_color: settingsForm.accent_color,
        bg_color: settingsForm.bg_color,
        surface_color: settingsForm.surface_color,
        font_display: settingsForm.font_display,
        font_body: settingsForm.font_body,
        logo_url: settingsForm.logo_url || null,
        tagline: settingsForm.tagline || null,
      });
      onMessage({ text: 'تم حفظ العلامة التجارية', type: 'success' });
    } catch (err: any) {
      onMessage({ text: err?.message || 'فشل حفظ العلامة التجارية', type: 'error' });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Loyalty Config Card */}
      <div className="bg-[var(--color-admin-surface)] backdrop-blur-xl border border-[var(--color-admin-border)] p-6 rounded-2xl flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-[var(--color-admin-border)] pb-3">
          <Coins size={22} className="text-amber-500" />
          <h2 className="text-sm font-bold">إعدادات برنامج الولاء والهامش</h2>
        </div>

        <form onSubmit={handleSaveSettings} className="flex flex-col gap-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[var(--color-admin-text-muted)]">نوع النشاط</label>
              <select
                value={settingsForm.business_type}
                onChange={(e) => setSettingsForm((p) => ({ ...p, business_type: e.target.value }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
              >
                <option value="cafe">كافيه / مطعم</option>
                <option value="supermarket">سوبر ماركت / هايبر</option>
                <option value="retail">تجزئة / متجر</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[var(--color-admin-text-muted)]">بادئة أكواد الكوبونات</label>
              <input
                type="text"
                maxLength={6}
                value={settingsForm.code_prefix}
                onChange={(e) => setSettingsForm((p) => ({ ...p, code_prefix: e.target.value.toUpperCase() }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none font-mono"
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[var(--color-admin-text-muted)]">النقاط لكل جنيه</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={settingsForm.points_per_egp}
                onChange={(e) => setSettingsForm((p) => ({ ...p, points_per_egp: e.target.value }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[var(--color-admin-text-muted)]">الحد الأدنى للشراء (جنيه)</label>
              <input
                type="number"
                step="0.1"
                value={settingsForm.min_purchase_egp}
                onChange={(e) => setSettingsForm((p) => ({ ...p, min_purchase_egp: e.target.value }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[var(--color-admin-text-muted)]">صلاحية النقاط (أيام)</label>
              <input
                type="number"
                value={settingsForm.points_expiry_days}
                onChange={(e) => setSettingsForm((p) => ({ ...p, points_expiry_days: e.target.value }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[var(--color-admin-text-muted)]">قيمة النقطة (ج.م)</label>
              <input
                type="number"
                step="0.005"
                min="0.001"
                value={settingsForm.point_value_egp}
                onChange={(e) => setSettingsForm((p) => ({ ...p, point_value_egp: e.target.value }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[var(--color-admin-text-muted)]">بونص ترحيبي (نقطة)</label>
              <input
                type="number"
                min="0"
                value={settingsForm.welcome_bonus_points}
                onChange={(e) => setSettingsForm((p) => ({ ...p, welcome_bonus_points: e.target.value }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">
              سقف فاتورة الكاشير بالجنيه (اختياري — أي فاتورة أعلى تتطلب مدير)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              placeholder="مثال: 5000 (اتركه فارغاً لبلا حد)"
              value={settingsForm.cashier_max_invoice_egp}
              onChange={(e) => setSettingsForm((p) => ({ ...p, cashier_max_invoice_egp: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none font-mono"
            />
          </div>

          <div className="flex items-center gap-2 py-1">
            <input
              type="checkbox"
              id="show_menu_toggle"
              checked={settingsForm.show_menu}
              onChange={(e) => setSettingsForm((p) => ({ ...p, show_menu: e.target.checked }))}
            />
            <label htmlFor="show_menu_toggle" className="font-bold text-[var(--color-admin-text-muted)]">
              إظهار تبويب المنيو / العروض الأسبوعية في تطبيق العميل
            </label>
          </div>

          <button
            type="submit"
            className="bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] font-black py-2.5 rounded-xl cursor-pointer hover:opacity-90 transition-all"
          >
            حفظ الإعدادات
          </button>
        </form>

        {/* Tier Multipliers & Thresholds */}
        <div className="border-t border-[var(--color-admin-border)] pt-4 mt-2 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-xs font-black text-[var(--color-admin-text)]">فئات الولاء والمضاعفات</h3>
            <button
              type="button"
              onClick={applySupermarketTierPreset}
              className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[var(--color-admin-primary-soft)] text-[var(--color-admin-primary)] border border-[var(--color-admin-primary)]/30 cursor-pointer"
            >
              إعدادات السوبر ماركت الموصى بها
            </button>
          </div>
          <form onSubmit={handleSaveTiers} className="flex flex-col gap-2 text-xs">
            {tierSettings.map((tr, idx) => (
              <div
                key={tr.tier_name}
                className="grid grid-cols-3 gap-2 items-center bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2 rounded-xl"
              >
                <span className="font-bold text-[var(--color-admin-text)]">{tierDisplay(tr.tier_name)}</span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-[var(--color-admin-text-muted)]">الحد الأدنى (نقطة)</span>
                  <input
                    type="number"
                    min="0"
                    value={tr.min_earned_points}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setTierSettings((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, min_earned_points: val } : item))
                      );
                    }}
                    className="bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] px-2 py-1 rounded-lg outline-none font-mono text-[11px]"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-[var(--color-admin-text-muted)]">المضاعف (x)</span>
                  <input
                    type="number"
                    step="0.05"
                    min="0.1"
                    max="10"
                    value={tr.multiplier}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setTierSettings((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, multiplier: val } : item))
                      );
                    }}
                    className="bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] px-2 py-1 rounded-lg outline-none font-mono text-[11px]"
                  />
                </div>
              </div>
            ))}
            <button
              type="submit"
              disabled={tiersSaving}
              className="bg-[var(--color-admin-bg)] hover:bg-[var(--color-admin-border)] border border-[var(--color-admin-border)] text-[var(--color-admin-text)] font-bold py-2 rounded-xl cursor-pointer transition-all"
            >
              {tiersSaving ? 'جارٍ حفظ الفئات...' : 'حفظ فئات الولاء'}
            </button>
          </form>
        </div>
      </div>

      {/* Branding Card */}
      <div className="bg-[var(--color-admin-surface)] backdrop-blur-xl border border-[var(--color-admin-border)] p-6 rounded-2xl flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-[var(--color-admin-border)] pb-3">
          <Star size={22} className="text-purple-500" />
          <h2 className="text-sm font-bold">العلامة التجارية</h2>
        </div>
        <form onSubmit={handleSaveBranding} className="flex flex-col gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">اسم المتجر / العلامة</label>
            <input
              type="text"
              value={settingsForm.name}
              onChange={(e) => setSettingsForm((p) => ({ ...p, name: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[var(--color-admin-text-muted)]">اللون الأساسي</label>
              <input
                type="color"
                value={settingsForm.primary_color}
                onChange={(e) => setSettingsForm((p) => ({ ...p, primary_color: e.target.value }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2 rounded-xl outline-none h-10 cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[var(--color-admin-text-muted)]">لون التمييز</label>
              <input
                type="color"
                value={settingsForm.accent_color}
                onChange={(e) => setSettingsForm((p) => ({ ...p, accent_color: e.target.value }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2 rounded-xl outline-none h-10 cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[var(--color-admin-text-muted)]">لون الخلفية</label>
              <input
                type="color"
                value={settingsForm.bg_color}
                onChange={(e) => setSettingsForm((p) => ({ ...p, bg_color: e.target.value }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2 rounded-xl outline-none h-10 cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[var(--color-admin-text-muted)]">لون البطاقات</label>
              <input
                type="color"
                value={settingsForm.surface_color}
                onChange={(e) => setSettingsForm((p) => ({ ...p, surface_color: e.target.value }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2 rounded-xl outline-none h-10 cursor-pointer"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">خط العناوين</label>
            <select
              value={settingsForm.font_display}
              onChange={(e) => setSettingsForm((p) => ({ ...p, font_display: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
            >
              <option value="Playfair Display">Playfair Display</option>
              <option value="Cairo">Cairo</option>
              <option value="Almarai">Almarai</option>
              <option value="Noto Kufi Arabic">Noto Kufi Arabic</option>
              <option value="Tajawal">Tajawal</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">خط النصوص</label>
            <select
              value={settingsForm.font_body}
              onChange={(e) => setSettingsForm((p) => ({ ...p, font_body: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
            >
              <option value="Cairo">Cairo</option>
              <option value="Almarai">Almarai</option>
              <option value="Noto Kufi Arabic">Noto Kufi Arabic</option>
              <option value="Tajawal">Tajawal</option>
              <option value="Playfair Display">Playfair Display</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">رابط الشعار (URL)</label>
            <input
              type="url"
              value={settingsForm.logo_url}
              onChange={(e) => setSettingsForm((p) => ({ ...p, logo_url: e.target.value }))}
              placeholder="https://example.com/logo.png"
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">الشعار النصي</label>
            <input
              type="text"
              value={settingsForm.tagline}
              onChange={(e) => setSettingsForm((p) => ({ ...p, tagline: e.target.value }))}
              placeholder="الشعار النصي للعلامة التجارية"
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
            />
          </div>
          <button
            type="submit"
            className="bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] font-black py-2.5 rounded-xl cursor-pointer hover:opacity-90 transition-all"
          >
            حفظ العلامة التجارية
          </button>
        </form>
      </div>
    </div>
  );
};
