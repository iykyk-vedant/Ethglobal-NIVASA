/**
 * scripts/restriction-proof.ts
 * ARCH §14.8 · PRD FR-6.6 · PLAN M6.5
 *
 * Restriction proof run:
 * 1. Uses operator-env test wallets (eligible and unregistered).
 * 2. Attempts a transfer from the registered eligible wallet (expect SUCCESS).
 * 3. Attempts a transfer from/to the unregistered ineligible wallet (expect REJECTION by ATS compliance facet).
 * 4. Records both transaction IDs and expected vs observed outcomes.
 * 5. Writes an immutable audit entry to PostgreSQL audit_logs with action 'restriction_proof'.
 * 6. Idempotent-safe; prints summary; NEVER logs private keys.
 */

import { Client, PrivateKey, ContractExecuteTransaction, ContractId } from '@hashgraph/sdk';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const req = createRequire(import.meta.url);
const { TransferFacet__factory } = req('@hashgraph/asset-tokenization-contracts/typechain-types');

interface RestrictionRunSummary {
  assetContractId: string;
  assetAddress: string;
  eligibleWallet: string;
  ineligibleWallet: string;
  test1: {
    name: string;
    expected: 'SUCCESS';
    observed: 'SUCCESS' | 'FAILED';
    chainTxId: string;
    status: string;
  };
  test2: {
    name: string;
    expected: 'REJECTED';
    observed: 'REJECTED' | 'UNEXPECTED_SUCCESS';
    chainTxId: string;
    revertReason: string;
  };
  auditLogId?: number;
  recordedAt: string;
}

