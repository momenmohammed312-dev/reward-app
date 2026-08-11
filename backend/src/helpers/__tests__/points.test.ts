import { describe, expect, it } from 'vitest';
import { calculatePointsEarned } from '../points.js';

describe('calculatePointsEarned', () => {
  it('floors the computed points', () => {
    expect(calculatePointsEarned(100, 0.1, 1, 0)).toBe(10);
    expect(calculatePointsEarned(99, 0.1, 1, 0)).toBe(9);
    expect(calculatePointsEarned(3, 0.33, 1, 0)).toBe(0);
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
