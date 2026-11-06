import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../env';

let adminClientInstance: SupabaseClient | null = null;

/**
 * Returns the singleton internal service-role Supabase client.
 * Server-only. NEVER expose to client or use for general user queries.
 */
export function getAdminDbClient(): SupabaseClient {
  if (adminClientInstance) return adminClientInstance;

  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('[ADMIN_DB_ERROR] Missing SUPABASE_SERVICE_ROLE_KEY or URL');
  }

  adminClientInstance = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return adminClientInstance;
}

export interface AuditAppendParams {
  actorUserId?: string | null;
  actorWallet?: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  beforeHash?: string | null;
  afterHash?: string | null;
  reason?: string | null;
}

/**
 * Helper to retry transient network failures (e.g. fetch failed)
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 500): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const isNetworkErr = err instanceof TypeError || (err instanceof Error && (err.message.includes('fetch failed') || err.message.includes('network')));
      if (isNetworkErr && i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, i)));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

/**
 * Appends an entry to the tamper-evident audit log hash chain via Postgres RPC.
 */
export async function appendAuditLog(params: AuditAppendParams): Promise<number> {
  return withRetry(async () => {
    const admin = getAdminDbClient();
    const { data, error } = await admin.rpc('audit_append', {
      p_actor_user_id: params.actorUserId || null,
      p_actor_wallet: params.actorWallet || null,
      p_action: params.action,
      p_resource_type: params.resourceType,
      p_resource_id: params.resourceId,
      p_before_hash: params.beforeHash || null,
      p_after_hash: params.afterHash || null,
      p_reason: params.reason || null,
    });

    if (error) {
      throw new Error(`[AUDIT_LOG_ERROR] Failed to append audit log: ${error.message}`);
    }

    return Number(data);
  });
}

export interface ReserveUnitsParams {
  idempotencyKey: string;
  investorId: string;
  offeringId: string;
  units: bigint | string;
  ackMessage: string;
  ackSignature: string;
  ttlMinutes?: number;
}

/**
 * Calls atomic reservation function in PostgreSQL with row lock on offerings table.
 */
export async function reserveUnitsRpc(params: ReserveUnitsParams): Promise<string> {
  const admin = getAdminDbClient();
  const { data, error } = await admin.rpc('reserve_units', {
    p_key: params.idempotencyKey,
    p_investor: params.investorId,
    p_offering: params.offeringId,
    p_units: params.units.toString(),
    p_ack_message: params.ackMessage,
    p_ack_signature: params.ackSignature,
    p_ttl: `${params.ttlMinutes || 15} minutes`,
  });

  if (error) {
    throw error;
  }

  return data as string;
}

/**
 * Grants a verified role to a user via server-only RPC.
 */
export async function grantUserRole(userId: string, role: string, grantedBy?: string): Promise<string> {
  const admin = getAdminDbClient();
  const { data, error } = await admin.rpc('grant_role', {
    p_user_id: userId,
    p_role: role,
    p_granted_by: grantedBy || null,
  });

  if (error) {
    throw error;
  }

  return data as string;
}

/**
 * Revokes an active role from a user by setting revoked_at = now().
 */
export async function revokeUserRole(userId: string, role: string): Promise<void> {
  const admin = getAdminDbClient();
  const { error } = await admin
    .from('user_roles')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('role', role)
    .is('revoked_at', null);

  if (error) {
    throw error;
  }
}
