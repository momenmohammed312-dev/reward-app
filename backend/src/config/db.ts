import pg from 'pg';
import dotenv from 'dotenv';
import { logger } from '../services/logger.js';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  logger.error('Unexpected error on idle PostgreSQL client', { error: err.message });
});

export default {
  query: (text: string, params?: any[]) => pool.query(text, params),
  pool,
};
