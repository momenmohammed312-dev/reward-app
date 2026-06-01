"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_js_1 = __importDefault(require("../config/db.js"));
const otp_js_1 = require("../services/otp.js");
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_me_in_production';
class AuthController {
    /**
     * Registers a new dashboard user for a tenant.
     */
    static async registerUser(req, res) {
        try {
            const { tenant_id, email, password, name, role } = req.body;
            if (!tenant_id || !email || !password) {
                return res.status(400).json({ error: 'Missing fields', message: 'tenant_id, email, and password are required' });
            }
            // Check if tenant exists
            const tenantCheck = await db_js_1.default.query('SELECT id FROM tenants WHERE id = $1', [tenant_id]);
            if (tenantCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Not Found', message: 'Tenant not found' });
            }
            // Hash password
            const passwordHash = await bcrypt_1.default.hash(password, 10);
            // Save user
            const result = await db_js_1.default.query(`INSERT INTO users (tenant_id, email, password_hash, name, role)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, name, role`, [tenant_id, email, passwordHash, name || null, role || 'manager']);
            res.status(201).json({ message: 'User registered successfully', user: result.rows[0] });
        }
        catch (error) {
            if (error.code === '23505') { // Unique constraint violation
                return res.status(409).json({ error: 'Conflict', message: 'User with this email already exists for this tenant' });
            }
            console.error('Register error', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    /**
     * Logins a dashboard user.
     */
    static async loginUser(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ error: 'Missing fields', message: 'Email and password are required' });
            }
            // Find user
            const result = await db_js_1.default.query(`SELECT u.*, t.name as tenant_name FROM users u
         JOIN tenants t ON u.tenant_id = t.id
         WHERE u.email = $1 AND u.is_active = true`, [email]);
            if (result.rows.length === 0) {
                return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
            }
            const user = result.rows[0];
            // Compare password
            const isPasswordValid = await bcrypt_1.default.compare(password, user.password_hash);
            if (!isPasswordValid) {
                return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
            }
            // Generate JWT
            const token = jsonwebtoken_1.default.sign({
                id: user.id,
                tenant_id: user.tenant_id,
                email: user.email,
                role: user.role,
            }, JWT_SECRET, { expiresIn: '24h' });
            res.json({
                token,
                user: {
                    id: user.id,
                    tenant_id: user.tenant_id,
                    tenant_name: user.tenant_name,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                },
            });
        }
        catch (error) {
            console.error('Login error', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    /**
     * Request OTP code for customer authentication.
     */
    static async requestCustomerOTP(req, res) {
        try {
            const { tenant_id, phone } = req.body;
            if (!tenant_id || !phone) {
                return res.status(400).json({ error: 'Missing fields', message: 'tenant_id and phone are required' });
            }
            // Check if tenant exists by ID or Slug
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenant_id);
            const queryStr = isUuid
                ? 'SELECT id FROM tenants WHERE id = $1 OR slug = $1'
                : 'SELECT id FROM tenants WHERE slug = $1';
            const tenantCheck = await db_js_1.default.query(queryStr, [tenant_id]);
            if (tenantCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Not Found', message: 'Tenant not found' });
            }
            const resolvedTenantId = tenantCheck.rows[0].id;
            // Find or create customer
            let customerResult = await db_js_1.default.query('SELECT id FROM customers WHERE tenant_id = $1 AND phone = $2', [resolvedTenantId, phone]);
            if (customerResult.rows.length === 0) {
                // Create new customer
                customerResult = await db_js_1.default.query(`INSERT INTO customers (tenant_id, phone)
           VALUES ($1, $2)
           RETURNING id`, [resolvedTenantId, phone]);
            }
            // Generate and store OTP
            await otp_js_1.OTPService.generateOTP(resolvedTenantId, phone);
            res.json({ message: 'OTP sent successfully' });
        }
        catch (error) {
            console.error('OTP request error', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    /**
     * Verify customer OTP and return JWT.
     */
    static async verifyCustomerOTP(req, res) {
        try {
            const { tenant_id, phone, code } = req.body;
            if (!tenant_id || !phone || !code) {
                return res.status(400).json({ error: 'Missing fields', message: 'tenant_id, phone, and code are required' });
            }
            // Check if tenant exists by ID or Slug
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenant_id);
            const queryStr = isUuid
                ? 'SELECT id FROM tenants WHERE id = $1 OR slug = $1'
                : 'SELECT id FROM tenants WHERE slug = $1';
            const tenantCheck = await db_js_1.default.query(queryStr, [tenant_id]);
            if (tenantCheck.rows.length === 0) {
                return res.status(404).json({ error: 'Not Found', message: 'Tenant not found' });
            }
            const resolvedTenantId = tenantCheck.rows[0].id;
            // Verify OTP
            const isValid = await otp_js_1.OTPService.verifyOTP(resolvedTenantId, phone, code);
            if (!isValid) {
                return res.status(400).json({ error: 'Invalid OTP', message: 'The OTP code is invalid, expired, or has exceeded attempts' });
            }
            // Update customer verification status & last visit
            const customerResult = await db_js_1.default.query(`UPDATE customers
         SET is_verified = true, last_visit = NOW()
         WHERE tenant_id = $1 AND phone = $2
         RETURNING id, name, phone, tier`, [resolvedTenantId, phone]);
            if (customerResult.rows.length === 0) {
                return res.status(404).json({ error: 'Not Found', message: 'Customer not found' });
            }
            const customer = customerResult.rows[0];
            // Generate customer JWT token
            const token = jsonwebtoken_1.default.sign({
                id: customer.id,
                tenant_id,
                phone: customer.phone,
                role: 'customer',
            }, JWT_SECRET, { expiresIn: '30d' } // Customers stay logged in longer on mobile PWA
            );
            res.json({
                token,
                customer: {
                    id: customer.id,
                    tenant_id,
                    phone: customer.phone,
                    name: customer.name,
                    tier: customer.tier,
                },
            });
        }
        catch (error) {
            console.error('OTP verify error', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
exports.AuthController = AuthController;
