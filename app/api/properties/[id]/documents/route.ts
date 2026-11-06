import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import { storeEvidenceDocument } from '@/lib/evidence/storage';
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

    // Only property owner or admin can upload evidence
    const isOwner = property.issuer_id === auth.userId;
    const isAdmin = auth.roles.includes('admin');
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'Access denied: You can only upload documents for properties you own.',
        },
        { status: 403 }
      );
    }

    // 2. Parse Multipart Form Data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const documentType = formData.get('document_type') as string | null;
    const sourceName = (formData.get('source_name') as string | null) || '';
    const sourceReference = (formData.get('source_reference') as string | null) || '';
    const issuedAt = formData.get('issued_at') as string | null;
    const validUntil = formData.get('valid_until') as string | null;
    const limitationNote = formData.get('limitation_note') as string | null;

    if (!file || !documentType) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Both "file" and "document_type" fields are required.',
        },
        { status: 400 }
      );
    }

    // 3. Process File Stream into Buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const documentId = crypto.randomUUID();

    // 4. Securely store and compute server-side SHA-256
    const storageResult = await storeEvidenceDocument(
      propertyId,
      documentId,
      file.name,
      fileBuffer,
      file.type || 'application/octet-stream'
    );

    // 5. Insert Document Record in Database
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

    return NextResponse.json({
      success: true,
      document: docRecord,
      serverHash: storageResult.sha256Hash,
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

    // RLS check: only issuer, verifier, or admin can list evidence documents
    const isIssuer = property.issuer_id === auth.userId;
    const isVerifierOrAdmin = auth.roles.includes('verifier') || auth.roles.includes('admin');
    if (!isIssuer && !isVerifierOrAdmin) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Access denied: You cannot view evidence documents for this property.' },
        { status: 403 }
      );
    }

    const { data: documents, error } = await adminDb
      .from('property_documents')
      .select('*')
      .eq('property_id', propertyId)
      .order('received_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      documents: documents || [],
    });
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode || 500;
    return NextResponse.json(
      {
        error: (err as { code?: string }).code || 'QUERY_FAILED',
        message: (err as Error).message,
      },
      { status }
    );
  }
}
