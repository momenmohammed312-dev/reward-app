import { describe, expect, it } from 'vitest';
import { computeActiveCampaignMultiplier, escapeCsvCell } from '../campaigns.js';

describe('computeActiveCampaignMultiplier', () => {
  it('returns 1 when no campaigns exist or none are active', () => {
    expect(computeActiveCampaignMultiplier([])).toEqual({ multiplier: 1, matchedCampaignName: null });
    expect(
      computeActiveCampaignMultiplier([
        { id: 'c1', name: 'Inactive', multiplier: 2, is_active: false },
      ])
    ).toEqual({ multiplier: 1, matchedCampaignName: null });
  });

  it('respects starts_at and ends_at window', () => {
    const now = new Date('2026-11-27T10:00:00Z');
    const res = computeActiveCampaignMultiplier(
      [
        {
          id: 'future',
          name: 'Future Promo',
          multiplier: 3,
          starts_at: '2026-12-01T00:00:00Z',
          is_active: true,
        },
        {
          id: 'expired',
          name: 'Past Promo',
          multiplier: 2.5,
          ends_at: '2026-11-01T00:00:00Z',
          is_active: true,
        },
      ],
      now
    );
    expect(res).toEqual({ multiplier: 1, matchedCampaignName: null });
  });

  it('matches day_of_week and hour range (Cairo UTC+2) and picks highest multiplier without stacking', () => {
    // 2026-11-29 is Sunday (0), 09:00 UTC = 11:00 Cairo
    const sunday11Cairo = new Date('2026-11-29T09:00:00Z');
    const res = computeActiveCampaignMultiplier(
      [
        {
          id: 'hh1',
          name: 'Morning x2',
          multiplier: 2,
          days_of_week: [0, 1, 2],
          start_hour: 9,
          end_hour: 14,
          is_active: true,
        },
        {
          id: 'hh2',
          name: 'Super Sunday x3',
          multiplier: 3,
          days_of_week: [0],
          start_hour: 10,
          end_hour: 12,
          is_active: true,
        },
        {
          id: 'hh3',
          name: 'Evening x4',
          multiplier: 4,
          days_of_week: [0],
          start_hour: 18,
          end_hour: 22,
          is_active: true,
        },
      ],
      sunday11Cairo,
      2
    );
    expect(res).toEqual({ multiplier: 3, matchedCampaignName: 'Super Sunday x3' });
  });

  it('supports overnight hour windows (e.g. 22:00 to 03:00)', () => {
    // 23:00 UTC = 01:00 Cairo next day
    const oneAmCairo = new Date('2026-11-29T23:00:00Z');
    const res = computeActiveCampaignMultiplier(
      [
        {
          id: 'night',
          name: 'Night Owl x2.5',
          multiplier: 2.5,
          start_hour: 22,
          end_hour: 3,
          is_active: true,
        },
      ],
      oneAmCairo,
      2
    );
    expect(res).toEqual({ multiplier: 2.5, matchedCampaignName: 'Night Owl x2.5' });
  });
});

describe('escapeCsvCell', () => {
  it('handles null, normal text, Arabic text, and quotes/commas', () => {
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
    expect(escapeCsvCell('أحمد محمد')).toBe('أحمد محمد');
    expect(escapeCsvCell('Nasr City, Cairo')).toBe('"Nasr City, Cairo"');
    expect(escapeCsvCell('Say "Hi"')).toBe('"Say ""Hi"""');
  });

  it('neutralizes CSV formula injection prefixes (=, +, -, @, tab)', () => {
    expect(escapeCsvCell('=SUM(A1:A2)')).toBe(`"'=SUM(A1:A2)"`);
    expect(escapeCsvCell('+cmd|calc')).toBe(`"'+cmd|calc"`);
    expect(escapeCsvCell('-100')).toBe(`"'-100"`);
    expect(escapeCsvCell('@evil')).toBe(`"'@evil"`);
  });
});
