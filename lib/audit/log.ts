import { getAdminDbClient } from '@/lib/db/admin';

export interface AuditLogParams {
  actorUserId?: string | null;
  actorWallet?: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  beforeHash?: string | null;
  afterHash?: string | null;
  reason?: string | Record<string, unknown> | null;
}

/**
 * Appends an entry to the hash-chained audit_logs table via the audit_append RPC.
 * Fail-closed: errors are thrown or logged depending on context.
 */
export async function appendAuditLog(params: AuditLogParams): Promise<number | null> {
  const admin = getAdminDbClient();
  const reasonStr = typeof params.reason === 'object' && params.reason !== null
    ? JSON.stringify(params.reason)
    : params.reason ?? null;

  const { data, error } = await admin.rpc('audit_append', {
    p_actor_user_id: params.actorUserId ?? null,
    p_actor_wallet: params.actorWallet ?? null,
    p_action: params.action,
    p_resource_type: params.resourceType,
    p_resource_id: params.resourceId,
    p_before_hash: params.beforeHash ?? null,
    p_after_hash: params.afterHash ?? null,
    p_reason: reasonStr,
  });

  if (error) {
    console.error('[AuditLog] Failed to append audit log:', error);
    throw new Error(`Failed to append audit log: ${error.message}`);
  }

  return Number(data);
}

