import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import { enqueueOutboxJob } from '@/lib/settlement/outbox';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: offeringId } = await params;
    const auth = await requireAuth(req);
    const adminDb = getAdminDbClient();

    // 1. Fetch Offering Record
    const { data: offering, error: offErr } = await adminDb
      .from('offerings')
      .select('*')
      .eq('id', offeringId)
      .single();

    if (offErr || !offering) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Offering not found.' },
        { status: 404 }
      );
    }

    // 2. SEPARATION OF DUTIES INVARIANT (ARCH §12.2 step 5, §12.4 adversarial 12):
    // The resume approver MUST differ from the evidence uploader!
    // Checked BEFORE role check so uploader cannot bypass via any role or alias.
    if (offering.drift_uploader_id && offering.drift_uploader_id === auth.userId) {
      return NextResponse.json(
        {
          error: 'SOD_VIOLATION',
          message: 'Separation of duties violation: The evidence uploader is strictly forbidden from resuming the offering.',
        },
        { status: 403 }
      );
    }

    // 3. Role Verification: Verifier or Admin ONLY (ARCH §12.2 step 5, §19)
    const isVerifier = auth.roles.includes('verifier');
    const isAdmin = auth.roles.includes('admin');
    if (!isVerifier && !isAdmin) {
      return NextResponse.json(
        {
          error: 'FORBIDDEN',
          message: 'Access denied: Only independent verifiers or administrators can resume an offering.',
        },
        { status: 403 }
      );
    }

    // 4. Status Invariant: Can only resume from paused_evidence_drift or paused (ARCH §9.3)
    if (!['paused_evidence_drift', 'paused'].includes(offering.status)) {
      return NextResponse.json(
        {
          error: 'INVALID_OFFERING_STATE',
          message: `Cannot resume offering in "${offering.status}" status. Offering must be paused_evidence_drift or paused.`,
        },
        { status: 400 }
      );
    }

    // 5. Fetch Current Approved Manifest (requires approved manifest to resume)
    const { data: approvedManifest, error: manErr } = await adminDb
      .from('evidence_manifests')
      .select('*')
      .eq('property_id', offering.property_id)
      .eq('status', 'approved')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (manErr || !approvedManifest) {
      return NextResponse.json(
        {
          error: 'MANIFEST_NOT_APPROVED',
          message: 'Cannot resume offering: No current approved evidence manifest exists for this property.',
        },
        { status: 400 }
      );
    }

    // 6. Secondary SoD check against manifest creator
    if (approvedManifest.created_by === auth.userId) {
      return NextResponse.json(
        {
          error: 'SOD_VIOLATION',
          message: 'Separation of duties violation: The evidence creator is strictly forbidden from resuming the offering.',
        },
        { status: 403 }
      );
    }

    // 6. ENQUEUE OUTBOX JOBS (ARCH §12.2 step 6, §14.3: ZERO inline chain calls)
    // Note on ATS v8 constraint: DocumentationFacet.setDocument has the onlyUnpaused modifier.
    // Therefore, unpause_asset must run prior to set_manifest_document.
    // Job 1: Unpause the ATS Diamond on Hedera Testnet using the Pauser key
    const job1 = await enqueueOutboxJob({
      jobType: 'unpause_asset',
      dedupeKey: `unpause_asset:${offeringId}:${approvedManifest.id}`,
      payload: {
        offeringId,
        reason: 'Evidence re-approval resume',
        newManifestRoot: approvedManifest.merkle_root,
      },
    });

    // Job 2: Anchor new approved Merkle root to ATS Diamond contract (now unpaused)
    const job2 = await enqueueOutboxJob({
      jobType: 'set_manifest_document',
      dedupeKey: `set_manifest_doc:${offeringId}:${approvedManifest.id}`,
      payload: {
        offeringId,
        manifestId: approvedManifest.id,
        merkleRoot: approvedManifest.merkle_root,
      },
    });

    // Job 3: Verify all activation conditions via on-chain read-back, confirming root matches AND isPaused === false
    const job3 = await enqueueOutboxJob({
      jobType: 'verify_activation',
      dedupeKey: `verify_activation:${offeringId}:${approvedManifest.id}`,
      payload: {
        offeringId,
      },
    });

    // 7. Tamper-Evident Audit Log Entry
    await appendAuditLog({
      actorUserId: auth.userId,
      actorWallet: auth.profile.walletAddress || null,
      action: 'OFFERING_RESUME_ENQUEUED',
      resourceType: 'offerings',
      resourceId: offeringId,
      reason: `Verifier requested offering resumption following Manifest v${approvedManifest.version} approval. Enqueued set_manifest_document (${job1.id}), unpause_asset (${job2.id}), verify_activation (${job3.id}). New Merkle root: ${approvedManifest.merkle_root}.`,
    });

    return NextResponse.json({
      success: true,
      message: 'Offering resumption initiated. On-chain anchoring, unpause, and activation verification enqueued.',
      offeringId,
      manifestVersion: approvedManifest.version,
      newMerkleRoot: approvedManifest.merkle_root,
      jobs: {
        setManifestJobId: job1.id,
        unpauseJobId: job2.id,
        verifyActivationJobId: job3.id,
      },
    });
  } catch (err: unknown) {
    const errorObj = err as { statusCode?: number; message?: string };
    const status =
      errorObj.statusCode ||
      (errorObj.message?.includes('Unauthorized')
        ? 401
        : errorObj.message?.includes('Access forbidden')
        ? 403
        : 500);

    return NextResponse.json(
      {
        error: 'OFFERING_RESUME_FAILED',
        message: (err as Error).message,
      },
      { status }
    );
  }
}
