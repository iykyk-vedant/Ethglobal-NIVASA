/**
 * NIVASA - Transactional Outbox Engine
 * ARCH §14.3 · PRD FR-6.5 · PLAN M4.5
 *
 * Implements reliable, idempotent at-least-once delivery:
 * - Enqueue with deterministic dedupe_key (type, dedupe_key unique index)
 * - Claim batch with SELECT ... FOR UPDATE SKIP LOCKED
 * - Exponential backoff on failure up to max_attempts
 * - Status transitions: pending -> running -> done | dead
 */

import { getAdminDbClient } from '../db/admin';
import pg from 'pg';

export interface OutboxJob {
  id: string;
  type: string;
  dedupe_key: string;
  order_id?: string | null;
  offering_id?: string | null;
  property_id?: string | null;
  payload: Record<string, any>;
  status: 'pending' | 'running' | 'done' | 'failed' | 'dead';
  attempts: number;
  max_attempts: number;
  next_run_at: string;
  locked_by?: string | null;
  locked_at?: string | null;
  last_error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EnqueueJobParams {
  type?: string;
  jobType?: string;
  dedupeKey: string;
  payload?: Record<string, any>;
  orderId?: string | null;
  offeringId?: string | null;
  propertyId?: string | null;
  maxAttempts?: number;
}

/**
 * Enqueues a job into the outbox.
 * Idempotent: returns existing job if duplicate (type, dedupe_key) is already queued.
 */
export async function enqueueOutboxJob(params: EnqueueJobParams | string, dedupeKeyArg?: string, payloadArg?: Record<string, any>): Promise<{ id: string; isDuplicate: boolean }> {
  const resolvedType = typeof params === 'string' ? params : (params.type || params.jobType || '');
  const p = typeof params === 'string'
    ? { type: params, dedupeKey: dedupeKeyArg || '', payload: payloadArg || {} }
    : { ...params, type: resolvedType };

  const admin = getAdminDbClient();

  // Check if job with (type, dedupe_key) already exists
  const { data: existing } = await admin
    .from('outbox_jobs')
    .select('id, status')
    .eq('type', p.type)
    .eq('dedupe_key', p.dedupeKey)
    .maybeSingle();

  if (existing) {
    return { id: existing.id, isDuplicate: true };
  }

  const { data, error } = await admin
    .from('outbox_jobs')
    .insert({
      type: p.type,
      dedupe_key: p.dedupeKey,
      payload: p.payload || {},
      order_id: p.orderId || null,
      offering_id: p.offeringId || null,
      property_id: p.propertyId || null,
      status: 'pending',
      attempts: 0,
      max_attempts: p.maxAttempts || 5,
      next_run_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !data) {
    // In case of race condition on unique (type, dedupe_key)
    const { data: fallback } = await admin
      .from('outbox_jobs')
      .select('id')
      .eq('type', p.type)
      .eq('dedupe_key', p.dedupeKey)
      .maybeSingle();

    if (fallback) {
      return { id: fallback.id, isDuplicate: true };
    }
    throw new Error(`Failed to enqueue outbox job: ${error?.message}`);
  }

  return { id: data.id, isDuplicate: false };
}

/**
 * Claims up to `batchSize` pending jobs using PostgreSQL row-level locks
 * via `SELECT ... FOR UPDATE SKIP LOCKED`.
 */
export async function claimOutboxJobs(batchSize: number = 5, workerId: string = 'worker-default'): Promise<OutboxJob[]> {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error('[OUTBOX_ERROR] Direct database connection string is required for SKIP LOCKED row locking.');
  }

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    await client.query('BEGIN');

    const selectQuery = `
      SELECT id, type, dedupe_key, order_id, offering_id, property_id, payload,
             status, attempts, max_attempts, next_run_at, locked_by, locked_at,
             last_error, created_at, updated_at
      FROM outbox_jobs
      WHERE status IN ('pending', 'failed')
        AND next_run_at <= NOW()
        AND attempts < max_attempts
      ORDER BY next_run_at ASC
      LIMIT $1
      FOR UPDATE SKIP LOCKED;
    `;

    const { rows } = await client.query<OutboxJob>(selectQuery, [batchSize]);

    if (rows.length === 0) {
      await client.query('COMMIT');
      return [];
    }

    const jobIds = rows.map((r) => r.id);
    const nowIso = new Date().toISOString();

    const updateQuery = `
      UPDATE outbox_jobs
      SET status = 'running',
          attempts = attempts + 1,
          locked_by = $1,
          locked_at = $2,
          updated_at = $2
      WHERE id = ANY($3::uuid[]);
    `;

    await client.query(updateQuery, [workerId, nowIso, jobIds]);
    await client.query('COMMIT');

    return rows.map((r) => ({
      ...r,
      status: 'running',
      attempts: r.attempts + 1,
      locked_by: workerId,
      locked_at: nowIso,
    }));
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

/**
 * Marks a job as completed successfully ('done').
 */
export async function completeOutboxJob(jobId: string): Promise<void> {
  const admin = getAdminDbClient();
  const now = new Date().toISOString();

  await admin
    .from('outbox_jobs')
    .update({
      status: 'done',
      locked_by: null,
      locked_at: null,
      updated_at: now,
    })
    .eq('id', jobId);
}

/**
 * Records a job failure with exponential backoff.
 * Transitions to 'dead' if max_attempts is exceeded.
 */
export async function failOutboxJob(jobId: string, errorMsg: string, currentAttempts: number, maxAttempts: number): Promise<void> {
  const admin = getAdminDbClient();
  const now = new Date();
  const isDead = currentAttempts >= maxAttempts;

  // Exponential backoff: 2s, 4s, 8s, 16s... up to 5 minutes
  const backoffSeconds = Math.min(300, Math.pow(2, currentAttempts));
  const nextRunAt = new Date(now.getTime() + backoffSeconds * 1000).toISOString();

  await admin
    .from('outbox_jobs')
    .update({
      status: isDead ? 'dead' : 'failed',
      last_error: errorMsg,
      next_run_at: isDead ? now.toISOString() : nextRunAt,
      locked_by: null,
      locked_at: null,
      updated_at: now.toISOString(),
    })
    .eq('id', jobId);
}
