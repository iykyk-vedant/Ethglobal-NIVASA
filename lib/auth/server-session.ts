import 'server-only';
import { cookies } from 'next/headers';
import { requireAuth, type AuthenticatedContext } from '@/lib/auth/session';

/** Resolve the HttpOnly Supabase access-token cookie as a server-validated user. */
export async function getCurrentUser(): Promise<AuthenticatedContext | null> {
  const token = (await cookies()).get('sb-access-token')?.value;
  if (!token) return null;

  try {
    return await requireAuth(new Headers({ authorization: `Bearer ${token}` }));
  } catch {
    return null;
  }
}
