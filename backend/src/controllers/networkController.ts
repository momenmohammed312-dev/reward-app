import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { NetworkService, NetworkError } from '../services/network.js';
import { logger } from '../services/logger.js';

// ─── ERROR MAP ──────────────────────────────────────────────

const ERROR_RESPONSES: Record<string, { status: number; message: string }> = {
  NETWORK_NOT_FOUND: { status: 404, message: 'Network not found' },
  NETWORK_INACTIVE:  { status: 400, message: 'Network is inactive' },
  TENANT_NOT_FOUND:  { status: 404, message: 'Tenant not found' },
  TENANT_INACTIVE:   { status: 400, message: 'Tenant is inactive' },
  ALREADY_MEMBER:    { status: 409, message: 'Tenant is already a member' },
};

function handleNetworkError(err: unknown, res: Response, context: string) {
  if (err instanceof NetworkError) {
    const mapped = ERROR_RESPONSES[err.code];
    if (mapped) {
      return res.status(mapped.status).json({ error: mapped.message });
    }
  }
  const message = err instanceof Error ? err.message : String(err);
  logger.error(`${context}:`, { error: message });
  res.status(500).json({ error: 'Internal server error' });
}

// ─── CONTROLLER ─────────────────────────────────────────────

export class NetworkController {

  // ─── SUPERADMIN: CREATE NETWORK ────────────────────────────
  static async createNetwork(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, slug, description, logo_url } = req.body;

      const existing = await NetworkService.getBySlug(slug);
      if (existing) {
        return res.status(409).json({ error: 'Slug already exists' });
      }

      const network = await NetworkService.create({
        name,
        slug,
        description,
        logo_url,
        created_by: req.user?.id,
      });

      res.status(201).json({ network });
    } catch (err) {
      handleNetworkError(err, res, 'Create network error');
    }
  }

  // ─── SUPERADMIN: LIST ALL NETWORKS ─────────────────────────
  static async getAllNetworks(_req: AuthenticatedRequest, res: Response) {
    try {
      const networks = await NetworkService.getAll();
      res.json({ networks });
    } catch (err) {
      handleNetworkError(err, res, 'Get all networks error');
    }
  }

  // ─── SUPERADMIN: GET NETWORK BY ID ─────────────────────────
  static async getNetworkById(req: AuthenticatedRequest, res: Response) {
    try {
      const network = await NetworkService.getById(req.params.id);
      if (!network) {
        return res.status(404).json({ error: 'Network not found' });
      }
      res.json({ network });
    } catch (err) {
      handleNetworkError(err, res, 'Get network error');
    }
  }

  // ─── SUPERADMIN: UPDATE NETWORK ────────────────────────────
  static async updateNetwork(req: AuthenticatedRequest, res: Response) {
    try {
      const { name, description, logo_url, is_active } = req.body;
      const network = await NetworkService.update(req.params.id, {
        name, description, logo_url, is_active,
      });
      if (!network) {
        return res.status(404).json({ error: 'Network not found' });
      }
      res.json({ network });
    } catch (err) {
      handleNetworkError(err, res, 'Update network error');
    }
  }

  // ─── SUPERADMIN: DEACTIVATE NETWORK ────────────────────────
  static async deactivateNetwork(req: AuthenticatedRequest, res: Response) {
    try {
      const deactivated = await NetworkService.deactivate(req.params.id);
      if (!deactivated) {
        return res.status(404).json({ error: 'Network not found' });
      }
      res.json({ message: 'Network deactivated', id: req.params.id });
    } catch (err) {
      handleNetworkError(err, res, 'Deactivate network error');
    }
  }

  // ─── SUPERADMIN: ADD TENANT TO NETWORK ─────────────────────
  static async addMember(req: AuthenticatedRequest, res: Response) {
    try {
      const { tenant_id } = req.body;
      const membership = await NetworkService.addMember(req.params.id, tenant_id);
      res.status(201).json({ membership });
    } catch (err) {
      handleNetworkError(err, res, 'Add network member error');
    }
  }

  // ─── SUPERADMIN: REMOVE TENANT FROM NETWORK ────────────────
  static async removeMember(req: AuthenticatedRequest, res: Response) {
    try {
      const removed = await NetworkService.removeMember(req.params.id, req.params.tenantId);
      if (!removed) {
        return res.status(404).json({ error: 'Membership not found' });
      }
      res.json({ message: 'Member removed' });
    } catch (err) {
      handleNetworkError(err, res, 'Remove network member error');
    }
  }

  // ─── SUPERADMIN: SUSPEND TENANT FROM NETWORK ───────────────
  static async suspendMember(req: AuthenticatedRequest, res: Response) {
    try {
      const suspended = await NetworkService.suspendMember(req.params.id, req.params.tenantId);
      if (!suspended) {
        return res.status(404).json({ error: 'Membership not found' });
      }
      res.json({ message: 'Member suspended' });
    } catch (err) {
      handleNetworkError(err, res, 'Suspend network member error');
    }
  }

  // ─── TENANT: GET MY NETWORKS ───────────────────────────────
  static async getMyNetworks(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenant_id;
      if (!tenantId) {
        return res.status(400).json({ error: 'tenant_id required' });
      }
      const networks = await NetworkService.getByTenantId(tenantId);
      res.json({ networks });
    } catch (err) {
      handleNetworkError(err, res, 'Get my networks error');
    }
  }

  // ─── TENANT: GET NETWORK DETAILS ───────────────────────────
  static async getMyNetworkDetails(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenant_id;
      if (!tenantId) {
        return res.status(400).json({ error: 'tenant_id required' });
      }

      const networkId = req.params.id;
      const isMember = await NetworkService.isMember(networkId, tenantId);
      if (!isMember) {
        return res.status(403).json({ error: 'You are not a member of this network' });
      }

      const network = await NetworkService.getById(networkId);
      if (!network) {
        return res.status(404).json({ error: 'Network not found' });
      }
      res.json({ network });
    } catch (err) {
      handleNetworkError(err, res, 'Get my network details error');
    }
  }

  // ─── TENANT: LEAVE NETWORK ─────────────────────────────────
  static async leaveNetwork(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenant_id;
      if (!tenantId) {
        return res.status(400).json({ error: 'tenant_id required' });
      }

      const networkId = req.params.id;
      const removed = await NetworkService.removeMember(networkId, tenantId);
      if (!removed) {
        return res.status(404).json({ error: 'You are not a member of this network' });
      }
      res.json({ message: 'Left network successfully' });
    } catch (err) {
      handleNetworkError(err, res, 'Leave network error');
    }
  }
}
