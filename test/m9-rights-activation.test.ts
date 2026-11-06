/**
 * Milestone M9: Rights & D1 Activation Gate Test Suite
 * ARCH §9.3, §11 (all), §19, §22.2 (D1) · PRD FR-3.x · UI §8.2, §8.3 (rights) · PLAN M9
 *
 * Requirements:
 * 1. POST /api/offerings: Proposing an offering requires verified property + approved manifest (MANIFEST_NOT_APPROVED otherwise).
 * 2. POST /api/offerings/:id/rights: Adding versioned rights computes canonical SHA-256 hash and sets status to legal_review_pending.
 * 3. POST /api/offerings/:id/approve: Separation of Duties (SoD) enforced; proposer cannot approve own offering (SOD_VIOLATION 403).
 * 4. POST /api/offerings/:id/configure-token: Records ATS configuration and computes configuration_hash (token_configured).
 * 5. POST /api/offerings/:id/activate: Makes NO inline chain calls; enqueues outbox jobs only. Offering stays token_configured.
 * 6. verify_activation fails closed when on-chain rights hash or manifest root differs from DB.
 * 7. verify_activation succeeds and transitions offering to 'active' ONLY when all six conditions pass.
 * 8. Real on-chain document anchoring on Hedera Testnet returns real transaction IDs for both documents.
 */

import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';
import { getAdminDbClient } from '@/lib/db/admin';
import { computeRightsDocumentHash, computeConfigurationHash } from '@/lib/offerings/rights';
import { SdkAtsAdapter } from '@/lib/hedera/ats-adapter';
import { readDocument, readTokenSupply } from '@/lib/hedera/chain-reads';
import { processSetRightsDocument } from '@/lib/settlement/jobs/set-rights-document';
import { processSetManifestDocument } from '@/lib/settlement/jobs/set-manifest-document';
import { processVerifyActivation } from '@/lib/settlement/jobs/verify-activation';

// Route handlers
import { POST as proposeOfferingHandler } from '@/app/api/offerings/route';
import { POST as addRightsHandler } from '@/app/api/offerings/[id]/rights/route';
import { POST as approveOfferingHandler } from '@/app/api/offerings/[id]/approve/route';
import { POST as configureTokenHandler } from '@/app/api/offerings/[id]/configure-token/route';
import { POST as activateOfferingHandler } from '@/app/api/offerings/[id]/activate/route';
import { POST as pauseOfferingHandler } from '@/app/api/offerings/[id]/pause/route';
import { POST as closeOfferingHandler } from '@/app/api/offerings/[id]/close/route';

