import { getAdminDbClient, appendAuditLog } from '@/lib/db/admin';
import { readDocument, readTokenSupply, readPauseState, clearChainReadCache } from '@/lib/hedera/chain-reads';

export interface VerifyActivationPayload {
  offeringId: string;
}

export interface ActivationCheckResult {
  conditionId: number;
  name: string;
  description: string;
  status: 'PASS' | 'FAIL';
  expected?: string;
  actual?: string;
  details?: string;
}

export interface ActivationGateReport {
  checkedAt: string;
  allPassed: boolean;
  checks: ActivationCheckResult[];
}

function normalizeHash(h?: string | null): string {
  if (!h) return '';
  const clean = h.trim().toLowerCase();
  return clean.startsWith('0x') ? clean : `0x${clean}`;
}

export async function processVerifyActivation(payload: VerifyActivationPayload): Promise<ActivationGateReport> {
  const admin = getAdminDbClient();
  const { offeringId } = payload;
  const checkedAt = new Date().toISOString();

  // 1. Fetch Offering
  const { data: offering, error: offErr } = await admin
    .from('offerings')
    .select('*')
    .eq('id', offeringId)
    .single();

  if (offErr || !offering) {
    throw new Error(`Offering ${offeringId} not found`);
  }

  // 2. Fetch Property
  const { data: property } = await admin
    .from('properties')
    .select('*')
    .eq('id', offering.property_id)
    .maybeSingle();

  // 3. Fetch latest Approved Manifest
  const { data: manifest } = await admin
    .from('evidence_manifests')
    .select('*')
    .eq('property_id', offering.property_id)
    .eq('status', 'approved')
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 4. Fetch current Rights record
  const { data: rights } = await admin
    .from('offering_rights')
    .select('*')
    .eq('offering_id', offeringId)
    .eq('version', offering.current_rights_version)
    .maybeSingle();

  // 5. Read back ATS Asset State, Documents & Pause State from Hedera Testnet
  const assetTarget = offering.token_evm_address || offering.token_contract_id;
  clearChainReadCache();

  let [supplyResult, chainRightsResult, chainManifestResult, pauseResult] = await Promise.all([
    readTokenSupply(assetTarget),
    readDocument('rights', assetTarget),
    readDocument('evidence-manifest', assetTarget),
    readPauseState(assetTarget),
  ]);

  // Mirror Node block indexing retry loop: up to 5 attempts (1s interval) if expected manifest root or pause state is pending
  const expectedManifestRoot = normalizeHash(manifest?.merkle_root);
  for (let attempt = 0; attempt < 5; attempt++) {
    const actualManifestRoot = normalizeHash(chainManifestResult.data?.hash);
    const manifestMatched = actualManifestRoot === expectedManifestRoot;
    const pauseMatched = pauseResult.status === 'CONFIRMED' && pauseResult.data === false;

    if (manifestMatched && pauseMatched) {
      break;
    }

    await new Promise((r) => setTimeout(r, 1200));
    clearChainReadCache();
    [supplyResult, chainRightsResult, chainManifestResult, pauseResult] = await Promise.all([
      readTokenSupply(assetTarget),
      readDocument('rights', assetTarget),
      readDocument('evidence-manifest', assetTarget),
      readPauseState(assetTarget),
    ]);
  }

  const checks: ActivationCheckResult[] = [];

  // Condition 1: Property is verified and has a current approved manifest (ARCH §11.2.1)
  const c1Passed = Boolean(property?.status === 'verified' && manifest?.status === 'approved');
  checks.push({
    conditionId: 1,
    name: 'Property Verified & Approved Manifest',
    description: 'Property must have status "verified" and an approved evidence manifest.',
    status: c1Passed ? 'PASS' : 'FAIL',
    expected: 'property=verified, manifest=approved',
    actual: `property=${property?.status || 'none'}, manifest=${manifest?.status || 'none'}`,
    details: c1Passed
      ? `Property verified. Manifest v${manifest?.version} approved.`
      : 'Property verification or approved manifest requirement missing.',
  });

  // Condition 2: Rights version exists with stored document hash (ARCH §11.2.2)
  const c2Passed = Boolean(rights && rights.rights_document_hash);
  checks.push({
    conditionId: 2,
    name: 'Rights Version & Stored Hash',
    description: 'Versioned rights document must exist with a cryptographic hash.',
    status: c2Passed ? 'PASS' : 'FAIL',
    expected: 'rights_version > 0 and rights_document_hash != null',
    actual: `version=${rights?.version ?? 'none'}, hash=${rights?.rights_document_hash ?? 'none'}`,
    details: c2Passed
      ? `Rights v${rights?.version} stored with hash ${rights?.rights_document_hash?.slice(0, 14)}...`
      : 'No valid rights document version found.',
  });

  // Condition 3: ATS asset exists with cap, KYC and transfer restrictions (ARCH §11.2.3)
  const c3Passed = supplyResult.status === 'CONFIRMED' && (supplyResult.data?.maxSupply ?? 0n) > 0n;
  checks.push({
    conditionId: 3,
    name: 'ATS Asset Cap & Restrictions',
    description: 'ATS token must be active on Hedera with verified max supply cap.',
    status: c3Passed ? 'PASS' : 'FAIL',
    expected: 'maxSupply > 0 on Hedera ATS Asset',
    actual: supplyResult.status === 'CONFIRMED'
      ? `maxSupply=${supplyResult.data?.maxSupply?.toString()} units`
      : `Mirror Node status=${supplyResult.status}: ${supplyResult.error || 'unreachable'}`,
    details: c3Passed
      ? `ATS Asset verified on Testnet with cap ${supplyResult.data?.maxSupply?.toString()} units.`
      : 'ATS asset cap could not be confirmed on chain.',
  });

  // Condition 4: ATS asset holds document "rights" == rights version hash (ARCH §11.2.4)
  const expectedRightsHash = normalizeHash(rights?.rights_document_hash);
  const actualRightsHash = normalizeHash(chainRightsResult.data?.hash);
  const c4Passed =
    chainRightsResult.status === 'CONFIRMED' &&
    expectedRightsHash.length > 2 &&
    expectedRightsHash === actualRightsHash;

  checks.push({
    conditionId: 4,
    name: 'On-Chain Rights Document Hash Read-Back',
    description: 'Hedera ATS asset must hold document "rights" matching DB rights hash.',
    status: c4Passed ? 'PASS' : 'FAIL',
    expected: expectedRightsHash || '(not set)',
    actual: actualRightsHash || `Mirror Node: ${chainRightsResult.status}`,
    details: c4Passed
      ? `On-chain rights hash matched exactly (${actualRightsHash.slice(0, 14)}...).`
      : `Hash mismatch or document unreadable on chain (expected: ${expectedRightsHash}, actual: ${actualRightsHash}).`,
  });

  // Condition 5: ATS asset holds document "evidence-manifest" == approved manifest root (ARCH §11.2.5)
  const actualManifestRoot = normalizeHash(chainManifestResult.data?.hash);
  const c5Passed =
    chainManifestResult.status === 'CONFIRMED' &&
    expectedManifestRoot.length > 2 &&
    expectedManifestRoot === actualManifestRoot;

  checks.push({
    conditionId: 5,
    name: 'On-Chain Evidence Manifest Root Read-Back',
    description: 'Hedera ATS asset must hold document "evidence-manifest" matching approved Merkle root.',
    status: c5Passed ? 'PASS' : 'FAIL',
    expected: expectedManifestRoot || '(not set)',
    actual: actualManifestRoot || `Mirror Node: ${chainManifestResult.status}`,
    details: c5Passed
      ? `On-chain manifest root matched exactly (${actualManifestRoot.slice(0, 14)}...).`
      : `Root mismatch or document unreadable on chain (expected: ${expectedManifestRoot}, actual: ${actualManifestRoot}).`,
  });

  // Condition 6: Eligibility policy version is set (ARCH §11.2.6)
  const c6Passed = Boolean(offering.eligibility_policy_version && offering.eligibility_policy_version.trim().length > 0);
  checks.push({
    conditionId: 6,
    name: 'Eligibility Policy Version',
    description: 'Offering must configure a valid eligibility policy version.',
    status: c6Passed ? 'PASS' : 'FAIL',
    expected: 'non-empty string (e.g. v1.0)',
    actual: offering.eligibility_policy_version || '(empty)',
    details: c6Passed
      ? `Eligibility policy version set to "${offering.eligibility_policy_version}".`
      : 'Eligibility policy version is missing.',
  });

  // Condition 7: On-chain Asset Not Paused (ARCH §12.2 step 6)
  const c7Passed = pauseResult.status === 'CONFIRMED' && pauseResult.data === false;
  checks.push({
    conditionId: 7,
    name: 'On-Chain Asset Unpaused (isPaused=false)',
    description: 'ATS token on Hedera Testnet must be in unpaused state before issuance is active.',
    status: c7Passed ? 'PASS' : 'FAIL',
    expected: 'isPaused = false',
    actual: pauseResult.status === 'CONFIRMED' ? `isPaused=${pauseResult.data}` : `Mirror Node: ${pauseResult.status}`,
    details: c7Passed
      ? 'On-chain asset is confirmed unpaused.'
      : (pauseResult.data === true ? 'Asset is currently paused on Hedera (D2 evidence-drift or admin pause).' : 'Could not confirm pause state from Mirror Node.'),
  });

  const allPassed = checks.every((c) => c.status === 'PASS');
  const report: ActivationGateReport = {
    checkedAt,
    allPassed,
    checks,
  };

  // ARCH §11.2 & §12.2 Invariant:
  // ONLY the worker performs the transition to 'active' when all conditions pass.
  // If any check fails, offering remains in token_configured or paused_evidence_drift.
  if (allPassed) {
    const prevStatus = offering.status;
    await admin
      .from('offerings')
      .update({
        status: 'active',
        activation_checks: report as any,
        drift_trigger: null,
        paused_reason: null,
        updated_at: checkedAt,
      })
      .eq('id', offeringId);

    await appendAuditLog({
      action: prevStatus === 'paused_evidence_drift' ? 'offering_resumed' : 'offering_activated',
      resourceType: 'offering',
      resourceId: offeringId,
      beforeHash: prevStatus,
      afterHash: 'active',
      reason: JSON.stringify({
        checkedAt,
        rightsHash: actualRightsHash,
        manifestRoot: actualManifestRoot,
        isPaused: pauseResult.data,
      }),
    });
  } else {
    // Fail-closed: record which condition failed
    await admin
      .from('offerings')
      .update({
        activation_checks: report as any,
        updated_at: checkedAt,
      })
      .eq('id', offeringId);

    await appendAuditLog({
      action: 'activation_check_failed',
      resourceType: 'offering',
      resourceId: offeringId,
      reason: JSON.stringify({
        checkedAt,
        failingChecks: checks.filter((c) => c.status === 'FAIL'),
      }),
    });
  }

  return report;
}
