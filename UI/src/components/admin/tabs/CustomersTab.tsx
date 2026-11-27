import React, { useState } from 'react';
import { PencilSimple, TrashSimple, WarningCircle, DownloadSimple, Notebook } from '@phosphor-icons/react';
import { api } from '../../../services/api';
import { Modal } from '../../ui/Modal';
import { AdminMessage, Customer, statusStyle, tierBadge, tierDisplay } from '../types';

interface CustomersTabProps {
  customers: Customer[];
  customerTotal: number;
  customerPage: number;
  searchByName: string;
  searchByPhone: string;
  tierFilter: string;
  inactiveDays: number | undefined;
  onSearchNameChange: (val: string) => void;
  onSearchPhoneChange: (val: string) => void;
  onTierFilterChange: (tier: string) => void;
  onInactiveDaysChange: (days: number | undefined) => void;
  onPageChange: (page: number) => void;
  onOpenLedger: (customerId: string) => void;
  onMessage: (msg: AdminMessage) => void;
  onCustomersUpdated: () => Promise<void>;
}

export const CustomersTab: React.FC<CustomersTabProps> = ({
  customers,
  customerTotal,
  customerPage,
  searchByName,
  searchByPhone,
  tierFilter,
  inactiveDays,
  onSearchNameChange,
  onSearchPhoneChange,
  onTierFilterChange,
  onInactiveDaysChange,
  onPageChange,
  onOpenLedger,
  onMessage,
  onCustomersUpdated,
}) => {
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', tier: 'bronze', is_verified: true });
  const [deleteCustomerId, setDeleteCustomerId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const openEdit = (c: Customer) => {
    setEditCustomer(c);
    setEditForm({
      name: c.name,
      phone: c.phone,
      tier: c.tier,
      is_verified: c.status === 'نشط',
    });
  };

  const handleEditSave = async () => {
    if (!editCustomer) return;
    try {
      await api.updateCustomer(editCustomer.id, {
        name: editForm.name,
        phone: editForm.phone,
        tier: editForm.tier,
        is_verified: editForm.is_verified,
      });
      onMessage({ text: 'تم تحديث العميل بنجاح', type: 'success' });
      await onCustomersUpdated();
    } catch (err: any) {
      onMessage({ text: err?.message || 'فشل تحديث العميل', type: 'error' });
    }
    setEditCustomer(null);
  };

  const handleDelete = async () => {
    if (!deleteCustomerId) return;
    try {
      await api.deleteCustomer(deleteCustomerId);
      onMessage({ text: 'تم حذف العميل', type: 'success' });
      await onCustomersUpdated();
    } catch (err: any) {
      onMessage({ text: err?.message || 'فشل حذف العميل', type: 'error' });
    }
    setDeleteCustomerId(null);
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const blob = await api.downloadAdminCustomersCsv({
        name: searchByName || undefined,
        phone: searchByPhone || undefined,
        tier: tierFilter || undefined,
        inactive_days: inactiveDays,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      onMessage({ text: 'تم تصدير ملف العملاء (CSV) بنجاح', type: 'success' });
    } catch (err: any) {
      onMessage({ text: err?.message || 'فشل تصدير الملف', type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="bg-[var(--color-admin-surface)] backdrop-blur-xl border border-[var(--color-admin-border)] rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-[var(--color-admin-border)] flex flex-col gap-3">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold">قاعدة بيانات العملاء</h2>
            <span className="text-xs text-[var(--color-admin-text-muted)]">({customerTotal} عميل)</span>
          </div>
          <button
            type="button"
            disabled={exporting}
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-xl bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] hover:border-[var(--color-admin-primary)] text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <DownloadSimple size={15} weight="bold" />
            {exporting ? 'جارٍ التصدير...' : 'تصدير CSV'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            type="text"
            placeholder="بحث بالاسم..."
            value={searchByName}
            onChange={(e) => {
              onSearchNameChange(e.target.value);
              onPageChange(1);
            }}
            className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2 rounded-xl text-xs outline-none focus:border-[var(--color-admin-primary)]"
          />
          <input
            type="text"
            placeholder="بحث بالهاتف..."
            value={searchByPhone}
            onChange={(e) => {
              onSearchPhoneChange(e.target.value);
              onPageChange(1);
            }}
            className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2 rounded-xl text-xs outline-none focus:border-[var(--color-admin-primary)]"
          />
          <select
            value={tierFilter}
            onChange={(e) => {
              onTierFilterChange(e.target.value);
              onPageChange(1);
            }}
            className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2 rounded-xl text-xs outline-none"
          >
            <option value="">كل الفئات</option>
            <option value="bronze">عادي</option>
            <option value="silver">فضي</option>
            <option value="gold">ذهبي</option>
            <option value="platinum">بلاتيني</option>
          </select>
          <select
            value={inactiveDays ? String(inactiveDays) : ''}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : undefined;
              onInactiveDaysChange(val);
              onPageChange(1);
            }}
            className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2 rounded-xl text-xs outline-none"
          >
            <option value="">كل الزيارات</option>
            <option value="14">غايبين +14 يوم</option>
            <option value="30">غايبين +30 يوم</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-[var(--color-admin-bg)] text-[var(--color-admin-text-muted)] uppercase text-[10px] font-bold border-b border-[var(--color-admin-border)]">
            <tr>
              <th className="p-4">الاسم</th>
              <th className="p-4">الهاتف</th>
              <th className="p-4">الفئة</th>
              <th className="p-4">الرصيد</th>
              <th className="p-4">المكتسب</th>
              <th className="p-4">مصدر التسجيل</th>
              <th className="p-4">آخر زيارة</th>
              <th className="p-4">الحالة</th>
              <th className="p-4">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-admin-border)] text-[var(--color-admin-text)]">
            {customers.map((customer) => (
              <tr
                key={customer.id}
                onClick={() => onOpenLedger(customer.id)}
                className="hover:bg-[var(--color-admin-bg)] transition-all cursor-pointer"
              >
                <td className="p-4 font-bold">{customer.name}</td>
                <td className="p-4 font-mono text-[var(--color-admin-text-muted)]" dir="ltr">
                  {customer.phone}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${tierBadge(customer.tier)}`}>
                    {tierDisplay(customer.tier)}
                  </span>
                </td>
                <td className="p-4 font-bold tabular-nums" style={{ color: 'var(--color-admin-primary)' }}>
                  {customer.balance.toLocaleString()}
                </td>
                <td className="p-4 text-[var(--color-admin-text-muted)] tabular-nums">
                  {customer.totalEarned.toLocaleString()}
                </td>
                <td className="p-4 text-[11px] text-[var(--color-admin-text-muted)]">
                  {[customer.signupBranchName, customer.signupStation].filter(Boolean).join(' · ') || '—'}
                </td>
                <td className="p-4 text-[var(--color-admin-text-muted)] text-[11px]">
                  {customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString('ar-EG') : '—'}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${statusStyle(customer.status)}`}>
                    {customer.status}
                  </span>
                </td>
                <td
                  className="p-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="كشف حساب العميل"
                      onClick={() => onOpenLedger(customer.id)}
                      className="p-1.5 rounded-lg hover:bg-[var(--color-admin-bg)] text-[var(--color-admin-text-muted)] hover:text-emerald-400 transition-all cursor-pointer"
                    >
                      <Notebook size={14} />
                    </button>
                    <button
                      type="button"
                      title="تعديل"
                      onClick={() => openEdit(customer)}
                      className="p-1.5 rounded-lg hover:bg-[var(--color-admin-bg)] text-[var(--color-admin-text-muted)] hover:text-[var(--color-admin-primary)] transition-all cursor-pointer"
                    >
                      <PencilSimple size={14} />
                    </button>
                    <button
                      type="button"
                      title="حذف"
                      onClick={() => setDeleteCustomerId(customer.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-950/30 text-[var(--color-admin-text-muted)] hover:text-rose-500 transition-all cursor-pointer"
                    >
                      <TrashSimple size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={9} className="p-8 text-center text-[var(--color-admin-text-muted)]">
                  لا يوجد عملاء مطابقون للبحث
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-[var(--color-admin-border)] flex justify-between items-center text-xs">
        <span className="text-[var(--color-admin-text-muted)]">إجمالي: {customerTotal} عميل</span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={customerPage <= 1}
            onClick={() => onPageChange(Math.max(1, customerPage - 1))}
            className="px-3 py-1.5 rounded-lg border border-[var(--color-admin-border)] disabled:opacity-30 cursor-pointer disabled:cursor-default hover:bg-[var(--color-admin-bg)]"
          >
            السابق
          </button>
          <span className="px-3 py-1.5 text-[var(--color-admin-text-muted)]">صفحة {customerPage}</span>
          <button
            type="button"
            disabled={customerPage * 50 >= customerTotal}
            onClick={() => onPageChange(customerPage + 1)}
            className="px-3 py-1.5 rounded-lg border border-[var(--color-admin-border)] disabled:opacity-30 cursor-pointer disabled:cursor-default hover:bg-[var(--color-admin-bg)]"
          >
            التالي
          </button>
        </div>
      </div>

      <Modal isOpen={!!editCustomer} onClose={() => setEditCustomer(null)} title="تعديل بيانات العميل">
        <div className="flex flex-col gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">الاسم</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none focus:border-[var(--color-admin-primary)]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">رقم الهاتف</label>
            <input
              type="text"
              value={editForm.phone}
              onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none focus:border-[var(--color-admin-primary)]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-bold text-[var(--color-admin-text-muted)]">الفئة</label>
            <select
              value={editForm.tier}
              onChange={(e) => setEditForm((p) => ({ ...p, tier: e.target.value }))}
              className="bg-[var(--color-admin-bg)] border border-[var(--color-admin-border)] p-2.5 rounded-xl outline-none"
            >
              <option value="bronze">عادي</option>
              <option value="silver">فضي</option>
              <option value="gold">ذهبي</option>
              <option value="platinum">بلاتيني</option>
            </select>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="cust_verified"
              checked={editForm.is_verified}
              onChange={(e) => setEditForm((p) => ({ ...p, is_verified: e.target.checked }))}
              className="rounded border-[var(--color-admin-border)]"
            />
            <label htmlFor="cust_verified" className="text-xs font-bold">
              حساب نشط
            </label>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={handleEditSave}
              className="flex-1 bg-[var(--color-admin-primary)] text-[var(--color-admin-bg)] font-black py-2.5 rounded-xl cursor-pointer hover:opacity-90 transition-all text-xs"
            >
              حفظ التغييرات
            </button>
            <button
              type="button"
              onClick={() => setEditCustomer(null)}
              className="px-4 py-2.5 rounded-xl border border-[var(--color-admin-border)] text-xs font-bold cursor-pointer hover:bg-[var(--color-admin-bg)] transition-all"
            >
              إلغاء
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteCustomerId} onClose={() => setDeleteCustomerId(null)} title="تأكيد حذف العميل">
        <div className="flex flex-col gap-4 text-xs">
          <div className="flex items-center gap-2 p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl text-rose-400">
            <WarningCircle size={18} />
            <span>سيؤدي هذا الإجراء إلى حذف العميل من الواجهة وإخفاء بياناته.</span>
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
              onClick={() => setDeleteCustomerId(null)}
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
