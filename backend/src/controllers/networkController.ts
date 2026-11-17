import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { NetworkService, NetworkError } from '../services/network.js';
import { NetworkExchangeService } from '../services/networkExchange.js';
import { NetworkSettlementService } from '../services/networkSettlement.js';
import { NetworkCustomerService } from '../services/networkCustomer.js';
import { logger } from '../services/logger.js';

// ─── ERROR MAP ──────────────────────────────────────────────

const ERROR_RESPONSES: Record<string, { status: number; message: string }> = {
  NETWORK_NOT_FOUND:            { status: 404, message: 'Network not found' },
  NETWORK_INACTIVE:             { status: 400, message: 'Network is inactive' },
  TENANT_NOT_FOUND:             { status: 404, message: 'Tenant not found' },
  TENANT_INACTIVE:              { status: 400, message: 'Tenant is inactive' },
  ALREADY_MEMBER:               { status: 409, message: 'Tenant is already a member' },
  INVALID_RATE:                 { status: 400, message: 'Exchange rate must be greater than 0' },
  NOT_NETWORK_MEMBER:           { status: 403, message: 'Tenant is not an active member of this network' },
  SAME_TENANT_REDEMPTION:       { status: 400, message: 'Source and target tenants must be different' },
  RATE_NOT_CONFIGURED:          { status: 400, message: 'Exchange rates are not configured for both tenants' },
  CUSTOMER_NOT_FOUND:           { status: 404, message: 'Customer not found' },
  CUSTOMER_NOT_VERIFIED:        { status: 403, message: 'Customer phone must be verified via OTP' },
  INSUFFICIENT_BALANCE:         { status: 400, message: 'Insufficient points balance' },
  REWARD_UNAVAILABLE:           { status: 400, message: 'Target reward is inactive or limit reached' },
  INSUFFICIENT_EQUIVALENT_POINTS: { status: 400, message: 'Converted points are insufficient for target reward' },
  NO_PENDING_REDEMPTIONS:       { status: 404, message: 'No unsettled cross-tenant redemptions found' },
  SETTLEMENT_NOT_FOUND:         { status: 404, message: 'Settlement not found' },
  SUBSCRIPTION_NOT_FOUND:       { status: 400, message: 'Debtor tenant subscription record not found' },
  NETWORK_CUSTOMER_NOT_FOUND:   { status: 404, message: 'Network customer identity not found' },
};

