// src/types.ts

export type BusinessType = 'cafe' | 'supermarket' | 'retail';
export type RewardType = 'free_item' | 'discount_fixed' | 'discount_percent' | 'free_upgrade';

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
  businessType?: BusinessType;
  codePrefix?: string;
  showMenu?: boolean;
  pointsPerEgp?: number;
  minPurchaseEgp?: number;
  pointValueEgp?: number;
  tierBasis?: 'points' | 'spend';
}

export interface User {
  phone: string;
  cardNumber?: string;
  name: string;
  email?: string;
  joinDate: string;
  loyaltyTier: 'Silver' | 'Gold' | 'Platinum' | 'Bronze' | 'العادي' | 'الذهبي' | 'البلاتيني';
  totalPoints: number;
  totalSpentEgp?: number;
  walletValueEgp?: number;
  totalSavedEgp?: number;
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
  rewardType?: RewardType;
  discountValue?: number | null;
  minOrderEgp?: number | null;
  maxRedemptions?: number | null;
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

export interface TransactionItem {
  id?: string;
  sku?: string | null;
  product_name: string;
  category?: string | null;
  quantity: number;
  unit?: string;
  unit_price?: number;
  discount_amount?: number;
  net_amount: number;
  is_excluded?: boolean;
  exclusion_reason?: string | null;
  applied_multiplier?: number;
  points_earned?: number;
}

export interface Transaction {
  id: string;
  amount?: number;
  date: string;
  points: number;
  type: 'earn' | 'redeem' | 'refund';
  description: string;
  invoiceNumber?: string;
  items?: TransactionItem[];
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
