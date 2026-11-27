export interface Customer {
  id: string;
  name: string;
  phone: string;
  tier: string;
  balance: number;
  totalEarned: number;
  status: string;
  lastVisit: string | null;
  signupStation?: string | null;
  signupBranchName?: string | null;
}

export interface Branch {
  id: string;
  name: string;
  location: string;
  posType: string;
  active: boolean;
  key: string;
  timezone: string;
  openingTime: string | null;
  closingTime: string | null;
}

export interface AdminStats {
  totalCustomers: number;
  activeLoyalists: number;
  pointsIssuedThisMonth: number;
  redemptionsToday: number;
  avgBasketEgp: number;
  totalRevenue30d: number;
  totalOutstandingPoints: number;
  pointValueEgp: number;
  pointsLiabilityEgp: number;
  redemptionRatePct: number;
  inactive14dCount: number;
  inactive30dCount: number;
}

export const EMPTY_ADMIN_STATS: AdminStats = {
  totalCustomers: 0,
  activeLoyalists: 0,
  pointsIssuedThisMonth: 0,
  redemptionsToday: 0,
  avgBasketEgp: 0,
  totalRevenue30d: 0,
  totalOutstandingPoints: 0,
  pointValueEgp: 0.05,
  pointsLiabilityEgp: 0,
  redemptionRatePct: 0,
  inactive14dCount: 0,
  inactive30dCount: 0,
};

export interface TenantSettingsForm {
  slug: string;
  name: string;
  points_per_egp: string;
  min_purchase_egp: string;
  points_expiry_days: string;
  primary_color: string;
  accent_color: string;
  bg_color: string;
  surface_color: string;
  font_display: string;
  font_body: string;
  logo_url: string;
  tagline: string;
  business_type: string;
  code_prefix: string;
  show_menu: boolean;
  cashier_max_invoice_egp: string;
  point_value_egp: string;
  welcome_bonus_points: string;
  excluded_item_keywords: string[];
}

export interface TierSetting {
  tier_name: 'bronze' | 'silver' | 'gold' | 'platinum';
  multiplier: number;
  min_earned_points: number;
}

export interface AdminMessage {
  text: string;
  type: 'success' | 'error';
}

export function tierDisplay(tier: string): string {
  switch (tier?.toLowerCase()) {
    case 'platinum':
    case 'بلاتيني':
      return 'بلاتيني';
    case 'gold':
    case 'ذهبي':
      return 'ذهبي';
    case 'silver':
    case 'فضي':
      return 'فضي';
    default:
      return 'عادي';
  }
}

export function tierBadge(tier: string): string {
  switch (tier?.toLowerCase()) {
    case 'platinum':
    case 'بلاتيني':
      return 'bg-purple-950 text-purple-300 border-purple-800';
    case 'gold':
    case 'ذهبي':
      return 'bg-amber-950 text-amber-300 border-amber-800';
    case 'silver':
    case 'فضي':
      return 'bg-slate-800 text-slate-300 border-slate-700';
    default:
      return 'bg-zinc-900 text-zinc-400 border-zinc-800';
  }
}

export function statusStyle(status: string): string {
  return status === 'نشط'
    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/40'
    : 'bg-rose-950 text-rose-400 border border-rose-800/40';
}
