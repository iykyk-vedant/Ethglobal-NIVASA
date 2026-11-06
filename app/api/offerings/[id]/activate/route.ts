import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session';
import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import { enqueueOutboxJob } from '@/lib/settlement/outbox';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/offerings/:id/activate
 * ARCH §11.2, §19, PLAN M9.3
 *
 * CRITICAL ARCHITECTURAL INVARIANT:
 * This route ONLY enqueues the three D1 activation gate background worker jobs:
 * 1. set_rights_document
 * 2. set_manifest_document
 * 3. verify_activation
 *
 * It NEVER performs inline chain calls or updates the offering status to 'active' directly.
 * The transition to 'active' is performed exclusively by verify_activation after reading
 * both documents and asset state back from Hedera Testnet.
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

    // 2. Status Guard: Must be token_configured
    if (offering.status !== 'token_configured') {
      return NextResponse.json(
        {
          error: 'INVALID_STATUS',
          message: `Cannot activate offering in status "${offering.status}". Offering must be in "token_configured" state.`,
        },
        { status: 400 }
      );
    }

    const now = Date.now();

    // 3. Enqueue D1 Gate Jobs in Transactional Outbox (ZERO INLINE CHAIN CALLS)
    const job1 = await enqueueOutboxJob({
      type: 'set_rights_document',
      dedupeKey: `${offeringId}:rights:${offering.current_rights_version}:${now}`,
      offeringId,
      propertyId: offering.property_id,
      payload: { offeringId },
    });

    const job2 = await enqueueOutboxJob({
      type: 'set_manifest_document',
      dedupeKey: `${offeringId}:manifest:${offering.property_id}:${now}`,
      offeringId,
      propertyId: offering.property_id,
      payload: { offeringId },
    });

    const job3 = await enqueueOutboxJob({
      type: 'verify_activation',
      dedupeKey: `${offeringId}:verify_activation:${now}`,
      offeringId,
      propertyId: offering.property_id,
      payload: { offeringId },
    });

    // 4. Audit Privileged Enqueue
    await appendAuditLog({
      actorUserId: auth.userId,
      action: 'offering_activation_enqueued',
      resourceType: 'offering',
      resourceId: offeringId,
      reason: JSON.stringify({
        enqueuedJobs: [
          { type: 'set_rights_document', jobId: job1.id },
          { type: 'set_manifest_document', jobId: job2.id },
          { type: 'verify_activation', jobId: job3.id },
        ],
      }),
    });

    return NextResponse.json({
      success: true,
      offeringId,
      currentStatus: offering.status,
      message: 'D1 activation gate jobs enqueued in transactional outbox. Offering will transition to "active" upon on-chain read-back verification.',
      enqueuedJobs: [
        { type: 'set_rights_document', jobId: job1.id },
        { type: 'set_manifest_document', jobId: job2.id },
        { type: 'verify_activation', jobId: job3.id },
      ],
    });
  } catch (err: any) {
    const status = err.statusCode || (err.message?.includes('Unauthorized') ? 401 : err.message?.includes('Access forbidden') ? 403 : 500);
    return NextResponse.json({ error: err.code || 'INTERNAL_ERROR', message: err.message }, { status });
  }
}

