/**
 * Calculates the points awarded for a purchase.
 *
 * Points = floor(amount * points_per_egp * tier_multiplier), subject to the
 * tenant's minimum purchase threshold. Extracted as a pure function so the
 * core loyalty math is unit-testable.
 */
export function calculatePointsEarned(
  amount: number,
  pointsPerEgp: number,
  multiplier: number,
  minPurchaseEgp: number
): number {
  if (amount < Number(minPurchaseEgp)) {
    throw new Error(`Amount is less than minimum purchase threshold (${minPurchaseEgp} EGP)`);
  }

  return Math.floor(amount * Number(pointsPerEgp) * multiplier);
}

export interface OrderLineItem {
  name?: string;
  category?: string;
  amount?: number;
  price?: number;
  quantity?: number;
  excluded?: boolean;
}

export interface EligibleOrderSummary {
  rawTotal: number;
  excludedTotal: number;
  eligibleTotal: number;
  excludedItems: Array<{ name: string; amount: number; reason: string }>;
}

function resolveLineAmount(item: OrderLineItem): number {
  const raw =
    item.amount !== undefined
      ? Number(item.amount)
      : (Number(item.price) || 0) * (Number(item.quantity) || 1);
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

function normalizeKeywords(excludedKeywords?: string[]): string[] {
  if (!Array.isArray(excludedKeywords)) return [];
  return excludedKeywords
    .map((kw) => (typeof kw === 'string' ? kw.trim().toLowerCase() : ''))
    .filter((kw) => kw.length > 0);
}

/**
 * Summarizes eligible vs excluded items for a retail order, checking both explicit
 * `excluded: true` flags and tenant-configured excluded keyword lists.
 */
export function summarizeEligibleOrder(
  totalAmount: number,
  items?: OrderLineItem[],
  excludedKeywords?: string[]
): EligibleOrderSummary {
  const base = Math.max(0, Number(totalAmount) || 0);
  const roundedBase = Math.round(base * 100) / 100;

  if (!Array.isArray(items) || items.length === 0) {
    return {
      rawTotal: roundedBase,
      excludedTotal: 0,
      eligibleTotal: roundedBase,
      excludedItems: [],
    };
  }

  const keywords = normalizeKeywords(excludedKeywords);
  let excludedSum = 0;
  const excludedItems: Array<{ name: string; amount: number; reason: string }> = [];

  for (const item of items) {
    if (!item) continue;
    const itemName = (item.name || '').toLowerCase();
    const itemCategory = (item.category || '').toLowerCase();

    let reason: string | null = null;
    if (item.excluded) {
      reason = 'excluded_flag';
    } else if (keywords.length > 0) {
      const matchedKw = keywords.find((kw) => itemName.includes(kw) || itemCategory.includes(kw));
      if (matchedKw) {
        reason = `keyword:${matchedKw}`;
      }
    }

    if (reason) {
      const lineAmount = resolveLineAmount(item);
      if (lineAmount > 0) {
        excludedSum += lineAmount;
        excludedItems.push({
          name: item.name || item.category || 'Excluded item',
          amount: Math.round(lineAmount * 100) / 100,
          reason,
        });
      }
    }
  }

  const roundedExcluded = Math.round(excludedSum * 100) / 100;
  const eligibleTotal = Math.max(0, Math.round((base - excludedSum) * 100) / 100);

  return {
    rawTotal: roundedBase,
    excludedTotal: roundedExcluded,
    eligibleTotal,
    excludedItems,
  };
}

/**
 * Computes the loyalty-eligible basket total by subtracting any explicitly
 * excluded items (e.g. cigarettes, telecom top-up cards, zero-margin promos)
 * or items matching the tenant's excluded keywords.
 */
export function calculateEligibleAmount(
  totalAmount: number,
  items?: OrderLineItem[],
  excludedKeywords?: string[]
): number {
  return summarizeEligibleOrder(totalAmount, items, excludedKeywords).eligibleTotal;
}

/**
 * Computes proportional points to claw back for a partial or full refund.
 */
export function calculatePartialRefundPoints(
  originalAmount: number,
  originalPointsEarned: number,
  refundAmount: number
): number {
  if (!Number.isFinite(originalAmount) || originalAmount <= 0) {
    throw new Error('Original transaction amount must be positive');
  }
  if (!Number.isFinite(originalPointsEarned) || originalPointsEarned < 0) {
    throw new Error('Original points earned must be non-negative');
  }
  if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
    throw new Error('Refund amount must be positive');
  }

  if (refundAmount >= originalAmount) {
    return originalPointsEarned;
  }

  return Math.min(
    originalPointsEarned,
    Math.floor((refundAmount / originalAmount) * originalPointsEarned)
  );
}