function handleNetworkError(err: unknown, res: Response, context: string) {
  if (err instanceof NetworkError) {
    const mapped = ERROR_RESPONSES[err.code];
    if (mapped) {
      return res.status(mapped.status).json({ error: mapped.message, details: err.message });
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

  // ─── PHASE 2: EXCHANGE RATES ───────────────────────────────
  static async getNetworkRates(req: AuthenticatedRequest, res: Response) {
    try {
      const rates = await NetworkExchangeService.getNetworkRates(req.params.id);
      res.json({ rates });
    } catch (err) {
      handleNetworkError(err, res, 'Get network rates error');
    }
  }

  static async getMyNetworkRates(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenant_id;
      if (!tenantId) return res.status(400).json({ error: 'tenant_id required' });
      const rates = await NetworkExchangeService.getNetworkRates(req.params.id);
      res.json({ rates });
    } catch (err) {
      handleNetworkError(err, res, 'Get my network rates error');
    }
  }

  static async upsertMyExchangeRate(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenant_id;
      if (!tenantId) return res.status(400).json({ error: 'tenant_id required' });
      const rate = await NetworkExchangeService.upsertTenantRate(
        req.params.id,
        tenantId,
        req.body.egp_per_point,
        req.user?.id
      );
      res.json({ rate });
    } catch (err) {
      handleNetworkError(err, res, 'Upsert exchange rate error');
    }
  }

  // ─── PHASE 3: PREVIEW & CROSS-TENANT REDEMPTION ────────────
  static async previewCrossConversion(req: AuthenticatedRequest, res: Response) {
    try {
      const sourceTenantId = req.user?.tenant_id;
      if (!sourceTenantId) return res.status(400).json({ error: 'tenant_id required' });
      const conversion = await NetworkExchangeService.previewConversion(
        req.params.id,
        sourceTenantId,
        req.body.target_tenant_id,
        req.body.source_points
      );
      res.json({ conversion });
    } catch (err) {
      handleNetworkError(err, res, 'Preview conversion error');
    }
  }

  static async crossTenantRedeem(req: AuthenticatedRequest, res: Response) {
    try {
      const sourceTenantId = req.user?.tenant_id;
      const sourceCustomerId = req.user?.id;
      if (!sourceTenantId || !sourceCustomerId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const redemption = await NetworkExchangeService.redeemAcrossNetwork({
        networkId: req.params.id,
        sourceTenantId,
        sourceCustomerId,
        targetTenantId: req.body.target_tenant_id,
        targetRewardId: req.body.target_reward_id,
        sourcePoints: req.body.source_points,
        idempotencyKey: req.body.idempotency_key,
      });
      res.status(201).json({ redemption });
    } catch (err) {
      handleNetworkError(err, res, 'Cross-tenant redemption error');
    }
  }

  // ─── PHASE 4: POSITIONS & SETTLEMENTS ──────────────────────
  static async getNetworkNetPositions(req: AuthenticatedRequest, res: Response) {
    try {
      const positions = await NetworkSettlementService.getPendingNetPositions(req.params.id);
      res.json({ positions });
    } catch (err) {
      handleNetworkError(err, res, 'Get network net positions error');
    }
  }

  static async getMyNetPositions(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenant_id;
      if (!tenantId) return res.status(400).json({ error: 'tenant_id required' });
      const positions = await NetworkSettlementService.getPendingNetPositions(req.params.id, tenantId);
      res.json({ positions });
    } catch (err) {
      handleNetworkError(err, res, 'Get my net positions error');
    }
  }

  static async getNetworkSettlements(req: AuthenticatedRequest, res: Response) {
    try {
      const settlements = await NetworkSettlementService.getNetworkSettlements(req.params.id);
      res.json({ settlements });
    } catch (err) {
      handleNetworkError(err, res, 'Get network settlements error');
    }
  }

  static async getMyNetworkSettlements(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenant_id;
      if (!tenantId) return res.status(400).json({ error: 'tenant_id required' });
      const settlements = await NetworkSettlementService.getNetworkSettlements(req.params.id, tenantId);
      res.json({ settlements });
    } catch (err) {
      handleNetworkError(err, res, 'Get my network settlements error');
    }
  }

  static async createNetworkSettlement(req: AuthenticatedRequest, res: Response) {
    try {
      const result = await NetworkSettlementService.createSettlement({
        networkId: req.params.id,
        fromTenantId: req.body.from_tenant_id,
        toTenantId: req.body.to_tenant_id,
        method: req.body.method,
        idempotencyKey: req.body.idempotency_key,
      });
      res.status(201).json(result);
    } catch (err) {
      handleNetworkError(err, res, 'Create network settlement error');
    }
  }

  static async processSettlement(req: AuthenticatedRequest, res: Response) {
    try {
      const settlement = await NetworkSettlementService.processSettlementJob(req.params.settlementId);
      res.json({ settlement });
    } catch (err) {
      handleNetworkError(err, res, 'Process settlement error');
    }
  }

  // ─── PHASE 5: UNIFIED NETWORK CUSTOMER IDENTITY ───────────
  static async requestNetworkLinkOtp(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenant_id;
      if (!tenantId) return res.status(400).json({ error: 'tenant_id required' });
      const result = await NetworkCustomerService.requestLinkOtp(req.params.id, tenantId, req.body.phone);
      res.json(result);
    } catch (err) {
      handleNetworkError(err, res, 'Request network link OTP error');
    }
  }

  static async verifyAndLinkNetworkCustomer(req: AuthenticatedRequest, res: Response) {
    try {
      const tenantId = req.user?.tenant_id;
      if (!tenantId) return res.status(400).json({ error: 'tenant_id required' });
      const wallet = await NetworkCustomerService.verifyAndLinkCustomer(
        req.params.id,
        tenantId,
        req.body.phone,
        req.body.code
      );
      res.json({ wallet });
    } catch (err) {
      if (err instanceof Error && !(err instanceof NetworkError) && err.message.toLowerCase().includes('otp')) {
        return res.status(400).json({ error: 'Invalid OTP', message: err.message });
      }
      handleNetworkError(err, res, 'Verify network link OTP error');
    }
  }

  static async getUnifiedNetworkWallet(req: AuthenticatedRequest, res: Response) {
    try {
      const phone = req.user?.phone;
      if (!phone) return res.status(400).json({ error: 'Customer phone context required' });
      const wallet = await NetworkCustomerService.getUnifiedProfile(req.params.id, phone);
      res.json({ wallet });
    } catch (err) {
      handleNetworkError(err, res, 'Get unified network wallet error');
    }
  }
}
