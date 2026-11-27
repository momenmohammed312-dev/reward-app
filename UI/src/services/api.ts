const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

class ApiService {
  private getHeaders(token?: string | null) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const activeToken = token || localStorage.getItem('loyalty_customer_token');
    if (activeToken) {
      headers['Authorization'] = `Bearer ${activeToken}`;
    }
    return headers;
  }

  // --- CUSTOMER OTP AUTHENTICATION ---

  async sendOtp(
    tenantId: string,
    phone: string,
    meta?: { branchId?: string; station?: string }
  ): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/auth/customer/otp`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        tenant_id: tenantId,
        phone,
        ...(meta?.branchId ? { branch_id: meta.branchId } : {}),
        ...(meta?.station ? { station: meta.station } : {}),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'فشل إرسال كود التحقق');
    }

    return true;
  }

  async verifyOtp(
    tenantId: string,
    phone: string,
    code: string,
    meta?: { branchId?: string; station?: string }
  ) {
    const response = await fetch(`${API_BASE_URL}/auth/customer/verify`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        tenant_id: tenantId,
        phone,
        code,
        ...(meta?.branchId ? { branch_id: meta.branchId } : {}),
        ...(meta?.station ? { station: meta.station } : {}),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'كود التحقق غير صحيح');
    }

    const data = await response.json();
    localStorage.setItem('loyalty_customer_token', data.token);
    return data;
  }

  async updateProfileName(name: string) {
    const response = await fetch(`${API_BASE_URL}/loyalty/profile`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'فشل تحديث الاسم');
    }
    return response.json();
  }

  // --- LOYALTY PROFILE AND HISTORY ---

  async getProfile() {
    const response = await fetch(`${API_BASE_URL}/loyalty/profile`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'فشل تحميل بيانات الملف الشخصي');
    }

    return response.json();
  }

  async getHistory() {
    const response = await fetch(`${API_BASE_URL}/loyalty/history`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'فشل تحميل سجل النقاط');
    }

    return response.json();
  }

  // --- REDEMPTIONS ---

  async redeemReward(rewardId: string) {
    const response = await fetch(`${API_BASE_URL}/loyalty/redeem`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ reward_id: rewardId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'فشل استبدال المكافأة');
    }

    return response.json();
  }

  // --- PUBLIC TENANT DISCOVERY ---

  async getPublicTenant(slug: string) {
    const response = await fetch(`${API_BASE_URL}/tenants/public/${encodeURIComponent(slug)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'تعذر العثور على العلامة التجارية');
    }
    return response.json();
  }

  // --- REWARDS CATALOG & PUBLIC OFFERS ---
  async getRewards(tenantId: string) {
    const response = await fetch(`${API_BASE_URL}/rewards?tenant_id=${tenantId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'فشل تحميل المكافآت');
    }
    return response.json();
  }

  async getPublicOffers(tenantId: string) {
    const response = await fetch(`${API_BASE_URL}/offers?tenant_id=${encodeURIComponent(tenantId)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) {
      throw new Error('فشل تحميل العروض');
    }
    return response.json();
  }

  // --- ADMIN ---
  private getAdminHeaders() {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('loyalty_admin_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  async getAdminStats(branchId?: string) {
    const qs = branchId ? `?branch_id=${encodeURIComponent(branchId)}` : '';
    const response = await fetch(`${API_BASE_URL}/admin/stats${qs}`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch admin stats');
    return response.json();
  }

  async getAdminCustomers(params?: {
    name?: string;
    phone?: string;
    tier?: string;
    inactive_days?: number;
    page?: number;
    limit?: number;
  }) {
    const query = new URLSearchParams();
    if (params?.name) query.set('name', params.name);
    if (params?.phone) query.set('phone', params.phone);
    if (params?.tier) query.set('tier', params.tier);
    if (params?.inactive_days) query.set('inactive_days', String(params.inactive_days));
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    const response = await fetch(`${API_BASE_URL}/admin/customers${qs ? '?' + qs : ''}`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch customers');
    return response.json();
  }

  async downloadAdminCustomersCsv(params?: {
    name?: string;
    phone?: string;
    tier?: string;
    inactive_days?: number;
  }): Promise<Blob> {
    const query = new URLSearchParams();
    if (params?.name) query.set('name', params.name);
    if (params?.phone) query.set('phone', params.phone);
    if (params?.tier) query.set('tier', params.tier);
    if (params?.inactive_days) query.set('inactive_days', String(params.inactive_days));
    const qs = query.toString();
    const token = localStorage.getItem('loyalty_admin_token');
    const response = await fetch(`${API_BASE_URL}/admin/customers/export${qs ? '?' + qs : ''}`, {
      method: 'GET',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error('فشل تصدير ملف العملاء');
    return response.blob();
  }

  async getAdminCustomerLedger(customerId: string) {
    const response = await fetch(`${API_BASE_URL}/admin/customers/${encodeURIComponent(customerId)}/ledger`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('تعذر تحميل كشف حساب العميل');
    return response.json();
  }

  async getAdminRewards() {
    const response = await fetch(`${API_BASE_URL}/admin/rewards`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch rewards');
    return response.json();
  }

  async createReward(data: {
    title: string;
    description?: string;
    points_required: number;
    category?: string;
    expiry_days?: number;
    reward_type?: 'free_item' | 'discount_fixed' | 'discount_percent' | 'free_upgrade';
    discount_value?: number;
    min_order_egp?: number;
    max_redemptions?: number;
  }) {
    const response = await fetch(`${API_BASE_URL}/admin/rewards`, {
      method: 'POST',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'فشل إنشاء المكافأة');
    }
    return response.json();
  }

  async getAdminBranches() {
    const response = await fetch(`${API_BASE_URL}/admin/branches`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch branches');
    return response.json();
  }

  async getAdminChartStats(branchId?: string) {
    const qs = branchId ? `?branch_id=${encodeURIComponent(branchId)}` : '';
    const response = await fetch(`${API_BASE_URL}/admin/stats/chart${qs}`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch chart stats');
    return response.json();
  }

  async getAdminRetentionAnalytics(branchId?: string) {
    const qs = branchId ? `?branch_id=${encodeURIComponent(branchId)}` : '';
    const response = await fetch(`${API_BASE_URL}/admin/analytics/retention${qs}`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch retention analytics');
    return response.json();
  }

  async updateCustomer(id: string, data: { name?: string; phone?: string; tier?: string; is_verified?: boolean }) {
    const response = await fetch(`${API_BASE_URL}/admin/customers/${id}`, {
      method: 'PATCH',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update customer');
    }
    return response.json();
  }

  async createAdminCustomer(data: {
    name: string;
    phone: string;
    tier?: string;
    initial_points?: number;
    is_verified?: boolean;
  }) {
    const response = await fetch(`${API_BASE_URL}/admin/customers`, {
      method: 'POST',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || 'فشل إضافة العميل');
    }
    return response.json();
  }

  async deleteCustomer(id: string) {
    const response = await fetch(`${API_BASE_URL}/admin/customers/${id}`, {
      method: 'DELETE',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete customer');
    return response.json();
  }

  async updateReward(
    id: string,
    data: {
      title?: string;
      description?: string;
      points_required?: number;
      category?: string;
      expiry_days?: number;
      is_active?: boolean;
      reward_type?: 'free_item' | 'discount_fixed' | 'discount_percent' | 'free_upgrade';
      discount_value?: number | null;
      min_order_egp?: number | null;
      max_redemptions?: number | null;
    }
  ) {
    const response = await fetch(`${API_BASE_URL}/admin/rewards/${id}`, {
      method: 'PATCH',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update reward');
    }
    return response.json();
  }

  async deleteReward(id: string) {
    const response = await fetch(`${API_BASE_URL}/admin/rewards/${id}`, {
      method: 'DELETE',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete reward');
    return response.json();
  }

  async createBranch(data: { name: string; city?: string; posType?: string; timezone?: string; openingTime?: string; closingTime?: string }) {
    const response = await fetch(`${API_BASE_URL}/admin/branches`, {
      method: 'POST',
      headers: this.getAdminHeaders(),
      body: JSON.stringify({ name: data.name, city: data.city, pos_type: data.posType, timezone: data.timezone, opening_time: data.openingTime || null, closing_time: data.closingTime || null }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create branch');
    }
    return response.json();
  }

  async updateBranch(id: string, data: { name?: string; city?: string; posType?: string; is_active?: boolean; timezone?: string; openingTime?: string; closingTime?: string }) {
    const response = await fetch(`${API_BASE_URL}/admin/branches/${id}`, {
      method: 'PATCH',
      headers: this.getAdminHeaders(),
      body: JSON.stringify({ name: data.name, city: data.city, pos_type: data.posType, is_active: data.is_active, timezone: data.timezone, opening_time: data.openingTime || null, closing_time: data.closingTime || null }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update branch');
    }
    return response.json();
  }

  async deleteBranch(id: string) {
    const response = await fetch(`${API_BASE_URL}/admin/branches/${id}`, {
      method: 'DELETE',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete branch');
    return response.json();
  }

  async adminEarnPoints(data: { customer_id: string; amount: number; note?: string }) {
    const response = await fetch(`${API_BASE_URL}/loyalty/manual-earn`, {
      method: 'POST',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'فشل منح النقاط');
    }
    return response.json();
  }

  async cashierLookupCustomer(query: string) {
    const response = await fetch(
      `${API_BASE_URL}/loyalty/customer-lookup?q=${encodeURIComponent(query.trim())}`,
      {
        method: 'GET',
        headers: this.getAdminHeaders(),
      }
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'لم يتم العثور على العميل');
    }
    return response.json();
  }

  async cashierEarnByInvoice(data: {
    customer_phone?: string;
    customer_identifier?: string;
    amount_egp: number;
    invoice_id?: string;
    note?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/loyalty/cashier-earn`, {
      method: 'POST',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'تعذر احتساب نقاط الفاتورة');
    }
    return response.json();
  }

  async cashierProcessRedemption(code: string) {
    const response = await fetch(`${API_BASE_URL}/loyalty/process-redemption`, {
      method: 'POST',
      headers: this.getAdminHeaders(),
      body: JSON.stringify({ code }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'كود غير صالح أو منتهي الصلاحية');
    }
    return response.json();
  }

  async getAdminTiers() {
    const response = await fetch(`${API_BASE_URL}/admin/tiers`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch tier settings');
    return response.json();
  }

  async updateAdminTiers(
    tiers: Array<{ tier_name: 'bronze' | 'silver' | 'gold' | 'platinum'; multiplier: number; min_earned_points: number }>
  ) {
    const response = await fetch(`${API_BASE_URL}/admin/tiers`, {
      method: 'PUT',
      headers: this.getAdminHeaders(),
      body: JSON.stringify({ tiers }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update tier settings');
    }
    return response.json();
  }

  async adminAdjustPoints(data: { customer_id?: string; customer_phone?: string; points: number; note?: string }) {
    const response = await fetch(`${API_BASE_URL}/loyalty/adjust`, {
      method: 'POST',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'فشل تعديل النقاط');
    }
    return response.json();
  }

  async adminRefundTransaction(data: {
    invoice_id: string;
    partial_amount?: number;
    items?: Array<{ transaction_item_id?: string; sku?: string; quantity: number }>;
    note?: string;
  }) {
    const response = await fetch(`${API_BASE_URL}/loyalty/refund`, {
      method: 'POST',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'فشل تنفيذ الاسترجاع');
    }
    return response.json();
  }

  async getAdminTransactions(params?: { branch_id?: string; search?: string; page?: number; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.branch_id) q.set('branch_id', params.branch_id);
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const response = await fetch(`${API_BASE_URL}/admin/transactions${q.toString() ? '?' + q.toString() : ''}`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return response.json();
  }

  async getAdminRedemptions(params?: { branch_id?: string; status?: string; search?: string; page?: number; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.branch_id) q.set('branch_id', params.branch_id);
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const response = await fetch(`${API_BASE_URL}/admin/redemptions${q.toString() ? '?' + q.toString() : ''}`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch redemptions');
    return response.json();
  }

  async getAdminStaff() {
    const response = await fetch(`${API_BASE_URL}/admin/staff`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch staff');
    return response.json();
  }

  async createAdminStaff(data: { name: string; email: string; password: string; role: 'manager' | 'cashier'; branch_id?: string | null }) {
    const response = await fetch(`${API_BASE_URL}/admin/staff`, {
      method: 'POST',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'فشل إضافة الموظف');
    }
    return response.json();
  }

  async updateAdminStaff(id: string, data: { name?: string; role?: 'manager' | 'cashier'; branch_id?: string | null; is_active?: boolean }) {
    const response = await fetch(`${API_BASE_URL}/admin/staff/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'فشل تحديث الموظف');
    }
    return response.json();
  }

  async assignStaffBranch(id: string, branchId: string | null) {
    const response = await fetch(`${API_BASE_URL}/admin/users/${encodeURIComponent(id)}/branch`, {
      method: 'PATCH',
      headers: this.getAdminHeaders(),
      body: JSON.stringify({ branch_id: branchId }),
    });
    if (!response.ok) throw new Error('فشل ربط الفرع');
    return response.json();
  }

  async getAdminAuditLog(params?: { action_type?: string; user_id?: string; page?: number; limit?: number }) {
    const q = new URLSearchParams();
    if (params?.action_type) q.set('action_type', params.action_type);
    if (params?.user_id) q.set('user_id', params.user_id);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const response = await fetch(`${API_BASE_URL}/admin/audit-log${q.toString() ? '?' + q.toString() : ''}`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch audit log');
    return response.json();
  }

  async getAdminOffers() {
    const response = await fetch(`${API_BASE_URL}/admin/offers`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch offers');
    return response.json();
  }

  async createAdminOffer(data: Record<string, any>) {
    const response = await fetch(`${API_BASE_URL}/admin/offers`, {
      method: 'POST',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'فشل إنشاء العرض');
    }
    return response.json();
  }

  async updateAdminOffer(id: string, data: Record<string, any>) {
    const response = await fetch(`${API_BASE_URL}/admin/offers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'فشل تحديث العرض');
    }
    return response.json();
  }

  async deleteAdminOffer(id: string) {
    const response = await fetch(`${API_BASE_URL}/admin/offers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('فشل حذف العرض');
    return response.json();
  }

  async getAdminCampaigns() {
    const response = await fetch(`${API_BASE_URL}/admin/campaigns`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch campaigns');
    return response.json();
  }

  async createAdminCampaign(data: Record<string, any>) {
    const response = await fetch(`${API_BASE_URL}/admin/campaigns`, {
      method: 'POST',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'فشل إنشاء الحملة');
    }
    return response.json();
  }

  async updateAdminCampaign(id: string, data: Record<string, any>) {
    const response = await fetch(`${API_BASE_URL}/admin/campaigns/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('فشل تحديث الحملة');
    return response.json();
  }

  async deleteAdminCampaign(id: string) {
    const response = await fetch(`${API_BASE_URL}/admin/campaigns/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('فشل حذف الحملة');
    return response.json();
  }

  async getAdminEarningRules() {
    const response = await fetch(`${API_BASE_URL}/admin/earning-rules`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch earning rules');
    return response.json();
  }

  async createAdminEarningRule(data: Record<string, any>) {
    const response = await fetch(`${API_BASE_URL}/admin/earning-rules`, {
      method: 'POST',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'فشل إنشاء القاعدة');
    }
    return response.json();
  }

  async updateAdminEarningRule(id: string, data: Record<string, any>) {
    const response = await fetch(`${API_BASE_URL}/admin/earning-rules/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'فشل تحديث القاعدة');
    }
    return response.json();
  }

  async deleteAdminEarningRule(id: string) {
    const response = await fetch(`${API_BASE_URL}/admin/earning-rules/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('فشل حذف القاعدة');
    return response.json();
  }

  async getReminderTargets(type: 'inactive' | 'expiring', days: number) {
    const response = await fetch(`${API_BASE_URL}/admin/reminders/targets?type=${type}&days=${days}`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch reminder targets');
    return response.json();
  }

  async logReminder(data: { customer_id: string; channel?: 'whatsapp' | 'sms'; reminder_type: 'inactive' | 'expiring' }) {
    const response = await fetch(`${API_BASE_URL}/admin/reminders/log`, {
      method: 'POST',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to log reminder');
    return response.json();
  }

  async getAdminPosConfig() {
    const response = await fetch(`${API_BASE_URL}/admin/pos/config`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch POS config');
    return response.json();
  }

  async testAdminPosWebhook(payload: Record<string, any>, customerTier = 'bronze') {
    const response = await fetch(`${API_BASE_URL}/admin/pos/test-webhook`, {
      method: 'POST',
      headers: this.getAdminHeaders(),
      body: JSON.stringify({ payload, customer_tier: customerTier }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'فشل محاكاة الفاتورة');
    }
    return response.json();
  }

  async regenerateBranchApiKey(branchId: string) {
    const response = await fetch(`${API_BASE_URL}/tenants/branches/${encodeURIComponent(branchId)}/regenerate-key`, {
      method: 'POST',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('فشل إعادة توليد المفتاح');
    return response.json();
  }

  // --- TENANT SETTINGS ---
  async getTenantSettings() {
    const response = await fetch(`${API_BASE_URL}/tenants/me`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch settings');
    return response.json();
  }

  async updateTenantSettings(data: Record<string, any>) {
    const response = await fetch(`${API_BASE_URL}/tenants/me`, {
      method: 'PATCH',
      headers: this.getAdminHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Failed to update settings');
    }
    return response.json();
  }

  // --- SUPER ADMIN ---
  private getSuperAdminHeaders() {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('loyalty_superadmin_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  async getSuperAdminTenants() {
    const response = await fetch(`${API_BASE_URL}/superadmin/tenants`, {
      method: 'GET',
      headers: this.getSuperAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch tenants');
    return response.json();
  }

  async toggleTenantStatus(tenantId: string) {
    const response = await fetch(`${API_BASE_URL}/superadmin/tenants/${tenantId}`, {
      method: 'PATCH',
      headers: this.getSuperAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to toggle tenant status');
    return response.json();
  }

  async getSuperAdminWebhookLogs() {
    const response = await fetch(`${API_BASE_URL}/superadmin/webhook-logs`, {
      method: 'GET',
      headers: this.getSuperAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch webhook logs');
    return response.json();
  }

  async getSuperAdminStats() {
    const response = await fetch(`${API_BASE_URL}/superadmin/stats`, {
      method: 'GET',
      headers: this.getSuperAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch superadmin stats');
    return response.json();
  }

  // --- SUPER ADMIN: NETWORKS ---

  async getSuperAdminNetworks() {
    const response = await fetch(`${API_BASE_URL}/superadmin/networks`, {
      method: 'GET',
      headers: this.getSuperAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch networks');
    return response.json();
  }

  async getSuperAdminNetworkById(id: string) {
    const response = await fetch(`${API_BASE_URL}/superadmin/networks/${id}`, {
      method: 'GET',
      headers: this.getSuperAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch network');
    return response.json();
  }

  async createNetwork(data: { name: string; slug: string; description?: string; logo_url?: string }) {
    const response = await fetch(`${API_BASE_URL}/superadmin/networks`, {
      method: 'POST',
      headers: this.getSuperAdminHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create network');
    }
    return response.json();
  }

  async updateNetwork(id: string, data: { name?: string; description?: string; logo_url?: string; is_active?: boolean }) {
    const response = await fetch(`${API_BASE_URL}/superadmin/networks/${id}`, {
      method: 'PATCH',
      headers: this.getSuperAdminHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update network');
    }
    return response.json();
  }

  async deactivateNetwork(id: string) {
    const response = await fetch(`${API_BASE_URL}/superadmin/networks/${id}`, {
      method: 'DELETE',
      headers: this.getSuperAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to deactivate network');
    return response.json();
  }

  async addNetworkMember(networkId: string, tenantId: string) {
    const response = await fetch(`${API_BASE_URL}/superadmin/networks/${networkId}/members`, {
      method: 'POST',
      headers: this.getSuperAdminHeaders(),
      body: JSON.stringify({ tenant_id: tenantId }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to add member');
    }
    return response.json();
  }

  async removeNetworkMember(networkId: string, tenantId: string) {
    const response = await fetch(`${API_BASE_URL}/superadmin/networks/${networkId}/members/${tenantId}`, {
      method: 'DELETE',
      headers: this.getSuperAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to remove member');
    return response.json();
  }

  async suspendNetworkMember(networkId: string, tenantId: string) {
    const response = await fetch(`${API_BASE_URL}/superadmin/networks/${networkId}/members/${tenantId}/suspend`, {
      method: 'PATCH',
      headers: this.getSuperAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to suspend member');
    return response.json();
  }

  // --- TENANT: NETWORKS ---

  async getMyNetworks() {
    const response = await fetch(`${API_BASE_URL}/tenants/me/networks`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch networks');
    return response.json();
  }

  async getMyNetworkDetails(id: string) {
    const response = await fetch(`${API_BASE_URL}/tenants/me/networks/${id}`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch network details');
    return response.json();
  }

  async leaveNetwork(id: string) {
    const response = await fetch(`${API_BASE_URL}/tenants/me/networks/${id}/leave`, {
      method: 'DELETE',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to leave network');
    return response.json();
  }

  async getMyNetworkRates(networkId: string) {
    const response = await fetch(`${API_BASE_URL}/tenants/me/networks/${networkId}/rates`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch exchange rates');
    return response.json();
  }

  async upsertMyNetworkRate(networkId: string, egpPerPoint: number) {
    const response = await fetch(`${API_BASE_URL}/tenants/me/networks/${networkId}/rates`, {
      method: 'PUT',
      headers: this.getAdminHeaders(),
      body: JSON.stringify({ egp_per_point: egpPerPoint }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update exchange rate');
    }
    return response.json();
  }

  async getMyNetPositions(networkId: string) {
    const response = await fetch(`${API_BASE_URL}/tenants/me/networks/${networkId}/positions`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch net positions');
    return response.json();
  }

  async getMyNetworkSettlements(networkId: string) {
    const response = await fetch(`${API_BASE_URL}/tenants/me/networks/${networkId}/settlements`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch settlements');
    return response.json();
  }
}

export const api = new ApiService();
