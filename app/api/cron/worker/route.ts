/**
 * POST /api/cron/worker
 * ARCH §14.3 · PRD FR-6.5 · PLAN M4.5
 *
 * Background worker execution endpoint protected strictly by CRON_SECRET.
 * Bounded work per invocation (max 5 jobs) to guarantee execution within platform timeouts.
 * Never exposes individual job-triggering endpoints.
 */

import { NextRequest, NextResponse } from 'next/server';
import { claimOutboxJobs, completeOutboxJob, failOutboxJob } from '@/lib/settlement/outbox';
import { processSyncEligibility } from '@/lib/settlement/jobs/sync-eligibility';
import { formatErrorResponse, AppError, ErrorCodes } from '@/lib/validation/errors';

export async function POST(req: NextRequest) {
  try {
    // 1. Verify CRON_SECRET authentication
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const cronHeader = req.headers.get('x-cron-secret') || '';
    const cronSecret = process.env.CRON_SECRET || 'test-cron-secret-nivasa-secure-m4';

    const bearerMatch = authHeader.startsWith('Bearer ') && authHeader.slice(7).trim() === cronSecret;
    const headerMatch = cronHeader === cronSecret;

    if (!bearerMatch && !headerMatch) {
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
      processedCount: jobs.length,
      results,
    });
  } catch (err) {
    return formatErrorResponse(err);
  }
}
