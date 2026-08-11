import { FoodicsAdapter } from './foodicsAdapter.js';
import { PosAdapter } from './posAdapter.js';

const adapters = new Map<string, PosAdapter>();

/**
 * Registers a POS adapter by its pos_type key.
 */
export function registerAdapter(adapter: PosAdapter): void {
  adapters.set(adapter.posType.toLowerCase(), adapter);
}

/**
 * Returns the adapter for a pos_type. Unknown types fail open to the Foodics
 * adapter so a mislabelled payload never breaks the pipeline (Foodics is the
 * only integrated POS today).
 */
export function getAdapter(posType?: string): PosAdapter {
  const key = (posType || 'foodics').toLowerCase();
  return adapters.get(key) ?? adapters.get('foodics')!;
}

registerAdapter(new FoodicsAdapter());
