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
}

export const api = new ApiService();
