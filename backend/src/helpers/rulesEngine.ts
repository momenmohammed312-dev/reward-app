import { evaluatePointsEarned } from './points.js';

export type EarningRuleType =
  | 'exclude_category'
  | 'exclude_sku'
  | 'category_multiplier'
  | 'basket_bonus';

export interface EarningRule {
  id?: string;
  name: string;
  rule_type: EarningRuleType;
  target_value?: string | null;
  multiplier?: number | string | null;
  min_basket_egp?: number | string | null;
  bonus_points?: number | null;
  priority: number;
  starts_at?: string | Date | null;
  ends_at?: string | Date | null;
  is_active?: boolean;
}

export interface RawOrderItem {
  sku?: string;
  barcode?: string;
  name?: string;
  product_name?: string;
  category?: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  price?: number;
  discount_amount?: number;
  discount?: number;
  net_amount?: number;
  amount?: number;
  excluded?: boolean;
}

export interface EvaluatedOrderItem {
  sku: string | null;
  barcode: string | null;
  product_name: string;
  category: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_amount: number;
  net_amount: number;
  is_excluded: boolean;
  exclusion_reason: string | null;
  applied_multiplier: number;
  points_earned: number;
}

export interface OrderEvaluationResult {
  rawTotal: number;
  discountAmount: number;
  excludedTotal: number;
  eligibleTotal: number;
  belowMinimum: boolean;
  basePoints: number;
  basketBonusPoints: number;
  totalPoints: number;
  appliedRules: string[];
  items: EvaluatedOrderItem[];
}

function isRuleCurrentlyActive(rule: EarningRule, now: Date): boolean {
  if (rule.is_active === false) return false;
  if (rule.starts_at) {
    const start = new Date(rule.starts_at);
    if (!Number.isNaN(start.getTime()) && now < start) return false;
  }
  if (rule.ends_at) {
    const end = new Date(rule.ends_at);
    if (!Number.isNaN(end.getTime()) && now > end) return false;
  }
  return true;
}

