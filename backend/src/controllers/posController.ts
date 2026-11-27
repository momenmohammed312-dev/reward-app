import { Response } from 'express';
import { PosAuthenticatedRequest } from '../middlewares/posApiKeyAuth.js';
import { PosApiError, PosApiService } from '../services/posApi.js';
import { logger } from '../services/logger.js';

export class PosController {
  static async getCustomer(req: PosAuthenticatedRequest, res: Response) {
    try {
      const data = await PosApiService.getCustomer(req.posContext!.tenantId, req.params.identifier);
      return res.json(data);
    } catch (err: unknown) {
      if (err instanceof PosApiError) {
        return res.status(err.statusCode).json({ error: err.code, message: err.message });
      }
      logger.error('POS getCustomer error', { error: err instanceof Error ? err.message : String(err) });
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async earn(req: PosAuthenticatedRequest, res: Response) {
    try {
      const result = await PosApiService.earn(
        req.posContext!.tenantId,
        req.posContext!.branchId,
        req.body
      );
      return res.json(result);
    } catch (err: unknown) {
      if (err instanceof PosApiError) {
        return res.status(err.statusCode).json({ error: err.code, message: err.message });
      }
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('POS earn error', { error: msg });
      return res.status(400).json({ error: 'POS_EARN_FAILED', message: msg });
    }
  }

  static async redeem(req: PosAuthenticatedRequest, res: Response) {
    try {
      const result = await PosApiService.redeem(
        req.posContext!.tenantId,
        req.posContext!.branchId,
        req.body
      );
      return res.json(result);
    } catch (err: unknown) {
      if (err instanceof PosApiError) {
        return res.status(err.statusCode).json({ error: err.code, message: err.message });
      }
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('POS redeem error', { error: msg });
      return res.status(400).json({ error: 'POS_REDEEM_FAILED', message: msg });
    }
  }

  static async refund(req: PosAuthenticatedRequest, res: Response) {
    try {
      const result = await PosApiService.refund(req.posContext!.tenantId, req.body);
      return res.json(result);
    } catch (err: unknown) {
      if (err instanceof PosApiError) {
        return res.status(err.statusCode).json({ error: err.code, message: err.message });
      }
      const msg = err instanceof Error ? err.message : String(err);
      logger.error('POS refund error', { error: msg });
      return res.status(400).json({ error: 'POS_REFUND_FAILED', message: msg });
    }
  }
}
