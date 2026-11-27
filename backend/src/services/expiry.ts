import { PoolClient } from 'pg';
import db from '../config/db.js';
import { LedgerService } from './ledger.js';
import { logger } from './logger.js';
import { sendSmsMessage } from './otp.js';

const RUN_DELAY_MS = 60 * 1000;
const RUN_INTERVAL_MS = 24 * 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface PendingCredit {
  id: string;
  points: number;
  expiresAt: number;
}

export interface LedgerEntryLite {
  id: string;
  type: string;
  points: number;
  created_at: Date | string;
}

export interface ExpiringCredit {
  ledgerId: string;
  points: number;
}

export interface ExpiringSoonCredit extends ExpiringCredit {
  expiresAtMs: number;
}

/**
 * Pure FIFO expiry calculation over a customer's ledger.
 *
 * Credits (earned/bonus/refund) are consumed oldest-first by later redemptions
 * and expirations. Returns the remaining points of every credit that outlived
 * its expiry window. Exposed for unit testing.
 */
export function computeExpiredPoints(entries: LedgerEntryLite[], expiryDays: number, nowMs: number): ExpiringCredit[] {
  const pending: PendingCredit[] = [];
  const expirations: ExpiringCredit[] = [];

  for (const entry of entries) {
    if (entry.type === 'redeemed' || entry.type === 'expired') {
      // Negative entries consume the oldest credits first (FIFO)
      let toConsume = Number(entry.points);
      while (toConsume > 0 && pending.length > 0) {
        const head = pending[0];
        const consumed = Math.min(head.points, toConsume);
        head.points -= consumed;
        toConsume -= consumed;
        if (head.points === 0) {
          pending.shift();
        }
      }
      continue;
    }

    if (entry.type !== 'earned' && entry.type !== 'bonus' && entry.type !== 'refund') {
      continue;
    }

    const expiresAt = new Date(entry.created_at).getTime() + expiryDays * MS_PER_DAY;
    pending.push({ id: entry.id, points: Number(entry.points), expiresAt });
  }

  for (const credit of pending) {
    if (credit.points > 0 && credit.expiresAt < nowMs) {
      expirations.push({ ledgerId: credit.id, points: credit.points });
    }
  }

  return expirations;
}

/**
 * Pure FIFO pre-expiry calculation: identifies credits that are still active
 * (expiresAt >= nowMs) and will expire within the next `warnDaysBefore` days.
 */
export function computeExpiringSoonPoints(
  entries: LedgerEntryLite[],
  expiryDays: number,
  warnDaysBefore: number,
  nowMs: number
): ExpiringSoonCredit[] {
  if (expiryDays <= 0 || warnDaysBefore <= 0) return [];
  const pending: PendingCredit[] = [];
  const warnCutoffMs = nowMs + warnDaysBefore * MS_PER_DAY;

  for (const entry of entries) {
    if (entry.type === 'redeemed' || entry.type === 'expired') {
      let toConsume = Number(entry.points);
      while (toConsume > 0 && pending.length > 0) {
        const head = pending[0];
        const consumed = Math.min(head.points, toConsume);
        head.points -= consumed;
        toConsume -= consumed;
        if (head.points === 0) {
          pending.shift();
        }
      }
      continue;
    }

    if (entry.type !== 'earned' && entry.type !== 'bonus' && entry.type !== 'refund') {
      continue;
    }

    const expiresAt = new Date(entry.created_at).getTime() + expiryDays * MS_PER_DAY;
    pending.push({ id: entry.id, points: Number(entry.points), expiresAt });
  }

  return pending
    .filter((credit) => credit.points > 0 && credit.expiresAt >= nowMs && credit.expiresAt <= warnCutoffMs)
    .map((credit) => ({
      ledgerId: credit.id,
      points: credit.points,
      expiresAtMs: credit.expiresAt,
    }));
}

/**
 * Enforces per-tenant points_expiry_days.
 *
 * Credits (earned/bonus/refund) are consumed FIFO by later redemptions and
 * expirations. A daily job walks each customer's ledger in chronological
 * order, consumes the oldest credits against redemptions, and writes an
 * 'expired' ledger entry for any credit that outlived its expiry window.
 * Every expiration is guarded by an idempotency key, so re-runs never
 * double-expire.
 */
export class ExpiryService {
  static async expireAllTenants() {
    const tenantsRes = await db.query(
      `SELECT id, points_expiry_days
       FROM tenants
       WHERE is_active = true
         AND points_expiry_days IS NOT NULL
         AND points_expiry_days > 0`
    );

    for (const t of tenantsRes.rows) {
      try {
        await ExpiryService.expireTenant(t.id, Number(t.points_expiry_days));
      } catch (err) {
        logger.error(`Points expiry failed for tenant ${t.id}`, { error: (err as Error).message });
      }
    }
  }

  static async expireTenant(tenantId: string, expiryDays: number) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const customersRes = await client.query(
        `SELECT DISTINCT wl.customer_id
         FROM wallet_ledger wl
         WHERE wl.tenant_id = $1::uuid
           AND wl.type IN ('earned', 'bonus', 'refund')`,
        [tenantId]
      );

