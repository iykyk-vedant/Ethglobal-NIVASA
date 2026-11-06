import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminDbClient } from '@/lib/db/admin';

const sessionSchema = z.object({
  accessToken: z.string().min(20).max(8192),
  expiresIn: z.number().int().positive().max(60 * 60 * 24 * 30).optional(),
});

/** Exchange a Supabase-validated access token for an HttpOnly app session cookie. */
export async function POST(req: NextRequest) {
  const parsed = sessionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_SESSION', message: 'A valid sign-in session is required.' }, { status: 400 });
  }

  const { data, error } = await getAdminDbClient().auth.getUser(parsed.data.accessToken);
  if (error || !data.user) {
    return NextResponse.json({ error: 'INVALID_SESSION', message: 'Sign-in failed or expired. Please try again.' }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('sb-access-token', parsed.data.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.min(parsed.data.expiresIn ?? 3600, 60 * 60 * 24 * 30),
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set('sb-access-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
