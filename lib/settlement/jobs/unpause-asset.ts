import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import { SdkAtsAdapter } from '@/lib/hedera/ats-adapter';
import { clearChainReadCache } from '@/lib/hedera/chain-reads';

export interface UnpauseAssetPayload {
  offeringId: string;
  reason?: string;
  oldManifestRoot?: string;
  newManifestRoot?: string;
}

export async function processUnpauseAsset(payload: UnpauseAssetPayload) {
  const admin = getAdminDbClient();
  const { offeringId, reason, oldManifestRoot, newManifestRoot } = payload;

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

  // 1. Unpause ATS Diamond on Hedera Testnet (ARCH §12.2 step 6)
  const txRef = await adapter.unpauseAsset();
  if (txRef.status !== 'SUCCESS') {
    throw new Error(`ATS unpauseAsset failed with status: ${txRef.status}`);
  }

  // Clear cache to ensure immediate fresh read-back
  clearChainReadCache(`paused:`);

  // 2. Read isPaused back from chain with retry for Mirror Node block ingestion
  let isPaused = true;
  for (let attempt = 0; attempt < 5; attempt++) {
    clearChainReadCache(`paused:`);
    isPaused = await adapter.isPaused(assetTarget);
    if (!isPaused) break;
    await new Promise((r) => setTimeout(r, 1200));
  }
  if (isPaused) {
    throw new Error('Asset unpause verification failed: isPaused still returned true after unpause transaction.');
  }

  // 3. Audit log entry with transaction ID and manifest roots
  await appendAuditLog({
    actorUserId: null,
    actorWallet: 'system:pauser',
    action: 'offering_unpaused_on_chain',
    resourceType: 'offering',
    resourceId: offeringId,
    reason: `ATS asset unpaused on Hedera Testnet. Tx: ${txRef.txId}. Reason: ${reason || 'Evidence re-approval resume'}. Old Root: ${oldManifestRoot || 'none'}. New Root: ${newManifestRoot || 'none'}. isPaused confirmed: false.`,
  });

  return {
    success: true,
    txId: txRef.txId,
    isPaused: false,
  };
}