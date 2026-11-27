import { describe, expect, it } from 'vitest';
import {
  calculateEligibleAmount,
  calculatePartialRefundPoints,
  calculatePointsEarned,
  summarizeEligibleOrder,
} from '../points.js';

describe('calculatePointsEarned', () => {
  it('floors the computed points', () => {
    expect(calculatePointsEarned(100, 0.1, 1, 0)).toBe(10);
    expect(calculatePointsEarned(99, 0.1, 1, 0)).toBe(9);
    expect(calculatePointsEarned(3, 0.33, 1, 0)).toBe(0);
    expect(calculatePointsEarned(250, 0.2, 1.25, 50)).toBe(62);
  });

  it('applies the tier multiplier', () => {
    expect(calculatePointsEarned(100, 0.1, 2, 0)).toBe(20);
  });

  it('throws below the minimum purchase threshold', () => {
    expect(() => calculatePointsEarned(50, 0.1, 1, 100)).toThrow('minimum purchase threshold');
  });

  it('returns 0 points at exactly the minimum threshold with 0 earning rate', () => {
    expect(calculatePointsEarned(100, 0, 1, 100)).toBe(0);
  });
});

describe('calculateEligibleAmount', () => {
  it('returns full amount when no items are provided', () => {
    expect(calculateEligibleAmount(450)).toBe(450);
    expect(calculateEligibleAmount(450, [])).toBe(450);
  });

  it('subtracts excluded items (e.g. cigarettes and recharge cards)', () => {
    const eligible = calculateEligibleAmount(500, [
      { amount: 300, excluded: false },
      { amount: 120, excluded: true },
      { price: 40, quantity: 2, excluded: true },
    ]);
    expect(eligible).toBe(300);
  });

  it('clamps eligible amount to 0 when excluded items exceed total', () => {
    expect(calculateEligibleAmount(100, [{ amount: 150, excluded: true }])).toBe(0);
  });

  it('excludes items matching tenant excluded_item_keywords and returns detailed summary', () => {
    const summary = summarizeEligibleOrder(
      600,
      [
        { name: 'زيت طعام 1 لتر', category: 'بقالة', amount: 300 },
        { name: 'علبة سجائر LM', category: 'تبغ', amount: 180 },
        { name: 'كروت شحن فودافون', category: 'خدمات', price: 60, quantity: 2 },
      ],
      ['سجائر', 'كروت شحن']
    );
    expect(summary.rawTotal).toBe(600);
    expect(summary.excludedTotal).toBe(300);
    expect(summary.eligibleTotal).toBe(300);
    expect(summary.excludedItems).toHaveLength(2);
    expect(calculateEligibleAmount(600, [
      { name: 'زيت طعام', amount: 400 },
      { name: 'سجائر', amount: 200 },
    ], ['سجائر'])).toBe(400);
  });
});

describe('calculatePartialRefundPoints', () => {
  it('calculates proportional floored points for partial refunds', () => {
    expect(calculatePartialRefundPoints(500, 100, 250)).toBe(50);
    expect(calculatePartialRefundPoints(300, 60, 100)).toBe(20);
    expect(calculatePartialRefundPoints(300, 100, 100)).toBe(33);
  });

  it('returns all original points when refund amount >= original amount', () => {
    expect(calculatePartialRefundPoints(200, 40, 200)).toBe(40);
    expect(calculatePartialRefundPoints(200, 40, 250)).toBe(40);
  });

  it('throws on invalid amounts', () => {
    expect(() => calculatePartialRefundPoints(0, 10, 50)).toThrow();
    expect(() => calculatePartialRefundPoints(100, 10, 0)).toThrow();
  });
});
