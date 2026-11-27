import { FoodicsAdapter } from './foodicsAdapter.js';
import { CustomApiAdapter } from './customApiAdapter.js';
import { PosAdapter } from './posAdapter.js';

const adapters = new Map<string, PosAdapter>();

export class UnsupportedPosAdapterError extends Error {
  constructor(posType?: string) {
    super(`Unsupported POS adapter: ${posType || '(missing)'}`);
    this.name = 'UnsupportedPosAdapterError';
  }
}

/**
 * Registers a POS adapter by its pos_type key.
 */
export function registerAdapter(adapter: PosAdapter): void {
  adapters.set(adapter.posType.toLowerCase(), adapter);
}

/**
 * Returns the adapter for a pos_type using a strict fail-closed policy.
 * Unknown or missing POS types throw UnsupportedPosAdapterError instead of
 * silently parsing payloads with the wrong vendor format.
 */
export function getAdapter(posType?: string): PosAdapter {
  const key = (posType || '').trim().toLowerCase();
  if (!key) {
    throw new UnsupportedPosAdapterError(posType);
  }
  const adapter = adapters.get(key);
  if (!adapter) {
    throw new UnsupportedPosAdapterError(posType);
  }
  return adapter;
}

registerAdapter(new FoodicsAdapter());
registerAdapter(new CustomApiAdapter());
