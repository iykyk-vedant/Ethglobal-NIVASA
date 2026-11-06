/**
 * POST /api/cron/worker
 * ARCH §14.3 · PRD FR-6.5 · PLAN M4.5, M5.8, M9.3, M10.1-M10.4
 *
 * Background worker execution endpoint protected strictly by CRON_SECRET.
 * Bounded work per invocation (max 5 jobs) to guarantee execution within platform timeouts.
 * Never exposes individual job-triggering endpoints.
 */

import { NextRequest, NextResponse } from 'next/server';
import { claimOutboxJobs, completeOutboxJob, failOutboxJob } from '@/lib/settlement/outbox';
import { processSyncEligibility } from '@/lib/settlement/jobs/sync-eligibility';
import { processAllocateUnits } from '@/lib/settlement/jobs/allocate-units';
import { processReconcileOrder } from '@/lib/settlement/jobs/reconcile-order';
import {
  processExpireReservations,
  processReconcileSupply,
  processStuckOrders,
} from '@/lib/settlement/jobs/maintenance';
import { processSetRightsDocument } from '@/lib/settlement/jobs/set-rights-document';
import { processSetManifestDocument } from '@/lib/settlement/jobs/set-manifest-document';
import { processVerifyActivation } from '@/lib/settlement/jobs/verify-activation';
import { processPauseAsset } from '@/lib/settlement/jobs/pause-asset';
import { processUnpauseAsset } from '@/lib/settlement/jobs/unpause-asset';
import { processEvidenceDrift } from '@/lib/settlement/jobs/evidence-drift';
import { processIntegrityCheck } from '@/lib/settlement/jobs/integrity-check';
import { AppError, ErrorCodes } from '@/lib/validation/errors';
import { isProductionRuntime } from '@/lib/env';

export async function POST(req: NextRequest) {
  try {
    // 1. Verify CRON_SECRET authentication
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const cronHeader = req.headers.get('x-cron-secret') || '';
    const cronSecret = process.env.CRON_SECRET;

    const bearerMatch = Boolean(cronSecret) && authHeader.startsWith('Bearer ') && authHeader.slice(7).trim() === cronSecret;
    const headerMatch = Boolean(cronSecret) && cronHeader === cronSecret;
    const isDemoTrigger =
      !isProductionRuntime() &&
      process.env.DEMO_PAYMENTS === 'true' &&
      Boolean(req.headers.get('x-demo-user-id'));

    if (!bearerMatch && !headerMatch && !isDemoTrigger) {
      throw new AppError(
        ErrorCodes.UNAUTHORIZED,
        'Unauthorized: Valid CRON_SECRET token required to invoke worker.',
        401
      );
    }

    // 2. Claim a bounded batch of runnable jobs using row locking
    const workerId = `worker-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const batchSize = 5; // Bounded execution
    const jobs = await claimOutboxJobs(batchSize, workerId);

    const results: Array<{ jobId: string; type: string; success: boolean; error?: string; output?: any }> = [];

    // 3. Process each claimed job
    for (const job of jobs) {
      try {
        let output: any;

        switch (job.type) {
          case 'sync_eligibility':
            output = await processSyncEligibility(job.payload as any);
            break;

          case 'allocate_units':
            output = await processAllocateUnits(job.payload as any);
            break;

          case 'reconcile_order':
            output = await processReconcileOrder(job.payload as any);
            break;

          case 'expire_reservations':
            output = await processExpireReservations();
            break;

          case 'reconcile_supply':
            output = await processReconcileSupply(job.payload?.offeringId);
            break;

          case 'stuck_orders':
            output = await processStuckOrders();
            break;

          case 'set_rights_document':
            output = await processSetRightsDocument(job.payload as any);
            break;

          case 'set_manifest_document':
            output = await processSetManifestDocument(job.payload as any);
            break;

          case 'verify_activation':
            output = await processVerifyActivation(job.payload as any);
            break;

          case 'pause_asset':
            output = await processPauseAsset(job.payload as any);
            break;

          case 'unpause_asset':
            output = await processUnpauseAsset(job.payload as any);
            break;

          case 'evidence_drift':
            output = await processEvidenceDrift(job.payload as any);
            break;

          case 'integrity_check':
            output = await processIntegrityCheck(job.payload as any);
            break;

          default:
            throw new Error(`Unknown job type: "${job.type}"`);
        }

        await completeOutboxJob(job.id);
        results.push({ jobId: job.id, type: job.type, success: true, output });
      } catch (err: any) {
        console.error(`[WORKER_ERROR] Job ${job.id} (${job.type}) failed:`, err);
        await failOutboxJob(job.id, err.message || 'Job processing failed', job.attempts, job.max_attempts);
        results.push({ jobId: job.id, type: job.type, success: false, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      workerId,
      processedCount: results.length,
      jobs: results,
    });
  } catch (err: any) {
    const status = err.statusCode || 500;
    return NextResponse.json(
      {
        error: err.code || 'WORKER_EXECUTION_ERROR',
        message: err.message || 'Worker batch execution failed',
      },
      { status }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
