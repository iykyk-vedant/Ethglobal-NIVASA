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
  type: string;
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
  const p: EnqueueJobParams =
    typeof params === 'string'
      ? { type: params, dedupeKey: dedupeKeyArg || '', payload: payloadArg || {} }
      : params;
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
      max_attempts: p.maxAttempts || 5,
      status: 'pending',
      attempts: 0,
    })
    .select('id')
    .single();

  if (error) {
    // Handle concurrent race on unique constraint gracefully
    if (error.code === '23505') {
      const { data: raced } = await admin
        .from('outbox_jobs')
        .select('id')
        .eq('type', p.type)
        .eq('dedupe_key', p.dedupeKey)
        .single();
      return { id: raced?.id || '', isDuplicate: true };
    }
    throw new Error(`[OUTBOX_ENQUEUE_ERROR] Failed to enqueue job: ${error.message}`);
  }

  return { id: data.id, isDuplicate: false };
}

/**
 * Claims a batch of pending jobs using Postgres FOR UPDATE SKIP LOCKED.
 * Guarantees zero duplicate claims across concurrent workers.
 */
export async function claimOutboxJobs(
  batchSize: number = 5,
  workerId: string = `worker-${Date.now()}`
): Promise<OutboxJob[]> {
  const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) {
    throw new Error('[OUTBOX_ERROR] Direct database connection string required for row locking.');
  }

  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();

  try {
    await client.query('BEGIN');

    // Select and lock runnable jobs atomically
    const selectSql = `
      SELECT id, type, dedupe_key, order_id, offering_id, property_id, payload,
             status, attempts, max_attempts, next_run_at, locked_by, locked_at,
             last_error, created_at, updated_at
        FROM outbox_jobs
       WHERE status = 'pending'
         AND next_run_at <= now()
       ORDER BY created_at ASC
       LIMIT $1
         FOR UPDATE SKIP LOCKED
    `;
    const res = await client.query(selectSql, [batchSize]);
    const claimedJobs: OutboxJob[] = res.rows;

    if (claimedJobs.length > 0) {
      const jobIds = claimedJobs.map((j) => j.id);
      const updateSql = `
        UPDATE outbox_jobs
           SET status = 'running',
               locked_by = $1,
               locked_at = now(),
               attempts = attempts + 1,
               updated_at = now()
         WHERE id = ANY($2::uuid[])
      `;
      await client.query(updateSql, [workerId, jobIds]);
    }

    await client.query('COMMIT');

    // Update in-memory models to reflect new attempt
    return claimedJobs.map((j) => ({
      ...j,
      status: 'running',
      locked_by: workerId,
      attempts: j.attempts + 1,
    }));
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

/**
 * Marks an outbox job as successfully completed.
 */
export async function completeOutboxJob(jobId: string): Promise<void> {
  const admin = getAdminDbClient();
  const { error } = await admin
    .from('outbox_jobs')
    .update({
      status: 'done',
      locked_by: null,
      locked_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) {
    throw new Error(`[OUTBOX_COMPLETE_ERROR] Failed to mark job complete: ${error.message}`);
  }
}

/**
 * Handles a failed outbox job with exponential backoff or dead-lettering.
 */
export async function failOutboxJob(
  jobId: string,
  errorMessage: string,
  currentAttempts: number,
  maxAttempts: number = 5
): Promise<void> {
  const admin = getAdminDbClient();
  const isDead = currentAttempts >= maxAttempts;

  if (isDead) {
    await admin
      .from('outbox_jobs')
      .update({
        status: 'dead',
        last_error: errorMessage,
        locked_by: null,
        locked_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  } else {
    // Exponential backoff: 10s, 20s, 40s, 80s, max 300s
    const backoffSeconds = Math.min(300, Math.pow(2, currentAttempts) * 10);
    const nextRun = new Date(Date.now() + backoffSeconds * 1000).toISOString();

    await admin
      .from('outbox_jobs')
      .update({
        status: 'pending',
        next_run_at: nextRun,
        last_error: errorMessage,
        locked_by: null,
        locked_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }
}
