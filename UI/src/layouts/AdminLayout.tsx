import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ChartBar, Users, Gift, Storefront, SignOut, Gear,
  UserGear, Gauge, Network 
} from '@phosphor-icons/react';
import { applyTenantTheme } from '../theme/themeLoader';
import { mockTenants } from '../services/mockData';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { key: 'overview', label: 'نظرة عامة', icon: ChartBar },
  { key: 'customers', label: 'العملاء', icon: Users },
  { key: 'rewards', label: 'المكافآت', icon: Gift },
  { key: 'branches', label: 'الفروع', icon: Storefront },
  { key: 'networks', label: 'الشبكات', icon: Network },
  { key: 'settings', label: 'الإعدادات', icon: Gear },
];

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = (location.state as any)?.tab || 'overview';

  useEffect(() => {
    const savedSlug = localStorage.getItem('loyalty_tenant_slug');
    if (savedSlug) {
      const found = mockTenants.find(t => t.id === savedSlug);
      if (found) applyTenantTheme(found);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('loyalty_admin_token');
    localStorage.removeItem('loyalty_superadmin_token');
    localStorage.removeItem('loyalty_user_phone');
    localStorage.removeItem('loyalty_customer_token');
    navigate('/admin/login');
  };

  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-admin-bg)] font-body flex" style={{ direction: 'rtl' }}>
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-[var(--color-admin-surface)] border-l border-[var(--color-admin-border)] flex flex-col transition-all duration-300 shrink-0`}>
        {/* Brand */}
        <div className="p-5 border-b border-[var(--color-admin-border)] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-admin-primary)] flex items-center justify-center shrink-0">
            <Gauge size={18} className="text-white" weight="duotone" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-black text-[var(--color-admin-text)] leading-tight">لوحة التحكم</span>
              <span className="text-[9px] text-[var(--color-admin-text-muted)] tracking-widest uppercase">ADMIN PANEL</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => navigate('/admin', { state: { tab: item.key }, replace: true })}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer
                  ${isActive 
                    ? 'bg-[var(--color-admin-primary)]/10 text-[var(--color-admin-primary)]' 
                    : 'text-[var(--color-admin-text-muted)] hover:bg-[var(--color-admin-bg)]'
                  }`}
              >
                <Icon size={20} weight={isActive ? 'fill' : 'duotone'} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-[var(--color-admin-border)]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
          >
            <SignOut size={20} />
            {!sidebarCollapsed && <span>تسجيل خروج</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-[var(--color-admin-surface)] border-b border-[var(--color-admin-border)] flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-emerald-500">متصل</span>
          </div>
          <div className="flex items-center gap-2">
            <UserGear size={18} className="text-[var(--color-admin-text-muted)]" />
            <span className="text-xs text-[var(--color-admin-text-muted)] font-bold">مدير النظام</span>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
};
