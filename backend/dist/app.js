"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const authRoutes_js_1 = __importDefault(require("./routes/authRoutes.js"));
const tenantRoutes_js_1 = __importDefault(require("./routes/tenantRoutes.js"));
const loyaltyRoutes_js_1 = __importDefault(require("./routes/loyaltyRoutes.js"));
const webhookRoutes_js_1 = __importDefault(require("./routes/webhookRoutes.js"));
const adminRoutes_js_1 = __importDefault(require("./routes/adminRoutes.js"));
const rewardsRoutes_js_1 = __importDefault(require("./routes/rewardsRoutes.js"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/auth', authRoutes_js_1.default);
app.use('/api/tenants', tenantRoutes_js_1.default);
app.use('/api/loyalty', loyaltyRoutes_js_1.default);
app.use('/api/webhooks', webhookRoutes_js_1.default);
app.use('/api/admin', adminRoutes_js_1.default);
app.use('/api/rewards', rewardsRoutes_js_1.default);
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});
exports.default = app;
