import 'server-only';
import { getAdminDbClient, appendAuditLog } from '../db/admin';

export const EVIDENCE_BUCKET = 'evidence-vault';
export const DEFAULT_SIGNED_URL_TTL = 300; // 5 minutes

export interface SignedEvidenceUrlParams {
  storagePath: string;
  documentId: string;
  actorUserId: string;
  actorWallet?: string | null;
  expiresInSeconds?: number;
}

export interface SignedUrlResult {
  signedUrl: string;
  expiresIn: number;
}

/**
 * Generates a time-limited signed URL for a private document in evidence-vault
 * and cryptographically logs the issuance in the tamper-evident audit hash chain.
 */
export async function createSignedEvidenceUrl(params: SignedEvidenceUrlParams): Promise<SignedUrlResult> {
  const adminClient = getAdminDbClient();
  const ttl = params.expiresInSeconds || DEFAULT_SIGNED_URL_TTL;

  const { data, error } = await adminClient.storage
    .from(EVIDENCE_BUCKET)
    .createSignedUrl(params.storagePath, ttl);

  if (error || !data?.signedUrl) {
    throw new Error(`[STORAGE_ERROR] Failed to generate signed URL for ${params.storagePath}: ${error?.message}`);
  }

  // Audit append: every issuance of a signed URL for private evidence must be recorded
  await appendAuditLog({
    actorUserId: params.actorUserId,
    actorWallet: params.actorWallet || null,
    action: 'EVIDENCE_SIGNED_URL_ISSUED',
    resourceType: 'property_documents',
    resourceId: params.documentId,
    reason: `Signed URL issued with TTL ${ttl}s for path ${params.storagePath}`,
  });

  return {
    signedUrl: data.signedUrl,
    expiresIn: ttl,
  };
}

