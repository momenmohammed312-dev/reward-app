import { describe, expect, it } from 'vitest';
import { computeExpiredPoints, LedgerEntryLite } from '../expiry.js';
import { FoodicsAdapter } from '../pos/foodicsAdapter.js';

describe('computeExpiredPoints (FIFO expiry)', () => {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const now = new Date('2026-01-10T00:00:00Z').getTime();
  const daysAgo = (d: number) => new Date(now - d * MS_PER_DAY).toISOString();

  const entry = (id: string, type: string, points: number, created_at: string): LedgerEntryLite => ({
    id,
    type,
    points,
    created_at,
  });

  it('expires a fully-untouched credit after its window', () => {
    const result = computeExpiredPoints([entry('a', 'earned', 100, daysAgo(30))], 20, now);
    expect(result).toEqual([{ ledgerId: 'a', points: 100 }]);
  });

  it('keeps a credit that is still within its window', () => {
    const result = computeExpiredPoints([entry('a', 'earned', 100, daysAgo(10))], 20, now);
    expect(result).toEqual([]);
  });

  it('consumes the oldest credit first and only expires the remainder', () => {
    const ledger = [
      entry('a', 'earned', 100, daysAgo(30)),
      entry('b', 'earned', 100, daysAgo(25)),
      entry('c', 'redeemed', 150, daysAgo(24)),
    ];
    // credit a (100) consumed entirely, credit b consumed 50 → 50 left, b expires
    const result = computeExpiredPoints(ledger, 20, now);
    expect(result).toEqual([{ ledgerId: 'b', points: 50 }]);
  });

  it('does not double-expire a credit that was already expired', () => {
    const ledger = [
      entry('a', 'earned', 100, daysAgo(30)),
      entry('x', 'expired', 100, daysAgo(20)),
    ];
    expect(computeExpiredPoints(ledger, 20, now)).toEqual([]);
  });

  it('ignores non-credit types entirely', () => {
    const ledger = [
      entry('a', 'adjustment', 50, daysAgo(30)),
      entry('b', 'refund', 30, daysAgo(30)),
      entry('c', 'reversal', 20, daysAgo(30)),
    ];
    // adjustment/reversal are not creditable; refund is, but below its window? 30 days > 20 → expired
    const result = computeExpiredPoints(ledger, 20, now);
    expect(result).toEqual([{ ledgerId: 'b', points: 30 }]);
  });
});

describe('FoodicsAdapter', () => {
  it('maps a Foodics order.paid payload to a canonical PosOrder', () => {
    const adapter = new FoodicsAdapter();
    const order = adapter.parseOrder({
      pos_type: 'foodics',
      order: {
        id: 'inv-1',
        number: '100',
        total_price: 250.5,
        customer: { phone: '+201011234567', name: 'Ahmed' },
        branch: { id: 'loc-7', name: 'Cairo' },
      },
    });

    expect(order.invoiceId).toBe('inv-1');
    expect(order.customerPhone).toBe('01011234567');
    expect(order.totalAmount).toBe(250.5);
    expect(order.branchLocationId).toBe('loc-7');
    expect(order.branchName).toBe('Cairo');
    expect(order.customerName).toBe('Ahmed');
  });

  it('falls back to top-level fields when nested payload is absent', () => {
    const adapter = new FoodicsAdapter();
    const order = adapter.parseOrder({
      pos_type: 'foodics',
      total: 120,
      customer: { phone: '01012345678' },
      branch_id: 'b-1',
    });

    expect(order.invoiceId).toBeUndefined();
    expect(order.totalAmount).toBe(120);
    expect(order.customerPhone).toBe('01012345678');
    expect(order.branchLocationId).toBe('b-1');
  });

  it('returns empty phone for a payload without a customer', () => {
    const adapter = new FoodicsAdapter();
    const order = adapter.parseOrder({ pos_type: 'foodics', total: 50 });
    expect(order.customerPhone).toBe('');
  });
});
