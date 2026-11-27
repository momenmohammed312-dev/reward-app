import React, { useCallback, useEffect, useState } from 'react';
import { UserCheck, ShieldCheck, Plus, ArrowClockwise } from '@phosphor-icons/react';
import { api } from '../../../services/api';
import { Modal } from '../../ui/Modal';
import { AdminMessage, Branch } from '../types';

interface StaffAuditTabProps {
  branches: Branch[];
  onMessage: (msg: AdminMessage) => void;
}

const ACTION_LABELS_AR: Record<string, string> = {
  cashier_invoice_earn: 'تسجيل فاتورة كاشير',
  manual_points_grant: 'منح نقاط يدوي',
  adjust_points: 'تعديل رصيد نقاط',
  refund_transaction: 'استرجاع نقاط فاتورة',
  process_redemption: 'صرف قسيمة عند الكاشير',
  create_reward: 'إنشاء مكافأة',
  update_reward: 'تعديل مكافأة',
  delete_reward: 'حذف مكافأة',
  create_branch: 'إضافة فرع',
  update_branch: 'تعديل فرع',
  delete_branch: 'حذف فرع',
  create_staff: 'إضافة موظف',
  update_staff: 'تحديث بيانات موظف',
  assign_branch: 'تغيير فرع موظف',
  create_offer: 'إضافة عرض أسبوعي',
  update_offer: 'تعديل عرض أسبوعي',
  create_campaign: 'إنشاء حملة مضاعفة',
  send_reminder: 'إرسال تذكير واتساب',
  update_tiers: 'تحديث فئات الولاء',
};

