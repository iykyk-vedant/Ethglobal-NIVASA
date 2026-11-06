import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import { storeEvidenceDocument } from '@/lib/evidence/storage';
import { enqueueOutboxJob } from '@/lib/settlement/outbox';
import crypto from 'crypto';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: propertyId } = await params;
    const auth = await requireAuth(req);
    const adminDb = getAdminDbClient();

    // 1. Verify Property Ownership / Access
    const { data: property, error: propErr } = await adminDb
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();

    if (propErr || !property) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Property not found.' },
        { status: 404 }
      );
    }

    const isOwner = property.issuer_id === auth.userId;
    const isVerifier = auth.roles.includes('verifier');
    const isAdmin = auth.roles.includes('admin');

    if (!isOwner && !isVerifier && !isAdmin) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'You do not have permission to upload documents for this property.' },
        { status: 403 }
      );
    }

    // 2. Parse Multipart Form Data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const documentType = formData.get('document_type') as string | null;
    const sourceName = formData.get('source_name') as string | null;
    const sourceReference = formData.get('source_reference') as string | null;
    const issuedAt = formData.get('issued_at') as string | null;
    const validUntil = formData.get('valid_until') as string | null;
    const limitationNote = formData.get('limitation_note') as string | null;

    if (!file || !documentType || !sourceName) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Missing required fields: file, document_type, and source_name are required.',
        },
        { status: 400 }
      );
    }

    // 3. Store Stream & Compute SHA-256 Server-Side
    const documentId = crypto.randomUUID();
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const storageResult = await storeEvidenceDocument(
      propertyId,
      documentId,
      file.name,
      fileBuffer,
      file.type || 'application/octet-stream'
    );

    // 4. Inactivate any previous active documents of the same type for this property
    await adminDb
      .from('property_documents')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('property_id', propertyId)
      .eq('document_type', documentType.toLowerCase().trim())
      .eq('status', 'active');

    // 5. Insert Database Record
    const { data: docRecord, error: insertErr } = await adminDb
      .from('property_documents')
      .insert({
        id: documentId,
        property_id: propertyId,
        document_type: documentType.toLowerCase().trim(),
        private_storage_path: storageResult.privateStoragePath,
        sha256_hash: storageResult.sha256Hash,
        mime_type: storageResult.mimeType,
        size_bytes: storageResult.sizeBytes,
        source_name: sourceName,
        source_reference: sourceReference,
        issued_at: issuedAt ? new Date(issuedAt).toISOString() : null,
        valid_until: validUntil ? new Date(validUntil).toISOString() : null,
        limitation_note: limitationNote,
        uploaded_by: auth.userId,
        status: 'active',
      })
      .select('*')
      .single();

    if (insertErr || !docRecord) {
      throw new Error(`Failed to save document record: ${insertErr?.message}`);
    }

    // 6. Append to Audit Hash Chain
    await appendAuditLog({
      actorUserId: auth.userId,
      actorWallet: auth.profile.walletAddress || null,
      action: 'PROPERTY_DOCUMENT_UPLOADED',
      resourceType: 'property_documents',
      resourceId: documentId,
      reason: `Uploaded ${documentType} with server SHA-256: ${storageResult.sha256Hash}`,
    });

    // 7. Check for Evidence Drift (ARCH §12.1 Trigger T1)
    // If an approved manifest exists, enqueues evidence_drift job
    const { data: approvedManifest } = await adminDb
      .from('evidence_manifests')
      .select('id, version, merkle_root')
      .eq('property_id', propertyId)
      .eq('status', 'approved')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    let driftTriggered = false;
    if (approvedManifest) {
      driftTriggered = true;
      const driftDedupeKey = `evidence_drift:${propertyId}:T1:${approvedManifest.version}`;
      await enqueueOutboxJob({
        jobType: 'evidence_drift',
        dedupeKey: driftDedupeKey,
        payload: {
          propertyId,
          trigger: 'T1',
          manifestVersion: approvedManifest.version,
          manifestId: approvedManifest.id,
          uploaderId: auth.userId,
          documentId,
          documentType,
          reason: `Document ${documentType} uploaded after Manifest v${approvedManifest.version} was approved`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      document: docRecord,
      serverHash: storageResult.sha256Hash,
      driftTriggered,
    });
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode || 500;
    return NextResponse.json(
      {
        error: (err as { code?: string }).code || 'DOCUMENT_UPLOAD_FAILED',
        message: (err as Error).message,
      },
      { status }
    );
  }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: propertyId } = await params;
    const auth = await requireAuth(req);
    const adminDb = getAdminDbClient();

    // Verify property exists
    const { data: property, error: propErr } = await adminDb
      .from('properties')
      .select('issuer_id')
      .eq('id', propertyId)
      .single();

    if (propErr || !property) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Property not found.' }, { status: 404 });
    }

    // Role check: Issuer of property, verifier, or admin
    const isIssuer = property.issuer_id === auth.userId;
    const isVerifier = auth.roles.includes('verifier');
    const isAdmin = auth.roles.includes('admin');

    if (!isIssuer && !isVerifier && !isAdmin) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Access denied to property evidence documents.' },
        { status: 403 }
      );
    }

    const { data: documents, error: docsErr } = await adminDb
      .from('property_documents')
      .select('*')
      .eq('property_id', propertyId)
      .order('created_at', { ascending: false });

    if (docsErr) {
      throw new Error(`Failed to load documents: ${docsErr.message}`);
    }

    return NextResponse.json({
      success: true,
      documents: documents || [],
    });
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode || 500;
    return NextResponse.json(
      {
        error: (err as { code?: string }).code || 'FETCH_DOCUMENTS_FAILED',
        message: (err as Error).message,
      },
      { status }
    );
  }
}
