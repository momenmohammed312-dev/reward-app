import { RawOrderItem } from '../../helpers/rulesEngine.js';

/**
 * Normalized order shape produced by any POS adapter. Adapters translate the
 * vendor-specific webhook payload into this canonical structure so the rest of
 * the pipeline (webhookProcessor, LoyaltyService) never knows the POS vendor.
 */
export interface PosOrder {
  customerPhone: string;
  customerCardNumber?: string;
  customerName?: string;
  totalAmount: number;
  rawTotal?: number;
  discountAmount?: number;
  items?: RawOrderItem[];
  invoiceId?: string;
  branchLocationId?: string;
  branchName?: string;
}

/**
 * A POS adapter turns a vendor webhook payload into a normalized PosOrder.
 * The engine is POS-agnostic: Foodics is the first adapter, others plug in
 * via the registry without touching core logic.
 */
export interface PosAdapter {
  readonly posType: string;
  parseOrder(payload: any): PosOrder;
}
