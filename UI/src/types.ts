// src/types.ts

export interface Tenant {
  id: string;
  name: string;
  logo: string;
  primaryColor: string;
  primaryColorSoft: string;
  accentColor: string;
  accentColorSoft: string;
  bgColor: string;
  surfaceColor: string;
  fontDisplay: string;
  fontBody: string;
  tagline: string;
  coverImage?: string;
}

export interface User {
  phone: string;
  name: string;
  email?: string;
  joinDate: string;
  loyaltyTier: 'Silver' | 'Gold' | 'Platinum' | 'Bronze' | 'العادي' | 'الذهبي' | 'البلاتيني';
  totalPoints: number;
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  pointsRequired: number;
  imageUrl: string;
  category: string;
  terms: string;
  expiryDays: number;
}

export interface RedeemedReward {
  code: string;
  rewardId: string;
  rewardTitle: string;
  rewardImageUrl: string;
  pointsSpent: number;
  redeemedAt: string;
  expiresAt: string;
  status: 'active' | 'used' | 'expired';
}

export interface Transaction {
  id: string;
  amount?: number;
  date: string;
  points: number;
  type: 'earn' | 'redeem' | 'refund';
  description: string;
  invoiceNumber?: string;
}

export interface AppState {
  tenant: Tenant | null;
  loadingTenant: boolean;
  tenantError: string | null;
  
  user: User | null;
  isAuthenticated: boolean;
  loadingAuth: boolean;
  authError: string | null;
  
  transactions: Transaction[];
  redeemedRewards: RedeemedReward[];
  loadingWallet: boolean;
  walletError: string | null;
}
