import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import { SdkAtsAdapter } from '@/lib/hedera/ats-adapter';
import { clearChainReadCache } from '@/lib/hedera/chain-reads';

export interface PauseAssetPayload {
  offeringId: string;
  reason?: string;
  oldManifestRoot?: string;
  newManifestRoot?: string;
  trigger?: string;
}

export async function processPauseAsset(payload: PauseAssetPayload) {
  const admin = getAdminDbClient();
  const { offeringId, reason, oldManifestRoot, newManifestRoot, trigger } = payload;

  const { data: offering, error: offErr } = await admin
    .from('offerings')
    .select('*')
    .eq('id', offeringId)
    .single();

  if (offErr || !offering) {
    throw new Error(`Offering ${offeringId} not found`);
  }

  const adapter = new SdkAtsAdapter();
  const assetTarget = offering.token_evm_address || offering.token_contract_id || undefined;

  // 1. Pause ATS Diamond on Hedera Testnet (ARCH §12.2 step 3)
  const txRef = await adapter.pauseAsset();
  if (txRef.status !== 'SUCCESS') {
    throw new Error(`ATS pauseAsset failed with status: ${txRef.status}`);
  }

  // Clear in-memory chain-read cache to guarantee fresh read-back
  clearChainReadCache(`paused:`);

  // 2. Read isPaused back from chain with brief retry for Mirror Node indexing
  let isPaused = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    clearChainReadCache(`paused:`);
    isPaused = await adapter.isPaused(assetTarget);
    if (isPaused) break;
    await new Promise((r) => setTimeout(r, 1000));
  }
  if (!isPaused) {
    throw new Error('Asset pause verification failed: isPaused returned false after pause transaction.');
  }

  const now = new Date().toISOString();
  const targetStatus = offering.status === 'paused_evidence_drift' || trigger
    ? 'paused_evidence_drift'
    : 'paused';

  await admin
    .from('offerings')
    .update({
      status: targetStatus,
      paused_reason: reason || (trigger ? `Evidence drift detected (${trigger})` : 'Administrative pause'),
      paused_evidence_drift_at: targetStatus === 'paused_evidence_drift' ? now : offering.paused_evidence_drift_at,
      drift_trigger: trigger || offering.drift_trigger,
      updated_at: now,
    })
    .eq('id', offeringId);

  // 3. Audit log with old/new manifest roots and Hedera transaction ID (ARCH §12.2 step 7)
  await appendAuditLog({
    actorUserId: null,
    actorWallet: 'system:pauser',
    action: 'offering_paused_on_chain',
    resourceType: 'offering',
    resourceId: offeringId,
    reason: `ATS asset paused on Hedera Testnet. Tx: ${txRef.txId}. Reason: ${reason || trigger || 'drift'}. Old Root: ${oldManifestRoot || offering.current_manifest_root || 'none'}. New Root: ${newManifestRoot || 'pending'}. isPaused confirmed: true.`,
  });

  return {
    success: true,
    txId: txRef.txId,
    isPaused: true,
    status: targetStatus,
    oldManifestRoot,
    newManifestRoot,
  };
}
