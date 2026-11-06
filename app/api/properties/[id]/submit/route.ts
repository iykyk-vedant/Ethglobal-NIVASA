import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import { buildEvidenceManifest } from '@/lib/evidence/manifest';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: propertyId } = await params;
    const auth = await requireAuth(req);
    const adminDb = getAdminDbClient();

    // 1. Verify Property Ownership
    const { data: property, error: propErr } = await adminDb
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();

    if (propErr || !property) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Property not found.' }, { status: 404 });
    }

    const isOwner = property.issuer_id === auth.userId;
    const isAdmin = auth.roles.includes('admin');
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Access denied: Only the property issuer can submit evidence for verification.' },
        { status: 403 }
      );
    }

    // 2. Fetch Active Documents
    const { data: documents, error: docsErr } = await adminDb
      .from('property_documents')
      .select('*')
      .eq('property_id', propertyId)
      .eq('status', 'active');

    if (docsErr || !documents || documents.length === 0) {
      return NextResponse.json(
        {
          error: 'NO_DOCUMENTS',
          message: 'Cannot submit evidence manifest: No active documents uploaded for this property.',
        },
        { status: 400 }
      );
    }

    // 3. Determine Next Manifest Version
    const { data: existingManifests } = await adminDb
      .from('evidence_manifests')
      .select('version')
      .eq('property_id', propertyId)
      .order('version', { ascending: false })
      .limit(1);

    const nextVersion = existingManifests && existingManifests.length > 0 ? existingManifests[0].version + 1 : 1;

    // 4. Build Evidence Manifest Structure & Merkle Root
    const manifestResult = buildEvidenceManifest(propertyId, nextVersion, documents);

    // 5. Insert New Manifest Version
    const { data: manifestRecord, error: manifestInsertErr } = await adminDb
      .from('evidence_manifests')
      .insert({
        property_id: propertyId,
        version: nextVersion,
        manifest_json: manifestResult.manifestJson,
        manifest_hash: manifestResult.manifestHash,
        merkle_root: manifestResult.merkleRoot,
        checklist_completeness: Number(manifestResult.completenessPct),
        status: 'submitted',
        created_by: auth.userId,
      })
      .select('*')
      .single();

    if (manifestInsertErr || !manifestRecord) {
      throw new Error(`Failed to persist evidence manifest: ${manifestInsertErr?.message}`);
    }

    // 6. Transition Property Canonical State
    await adminDb
      .from('properties')
      .update({
        status: 'submitted',
        verification_status: 'submitted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', propertyId);

    // 7. Audit Logging
    await appendAuditLog({
      actorUserId: auth.userId,
      actorWallet: auth.profile.walletAddress || null,
      action: 'EVIDENCE_MANIFEST_SUBMITTED',
      resourceType: 'evidence_manifests',
      resourceId: manifestRecord.id,
      reason: `Submitted Manifest v${nextVersion} (Root: ${manifestResult.merkleRoot}, Completeness: ${manifestResult.completenessPct}%)`,
    });

    return NextResponse.json({
      success: true,
      manifest: manifestRecord,
      merkleRoot: manifestResult.merkleRoot,
      manifestHash: manifestResult.manifestHash,
      version: nextVersion,
    });
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode || 500;
    return NextResponse.json(
      {
        error: (err as { code?: string }).code || 'SUBMIT_FAILED',
        message: (err as Error).message,
      },
      { status }
    );
  }
}
