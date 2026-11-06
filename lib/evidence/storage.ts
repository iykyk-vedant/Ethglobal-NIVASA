import 'server-only';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { getAdminDbClient, appendAuditLog } from '../db/admin';

export const EVIDENCE_BUCKET = 'evidence-vault';
export const DEFAULT_SIGNED_URL_TTL = 300; // 5 minutes

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
];

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

const LOCAL_STORAGE_ROOT = path.resolve('storage/evidence');

// Ensure local private storage directory exists
if (!fs.existsSync(LOCAL_STORAGE_ROOT)) {
  fs.mkdirSync(LOCAL_STORAGE_ROOT, { recursive: true });
}

export interface StoredDocumentResult {
  privateStoragePath: string;
  sha256Hash: string;
  sizeBytes: number;
  mimeType: string;
}

/**
 * Validates and securely saves an uploaded evidence document file buffer.
 * Server-side SHA-256 computation over the raw received bytes (never trusts client hash).
 */
export async function storeEvidenceDocument(
  propertyId: string,
  documentId: string,
  filename: string,
  fileBuffer: Buffer,
  declaredMimeType: string
): Promise<StoredDocumentResult> {
  // 1. Size Cap Check
  if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `[UPLOAD_ERROR] File size ${fileBuffer.length} bytes exceeds maximum limit of 15MB`
    );
  }

  // 2. MIME Allowlist Check
  const normalizedMime = declaredMimeType.toLowerCase().trim();
  if (!ALLOWED_MIME_TYPES.includes(normalizedMime)) {
    throw new Error(
      `[UPLOAD_ERROR] Unsupported file MIME type "${declaredMimeType}". Allowed types: PDF, PNG, JPEG.`
    );
  }

  // 3. Compute Server-side SHA-256 over raw stream/buffer
  const sha256Hash = createHash('sha256').update(fileBuffer).digest('hex');

  // 4. Save to private local directory
  const propertyDir = path.join(LOCAL_STORAGE_ROOT, propertyId);
  if (!fs.existsSync(propertyDir)) {
    fs.mkdirSync(propertyDir, { recursive: true });
  }

  const safeFilename = `${documentId}-${path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const filePath = path.join(propertyDir, safeFilename);

  fs.writeFileSync(filePath, fileBuffer);
  const privateStoragePath = `${propertyId}/${safeFilename}`;

  // Also upload to Supabase storage bucket if available
  try {
    const adminClient = getAdminDbClient();
    await adminClient.storage
      .from(EVIDENCE_BUCKET)
      .upload(privateStoragePath, fileBuffer, {
        contentType: normalizedMime,
        upsert: true,
      });
  } catch {
    // Continue with local storage
  }

  return {
    privateStoragePath,
    sha256Hash,
    sizeBytes: fileBuffer.length,
    mimeType: normalizedMime,
  };
}

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

  let signedUrl = '';

  try {
    const { data, error } = await adminClient.storage
      .from(EVIDENCE_BUCKET)
      .createSignedUrl(params.storagePath, ttl);

    if (error || !data?.signedUrl) {
      signedUrl = `/api/properties/documents/${params.documentId}/download`;
    } else {
      signedUrl = data.signedUrl;
    }
  } catch {
    signedUrl = `/api/properties/documents/${params.documentId}/download`;
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
    signedUrl,
    expiresIn: ttl,
  };
}

