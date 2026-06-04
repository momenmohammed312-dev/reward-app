import app from './app.js';
import db from './config/db.js';
import { connectRedis } from './config/redis.js';

const PORT = process.env.PORT || 4000;

const startServer = async () => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    // 1. Check PostgreSQL Database connection
    await db.query('SELECT NOW()');
    console.log('Connected to PostgreSQL Database successfully');

    // 2. Connect to Redis
    await connectRedis();

    // 3. Start Listening
    app.listen(PORT, () => {
      console.log(`Backend server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start loyalty platform backend server:', error);
    process.exit(1);
  }
};

startServer();
