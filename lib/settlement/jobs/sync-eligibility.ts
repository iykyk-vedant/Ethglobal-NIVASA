/**
 * NIVASA - Outbox Job: sync_eligibility
 * ARCH §14.4 · PRD FR-6.1 · PLAN M4.6
 *
 * Synchronizes investor eligibility state onto the Hedera ATS Diamond contract.
 * Idempotent: checks on-chain status before submitting to prevent duplicate transactions.
 * Uses Compliance role key strictly server-side.
 */

import { getAdminDbClient, appendAuditLog } from '../../db/admin';
import { getAtsAdapter } from '../../hedera/ats-adapter';
import { readKycStatus } from '../../hedera/chain-reads';

export interface SyncEligibilityPayload {
  eligibilityId?: string;
  userId: string;
  action?: 'register' | 'revoke';
  wallet?: string;
  validUntil?: string;
}

export async function processSyncEligibility(
  payload: SyncEligibilityPayload
): Promise<{ success: boolean; action: string; txId?: string; note?: string }> {
  const admin = getAdminDbClient();
  const atsAdapter = getAtsAdapter();
  const action = payload.action || 'register';

  if (action === 'revoke') {
    // 1. Revocation flow
    let targetWallet = payload.wallet;
    if (!targetWallet) {
      const { data: profile } = await admin
        .from('profiles')
        .select('wallet_address')
        .eq('id', payload.userId)
        .single();
      targetWallet = profile?.wallet_address;
    }

    if (!targetWallet) {
      return { success: true, action: 'revoke', note: 'No wallet to revoke for user' };
    }

    // Check if already revoked or not registered on-chain
    const chainKyc = await readKycStatus(targetWallet);
    if (chainKyc.data === 0 || chainKyc.data === 2) {
      if (payload.eligibilityId) {
        await admin
          .from('investor_eligibility')
          .update({ chain_status: 'revoked', updated_at: new Date().toISOString() })
          .eq('id', payload.eligibilityId);
      }
      return { success: true, action: 'revoke', note: 'Already revoked or unmapped on-chain' };
    }

    // Submit revocation to Hedera ATS using Compliance key
    const txRef = await atsAdapter.revokeInvestor(targetWallet);

    if (payload.eligibilityId) {
      await admin
        .from('investor_eligibility')
        .update({
          chain_status: 'revoked',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.eligibilityId);
    }

    await appendAuditLog({
      actorUserId: null,
      actorWallet: 'system:worker',
      action: 'eligibility_chain_revoked',
      resourceType: 'investor_eligibility',
      resourceId: payload.eligibilityId || payload.userId,
      reason: `Revoked KYC on Hedera Testnet for wallet ${targetWallet}`,
    });

    return { success: true, action: 'revoke', txId: txRef.txId };
  }

  // 2. Registration flow
  // Fetch eligibility record
  let eligibilityRecord;
  if (payload.eligibilityId) {
    const { data } = await admin
      .from('investor_eligibility')
      .select('*')
      .eq('id', payload.eligibilityId)
      .single();
    eligibilityRecord = data;
  } else {
    const { data } = await admin
      .from('investor_eligibility')
      .select('*')
      .eq('user_id', payload.userId)
      .eq('status', 'eligible')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    eligibilityRecord = data;
  }

  if (!eligibilityRecord) {
    throw new Error(`[SYNC_ELIGIBILITY] Eligibility record not found for user ${payload.userId}`);
  }

  if (eligibilityRecord.status !== 'eligible') {
    return {
      success: true,
      action: 'skip',
      note: `Eligibility status is "${eligibilityRecord.status}", registration skipped`,
    };
  }

  // Fetch verified wallet
  let wallet = payload.wallet;
  if (!wallet) {
    const { data: profile } = await admin
      .from('profiles')
      .select('wallet_address, wallet_verified_at')
      .eq('id', payload.userId)
      .single();

    if (!profile?.wallet_address || !profile.wallet_verified_at) {
      throw new Error(`[SYNC_ELIGIBILITY] User ${payload.userId} has no verified bound wallet.`);
    }
    wallet = profile.wallet_address;
  }

  if (!wallet) {
    throw new Error(`[SYNC_ELIGIBILITY] No wallet found for user ${payload.userId}`);
  }

  const validUntil = payload.validUntil
    ? new Date(payload.validUntil)
    : eligibilityRecord.valid_until
    ? new Date(eligibilityRecord.valid_until)
    : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1-year default

  // Check on-chain KYC status idempotently
  const onChainKyc = await readKycStatus(wallet);
  if (onChainKyc.data === 1) {
    // Already registered on-chain
    await admin
      .from('investor_eligibility')
      .update({
        chain_status: 'registered',
        updated_at: new Date().toISOString(),
      })
      .eq('id', eligibilityRecord.id);

    return {
      success: true,
      action: 'register',
      note: 'Already registered on-chain (idempotent)',
    };
  }

  // Submit on-chain KYC grant via ATS adapter
  const txRef = await atsAdapter.registerInvestor(wallet, validUntil);

  if (txRef.status !== 'SUCCESS') {
    throw new Error(`[SYNC_ELIGIBILITY] ATS registration transaction failed: ${txRef.txId}`);
  }

  // Update DB state to confirmed registered
  await admin
    .from('investor_eligibility')
    .update({
      chain_status: 'registered',
      updated_at: new Date().toISOString(),
    })
    .eq('id', eligibilityRecord.id);

  // Append tamper-evident audit record
  await appendAuditLog({
    actorUserId: null,
    actorWallet: 'system:worker',
    action: 'eligibility_chain_registered',
    resourceType: 'investor_eligibility',
    resourceId: eligibilityRecord.id,
    reason: `Registered KYC on Hedera Testnet for wallet ${wallet}`,
  });

  return { success: true, action: 'register', txId: txRef.txId };
}
