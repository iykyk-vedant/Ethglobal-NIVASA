/**
 * NIVASA - Outbox Job: allocate_units
 * ARCH §14.1–§14.4 · PRD FR-5.4, FR-5.5 · PLAN M5.3, M5.4, M5.5
 *
 * Safe, idempotent issuance to Hedera Testnet ATS asset:
 * 1. Claims job; checks pre-conditions (eligibility, offering active, daily cap).
 * 2. Invariant: NEVER two live attempts. Inspects existing attempts before creating a new one.
 * 3. Builds issuance transaction with explicit Transaction ID via AtsAdapter.
 * 4. PERSISTS and COMMITS allocation_attempts row with status 'prepared' BEFORE submit.
 * 5. Submits, transitions order to ALLOCATION_SUBMITTED.
 * 6. Reads receipt + Mirror Node record: on SUCCESS marks attempt 'confirmed',
 *    order 'ALLOCATION_CONFIRMED', and enqueues reconcile_order job.
 * 7. On unknown outcome / timeout: queries Mirror Node; if still within valid duration
 *    window, keeps single live attempt; never creates attempt n+1 prematurely.
 */

import { ethers } from 'ethers';
import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import { getAtsAdapter } from '@/lib/hedera/ats-adapter';
import { verifyMirrorTransaction } from '@/lib/hedera/chain-reads';
import { enqueueOutboxJob } from '@/lib/settlement/outbox';
import { consumeArmedFault } from '@/lib/settlement/faults';

export interface AllocateUnitsPayload {
  orderId: string;
  investorId?: string;
  offeringId?: string;
  units?: string | number;
  injectedFault?: 'timeout_after_submit' | 'fail_before_submit';
}

