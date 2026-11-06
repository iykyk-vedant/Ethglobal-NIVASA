/**
 * /api/admin/jobs/retry
 * ARCH §14.3, §14.4, §21 · UI §8.11 · PLAN M14.5
 *
 * Admin-only dead/failed job retry endpoint:
 * Allows an operator to request a retry for safe, idempotent outbox jobs.
 * Resets status to 'pending', resets attempt counter, and schedules immediate worker pickup.
 * No public job-trigger route is exposed; processing is performed exclusively by the worker.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/session';
import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import { AppError, ErrorCodes, formatErrorResponse } from '@/lib/validation/errors';

const SAFE_IDEMPOTENT_JOB_TYPES = new Set([
  'allocate_units',
  'reconcile_order',
  'expire_reservations',
  'sync_eligibility',
  'set_rights_document',
  'set_manifest_document',
  'verify_activation',
  'evidence_drift',
  'integrity_check',
  'pause_asset',
  'unpause_asset',
  'reconcile_supply',
  'stuck_orders',
]);

const retryJobSchema = z.object({
  jobId: z.string().uuid('Invalid job ID format'),
  reason: z.string().min(5, 'A justification of at least 5 characters is required for audit trail'),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['admin']);
    const body = await req.json();
    const { jobId, reason } = retryJobSchema.parse(body);

    const adminDb = getAdminDbClient();

    // 1. Fetch Job
    const { data: job, error: jobErr } = await adminDb
      .from('outbox_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobErr || !job) {
      throw new AppError(ErrorCodes.NOT_FOUND, `Outbox job ${jobId} not found`, 404);
    }

    // 2. Validate safety: only safe idempotent job types can be retried
    if (!SAFE_IDEMPOTENT_JOB_TYPES.has(job.type)) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        `Job type "${job.type}" is not allowlisted as a safe idempotent job for manual retry`,
        400
      );
    }

    // 3. Validate state: job should be dead, failed, or stuck
    if (job.status !== 'dead' && job.status !== 'failed' && job.status !== 'pending') {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        `Cannot retry job with status "${job.status}". Only failed, dead, or pending jobs can be rescheduled.`,
        400
      );
    }

    // 4. Reset job parameters for worker execution
    const now = new Date().toISOString();
    const { data: updatedJob, error: updateErr } = await adminDb
      .from('outbox_jobs')
      .update({
        status: 'pending',
        attempts: 0,
        next_run_at: now,
        last_error: null,
        locked_by: null,
        locked_at: null,
        updated_at: now,
      })
      .eq('id', jobId)
      .select()
      .single();

    if (updateErr) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, `Failed to update job: ${updateErr.message}`, 500);
    }

    // Extract correlation ID from payload or dedupe_key
    const correlationId = job.payload?.correlationId || job.payload?.orderId || job.dedupe_key || job.id;

    // 5. Append to hash-chained audit log
    const auditLogId = await appendAuditLog({
      actorUserId: auth.userId,
      action: 'job_retry_requested',
      resourceType: 'outbox_job',
      resourceId: jobId,
      afterHash: job.dedupe_key,
      reason: JSON.stringify({
        jobId,
        jobType: job.type,
        dedupeKey: job.dedupe_key,
        correlationId,
        previousStatus: job.status,
        previousAttempts: job.attempts,
        operatorReason: reason,
      }),
    });

    return NextResponse.json({
      success: true,
      message: `Job ${job.type} (${jobId}) rescheduled for worker pickup.`,
      job: updatedJob,
      correlationId,
      auditLogId,
    });
  } catch (err: unknown) {
    return formatErrorResponse(err);
  }
}