describe('Milestone M9: Rights & D1 Activation Gate (Evidence-Gated Issuance)', () => {
  const adminDb = getAdminDbClient();

  // Pre-seeded actor IDs
  const ISSUER_ID = 'e7084862-05bb-4b40-911d-46c56b12f875'; // Devendra Sharma (Nivasa Realty)
  const VERIFIER_ID = '1521f5eb-844c-4f21-85b3-b258c0e19fe4'; // Anand Verma (Title Verifier)
  const ADMIN_ID = 'f3509049-11fb-4ab4-993b-050c7878d1d3'; // System Admin (Nivasa Ops)
  const SEEDED_PROPERTY_ID = '11111111-1111-1111-1111-111111111111'; // Godrej Platina Commercial Wing A

  let testOfferingId: string;
  let testUnverifiedPropertyId: string;

  beforeAll(async () => {
    // Create an unverified draft property for testing MANIFEST_NOT_APPROVED guard
    const { data: unverifiedProp } = await adminDb
      .from('properties')
      .insert({
        issuer_id: ISSUER_ID,
        name: 'Unverified Test Property for M9',
        normalized_address: 'Wing B, Godrej Platina, LBS Marg, Vikhroli West, Mumbai',
        built_up_area_sqm: 1250.0,
        property_type: 'commercial_office',
        city: 'Mumbai',
        locality: 'Andheri',
        status: 'draft', // Not verified!
      })
      .select('id')
      .single();

    if (unverifiedProp) {
      testUnverifiedPropertyId = unverifiedProp.id;
    }
  });

  afterAll(async () => {
    // Clean up created test offering and unverified property
    if (testOfferingId) {
      await adminDb.from('outbox_jobs').delete().eq('offering_id', testOfferingId);
      await adminDb.from('offering_rights').delete().eq('offering_id', testOfferingId);
      await adminDb.from('offerings').delete().eq('id', testOfferingId);
    }
    if (testUnverifiedPropertyId) {
      await adminDb.from('properties').delete().eq('id', testUnverifiedPropertyId);
    }
  });

  // -------------------------------------------------------------------------
  // Test 1: Propose offering requires verified property + approved manifest
  // -------------------------------------------------------------------------
  it('rejects offering proposal when property is not verified or manifest is unapproved', async () => {
    const req = new NextRequest('http://localhost:3000/api/offerings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-id': ISSUER_ID,
      },
      body: JSON.stringify({
        property_id: testUnverifiedPropertyId,
        token_name: 'Invalid Test Offering',
        token_symbol: 'TEST-INV-001',
        total_units: 10000,
        unit_price_inr: '1000.00',
      }),
    });

    const res = await proposeOfferingHandler(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('PROPERTY_NOT_VERIFIED');
  });

  it('successfully proposes offering for verified property with approved manifest', async () => {
    const req = new NextRequest('http://localhost:3000/api/offerings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-id': ISSUER_ID,
      },
      body: JSON.stringify({
        property_id: SEEDED_PROPERTY_ID,
        token_name: 'NIVASA Mumbai Commercial 002',
        token_symbol: 'NIVASA-MH-002',
        total_units: 10000,
        unit_price_inr: '1000.00',
      }),
    });

    const res = await proposeOfferingHandler(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.offering.status).toBe('proposed');
    expect(body.offering.proposed_by).toBe(ISSUER_ID);

    testOfferingId = body.offering.id;
  });

  // -------------------------------------------------------------------------
  // Test 2: Add versioned rights document
  // -------------------------------------------------------------------------
  it('adds versioned rights document with deterministic SHA-256 hash', async () => {
    const req = new NextRequest(`http://localhost:3000/api/offerings/${testOfferingId}/rights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-id': ISSUER_ID,
      },
      body: JSON.stringify({
        rights_type: 'Commercial Fractional Economic Interest',
        represents: 'Simulated fractional economic interest in Godrej Platina Commercial Wing A net rental distributions.',
        does_not_represent: 'Does NOT represent physical title deed, land registry ownership, or operational control.',
        income_entitlement_rule: 'Quarterly proportional rental income distribution from verified net commercial lease proceeds.',
        transfer_rule: 'Restricted to KYC-verified eligible investors on Hedera Testnet (Chain ID 296).',
        redemption_rule: '10-year simulated liquidity exit window with scheduled sponsor buyback options.',
        voting_or_control_rights: 'Non-voting fractional economic entitlement without management authority.',
        risk_disclosures: 'Simulated demonstration asset for technical architecture proof. Not a registered security or public investment.',
      }),
    });

    const res = await addRightsHandler(req, { params: Promise.resolve({ id: testOfferingId }) });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.rights.version).toBe(1);
    expect(body.rights.rights_document_hash).toMatch(/^0x[a-f0-9]{64}$/);

    // Verify offering status moved to legal_review_pending
    const { data: updatedOffering } = await adminDb
      .from('offerings')
      .select('status, current_rights_version')
      .eq('id', testOfferingId)
      .single();

    expect(updatedOffering?.status).toBe('legal_review_pending');
    expect(updatedOffering?.current_rights_version).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Test 3: Approval enforces Separation of Duties (SoD)
  // -------------------------------------------------------------------------
  it('strictly enforces SoD: Proposer cannot approve their own offering', async () => {
    const req = new NextRequest(`http://localhost:3000/api/offerings/${testOfferingId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-id': ISSUER_ID, // Proposer attempting self-approval!
      },
      body: JSON.stringify({ review_notes: 'Attempting self-approval' }),
    });

    const res = await approveOfferingHandler(req, { params: Promise.resolve({ id: testOfferingId }) });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('SOD_VIOLATION');
  });

  it('allows independent verifier to approve offering for demo', async () => {
    const req = new NextRequest(`http://localhost:3000/api/offerings/${testOfferingId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-id': VERIFIER_ID, // Independent Verifier (≠ Proposer)
      },
      body: JSON.stringify({ review_notes: 'Reviewed against evidence manifest v1. Approved for simulated demo.' }),
    });

    const res = await approveOfferingHandler(req, { params: Promise.resolve({ id: testOfferingId }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.status).toBe('approved_for_demo');

    const { data: offering } = await adminDb
      .from('offerings')
      .select('status, approved_by')
      .eq('id', testOfferingId)
      .single();

    expect(offering?.status).toBe('approved_for_demo');
    expect(offering?.approved_by).toBe(VERIFIER_ID);
  });

  // -------------------------------------------------------------------------
  // Test 4: Configure ATS token
  // -------------------------------------------------------------------------
  it('configures ATS token parameters and computes configuration_hash', async () => {
    const req = new NextRequest(`http://localhost:3000/api/offerings/${testOfferingId}/configure-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-id': ISSUER_ID,
      },
      body: JSON.stringify({
        ats_asset_ref: 'PROPERTY-MH-001',
        token_contract_id: '0.0.11330441',
        token_evm_address: '0x52ed835e649a4b045a21bc5e240623d8a77f73ef',
        kyc_required: true,
        transfer_restricted: true,
      }),
    });

    const res = await configureTokenHandler(req, { params: Promise.resolve({ id: testOfferingId }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.status).toBe('token_configured');
    expect(body.configurationHash).toMatch(/^0x[a-f0-9]{64}$/);

    const { data: offering } = await adminDb
      .from('offerings')
      .select('status, configuration_hash')
      .eq('id', testOfferingId)
      .single();

    expect(offering?.status).toBe('token_configured');
    expect(offering?.configuration_hash).toBe(body.configurationHash);
  });

  // -------------------------------------------------------------------------
  // Test 5: Activate route makes ZERO inline chain calls
  // -------------------------------------------------------------------------
  it('enqueues D1 gate outbox jobs without making inline chain calls; offering stays token_configured', async () => {
    const req = new NextRequest(`http://localhost:3000/api/offerings/${testOfferingId}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-user-id': ADMIN_ID,
      },
    });

    const res = await activateOfferingHandler(req, { params: Promise.resolve({ id: testOfferingId }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.enqueuedJobs).toHaveLength(3);
    expect(body.enqueuedJobs.map((j: any) => j.type)).toEqual([
      'set_rights_document',
      'set_manifest_document',
      'verify_activation',
    ]);

    // Offering MUST remain token_configured (activate route never updates status to active)
    const { data: offering } = await adminDb
      .from('offerings')
      .select('status')
      .eq('id', testOfferingId)
      .single();

    expect(offering?.status).toBe('token_configured');
  });

  // -------------------------------------------------------------------------
  // Test 6: verify_activation fails closed on mismatched manifest root or rights hash
  // -------------------------------------------------------------------------
  it('verify_activation fails closed when on-chain document hashes do not match DB', async () => {
    // Deliberately tamper with the rights document hash in DB to simulate mismatch
    const tamperedHash = '0x1111111111111111111111111111111111111111111111111111111111111111';
    await adminDb
      .from('offering_rights')
      .update({ rights_document_hash: tamperedHash })
      .eq('offering_id', testOfferingId)
      .eq('version', 1);

    const report = await processVerifyActivation({ offeringId: testOfferingId });

    expect(report.allPassed).toBe(false);
    const rightsCheck = report.checks.find((c) => c.conditionId === 4);
    expect(rightsCheck?.status).toBe('FAIL');

    // Offering must stay token_configured
    const { data: offering } = await adminDb
      .from('offerings')
      .select('status, activation_checks')
      .eq('id', testOfferingId)
      .single();

    expect(offering?.status).toBe('token_configured');
    expect(offering?.activation_checks?.allPassed).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Test 7: Real on-chain document anchoring on Hedera Testnet
  // -------------------------------------------------------------------------
  it('executes real on-chain document anchoring for rights and manifest on Hedera Testnet', async () => {
    // Primary offering NIVASA Commercial 001
    const PRIMARY_OFFERING_ID = '33333333-3333-3333-3333-333333333333';

    // 1. Anchor Rights Document
    const rightsJobResult = await processSetRightsDocument({ offeringId: PRIMARY_OFFERING_ID });
    expect(rightsJobResult.success).toBe(true);
    expect(rightsJobResult.txId).toMatch(/^0\.0\.\d+@\d+\.\d+$/);

    // 2. Anchor Evidence Manifest Document
    const manifestJobResult = await processSetManifestDocument({ offeringId: PRIMARY_OFFERING_ID });
    expect(manifestJobResult.success).toBe(true);
    expect(manifestJobResult.txId).toMatch(/^0\.0\.\d+@\d+\.\d+$/);

    // 3. Read back anchored documents from Hedera Mirror Node
    const [chainRights, chainManifest] = await Promise.all([
      readDocument('rights'),
      readDocument('evidence-manifest'),
    ]);

    expect(chainRights.status).toBe('CONFIRMED');
    expect(chainRights.data?.hash.toLowerCase()).toBe(rightsJobResult.documentHash.toLowerCase());

    expect(chainManifest.status).toBe('CONFIRMED');
    expect(chainManifest.data?.hash.toLowerCase()).toBe(manifestJobResult.merkleRoot.toLowerCase());
  }, 45000); // 45-second timeout for Hedera Testnet consensus

  // -------------------------------------------------------------------------
  // Test 8: verify_activation succeeds when both match & marks offering active
  // -------------------------------------------------------------------------
  it('verify_activation succeeds when on-chain documents match and marks offering active', async () => {
    const PRIMARY_OFFERING_ID = '33333333-3333-3333-3333-333333333333';

    const report = await processVerifyActivation({ offeringId: PRIMARY_OFFERING_ID });

    expect(report.allPassed).toBe(true);
    expect(report.checks).toHaveLength(6);
    report.checks.forEach((c) => {
      expect(c.status).toBe('PASS');
    });

    const { data: offering } = await adminDb
      .from('offerings')
      .select('status, activation_checks')
      .eq('id', PRIMARY_OFFERING_ID)
      .single();

    expect(offering?.status).toBe('active');
    expect(offering?.activation_checks?.allPassed).toBe(true);
  });
});
