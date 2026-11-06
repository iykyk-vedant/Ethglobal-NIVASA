/**
 * GET /api/investments/:id
 * ARCH §14.7, §19 · PRD FR-5.9 · PLAN M5.9
 *
 * Owner-only poll endpoint for the order settlement timeline and assertions:
 * - Order state and financial amounts
 * - Allocation attempts history with explicit chain Tx IDs and HashScan links
 * - Timeline milestones from reservation to on-chain reconciliation
 * - Assertions: units ordered, units confirmed, attempts count, duplicates prevented
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getAdminDbClient } from '@/lib/db/admin';
import { getHashScanTxUrl } from '@/lib/hedera/config';
import {
  AppError,
  ErrorCodes,
  formatErrorResponse,
} from '@/lib/validation/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await params;
    const admin = getAdminDbClient();

    // 1. Fetch order
    const { data: order, error: orderErr } = await admin
      .from('investment_orders')
      .select('*')
      .eq('id', id)
      .single();

    if (orderErr || !order) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Investment order not found.', 404);
    }

    // 2. Enforce owner-only access (or admin)
    const isOwner = order.investor_id === auth.userId;
    const isAdmin = auth.roles.includes('admin');

    if (!isOwner && !isAdmin) {
      throw new AppError(
        ErrorCodes.FORBIDDEN,
        'Forbidden: You may only view your own investment orders.',
        403
      );
    }

    // 3. Fetch offering metadata
    const { data: offering } = await admin
      .from('offerings')
      .select('id, token_name, token_symbol, ats_asset_ref, token_contract_id, token_evm_address, chain_id')
      .eq('id', order.offering_id)
      .single();

    // 4. Fetch allocation attempts history (ordered by attempt_no ascending)
    const { data: rawAttempts } = await admin
      .from('allocation_attempts')
      .select('*')
      .eq('order_id', order.id)
      .order('attempt_no', { ascending: true });

    const attempts = (rawAttempts || []).map((att) => ({
      id: att.id,
      attemptNo: att.attempt_no,
      chainTxId: att.chain_tx_id,
      signedTxHash: att.signed_tx_hash,
      status: att.status,
      error: att.error,
      submittedAt: att.submitted_at,
      confirmedAt: att.confirmed_at,
      consensusTimestamp: att.consensus_timestamp,
      createdAt: att.created_at,
      hashScanUrl: att.chain_tx_id ? getHashScanTxUrl(att.chain_tx_id) : null,
    }));

    // 5. Build timeline events
    const timeline = [
      {
        stage: 'RESERVATION',
        status: 'completed',
        label: 'Units Reserved',
        timestamp: order.created_at,
        details: `${order.units} units reserved; awaiting simulated payment.`,
      },
    ];

    if (
      [
        'PAYMENT_CONFIRMED',
        'ALLOCATION_PENDING',
        'ALLOCATION_SUBMITTED',
        'ALLOCATION_CONFIRMED',
        'COMPLETED',
      ].includes(order.status)
    ) {
      timeline.push({
        stage: 'PAYMENT',
        status: 'completed',
        label: 'Payment Confirmed',
        timestamp: order.updated_at,
        details: `Simulated payment recorded (${order.simulated_payment_ref || 'DEMO_INR'}).`,
      });
    }

    for (const att of attempts) {
      timeline.push({
        stage: `ALLOCATION_ATTEMPT_${att.attemptNo}`,
        status: att.status === 'confirmed' ? 'completed' : att.status === 'failed' ? 'failed' : 'in_progress',
        label: `Allocation Attempt #${att.attemptNo} (${att.status.toUpperCase()})`,
        timestamp: att.confirmedAt || att.submittedAt || att.createdAt,
        details: att.chainTxId ? `Hedera Tx ID: ${att.chainTxId}` : 'Transaction prepared',
      });
    }

    if (order.status === 'COMPLETED') {
      timeline.push({
        stage: 'RECONCILIATION',
        status: 'completed',
        label: 'Reconciliation Verified & Completed',
        timestamp: order.updated_at,
        details: 'On-chain holder balance and consensus record verified by reconciliation worker.',
      });
    } else if (order.status === 'RECONCILIATION_REQUIRED') {
      timeline.push({
        stage: 'RECONCILIATION',
        status: 'failed',
        label: 'Reconciliation Required',
        timestamp: order.updated_at,
        details: 'On-chain evidence did not match order parameters. Flagged for manual review.',
      });
    } else if (order.status === 'MANUAL_REVIEW') {
      timeline.push({
        stage: 'MANUAL_REVIEW',
        status: 'failed',
        label: 'Manual Review Triggered',
        timestamp: order.updated_at,
        details: 'Order halted to protect funds; awaiting ops administrator resolution.',
      });
    }

    // 6. Assertions panel (ARCH §14.7)
    const confirmedAttempt = attempts.find((a) => a.status === 'confirmed');
    const assertions = {
      unitsOrdered: order.units.toString(),
      unitsOnChainConfirmed: order.status === 'COMPLETED' ? order.units.toString() : '0',
      attemptsUsed: attempts.length,
      duplicatesPrevented: Math.max(0, attempts.length - (confirmedAttempt ? 1 : 0)),
      isReconciled: order.status === 'COMPLETED',
    };

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        units: order.units.toString(),
        unitPriceInr: order.unit_price_inr,
        amountInr: order.amount_inr,
        rightsVersion: order.rights_version,
        rightsDocumentHash: order.rights_document_hash,
        ackWallet: order.ack_wallet,
        receiptToken: order.receipt_token,
        simulatedPaymentRef: order.simulated_payment_ref,
        expiresAt: order.expires_at,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
      },
      offering,
      attempts,
      timeline,
      assertions,
    });
  } catch (err) {
    return formatErrorResponse(err);
  }
}
