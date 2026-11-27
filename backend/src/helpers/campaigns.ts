/**
 * Pure helper utilities for point-multiplier campaigns and safe CSV export.
 */

export interface CampaignRule {
  id: string;
  name: string;
  multiplier: number | string;
  days_of_week?: number[] | null;
  start_hour?: number | null;
  end_hour?: number | null;
  starts_at?: string | Date | null;
  ends_at?: string | Date | null;
  is_active: boolean;
}

/**
 * Resolves the highest active campaign multiplier applicable at `now`.
 * Picks the single highest multiplier >= 1.0 (never stacks multipliers) so
 * grocery margins remain strictly bounded.
 */
export function computeActiveCampaignMultiplier(
  campaigns: CampaignRule[],
  now: Date = new Date(),
  timezoneOffsetHours = 2
): { multiplier: number; matchedCampaignName: string | null } {
  if (!Array.isArray(campaigns) || campaigns.length === 0) {
    return { multiplier: 1, matchedCampaignName: null };
  }

  const shifted = new Date(now.getTime() + timezoneOffsetHours * 3600 * 1000);
  const localDay = shifted.getUTCDay(); // 0 (Sun) .. 6 (Sat)
  const localHour = shifted.getUTCHours(); // 0 .. 23

  let bestMultiplier = 1;
  let bestName: string | null = null;

  for (const campaign of campaigns) {
    if (!campaign?.is_active) continue;

    if (campaign.starts_at) {
      const startsAt = new Date(campaign.starts_at);
      if (!Number.isNaN(startsAt.getTime()) && now < startsAt) continue;
    }

    if (campaign.ends_at) {
      const endsAt = new Date(campaign.ends_at);
      if (!Number.isNaN(endsAt.getTime()) && now > endsAt) continue;
    }

    if (Array.isArray(campaign.days_of_week) && campaign.days_of_week.length > 0) {
      if (!campaign.days_of_week.includes(localDay)) continue;
    }

    if (campaign.start_hour != null && campaign.end_hour != null) {
      const startH = Number(campaign.start_hour);
      const endH = Number(campaign.end_hour);
      if (startH < endH) {
        if (localHour < startH || localHour >= endH) continue;
      } else if (startH > endH) {
        // Overnight window, e.g. 22:00 -> 03:00
        if (localHour < startH && localHour >= endH) continue;
      }
    }

    const mult = Number(campaign.multiplier);
    if (Number.isFinite(mult) && mult > bestMultiplier) {
      bestMultiplier = mult;
      bestName = campaign.name || null;
    }
  }

  return { multiplier: bestMultiplier, matchedCampaignName: bestName };
}

/**
 * Escapes a single cell value for safe UTF-8 CSV export, including formula-injection protection.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  let str = String(value).replace(/\r?\n/g, ' ');
  if (/^[=+\-@\t]/.test(str)) {
    str = `'${str}`;
  }

  if (str.includes(',') || str.includes('"') || str.includes("'")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}
