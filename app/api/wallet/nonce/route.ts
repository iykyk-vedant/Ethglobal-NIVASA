/**
 * POST /api/wallet/nonce
 * ARCH §15.1 · UI §8.6 · PLAN M4.3
 *
 * Generates a single-use random nonce (>= 16 bytes) with ~10 min expiry
 * for EIP-191 personal-sign wallet binding.
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireAuth } from '@/lib/auth/session';
import { getAdminDbClient } from '@/lib/db/admin';
import { formatErrorResponse } from '@/lib/validation/errors';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    const admin = getAdminDbClient();

    // Generate crypto-secure 32-byte nonce (>= 16 bytes requirement)
    const nonce = crypto.randomBytes(32).toString('hex');
    const nowSec = Math.floor(Date.now() / 1000) * 1000;
    const expiresAt = new Date(nowSec + 10 * 60 * 1000).toISOString(); // 10 minutes expiry (seconds-precision)

    const { error } = await admin
      .from('profiles')
      .update({
        wallet_nonce: nonce,
        wallet_nonce_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', auth.userId);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      nonce,
      expiresAt,
      chainId: 296,
      domain: 'nivasa.realestate',
    });
  } catch (err) {
    return formatErrorResponse(err);
  }
}
