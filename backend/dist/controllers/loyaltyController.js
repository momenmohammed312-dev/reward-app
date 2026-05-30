"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoyaltyController = void 0;
const db_js_1 = __importDefault(require("../config/db.js"));
const loyalty_js_1 = require("../services/loyalty.js");
class LoyaltyController {
    /**
     * Retrieves profile & point balance for the authenticated customer.
     */
    static async getCustomerProfile(req, res) {
        try {
            const customerId = req.user?.id;
            if (!customerId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const summary = await loyalty_js_1.LoyaltyService.getCustomerPointsSummary(customerId);
            res.json(summary);
        }
        catch (error) {
            res.status(404).json({ error: 'Not Found', message: error.message });
        }
    }
    /**
     * Retrieves points ledger history for the authenticated customer.
     */
    static async getLedgerHistory(req, res) {
        try {
            const customerId = req.user?.id;
            const tenantId = req.user?.tenant_id;
            if (!customerId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const result = await db_js_1.default.query(`SELECT type, points, reference_type, note, created_at
         FROM wallet_ledger
         WHERE tenant_id = $1 AND customer_id = $2
         ORDER BY created_at DESC`, [tenantId, customerId]);
            res.json(result.rows);
        }
        catch (error) {
            console.error('Ledger history error', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    /**
     * Allows admins to manually award bonus points to a customer.
     */
    static async adminEarnPointsManual(req, res) {
        try {
            const tenantId = req.user?.tenant_id;
            const { customer_id, amount, note } = req.body;
            if (!customer_id || !amount) {
                return res.status(400).json({ error: 'Missing fields', message: 'customer_id and amount are required' });
            }
            // Record a manual bonus ledger record
            await db_js_1.default.query(`INSERT INTO wallet_ledger (tenant_id, customer_id, type, points, note, created_by)
         VALUES ($1, $2, 'bonus', $3, $4, $5)`, [tenantId, customer_id, amount, note || 'Manual points adjustment', req.user?.email || 'admin']);
            res.json({ message: 'Points awarded successfully' });
        }
        catch (error) {
            console.error('Admin earn error', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    /**
     * Customer initiates a reward redemption from their mobile PWA.
     */
    static async customerRedeemReward(req, res) {
        try {
            const customerId = req.user?.id;
            const tenantId = req.user?.tenant_id;
            const { reward_id } = req.body;
            if (!reward_id) {
                return res.status(400).json({ error: 'Missing fields', message: 'reward_id is required' });
            }
            const result = await loyalty_js_1.LoyaltyService.redeemReward(tenantId, customerId, reward_id);
            res.json(result);
        }
        catch (error) {
            res.status(400).json({ error: 'Redemption Failed', message: error.message });
        }
    }
    /**
     * Cashier processes/validates a redemption code at checkout.
     */
    static async cashierProcessRedemption(req, res) {
        try {
            const tenantId = req.user?.tenant_id;
            const { code } = req.body;
            if (!code) {
                return res.status(400).json({ error: 'Missing fields', message: 'code is required' });
            }
            // Check if code is valid, unused, and not expired
            const result = await db_js_1.default.query(`SELECT r.*, rw.name as reward_name, rw.reward_type, rw.discount_value, c.name as customer_name, c.phone as customer_phone
         FROM redemptions r
         JOIN rewards rw ON r.reward_id = rw.id
         JOIN customers c ON r.customer_id = c.id
         WHERE r.code = $1 AND r.tenant_id = $2`, [code, tenantId]);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Not Found', message: 'Invalid redemption code' });
            }
            const redemption = result.rows[0];
            if (redemption.used_at) {
                return res.status(400).json({ error: 'Redemption Failed', message: `Code has already been used on ${redemption.used_at}` });
            }
            if (new Date() > new Date(redemption.expires_at)) {
                return res.status(400).json({ error: 'Redemption Failed', message: 'Redemption code has expired' });
            }
            // Mark the code as used
            await db_js_1.default.query(`UPDATE redemptions
         SET used_at = NOW(), branch_id = (SELECT id FROM branches WHERE tenant_id = $1 LIMIT 1) -- default to first branch for demo
         WHERE id = $2`, [tenantId, redemption.id]);
            res.json({
                message: 'Redemption processed successfully',
                reward: {
                    name: redemption.reward_name,
                    type: redemption.reward_type,
                    discount_value: redemption.discount_value,
                },
                customer: {
                    name: redemption.customer_name,
                    phone: redemption.customer_phone,
                },
            });
        }
        catch (error) {
            console.error('Process redemption error', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
exports.LoyaltyController = LoyaltyController;
