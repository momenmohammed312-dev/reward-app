"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_js_1 = __importDefault(require("./app.js"));
const db_js_1 = __importDefault(require("./config/db.js"));
const redis_js_1 = require("./config/redis.js");
const PORT = process.env.PORT || 4000;
const startServer = async () => {
    try {
        // 1. Check PostgreSQL Database connection
        await db_js_1.default.query('SELECT NOW()');
        console.log('Connected to PostgreSQL Database successfully');
        // 2. Connect to Redis
        await (0, redis_js_1.connectRedis)();
        // 3. Start Listening
        app_js_1.default.listen(PORT, () => {
            console.log(`Backend server is running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('Failed to start loyalty platform backend server:', error);
        process.exit(1);
    }
};
startServer();
