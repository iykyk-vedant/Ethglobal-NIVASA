import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const verificationDecisionSchema = z.object({
  manifest_id: z.string().uuid('Invalid manifest ID'),
  decision: z.enum(['verified', 'rejected', 'needs_more_information']),
  reason: z.string().min(10, 'Substantive justification is required (minimum 10 characters)'),
  limitations: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: propertyId } = await params;
    const auth = await requireAuth(req);
    const adminDb = getAdminDbClient();

    // 1. Fetch Property Record
    const { data: property, error: propErr } = await adminDb
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .single();

    if (propErr || !property) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Property not found.' }, { status: 404 });
    }

    // 2. SEPARATION OF DUTIES INVARIANT (ARCH §10.5, §19): An issuer can NEVER verify their own submission!
    if (property.issuer_id === auth.userId) {
      return NextResponse.json(
        {
          error: 'SOD_VIOLATION',
          message: 'Separation of duties violation: An issuer cannot approve or verify their own property submission.',
        },
        { status: 403 }
      );
    }

    // 3. Check Verifier Role
    const isVerifier = auth.roles.includes('verifier');
    const isAdmin = auth.roles.includes('admin');
    if (!isVerifier && !isAdmin) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'Access denied: Only independent verifiers or administrators can record verification decisions.',
        },
        { status: 403 }
      );
    }

    // 3. Parse Decision Payload
    const body = await req.json();
    const parseResult = verificationDecisionSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Invalid verification decision parameters.',
          details: parseResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { manifest_id, decision, reason, limitations } = parseResult.data;

    // 4. Fetch Exact Manifest
    const { data: manifest, error: manifestErr } = await adminDb
      .from('evidence_manifests')
      .select('*')
      .eq('id', manifest_id)
      .eq('property_id', propertyId)
      .single();

    if (manifestErr || !manifest) {
      return NextResponse.json(
        {
          error: 'NOT_FOUND',
          message: `Evidence manifest ${manifest_id} not found for property ${propertyId}.`,
        },
        { status: 404 }
      );
    }

    // Separation of Duties (ARCH §10.5, §12.4): submitter or uploader cannot approve manifest
    if (manifest.created_by === auth.userId) {
      return NextResponse.json(
        {
          error: 'SOD_VIOLATION',
          message: 'Separation of duties violation: The submitter or evidence uploader cannot approve their own manifest version.',
        },
        { status: 403 }
      );
    }

    // Invariant: An already approved manifest is immutable and cannot be re-verified or mutated
    if (manifest.status === 'approved') {
      return NextResponse.json(
        {
          error: 'MANIFEST_ALREADY_APPROVED',
          message: 'This evidence manifest version is already approved and immutable. Further decisions require a new manifest version.',
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // 5. Update Manifest Status
    if (decision === 'verified') {
      // Supersede any previously approved or superseded-pending manifests for this property
      await adminDb
        .from('evidence_manifests')
        .update({ status: 'superseded', updated_at: now })
        .eq('property_id', propertyId)
        .in('status', ['approved', 'superseded-pending']);

      // Approve this exact manifest version
      await adminDb
        .from('evidence_manifests')
        .update({
          status: 'approved',
          approved_by: auth.userId,
          approved_at: now,
          updated_at: now,
        })
        .eq('id', manifest_id);

      // Transition property to verified
      await adminDb
        .from('properties')
        .update({
          status: 'verified',
          verification_status: 'verified',
          updated_at: now,
        })
        .eq('id', propertyId);
    } else if (decision === 'rejected') {
      await adminDb
        .from('evidence_manifests')
        .update({ status: 'rejected', updated_at: now })
        .eq('id', manifest_id);

      await adminDb
        .from('properties')
        .update({
          status: 'rejected',
          verification_status: 'rejected',
          updated_at: now,
        })
        .eq('id', propertyId);
    } else if (decision === 'needs_more_information') {
      await adminDb
        .from('properties')
        .update({
          status: 'needs_more_information',
          verification_status: 'needs_more_information',
          updated_at: now,
        })
        .eq('id', propertyId);
    }

    // 6. Record Append-only Verification Decision
    const { data: verificationRecord, error: verifInsertErr } = await adminDb
      .from('property_verifications')
      .insert({
        property_id: propertyId,
        manifest_id: manifest_id,
        review_stage: 'initial',
        decision: decision,
        reviewer_id: auth.userId,
        limitations: limitations || null,
        evidence_summary: {
          reason,
          manifest_version: manifest.version,
          manifest_hash: manifest.manifest_hash,
          merkle_root: manifest.merkle_root,
          checklist_completeness: manifest.checklist_completeness,
        },
        policy_version: 'v1.0',
        decided_at: now,
      })
      .select('*')
      .single();

    if (verifInsertErr || !verificationRecord) {
      throw new Error(`Failed to record verification decision: ${verifInsertErr?.message}`);
    }

    // 7. Cryptographic Audit Log
    await appendAuditLog({
      actorUserId: auth.userId,
      actorWallet: auth.profile.walletAddress || null,
      action: 'PROPERTY_VERIFICATION_DECIDED',
      resourceType: 'property_verifications',
      resourceId: verificationRecord.id,
      reason: `Verifier recorded "${decision}" on Manifest v${manifest.version} (Root: ${manifest.merkle_root}): ${reason}`,
    });

    return NextResponse.json({
      success: true,
      decision,
      verification: verificationRecord,
      manifestId: manifest_id,
      merkleRoot: manifest.merkle_root,
      manifestHash: manifest.manifest_hash,
    });
  } catch (err: unknown) {
    console.error('[VERIFICATION_POST_ERROR]', err);
    const status = (err as { statusCode?: number }).statusCode || 500;
    return NextResponse.json(
      {
        error: (err as { code?: string }).code || 'VERIFICATION_ERROR',
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

    const { data: verifications, error } = await adminDb
      .from('property_verifications')
      .select('*')
      .eq('property_id', propertyId)
      .order('decided_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      verifications: verifications || [],
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
