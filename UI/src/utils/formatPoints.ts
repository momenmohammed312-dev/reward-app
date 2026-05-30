// src/utils/formatPoints.ts

/**
 * Formats points into Arabic representation.
 * Custom styling classes should be applied to the numeric part if rendered in JSX.
 */
export function formatPoints(points: number): string {
  if (points === 0) return "٠ نقطة";
  if (points === 1) return "نقطة واحدة";
  if (points === 2) return "نقطتان";
  if (points >= 3 && points <= 10) return `${points} نقاط`;
  return `${points} نقطة`;
}