      for (const row of customersRes.rows) {
        await ExpiryService.expireCustomer(client, tenantId, row.customer_id, expiryDays);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  private static async expireCustomer(client: PoolClient, tenantId: string, customerId: string, expiryDays: number) {
    const ledgerRes = await client.query(
      `SELECT id, type, points, created_at
       FROM wallet_ledger
       WHERE tenant_id = $1::uuid AND customer_id = $2::uuid AND points > 0
       ORDER BY created_at ASC, id ASC`,
      [tenantId, customerId]
    );

    const expirations = computeExpiredPoints(ledgerRes.rows, expiryDays, Date.now());

    for (const exp of expirations) {
      await LedgerService.insert(client, {
        tenantId,
        customerId,
        type: 'expired',
        points: exp.points,
        referenceId: exp.ledgerId,
        referenceType: 'expiry',
        note: 'Points expired',
        idempotencyKey: `expiry:${exp.ledgerId}`,
      });
    }
  }

  /**
   * Sends idempotent pre-expiry SMS alerts via VictoryLink when points will expire
   * within `tenants.expiry_sms_days_before`. Deduplicated per credit via expiry_notifications_log.
   */
  static async sendExpiryWarnings(): Promise<number> {
    const tenantsRes = await db.query(
      `SELECT id, name, points_expiry_days, COALESCE(expiry_sms_days_before, 7) AS warn_days
       FROM tenants
       WHERE is_active = true
         AND points_expiry_days IS NOT NULL
         AND points_expiry_days > 0
         AND COALESCE(expiry_sms_days_before, 0) > 0`
    );

    let sentCount = 0;

    for (const tenant of tenantsRes.rows) {
      const expiryDays = Number(tenant.points_expiry_days);
      const warnDays = Number(tenant.warn_days);
      try {
        const custRes = await db.query(
          `SELECT DISTINCT c.id, c.phone, c.name
           FROM customers c
           JOIN wallet_ledger wl ON wl.customer_id = c.id AND wl.tenant_id = c.tenant_id
           WHERE c.tenant_id = $1::uuid
             AND c.deleted_at IS NULL
             AND COALESCE(c.cached_balance, 0) > 0
             AND wl.type IN ('earned', 'bonus', 'refund')`,
          [tenant.id]
        );

        for (const cust of custRes.rows) {
          const ledgerRes = await db.query(
            `SELECT id, type, points, created_at
             FROM wallet_ledger
             WHERE tenant_id = $1::uuid AND customer_id = $2::uuid AND points > 0
             ORDER BY created_at ASC, id ASC`,
            [tenant.id, cust.id]
          );

          const soon = computeExpiringSoonPoints(ledgerRes.rows, expiryDays, warnDays, Date.now());
          if (soon.length === 0) continue;

          const newlyLogged: ExpiringSoonCredit[] = [];
          for (const credit of soon) {
            const expiresOn = new Date(credit.expiresAtMs).toISOString().slice(0, 10);
            const logRes = await db.query(
              `INSERT INTO expiry_notifications_log (tenant_id, customer_id, ledger_id, points_expiring, expires_on)
               VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::date)
               ON CONFLICT (ledger_id) DO NOTHING
               RETURNING id`,
              [tenant.id, cust.id, credit.ledgerId, credit.points, expiresOn]
            );
            if ((logRes.rowCount ?? logRes.rows.length) > 0) {
              newlyLogged.push(credit);
            }
          }

          if (newlyLogged.length > 0 && cust.phone) {
            const totalExpiring = newlyLogged.reduce((sum, c) => sum + c.points, 0);
            const earliestDate = new Date(Math.min(...newlyLogged.map((c) => c.expiresAtMs)))
              .toISOString()
              .slice(0, 10);
            const customerLabel = cust.name ? `يا ${cust.name}` : '';
            const msg = `تنبيه من ${tenant.name} ${customerLabel}: لديك ${totalExpiring} نقطة ستنتهي صلاحيتها يوم ${earliestDate}. استبدلها بمكافآت قبل انتهائها!`;
            await sendSmsMessage(cust.phone, msg).catch((err) => {
              logger.warn('Failed sending pre-expiry SMS', {
                tenantId: tenant.id,
                customerId: cust.id,
                error: (err as Error).message,
              });
            });
            sentCount++;
          }
        }
      } catch (err) {
        logger.error(`Pre-expiry SMS job failed for tenant ${tenant.id}`, { error: (err as Error).message });
      }
    }

    return sentCount;
  }

  private static startupTimer: NodeJS.Timeout | null = null;
  private static intervalTimer: NodeJS.Timeout | null = null;

  /**
   * Starts the daily expiry scheduler. Runs shortly after boot, then every 24h.
   */
  static startScheduler() {
    if (ExpiryService.startupTimer || ExpiryService.intervalTimer) return;
    const run = () => {
      ExpiryService.expireAllTenants()
        .then(() => ExpiryService.sendExpiryWarnings())
        .then((sent) => logger.info('Points expiry job completed', { expiryWarningsSent: sent }))
        .catch((err) => logger.error('Points expiry job failed', { error: (err as Error).message }));
    };

    ExpiryService.startupTimer = setTimeout(run, RUN_DELAY_MS);
    ExpiryService.intervalTimer = setInterval(run, RUN_INTERVAL_MS);
    logger.info('Points expiry scheduler started (runs daily)');
  }

  /**
   * Stops the daily expiry scheduler timers during graceful shutdown.
   */
  static stopScheduler() {
    if (ExpiryService.startupTimer) {
      clearTimeout(ExpiryService.startupTimer);
      ExpiryService.startupTimer = null;
    }
    if (ExpiryService.intervalTimer) {
      clearInterval(ExpiryService.intervalTimer);
      ExpiryService.intervalTimer = null;
    }
  }
}
