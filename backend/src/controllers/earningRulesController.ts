import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { EarningRuleError, EarningRulesService } from '../services/earningRules.js';
import { logger } from '../services/logger.js';

export class EarningRulesController {
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const rules = await EarningRulesService.list(req.user!.tenant_id);
      return res.json(rules);
    } catch (err: unknown) {
      logger.error('List earning rules error', { error: err instanceof Error ? err.message : String(err) });
      return res.status(500).json({ error: 'Failed to fetch earning rules' });
    }
  }

  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const created = await EarningRulesService.create(req.user!.tenant_id, req.body);
      return res.status(201).json(created);
    } catch (err: unknown) {
      logger.error('Create earning rule error', { error: err instanceof Error ? err.message : String(err) });
      return res.status(500).json({ error: 'Failed to create earning rule' });
    }
  }

  static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const updated = await EarningRulesService.update(req.user!.tenant_id, req.params.id, req.body);
      return res.json(updated);
    } catch (err: unknown) {
      if (err instanceof EarningRuleError && err.code === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Not Found', message: err.message });
      }
      logger.error('Update earning rule error', { error: err instanceof Error ? err.message : String(err) });
      return res.status(500).json({ error: 'Failed to update earning rule' });
    }
  }

  static async remove(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await EarningRulesService.remove(req.user!.tenant_id, req.params.id);
      return res.json(result);
    } catch (err: unknown) {
      if (err instanceof EarningRuleError && err.code === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Not Found', message: err.message });
      }
      logger.error('Delete earning rule error', { error: err instanceof Error ? err.message : String(err) });
      return res.status(500).json({ error: 'Failed to delete earning rule' });
    }
  }
}
