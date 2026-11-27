import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { OffersError, OffersService } from '../services/offers.js';
import { logger } from '../services/logger.js';

export class OffersController {
  static async listPublic(req: Request, res: Response) {
    try {
      const tenantId = req.query.tenant_id as string | undefined;
      if (!tenantId) {
        return res.status(400).json({ error: 'Missing tenant_id' });
      }
      const offers = await OffersService.listPublicOffers(tenantId);
      return res.json(offers);
    } catch (err: any) {
      if (err instanceof OffersError && err.code === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Not Found', message: err.message });
      }
      logger.error('Public offers error:', { error: (err as Error).message });
      return res.status(500).json({ error: 'Failed to fetch offers' });
    }
  }

  static async listAdmin(req: AuthenticatedRequest, res: Response) {
    try {
      const offers = await OffersService.listAdminOffers(req.user!.tenant_id);
      return res.json(offers);
    } catch (err: any) {
      logger.error('Admin list offers error:', { error: (err as Error).message });
      return res.status(500).json({ error: 'Failed to fetch offers' });
    }
  }

  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const created = await OffersService.createOffer(req.user!.tenant_id, req.user?.id, req.body);
      return res.status(201).json(created);
    } catch (err: any) {
      logger.error('Create offer error:', { error: (err as Error).message });
      return res.status(500).json({ error: 'Failed to create offer' });
    }
  }

  static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const updated = await OffersService.updateOffer(req.user!.tenant_id, req.user?.id, req.params.id, req.body);
      return res.json(updated);
    } catch (err: any) {
      if (err instanceof OffersError && err.code === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Not Found', message: err.message });
      }
      logger.error('Update offer error:', { error: (err as Error).message });
      return res.status(500).json({ error: 'Failed to update offer' });
    }
  }

  static async remove(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await OffersService.deleteOffer(req.user!.tenant_id, req.user?.id, req.params.id);
      return res.json(result);
    } catch (err: any) {
      if (err instanceof OffersError && err.code === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Not Found', message: err.message });
      }
      logger.error('Delete offer error:', { error: (err as Error).message });
      return res.status(500).json({ error: 'Failed to delete offer' });
    }
  }
}