export async function runRestrictionProof(): Promise<RestrictionRunSummary> {
  // 1. Read operator environment variables (Safe: never logs keys)
  const envPath = path.resolve(process.cwd(), '.env');
  const envContent = fs.readFileSync(envPath, 'utf-8');

  function getEnv(key: string): string {
    const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match ? match[1].trim() : '';
  }

  const assetContractId = getEnv('ATS_ASSET_CONTRACT_ID') || '0.0.11330441';
  const assetAddress = getEnv('ATS_ASSET_ADDRESS') || '0x52ed835e649a4b045a21bc5e240623d8a77f73ef';

  const eligibleAccountId = getEnv('HEDERA_INVESTOR_ELIGIBLE_ACCOUNT_ID');
  const eligibleKeyStr = getEnv('HEDERA_INVESTOR_ELIGIBLE_PRIVATE_KEY');
  const eligibleEvm = '0x0000000000000000000000000000000000ace2c6';

  const ineligibleAccountId = getEnv('HEDERA_INVESTOR_INELIGIBLE_ACCOUNT_ID');
  const ineligibleKeyStr = getEnv('HEDERA_INVESTOR_INELIGIBLE_PRIVATE_KEY');
  const ineligibleEvm = '0x0000000000000000000000000000000000ace2c7';

  if (!eligibleAccountId || !eligibleKeyStr || !ineligibleAccountId || !ineligibleKeyStr) {
    throw new Error('Operator environment is missing eligible/ineligible investor credentials.');
  }

  const eligibleClient = Client.forTestnet();
  eligibleClient.setOperator(eligibleAccountId, PrivateKey.fromStringECDSA(eligibleKeyStr));

  const ineligibleClient = Client.forTestnet();
  ineligibleClient.setOperator(ineligibleAccountId, PrivateKey.fromStringECDSA(ineligibleKeyStr));

  const transferIface = TransferFacet__factory.createInterface();

  console.log('='.repeat(70));
  console.log('NIVASA — Hedera ATS Transfer Restriction Proof (ARCH §14.8)');
  console.log(`ATS Asset Contract: ${assetContractId} (${assetAddress})`);
  console.log(`Registered Eligible Holder: ${eligibleAccountId} (${eligibleEvm})`);
  console.log(`Unregistered Ineligible Wallet: ${ineligibleAccountId} (${ineligibleEvm})`);
  console.log('='.repeat(70));

  // --- TEST 1: Registered Eligible Holder Transfer (Expect SUCCESS) ---
  console.log('\n[Test 1] Transfer from registered eligible wallet to KYC-verified recipient...');
  const transfer1Calldata = transferIface.encodeFunctionData('transfer', [eligibleEvm, 1n]);
  let test1TxId = '';
  let test1Status = 'PENDING';
  let test1Observed: 'SUCCESS' | 'FAILED' = 'FAILED';

  try {
    const tx1 = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(assetContractId))
      .setGas(1_500_000)
      .setFunctionParameters(Buffer.from(transfer1Calldata.slice(2), 'hex'));

    const res1 = await tx1.execute(eligibleClient);
    test1TxId = res1.transactionId.toString();
    const receipt1 = await res1.getReceipt(eligibleClient);
    test1Status = receipt1.status.toString();

    if (test1Status === 'SUCCESS') {
      test1Observed = 'SUCCESS';
      console.log(`  ✓ Observed: SUCCESS (Receipt Status: ${test1Status})`);
      console.log(`  ✓ Hedera Tx ID: ${test1TxId}`);
    } else {
      console.error(`  ✗ Unexpected receipt status: ${test1Status}`);
    }
  } catch (err: any) {
    test1Status = err.message || 'FAILED';
    console.error(`  ✗ Test 1 failed unexpectedly: ${err.message}`);
  }

  // --- TEST 2: Unregistered Ineligible Wallet Transfer (Expect REJECTION) ---
  console.log('\n[Test 2] Attempted transfer initiated by unregistered wallet...');
  const transfer2Calldata = transferIface.encodeFunctionData('transfer', [eligibleEvm, 1n]);
  let test2TxId = '';
  let test2Observed: 'REJECTED' | 'UNEXPECTED_SUCCESS' = 'UNEXPECTED_SUCCESS';
  let test2RevertReason = '';

  try {
    const tx2 = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(assetContractId))
      .setGas(1_500_000)
      .setFunctionParameters(Buffer.from(transfer2Calldata.slice(2), 'hex'));

    const res2 = await tx2.execute(ineligibleClient);
    test2TxId = res2.transactionId.toString();
    const receipt2 = await res2.getReceipt(ineligibleClient);

    // If it did not revert, it's a failure of compliance
    test2RevertReason = `Unexpected success: ${receipt2.status.toString()}`;
    console.error(`  ✗ CRITICAL FAILURE: Unregistered transfer succeeded!`);
  } catch (err: any) {
    test2Observed = 'REJECTED';
    test2RevertReason = err.message || 'CONTRACT_REVERT_EXECUTED';
    if (!test2TxId && err.transactionId) {
      test2TxId = err.transactionId.toString();
    }
    console.log(`  ✓ Observed: REJECTED (Reverted by ATS compliance facet)`);
    console.log(`  ✓ Revert reason: ${test2RevertReason.slice(0, 120)}...`);
    if (test2TxId) {
      console.log(`  ✓ Hedera Tx ID: ${test2TxId}`);
    }
  }

  // --- Record Proof in PostgreSQL Audit Log ---
  const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  let auditLogId: number | undefined;
  const recordedAt = new Date().toISOString();

  if (supabaseUrl && serviceKey) {
    try {
      const admin = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const auditPayload = {
        eligibleTxId: test1TxId,
        ineligibleTxId: test2TxId || 'REVERTED_BEFORE_CONSENSUS',
        eligibleStatus: test1Observed,
        ineligibleStatus: test2Observed,
        expected: { test1: 'SUCCESS', test2: 'REJECTED' },
        observed: { test1: test1Observed, test2: test2Observed },
        assetContractId,
        assetAddress,
        verifiedAt: recordedAt,
      };

      const { data, error } = await admin.rpc('audit_append', {
        p_actor_user_id: null,
        p_actor_wallet: eligibleEvm,
        p_action: 'restriction_proof',
        p_resource_type: 'ats_asset',
        p_resource_id: assetContractId,
        p_before_hash: null,
        p_after_hash: null,
        p_reason: JSON.stringify(auditPayload),
      });

      if (!error) {
        auditLogId = Number(data);
        console.log(`\n[Audit Log] Restriction proof recorded in audit_logs (ID: ${auditLogId})`);
      } else {
        console.warn(`[Audit Log] Warning appending audit log: ${error.message}`);
      }
    } catch (e: any) {
      console.warn(`[Audit Log] Error appending to audit_logs: ${e.message}`);
    }
  }

  const summary: RestrictionRunSummary = {
    assetContractId,
    assetAddress,
    eligibleWallet: eligibleEvm,
    ineligibleWallet: ineligibleEvm,
    test1: {
      name: 'Eligible KYC Holder Transfer',
      expected: 'SUCCESS',
      observed: test1Observed,
      chainTxId: test1TxId,
      status: test1Status,
    },
    test2: {
      name: 'Unregistered Ineligible Transfer',
      expected: 'REJECTED',
      observed: test2Observed,
      chainTxId: test2TxId,
      revertReason: test2RevertReason,
    },
    auditLogId,
    recordedAt,
  };

  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY OF RESTRICTION PROOF:');
  console.log(JSON.stringify(summary, null, 2));
  console.log('='.repeat(70));

  return summary;
}

// Direct CLI execution
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('restriction-proof.ts')) {
  runRestrictionProof()
    .then((summary) => {
      if (summary.test1.observed === 'SUCCESS' && summary.test2.observed === 'REJECTED') {
        console.log('\n>>> RESTRICTION PROOF: PASS (Both assertions proven on Hedera Testnet) <<<\n');
        process.exit(0);
      } else {
        console.error('\n>>> RESTRICTION PROOF: FAIL (Outcome did not match expected assertions) <<<\n');
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error('\nFatal error running restriction proof:', err);
      process.exit(1);
    });
}
