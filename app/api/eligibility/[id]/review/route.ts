/**
 * POST /api/eligibility/:id/review
 * ARCH §6.4, §8.4 · PRD FR-1.2 · PLAN M4.4
 *
 * Verifier accreditation review endpoint.
 * Strict Separation of Duties (SoD): Reviewer user ID CANNOT equal the investor user ID.
 * Reason is required for all decisions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/session';
import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import { AppError, ErrorCodes, formatErrorResponse } from '@/lib/validation/errors';
import { enqueueOutboxJob } from '@/lib/settlement/outbox';

const reviewSchema = z.object({
  decision: z.enum(['approve', 'reject', 'revoke']),
  reason: z.string().min(5, 'Review decision requires an explanatory reason of at least 5 characters'),
  validUntil: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const validated = reviewSchema.parse(body);

    const admin = getAdminDbClient();

    // 1. Fetch current eligibility record
    const { data: record, error: fetchErr } = await admin
      .from('investor_eligibility')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !record) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Eligibility request record not found.', 404);
    }

    // 2. Enforce Separation of Duties (SoD) per ARCH §6.4
    // Self-review must strictly fail with SOD_VIOLATION even before generic role check
    if (record.user_id === auth.userId) {
      throw new AppError(
        ErrorCodes.SOD_VIOLATION,
        'Separation of duties violation: An investor cannot review or approve their own accreditation eligibility.',
        403
      );
    }

    // 3. Enforce role permissions (only verifiers or admins may review other users' records)
    if (!auth.roles.includes('verifier') && !auth.roles.includes('admin')) {
      throw new AppError(
        ErrorCodes.FORBIDDEN,
        'Forbidden: Verifier or admin role required to conduct accreditation reviews.',
        403
      );
    }

    const nowIso = new Date().toISOString();
    let updatedStatus: 'eligible' | 'ineligible' | 'revoked';
    let validUntilIso: string | null = null;

    if (validated.decision === 'approve') {
      updatedStatus = 'eligible';
      const validUntilDate = validated.validUntil
        ? new Date(validated.validUntil)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1-year default accreditation window
      validUntilIso = validUntilDate.toISOString();

      // Update eligibility record
      const { error: updateErr } = await admin
        .from('investor_eligibility')
        .update({
          status: updatedStatus,
          reviewed_by: auth.userId,
          valid_until: validUntilIso,
          reason_code: validated.reason,
          updated_at: nowIso,
        })
        .eq('id', id);

      if (updateErr) throw updateErr;

      // Enqueue sync_eligibility job for background worker to register on Hedera
      await enqueueOutboxJob({
        type: 'sync_eligibility',
        dedupeKey: `sync_eligibility:${id}:${Date.now()}`,
        payload: {
          eligibilityId: id,
          userId: record.user_id,
          action: 'register',
          validUntil: validUntilIso,
        },
      });
    } else if (validated.decision === 'reject') {
      updatedStatus = 'ineligible';

      const { error: updateErr } = await admin
        .from('investor_eligibility')
        .update({
          status: updatedStatus,
          reviewed_by: auth.userId,
          reason_code: validated.reason,
          updated_at: nowIso,
        })
        .eq('id', id);

      if (updateErr) throw updateErr;
    } else {
      // revoke
      updatedStatus = 'revoked';

      const { error: updateErr } = await admin
        .from('investor_eligibility')
        .update({
          status: updatedStatus,
          reviewed_by: auth.userId,
          reason_code: validated.reason,
          updated_at: nowIso,
        })
        .eq('id', id);

      if (updateErr) throw updateErr;

      // Enqueue sync_eligibility to revoke on Hedera
      await enqueueOutboxJob({
        type: 'sync_eligibility',
        dedupeKey: `revoke_eligibility:${id}:${Date.now()}`,
        payload: {
          eligibilityId: id,
          userId: record.user_id,
          action: 'revoke',
        },
      });
    }

    // Append tamper-evident audit log
    await appendAuditLog({
      actorUserId: auth.userId,
      action: `eligibility_${validated.decision}`,
      resourceType: 'investor_eligibility',
      resourceId: id,
      reason: validated.reason,
    });

    return NextResponse.json({
      success: true,
      decision: validated.decision,
      recordId: id,
      status: updatedStatus,
    });
  } catch (err) {
    return formatErrorResponse(err);
  }
}
