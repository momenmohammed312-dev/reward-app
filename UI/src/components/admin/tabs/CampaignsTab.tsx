import React, { useCallback, useEffect, useState } from 'react';
import { Megaphone, Plus, TrashSimple, WhatsappLogo, Clock } from '@phosphor-icons/react';
import { api } from '../../../services/api';
import { AdminMessage } from '../types';

interface CampaignsTabProps {
  storeName: string;
  onMessage: (msg: AdminMessage) => void;
}

const WEEK_DAYS = [
  { id: 0, label: 'الأحد' },
  { id: 1, label: 'الإثنين' },
  { id: 2, label: 'الثلاثاء' },
  { id: 3, label: 'الأربعاء' },
  { id: 4, label: 'الخميس' },
  { id: 5, label: 'الجمعة' },
  { id: 6, label: 'السبت' },
];

export const CampaignsTab: React.FC<CampaignsTabProps> = ({ storeName, onMessage }) => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [newCamp, setNewCamp] = useState({
    name: '',
    description: '',
    multiplier: '2',
    days_of_week: [0, 1, 2, 3] as number[],
    start_hour: '9',
    end_hour: '14',
  });
  const [creating, setCreating] = useState(false);

  const [reminderType, setReminderType] = useState<'inactive' | 'expiring'>('inactive');
  const [reminderDays, setReminderDays] = useState(14);
  const [targets, setTargets] = useState<any[]>([]);
  const [template, setTemplate] = useState(
    'أهلاً {name} من {store}! وحشتنا زيارتك — معاك {points} نقطة متاحة في محفظتك جاهزة تصرفها في أي قسيمة خصم الأسبوع ده.'
  );

  const loadCampaigns = useCallback(async () => {
    try {
      const data = await api.getAdminCampaigns();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch {
      onMessage({ text: 'تعذر تحميل الحملات', type: 'error' });
    }
  }, [onMessage]);

  const loadTargets = useCallback(async () => {
    try {
      const res = await api.getReminderTargets(reminderType, reminderDays);
      setTargets(res.targets || []);
    } catch {
      setTargets([]);
    }
  }, [reminderType, reminderDays]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    loadTargets();
  }, [loadTargets]);

  const toggleDay = (dayId: number) => {
    setNewCamp((p) => ({
      ...p,
      days_of_week: p.days_of_week.includes(dayId)
        ? p.days_of_week.filter((d) => d !== dayId)
        : [...p.days_of_week, dayId],
    }));
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCamp.name.trim()) return;
    setCreating(true);
    try {
      await api.createAdminCampaign({
        name: newCamp.name.trim(),
        description: newCamp.description.trim() || undefined,
        campaign_type: 'happy_hour',
        multiplier: Number(newCamp.multiplier) || 2,
        days_of_week: newCamp.days_of_week,
        start_hour: newCamp.start_hour !== '' ? Number(newCamp.start_hour) : null,
        end_hour: newCamp.end_hour !== '' ? Number(newCamp.end_hour) : null,
      });
      onMessage({ text: 'تم تفعيل حملة مضاعفة النقاط بنجاح', type: 'success' });
      setNewCamp((p) => ({ ...p, name: '', description: '' }));
      await loadCampaigns();
    } catch (err: any) {
      onMessage({ text: err?.message || 'فشل إنشاء الحملة', type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleToggleCampaign = async (c: any) => {
    try {
      await api.updateAdminCampaign(c.id, { is_active: !c.is_active });
      await loadCampaigns();
    } catch {
      onMessage({ text: 'فشل تحديث الحملة', type: 'error' });
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    try {
      await api.deleteAdminCampaign(id);
      onMessage({ text: 'تم حذف الحملة', type: 'success' });
      await loadCampaigns();
    } catch {
      onMessage({ text: 'فشل حذف الحملة', type: 'error' });
    }
  };

  const handleSendWhatsApp = async (target: any) => {
    const cleanPhone = String(target.phone || '').replace(/\D/g, '');
    const waPhone = cleanPhone.startsWith('20') ? cleanPhone : `20${cleanPhone.replace(/^0+/, '')}`;
    const text = template
      .replace(/\{name\}/g, target.name || 'عميلنا العزيز')
      .replace(/\{points\}/g, String(target.balance || 0))
      .replace(/\{store\}/g, storeName);
    window.open(`https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
    try {
      await api.logReminder({
        customer_id: target.id,
        channel: 'whatsapp',
        reminder_type: reminderType,
      });
      onMessage({ text: `تم تسجيل إرسال التذكير لـ ${target.name || target.phone}`, type: 'success' });
    } catch {
      // Ignore logging error after opening WhatsApp
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Happy Hours & Multiplier Campaigns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] p-6 rounded-2xl flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--color-admin-border)] pb-3">
            <div className="flex items-center gap-2">
              <Megaphone size={20} className="text-[var(--color-admin-primary)]" weight="duotone" />
              <h2 className="text-sm font-bold">حملات مضاعفة النقاط (Happy Hours ×2)</h2>
            </div>
            <span className="text-xs text-[var(--color-admin-text-muted)]">{campaigns.length} حملات</span>
          </div>

          <div className="flex flex-col gap-3">
            {campaigns.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black">{c.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 text-[10px] font-black">
                      ×{c.multiplier}
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--color-admin-text-muted)] flex items-center gap-1.5">
                    <Clock size={12} />
                    {c.start_hour != null && c.end_hour != null
                      ? `من ${c.start_hour}:00 إلى ${c.end_hour}:00`
                      : 'طوال اليوم'}
                    {Array.isArray(c.days_of_week) && c.days_of_week.length > 0 && (
                      <span>
                        · {c.days_of_week.map((d: number) => WEEK_DAYS.find((w) => w.id === d)?.label).filter(Boolean).join('، ')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleCampaign(c)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                      c.is_active ? 'bg-emerald-950 text-emerald-400' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {c.is_active ? 'مفعّلة' : 'متوقفة'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCampaign(c.id)}
                    className="p-1.5 rounded-lg text-[var(--color-admin-text-muted)] hover:text-rose-400 cursor-pointer"
                  >
                    <TrashSimple size={14} />
                  </button>
                </div>
              </div>
            ))}
            {campaigns.length === 0 && (
              <div className="py-8 text-center text-xs text-[var(--color-admin-text-muted)]">
                لا توجد حملات مضاعفة نشطة حالياً
              </div>
            )}
          </div>
        </div>

        <div className="bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] p-6 rounded-2xl flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-[var(--color-admin-border)] pb-3">
            <Plus size={18} className="text-emerald-400" />
            <h2 className="text-sm font-bold">إنشاء حملة مضاعفة نقاط</h2>
          </div>

          <form onSubmit={handleCreateCampaign} className="flex flex-col gap-3 text-xs">
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[var(--color-admin-text-muted)]">اسم الحملة</label>
              <input
                type="text"
                required
                value={newCamp.name}
                onChange={(e) => setNewCamp((p) => ({ ...p, name: e.target.value }))}
                placeholder="مثال: ساعات الصباح السعيدة ×2"
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <label className="font-bold text-[var(--color-admin-text-muted)]">المضاعف</label>
                <input
                  type="number"
                  step="0.25"
                  min="1.1"
                  max="10"
                  value={newCamp.multiplier}
                  onChange={(e) => setNewCamp((p) => ({ ...p, multiplier: e.target.value }))}
                  className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2 rounded-xl outline-none font-mono"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-bold text-[var(--color-admin-text-muted)]">من الساعة</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={newCamp.start_hour}
                  onChange={(e) => setNewCamp((p) => ({ ...p, start_hour: e.target.value }))}
                  className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2 rounded-xl outline-none font-mono"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-bold text-[var(--color-admin-text-muted)]">إلى الساعة</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={newCamp.end_hour}
                  onChange={(e) => setNewCamp((p) => ({ ...p, end_hour: e.target.value }))}
                  className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2 rounded-xl outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-[var(--color-admin-text-muted)]">أيام الأسبوع</label>
              <div className="flex flex-wrap gap-1.5">
                {WEEK_DAYS.map((d) => {
                  const active = newCamp.days_of_week.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggleDay(d.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                        active
                          ? 'bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] border-transparent'
                          : 'bg-[var(--color-admin-bg)] border-[var(--color-admin-border)] text-[var(--color-admin-text-muted)]'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] font-black py-2.5 rounded-xl cursor-pointer mt-1"
            >
              {creating ? 'جارٍ الحفظ...' : 'تفعيل الحملة'}
            </button>
          </form>
        </div>
      </div>

      {/* WhatsApp Reactivation & Expiry Reminders */}
      <div className="bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] p-6 rounded-2xl flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-admin-border)] pb-3">
          <div className="flex items-center gap-2">
            <WhatsappLogo size={22} className="text-emerald-400" weight="duotone" />
            <h2 className="text-sm font-bold">تنشيط العملاء الغايبين وتذكير النقاط (واتساب)</h2>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={reminderType}
              onChange={(e) => {
                const nextType = e.target.value as 'inactive' | 'expiring';
                setReminderType(nextType);
                setReminderDays(nextType === 'inactive' ? 14 : 7);
                setTemplate(
                  nextType === 'inactive'
                    ? 'أهلاً {name} من {store}! وحشتنا زيارتك — معاك {points} نقطة متاحة في محفظتك جاهزة تصرفها في أي قسيمة خصم الأسبوع ده.'
                    : 'تنبيه من {store} يا {name}: عندك {points} نقطة قربت تنتهي صلاحيتها! زرنا خلال الأيام الجاية واستبدلها بخصم فوري.'
                );
              }}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] px-3 py-1.5 rounded-xl text-xs outline-none"
            >
              <option value="inactive">عملاء غايبين</option>
              <option value="expiring">نقاط قربت تنتهي</option>
            </select>
            <select
              value={reminderDays}
              onChange={(e) => setReminderDays(Number(e.target.value))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] px-3 py-1.5 rounded-xl text-xs outline-none"
            >
              {reminderType === 'inactive' ? (
                <>
                  <option value={14}>أكثر من 14 يوم</option>
                  <option value={21}>أكثر من 21 يوم</option>
                  <option value={30}>أكثر من 30 يوم</option>
                </>
              ) : (
                <>
                  <option value={7}>خلال 7 أيام</option>
                  <option value={14}>خلال 14 يوم</option>
                </>
              )}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-[var(--color-admin-text-muted)]">
            قالب رسالة الواتساب (المتغيرات المتاحة: {'{name}'} · {'{points}'} · {'{store}'})
          </label>
          <textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-3 rounded-xl text-xs outline-none h-16 resize-none"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {targets.map((target) => (
            <div
              key={target.id}
              className="p-3.5 rounded-xl bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">{target.name || 'عميل'}</div>
                <div className="text-[10px] font-mono text-[var(--color-admin-text-muted)]" dir="ltr">
                  {target.phone} · {target.balance} نقطة
                </div>
                <div className="text-[10px] text-amber-400">
                  {reminderType === 'inactive'
                    ? `غائب منذ ${target.days_since_visit ?? reminderDays} يوم`
                    : `تنتهي خلال ${target.days_until_expiry ?? reminderDays} يوم`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSendWhatsApp(target)}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
              >
                <WhatsappLogo size={14} /> إرسال
              </button>
            </div>
          ))}
          {targets.length === 0 && (
            <div className="col-span-full py-6 text-center text-xs text-[var(--color-admin-text-muted)]">
              لا يوجد عملاء مطابقون حالياً لهذا الفلتر
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
