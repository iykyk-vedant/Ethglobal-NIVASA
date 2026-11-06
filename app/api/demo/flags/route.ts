/**
 * /api/demo/flags
 * ARCH §19, §21 · UI §8.11 · PRD FR-9.2, FR-9.3 · PLAN M14.3
 *
 * Server-backed endpoint providing live demo flag states:
 * - DEMO_PAYMENTS: Simulated INR payment receipt recording
 * - DEMO_FAULTS: One-shot settlement fault injection
 * - DEMO_EVENTS: Scripted property performance updates
 * - APP_ENV: Production guardrail (all demo features disabled in production)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { isFaultInjectionEnabled } from '@/lib/settlement/faults';
import { isPropertyEventsEnabled } from '@/lib/demo/property-events';
import { formatErrorResponse } from '@/lib/validation/errors';

export async function GET(req: NextRequest) {
  try {
    // Requires authenticated user (investor, admin, verifier, issuer)
    await requireAuth(req);

    const isProduction =
      process.env.APP_ENV === 'production' || process.env.NODE_ENV === 'production';

    const paymentsEnabled = !isProduction && (process.env.DEMO_PAYMENTS === 'true' || process.env.DEMO_PAYMENTS === '1');
    const faultsEnabled = isFaultInjectionEnabled();
    const eventsEnabled = isPropertyEventsEnabled();

    return NextResponse.json({
      success: true,
      appEnv: process.env.APP_ENV || process.env.NODE_ENV || 'development',
      isProduction,
      flags: {
        DEMO_PAYMENTS: {
          enabled: paymentsEnabled,
          raw: process.env.DEMO_PAYMENTS || 'false',
          description: 'Simulated INR payment confirmation flow for test orders',
        },
        DEMO_FAULTS: {
          enabled: faultsEnabled,
          raw: process.env.DEMO_FAULTS || 'false',
          description: 'One-shot Hedera settlement fault injection and recovery verification',
        },
        DEMO_EVENTS: {
          enabled: eventsEnabled,
          raw: process.env.DEMO_EVENTS || 'false',
          description: 'Scripted property performance events and AI change intelligence updates',
        },
      },
    });
  } catch (err: unknown) {
    return formatErrorResponse(err);
  }
}
