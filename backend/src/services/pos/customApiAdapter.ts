import { normalizePhone } from '../../helpers/phone.js';
import { calculateEligibleAmount } from '../../helpers/points.js';
import { PosAdapter, PosOrder } from './posAdapter.js';

/**
 * Generic retail / supermarket POS webhook adapter (Odoo POS, ERPNext, custom local POS).
 * Supports both flat retail JSON payloads and nested `{ order: { ... } }` envelopes,
 * and deducts excluded items (e.g. cigarettes, recharge cards) from totalAmount.
 */
export class CustomApiAdapter implements PosAdapter {
  readonly posType = 'custom_api';

  parseOrder(payload: any, excludedKeywords?: string[]): PosOrder {
    const order = payload?.order || payload || {};
    const rawTotal = Number(order.total_amount ?? order.total_price ?? order.total ?? order.amount ?? 0);
    const items = Array.isArray(order.items) ? order.items : undefined;
    const totalAmount = calculateEligibleAmount(rawTotal, items, excludedKeywords);

    return {
      customerPhone: normalizePhone(
        order.customer_phone || order.phone || order.customer?.phone || ''
      ),
      customerName: order.customer_name || order.customer?.name,
      totalAmount,
      invoiceId: order.invoice_id || order.id || order.number || order.receipt_number,
      branchLocationId: order.branch_location_id || order.branch_id || order.branch?.id,
      branchName: order.branch_name || order.branch?.name,
    };
  }
}
