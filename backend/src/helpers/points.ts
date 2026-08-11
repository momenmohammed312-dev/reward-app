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
