/**
 * NIVASA - Settlement Fault Injector (ARCH §14.7, §22.2 D4)
 * PRD FR-5.10 · UI §8.11, §10.6 · PLAN M12.1
 *
 * Provides safe, audited, one-shot fault injection on real settlement code paths:
 * - timeout_after_submit: worker submits to Hedera, then drops response; attempt marked 'unknown'
 * - fail_before_submit: prepare succeeds, submit throws simulated error; attempt marked 'failed', worker retries
 * - duplicate_job: enqueue duplicate allocate_units job; outbox dedupe key yields single allocation
 *
 * Invariants:
 * - Strictly disabled in production (refuses to arm)
 * - Requires DEMO_FAULTS=true
 * - One-shot execution (auto-consumed upon trigger)
 * - Every arming, consumption, and cancellation is written to audit_logs
 */

import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import { enqueueOutboxJob } from '@/lib/settlement/outbox';
import { AppError, ErrorCodes } from '@/lib/validation/errors';

export type FaultType = 'timeout_after_submit' | 'fail_before_submit' | 'duplicate_job';
export type FaultStatus = 'armed' | 'consumed' | 'cancelled';

export interface ArmedFault {
  id: string;
  fault_type: FaultType;
  order_id: string | null;
  armed_by: string | null;
  reason: string;
  status: FaultStatus;
  created_at: string;
  consumed_at: string | null;
  updated_at: string;
}

export interface ArmFaultParams {
  faultType: FaultType;
  orderId?: string | null;
  reason: string;
  actorUserId?: string | null;
  actorWallet?: string | null;
}

/**
 * Checks whether fault injection is enabled in the current runtime environment.
 * Strictly requires DEMO_FAULTS=true and non-production APP_ENV.
 */
export function isFaultInjectionEnabled(): boolean {
  const isEnabled = process.env.DEMO_FAULTS === 'true';
  const isProduction =
    process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';
  return isEnabled && !isProduction;
}

/**
 * Asserts that fault injection is permitted. Throws FLAG_DISABLED otherwise.
 */
export function assertFaultInjectionAllowed(): void {
  if (!isFaultInjectionEnabled()) {
    throw new AppError(
      ErrorCodes.FLAG_DISABLED,
      'Fault injection is disabled in this environment (requires DEMO_FAULTS=true and non-production APP_ENV).',
      403
    );
  }
}

/**
 * Arms a one-shot settlement fault.
 * Overwrites any previously active fault for the target order.
 * Records the action in audit_logs.
 */
