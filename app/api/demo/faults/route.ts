/**
 * /api/demo/faults
 * ARCH §14.7, §19, §22.2 (D4) · PRD FR-5.10 · UI §8.11, §10.6 · PLAN M12.1
 *
 * Admin-only flag-gated fault injection management endpoint:
 * - GET: Check if fault injection is enabled and list currently armed faults
 * - POST: Arm a one-shot settlement fault (timeout_after_submit, fail_before_submit, duplicate_job)
 * - DELETE: Cancel an active armed fault
 *
 * Invariants:
 * - Admin role required
 * - Strictly disabled in production
 * - One-shot execution
 * - Every operation logged to audit_logs
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole, requireAuth } from '@/lib/auth/session';
import { isProductionRuntime } from '@/lib/env';
import {
  armFault,
  cancelArmedFault,
  listActiveFaults,
  isFaultInjectionEnabled,
  FaultType,
} from '@/lib/settlement/faults';
import {
  AppError,
  ErrorCodes,
  formatErrorResponse,
} from '@/lib/validation/errors';

const armFaultSchema = z.object({
  faultType: z.enum(['timeout_after_submit', 'fail_before_submit', 'duplicate_job']),
  orderId: z.string().uuid('Invalid order ID format').optional().nullable(),
  reason: z.string().min(5, 'A reason of at least 5 characters is required for audit trail'),
});

const cancelFaultSchema = z.object({
  faultId: z.string().uuid('Invalid fault ID format'),
  reason: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const isEnabled = isFaultInjectionEnabled();
    const isProduction = isProductionRuntime();

    const activeFaults = isEnabled ? await listActiveFaults() : [];

    return NextResponse.json({
      success: true,
      enabled: isEnabled,
      isProduction,
      activeFaults,
    });
  } catch (err) {
    return formatErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['admin']);

    const isEnabled = isFaultInjectionEnabled();
    const isProduction = isProductionRuntime();

    if (!isEnabled || isProduction) {
      throw new AppError(
        ErrorCodes.FLAG_DISABLED,
        'Fault injection is disabled in this environment (requires DEMO_FAULTS=true and non-production).',
        403
      );
    }

    const body = await req.json().catch(() => ({}));
    const validated = armFaultSchema.parse(body);

    const armed = await armFault({
      faultType: validated.faultType as FaultType,
      orderId: validated.orderId,
      reason: validated.reason,
      actorUserId: auth.userId,
      actorWallet: 'admin:console',
    });

    return NextResponse.json(
      {
        success: true,
        fault: armed,
        auditId: armed.audit_id,
        message: `Fault '${armed.fault_type}' armed successfully for ${
          armed.order_id ? `order ${armed.order_id}` : 'next order allocation'
        }.`,
      },
      { status: 201 }
    );
  } catch (err) {
    return formatErrorResponse(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['admin']);

    const body = await req.json().catch(() => ({}));
    const validated = cancelFaultSchema.parse(body);

    const cancelled = await cancelArmedFault(
      validated.faultId,
      auth.userId,
      validated.reason || 'Cancelled by administrator'
    );

    return NextResponse.json({
      success: true,
      fault: cancelled,
      message: `Fault '${cancelled.fault_type}' cancelled.`,
    });
  } catch (err) {
    return formatErrorResponse(err);
  }
}

