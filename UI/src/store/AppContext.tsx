import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Tenant, User, Reward, RedeemedReward, Transaction } from '../types';
import { mockTenants, mockRewards, mockTransactions } from '../services/mockData';
import { applyTenantTheme } from '../theme/themeLoader';
import { api } from '../services/api';
import { t as translate, Language } from '../services/translations';

interface AppContextType {
  // Tenant state
  tenants: Tenant[];
  currentTenant: Tenant;
  selectTenant: (id: string) => Promise<void>;
  loadingTenant: boolean;
  tenantError: string | null;

  // Auth state
  user: User | null;
  isAuthenticated: boolean;
  loadingAuth: boolean;
  authError: string | null;
  otpSentPhone: string | null;
  sendOtp: (phone: string) => Promise<boolean>;
  verifyOtp: (code: string) => Promise<boolean>;
  logout: () => void;
  updateProfileName: (newName: string) => void;

  // Loyalty engine
  points: number;
  rewards: Reward[];
  transactions: Transaction[];
  redeemedRewards: RedeemedReward[];
  loadingWallet: boolean;
  walletError: string | null;
  redeemReward: (reward: Reward) => Promise<RedeemedReward>;
  markCodeAsUsed: (code: string) => void;

  // Routing and layouts
  activeTab: 'home' | 'menu' | 'rewards' | 'history' | 'profile';
  setActiveTab: (tab: 'home' | 'menu' | 'rewards' | 'history' | 'profile') => void;
  currentSubPage: 'main' | 'redeem-detail' | 'code-display';
  setCurrentSubPage: (page: 'main' | 'redeem-detail' | 'code-display') => void;
  selectedReward: Reward | null;
  setSelectedReward: (reward: Reward | null) => void;
  activeRedemption: RedeemedReward | null;
  setActiveRedemption: (redemption: RedeemedReward | null) => void;
  selectedTransaction: Transaction | null;
  setSelectedTransaction: (tx: Transaction | null) => void;

  // Global utilities
  language: 'ar' | 'en';
  setLanguage: (lang: 'ar' | 'en') => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  simulateErrorState: (hasError: boolean, msg?: string) => void;
  globalError: string | null;
  refetchData: () => Promise<void>;
}