function normalizeKeywords(excludedKeywords?: string[]): string[] {
  if (!Array.isArray(excludedKeywords)) return [];
  return excludedKeywords
    .map((kw) => (typeof kw === 'string' ? kw.trim().toLowerCase() : ''))
    .filter((kw) => kw.length > 0);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Pure supermarket rules engine. Evaluates line items (supporting weighted kg/g quantities,
 * per-line & invoice discounts, category/SKU exclusions, category multipliers, excluded keywords)
 * as well as total-only invoices and basket threshold bonuses.
 */
export function evaluateOrderWithRules(params: {
  totalAmount: number;
  discountAmount?: number;
  items?: RawOrderItem[];
  rules?: EarningRule[];
  excludedKeywords?: string[];
  pointsPerEgp: number;
  tierMultiplier: number;
  campaignMultiplier: number;
  minPurchaseEgp: number;
  now?: Date;
}): OrderEvaluationResult {
  const now = params.now ?? new Date();
  const baseMultiplier = Math.max(0, Number(params.tierMultiplier || 1) * Number(params.campaignMultiplier || 1));
  const pointsPerEgp = Math.max(0, Number(params.pointsPerEgp || 0));
  const minPurchaseEgp = Math.max(0, Number(params.minPurchaseEgp || 0));

  const rawTotal = round2(Math.max(0, Number(params.totalAmount || 0)));
  const invoiceDiscount = round2(Math.max(0, Number(params.discountAmount || 0)));
  const activeRules = (params.rules || [])
    .filter((r) => isRuleCurrentlyActive(r, now))
    .sort((a, b) => Number(a.priority ?? 100) - Number(b.priority ?? 100));

  const keywords = normalizeKeywords(params.excludedKeywords);
  const rawItems = Array.isArray(params.items) ? params.items : [];
  const appliedRulesSet = new Set<string>();

  if (rawItems.length === 0) {
    const netTotal = round2(Math.max(0, rawTotal - invoiceDiscount));
    const evalRes = evaluatePointsEarned(netTotal, pointsPerEgp, baseMultiplier, minPurchaseEgp);
    let basketBonus = 0;

    if (!evalRes.belowMinimum) {
      for (const rule of activeRules) {
        if (rule.rule_type === 'basket_bonus') {
          const minBasket = Number(rule.min_basket_egp ?? 0);
          const bonusPts = Math.max(0, Math.floor(Number(rule.bonus_points ?? 0)));
          if (netTotal >= minBasket && bonusPts > 0) {
            basketBonus += bonusPts;
            appliedRulesSet.add(rule.name);
          }
        }
      }
    }

    return {
      rawTotal,
      discountAmount: invoiceDiscount,
      excludedTotal: 0,
      eligibleTotal: netTotal,
      belowMinimum: evalRes.belowMinimum,
      basePoints: evalRes.points,
      basketBonusPoints: basketBonus,
      totalPoints: evalRes.belowMinimum ? 0 : evalRes.points + basketBonus,
      appliedRules: Array.from(appliedRulesSet),
      items: [],
    };
  }

  const normalizedLines: EvaluatedOrderItem[] = [];
  let sumLineNet = 0;
  let excludedTotal = 0;

  for (const item of rawItems) {
    if (!item) continue;
    const qty = Number(item.quantity) > 0 ? Number(item.quantity) : 1;
    const unitPrice = Number(item.unit_price ?? item.price ?? 0);
    const lineDiscount = round2(Math.max(0, Number(item.discount_amount ?? item.discount ?? 0)));
    const computedNet =
      item.net_amount !== undefined
        ? Number(item.net_amount)
        : item.amount !== undefined
        ? Math.max(0, Number(item.amount) - lineDiscount)
        : Math.max(0, unitPrice * qty - lineDiscount);
    const lineNet = round2(Math.max(0, Number.isFinite(computedNet) ? computedNet : 0));

    const productName = String(item.product_name || item.name || item.category || 'Item').trim();
    const category = item.category ? String(item.category).trim() : null;
    const sku = item.sku ? String(item.sku).trim() : null;
    const barcode = item.barcode ? String(item.barcode).trim() : null;

    const lowerName = productName.toLowerCase();
    const lowerCat = (category || '').toLowerCase();
    const lowerSku = (sku || '').toLowerCase();
    const lowerBarcode = (barcode || '').toLowerCase();

    let exclusionReason: string | null = null;
    if (item.excluded) {
      exclusionReason = 'excluded_flag';
    } else {
      const skuRule = activeRules.find(
        (r) =>
          r.rule_type === 'exclude_sku' &&
          r.target_value &&
          (lowerSku === r.target_value.trim().toLowerCase() ||
            lowerBarcode === r.target_value.trim().toLowerCase())
      );
      if (skuRule) {
        exclusionReason = `rule:${skuRule.name}`;
        appliedRulesSet.add(skuRule.name);
      } else {
        const catRule = activeRules.find(
          (r) =>
            r.rule_type === 'exclude_category' &&
            r.target_value &&
            lowerCat === r.target_value.trim().toLowerCase()
        );
        if (catRule) {
          exclusionReason = `rule:${catRule.name}`;
          appliedRulesSet.add(catRule.name);
        } else if (keywords.length > 0) {
          const matchedKw = keywords.find((kw) => lowerName.includes(kw) || lowerCat.includes(kw));
          if (matchedKw) {
            exclusionReason = `keyword:${matchedKw}`;
          }
        }
      }
    }

    sumLineNet += lineNet;
    if (exclusionReason) {
      excludedTotal += lineNet;
    }

    normalizedLines.push({
      sku,
      barcode,
      product_name: productName,
      category,
      quantity: Math.round(qty * 1000) / 1000,
      unit: item.unit ? String(item.unit).trim() : 'unit',
      unit_price: round2(Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice : lineNet / qty),
      discount_amount: lineDiscount,
      net_amount: lineNet,
      is_excluded: Boolean(exclusionReason),
      exclusion_reason: exclusionReason,
      applied_multiplier: 1,
      points_earned: 0,
    });
  }

  const effectiveRawBase = rawTotal > 0 ? rawTotal : round2(sumLineNet);
  const rawEligibleSum = round2(Math.max(0, sumLineNet - excludedTotal));
  const netInvoiceCap = round2(Math.max(0, effectiveRawBase - invoiceDiscount - excludedTotal));
  const eligibleTotal =
    rawTotal > 0 ? Math.min(rawEligibleSum, netInvoiceCap) : Math.max(0, round2(rawEligibleSum - invoiceDiscount));

  if (eligibleTotal < minPurchaseEgp) {
    return {
      rawTotal: effectiveRawBase,
      discountAmount: invoiceDiscount,
      excludedTotal: round2(excludedTotal),
      eligibleTotal,
      belowMinimum: true,
      basePoints: 0,
      basketBonusPoints: 0,
      totalPoints: 0,
      appliedRules: Array.from(appliedRulesSet),
      items: normalizedLines,
    };
  }

  // Scale non-excluded lines proportionally if an invoice-level discount reduced net paid below sum of eligible lines
  const discountRatio = rawEligibleSum > 0 ? eligibleTotal / rawEligibleSum : 1;
  let basePoints = 0;

  for (const line of normalizedLines) {
    if (line.is_excluded || line.net_amount <= 0) continue;
    const lowerCat = (line.category || '').toLowerCase();
    const catMultiplierRule = activeRules.find(
      (r) =>
        r.rule_type === 'category_multiplier' &&
        r.target_value &&
        lowerCat === r.target_value.trim().toLowerCase()
    );
    const ruleMult = catMultiplierRule && Number(catMultiplierRule.multiplier) > 0
      ? Number(catMultiplierRule.multiplier)
      : 1;

    if (catMultiplierRule) {
      appliedRulesSet.add(catMultiplierRule.name);
    }

    const effectiveLineNet = line.net_amount * discountRatio;
    const pts = Math.max(0, Math.floor(effectiveLineNet * pointsPerEgp * baseMultiplier * ruleMult));
    line.applied_multiplier = ruleMult;
    line.points_earned = pts;
    basePoints += pts;
  }

  let basketBonusPoints = 0;
  for (const rule of activeRules) {
    if (rule.rule_type === 'basket_bonus') {
      const minBasket = Number(rule.min_basket_egp ?? 0);
      const bonusPts = Math.max(0, Math.floor(Number(rule.bonus_points ?? 0)));
      if (eligibleTotal >= minBasket && bonusPts > 0) {
        basketBonusPoints += bonusPts;
        appliedRulesSet.add(rule.name);
      }
    }
  }

  return {
    rawTotal: effectiveRawBase,
    discountAmount: invoiceDiscount,
    excludedTotal: round2(excludedTotal),
    eligibleTotal: round2(eligibleTotal),
    belowMinimum: false,
    basePoints,
    basketBonusPoints,
    totalPoints: basePoints + basketBonusPoints,
    appliedRules: Array.from(appliedRulesSet),
    items: normalizedLines,
  };
}

/**
 * Calculates points to claw back when refunding a specific quantity of a transaction item,
 * preventing duplicate or over-quantity item refunds.
 */
export function calculateItemRefundPoints(
  item: {
    quantity: number;
    points_earned: number;
    refunded_quantity: number;
    refunded_points: number;
  },
  refundQty: number
): number {
  const totalQty = Number(item.quantity);
  const alreadyRefundedQty = Number(item.refunded_quantity || 0);
  const totalPts = Number(item.points_earned || 0);
  const alreadyRefundedPts = Number(item.refunded_points || 0);

  if (!Number.isFinite(refundQty) || refundQty <= 0) {
    throw new Error('Refund quantity must be positive');
  }
  if (!Number.isFinite(totalQty) || totalQty <= 0) {
    throw new Error('Original item quantity must be positive');
  }
  const remainingQty = Math.round((totalQty - alreadyRefundedQty) * 1000) / 1000;
  if (refundQty > remainingQty + 0.0001) {
    throw new Error(`Refund quantity (${refundQty}) exceeds remaining refundable quantity (${remainingQty})`);
  }

  const remainingPts = Math.max(0, totalPts - alreadyRefundedPts);
  if (remainingPts === 0 || totalPts === 0) return 0;

  if (Math.abs(refundQty - remainingQty) < 0.001) {
    return remainingPts;
  }

  return Math.min(remainingPts, Math.floor((refundQty / totalQty) * totalPts));
}