export const StaffAuditTab: React.FC<StaffAuditTabProps> = ({ branches, onMessage }) => {
  const [subView, setSubView] = useState<'staff' | 'audit'>('staff');
  const [staff, setStaff] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    password: '',
    role: 'cashier' as 'cashier' | 'manager',
    branch_id: '',
  });
  const [creating, setCreating] = useState(false);

  const loadStaff = useCallback(async () => {
    try {
      const list = await api.getAdminStaff();
      setStaff(Array.isArray(list) ? list : []);
    } catch {
      onMessage({ text: 'تعذر تحميل قائمة الموظفين', type: 'error' });
    }
  }, [onMessage]);

  const loadAudit = useCallback(async () => {
    try {
      const res = await api.getAdminAuditLog({
        action_type: actionFilter || undefined,
        page: auditPage,
        limit: 40,
      });
      setAuditLogs(res.logs || []);
      setAuditTotal(Number(res.total || 0));
    } catch {
      onMessage({ text: 'تعذر تحميل سجل المراقبة', type: 'error' });
    }
  }, [actionFilter, auditPage, onMessage]);

  useEffect(() => {
    if (subView === 'staff') loadStaff();
    else loadAudit();
  }, [subView, loadStaff, loadAudit]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await api.createAdminStaff({
        name: newStaff.name.trim(),
        email: newStaff.email.trim(),
        password: newStaff.password,
        role: newStaff.role,
        branch_id: newStaff.branch_id || null,
      });
      onMessage({ text: 'تم إنشاء حساب الموظف بنجاح', type: 'success' });
      setCreateOpen(false);
      setNewStaff({ name: '', email: '', password: '', role: 'cashier', branch_id: '' });
      await loadStaff();
    } catch (err: any) {
      onMessage({ text: err?.message || 'فشل إضافة الموظف', type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  const handleBranchChange = async (userId: string, branchId: string) => {
    try {
      await api.assignStaffBranch(userId, branchId || null);
      onMessage({ text: 'تم تحديث فرع الموظف', type: 'success' });
      await loadStaff();
    } catch {
      onMessage({ text: 'فشل تحديث الفرع', type: 'error' });
    }
  };

  const handleToggleActive = async (member: any) => {
    try {
      await api.updateAdminStaff(member.id, { is_active: !member.is_active });
      onMessage({ text: member.is_active ? 'تم إيقاف حساب الموظف' : 'تم تفعيل حساب الموظف', type: 'success' });
      await loadStaff();
    } catch (err: any) {
      onMessage({ text: err?.message || 'غير مسموح بتعديل هذا الحساب', type: 'error' });
    }
  };

  return (
    <div className="bg-[var(--color-admin-surface)] border border-[var(--color-admin-border)] rounded-2xl overflow-hidden flex flex-col">
      <div className="p-5 border-b border-[var(--color-admin-border)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)]">
          <button
            type="button"
            onClick={() => setSubView('staff')}
            className={`px-3.5 py-2 rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer ${
              subView === 'staff'
                ? 'bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)]'
                : 'text-[var(--color-admin-text-muted)]'
            }`}
          >
            <UserCheck size={15} weight="duotone" />
            الموظفين والكاشير ({staff.length})
          </button>
          <button
            type="button"
            onClick={() => setSubView('audit')}
            className={`px-3.5 py-2 rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer ${
              subView === 'audit'
                ? 'bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)]'
                : 'text-[var(--color-admin-text-muted)]'
            }`}
          >
            <ShieldCheck size={15} weight="duotone" />
            سجل المراقبة (Audit Log)
          </button>
        </div>

        {subView === 'staff' ? (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] text-xs font-black px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} weight="bold" /> إضافة كاشير / مدير
          </button>
        ) : (
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setAuditPage(1);
            }}
            className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] px-3 py-2 rounded-xl text-xs outline-none"
          >
            <option value="">كل العمليات</option>
            {Object.entries(ACTION_LABELS_AR).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="overflow-x-auto">
        {subView === 'staff' ? (
          <table className="w-full text-right text-xs">
            <thead className="bg-[var(--color-admin-bg)] text-[var(--color-admin-text-muted)] text-[10px] font-bold border-b border-[var(--color-admin-border)]">
              <tr>
                <th className="p-3.5">الاسم والبريد</th>
                <th className="p-3.5">الدور</th>
                <th className="p-3.5">الفرع المربوط</th>
                <th className="p-3.5">عمليات آخر 7 أيام</th>
                <th className="p-3.5">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-admin-border)]">
              {staff.map((m) => (
                <tr key={m.id} className="hover:bg-[var(--color-admin-bg)]/50">
                  <td className="p-3.5">
                    <div className="font-bold">{m.name || 'موظف'}</div>
                    <div className="text-[10px] font-mono text-[var(--color-admin-text-muted)]" dir="ltr">
                      {m.email}
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--color-admin-primary-soft)] text-[var(--color-admin-primary)]">
                      {m.role === 'owner' ? 'مالك' : m.role === 'manager' ? 'مدير فرع' : 'كاشير'}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <select
                      value={m.branch_id || ''}
                      onChange={(e) => handleBranchChange(m.id, e.target.value)}
                      className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] px-2.5 py-1.5 rounded-lg text-[11px] outline-none"
                    >
                      <option value="">كل الفروع</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3.5 font-mono font-bold tabular-nums">{m.actions_last_7d || 0}</td>
                  <td className="p-3.5">
                    {m.role === 'owner' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400">
                        نشط دائماً
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleActive(m)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer ${
                          m.is_active ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                        }`}
                      >
                        {m.is_active ? 'نشط (اضغط للإيقاف)' : 'موقوف (اضغط للتفعيل)'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <>
            <table className="w-full text-right text-xs">
              <thead className="bg-[var(--color-admin-bg)] text-[var(--color-admin-text-muted)] text-[10px] font-bold border-b border-[var(--color-admin-border)]">
                <tr>
                  <th className="p-3.5">العملية</th>
                  <th className="p-3.5">المنفذ</th>
                  <th className="p-3.5">التفاصيل</th>
                  <th className="p-3.5">التوقيت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-admin-border)]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--color-admin-bg)]/50">
                    <td className="p-3.5 font-bold">
                      {ACTION_LABELS_AR[log.action_type] || log.action_type}
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold">{log.actor_name || 'النظام'}</div>
                      <div className="text-[10px] text-[var(--color-admin-text-muted)]">
                        {log.actor_role || log.actor_email || '—'}
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-[10px] text-[var(--color-admin-text-muted)] max-w-xs truncate" dir="ltr">
                      {log.new_value ? JSON.stringify(log.new_value) : log.target_id || '—'}
                    </td>
                    <td className="p-3.5 text-[11px] text-[var(--color-admin-text-muted)]">
                      {new Date(log.created_at).toLocaleString('ar-EG')}
                    </td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-[var(--color-admin-text-muted)]">
                      لا توجد أحداث مسجلة بعد
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="p-4 border-t border-[var(--color-admin-border)] flex justify-between items-center text-xs">
              <span className="text-[var(--color-admin-text-muted)]">إجمالي: {auditTotal}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={auditPage <= 1}
                  onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1 rounded-lg border border-[var(--color-admin-border)] disabled:opacity-30 cursor-pointer"
                >
                  السابق
                </button>
                <button
                  type="button"
                  disabled={auditPage * 40 >= auditTotal}
                  onClick={() => setAuditPage((p) => p + 1)}
                  className="px-3 py-1 rounded-lg border border-[var(--color-admin-border)] disabled:opacity-30 cursor-pointer"
                >
                  التالي
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="إضافة كاشير أو مدير فرع">
        <form onSubmit={handleCreateStaff} className="flex flex-col gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">الاسم</label>
            <input
              type="text"
              required
              value={newStaff.name}
              onChange={(e) => setNewStaff((p) => ({ ...p, name: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">البريد الإلكتروني للدخول</label>
            <input
              type="email"
              dir="ltr"
              required
              value={newStaff.email}
              onChange={(e) => setNewStaff((p) => ({ ...p, email: e.target.value }))}
              placeholder="cashier2@albaraka.com"
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none font-mono"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">كلمة المرور (8 أحرف على الأقل)</label>
            <input
              type="password"
              minLength={8}
              required
              value={newStaff.password}
              onChange={(e) => setNewStaff((p) => ({ ...p, password: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[var(--color-admin-text-muted)]">الصلاحية</label>
              <select
                value={newStaff.role}
                onChange={(e) => setNewStaff((p) => ({ ...p, role: e.target.value as 'cashier' | 'manager' }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
              >
                <option value="cashier">كاشير (نقطة البيع فقط)</option>
                <option value="manager">مدير</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-bold text-[var(--color-admin-text-muted)]">الفرع</label>
              <select
                value={newStaff.branch_id}
                onChange={(e) => setNewStaff((p) => ({ ...p, branch_id: e.target.value }))}
                className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
              >
                <option value="">كل الفروع</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={creating}
            className="w-full bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] font-black py-2.5 rounded-xl cursor-pointer mt-2 flex items-center justify-center gap-2"
          >
            {creating ? <ArrowClockwise className="animate-spin" size={16} /> : 'إنشاء الحساب'}
          </button>
        </form>
      </Modal>
    </div>
  );
};
