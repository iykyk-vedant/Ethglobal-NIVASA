import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session';
import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import { enqueueOutboxJob } from '@/lib/settlement/outbox';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const pauseSchema = z.object({
  reason: z.string().min(5, 'Reason must be provided for audit trail (minimum 5 characters)').default('Administrative pause'),
});

/**
 * POST /api/offerings/:id/pause
 * Admin manual pause (ARCH §9.3, §19, PLAN M9.5).
 * Chain effects through background jobs only.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: offeringId } = await params;
    const auth = await requireRole(req, ['admin']);
    const admin = getAdminDbClient();

    // 1. Fetch Offering
    const { data: offering, error: offErr } = await admin
      .from('offerings')
      .select('*')
      .eq('id', offeringId)
      .single();

    if (offErr || !offering) {
      return NextResponse.json(
        { error: 'OFFERING_NOT_FOUND', message: 'Target offering does not exist.' },
        { status: 404 }
      );
    }

    if (offering.status !== 'active') {
      return NextResponse.json(
        {
          error: 'INVALID_STATUS',
          message: `Cannot pause offering in status "${offering.status}". Only active offerings can be paused.`,
        },
        { status: 400 }
      );
    }

    let reason = 'Administrative pause';
    try {
      const body = await req.json();
      const parse = pauseSchema.safeParse(body);
      if (parse.success && parse.data.reason) {
        reason = parse.data.reason;
      }
    } catch {
      // Body optional
    }

    // 2. Enqueue pause_asset job for on-chain execution
    const now = Date.now();
    const job = await enqueueOutboxJob({
      type: 'pause_asset',
      dedupeKey: `${offeringId}:pause:${now}`,
      offeringId,
      propertyId: offering.property_id,
      payload: { offeringId, reason },
    });

    // 3. Audit log
    await appendAuditLog({
      actorUserId: auth.userId,
      action: 'offering_pause_enqueued',
      resourceType: 'offering',
      resourceId: offeringId,
      reason: JSON.stringify({ reason, jobId: job.id }),
    });

    return NextResponse.json({
      success: true,
      offeringId,
      message: 'Offering pause enqueued in transactional outbox.',
      jobId: job.id,
    });
  } catch (err: any) {
    const status = err.statusCode || (err.message?.includes('Unauthorized') ? 401 : err.message?.includes('Access forbidden') ? 403 : 500);
    return NextResponse.json({ error: err.code || 'INTERNAL_ERROR', message: err.message }, { status });
  }
}
