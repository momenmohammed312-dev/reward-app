import { Router } from 'express';
import { AdminController } from '../controllers/adminController.js';
import { OffersController } from '../controllers/offersController.js';
import { CampaignsController } from '../controllers/campaignsController.js';
import { EarningRulesController } from '../controllers/earningRulesController.js';
import { authenticateJWT, requireRole, requireSubscription } from '../middlewares/auth.js';
import { validate, schemas } from '../middlewares/validate.js';

const router = Router();

router.use(authenticateJWT, requireRole(['owner', 'manager']), requireSubscription);

router.get('/stats', AdminController.getStats);

/**
 * @swagger
 * /api/admin/customers/export:
 *   get:
 *     summary: Export filtered tenant customers as UTF-8 CSV
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: CSV file download
 */
router.get('/customers/export', AdminController.exportCustomers);
router.get('/customers', AdminController.getCustomers);

/**
 * @swagger
 * /api/admin/customers:
 *   post:
 *     summary: Create a new tenant customer from Admin Dashboard (with optional initial bonus points)
 *     tags: [Admin]
 *     responses:
 *       201:
 *         description: Customer created
 *       409:
 *         description: Customer phone already exists for this tenant
 */
router.post('/customers', validate(schemas.createCustomer), AdminController.createCustomer);

/**
 * @swagger
 * /api/admin/customers/{id}/ledger:
 *   get:
 *     summary: Fetch full wallet ledger, transactions, and redemptions for one customer
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Customer ledger bundle
 */
router.get('/customers/:id/ledger', AdminController.getCustomerLedger);
router.patch('/customers/:id', validate(schemas.updateCustomer), AdminController.updateCustomer);
router.delete('/customers/:id', AdminController.deleteCustomer);

router.get('/rewards', AdminController.getRewards);
router.post('/rewards', validate(schemas.createReward), AdminController.createReward);
router.patch('/rewards/:id', validate(schemas.updateReward), AdminController.updateReward);
router.delete('/rewards/:id', AdminController.deleteReward);

router.get('/branches', AdminController.getBranches);
router.post('/branches', validate(schemas.createBranch), AdminController.createBranch);
router.patch('/branches/:id', validate(schemas.updateBranch), AdminController.updateBranch);
router.delete('/branches/:id', AdminController.deleteBranch);

router.get('/staff', AdminController.getStaff);

/**
 * @swagger
 * /api/admin/staff:
 *   post:
 *     summary: Create a cashier or manager user for this tenant
 *     tags: [Admin]
 *     responses:
 *       201:
 *         description: Staff user created
 */
router.post('/staff', validate(schemas.createStaff), AdminController.createStaff);
router.patch('/staff/:id', validate(schemas.updateStaff), AdminController.updateStaff);
router.patch('/users/:id/branch', validate(schemas.assignBranch), AdminController.assignBranchToUser);

/**
 * @swagger
 * /api/admin/transactions:
 *   get:
 *     summary: List tenant purchase transactions for manager review and refunds
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Paginated transactions
 */
router.get('/transactions', AdminController.getTransactions);

/**
 * @swagger
 * /api/admin/redemptions:
 *   get:
 *     summary: List voucher/reward redemptions for daily reconciliation
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Paginated redemptions
 */
router.get('/redemptions', AdminController.getRedemptions);

/**
 * @swagger
 * /api/admin/audit-log:
 *   get:
 *     summary: List admin and cashier activity log entries
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Paginated audit log
 */
router.get('/audit-log', AdminController.getAuditLog);

/**
 * @swagger
 * /api/admin/pos/config:
 *   get:
 *     summary: Fetch tenant POS webhook configuration, branch keys, and logs
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: POS config bundle
 */
router.get('/pos/config', AdminController.getPosConfig);

/**
 * @swagger
 * /api/admin/pos/test-webhook:
 *   post:
 *     summary: Dry-run simulator for custom POS order payloads
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Simulated calculation result
 */
router.post('/pos/test-webhook', validate(schemas.posTestWebhook), AdminController.testPosWebhook);

/**
 * @swagger
 * /api/admin/offers:
 *   get:
 *     summary: List weekly offers managed by store admin
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Weekly offers list
 */
router.get('/offers', OffersController.listAdmin);
router.post('/offers', validate(schemas.createOffer), OffersController.create);
router.patch('/offers/:id', validate(schemas.updateOffer), OffersController.update);
router.delete('/offers/:id', OffersController.remove);

/**
 * @swagger
 * /api/admin/campaigns:
 *   get:
 *     summary: List point-multiplier campaigns (e.g. Happy Hours)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Campaigns list
 */
router.get('/campaigns', CampaignsController.list);
router.post('/campaigns', validate(schemas.createCampaign), CampaignsController.create);
router.patch('/campaigns/:id', validate(schemas.updateCampaign), CampaignsController.update);
router.delete('/campaigns/:id', CampaignsController.remove);

router.get('/reminders/targets', CampaignsController.getReminderTargets);
router.post('/reminders/log', validate(schemas.logReminder), CampaignsController.logReminder);

/**
 * @swagger
 * /api/admin/earning-rules:
 *   get:
 *     summary: List supermarket earning rules (exclusions, category multipliers, basket bonuses)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Earning rules list
 */
router.get('/earning-rules', EarningRulesController.list);
router.post('/earning-rules', validate(schemas.createEarningRule), EarningRulesController.create);
router.patch('/earning-rules/:id', validate(schemas.updateEarningRule), EarningRulesController.update);
router.delete('/earning-rules/:id', EarningRulesController.remove);

router.get('/stats/chart', AdminController.getStatsChart);
router.get('/analytics/retention', AdminController.getRetentionAnalytics);
router.get('/tiers', AdminController.getTierBenefits);
router.put('/tiers', validate(schemas.updateTiers), AdminController.updateTierBenefits);

export default router;
