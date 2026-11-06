import { describe, it, expect, afterAll } from 'vitest';
import { NextRequest } from 'next/server';

process.env.DEMO_EVENTS = 'true';

import { computePropertyDelta, PropertySnapshotData } from '@/lib/ai/delta';
import { validateAiResponse } from '@/lib/ai/validator';
import { runPropertyAnalysis } from '@/lib/ai/advisor';
import { POST as propertyEventPost, GET as propertyEventGet } from '@/app/api/demo/property-event/route';
import { POST as analyzeChangesPost } from '@/app/api/ai/analyze-changes/route';
import { getAdminDbClient } from '@/lib/db/admin';
import demoEvents from '@/config/demo-events.json';

describe('Milestone M13: D5 Change Intelligence & 0G Verification', () => {
  const DEMO_PROPERTY_ID = '11111111-1111-1111-1111-111111111111';
  const DEMO_ADMIN_ID = 'f3509049-11fb-4ab4-993b-050c7878d1d3';
  const DEMO_INVESTOR_ID = '2a1b3a8b-8215-4111-9a76-7b3b6f51b109';

  // ARCH §16.3 Oracle Table Snapshots
  const oracleSnap1: PropertySnapshotData = {
    snapshot_no: 1,
    as_of: '2026-10-01T00:00:00.000Z',
    valuation_date: '2026-10-01',
    valuation_amount_inr: '100000000.00', // ₹10,00,00,000
    occupancy_pct: '90.00',               // 90%
    annual_rent_inr: '7200000.00',        // ₹72,00,000
    operating_costs_inr: '1400000.00',    // ₹14,00,000
    provenance: 'independently_verified',
    event_note: 'Initial baseline appraisal',
    checklist_completeness_pct: '100.00',
    evidence_record_ids: ['doc-val-001', 'doc-rent-001', 'doc-title-001'],
    operating_costs_sourced: true,
  };

  const oracleSnap2: PropertySnapshotData = {
    snapshot_no: 2,
    as_of: '2026-11-06T00:00:00.000Z',
    valuation_date: '2026-11-01',
    valuation_amount_inr: '105000000.00', // ₹10,50,00,000
    occupancy_pct: '85.00',               // 85%
    annual_rent_inr: '6800000.00',        // ₹68,00,000
    operating_costs_inr: '1600000.00',    // ₹16,00,000
    provenance: 'simulated',
    event_note:
      'New independent valuation report uploaded reflecting updated market capitalisation rates. IT tenant scaled down partial floor plate during lease renewal.',
    checklist_completeness_pct: '100.00',
    evidence_record_ids: ['doc-val-002', 'doc-rent-002', 'doc-tax-001'],
    operating_costs_sourced: true,
  };

  const oracleManifestDocs = [
    { id: 'doc-val-002', document_type: 'valuation_report' },
    { id: 'doc-rent-002', document_type: 'lease_rent_agreement' },
    { id: 'doc-tax-001', document_type: 'operating_statement' },
  ];

  describe('1. ARCH §16.3 Deterministic Delta Oracle Test (lib/ai/delta.ts)', () => {
    it('matches exact figures, yields, direction, and policy flags from the ARCH §16.3 oracle table', () => {
      const delta = computePropertyDelta(
        oracleSnap1,
        oracleSnap2,
        ['doc-val-002', 'doc-rent-002', 'doc-tax-001'],
        { manifestDocuments: oracleManifestDocs }
      );

      // 1. Valuation: ₹10,00,00,000 -> ₹10,50,00,000 (+5.00% -> improved)
      expect(delta.indicators.valuation.from).toBe('100000000.00');
      expect(delta.indicators.valuation.to).toBe('105000000.00');
      expect(delta.indicators.valuation.percentage_change).toBe('5.00');
      expect(delta.indicators.valuation.direction).toBe('improved');

      // 2. Occupancy: 90.00% -> 85.00% (-5.00 pp -> weakened, policy flag)
      expect(delta.indicators.occupancy.from).toBe('90.00%');
      expect(delta.indicators.occupancy.to).toBe('85.00%');
      expect(delta.indicators.occupancy.absolute_change).toBe('-5.00 pp');
      expect(delta.indicators.occupancy.percentage_change).toBe('-5.56');
      expect(delta.indicators.occupancy.direction).toBe('weakened');
      expect(delta.indicators.occupancy.policy_flag).toBe('Occupancy fell below target 90%');

      // 3. Annual rent: ₹72,00,000 -> ₹68,00,000 (-5.56% -> weakened)
      expect(delta.indicators.annual_rent.from).toBe('7200000.00');
      expect(delta.indicators.annual_rent.to).toBe('6800000.00');
      expect(delta.indicators.annual_rent.percentage_change).toBe('-5.56');
      expect(delta.indicators.annual_rent.direction).toBe('weakened');

      // 4. Operating costs: ₹14,00,000 -> ₹16,00,000 (+14.29% cost increase -> WEAKENED!)
      expect(delta.indicators.operating_costs.percentage_change).toBe('14.29');
      expect(delta.indicators.operating_costs.direction).toBe('weakened');
      expect(delta.indicators.operating_costs.policy_flag).toBe('Operating expenses increased');

      // 5. Gross yield: 7.20% -> 6.48% (about 6.48% in ARCH §16.3 -> weakened)
      expect(delta.from_metrics.gross_yield_pct).toBe('7.20');
      expect(delta.to_metrics.gross_yield_pct).toBe('6.48');
      expect(delta.indicators.gross_yield.direction).toBe('weakened');

      // 6. Net Operating Income: ₹58,00,000 -> ₹52,00,000 (about -10.3% -> weakened)
      expect(delta.from_metrics.net_operating_income_inr).toBe('5800000.00');
      expect(delta.to_metrics.net_operating_income_inr).toBe('5200000.00');
      expect(delta.indicators.net_operating_income.percentage_change).toBe('-10.34');
      expect(delta.indicators.net_operating_income.direction).toBe('weakened');
      expect(delta.indicators.net_operating_income.policy_flag).toBe('Net operating income declined');

      // 7. Net income yield on valuation: 5.80% -> 4.95% (about 4.95% in ARCH §16.3 -> weakened)
      expect(delta.from_metrics.net_income_yield_pct).toBe('5.80');
      expect(delta.to_metrics.net_income_yield_pct).toBe('4.95');
      expect(delta.indicators.net_income_yield.direction).toBe('weakened');

      // 8. Supporting evidence citations
      expect(delta.indicators.valuation.supporting_evidence_ids).toContain('doc-val-002');
      expect(delta.indicators.annual_rent.supporting_evidence_ids).toContain('doc-rent-002');
    });

    it('marks net income yield as unsupported when operating costs are unsourced', () => {
      const unsourcedSnap = { ...oracleSnap2, operating_costs_sourced: false };
      const delta = computePropertyDelta(oracleSnap1, unsourcedSnap, []);

      expect(delta.indicators.net_income_yield.direction).toBe('unsupported');
      expect(delta.indicators.net_income_yield.policy_flag).toBe(
        'Operating costs not independently sourced'
      );
      expect(delta.indicators.net_income_yield.supporting_evidence_ids).toContain('unsupported');
    });
  });

  describe('2. Ground-Truth Validator Anti-Hallucination Guardrails (lib/ai/validator.ts)', () => {
    const delta = computePropertyDelta(oracleSnap1, oracleSnap2, [
      'doc-val-002',
      'doc-rent-002',
      'doc-tax-001',
    ]);
    const allowedEvidence = ['doc-val-002', 'doc-rent-002', 'doc-tax-001'];
    const eventNote = oracleSnap2.event_note || '';

    it('rejects malformed JSON with MALFORMED_JSON error', () => {
      const res = validateAiResponse('{ not a json: ', delta, allowedEvidence, eventNote);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.errors[0]).toContain('MALFORMED_JSON');
      }
    });

    it('rejects an invented number not present in deterministic metrics', () => {
      const payload = {
        summary: 'Valuation increased to 105000000, while projected yields reached 19.50% based on estimates.',
        preference_fit: 'poor_match',
        changes: [
          {
            indicator: 'valuation',
            from: '100000000.00',
            to: '105000000.00',
            direction: 'improved',
            supporting_evidence_ids: ['doc-val-002'],
          },
        ],
        risk_flags: [],
        assumptions: ['19.50 is an invented figure'],
        missing_information: [],
        cannot_determine: [],
        source_ids: ['doc-val-002'],
        disclaimer: 'Educational analysis only; not investment advice.',
      };

      const res = validateAiResponse(payload, delta, allowedEvidence, eventNote);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.errors.some((e) => e.includes('INVENTED_NUMBER') && e.includes('19.50'))).toBe(true);
      }
    });

    it('rejects an unsourced causal claim not present in the event note', () => {
      const payload = {
        summary:
          'Valuation rose to 105000000. Occupancy fell to 85.00 because the company is facing bankruptcy.',
        preference_fit: 'poor_match',
        changes: [
          {
            indicator: 'occupancy',
            from: '90.00',
            to: '85.00',
            direction: 'weakened',
            supporting_evidence_ids: ['doc-rent-002'],
          },
        ],
        risk_flags: ['Tenant bankrupt'],
        assumptions: [],
        missing_information: [],
        cannot_determine: [],
        source_ids: ['doc-rent-002'],
        disclaimer: 'Educational analysis only; not investment advice.',
      };

      const res = validateAiResponse(payload, delta, allowedEvidence, eventNote);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.errors.some((e) => e.includes('UNSOURCED_CAUSAL_CLAIM'))).toBe(true);
      }
    });

    it('rejects an evidence ID outside the allowed evidence allowlist', () => {
      const payload = {
        summary: 'Valuation rose to 105000000 with NOI at 5200000.',
        preference_fit: 'partial_match',
        changes: [
          {
            indicator: 'valuation',
            from: '100000000.00',
            to: '105000000.00',
            direction: 'improved',
            supporting_evidence_ids: ['doc-fabricated-fake-999'],
          },
        ],
        risk_flags: [],
        assumptions: [],
        missing_information: [],
        cannot_determine: [],
        source_ids: ['doc-fabricated-fake-999'],
        disclaimer: 'Educational analysis only; not investment advice.',
      };

      const res = validateAiResponse(payload, delta, allowedEvidence, eventNote);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.errors.some((e) => e.includes('FOREIGN_EVIDENCE_ID'))).toBe(true);
      }
    });

    it('accepts a fully compliant, grounded, cited response matching schema', () => {
      const validPayload = {
        summary:
          'Valuation rose to 105000000, but income-based indicators weakened with net operating income at 5200000.',
        preference_fit: 'poor_match',
        changes: [
          {
            indicator: 'net_operating_income',
            from: '5800000.00',
            to: '5200000.00',
            direction: 'weakened',
            supporting_evidence_ids: ['doc-val-002', 'doc-rent-002'],
          },
        ],
        risk_flags: ['Occupancy fell to 85.00'],
        assumptions: ['All figures are simulated'],
        missing_information: ['Independent explanation of the occupancy change'],
        cannot_determine: ['Why occupancy fell: the supplied data does not state a cause'],
        source_ids: ['doc-val-002', 'doc-rent-002'],
        disclaimer: 'Educational analysis only; not investment advice.',
      };

      const res = validateAiResponse(validPayload, delta, allowedEvidence, eventNote);
      expect(res.success).toBe(true);
    });
  });

  describe('3. Scripted Property Event Endpoint (POST /api/demo/property-event)', () => {
    it('returns enabled status via GET', async () => {
      const req = new NextRequest('http://localhost:3000/api/demo/property-event');
      const res = await propertyEventGet(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(typeof data.enabled).toBe('boolean');
      expect(Array.isArray(data.events)).toBe(true);
    });

    it('refuses execution from non-admin role with FORBIDDEN (403)', async () => {
      const req = new NextRequest('http://localhost:3000/api/demo/property-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': DEMO_INVESTOR_ID, // investor role
        },
        body: JSON.stringify({
          propertyId: DEMO_PROPERTY_ID,
          reason: 'Attempted unauthorized event injection',
        }),
      });

      const res = await propertyEventPost(req);
      const data = await res.json();

      expect(res.status).toBe(403);
      expect(data.error.code).toBe('FORBIDDEN');
    });

    it('rejects arming without a substantive reason (< 5 characters)', async () => {
      const req = new NextRequest('http://localhost:3000/api/demo/property-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': DEMO_ADMIN_ID,
        },
        body: JSON.stringify({
          propertyId: DEMO_PROPERTY_ID,
          reason: 'hi', // too short
        }),
      });

      const res = await propertyEventPost(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error.code).toBe('BAD_REQUEST');
    });

    it('strictly refuses when DEMO_EVENTS=false or APP_ENV=production (FLAG_DISABLED 403)', async () => {
      const origFlag = process.env.DEMO_EVENTS;
      try {
        process.env.DEMO_EVENTS = 'false';
        const req = new NextRequest('http://localhost:3000/api/demo/property-event', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-demo-user-id': DEMO_ADMIN_ID,
          },
          body: JSON.stringify({
            propertyId: DEMO_PROPERTY_ID,
            reason: 'Valid audit reason for testing disabled flag',
          }),
        });

        const res = await propertyEventPost(req);
        const data = await res.json();

        expect(res.status).toBe(403);
        expect(data.error.code).toBe('FLAG_DISABLED');
      } finally {
        process.env.DEMO_EVENTS = origFlag;
      }
    });

    it('appends a simulated snapshot row #2 and records property_event_applied in audit_logs', async () => {
      const adminDb = getAdminDbClient();

      // Check current max snapshot count
      const { data: beforeSnaps } = await adminDb
        .from('property_snapshots')
        .select('snapshot_no')
        .eq('property_id', DEMO_PROPERTY_ID)
        .order('snapshot_no', { ascending: false });

      const currentCount = beforeSnaps?.length || 0;

      const req = new NextRequest('http://localhost:3000/api/demo/property-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': DEMO_ADMIN_ID,
        },
        body: JSON.stringify({
          propertyId: DEMO_PROPERTY_ID,
          reason: 'M13 verification test: applying scripted valuation & tenant downsize event',
          valuationAmountInr: '105000000.00',
          occupancyPct: '85.00',
          annualRentInr: '6800000.00',
          operatingCostsInr: '1600000.00',
        }),
      });

      const res = await propertyEventPost(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.snapshot.snapshot_no).toBe(currentCount + 1);
      expect(data.snapshot.provenance).toBe('simulated');
      expect(data.snapshot.valuation_amount_inr).toBe(105000000);

      // Verify audit log entry
      const { data: auditRows } = await adminDb
        .from('audit_logs')
        .select('*')
        .eq('action', 'property_event_applied')
        .eq('resource_id', data.snapshot.id)
        .order('id', { ascending: false })
        .limit(1);

      expect(auditRows?.length).toBe(1);
      expect(auditRows![0].reason).toContain('M13 verification test');
    });
  });

  describe('4. Security Invariant: AI Route Cannot Trigger Chain Mutations', () => {
    it('verifies that calling change intelligence leaves on-chain ATS state and supply completely untouched', async () => {
      const adminDb = getAdminDbClient();

      // Read offering status & outbox count before
      const { data: offeringBefore } = await adminDb
        .from('offerings')
        .select('status')
        .eq('property_id', DEMO_PROPERTY_ID)
        .single();

      const { count: jobsBefore } = await adminDb
        .from('outbox_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const req = new NextRequest('http://localhost:3000/api/ai/analyze-changes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-demo-user-id': DEMO_INVESTOR_ID,
        },
        body: JSON.stringify({
          propertyId: DEMO_PROPERTY_ID,
          snapshotFrom: 1,
          snapshotTo: 2,
        }),
      });

      const res = await analyzeChangesPost(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);

      // Verify offering status remains exactly the same
      const { data: offeringAfter } = await adminDb
        .from('offerings')
        .select('status')
        .eq('property_id', DEMO_PROPERTY_ID)
        .single();

      expect(offeringAfter?.status).toBe(offeringBefore?.status);

      // Verify zero unexpected outbox jobs were added by AI
      const { count: jobsAfter } = await adminDb
        .from('outbox_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      expect(jobsAfter).toBe(jobsBefore);
    });
  });

  describe('5. Real 0G Private Computer Change Intelligence Call (Exit Condition)', () => {
    it('executes live 0G inference, validates output, and records real request ID', async () => {
      const outcome = await runPropertyAnalysis({
        propertyId: DEMO_PROPERTY_ID,
        snapshotFrom: 1,
        snapshotTo: 2,
        preferences: {
          yield_preference: 'balanced',
          risk_tolerance: 'moderate',
          liquidity_horizon: 'medium',
        },
      });

      console.log('\n======================================================');
      console.log('REAL 0G PRIVATE COMPUTER CHANGE INTELLIGENCE:');
      console.log('Status:', outcome.status);
      console.log('0G Request ID:', outcome.requestAttempts[0]?.requestId);
      console.log('Model:', outcome.model);
      console.log('Input Hash:', outcome.inputHash);
      console.log('Output Hash:', outcome.outputHash);
      if (outcome.validatedResponse) {
        console.log('Validated Summary:', outcome.validatedResponse.summary);
        console.log('Preference Fit:', outcome.validatedResponse.preference_fit);
        console.log('Changes Explained:', outcome.validatedResponse.changes.length);
        console.log('Cited Source IDs:', outcome.validatedResponse.source_ids);
      } else {
        console.log('Validation Errors / Status:', outcome.errors);
      }
      console.log('======================================================\n');

      expect(outcome.requestAttempts.length).toBeGreaterThan(0);
      const attempt = outcome.requestAttempts[0];
      expect(attempt.requestId).toBeDefined();
      expect(attempt.requestId.length).toBeGreaterThan(0);
      expect(attempt.provider).toBe('0g');
      expect(outcome.inputHash).toMatch(/^[a-f0-9]{64}$/);
      expect(outcome.outputHash).toMatch(/^[a-f0-9]{64}$/);
      expect(['Available', 'Temporarily unavailable']).toContain(outcome.status);

      if (outcome.status === 'Available') {
        expect(outcome.validatedResponse).not.toBeNull();
        expect(outcome.validatedResponse?.summary.length).toBeGreaterThan(10);
        expect(outcome.validatedResponse?.source_ids.length).toBeGreaterThan(0);
      }
    });
  });

  afterAll(async () => {
    const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (dbUrl) {
      const { Client } = await import('pg');
      const client = new Client(dbUrl);
      await client.connect();
      try {
        await client.query('ALTER TABLE property_snapshots DISABLE TRIGGER trg_snapshot_immutability');
        await client.query('DELETE FROM property_snapshots WHERE snapshot_no > 1');
        await client.query('ALTER TABLE property_snapshots ENABLE TRIGGER trg_snapshot_immutability');
      } finally {
        await client.end();
      }
    }
  });
});
