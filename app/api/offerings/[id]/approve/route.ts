import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/session';
import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const approveSchema = z.object({
  review_notes: z.string().min(5, 'Review notes required for audit compliance').optional(),
});

/**
 * POST /api/offerings/:id/approve
 * Independent verifier or admin approves offering for demo (ARCH §9.3, §11, §19, PLAN M9.1).
 *
 * Strict Separation of Duties (SoD) Invariant:
 * Approver MUST NOT be the offering proposer or the property issuer.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: offeringId } = await params;
    const auth = await requireAuth(req);
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

    // 2. SEPARATION OF DUTIES (SoD) ENFORCEMENT (ARCH §11, §19, PLAN M9.1)
    if (offering.proposed_by === auth.userId || offering.issuer_id === auth.userId) {
      return NextResponse.json(
        {
          error: 'SOD_VIOLATION',
          message:
            'Separation of duties violation: Approver cannot be the offering proposer or the property issuer.',
        },
        { status: 403 }
      );
    }

    // 3. Check Role: Must be verifier or admin
    const isVerifierOrAdmin = auth.roles.includes('verifier') || auth.roles.includes('admin');
    if (!isVerifierOrAdmin) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'Access denied: Only independent verifiers or administrators can approve offerings.',
        },
        { status: 403 }
      );
    }

    // 4. Status Gate Check
    const allowedStatuses = ['proposed', 'legal_review_pending'];
    if (!allowedStatuses.includes(offering.status)) {
      return NextResponse.json(
        {
          error: 'INVALID_STATUS',
          message: `Cannot approve offering in status "${offering.status}". Offering must be in "proposed" or "legal_review_pending".`,
        },
        { status: 400 }
      );
    }

    let reviewNotes = 'Approved for simulated demo review.';
    try {
      const body = await req.json();
      const parse = approveSchema.safeParse(body);
      if (parse.success && parse.data.review_notes) {
        reviewNotes = parse.data.review_notes;
      }
    } catch {
      // Body is optional
    }

    const now = new Date().toISOString();

    // 4. Update Offering State -> approved_for_demo
    const { error: updateErr } = await admin
      .from('offerings')
      .update({
        status: 'approved_for_demo',
        approved_by: auth.userId,
        approved_at: now,
        updated_at: now,
      })
      .eq('id', offeringId);

    if (updateErr) {
      return NextResponse.json(
        { error: 'OFFERING_APPROVAL_FAILED', message: updateErr.message },
        { status: 500 }
      );
    }

    // 5. Also record approval on current rights version
    await admin
      .from('offering_rights')
      .update({
        approved_by: auth.userId,
        approved_at: now,
      })
      .eq('offering_id', offeringId)
      .eq('version', offering.current_rights_version);

    // 6. Audit Privileged Approval
    await appendAuditLog({
      actorUserId: auth.userId,
      action: 'offering_approved_for_demo',
      resourceType: 'offering',
      resourceId: offeringId,
      beforeHash: offering.status,
      afterHash: 'approved_for_demo',
      reason: JSON.stringify({
        review_notes: reviewNotes,
        current_rights_version: offering.current_rights_version,
        proposer_id: offering.proposed_by,
      }),
    });

    return NextResponse.json({
      success: true,
      status: 'approved_for_demo',
      approvedBy: auth.userId,
      approvedAt: now,
      message: 'Offering approved for simulated demo. Ready for ATS token configuration.',
    });
  } catch (err: any) {
    const status = err.statusCode || (err.message?.includes('Unauthorized') ? 401 : err.message?.includes('Access forbidden') ? 403 : 500);
    return NextResponse.json({ error: err.code || 'INTERNAL_ERROR', message: err.message }, { status });
  }
}
