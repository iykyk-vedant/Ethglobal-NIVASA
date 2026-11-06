/**
 * /api/ai/analyze-changes
 * ARCH §16.3–16.10, §19, §22.2 (D5) · PRD FR-8.2–8.9 · UI §8.8 · PLAN M13.3
 *
 * Investor/Admin endpoint for evidence-grounded property change intelligence:
 * - Deterministic delta computation (lib/ai/delta.ts)
 * - 0G Private Computer inference with request-level tracking
 * - Ground-truth Zod validation (anti-hallucination, allowlist evidence IDs, no unstated causes)
 * - Persisted ai_episodes with previous_episode_id link
 *
 * Invariants:
 * - Rate-limited and authenticated
 * - Zero on-chain actions triggered
 * - Never renders or returns unvalidated model output
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { analyzeChangesSchema } from '@/lib/ai/schemas';
import { runPropertyAnalysis } from '@/lib/ai/advisor';
import { formatErrorResponse } from '@/lib/validation/errors';

export async function POST(req: NextRequest) {
  try {
    // 1. Session-derived authentication (Investor or Admin or Verifier)
    const auth = await requireAuth(req);

    // 2. Parse & validate request body
    const rawBody = await req.json();
    const parsed = analyzeChangesSchema.parse(rawBody);

    // 3. Execute change intelligence pipeline via 0G Private Computer
    const outcome = await runPropertyAnalysis({
      propertyId: parsed.propertyId,
      snapshotFrom: parsed.snapshotFrom,
      snapshotTo: parsed.snapshotTo,
      investorId: auth.userId,
      preferences: parsed.preferences,
      previousEpisodeId: parsed.previousEpisodeId,
    });

    return NextResponse.json({
      success: true,
      outcome,
    });
  } catch (err: unknown) {
    return formatErrorResponse(err);
  }
}
