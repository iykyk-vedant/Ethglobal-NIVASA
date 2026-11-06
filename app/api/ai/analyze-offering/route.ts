import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { analyzeOfferingSchema } from '@/lib/ai/schemas';
import { runPropertyAnalysis } from '@/lib/ai/advisor';
import { InvestorPreferences } from '@/lib/ai/fit-policy';

// Simple in-memory rate limiter per user: max 10 calls per 5 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  const maxRequests = 10;

  const current = rateLimitMap.get(userId);
  if (!current || now > current.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  current.count++;
  return { allowed: true, remaining: maxRequests - current.count };
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);

    // Rate limit check
    const rateLimit = checkRateLimit(auth.userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many analysis requests. Please wait a few minutes before analyzing again.',
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parseResult = analyzeOfferingSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Invalid property analysis parameters.',
          details: parseResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { propertyId, snapshotFrom, snapshotTo } = parseResult.data;

    // Read stored preferences from cookie or body
    let preferences: InvestorPreferences = {
      yield_preference: 'balanced',
      risk_tolerance: 'moderate',
      liquidity_horizon: 'medium',
    };

    const prefCookie = req.cookies.get('nivasa_ai_preferences')?.value;
    if (prefCookie) {
      try {
        preferences = { ...preferences, ...JSON.parse(prefCookie) };
      } catch {
        // ignore JSON parse error
      }
    }

    if (body.preferences && typeof body.preferences === 'object') {
      preferences = { ...preferences, ...body.preferences };
    }

    // Execute analysis
    const outcome = await runPropertyAnalysis({
      propertyId,
      snapshotFrom,
      snapshotTo,
      investorId: auth.userId,
      preferences,
    });

    return NextResponse.json({
      success: true,
      outcome,
      rateLimitRemaining: rateLimit.remaining,
    });
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode || 500;
    return NextResponse.json(
      {
        error: (err as { code?: string }).code || 'ANALYSIS_ERROR',
        message: (err as Error).message,
      },
      { status }
    );
  }
}

