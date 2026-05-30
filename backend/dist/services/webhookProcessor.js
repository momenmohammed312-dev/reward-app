"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookWorker = exports.webhookQueue = void 0;
const bullmq_1 = require("bullmq");
const loyalty_js_1 = require("./loyalty.js");
const db_js_1 = __importDefault(require("../config/db.js"));
// Initialize the Webhook Queue
const connectionOptions = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
};
exports.webhookQueue = new bullmq_1.Queue('foodics-webhooks', {
    connection: connectionOptions,
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 5000, // 5s, 10s, 20s, 40s...
        },
        removeOnComplete: true, // Keep clean
        removeOnFail: false, // Keep for inspection
    },
});
// Process Webhook Jobs
exports.webhookWorker = new bullmq_1.Worker('foodics-webhooks', async (job) => {
    const { tenantId, eventType, payload, logId } = job.data;
    console.log(`Processing Webhook Job: ${job.id}, Event: ${eventType}, Tenant: ${tenantId}`);
    try {
        // Handle the event based on Foodics specs
        if (eventType === 'order.paid' || eventType === 'order.closed') {
            const order = payload.order || payload;
            const customerPhone = order.customer?.phone;
            const totalAmount = Number(order.total_price || order.total || 0);
            const invoiceId = order.id || order.number;
            const branchLocationId = order.branch?.id || order.branch_id;
            if (!customerPhone) {
                throw new Error('Customer phone number is missing in Foodics order payload');
            }
            // 1. Resolve Customer by Phone (create if doesn't exist under this tenant)
            let customerRes = await db_js_1.default.query('SELECT id FROM customers WHERE tenant_id = $1 AND phone = $2', [tenantId, customerPhone]);
            let customerId;
            if (customerRes.rows.length === 0) {
                const newCustRes = await db_js_1.default.query(`INSERT INTO customers (tenant_id, phone, name, is_verified)
             VALUES ($1, $2, $3, true)
             RETURNING id`, [tenantId, customerPhone, order.customer?.name || 'Foodics Customer']);
                customerId = newCustRes.rows[0].id;
            }
            else {
                customerId = customerRes.rows[0].id;
            }
            // 2. Resolve Branch by location ID
            let branchRes = await db_js_1.default.query('SELECT id FROM branches WHERE tenant_id = $1 AND pos_location_id = $2', [tenantId, branchLocationId]);
            let branchId;
            if (branchRes.rows.length === 0) {
                // Create default fallback branch if not registered
                const newBranchRes = await db_js_1.default.query(`INSERT INTO branches (tenant_id, name, pos_type, pos_location_id, is_active)
             VALUES ($1, $2, 'foodics', $3, true)
             RETURNING id`, [tenantId, order.branch?.name || `Branch ${branchLocationId}`, branchLocationId]);
                branchId = newBranchRes.rows[0].id;
            }
            else {
                branchId = branchRes.rows[0].id;
            }
            // 3. Award Points
            await loyalty_js_1.LoyaltyService.earnPoints(tenantId, customerId, branchId, invoiceId, totalAmount, `Points earned from Foodics Order #${invoiceId}`);
        }
        // Update log to processed
        await db_js_1.default.query("UPDATE webhook_logs SET status = 'processed' WHERE id = $1", [logId]);
    }
    catch (error) {
        console.error(`Failed processing job ${job.id}:`, error.message);
        // Update webhook log with failure status and error details
        await db_js_1.default.query("UPDATE webhook_logs SET status = 'failed', error_message = $1 WHERE id = $2", [error.message, logId]);
        // Re-throw so BullMQ knows it failed and registers the retry/fail
        throw error;
    }
}, { connection: connectionOptions });
exports.webhookWorker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed permanently: ${err.message}`);
});
