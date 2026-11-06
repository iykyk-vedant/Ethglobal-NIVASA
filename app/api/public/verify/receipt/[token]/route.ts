/**
 * GET /api/public/verify/receipt/[token]
 * ARCH §13.2, §20 · PRD FR-7.3 · UI §8.10 · PLAN M11.4
 *
 * Public endpoint for zero-login settlement receipt verification:
 * - Unguessable receipt token
 * - Displays units, price snapshot, rights version, rights hash
 * - EIP-191 signature recovery verification to bound wallet
 * - On-chain ATS token balance check
 * - Shortened wallet address ONLY (0x1234...abcd)
 * - STRICTLY ZERO name, email, profile, or PII
 * - 30-second cache header
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyPublicReceipt } from '@/lib/verify/receipt';

// In-memory rate limiter per client IP: 60 requests per 1 minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 60;

  const current = rateLimitMap.get(ip);
  if (!current || now > current.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  current.count++;
  return { allowed: true, remaining: maxRequests - current.count };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
  const rateLimit = checkRateLimit(clientIp);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many receipt verification requests. Please wait a minute before querying again.',
      },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  const { token: receiptToken } = await context.params;

  try {
    const receipt = await verifyPublicReceipt(receiptToken);

    if (!receipt) {
      return NextResponse.json(
        {
          error: 'RECEIPT_NOT_FOUND',
          message: 'Receipt token not found or order has not completed settlement.',
        },
        { status: 404 }
      );
    }

    // Sanitize output: exclude raw internal wallet and user UUIDs
    const sanitizedResponse = {
      receipt_token: receipt.receiptToken,
      token_name: receipt.tokenName,
      token_symbol: receipt.tokenSymbol,
      token_contract_id: receipt.tokenContractId,
      units: receipt.units,
      unit_price_inr: receipt.unitPriceInr,
      total_amount_inr: receipt.totalAmountInr,
      rights_version: receipt.rightsVersion,
      rights_document_hash: receipt.rightsDocumentHash,
      shortened_wallet: receipt.shortenedWallet,
      signature_verification: {
        status: receipt.signatureStatus,
        recovered: receipt.signatureRecovered,
      },
      on_chain_balance: {
        status: receipt.onChainBalanceStatus,
        balance_units: receipt.onChainBalanceUnits,
        meets_order_units: receipt.onChainBalanceStatus === 'PASS',
      },
      allocation_tx: {
        tx_id: receipt.allocationTxId,
        hashscan_url: receipt.allocationTxUrl,
        attempt_no: receipt.attemptNo,
      },
      confirmed_at: receipt.confirmedAt,
      checked_at: receipt.checkedAt,
      limitation: receipt.limitation,
      disclaimer:
        'Technical prototype only; not proof of title, legal validity, regulatory authorization or investment suitability.',
    };

    return NextResponse.json(sanitizedResponse, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        'X-RateLimit-Limit': '60',
        'X-RateLimit-Remaining': String(rateLimit.remaining),
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: 'RECEIPT_VERIFICATION_ERROR',
        message: err instanceof Error ? err.message : 'Unknown error during receipt verification',
      },
      { status: 500 }
    );
  }
}
