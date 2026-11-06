import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { investorProfileSchema } from '@/lib/ai/schemas';

// Strict schema ensuring NO personal identifiers or unauthorized fields
const strictProfileSchema = investorProfileSchema.strict();

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);

    const body = await req.json();
    const parseResult = strictProfileSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Invalid preferences payload. Only bucketed risk, yield, and horizon choices are permitted.',
          details: parseResult.error.errors,
        },
        { status: 400 }
      );
    }

    const preferences = parseResult.data;

    // Set HTTP-only preference cookie
    const response = NextResponse.json({
      success: true,
      userId: auth.userId,
      preferences,
    });

    response.cookies.set('nivasa_ai_preferences', JSON.stringify(preferences), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode || 500;
    return NextResponse.json(
      {
        error: (err as { code?: string }).code || 'INTERNAL_ERROR',
        message: (err as Error).message,
      },
      { status }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req);
    const prefCookie = req.cookies.get('nivasa_ai_preferences')?.value;
    let preferences = null;

    if (prefCookie) {
      try {
        preferences = JSON.parse(prefCookie);
      } catch {
        preferences = null;
      }
    }

    return NextResponse.json({
      preferences: preferences || {
        yield_preference: 'balanced',
        risk_tolerance: 'moderate',
        liquidity_horizon: 'medium',
      },
    });
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode || 500;
    return NextResponse.json(
      {
        error: (err as { code?: string }).code || 'INTERNAL_ERROR',
        message: (err as Error).message,
      },
      { status }
    );
  }
}

