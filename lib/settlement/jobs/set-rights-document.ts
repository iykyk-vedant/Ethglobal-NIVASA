import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import { SdkAtsAdapter } from '@/lib/hedera/ats-adapter';

export interface SetRightsDocumentPayload {
  offeringId: string;
}

export async function processSetRightsDocument(payload: SetRightsDocumentPayload) {
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

  // 2. Fetch current Rights record
  const { data: rights, error: rightsErr } = await admin
    .from('offering_rights')
    .select('*')
    .eq('offering_id', offeringId)
    .eq('version', offering.current_rights_version)
    .single();

  if (rightsErr || !rights) {
    throw new Error(`Rights version ${offering.current_rights_version} not found for offering ${offeringId}`);
  }

  // 3. Anchor rights document on Hedera ATS Asset via AtsAdapter
  const adapter = new SdkAtsAdapter();
  const assetRef = offering.ats_asset_ref || 'PROPERTY-MH-001';
  const uri = `ipfs://nivasa-rights-${offering.id}-v${rights.version}`;

  const txRef = await adapter.setDocument(assetRef, 'rights', uri, rights.rights_document_hash);

  if (txRef.status !== 'SUCCESS') {
    throw new Error(`ATS setDocument("rights") failed with status: ${txRef.status}`);
  }

  // 4. Record txId on offerings table
  await admin
    .from('offerings')
    .update({
      rights_doc_tx: txRef.txId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', offeringId);

  // 5. Audit log
  await appendAuditLog({
    action: 'ats_document_anchored',
    resourceType: 'offering',
    resourceId: offeringId,
    afterHash: rights.rights_document_hash,
    reason: JSON.stringify({
      documentName: 'rights',
      version: rights.version,
      txId: txRef.txId,
      hashScanUrl: txRef.hashScanUrl,
    }),
  });

  return {
    success: true,
    txId: txRef.txId,
    hashScanUrl: txRef.hashScanUrl,
    documentHash: rights.rights_document_hash,
  };
}
