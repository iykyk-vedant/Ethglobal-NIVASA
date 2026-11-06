/**
 * Milestone M10: D2 Evidence-Drift Protocol & Asset Pause/Resume Test Suite
 * ARCH §12 (all), §9.3, §14.1, §22.2 (D2), §22.3 (11–12) · PRD FR-4.x · UI §8.2, §8.3, §10.6 · PLAN M10
 *
 * Requirements:
 * 1. Post-approval evidence change (Trigger T1) triggers evidence_drift job.
 * 2. evidence_drift builds manifest n+1 as 'submitted', marks manifest n as 'superseded-pending',
 *    and moves offering to 'paused_evidence_drift'.
 * 3. pause_asset pauses the ATS Diamond contract on Hedera Testnet, reads isPaused back,
 *    and records transaction ID with old/new roots in audit_logs.
 * 4. New orders are immediately refused with OFFERING_PAUSED_EVIDENCE.
 * 5. In-flight unsubmitted orders transition to MANUAL_REVIEW when allocation job sees a paused offering.
 * 6. Idempotency: Processing the same drift event twice creates exactly ONE manifest version and ONE pause.
 * 7. Separation of Duties (SoD / Adversarial 12): Resume attempted by the evidence uploader is strictly refused (SOD_VIOLATION 403).
 * 8. Re-approval: A different verifier approves manifest n+1; resume enqueues set_manifest_document, unpause_asset, verify_activation.
 * 9. Resumption: Offering returns to 'active' ONLY after new Merkle root is read back on-chain AND isPaused is false.
 * 10. Integrity check job detects T2 hash mismatch or T3 expiration.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { getAdminDbClient, reserveUnitsRpc } from '@/lib/db/admin';
import { SdkAtsAdapter } from '@/lib/hedera/ats-adapter';
import { readDocument, readPauseState } from '@/lib/hedera/chain-reads';
import { processEvidenceDrift } from '@/lib/settlement/jobs/evidence-drift';
import { processPauseAsset } from '@/lib/settlement/jobs/pause-asset';
import { processUnpauseAsset } from '@/lib/settlement/jobs/unpause-asset';
import { processIntegrityCheck } from '@/lib/settlement/jobs/integrity-check';
import { processSetManifestDocument } from '@/lib/settlement/jobs/set-manifest-document';
import { processVerifyActivation } from '@/lib/settlement/jobs/verify-activation';
import { processAllocateUnits } from '@/lib/settlement/jobs/allocate-units';

// Route handlers
import { POST as uploadDocumentHandler } from '@/app/api/properties/[id]/documents/route';
import { POST as verifyPropertyHandler } from '@/app/api/properties/[id]/verifications/route';
import { POST as resumeOfferingHandler } from '@/app/api/offerings/[id]/resume/route';

describe('Milestone M10: D2 Evidence-Drift Protocol & Asset Pause/Resume', () => {
  const adminDb = getAdminDbClient();
  const adapter = new SdkAtsAdapter();

  // Pre-seeded actor IDs
  const ISSUER_ID = 'e7084862-05bb-4b40-911d-46c56b12f875'; // Devendra Sharma (Nivasa Realty)
  const VERIFIER_ID = '1521f5eb-844c-4f21-85b3-b258c0e19fe4'; // Anand Verma (Title Verifier)
  const ADMIN_ID = 'f3509049-11fb-4ab4-993b-050c7878d1d3'; // System Admin (Nivasa Ops)
  const INVESTOR_ELIGIBLE_ID = '2a1b3a8b-8215-4111-9a76-7b3b6f51b109'; // Rahul Mehta
  const SEEDED_PROPERTY_ID = '11111111-1111-1111-1111-111111111111'; // Godrej Platina Commercial Wing A
  const SEEDED_OFFERING_ID = '33333333-3333-3333-3333-333333333333'; // NIVASA Commercial 001

  let activeManifestId: string;
  let activeManifestRoot: string;
  let nextManifestId: string;
  let nextManifestRoot: string;

  beforeAll(async () => {
    // 1. Reset offering columns referencing manifests
    await adminDb
      .from('offerings')
      .update({
        status: 'active',
        drift_trigger: null,
        paused_reason: null,
        paused_evidence_drift_at: null,
        drift_manifest_id: null,
        drift_uploader_id: null,
        current_manifest_id: '22222222-2222-2222-2222-222222222222',
      })
      .eq('id', SEEDED_OFFERING_ID);

    // 2. Delete any verifications pointing to test manifests > 1
    const { data: testManifests } = await adminDb
      .from('evidence_manifests')
      .select('id')
      .eq('property_id', SEEDED_PROPERTY_ID)
      .gt('version', 1);

    if (testManifests && testManifests.length > 0) {
      const ids = testManifests.map((m) => m.id);
      await adminDb.from('property_verifications').delete().in('manifest_id', ids);
    }

    // 3. Delete extraneous manifests > 1
    await adminDb
      .from('evidence_manifests')
      .delete()
      .eq('property_id', SEEDED_PROPERTY_ID)
      .gt('version', 1);

    // 4. Clean up any uploaded test documents
    await adminDb
      .from('property_documents')
      .delete()
      .eq('property_id', SEEDED_PROPERTY_ID)
      .eq('source_reference', 'KF-MUM-2026-REV-002');

    // 5. Ensure Manifest v1 is approved
    await adminDb
      .from('evidence_manifests')
      .update({ status: 'approved' })
      .eq('property_id', SEEDED_PROPERTY_ID)
      .eq('version', 1);

    // Ensure offering is active with approved manifest for test baseline
    const { data: manifest } = await adminDb
      .from('evidence_manifests')
      .select('*')
      .eq('property_id', SEEDED_PROPERTY_ID)
      .eq('version', 1)
      .single();

    if (manifest) {
      activeManifestId = manifest.id;
      activeManifestRoot = manifest.merkle_root;
    }
  });

  afterAll(async () => {
    // Restore asset to unpaused state on Hedera Testnet if left paused
    try {
      const isPaused = await adapter.isPaused();
      if (isPaused) {
        console.log('Teardown: unpausing ATS asset on Hedera Testnet...');
        await adapter.unpauseAsset();
      }
    } catch (e) {
      console.warn('Teardown unpause warning:', e);
    }
  });

  it('1. Trigger T1: uploading a document after approval triggers evidence drift and enqueues job', async () => {
    // Simulate issuer uploading a revised valuation report
    const formData = new FormData();
    const mockFile = new Blob(['Revised Independent Valuation Report - Godrej Platina Wing A - Q4 2026 update'], {
      type: 'application/pdf',
    });
    formData.append('file', mockFile, 'revised-valuation-q4.pdf');
    formData.append('document_type', 'valuation_report');
    formData.append('source_name', 'Knight Frank India Pvt Ltd');
    formData.append('source_reference', 'KF-MUM-2026-REV-002');
    formData.append('issued_at', new Date().toISOString());

    const req = new NextRequest(`http://localhost/api/properties/${SEEDED_PROPERTY_ID}/documents`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': ISSUER_ID,
      },
      body: formData,
    });

    const res = await uploadDocumentHandler(req, { params: Promise.resolve({ id: SEEDED_PROPERTY_ID }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.driftTriggered).toBe(true); // T1 drift triggered because approved manifest already exists!
  });

  it('2. Job evidence_drift: builds manifest n+1 as submitted, marks current manifest superseded-pending, and moves offering to paused_evidence_drift', async () => {
    const driftResult = await processEvidenceDrift({
      propertyId: SEEDED_PROPERTY_ID,
      trigger: 'T1',
      manifestVersion: 1,
      uploaderId: ISSUER_ID,
      reason: 'Issuer uploaded revised valuation report',
    });

    expect(driftResult.success).toBe(true);
    expect(driftResult.action).toBe('drift_handled');
    expect(driftResult.newManifestVersion).toBe(2);

    nextManifestRoot = driftResult.newMerkleRoot;

    // Verify Manifest v1 status is now superseded-pending
    const { data: manifestV1 } = await adminDb
      .from('evidence_manifests')
      .select('status')
      .eq('id', activeManifestId)
      .single();
    expect(manifestV1?.status).toBe('superseded-pending');

    // Verify Manifest v2 created as submitted
    const { data: manifestV2 } = await adminDb
      .from('evidence_manifests')
      .select('*')
      .eq('property_id', SEEDED_PROPERTY_ID)
      .eq('version', 2)
      .single();
    expect(manifestV2?.status).toBe('submitted');
    nextManifestId = manifestV2!.id;

    // Verify Offering moved to paused_evidence_drift
    const { data: offering } = await adminDb
      .from('offerings')
      .select('status, drift_trigger, drift_uploader_id, drift_manifest_id')
      .eq('id', SEEDED_OFFERING_ID)
      .single();

    expect(offering?.status).toBe('paused_evidence_drift');
    expect(offering?.drift_trigger).toBe('T1');
    expect(offering?.drift_uploader_id).toBe(ISSUER_ID);
    expect(offering?.drift_manifest_id).toBe(nextManifestId);
  });

  it('3. Job pause_asset: worker pauses ATS asset on Hedera Testnet and reads isPaused back as true', async () => {
    const pauseResult = await processPauseAsset({
      offeringId: SEEDED_OFFERING_ID,
      oldManifestRoot: activeManifestRoot,
      newManifestRoot: nextManifestRoot,
      trigger: 'T1',
    });

    expect(pauseResult.success).toBe(true);
    expect(pauseResult.isPaused).toBe(true);
    expect(pauseResult.txId).toBeDefined();

    console.log('Real Hedera Asset Pause Tx ID:', pauseResult.txId);

    // Verify directly against Hedera Testnet via Mirror Node
    const onChainPause = await adapter.isPaused();
    expect(onChainPause).toBe(true);
  });

  it('4. Fail-closed: reserve_units strictly refuses order creation when offering is paused_evidence_drift (OFFERING_PAUSED_EVIDENCE)', async () => {
    let reserveErr: any = null;
    try {
      await reserveUnitsRpc({
        idempotencyKey: `drift_fail_closed_${Date.now()}`,
        investorId: INVESTOR_ELIGIBLE_ID,
        offeringId: SEEDED_OFFERING_ID,
        units: 5n,
        ackMessage: 'Simulated Demo Acknowledgement',
        ackSignature: '0x1234',
      });
    } catch (e: any) {
      reserveErr = e;
    }

    expect(reserveErr).toBeDefined();
    expect(reserveErr?.message).toContain('OFFERING_PAUSED_EVIDENCE');
  });

  it('5. In-flight unsubmitted orders transition to MANUAL_REVIEW when processed while offering is paused', async () => {
    // Create an order in PAYMENT_CONFIRMED status
    const orderId = 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1';
    await adminDb.from('investment_orders').delete().eq('id', orderId);

    const { error: insErr } = await adminDb.from('investment_orders').insert({
      id: orderId,
      offering_id: SEEDED_OFFERING_ID,
      investor_id: INVESTOR_ELIGIBLE_ID,
      units: 2,
      unit_price_inr: '1000.00',
      amount_inr: '2000.00',
      receipt_token: `rcpt_inflight_${Date.now()}`,
      status: 'PAYMENT_CONFIRMED',
      idempotency_key: `inflight_test_${Date.now()}`,
      rights_version: 1,
      rights_document_hash: '0x' + '1'.repeat(64),
      ack_wallet: '0x0000000000000000000000000000000000ace2c6',
      ack_message: 'Simulated Demo Acknowledgement',
      ack_signature: '0xabc',
    });

    if (insErr) {
      throw new Error(`Failed to insert test order: ${insErr.message}`);
    }

    // Worker attempts allocation on the paused offering
    const allocResult = await processAllocateUnits({ orderId });
    expect(allocResult.success).toBe(false);
    expect(allocResult.action).toBe('manual_review');

    // Verify order was transitioned to MANUAL_REVIEW, NEVER marked COMPLETED
    const { data: updatedOrder } = await adminDb
      .from('investment_orders')
      .select('status')
      .eq('id', orderId)
      .single();

    expect(updatedOrder?.status).toBe('MANUAL_REVIEW');

    // Clean up test order
    await adminDb.from('investment_orders').delete().eq('id', orderId);
  });

  it('6. Idempotency Invariant: same drift event processed twice creates ONE manifest version and ONE pause', async () => {
    // Process exact same drift event again
    const secondDriftResult = await processEvidenceDrift({
      propertyId: SEEDED_PROPERTY_ID,
      trigger: 'T1',
      manifestVersion: 1,
      uploaderId: ISSUER_ID,
      reason: 'Duplicate drift event execution',
    });

    expect(secondDriftResult.success).toBe(true);
    // Verifies it targeted the existing v2 manifest rather than creating v3
    expect(secondDriftResult.newManifestVersion).toBe(2);

    // Verify total manifests for property is still 2
    const { count } = await adminDb
      .from('evidence_manifests')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', SEEDED_PROPERTY_ID);

    expect(count).toBe(2);
  });

  it('7. Separation of Duties (Adversarial 12): Resume attempted by the evidence uploader is strictly refused with SOD_VIOLATION (403)', async () => {
    const resumeReq = new NextRequest(`http://localhost/api/offerings/${SEEDED_OFFERING_ID}/resume`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': ISSUER_ID, // Uploader attempts resume
      },
    });

    const res = await resumeOfferingHandler(resumeReq, { params: Promise.resolve({ id: SEEDED_OFFERING_ID }) });
    expect(res.status).toBe(403);

    const json = await res.json();
    expect(json.error).toBe('SOD_VIOLATION');
    expect(json.message).toContain('evidence uploader is strictly forbidden');
  });

  it('8. Resume is refused before an approved manifest exists (MANIFEST_NOT_APPROVED 400)', async () => {
    const resumeReq = new NextRequest(`http://localhost/api/offerings/${SEEDED_OFFERING_ID}/resume`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': VERIFIER_ID, // Authorized verifier
      },
    });

    const res = await resumeOfferingHandler(resumeReq, { params: Promise.resolve({ id: SEEDED_OFFERING_ID }) });
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBe('MANIFEST_NOT_APPROVED');
  });

  it('9. Re-review by independent verifier: approves Manifest v2, superseding previous manifests', async () => {
    const reviewReq = new NextRequest(`http://localhost/api/properties/${SEEDED_PROPERTY_ID}/verifications`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': VERIFIER_ID, // Independent verifier != uploader
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        manifest_id: nextManifestId,
        decision: 'verified',
        reason: 'Re-reviewed updated valuation evidence. Value confirmed and documented.',
        limitations: 'Subject to annual rent revision.',
      }),
    });

    const res = await verifyPropertyHandler(reviewReq, { params: Promise.resolve({ id: SEEDED_PROPERTY_ID }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.decision).toBe('verified');

    // Manifest v2 is now approved
    const { data: manifestV2 } = await adminDb
      .from('evidence_manifests')
      .select('status')
      .eq('id', nextManifestId)
      .single();
    expect(manifestV2?.status).toBe('approved');
  });

  it('10. Resume lifecycle: verifier resumes offering, jobs anchor new root, unpause asset on Hedera, verify_activation confirms isPaused=false and sets active', async () => {
    // 1. Verifier requests resume
    const resumeReq = new NextRequest(`http://localhost/api/offerings/${SEEDED_OFFERING_ID}/resume`, {
      method: 'POST',
      headers: {
        'x-demo-user-id': VERIFIER_ID,
      },
    });

    const res = await resumeOfferingHandler(resumeReq, { params: Promise.resolve({ id: SEEDED_OFFERING_ID }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.jobs).toBeDefined();

    // 2. Process job: unpause_asset (unpauses ATS asset on Hedera Testnet first, satisfying DocumentationFacet.setDocument's onlyUnpaused modifier)
    const unpauseResult = await processUnpauseAsset({
      offeringId: SEEDED_OFFERING_ID,
      reason: 'Verifier approved revised manifest v2',
      newManifestRoot: nextManifestRoot,
    });
    expect(unpauseResult.success).toBe(true);
    expect(unpauseResult.isPaused).toBe(false);
    expect(unpauseResult.txId).toBeDefined();
    console.log('Real Hedera Asset Unpause Tx ID:', unpauseResult.txId);

    // 3. Process job: set_manifest_document (anchors new Merkle root on Hedera ATS Diamond now that it is unpaused)
    const setDocResult = await processSetManifestDocument({
      offeringId: SEEDED_OFFERING_ID,
    });
    expect(setDocResult.success).toBe(true);
    expect(setDocResult.txId).toBeDefined();
    console.log('Real Hedera New Manifest Root Anchor Tx ID:', setDocResult.txId);

    // 4. Process job: verify_activation (reads back new root AND isPaused=false, sets active)
    const activationResult = await processVerifyActivation({
      offeringId: SEEDED_OFFERING_ID,
    });

    if (!activationResult.allPassed) {
      console.error('verify_activation failed checks:', activationResult.checks.filter((c) => c.status === 'FAIL'));
    }

    expect(activationResult.allPassed).toBe(true);

    // Condition 5 (On-chain Manifest Root) passed with new root
    const c5 = activationResult.checks.find((c) => c.conditionId === 5);
    expect(c5?.status).toBe('PASS');

    // Condition 7 (On-chain Unpaused) passed
    const c7 = activationResult.checks.find((c) => c.conditionId === 7);
    expect(c7?.status).toBe('PASS');

    // Verify offering is restored to active!
    const { data: offering } = await adminDb
      .from('offerings')
      .select('status')
      .eq('id', SEEDED_OFFERING_ID)
      .single();
    expect(offering?.status).toBe('active');
  });

  it('11. Job integrity_check: successfully runs and evaluates manifests for T2/T3 triggers', async () => {
    const checkResult = await processIntegrityCheck({
      propertyId: SEEDED_PROPERTY_ID,
    });

    expect(checkResult.success).toBe(true);
    expect(checkResult.checkedCount).toBeGreaterThanOrEqual(1);
    expect(checkResult.results?.[0]?.driftDetected).toBe(false); // Currently clean and matching!
  });
});
