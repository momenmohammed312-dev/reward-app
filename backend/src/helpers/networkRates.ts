export interface CrossTenantConversion {
  sourcePoints: number;
  sourceEgpPerPoint: number;
  targetEgpPerPoint: number;
  egpValue: number;
  targetPointsEquivalent: number;
}

/**
 * Pure cross-tenant point valuation & conversion helper.
 *
 * Converts `sourcePoints` at `sourceEgpPerPoint` into EGP monetary value
 * (rounded to 4 decimal places) and derives equivalent integer points in
 * the target tenant at `targetEgpPerPoint` (floored, conservative for issuer).
 */
export function calculateCrossTenantPoints(
  sourcePoints: number,
  sourceEgpPerPoint: number,
  targetEgpPerPoint: number
): CrossTenantConversion {
  if (!Number.isInteger(sourcePoints) || sourcePoints <= 0) {
    throw new Error('sourcePoints must be a positive integer');
  }
  if (!Number.isFinite(sourceEgpPerPoint) || sourceEgpPerPoint <= 0) {
    throw new Error('sourceEgpPerPoint must be greater than 0');
  }
  if (!Number.isFinite(targetEgpPerPoint) || targetEgpPerPoint <= 0) {
    throw new Error('targetEgpPerPoint must be greater than 0');
  }

  const egpValue = Math.round(sourcePoints * sourceEgpPerPoint * 10000) / 10000;
  const targetPointsEquivalent = Math.floor(egpValue / targetEgpPerPoint);

  return {
    sourcePoints,
    sourceEgpPerPoint,
    targetEgpPerPoint,
    egpValue,
    targetPointsEquivalent,
  };
}

/**
 * Computes settlement amount in EGP (rounded cleanly to 2 decimal places).
 */
export function roundEgpAmount(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('amount must be a non-negative finite number');
  }
  return Math.round(amount * 100) / 100;
}
