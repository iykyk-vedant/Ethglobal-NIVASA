import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import fs from 'fs';
import path from 'path';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: documentId } = await params;
    const auth = await requireAuth(req);
    const adminDb = getAdminDbClient();

    // 1. Fetch document metadata
    const { data: doc, error: docErr } = await adminDb
      .from('property_documents')
      .select('*, properties(issuer_id, name)')
      .eq('id', documentId)
      .single();

    if (docErr || !doc) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Document not found.' }, { status: 404 });
    }

    // 2. Authorization check
    const propertyIssuerId = (doc.properties as unknown as { issuer_id: string })?.issuer_id;
    const isOwner = propertyIssuerId === auth.userId;
    const isVerifierOrAdmin = auth.roles.includes('verifier') || auth.roles.includes('admin');

    if (!isOwner && !isVerifierOrAdmin) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Access denied: You cannot access this private evidence document.' },
        { status: 403 }
      );
    }

    // 3. Audit download issuance
    await appendAuditLog({
      actorUserId: auth.userId,
      actorWallet: auth.profile.walletAddress || null,
      action: 'EVIDENCE_DOCUMENT_DOWNLOADED',
      resourceType: 'property_documents',
      resourceId: documentId,
      reason: `Document ${doc.document_type} downloaded by roles [${auth.roles.join(', ')}]`,
    });

    // 4. Resolve local file path
    const localDir = path.resolve('storage/evidence', doc.property_id);
    const files = fs.existsSync(localDir) ? fs.readdirSync(localDir) : [];
    const matchedFile = files.find((f) => f.startsWith(documentId));

    if (matchedFile) {
      const filePath = path.join(localDir, matchedFile);
      const fileBuffer = fs.readFileSync(filePath);

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': doc.mime_type || 'application/octet-stream',
          'Content-Disposition': `inline; filename="${doc.document_type}-${doc.sha256_hash.slice(0, 8)}.${doc.mime_type.split('/')[1] || 'bin'}"`,
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      });
    }

    // Fallback: If not in local storage, generate Supabase signed URL and redirect
    const { data: signedData } = await adminDb.storage
      .from('evidence-vault')
      .createSignedUrl(doc.private_storage_path, 300);

    if (signedData?.signedUrl) {
      return NextResponse.redirect(signedData.signedUrl);
    }

    return NextResponse.json(
      { error: 'FILE_NOT_FOUND', message: 'Document binary not found in storage.' },
      { status: 404 }
    );
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode || 500;
    return NextResponse.json(
      {
        error: (err as { code?: string }).code || 'DOWNLOAD_FAILED',
        message: (err as Error).message,
      },
      { status }
    );
  }
}
