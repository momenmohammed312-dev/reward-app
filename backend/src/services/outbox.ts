import { PoolClient } from 'pg';
import db from '../config/db.js';
import { logger } from './logger.js';

export interface OutboxEvent {
  tenantId?: string;
  eventType: 'sms_notification' | 'push_notification' | 'webhook_forward';
  payload: Record<string, unknown>;
}

export class OutboxService {
  /**
   * Enqueues an outbox event within the caller's active PostgreSQL transaction.
   */
  static async createEvent(client: PoolClient, event: OutboxEvent): Promise<string> {
    const result = await client.query(
      `INSERT INTO outbox_events (tenant_id, event_type, payload, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING id`,
      [event.tenantId || null, event.eventType, JSON.stringify(event.payload)]
    );

    return result.rows[0].id;
  }

  /**
   * Polling worker to process pending outbox events reliably with row-level locks.
   */
  static async processPendingEvents(batchSize = 20): Promise<number> {
    const client = await db.pool.connect();
    let processedCount = 0;

    try {
      await client.query('BEGIN');

      // Fetch pending events with row-level locks
      const res = await client.query(
        `SELECT id, tenant_id, event_type, payload, attempts, max_attempts
         FROM outbox_events
         WHERE status = 'pending' AND attempts < max_attempts
         ORDER BY created_at ASC
         LIMIT $1
         FOR UPDATE SKIP LOCKED`,
        [batchSize]
      );

      for (const row of res.rows) {
        try {
          if (row.event_type === 'sms_notification') {
            const phone = typeof row.payload?.phone === 'string' ? row.payload.phone : '';
            logger.info(`Outbox dispatched SMS to ${phone.replace(/(\d{3})\d+(\d{3})/, '$1****$2')}`);
          }

          await client.query(
            `UPDATE outbox_events
             SET status = 'processed', processed_at = NOW(), updated_at = NOW()
             WHERE id = $1`,
            [row.id]
          );

          processedCount++;
        } catch (eventError: unknown) {
          const msg = eventError instanceof Error ? eventError.message : String(eventError);
          const nextAttempts = Number(row.attempts) + 1;
          const status = nextAttempts >= Number(row.max_attempts) ? 'failed' : 'pending';

          await client.query(
            `UPDATE outbox_events
             SET attempts = $1, status = $2, last_error = $3, updated_at = NOW()
             WHERE id = $4`,
            [nextAttempts, status, msg, row.id]
          );

          logger.error(`Failed to process outbox event ${row.id}:`, { error: msg });
        }
      }

      await client.query('COMMIT');
      return processedCount;
    } catch (error: unknown) {
      await client.query('ROLLBACK');
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('Outbox processor batch error:', { error: msg });
      throw error;
    } finally {
      client.release();
    }
  }
}
