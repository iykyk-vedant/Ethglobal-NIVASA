/**
 * NIVASA - Maintenance Background Jobs
 * ARCH §14.4 · PRD FR-5.11 · PLAN M5.8
 *
 * Background jobs executed by the worker:
 * - expire_reservations: Set unpaid orders past TTL to EXPIRED
 * - reconcile_supply: Compare on-chain ATS total supply vs sum of COMPLETED orders
 * - stuck_orders: Inspect and recover orders pending or submitted longer than threshold
 */

import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import { readTokenSupply, verifyMirrorTransaction } from '@/lib/hedera/chain-reads';
import { enqueueOutboxJob } from '@/lib/settlement/outbox';

/**
 * Marks expired UNITS_RESERVED and PAYMENT_PENDING orders as EXPIRED.
 */
export async function processExpireReservations(): Promise<{ expiredCount: number; orderIds: string[] }> {
  const admin = getAdminDbClient();
  const nowIso = new Date().toISOString();

  const { data: expiredOrders, error: fetchErr } = await admin
    .from('investment_orders')
    .select('id, investor_id, offering_id, units, status, expires_at')
    .in('status', ['UNITS_RESERVED', 'PAYMENT_PENDING'])
    .lt('expires_at', nowIso);

  if (fetchErr) {
    throw new Error(`[EXPIRE_RESERVATIONS] Failed to fetch expired orders: ${fetchErr.message}`);
  }

  const orderIds: string[] = [];

  for (const order of expiredOrders || []) {
    const { error: updateErr } = await admin
      .from('investment_orders')
      .update({
        status: 'EXPIRED',
        updated_at: nowIso,
      })
      .eq('id', order.id);

    if (!updateErr) {
      orderIds.push(order.id);
      await appendAuditLog({
        actorUserId: null,
        actorWallet: 'system:worker',
        action: 'order_reservation_expired',
        resourceType: 'investment_orders',
        resourceId: order.id,
        beforeHash: order.status,
        afterHash: 'EXPIRED',
        reason: `Order reservation TTL (${order.expires_at}) passed without payment confirmation`,
      });
    }
  }

  return { expiredCount: orderIds.length, orderIds };
}

/**
 * Compares on-chain ATS total supply against sum of COMPLETED orders in PostgreSQL.
 */
export async function processReconcileSupply(
  offeringId?: string
): Promise<{ checkedCount: number; mismatches: Array<{ offeringId: string; onChain: string; dbCompleted: string }> }> {
  const admin = getAdminDbClient();
  let query = admin.from('offerings').select('id, token_evm_address, ats_asset_ref, token_name');

  if (offeringId) {
    query = query.eq('id', offeringId);
  } else {
    query = query.in('status', ['active', 'paused', 'paused_evidence_drift', 'closed']);
  }

  const { data: offerings, error } = await query;
  if (error || !offerings) {
    throw new Error(`[RECONCILE_SUPPLY] Failed to query offerings: ${error?.message}`);
  }

  const mismatches: Array<{ offeringId: string; onChain: string; dbCompleted: string }> = [];

  for (const off of offerings) {
    const contractRef = off.token_evm_address || off.ats_asset_ref;
    if (!contractRef) continue;

    const [supplyRes, ordersRes] = await Promise.all([
      readTokenSupply(contractRef),
      admin
        .from('investment_orders')
        .select('units')
        .eq('offering_id', off.id)
        .eq('status', 'COMPLETED'),
    ]);

    const onChainSupply = supplyRes.data?.totalUnits ?? 0n;
    const dbCompletedUnits = (ordersRes.data || []).reduce(
      (acc, curr) => acc + BigInt(curr.units),
      0n
    );

    if (onChainSupply !== dbCompletedUnits) {
      mismatches.push({
        offeringId: off.id,
        onChain: onChainSupply.toString(),
        dbCompleted: dbCompletedUnits.toString(),
      });

      await appendAuditLog({
        actorUserId: null,
        actorWallet: 'system:worker',
        action: 'supply_reconciliation_mismatch',
        resourceType: 'offerings',
        resourceId: off.id,
        reason: `Supply mismatch for ${off.token_name}: On-chain total supply is ${onChainSupply.toString()} units vs DB completed orders ${dbCompletedUnits.toString()} units`,
      });
    } else {
      await appendAuditLog({
        actorUserId: null,
        actorWallet: 'system:worker',
        action: 'supply_reconciliation_verified',
        resourceType: 'offerings',
        resourceId: off.id,
        reason: `Supply matched: ${onChainSupply.toString()} units verified on Hedera Testnet and database`,
      });
    }
  }

  return { checkedCount: offerings.length, mismatches };
}

/**
 * Identifies orders stuck in ALLOCATION_PENDING or ALLOCATION_SUBMITTED and attempts recovery.
 */
export async function processStuckOrders(
  thresholdMinutes = 10
): Promise<{ checkedCount: number; recoveredCount: number }> {
  const admin = getAdminDbClient();
  const cutoff = new Date(Date.now() - thresholdMinutes * 60 * 1000).toISOString();

  const { data: stuckOrders, error } = await admin
    .from('investment_orders')
    .select('id, status, updated_at')
    .in('status', ['ALLOCATION_PENDING', 'ALLOCATION_SUBMITTED'])
    .lt('updated_at', cutoff);

  if (error || !stuckOrders) {
    throw new Error(`[STUCK_ORDERS] Failed to query stuck orders: ${error?.message}`);
  }

  let recoveredCount = 0;

  for (const order of stuckOrders) {
    // Check latest attempt
    const { data: latestAttempt } = await admin
      .from('allocation_attempts')
      .select('*')
      .eq('order_id', order.id)
      .order('attempt_no', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestAttempt?.chain_tx_id) {
      const mirrorRes = await verifyMirrorTransaction(latestAttempt.chain_tx_id);
      if (mirrorRes.status === 'CONFIRMED' && mirrorRes.data?.confirmed) {
        await admin
          .from('allocation_attempts')
          .update({
            status: 'confirmed',
            confirmed_at: new Date().toISOString(),
            consensus_timestamp: mirrorRes.data.timestamp || null,
          })
          .eq('id', latestAttempt.id);

        await admin
          .from('investment_orders')
          .update({
            status: 'ALLOCATION_CONFIRMED',
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);

        await enqueueOutboxJob('reconcile_order', order.id, {
          orderId: order.id,
          attemptId: latestAttempt.id,
          chainTxId: latestAttempt.chain_tx_id,
        });

        recoveredCount++;
      }
    }
  }

  return { checkedCount: stuckOrders.length, recoveredCount };
}