export async function processAllocateUnits(
  payload: AllocateUnitsPayload
): Promise<{ success: boolean; action: string; txId?: string; note?: string; error?: string }> {
  const admin = getAdminDbClient();
  const atsAdapter = getAtsAdapter();

  // 1. Fetch current order state
  const { data: order, error: orderErr } = await admin
    .from('investment_orders')
    .select('*')
    .eq('id', payload.orderId)
    .single();

  if (orderErr || !order) {
    throw new Error(`[ALLOCATE_UNITS] Order ${payload.orderId} not found.`);
  }

  // Idempotency check: if order is already confirmed or completed, do nothing
  if (['ALLOCATION_CONFIRMED', 'COMPLETED'].includes(order.status)) {
    return {
      success: true,
      action: 'skip',
      note: `Order is already in '${order.status}' status (idempotent)`,
    };
  }

  // Check if order was already routed to terminal review
  if (['MANUAL_REVIEW', 'ALLOCATION_FAILED', 'REFUND_PENDING', 'REFUNDED', 'REJECTED', 'EXPIRED'].includes(order.status)) {
    return {
      success: false,
      action: 'skip',
      note: `Order is in '${order.status}' status; cannot allocate`,
    };
  }

  // 2. Check if a confirmed attempt already exists for this order
  const { data: confirmedAttempt } = await admin
    .from('allocation_attempts')
    .select('*')
    .eq('order_id', order.id)
    .eq('status', 'confirmed')
    .maybeSingle();

  if (confirmedAttempt) {
    if (order.status !== 'ALLOCATION_CONFIRMED') {
      await admin
        .from('investment_orders')
        .update({
          status: 'ALLOCATION_CONFIRMED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);
    }

    await enqueueOutboxJob('reconcile_order', order.id, {
      orderId: order.id,
      attemptId: confirmedAttempt.id,
      chainTxId: confirmedAttempt.chain_tx_id,
    });

    return {
      success: true,
      action: 'already_confirmed',
      txId: confirmedAttempt.chain_tx_id,
    };
  }

  // Resolve one-shot fault injection (from explicit payload or database-armed state)
  let effectiveFault: 'timeout_after_submit' | 'fail_before_submit' | undefined = payload.injectedFault;
  if (!effectiveFault) {
    const armed = await consumeArmedFault(order.id);
    if (armed && (armed.fault_type === 'timeout_after_submit' || armed.fault_type === 'fail_before_submit')) {
      effectiveFault = armed.fault_type;
    }
  }

  // 3. Inspect existing active / unknown attempts (ARCH §14.2: NEVER two live attempts)
  const { data: activeAttempt } = await admin
    .from('allocation_attempts')
    .select('*')
    .eq('order_id', order.id)
    .in('status', ['submitted', 'unknown'])
    .order('attempt_no', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeAttempt && activeAttempt.chain_tx_id) {
    // Check Mirror Node for consensus resolution
    const mirrorCheck = await verifyMirrorTransaction(activeAttempt.chain_tx_id);

    if (mirrorCheck.status === 'CONFIRMED' && mirrorCheck.data?.confirmed) {
      // Found and confirmed on chain!
      await admin
        .from('allocation_attempts')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          consensus_timestamp: mirrorCheck.data.timestamp || null,
        })
        .eq('id', activeAttempt.id);

      await admin
        .from('investment_orders')
        .update({
          status: 'ALLOCATION_CONFIRMED',
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      await enqueueOutboxJob('reconcile_order', order.id, {
        orderId: order.id,
        attemptId: activeAttempt.id,
        chainTxId: activeAttempt.chain_tx_id,
      });

      return {
        success: true,
        action: 'recovered_confirmed',
        txId: activeAttempt.chain_tx_id,
        note: 'Found successful transaction on Mirror Node during recovery',
      };
    }

    const isDefinitiveFailure =
      mirrorCheck.data &&
      !mirrorCheck.data.confirmed &&
      mirrorCheck.data.result !== 'PENDING_MIRROR_INGESTION' &&
      mirrorCheck.data.result !== 'NOT_FOUND';

    if (isDefinitiveFailure) {
      // Transaction definitively failed on-chain
      await admin
        .from('allocation_attempts')
        .update({
          status: 'failed',
          error: mirrorCheck.error || `Transaction failed on Hedera consensus: ${mirrorCheck.data?.result}`,
        })
        .eq('id', activeAttempt.id);
      // Can now safely proceed to next attempt below
    } else {
      // Transaction not yet found on Mirror Node (PENDING)
      // Check valid duration window (Hedera max valid duration is ~180 seconds)
      const attemptAgeSeconds =
        (Date.now() - new Date(activeAttempt.created_at).getTime()) / 1000;

      if (attemptAgeSeconds < 180) {
        // Invariant: Do NOT create attempt n+1 while attempt n could still execute
        return {
          success: false,
          action: 'await_consensus',
          txId: activeAttempt.chain_tx_id,
          note: `Attempt ${activeAttempt.attempt_no} is awaiting Mirror Node resolution (${Math.round(attemptAgeSeconds)}s / 180s window)`,
        };
      } else {
        // Window expired without reaching consensus
        await admin
          .from('allocation_attempts')
          .update({
            status: 'failed',
            error: 'Timed out outside 180s valid-duration window without reaching consensus',
          })
          .eq('id', activeAttempt.id);
        // Safe to proceed to next attempt
      }
    }
  }

  // 4. Pre-condition re-checks before creating a new issuance transaction
  // A. Re-check investor eligibility (ARCH §14.1 fail closed -> MANUAL_REVIEW)
  const { data: eligibility } = await admin
    .from('investor_eligibility')
    .select('*')
    .eq('user_id', order.investor_id)
    .eq('offering_id', order.offering_id)
    .eq('status', 'eligible')
    .eq('chain_status', 'registered')
    .gt('valid_until', new Date().toISOString())
    .maybeSingle();

  if (!eligibility) {
    await admin
      .from('investment_orders')
      .update({
        status: 'MANUAL_REVIEW',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    await appendAuditLog({
      actorUserId: null,
      actorWallet: 'system:worker',
      action: 'allocation_failed_eligibility',
      resourceType: 'investment_orders',
      resourceId: order.id,
      reason: 'Investor eligibility revoked or unconfirmed on-chain at allocation time; order routed to MANUAL_REVIEW',
    });

    return {
      success: false,
      action: 'manual_review',
      error: 'Investor eligibility unconfirmed or revoked at allocation time',
    };
  }

  // B. Re-check offering is still active (ARCH §14.1 fail closed -> MANUAL_REVIEW)
  const { data: offering } = await admin
    .from('offerings')
    .select('*')
    .eq('id', order.offering_id)
    .single();

  if (!offering || offering.status !== 'active') {
    await admin
      .from('investment_orders')
      .update({
        status: 'MANUAL_REVIEW',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    await appendAuditLog({
      actorUserId: null,
      actorWallet: 'system:worker',
      action: 'allocation_failed_offering_inactive',
      resourceType: 'investment_orders',
      resourceId: order.id,
      reason: `Offering is no longer active (current status: ${offering?.status || 'NOT_FOUND'}); order routed to MANUAL_REVIEW`,
    });

    return {
      success: false,
      action: 'manual_review',
      error: `Offering status is '${offering?.status}'; allocation aborted`,
    };
  }

  // C. Enforce ISSUER_DAILY_UNIT_CAP (ARCH §14.4, §21.1)
  const dailyCap = BigInt(process.env.ISSUER_DAILY_UNIT_CAP || '100000');
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const { data: todayOrders } = await admin
    .from('investment_orders')
    .select('units')
    .gte('created_at', startOfDay.toISOString())
    .in('status', [
      'ALLOCATION_PENDING',
      'ALLOCATION_SUBMITTED',
      'ALLOCATION_CONFIRMED',
      'COMPLETED',
    ])
    .neq('id', order.id);

  const unitsAllocatedToday = (todayOrders || []).reduce(
    (acc, curr) => acc + BigInt(curr.units),
    0n
  );

  if (unitsAllocatedToday + BigInt(order.units) > dailyCap) {
    await admin
      .from('investment_orders')
      .update({
        status: 'MANUAL_REVIEW',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    await appendAuditLog({
      actorUserId: null,
      actorWallet: 'system:worker',
      action: 'allocation_failed_daily_cap',
      resourceType: 'investment_orders',
      resourceId: order.id,
      reason: `Order units (${order.units}) exceeds daily issuance cap of ${dailyCap.toString()} units (already allocated: ${unitsAllocatedToday.toString()})`,
    });

    return {
      success: false,
      action: 'manual_review',
      error: 'Issuer daily unit allocation cap exceeded',
    };
  }

  // 5. Transition order to ALLOCATION_PENDING
  if (order.status !== 'ALLOCATION_PENDING') {
    await admin
      .from('investment_orders')
      .update({
        status: 'ALLOCATION_PENDING',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);
  }

  // 6. Build the issuance transaction with an EXPLICIT transaction ID
  const preparedTx = await atsAdapter.prepareIssue(
    order.id,
    order.ack_wallet,
    BigInt(order.units)
  );

  const signedTxHash = ethers.keccak256(preparedTx.encodedCalldata);

  // Compute next attempt number
  const { data: attempts } = await admin
    .from('allocation_attempts')
    .select('attempt_no')
    .eq('order_id', order.id)
    .order('attempt_no', { ascending: false })
    .limit(1);

  const nextAttemptNo = ((attempts?.[0]?.attempt_no as number) || 0) + 1;

  // 7. PERSIST AND COMMIT allocation_attempts (attempt_no, chain_tx_id, signed_tx_hash, status='prepared') BEFORE submitting
  const { data: newAttempt, error: attemptInsertErr } = await admin
    .from('allocation_attempts')
    .insert({
      order_id: order.id,
      attempt_no: nextAttemptNo,
      chain_tx_id: preparedTx.txId,
      signed_tx_hash: signedTxHash,
      status: 'prepared',
    })
    .select()
    .single();

  if (attemptInsertErr || !newAttempt) {
    throw new Error(
      `[ALLOCATE_UNITS] Failed to persist allocation attempt: ${attemptInsertErr?.message}`
    );
  }

  // Fault injection: fail_before_submit
  if (effectiveFault === 'fail_before_submit') {
    await admin
      .from('allocation_attempts')
      .update({
        status: 'failed',
        error: '[INJECTED_FAULT] fail_before_submit threw before contract execution',
      })
      .eq('id', newAttempt.id);

    throw new Error('[INJECTED_FAULT] fail_before_submit: simulated submission failure');
  }

  // 8. Mark attempt 'submitted' and order 'ALLOCATION_SUBMITTED'
  const submittedAtIso = new Date().toISOString();
  await Promise.all([
    admin
      .from('allocation_attempts')
      .update({
        status: 'submitted',
        submitted_at: submittedAtIso,
      })
      .eq('id', newAttempt.id),
    admin
      .from('investment_orders')
      .update({
        status: 'ALLOCATION_SUBMITTED',
        updated_at: submittedAtIso,
      })
      .eq('id', order.id),
  ]);

  // 9. Submit the prepared transaction to Hedera Testnet
  let txRef;
  try {
    txRef = await atsAdapter.submitPrepared(preparedTx);
  } catch (submitErr: any) {
    // Network or node communication error: mark attempt 'unknown' (NOT failed, per ARCH §14.2)
    await admin
      .from('allocation_attempts')
      .update({
        status: 'unknown',
        error: submitErr.message,
      })
      .eq('id', newAttempt.id);

    return {
      success: false,
      action: 'unknown',
      txId: preparedTx.txId,
      error: submitErr.message,
      note: 'Submission threw network error; attempt marked unknown for Mirror Node recovery',
    };
  }

  // Fault injection: timeout_after_submit (worker acts as if response was lost)
  if (effectiveFault === 'timeout_after_submit') {
    await admin
      .from('allocation_attempts')
      .update({
        status: 'unknown',
        error: '[INJECTED_FAULT] timeout_after_submit: response dropped; awaiting Mirror Node recovery',
      })
      .eq('id', newAttempt.id);

    return {
      success: false,
      action: 'injected_timeout',
      txId: preparedTx.txId,
      note: 'Simulated timeout after submit; attempt marked unknown for subsequent tick resolution',
    };
  }

  // 10. Confirmation via receipt and Mirror Node record
  if (txRef.status === 'SUCCESS') {
    // Wait for consensus confirmation on Mirror Node
    const mirrorRes = await verifyMirrorTransaction(preparedTx.txId);
    const confirmedAtIso = new Date().toISOString();

    await admin
      .from('allocation_attempts')
      .update({
        status: 'confirmed',
        confirmed_at: confirmedAtIso,
        consensus_timestamp: mirrorRes.data?.timestamp || null,
      })
      .eq('id', newAttempt.id);

    await admin
      .from('investment_orders')
      .update({
        status: 'ALLOCATION_CONFIRMED',
        updated_at: confirmedAtIso,
      })
      .eq('id', order.id);

    // Enqueue reconcile_order job
    await enqueueOutboxJob('reconcile_order', order.id, {
      orderId: order.id,
      attemptId: newAttempt.id,
      chainTxId: preparedTx.txId,
    });

    await appendAuditLog({
      actorUserId: null,
      actorWallet: 'system:worker',
      action: 'order_allocation_confirmed',
      resourceType: 'investment_orders',
      resourceId: order.id,
      reason: `Issued ${order.units} units on Hedera ATS Asset (tx: ${preparedTx.txId})`,
    });

    return {
      success: true,
      action: 'confirmed',
      txId: preparedTx.txId,
    };
  } else {
    // Contract execution reverted or failed receipt
    await admin
      .from('allocation_attempts')
      .update({
        status: 'failed',
        error: `Hedera receipt status: ${txRef.status}`,
      })
      .eq('id', newAttempt.id);

    return {
      success: false,
      action: 'failed',
      txId: preparedTx.txId,
      error: `Hedera receipt failed with status ${txRef.status}`,
    };
  }
}