export async function armFault(params: ArmFaultParams): Promise<ArmedFault> {
  assertFaultInjectionAllowed();

  if (!params.reason || params.reason.trim().length < 5) {
    throw new AppError(
      ErrorCodes.VALIDATION_FAILED,
      'A substantive reason (at least 5 characters) is required to arm a fault.',
      400
    );
  }

  const admin = getAdminDbClient();
  const now = new Date().toISOString();

  // Cancel any existing armed faults for this order / global target
  if (params.orderId) {
    await admin
      .from('demo_fault_injections')
      .update({
        status: 'cancelled',
        updated_at: now,
      })
      .eq('order_id', params.orderId)
      .eq('status', 'armed');
  } else {
    await admin
      .from('demo_fault_injections')
      .update({
        status: 'cancelled',
        updated_at: now,
      })
      .is('order_id', null)
      .eq('status', 'armed');
  }

  // Insert newly armed fault
  const { data: newFault, error: insertErr } = await admin
    .from('demo_fault_injections')
    .insert({
      fault_type: params.faultType,
      order_id: params.orderId || null,
      armed_by: params.actorUserId || null,
      reason: params.reason.trim(),
      status: 'armed',
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (insertErr || !newFault) {
    throw new Error(`Failed to arm settlement fault: ${insertErr?.message}`);
  }

  // If fault is duplicate_job and orderId is provided, demonstrate outbox deduplication
  let duplicateJobEnqueued = false;
  if (params.faultType === 'duplicate_job' && params.orderId) {
    const enqueueResult = await enqueueOutboxJob('allocate_units', params.orderId, {
      orderId: params.orderId,
    });
    duplicateJobEnqueued = enqueueResult.isDuplicate;
  }

  // Record in audit log
  await appendAuditLog({
    actorUserId: params.actorUserId || null,
    actorWallet: params.actorWallet || 'admin:console',
    action: 'fault_injection_armed',
    resourceType: 'demo_fault_injections',
    resourceId: newFault.id,
    reason: `Armed fault '${params.faultType}' for ${
      params.orderId ? `order ${params.orderId}` : 'next order allocation'
    }: ${params.reason.trim()}`,
  });

  return newFault as ArmedFault;
}

/**
 * Gets the currently active armed fault for an order (or global fallback).
 */
export async function getActiveFault(orderId?: string | null): Promise<ArmedFault | null> {
  if (!isFaultInjectionEnabled()) {
    return null;
  }

  const admin = getAdminDbClient();

  // Check order-specific fault first
  if (orderId) {
    const { data: specificFault } = await admin
      .from('demo_fault_injections')
      .select('*')
      .eq('order_id', orderId)
      .eq('status', 'armed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (specificFault) {
      return specificFault as ArmedFault;
    }
  }

  // Fallback to global armed fault
  const { data: globalFault } = await admin
    .from('demo_fault_injections')
    .select('*')
    .is('order_id', null)
    .eq('status', 'armed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (globalFault as ArmedFault) || null;
}

/**
 * Consumes an armed fault (one-shot enforcement).
 * Returns the fault if one was found and consumed, or null.
 */
export async function consumeArmedFault(orderId?: string | null): Promise<ArmedFault | null> {
  const activeFault = await getActiveFault(orderId);
  if (!activeFault) {
    return null;
  }

  const admin = getAdminDbClient();
  const now = new Date().toISOString();

  const { data: consumedFault, error: updateErr } = await admin
    .from('demo_fault_injections')
    .update({
      status: 'consumed',
      consumed_at: now,
      updated_at: now,
    })
    .eq('id', activeFault.id)
    .eq('status', 'armed')
    .select()
    .maybeSingle();

  if (updateErr || !consumedFault) {
    return null;
  }

  // Audit log consumption
  await appendAuditLog({
    actorUserId: null,
    actorWallet: 'system:worker',
    action: 'fault_injection_consumed',
    resourceType: 'demo_fault_injections',
    resourceId: consumedFault.id,
    reason: `Consumed fault '${consumedFault.fault_type}' on order ${orderId || 'unspecified'}.`,
  });

  return consumedFault as ArmedFault;
}

/**
 * Cancels an armed fault.
 */
export async function cancelArmedFault(
  faultId: string,
  actorUserId?: string | null,
  reason = 'Cancelled by administrator'
): Promise<ArmedFault> {
  const admin = getAdminDbClient();
  const now = new Date().toISOString();

  const { data: cancelledFault, error: updateErr } = await admin
    .from('demo_fault_injections')
    .update({
      status: 'cancelled',
      updated_at: now,
    })
    .eq('id', faultId)
    .select()
    .single();

  if (updateErr || !cancelledFault) {
    throw new Error(`Failed to cancel armed fault: ${updateErr?.message}`);
  }

  await appendAuditLog({
    actorUserId: actorUserId || null,
    actorWallet: 'admin:console',
    action: 'fault_injection_cancelled',
    resourceType: 'demo_fault_injections',
    resourceId: faultId,
    reason,
  });

  return cancelledFault as ArmedFault;
}

/**
 * Lists all active armed faults.
 */
export async function listActiveFaults(): Promise<ArmedFault[]> {
  if (!isFaultInjectionEnabled()) {
    return [];
  }

  const admin = getAdminDbClient();
  const { data: faults } = await admin
    .from('demo_fault_injections')
    .select('*')
    .eq('status', 'armed')
    .order('created_at', { ascending: false });

  return (faults as ArmedFault[]) || [];
}

