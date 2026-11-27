import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { CampaignsError, CampaignsService } from '../services/campaigns.js';
import { logger } from '../services/logger.js';

export class CampaignsController {
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const campaigns = await CampaignsService.listCampaigns(req.user!.tenant_id);
      return res.json(campaigns);
    } catch (err: any) {
      logger.error('List campaigns error:', { error: (err as Error).message });
      return res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
  }

  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const created = await CampaignsService.createCampaign(req.user!.tenant_id, req.user?.id, req.body);
      return res.status(201).json(created);
    } catch (err: any) {
      logger.error('Create campaign error:', { error: (err as Error).message });
      return res.status(500).json({ error: 'Failed to create campaign' });
    }
  }

  static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const updated = await CampaignsService.updateCampaign(
        req.user!.tenant_id,
        req.user?.id,
        req.params.id,
        req.body
      );
      return res.json(updated);
    } catch (err: any) {
      if (err instanceof CampaignsError && err.code === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Not Found', message: err.message });
      }
      logger.error('Update campaign error:', { error: (err as Error).message });
      return res.status(500).json({ error: 'Failed to update campaign' });
    }
  }

  static async remove(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await CampaignsService.deleteCampaign(req.user!.tenant_id, req.user?.id, req.params.id);
      return res.json(result);
    } catch (err: any) {
      if (err instanceof CampaignsError && err.code === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Not Found', message: err.message });
      }
      logger.error('Delete campaign error:', { error: (err as Error).message });
      return res.status(500).json({ error: 'Failed to delete campaign' });
    }
  }

  static async getReminderTargets(req: AuthenticatedRequest, res: Response) {
    try {
      const type = req.query.type === 'expiring' ? 'expiring' : 'inactive';
      const days = Math.max(1, Math.min(365, parseInt(req.query.days as string) || (type === 'expiring' ? 7 : 14)));
      const result = await CampaignsService.getReminderTargets(req.user!.tenant_id, { type, days });
      return res.json(result);
    } catch (err: any) {
      if (err instanceof CampaignsError && err.code === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Not Found', message: err.message });
      }
      logger.error('Get reminder targets error:', { error: (err as Error).message });
      return res.status(500).json({ error: 'Failed to fetch reminder targets' });
    }
  }

  static async logReminder(req: AuthenticatedRequest, res: Response) {
    try {
      const { customer_id, channel, reminder_type } = req.body;
      const result = await CampaignsService.logReminderSent(
        req.user!.tenant_id,
        req.user?.id,
        customer_id,
        channel || 'whatsapp',
        reminder_type
      );
      return res.json(result);
    } catch (err: any) {
      if (err instanceof CampaignsError && err.code === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Not Found', message: err.message });
      }
      logger.error('Log reminder error:', { error: (err as Error).message });
      return res.status(500).json({ error: 'Failed to log reminder' });
    }
  }
}
