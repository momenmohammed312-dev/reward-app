import { normalizePhone } from '../../helpers/phone.js';
import { PosAdapter, PosOrder } from './posAdapter.js';

/**
 * Foodics webhook adapter. Maps the Foodics order payload (the vendor's
 * current field layout) onto the canonical PosOrder shape.
 */
export class FoodicsAdapter implements PosAdapter {
  readonly posType = 'foodics';

  parseOrder(payload: any): PosOrder {
    const order = payload.order || payload || {};

    return {
      customerPhone: normalizePhone(order.customer?.phone || ''),
      customerName: order.customer?.name,
      totalAmount: Number(order.total_price || order.total || 0),
      invoiceId: order.id || order.number,
      branchLocationId: order.branch?.id || order.branch_id,
      branchName: order.branch?.name,
    };
  }
}
