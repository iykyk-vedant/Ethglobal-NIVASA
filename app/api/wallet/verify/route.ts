/**
 * POST /api/wallet/verify
 * ARCH §15.1 · UI §8.6 · PLAN M4.3
 *
 * Verifies EIP-191 personal-sign message against the server-issued nonce,
 * enforces 1-to-1 user-wallet uniqueness, consumes nonce, sets wallet_verified_at,
 * and if changing wallet enqueues revocation and resets eligibility to pending.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ethers } from 'ethers';
import { requireAuth } from '@/lib/auth/session';
import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import { AppError, ErrorCodes, formatErrorResponse } from '@/lib/validation/errors';
import { buildWalletVerificationMessage } from '@/lib/wallet/message';
import { enqueueOutboxJob } from '@/lib/settlement/outbox';

const verifyBodySchema = z.object({
  walletAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'Invalid EVM wallet address format'),
  signature: z.string().min(1, 'Signature required'),
  nonce: z.string().min(16, 'Nonce required'),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const body = await req.json().catch(() => ({}));
    const validated = verifyBodySchema.parse(body);

    const admin = getAdminDbClient();
    const claimedAddress = validated.walletAddress.toLowerCase();

    // 1. Fetch current profile state
    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('id, wallet_address, wallet_verified_at, wallet_nonce, wallet_nonce_expires_at')
      .eq('id', auth.userId)
      .single();

    if (profileErr || !profile) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'User profile not found.', 404);
    }

    // 2. Validate single-use nonce
    if (!profile.wallet_nonce || profile.wallet_nonce !== validated.nonce) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        'Invalid or unissued nonce. Please request a new nonce before signing.',
        400
      );
    }

    if (!profile.wallet_nonce_expires_at || new Date(profile.wallet_nonce_expires_at) < new Date()) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        'Nonce has expired. Please request a new nonce before signing.',
        400
      );
    }

    // 3. Reconstruct exact message and recover signer
    const expectedMessage = buildWalletVerificationMessage({
      domain: 'nivasa.realestate',
      userId: auth.userId,
      nonce: profile.wallet_nonce,
      chainId: 296,
      expiresAt: profile.wallet_nonce_expires_at,
    });

    let recoveredAddress: string;
    try {
      recoveredAddress = ethers.verifyMessage(expectedMessage, validated.signature).toLowerCase();
    } catch {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        'Cryptographic signature verification failed.',
        400
      );
    }

    if (recoveredAddress !== claimedAddress) {
      throw new AppError(
        ErrorCodes.VALIDATION_FAILED,
        `Signature recovered address (${recoveredAddress}) does not match claimed wallet (${claimedAddress}).`,
        400
      );
    }

    // 4. Enforce 1-to-1 uniqueness: no other user may claim this wallet
    const { data: existingUser } = await admin
      .from('profiles')
      .select('id')
      .eq('wallet_address', claimedAddress)
      .neq('id', auth.userId)
      .maybeSingle();

    if (existingUser) {
      throw new AppError(
        ErrorCodes.CONFLICT,
        'Wallet address is already registered to another user account.',
        409
      );
    }

    // 5. Detect wallet change and handle revocation / eligibility reset
    const previousWallet = profile.wallet_address;
    const isWalletChanged = Boolean(
      previousWallet &&
      previousWallet.toLowerCase() !== claimedAddress &&
      profile.wallet_verified_at
    );

    if (isWalletChanged) {
      // Enqueue on-chain revocation of the old wallet
      await enqueueOutboxJob({
        type: 'sync_eligibility',
        dedupeKey: `revoke_old_wallet:${auth.userId}:${Date.now()}`,
        payload: {
          userId: auth.userId,
          wallet: previousWallet,
          action: 'revoke',
        },
      });

      // Reset existing eligibility to require fresh review per ARCH §15.1
      await admin
        .from('investor_eligibility')
        .update({
          status: 'pending',
          chain_status: 'not_registered',
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', auth.userId);
    }

    // 6. Consume nonce and commit verified wallet state
    const nowIso = new Date().toISOString();
    const { error: updateErr } = await admin
      .from('profiles')
      .update({
        wallet_address: claimedAddress,
        wallet_verified_at: nowIso,
        wallet_nonce: null,
        wallet_nonce_expires_at: null,
        updated_at: nowIso,
      })
      .eq('id', auth.userId);

    if (updateErr) {
      throw updateErr;
    }

    // 7. Append audit log
    await appendAuditLog({
      actorUserId: auth.userId,
      action: 'wallet_verified',
      resourceType: 'profiles',
      resourceId: auth.userId,
      reason: isWalletChanged
        ? `Re-bound wallet to ${claimedAddress}; queued revocation for ${previousWallet}`
        : `Verified demo wallet ${claimedAddress} via EIP-191 signature`,
    });

    return NextResponse.json({
      success: true,
      walletAddress: claimedAddress,
      verifiedAt: nowIso,
      isWalletChanged,
    });
  } catch (err) {
    return formatErrorResponse(err);
  }
}
