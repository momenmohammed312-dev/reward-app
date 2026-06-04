// src/pages/AdminAuthPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface AdminAuthPageProps {
  role: 'admin' | 'cashier' | 'superadmin';
}

const AdminAuthPage: React.FC<AdminAuthPageProps> = ({ role }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'بيانات الدخول غير صحيحة');
      }
      const data = await res.json();
      const tokenKey =
        role === 'superadmin' ? 'loyalty_superadmin_token' : 'loyalty_admin_token';
      localStorage.setItem(tokenKey, data.token);
      navigate(role === 'superadmin' ? '/superadmin' : role === 'cashier' ? '/cashier' : '/admin');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<string, string> = {
    admin: 'لوحة تحكم الإدارة',
    cashier: 'واجهة الكاشير',
    superadmin: 'Super Admin',
  };

  return (
    <div
      className="min-h-screen bg-slate-900 flex items-center justify-center p-4"
      style={{ direction: 'rtl' }}
    >
      <div className="bg-slate-800 rounded-2xl p-8 w-full max-w-sm border border-slate-700">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">{titles[role]}</h1>
        <p className="text-slate-400 text-sm text-center mb-8">أدخل بيانات الدخول للمتابعة</p>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="البريد الإلكتروني"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
          />
          <input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="bg-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
          />
          {error && (
            <p className="text-red-400 text-sm bg-red-900/20 rounded-lg px-3 py-2">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-xl py-3 transition-colors"
          >
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminAuthPage;
