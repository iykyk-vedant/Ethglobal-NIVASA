/**
 * POST /api/eligibility/requests
 * ARCH §8.4 · PRD FR-1.1 · PLAN M4.4
 *
 * Investor requests eligibility accreditation review.
 * Fails closed if investor does not possess a verified bound wallet.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/session';
import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import { AppError, ErrorCodes, formatErrorResponse } from '@/lib/validation/errors';

const requestSchema = z.object({
  offeringId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const body = await req.json().catch(() => ({}));
    const validated = requestSchema.parse(body);

    const admin = getAdminDbClient();

    // 1. Verify that user has bound and verified a demo wallet per ARCH §15.1
    const { data: profile } = await admin
      .from('profiles')
      .select('wallet_address, wallet_verified_at')
      .eq('id', auth.userId)
      .single();

    if (!profile?.wallet_address || !profile.wallet_verified_at) {
      throw new AppError(
        ErrorCodes.WALLET_NOT_VERIFIED,
        'Wallet binding required before requesting eligibility review. Please sign the verification nonce first.',
        400
      );
    }

    // 2. Check if active eligibility already exists
    const { data: existing } = await admin
      .from('investor_eligibility')
      .select('*')
      .eq('user_id', auth.userId)
      .in('status', ['pending', 'eligible'])
      .maybeSingle();

    if (existing) {
      if (existing.status === 'eligible') {
        return NextResponse.json({
          success: true,
          message: 'Investor is already approved and eligible for demo participation.',
          record: existing,
        });
      }
      return NextResponse.json({
        success: true,
        message: 'Eligibility review request is already pending verification.',
        record: existing,
      });
    }

    // 3. Insert new eligibility review record
    const { data: record, error } = await admin
      .from('investor_eligibility')
      .insert({
        user_id: auth.userId,
        offering_id: validated.offeringId || null,
        status: 'pending',
        policy_version: 'v1.0',
        chain_status: 'not_registered',
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    // 4. Record audit log
    await appendAuditLog({
      actorUserId: auth.userId,
      action: 'eligibility_requested',
      resourceType: 'investor_eligibility',
      resourceId: record.id,
      reason: `Investor submitted accreditation review for wallet ${profile.wallet_address}`,
    });

    return NextResponse.json({
      success: true,
      message: 'Eligibility request submitted for verifier review.',
      record,
    });
  } catch (err) {
    return formatErrorResponse(err);
  }
}
