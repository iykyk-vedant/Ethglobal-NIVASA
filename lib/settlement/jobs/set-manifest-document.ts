import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import { SdkAtsAdapter } from '@/lib/hedera/ats-adapter';

export interface SetManifestDocumentPayload {
  offeringId: string;
}

export async function processSetManifestDocument(payload: SetManifestDocumentPayload) {
  const admin = getAdminDbClient();
  const { offeringId } = payload;

  // 1. Fetch Offering
  const { data: offering, error: offErr } = await admin
    .from('offerings')
    .select('*')
    .eq('id', offeringId)
    .single();

  if (offErr || !offering) {
    throw new Error(`Offering ${offeringId} not found`);
  }

  // 2. Fetch active approved Manifest for the offering's property
  const { data: manifest, error: manErr } = await admin
    .from('evidence_manifests')
    .select('*')
    .eq('property_id', offering.property_id)
    .eq('status', 'approved')
    .order('version', { ascending: false })
    .limit(1)
    .single();

  if (manErr || !manifest) {
    throw new Error(`No approved manifest found for property ${offering.property_id}`);
  }

  // 3. Anchor evidence-manifest document on Hedera ATS Asset via AtsAdapter
  const adapter = new SdkAtsAdapter();
  const assetRef = offering.ats_asset_ref || 'PROPERTY-MH-001';
  const uri = `ipfs://nivasa-manifest-${manifest.id}-v${manifest.version}`;

  const txRef = await adapter.setDocument(assetRef, 'evidence-manifest', uri, manifest.merkle_root);

  if (txRef.status !== 'SUCCESS') {
    throw new Error(`ATS setDocument("evidence-manifest") failed with status: ${txRef.status}`);
  }

  // 4. Update offering and manifest records
  const now = new Date().toISOString();
  await Promise.all([
    admin
      .from('offerings')
      .update({
        manifest_doc_tx: txRef.txId,
        current_manifest_id: manifest.id,
        updated_at: now,
      })
      .eq('id', offeringId),
    admin
      .from('evidence_manifests')
      .update({
        onchain_doc_tx: txRef.txId,
        updated_at: now,
      })
      .eq('id', manifest.id),
  ]);

  // 5. Audit log
  await appendAuditLog({
    action: 'ats_document_anchored',
    resourceType: 'offering',
    resourceId: offeringId,
    afterHash: manifest.merkle_root,
    reason: JSON.stringify({
      documentName: 'evidence-manifest',
      manifestVersion: manifest.version,
      txId: txRef.txId,
      hashScanUrl: txRef.hashScanUrl,
    }),
  });

  return {
    success: true,
    txId: txRef.txId,
    hashScanUrl: txRef.hashScanUrl,
    merkleRoot: manifest.merkle_root,
  };
}

