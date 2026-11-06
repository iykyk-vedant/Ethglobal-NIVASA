import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import { SdkAtsAdapter } from '@/lib/hedera/ats-adapter';

export interface PauseAssetPayload {
  offeringId: string;
  reason?: string;
}

export async function processPauseAsset(payload: PauseAssetPayload) {
  const admin = getAdminDbClient();
  const { offeringId, reason } = payload;

  const { data: offering, error: offErr } = await admin
    .from('offerings')
    .select('*')
    .eq('id', offeringId)
    .single();

  if (offErr || !offering) {
    throw new Error(`Offering ${offeringId} not found`);
  }

  const adapter = new SdkAtsAdapter();
  const assetRef = offering.ats_asset_ref || 'PROPERTY-MH-001';

  // Pause ATS Diamond on Hedera Testnet
  const txRef = await adapter.pauseAsset(assetRef);
  if (txRef.status !== 'SUCCESS') {
    throw new Error(`ATS pauseAsset failed with status: ${txRef.status}`);
  }

  // Confirm pause on chain
  const isPaused = await adapter.isPaused(assetRef);
  if (!isPaused) {
    throw new Error('Asset pause verification failed: isPaused returned false after pause transaction.');
  }

  const now = new Date().toISOString();
  await admin
    .from('offerings')
    .update({
      status: 'paused',
      paused_reason: reason || 'Administrative pause',
      updated_at: now,
    })
    .eq('id', offeringId);

  await appendAuditLog({
    action: 'offering_paused_on_chain',
    resourceType: 'offering',
    resourceId: offeringId,
    reason: JSON.stringify({
      txId: txRef.txId,
      hashScanUrl: txRef.hashScanUrl,
      reason: reason || 'Administrative pause',
    }),
  });

  return {
    success: true,
    txId: txRef.txId,
    isPaused: true,
  };
}
