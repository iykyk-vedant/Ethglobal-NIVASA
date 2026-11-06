import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../env';

/**
 * Creates an RLS-scoped Supabase client.
 * If an access token is provided, requests execute under that user's identity (auth.uid()).
 * Otherwise, requests execute as anonymous (subject to RLS public/anon policies).
 */
export function createUserDbClient(accessToken?: string): SupabaseClient {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) {
    throw new Error('[DB_CLIENT_ERROR] NEXT_PUBLIC_SUPABASE_URL and ANON_KEY must be configured.');
  }

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}

