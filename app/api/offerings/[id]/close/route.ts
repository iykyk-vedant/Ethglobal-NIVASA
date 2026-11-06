import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session';
import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const closeSchema = z.object({
  reason: z.string().min(5, 'Close reason required for audit compliance').default('Offering term concluded'),
});

/**
 * POST /api/offerings/:id/close
 * Admin closes offering (ARCH §9.3, §19, PLAN M9.5).
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

    const allowedStatuses = ['active', 'paused', 'paused_evidence_drift'];
    if (!allowedStatuses.includes(offering.status)) {
      return NextResponse.json(
        {
          error: 'INVALID_STATUS',
          message: `Cannot close offering in status "${offering.status}". Offering must be active or paused.`,
        },
        { status: 400 }
      );
    }

    let reason = 'Offering term concluded';
    try {
      const body = await req.json();
      const parse = closeSchema.safeParse(body);
      if (parse.success && parse.data.reason) {
        reason = parse.data.reason;
      }
    } catch {
      // Body optional
    }

    const now = new Date().toISOString();

    // 2. Update Offering Status -> closed
    const { error: updateErr } = await admin
      .from('offerings')
      .update({
        status: 'closed',
        updated_at: now,
      })
      .eq('id', offeringId);

    if (updateErr) {
      return NextResponse.json(
        { error: 'OFFERING_CLOSE_FAILED', message: updateErr.message },
        { status: 500 }
      );
    }

    // 3. Audit log
    await appendAuditLog({
      actorUserId: auth.userId,
      action: 'offering_closed',
      resourceType: 'offering',
      resourceId: offeringId,
      beforeHash: offering.status,
      afterHash: 'closed',
      reason: JSON.stringify({ reason }),
    });

    return NextResponse.json({
      success: true,
      offeringId,
      status: 'closed',
      message: 'Offering closed successfully.',
    });
  } catch (err: any) {
    const status = err.statusCode || (err.message?.includes('Unauthorized') ? 401 : err.message?.includes('Access forbidden') ? 403 : 500);
    return NextResponse.json({ error: err.code || 'INTERNAL_ERROR', message: err.message }, { status });
  }
}

