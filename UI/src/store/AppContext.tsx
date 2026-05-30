import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Tenant, User, Reward, RedeemedReward, Transaction } from '../types';
import { mockTenants, mockRewards, mockTransactions } from '../services/mockData';
import { applyTenantTheme } from '../theme/themeLoader';
import { api } from '../services/api';

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
  activeTab: 'home' | 'rewards' | 'history' | 'profile';
  setActiveTab: (tab: 'home' | 'rewards' | 'history' | 'profile') => void;
  currentSubPage: 'main' | 'redeem-detail' | 'code-display';
  setCurrentSubPage: (page: 'main' | 'redeem-detail' | 'code-display') => void;
  selectedReward: Reward | null;
  setSelectedReward: (reward: Reward | null) => void;
  activeRedemption: RedeemedReward | null;
  setActiveRedemption: (redemption: RedeemedReward | null) => void;

  // Global utilities
  simulateErrorState: (hasError: boolean, msg?: string) => void;
  globalError: string | null;
  refetchData: () => Promise<void>;
}

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
  const [points, setPoints] = useState<number>(320); // Static demo starter points
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [redeemedRewards, setRedeemedRewards] = useState<RedeemedReward[]>([]);
  const [loadingWallet, setLoadingWallet] = useState<boolean>(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Sub-routes & Navigation
  const [activeTab, setActiveTab] = useState<'home' | 'rewards' | 'history' | 'profile'>('home');
  const [currentSubPage, setCurrentSubPage] = useState<'main' | 'redeem-detail' | 'code-display'>('main');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [activeRedemption, setActiveRedemption] = useState<RedeemedReward | null>(null);

  const [globalError, setGlobalError] = useState<string | null>(null);

  // 1. Initial configuration loader: Apply Tenant CSS Theme
  useEffect(() => {
    applyTenantTheme(currentTenant);
  }, [currentTenant]);

  // Helper function to load wallet data from the API
  const loadWalletData = async (phoneToUse?: string) => {
    setLoadingWallet(true);
    try {
      const profile = await api.getProfile();
      setPoints(Number(profile.points_balance || 0));
      
      const savedPhone = phoneToUse || localStorage.getItem('loyalty_user_phone') || '';
      setUser({
        phone: savedPhone,
        name: profile.name || 'عميل كافيه',
        joinDate: '٢٠٢٦/٠٥/٢٨',
        loyaltyTier: profile.tier || 'bronze',
        totalPoints: Number(profile.points_balance || 0),
      });

      const history = await api.getHistory();
      const mappedHistory = history.map((h: any, idx: number) => ({
        id: h.id || `tx_${idx}`,
        date: h.created_at,
        points: Number(h.points),
        type: h.type === 'earned' || h.type === 'bonus' ? 'earn' : (h.type === 'refund' ? 'refund' : 'redeem'),
        description: h.note || 'عملية ولاء',
        invoiceNumber: h.reference_id ? `INV-${h.reference_id.substring(0, 8)}` : undefined,
      }));
      setTransactions(mappedHistory);
    } catch (err: any) {
      console.warn('Real API backend not reachable, using offline mock mode.', err.message);
      // Fallback mock mode
      const savedPhone = phoneToUse || localStorage.getItem('loyalty_user_phone');
      const savedName = localStorage.getItem('loyalty_user_name') || 'أحمد عبد الله';
      const savedPoints = localStorage.getItem(`loyalty_points_${currentTenant.id}`);
      
      if (savedPhone) {
        setUser({
          phone: savedPhone,
          name: savedName,
          joinDate: '٢٠٢٤/١٢/١٥',
          loyaltyTier: 'الذهبي',
          totalPoints: savedPoints ? parseInt(savedPoints) : 320,
        });
        setPoints(savedPoints ? parseInt(savedPoints) : 320);
      }
      setTransactions(mockTransactions[currentTenant.id] || []);
    } finally {
      setLoadingWallet(false);
    }
  };

  // Load from local storage / API
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

  // Helper function to sync points with local storage
  const updatePointsInStorage = (newPointsValue: number) => {
    setPoints(newPointsValue);
    localStorage.setItem(`loyalty_points_${currentTenant.id}`, newPointsValue.toString());
    if (user) {
      setUser(prev => prev ? { ...prev, totalPoints: newPointsValue } : null);
    }
  };

  // Helper to change tenant
  const selectTenant = async (id: string) => {
    setLoadingTenant(true);
    setTenantError(null);
    setCurrentSubPage('main');
    setSelectedReward(null);
    setActiveRedemption(null);
    
    try {
      // Simulate POS API network response
      await new Promise(resolve => setTimeout(resolve, 800));
      const target = tenants.find(t => t.id === id);
      if (target) {
        setCurrentTenant(target);
        applyTenantTheme(target);
        
        // Sync points and redeemed rewards
        const savedPoints = localStorage.getItem(`loyalty_points_${target.id}`);
        const savedRedeemed = localStorage.getItem(`loyalty_redeemed_${target.id}`);
        
        if (savedPoints) {
          setPoints(parseInt(savedPoints));
        } else {
          setPoints(320); // Default points per cafe
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
    try {
      await api.sendOtp(currentTenant.id, phone);
      setOtpSentPhone(phone);
      return true;
    } catch (e: any) {
      console.warn('Backend sendOtp failed, falling back to mock mode:', e.message);
      // Fallback: simulate success in development
      setOtpSentPhone(phone);
      return true;
    } finally {
      setLoadingAuth(false);
    }
  };

  const verifyOtp = async (code: string): Promise<boolean> => {
    setLoadingAuth(true);
    setAuthError(null);
    try {
      if (!otpSentPhone) return false;
      const data = await api.verifyOtp(currentTenant.id, otpSentPhone, code);
      
      setUser({
        phone: data.customer.phone,
        name: data.customer.name || 'عميل كافيه',
        joinDate: '٢٠٢٦/٠٥/٢٨',
        loyaltyTier: data.customer.tier || 'bronze',
        totalPoints: 0,
      });
      setIsAuthenticated(true);
      await loadWalletData(otpSentPhone);
      return true;
    } catch (e: any) {
      console.warn('Backend verifyOtp failed, falling back to mock mode:', e.message);
      // Fallback mock check
      if (otpSentPhone) {
        localStorage.setItem('loyalty_user_phone', otpSentPhone);
        const nameCandidate = localStorage.getItem('loyalty_user_name') || 'أحمد عبد الله';
        localStorage.setItem('loyalty_user_name', nameCandidate);
        
        setUser({
          phone: otpSentPhone,
          name: nameCandidate,
          joinDate: '٢٠٢٤/١٢/١٥',
          loyaltyTier: 'الذهبي',
          totalPoints: points,
        });
        setIsAuthenticated(true);
        return true;
      }
      setAuthError(e.message || 'فشلت عملية التحقق');
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

  const updateProfileName = (newName: string) => {
    if (user) {
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
        rewardImageUrl: reward.imageUrl || reward.imageUrl,
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
      console.warn('Backend redeemReward failed, falling back to mock mode:', e.message);
      
      if (points < reward.pointsRequired) {
        throw new Error('رصيد نقاطك غير كافٍ لاستعادة هذه المكافأة');
      }

      const generatedCode = `${Math.floor(100000 + Math.random() * 900000)}`;
      const now = new Date();
      const expiry = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour validity

      const newRedemption: RedeemedReward = {
        code: generatedCode,
        rewardId: reward.id,
        rewardTitle: reward.title,
        rewardImageUrl: reward.imageUrl,
        pointsSpent: reward.pointsRequired,
        redeemedAt: now.toISOString(),
        expiresAt: expiry.toISOString(),
        status: 'active'
      };

      const updatedRedeemed = [newRedemption, ...redeemedRewards];
      setRedeemedRewards(updatedRedeemed);
      localStorage.setItem(`loyalty_redeemed_${currentTenant.id}`, JSON.stringify(updatedRedeemed));

      const nextPoints = points - reward.pointsRequired;
      updatePointsInStorage(nextPoints);

      const newTx: Transaction = {
        id: `tx_rdm_${Date.now()}`,
        date: now.toISOString(),
        points: reward.pointsRequired,
        type: 'redeem',
        description: `استبدال مكافأة: ${reward.title}`,
        invoiceNumber: `RDM-${generatedCode}`
      };
      setTransactions([newTx, ...transactions]);
      
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
    setLoadingWallet(true);
    setGlobalError(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 1200));
    } finally {
      setLoadingWallet(false);
    }
  };

  // Rewards list computed based on current tenant
  const tenantRewards = mockRewards[currentTenant.id] || [];

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
      rewards: tenantRewards,
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

      simulateErrorState,
      globalError,
      refetchData
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
