"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tenantController_js_1 = require("../controllers/tenantController.js");
const auth_js_1 = require("../middlewares/auth.js");
const router = (0, express_1.Router)();
// Create tenant (Public signup / Super Admin)
router.post('/', tenantController_js_1.TenantController.createTenant);
// Get current tenant configuration
router.get('/me', auth_js_1.authenticateJWT, tenantController_js_1.TenantController.getTenant);
// Create branch
router.post('/branches', auth_js_1.authenticateJWT, (0, auth_js_1.requireRole)(['owner', 'manager']), tenantController_js_1.TenantController.createBranch);
// Get all branches of tenant
router.get('/branches', auth_js_1.authenticateJWT, tenantController_js_1.TenantController.getBranches);
// Regenerate API Key for branch integration
router.post('/branches/:branch_id/regenerate-key', auth_js_1.authenticateJWT, (0, auth_js_1.requireRole)(['owner']), tenantController_js_1.TenantController.regenerateBranchApiKey);
exports.default = router;
