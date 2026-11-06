import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import { enqueueOutboxJob } from '@/lib/settlement/outbox';
import { buildEvidenceManifest } from '@/lib/evidence/manifest';

export interface EvidenceDriftPayload {
  propertyId: string;
  trigger: 'T1' | 'T2' | 'T3' | 'T4' | 'T5' | string;
  manifestVersion: number;
  manifestId?: string;
  uploaderId?: string;
  documentId?: string;
  documentType?: string;
  reason?: string;
}

export async function processEvidenceDrift(payload: EvidenceDriftPayload) {
  const admin = getAdminDbClient();
  const { propertyId, trigger, manifestVersion, uploaderId, reason } = payload;
  const now = new Date().toISOString();

  // 1. Fetch current approved manifest
  const { data: currentApprovedManifest, error: manifestErr } = await admin
    .from('evidence_manifests')
    .select('*')
    .eq('property_id', propertyId)
    .in('status', ['approved', 'superseded-pending'])
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (manifestErr || !currentApprovedManifest) {
    return {
      success: false,
      action: 'skip',
      note: `No approved manifest found for property ${propertyId}`,
    };
  }

  const nextVersion = currentApprovedManifest.version + 1;

  // 2. Idempotency Check: check if manifest n+1 already exists (ARCH §12.4: same drift event processed twice -> ONE manifest version)
  let { data: existingNextManifest } = await admin
    .from('evidence_manifests')
    .select('*')
    .eq('property_id', propertyId)
    .eq('version', nextVersion)
    .maybeSingle();

  let targetManifest = existingNextManifest;

  if (!targetManifest) {
    // Fetch all active property documents to build canonical Manifest n+1
    const { data: documents } = await admin
      .from('property_documents')
      .select('*')
      .eq('property_id', propertyId)
      .eq('status', 'active');

    const manifestResult = buildEvidenceManifest(
      propertyId,
      nextVersion,
      documents || []
    );

    const { data: newManifest, error: insertErr } = await admin
      .from('evidence_manifests')
      .insert({
        property_id: propertyId,
        version: nextVersion,
        manifest_json: manifestResult.manifestJson,
        manifest_hash: manifestResult.manifestHash,
        merkle_root: manifestResult.merkleRoot,
        checklist_completeness: Number(manifestResult.completenessPct),
        status: 'submitted',
        created_by: uploaderId || currentApprovedManifest.created_by,
      })
      .select('*')
      .single();

    if (insertErr || !newManifest) {
      throw new Error(`Failed to create manifest v${nextVersion}: ${insertErr?.message}`);
    }

    targetManifest = newManifest;
  }

  // 3. Mark the current approved manifest 'superseded-pending' (ARCH §12.2 step 1)
  if (currentApprovedManifest.status === 'approved') {
    await admin
      .from('evidence_manifests')
      .update({
        status: 'superseded-pending',
        updated_at: now,
      })
      .eq('id', currentApprovedManifest.id);
  }

  // 4. Fail closed: transition active offering(s) from 'active' -> 'paused_evidence_drift' (ARCH §12.2 step 2)
  const { data: offerings } = await admin
    .from('offerings')
    .select('*')
    .eq('property_id', propertyId)
    .in('status', ['active', 'paused_evidence_drift']);

  const pausedOfferings: string[] = [];

  for (const offering of offerings || []) {
    if (offering.status === 'active') {
      await admin
        .from('offerings')
        .update({
          status: 'paused_evidence_drift',
          paused_reason: reason || `Evidence drift detected: ${trigger}`,
          drift_trigger: trigger,
          drift_manifest_id: targetManifest.id,
          drift_uploader_id: uploaderId || null,
          paused_evidence_drift_at: now,
          updated_at: now,
        })
        .eq('id', offering.id);

      pausedOfferings.push(offering.id);
    }

    // 5. Enqueue pause_asset outbox job (ARCH §12.2 step 3)
    const pauseDedupeKey = `pause_asset:${offering.id}:${targetManifest.id}`;
    await enqueueOutboxJob({
      jobType: 'pause_asset',
      dedupeKey: pauseDedupeKey,
      payload: {
        offeringId: offering.id,
        reason: `Evidence drift detected: ${trigger}`,
        oldManifestRoot: currentApprovedManifest.merkle_root,
        newManifestRoot: targetManifest.merkle_root,
        trigger,
      },
    });
  }

  // 6. Audit log entry with old and new manifest roots (ARCH §12.2 step 7)
  await appendAuditLog({
    actorUserId: uploaderId || null,
    actorWallet: 'system:drift_detector',
    action: 'evidence_drift_detected',
    resourceType: 'properties',
    resourceId: propertyId,
    reason: `Evidence drift detected under trigger ${trigger}. Manifest v${nextVersion} created as submitted. Previous approved manifest v${currentApprovedManifest.version} marked superseded-pending. Old Root: ${currentApprovedManifest.merkle_root}. New Root: ${targetManifest.merkle_root}. Offerings paused: ${pausedOfferings.join(', ') || 'none'}.`,
  });

  return {
    success: true,
    action: 'drift_handled',
    trigger,
    previousManifestVersion: currentApprovedManifest.version,
    newManifestVersion: nextVersion,
    newManifestId: targetManifest.id,
    oldMerkleRoot: currentApprovedManifest.merkle_root,
    newMerkleRoot: targetManifest.merkle_root,
    pausedOfferings,
  };
}