const mapPublicTenant = (raw: any): Tenant => {
  const primaryColor = raw.primary_color || '#4F46E5';
  const accentColor = raw.accent_color || '#059669';
  return {
    id: raw.slug || raw.id,
    name: raw.name || 'MO2 Loyalty',
    logo: raw.logo_url || '',
    primaryColor,
    primaryColorSoft: `${primaryColor}1a`,
    accentColor,
    accentColorSoft: `${accentColor}22`,
    bgColor: raw.bg_color || '#F4F6FA',
    surfaceColor: raw.surface_color || '#FFFFFF',
    fontDisplay: raw.font_display || 'Rubik',
    fontBody: raw.font_body || 'Rubik',
    tagline: raw.tagline || 'برنامج الولاء الذكي',
    businessType: raw.business_type || 'cafe',
    codePrefix: raw.code_prefix || 'MO2',
    showMenu: typeof raw.show_menu === 'boolean' ? raw.show_menu : raw.business_type !== 'supermarket',
    pointsPerEgp: raw.points_per_egp !== undefined ? Number(raw.points_per_egp) : undefined,
    minPurchaseEgp: raw.min_purchase_egp !== undefined ? Number(raw.min_purchase_egp) : undefined,
  };
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Configs & Tenants state
  const [tenants] = useState<Tenant[]>(mockTenants);
  const [currentTenant, setCurrentTenant] = useState<Tenant>(mockTenants[0]);
  const [loadingTenant, setLoadingTenant] = useState<boolean>(false);
  const [tenantError, setTenantError] = useState<string | null>(null);

  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [otpSentPhone, setOtpSentPhone] = useState<string | null>(null);

  // Loyalty Stats
  const [points, setPoints] = useState<number>(0);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [redeemedRewards, setRedeemedRewards] = useState<RedeemedReward[]>([]);
  const [loadingWallet, setLoadingWallet] = useState<boolean>(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Sub-routes & Navigation
  const [activeTab, setActiveTab] = useState<'home' | 'menu' | 'rewards' | 'history' | 'profile'>('home');
  const [currentSubPage, setCurrentSubPage] = useState<'main' | 'redeem-detail' | 'code-display'>('main');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [activeRedemption, setActiveRedemption] = useState<RedeemedReward | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('loyalty_lang') as Language) || 'ar';
  });

  const tFn = (key: string, vars?: Record<string, string | number>) => translate(language, key, vars);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('loyalty_lang', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  // Apply direction/lang on mount
  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const [globalError, setGlobalError] = useState<string | null>(null);

  // 1. Initial configuration loader: Apply Tenant CSS Theme
  useEffect(() => {
    applyTenantTheme(currentTenant);
    if (currentTenant.showMenu === false && activeTab === 'menu') {
      setActiveTab('home');
    }
  }, [currentTenant, activeTab]);

  // Helper function to load wallet data from the API
  const loadWalletData = async (phoneToUse?: string) => {
    setLoadingWallet(true);
    setWalletError(null);
    try {
      const profile = await api.getProfile();
      setPoints(Number(profile.points_balance || 0));

      const savedPhone = phoneToUse || localStorage.getItem('loyalty_user_phone') || '';
      setUser({
        phone: savedPhone,
        name: profile.name || 'عميل مميز',
        joinDate: '٢٠٢٦/٠٥/٢٨',
        loyaltyTier: profile.tier || 'bronze',
        totalPoints: Number(profile.points_balance || 0),
      });

      const historyRes = await api.getHistory();
      const historyRows = Array.isArray(historyRes) ? historyRes : (historyRes?.rows || []);
      const mappedHistory = historyRows.map((h: any, idx: number) => ({
        id: h.id || `tx_${idx}`,
        date: h.created_at,
        points: Number(h.points),
        type: h.type === 'earned' || h.type === 'bonus' ? 'earn' : (h.type === 'refund' ? 'refund' : 'redeem'),
        description: h.note || 'عملية ولاء',
        invoiceNumber: h.reference_id ? `INV-${h.reference_id.substring(0, 8)}` : undefined,
      }));
      setTransactions(mappedHistory);
    } catch (err: any) {
      if (import.meta.env.DEV) {
        console.warn('Real API backend not reachable, using dev offline mock mode:', err?.message);
        const savedPhone = phoneToUse || localStorage.getItem('loyalty_user_phone');
        const savedName = localStorage.getItem('loyalty_user_name') || 'مؤمن';
        const savedPoints = localStorage.getItem(`loyalty_points_${currentTenant.id}`);
        const pts = savedPoints ? parseInt(savedPoints, 10) : 1240;

        if (savedPhone) {
          setUser({
            phone: savedPhone,
            name: savedName,
            joinDate: '٢٠٢٦/٠٥/٢٨',
            loyaltyTier: 'الذهبي',
            totalPoints: pts,
          });
          setPoints(pts);
        }
        setTransactions(mockTransactions[currentTenant.id] || []);
      } else {
        setWalletError(err?.message || 'تعذر تحميل بيانات المحفظة');
      }
    } finally {
      setLoadingWallet(false);
    }
  };

  // Load from API (GET /api/tenants/public/:slug) with dev mock fallback
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const explicitSlug = params.get('tenant');
    const requestedSlug = explicitSlug || localStorage.getItem('loyalty_tenant_slug') || mockTenants[0].id;

    api.getPublicTenant(requestedSlug)
      .then((raw) => {
        if (cancelled) return;
        const mapped = mapPublicTenant(raw);
        setCurrentTenant(mapped);
        applyTenantTheme(mapped);
        localStorage.setItem('loyalty_tenant_slug', mapped.id);
        setTenantError(null);
      })
      .catch(() => {
        if (cancelled) return;
        const found = mockTenants.find(
          (t) => t.id === requestedSlug || t.name.toLowerCase() === requestedSlug.toLowerCase()
        );
        if (found && import.meta.env.DEV) {
          setCurrentTenant(found);
          applyTenantTheme(found);
          if (explicitSlug) {
            localStorage.setItem('loyalty_tenant_slug', found.id);
          }
          setTenantError(null);
        } else if (explicitSlug && !import.meta.env.DEV) {
          setTenantError('عذراً، لم نتمكن من العثور على العلامة التجارية المطلوبة');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const savedPhone = localStorage.getItem('loyalty_user_phone');
    const savedRedeemed = localStorage.getItem(`loyalty_redeemed_${currentTenant.id}`);
    
    if (savedPhone) {
      setIsAuthenticated(true);
      loadWalletData(savedPhone);
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }

    if (savedRedeemed) {
      try {
        setRedeemedRewards(JSON.parse(savedRedeemed));
      } catch (e) {
        setRedeemedRewards([]);
      }
    } else {
      setRedeemedRewards([]);
    }
  }, [currentTenant.id]);

  // Helper to change tenant
  const selectTenant = async (id: string) => {
    setLoadingTenant(true);
    setTenantError(null);
    setCurrentSubPage('main');
    setSelectedReward(null);
    setActiveRedemption(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const target = tenants.find(t => t.id === id);
      if (target) {
        setCurrentTenant(target);
        applyTenantTheme(target);

        const savedPoints = localStorage.getItem(`loyalty_points_${target.id}`);
        const savedRedeemed = localStorage.getItem(`loyalty_redeemed_${target.id}`);

        if (savedPoints) {
          setPoints(parseInt(savedPoints, 10));
        } else {
          setPoints(1240);
        }

        if (savedRedeemed) {
          try {
            setRedeemedRewards(JSON.parse(savedRedeemed));
          } catch (e) {
            setRedeemedRewards([]);
          }
        } else {
          setRedeemedRewards([]);
        }

        setTransactions(mockTransactions[target.id] || []);
      } else {
        setTenantError('عذراً، لم نتمكن من العثور على العلامة التجارية المطلوبة');
      }
    } catch (e) {
      setTenantError('فشل الاتصال بخادم الـ POS. يرجى المحاولة لاحقاً');
    } finally {
      setLoadingTenant(false);
    }
  };

  // OTP auth workflow
  const sendOtp = async (phone: string): Promise<boolean> => {
    setLoadingAuth(true);
    setAuthError(null);
    const qrBranchId = localStorage.getItem('loyalty_branch_id') || undefined;
    const qrStation = localStorage.getItem('loyalty_table_number') || undefined;
    try {
      await api.sendOtp(currentTenant.id, phone, { branchId: qrBranchId, station: qrStation });
      setOtpSentPhone(phone);
      return true;
    } catch (e: any) {
      if (import.meta.env.DEV) {
        console.warn('Backend sendOtp unavailable, falling back to dev offline mode:', e?.message);
        setOtpSentPhone(phone);
        return true;
      }
      setAuthError(e?.message || 'تعذر إرسال رمز التحقق');
      return false;
    } finally {
      setLoadingAuth(false);
    }
  };

  const verifyOtp = async (code: string): Promise<boolean> => {
    setLoadingAuth(true);
    setAuthError(null);
    const qrBranchId = localStorage.getItem('loyalty_branch_id') || undefined;
    const qrStation = localStorage.getItem('loyalty_table_number') || undefined;
    try {
      if (!otpSentPhone) return false;
      const data = await api.verifyOtp(currentTenant.id, otpSentPhone, code, { branchId: qrBranchId, station: qrStation });
      localStorage.setItem('loyalty_user_phone', data.customer.phone || otpSentPhone);

      setUser({
        phone: data.customer.phone,
        name: data.customer.name || 'عميل مميز',
        joinDate: '٢٠٢٦/٠٥/٢٨',
        loyaltyTier: data.customer.tier || 'bronze',
        totalPoints: 0,
      });
      setIsAuthenticated(true);
      setOtpSentPhone(null);
      await loadWalletData(otpSentPhone);
      return true;
    } catch (e: any) {
      const isNetworkFailure =
        e?.name === 'TypeError' ||
        (typeof e?.message === 'string' &&
          (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')));

      if (import.meta.env.DEV && otpSentPhone && (code === '123456' || isNetworkFailure)) {
        console.warn('Backend verifyOtp unavailable or dev demo code 123456 used');
        localStorage.removeItem('loyalty_customer_token');
        localStorage.setItem('loyalty_user_phone', otpSentPhone);
        const savedName = localStorage.getItem('loyalty_user_name') || 'مؤمن';
        const savedPoints = localStorage.getItem(`loyalty_points_${currentTenant.id}`);
        const initialPoints = savedPoints ? parseInt(savedPoints, 10) : 1240;

        setUser({
          phone: otpSentPhone,
          name: savedName,
          joinDate: '٢٠٢٦/٠٥/٢٨',
          loyaltyTier: 'الذهبي',
          totalPoints: initialPoints,
        });
        setPoints(initialPoints);
        setIsAuthenticated(true);
        setOtpSentPhone(null);
        await loadWalletData(otpSentPhone);
        return true;
      }

      setAuthError('كود التحقق غير صحيح أو انتهت صلاحيته');
      return false;
    } finally {
      setLoadingAuth(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('loyalty_user_phone');
    localStorage.removeItem('loyalty_customer_token');
    setUser(null);
    setIsAuthenticated(false);
    setOtpSentPhone(null);
  };

  const updateProfileName = async (newName: string) => {
    if (user) {
      try {
        await api.updateProfileName(newName);
      } catch (e: any) {
        console.warn('Backend updateProfileName unavailable, saving locally in mock mode:', e?.message);
      }
      const updatedUser = { ...user, name: newName };
      setUser(updatedUser);
      localStorage.setItem('loyalty_user_name', newName);
    }
  };

  // Loyalty engine methods
  const redeemReward = async (reward: Reward): Promise<RedeemedReward> => {
    setLoadingWallet(true);
    setWalletError(null);
    try {
      const res = await api.redeemReward(reward.id);

      const newRedemption: RedeemedReward = {
        code: res.code,
        rewardId: reward.id,
        rewardTitle: reward.title,
        rewardImageUrl: reward.imageUrl,
        pointsSpent: reward.pointsRequired,
        redeemedAt: new Date().toISOString(),
        expiresAt: res.expiresAt || new Date(Date.now() + 3600000).toISOString(),
        status: 'active'
      };

      const updatedRedeemed = [newRedemption, ...redeemedRewards];
      setRedeemedRewards(updatedRedeemed);
      localStorage.setItem(`loyalty_redeemed_${currentTenant.id}`, JSON.stringify(updatedRedeemed));

      await loadWalletData();
      return newRedemption;
    } catch (e: any) {
      const isNetworkFailure =
        e?.name === 'TypeError' ||
        (typeof e?.message === 'string' &&
          (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')));

      if (!import.meta.env.DEV || !isNetworkFailure || localStorage.getItem('loyalty_customer_token')) {
        throw e instanceof Error ? e : new Error('فشلت عملية استرداد المكافأة');
      }

      console.warn('Backend redeemReward unavailable, using dev offline mode:', e?.message);

      if (points < reward.pointsRequired) {
        throw new Error('رصيد نقاطك غير كافٍ لاستعادة هذه المكافأة');
      }

      const generatedCode = `${Math.floor(100000 + Math.random() * 900000)}`;
      const now = new Date();
      const expiry = new Date(now.getTime() + 60 * 60 * 1000);

      const newRedemption: RedeemedReward = {
        code: generatedCode,
        rewardId: reward.id,
        rewardTitle: reward.title,
        rewardImageUrl: reward.imageUrl,
        pointsSpent: reward.pointsRequired,
        redeemedAt: now.toISOString(),
        expiresAt: expiry.toISOString(),
        status: 'active',
      };

      const updatedRedeemed = [newRedemption, ...redeemedRewards];
      setRedeemedRewards(updatedRedeemed);
      localStorage.setItem(`loyalty_redeemed_${currentTenant.id}`, JSON.stringify(updatedRedeemed));

      const nextPoints = points - reward.pointsRequired;
      setPoints(nextPoints);
      localStorage.setItem(`loyalty_points_${currentTenant.id}`, nextPoints.toString());
      if (user) {
        setUser((prev) => (prev ? { ...prev, totalPoints: nextPoints } : null));
      }

      const newTx: Transaction = {
        id: `tx_rdm_${Date.now()}`,
        date: now.toISOString(),
        points: reward.pointsRequired,
        type: 'redeem',
        description: `استبدال مكافأة: ${reward.title}`,
        invoiceNumber: `RDM-${generatedCode}`,
      };
      setTransactions((prev) => [newTx, ...prev]);

      return newRedemption;
    } finally {
      setLoadingWallet(false);
    }
  };

  const markCodeAsUsed = (code: string) => {
    const updated = redeemedRewards.map(item => {
      if (item.code === code) {
        return { ...item, status: 'used' as const };
      }
      return item;
    });
    setRedeemedRewards(updated);
    localStorage.setItem(`loyalty_redeemed_${currentTenant.id}`, JSON.stringify(updated));
  };

  const simulateErrorState = (hasError: boolean, msg: string = 'حدث خطأ مفاجئ أثناء جلب البيانات. الرجاء إعادة المحاولة') => {
    setGlobalError(hasError ? msg : null);
  };

  const refetchData = async () => {
    setGlobalError(null);
    if (isAuthenticated) {
      await loadWalletData();
      try {
        const freshRewards = await api.getRewards(currentTenant.id);
        setRewards(freshRewards);
      } catch {
        setRewards(mockRewards[currentTenant.id] || []);
      }
    }
  };

  // Load rewards from API when authenticated
  useEffect(() => {
    const mapReward = (r: any): Reward => ({
      ...r,
      rewardType: r.rewardType || r.reward_type,
      discountValue: r.discountValue !== undefined ? r.discountValue : r.discount_value,
      minOrderEgp: r.minOrderEgp !== undefined ? r.minOrderEgp : r.min_order_egp,
      maxRedemptions: r.maxRedemptions !== undefined ? r.maxRedemptions : r.max_redemptions,
    });

    if (isAuthenticated && currentTenant) {
      api.getRewards(currentTenant.id)
        .then((list) => setRewards(Array.isArray(list) ? list.map(mapReward) : []))
        .catch(() => {
          setRewards(import.meta.env.DEV ? (mockRewards[currentTenant.id] || []) : []);
        });
    } else {
      setRewards(import.meta.env.DEV ? (mockRewards[currentTenant.id] || []) : []);
    }
  }, [isAuthenticated, currentTenant]);

  return (
    <AppContext.Provider value={{
      tenants,
      currentTenant,
      selectTenant,
      loadingTenant,
      tenantError,
      
      user,
      isAuthenticated,
      loadingAuth,
      authError,
      otpSentPhone,
      sendOtp,
      verifyOtp,
      logout,
      updateProfileName,

      points,
      rewards,
      transactions,
      redeemedRewards,
      loadingWallet,
      walletError,
      redeemReward,
      markCodeAsUsed,

      activeTab,
      setActiveTab,
      currentSubPage,
      setCurrentSubPage,
      selectedReward,
      setSelectedReward,
      activeRedemption,
      setActiveRedemption,
      selectedTransaction,
      setSelectedTransaction,

      simulateErrorState,
      globalError,
      refetchData,
      language,
      setLanguage: handleSetLanguage,
      t: tFn,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
