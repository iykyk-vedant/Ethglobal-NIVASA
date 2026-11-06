/**
 * POST /api/demo/payment-confirmation
 * ARCH §14.1, §14.6, §19 · PRD FR-5.3 · PLAN M5.2
 *
 * Flag-gated simulated payment confirmation route:
 * - Admin only
 * - Requires DEMO_PAYMENTS=true; strictly refuses in production
 * - Writes immutable audit log
 * - Moves order from PAYMENT_PENDING to PAYMENT_CONFIRMED
 * - Triggers DB trigger trg_order_payment_confirmed to enqueue allocate_units outbox job
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/session';
import { isProductionRuntime } from '@/lib/env';
import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import {
  AppError,
  ErrorCodes,
  formatErrorResponse,
} from '@/lib/validation/errors';

const paymentConfirmSchema = z.object({
  orderId: z.string().uuid('Invalid order ID format'),
  simulatedPaymentRef: z.string().optional(),
  reason: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ['admin']);

    // 1. Enforce environment flag guard
    const demoPaymentsEnabled = process.env.DEMO_PAYMENTS === 'true';
    const isProduction = isProductionRuntime();

    if (!demoPaymentsEnabled || isProduction) {
      throw new AppError(
        ErrorCodes.FLAG_DISABLED,
        'Simulated payment confirmation is disabled in this environment (requires DEMO_PAYMENTS=true and non-production).',
        403
      );
    }

    const body = await req.json().catch(() => ({}));
    const validated = paymentConfirmSchema.parse(body);
    const admin = getAdminDbClient();

    // 2. Fetch order state
    const { data: order, error: orderErr } = await admin
      .from('investment_orders')
      .select('*')
      .eq('id', validated.orderId)
      .single();

    if (orderErr || !order) {
      throw new AppError(ErrorCodes.NOT_FOUND, 'Investment order not found.', 404);
    }

    // Idempotency: if already confirmed or beyond, return success without re-transition
    if (order.status !== 'PAYMENT_PENDING') {
      if (
        [
          'PAYMENT_CONFIRMED',
          'ALLOCATION_PENDING',
          'ALLOCATION_SUBMITTED',
          'ALLOCATION_CONFIRMED',
          'COMPLETED',
        ].includes(order.status)
      ) {
        return NextResponse.json({
          success: true,
          orderId: order.id,
          status: order.status,
          note: 'Payment was already confirmed (idempotent)',
        });
      }

      throw new AppError(
        ErrorCodes.INVALID_STATE_TRANSITION,
        `Cannot confirm payment for order in '${order.status}' status.`,
        409
      );
    }

    const paymentRef =
      validated.simulatedPaymentRef ||
      `SIM_INR_${Date.now()}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    // 3. Update order status to PAYMENT_CONFIRMED
    const nowIso = new Date().toISOString();
    const { error: updateErr } = await admin
      .from('investment_orders')
      .update({
        status: 'PAYMENT_CONFIRMED',
        simulated_payment_ref: paymentRef,
        updated_at: nowIso,
      })
      .eq('id', order.id);

    if (updateErr) {
      throw new AppError(
        ErrorCodes.INTERNAL_ERROR,
        `Failed to confirm payment on order: ${updateErr.message}`,
        500
      );
    }

    // 4. Append tamper-evident audit record
    const auditId = await appendAuditLog({
      actorUserId: auth.userId,
      actorWallet: 'admin',
      action: 'payment_confirmed_demo',
      resourceType: 'investment_orders',
      resourceId: order.id,
      beforeHash: order.status,
      afterHash: 'PAYMENT_CONFIRMED',
      reason: validated.reason || `Recorded simulated INR payment receipt ${paymentRef}`,
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      status: 'PAYMENT_CONFIRMED',
      paymentRef,
      auditId,
    });
  } catch (err) {
    return formatErrorResponse(err);
  }
}
