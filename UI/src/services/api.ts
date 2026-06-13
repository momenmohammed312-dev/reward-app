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

  async sendOtp(tenantId: string, phone: string): Promise<boolean> {
    const response = await fetch(`${API_BASE_URL}/auth/customer/otp`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ tenant_id: tenantId, phone }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'فشل إرسال كود التحقق');
    }

    return true;
  }

  async verifyOtp(tenantId: string, phone: string, code: string) {
    const response = await fetch(`${API_BASE_URL}/auth/customer/verify`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ tenant_id: tenantId, phone, code }),
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

  // --- REWARDS CATALOG ---
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

  // --- ADMIN ---
  private getAdminHeaders() {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = localStorage.getItem('loyalty_admin_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  async getAdminStats() {
    const response = await fetch(`${API_BASE_URL}/admin/stats`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch admin stats');
    return response.json();
  }

  async getAdminCustomers(params?: { name?: string; phone?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.name) query.set('name', params.name);
    if (params?.phone) query.set('phone', params.phone);
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

  async getAdminRewards() {
    const response = await fetch(`${API_BASE_URL}/admin/rewards`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch rewards');
    return response.json();
  }

  async createReward(data: { title: string; description?: string; points_required: number; category?: string; expiry_days?: number }) {
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

  async getAdminChartStats() {
    const response = await fetch(`${API_BASE_URL}/admin/stats/chart`, {
      method: 'GET',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch chart stats');
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

  async deleteCustomer(id: string) {
    const response = await fetch(`${API_BASE_URL}/admin/customers/${id}`, {
      method: 'DELETE',
      headers: this.getAdminHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete customer');
    return response.json();
  }

  async updateReward(id: string, data: { title?: string; description?: string; points_required?: number; category?: string; expiry_days?: number; is_active?: boolean }) {
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
}

export const api = new ApiService();
