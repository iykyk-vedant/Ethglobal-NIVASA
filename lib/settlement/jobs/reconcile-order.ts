/**
 * NIVASA - Outbox Job: reconcile_order
 * ARCH §9.4, §14.1, §14.9 · PRD FR-5.6 · PLAN M5.6
 *
 * The SOLE location in the codebase where an order reaches COMPLETED:
 * Compares on-chain evidence against the database order:
 * 1. Transaction consensus receipt and Mirror Node record
 * 2. Receiving bound wallet address
 * 3. Unit balance on Hedera ATS Diamond contract
 *
 * Match   -> COMPLETED
 * Mismatch -> RECONCILIATION_REQUIRED (never silently dropped, never falsely completed)
 */

import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import { readHolderBalance, verifyMirrorTransaction } from '@/lib/hedera/chain-reads';

export interface ReconcileOrderPayload {
  orderId: string;
  attemptId?: string;
  chainTxId?: string;
}

export async function processReconcileOrder(
  payload: ReconcileOrderPayload
): Promise<{ success: boolean; action: string; note?: string; error?: string }> {
  const admin = getAdminDbClient();

  // 1. Fetch order
  const { data: order, error: orderErr } = await admin
    .from('investment_orders')
    .select('*')
    .eq('id', payload.orderId)
    .single();

  if (orderErr || !order) {
    throw new Error(`[RECONCILE_ORDER] Order ${payload.orderId} not found.`);
  }

  // Idempotency: if already COMPLETED, nothing further to reconcile
  if (order.status === 'COMPLETED') {
    return {
      success: true,
      action: 'skip',
      note: 'Order is already COMPLETED (idempotent)',
    };
  }

  // 2. Fetch offering to identify the ATS contract address
  const { data: offering, error: offeringErr } = await admin
    .from('offerings')
    .select('token_evm_address, ats_asset_ref')
    .eq('id', order.offering_id)
    .single();

  if (offeringErr || !offering) {
    throw new Error(`[RECONCILE_ORDER] Offering ${order.offering_id} not found.`);
  }

  const contractTarget = offering.token_evm_address || offering.ats_asset_ref || '';

  // 3. Fetch confirmed attempt for this order
  const { data: attempt } = await admin
    .from('allocation_attempts')
    .select('*')
    .eq('order_id', order.id)
    .eq('status', 'confirmed')
    .maybeSingle();

  if (!attempt || !attempt.chain_tx_id) {
    // Cannot complete reconciliation without a confirmed chain transaction attempt
    await admin
      .from('investment_orders')
      .update({
        status: 'RECONCILIATION_REQUIRED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    return {
      success: false,
      action: 'reconciliation_required',
      error: 'No confirmed allocation attempt found for order',
    };
  }

  // 4. Verify on-chain transaction consensus on Mirror Node
  const txVerification = await verifyMirrorTransaction(attempt.chain_tx_id);
  const isTxConfirmed = txVerification.status === 'CONFIRMED' && Boolean(txVerification.data?.confirmed);

  // 5. Query on-chain holder balance via contract call
  const balanceResult = await readHolderBalance(order.ack_wallet, contractTarget);
  const onChainBalance = balanceResult.data ?? 0n;
  const expectedUnits = BigInt(order.units);

  // 6. Compare on-chain evidence
  const balanceSufficient = onChainBalance >= expectedUnits;
  const isReconciled = isTxConfirmed && balanceSufficient;

  if (isReconciled) {
    // Evidence matches! Transition order to COMPLETED
    const completedAtIso = new Date().toISOString();
    await admin
      .from('investment_orders')
      .update({
        status: 'COMPLETED',
        updated_at: completedAtIso,
      })
      .eq('id', order.id);

    await appendAuditLog({
      actorUserId: null,
      actorWallet: 'system:worker',
      action: 'order_reconciled_completed',
      resourceType: 'investment_orders',
      resourceId: order.id,
      beforeHash: order.status,
      afterHash: 'COMPLETED',
      reason: `Reconciliation verified: on-chain balance (${onChainBalance.toString()} units) >= expected (${expectedUnits.toString()} units), tx ${attempt.chain_tx_id} confirmed on consensus`,
    });

    return {
      success: true,
      action: 'completed',
      note: `Reconciled order ${order.id}: on-chain balance is ${onChainBalance.toString()} units.`,
    };
  } else {
    // Mismatch detected: fail closed to RECONCILIATION_REQUIRED (ARCH §9.4, §14.1)
    await admin
      .from('investment_orders')
      .update({
        status: 'RECONCILIATION_REQUIRED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    await appendAuditLog({
      actorUserId: null,
      actorWallet: 'system:worker',
      action: 'order_reconciliation_mismatch',
      resourceType: 'investment_orders',
      resourceId: order.id,
      beforeHash: order.status,
      afterHash: 'RECONCILIATION_REQUIRED',
      reason: `Reconciliation mismatch: on-chain balance (${onChainBalance.toString()}) vs expected (${expectedUnits.toString()}), tx confirmed: ${isTxConfirmed}`,
    });

    return {
      success: false,
      action: 'reconciliation_required',
      error: `Evidence mismatch: balance ${onChainBalance.toString()} (expected ${expectedUnits.toString()}), txConfirmed=${isTxConfirmed}`,
    };
  }
}
