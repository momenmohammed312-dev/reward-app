import { describe, expect, it } from 'vitest';
import {
  calculateItemRefundPoints,
  EarningRule,
  evaluateOrderWithRules,
} from '../rulesEngine.js';

describe('evaluateOrderWithRules (Supermarket Rules Engine)', () => {
  const rules: EarningRule[] = [
    { name: 'استثناء السجائر', rule_type: 'exclude_category', target_value: 'تبغ', priority: 10, is_active: true },
    { name: 'استثناء كارت شحن', rule_type: 'exclude_sku', target_value: 'TOPUP-100', priority: 20, is_active: true },
    { name: 'ضعف نقاط الألبان', rule_type: 'category_multiplier', target_value: 'ألبان', multiplier: 2, priority: 30, is_active: true },
    { name: 'بونص السلة الكبيرة', rule_type: 'basket_bonus', min_basket_egp: 500, bonus_points: 50, priority: 40, is_active: true },
  ];

  it('excludes categories & SKUs, applies category multipliers, handles weighted items, and awards basket bonus', () => {
    const res = evaluateOrderWithRules({
      totalAmount: 900,
      items: [
        { sku: 'CIG-1', name: 'LM Red', category: 'تبغ', quantity: 2, unit_price: 75 }, // 150 excluded
        { sku: 'TOPUP-100', name: 'شحن رصيد', category: 'خدمات', quantity: 1, unit_price: 100 }, // 100 excluded
        { sku: 'DRY-1', name: 'جبنة رومي', category: 'ألبان', quantity: 0.75, unit: 'kg', unit_price: 400 }, // 300 * 0.1 * 2 = 60 pts
        { sku: 'GRC-1', name: 'أرز بسمتي', category: 'بقالة', quantity: 2, unit_price: 175 }, // 350 * 0.1 = 35 pts
      ],
      rules,
      pointsPerEgp: 0.1,
      tierMultiplier: 1,
      campaignMultiplier: 1,
      minPurchaseEgp: 50,
    });

    expect(res.belowMinimum).toBe(false);
    expect(res.excludedTotal).toBe(250);
    expect(res.eligibleTotal).toBe(650);
    expect(res.basePoints).toBe(95);
    expect(res.basketBonusPoints).toBe(50);
    expect(res.totalPoints).toBe(145);
    expect(res.items[2].quantity).toBe(0.75);
    expect(res.items[2].points_earned).toBe(60);
    expect(res.items[0].is_excluded).toBe(true);
  });

  it('calculates points on net paid after invoice-level discount', () => {
    const res = evaluateOrderWithRules({
      totalAmount: 500,
      discountAmount: 100,
      items: [
        { sku: 'GRC-1', name: 'زيت', category: 'بقالة', quantity: 1, unit_price: 500 },
      ],
      rules: [],
      pointsPerEgp: 0.2,
      tierMultiplier: 1,
      campaignMultiplier: 1,
      minPurchaseEgp: 50,
    });

    expect(res.eligibleTotal).toBe(400);
    expect(res.totalPoints).toBe(80);
  });

  it('returns 0 points with belowMinimum=true instead of throwing for micro-receipts', () => {
    const res = evaluateOrderWithRules({
      totalAmount: 25,
      items: [{ name: 'خبز', category: 'مخبوزات', quantity: 1, unit_price: 25 }],
      rules,
      pointsPerEgp: 0.1,
      tierMultiplier: 1,
      campaignMultiplier: 1,
      minPurchaseEgp: 50,
    });

    expect(res.belowMinimum).toBe(true);
    expect(res.totalPoints).toBe(0);
    expect(res.items[0].points_earned).toBe(0);
  });
});

describe('calculateItemRefundPoints (Item-level Partial Refunds)', () => {
  it('computes proportional points for weighted item returns and caps full remaining return', () => {
    expect(
      calculateItemRefundPoints(
        { quantity: 2, points_earned: 40, refunded_quantity: 0, refunded_points: 0 },
        0.5
      )
    ).toBe(10);

    // Remaining quantity return returns exact remaining points
    expect(
      calculateItemRefundPoints(
        { quantity: 2, points_earned: 40, refunded_quantity: 0.5, refunded_points: 10 },
        1.5
      )
    ).toBe(30);
  });

  it('throws when refund quantity exceeds remaining refundable quantity', () => {
    expect(() =>
      calculateItemRefundPoints(
        { quantity: 1, points_earned: 20, refunded_quantity: 1, refunded_points: 20 },
        0.5
      )
    ).toThrow('exceeds remaining refundable quantity');
  });
});
