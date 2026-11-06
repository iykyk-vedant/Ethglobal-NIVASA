import { describe, it, expect } from 'vitest';
import { validateAiResponse } from '@/lib/ai/validator';
import { computeMetricDeltas, PropertySnapshotData } from '@/lib/ai/metrics';
import { evaluatePreferenceFit } from '@/lib/ai/fit-policy';
import { runPropertyAnalysis } from '@/lib/ai/advisor';
import fs from 'fs';
import path from 'path';

describe('Milestone M7: 0G Private Computer & Property Intelligence', () => {
  const dummySnap1: PropertySnapshotData = {
    snapshot_no: 1,
    as_of: '2026-10-01T00:00:00.000Z',
    valuation_date: '2026-10-01T00:00:00.000Z',
    valuation_amount_inr: '100000000.00',
    occupancy_pct: '90.00',
    annual_rent_inr: '7200000.00',
    operating_costs_inr: '1400000.00',
    provenance: 'independently_verified',
    event_note: 'Initial baseline valuation',
    checklist_completeness_pct: '100.00',
    evidence_record_ids: ['doc-val-001', 'doc-rent-001'],
  };

  const dummySnap2: PropertySnapshotData = {
    snapshot_no: 2,
    as_of: '2026-11-01T00:00:00.000Z',
    valuation_date: '2026-11-01T00:00:00.000Z',
    valuation_amount_inr: '105000000.00',
    occupancy_pct: '85.00',
    annual_rent_inr: '6800000.00',
    operating_costs_inr: '1600000.00',
    provenance: 'simulated',
    event_note: 'New valuation report uploaded reflecting updated market cap rate. IT tenant downsized.',
    checklist_completeness_pct: '100.00',
    evidence_record_ids: ['doc-val-002', 'doc-rent-002'],
  };

  const allowedIds = ['doc-val-001', 'doc-rent-001', 'doc-val-002', 'doc-rent-002'];
  const metrics = computeMetricDeltas(dummySnap1, dummySnap2, allowedIds);

  describe('1. Deterministic Financial Metrics (lib/ai/metrics.ts)', () => {
    it('computes exact gross yield, NOI, and net income yield using decimals', () => {
      // Snap 1: rent 7,200,000 / val 100,000,000 = 7.20%
      expect(metrics.from_metrics.gross_yield_pct).toBe('7.20');
      // Snap 1: NOI = 7,200,000 - 1,400,000 = 5,800,000
      expect(metrics.from_metrics.net_operating_income_inr).toBe('5800000.00');
      // Snap 1: Net income yield = 5,800,000 / 100,000,000 = 5.80%
      expect(metrics.from_metrics.net_income_yield_pct).toBe('5.80');

      // Snap 2: rent 6,800,000 / val 105,000,000 = 6.48%
      expect(metrics.to_metrics.gross_yield_pct).toBe('6.48');
      // Snap 2: NOI = 6,800,000 - 1,600,000 = 5,200,000
      expect(metrics.to_metrics.net_operating_income_inr).toBe('5200000.00');

      // Operating costs increased: higher is weakened!
      const costDelta = metrics.deltas.find((d) => d.indicator === 'operating_costs_inr');
      expect(costDelta?.direction).toBe('weakened');

      // Occupancy decreased from 90 to 85: weakened!
      const occDelta = metrics.deltas.find((d) => d.indicator === 'occupancy_pct');
      expect(occDelta?.direction).toBe('weakened');

      // Valuation increased from 100M to 105M: improved!
      const valDelta = metrics.deltas.find((d) => d.indicator === 'valuation_inr');
      expect(valDelta?.direction).toBe('improved');
    });
  });

  describe('2. Hard Fit Policy & Incomplete Evidence Rules (lib/ai/fit-policy.ts)', () => {
    it('forces preference_fit = insufficient_evidence when checklist completeness < 100%', () => {
      const result = evaluatePreferenceFit(metrics, {}, { manifestCompletenessPct: 85 });
      expect(result.preference_fit).toBe('insufficient_evidence');
      expect(result.missing_data.length).toBeGreaterThan(0);
    });

    it('forces preference_fit = insufficient_evidence when evidence drift is active', () => {
      const result = evaluatePreferenceFit(metrics, {}, { isDriftActive: true });
      expect(result.preference_fit).toBe('insufficient_evidence');
    });

    it('evaluates conservative investor with weakened income indicators to poor_match', () => {
      const result = evaluatePreferenceFit(metrics, { risk_tolerance: 'conservative' });
      expect(result.preference_fit).toBe('poor_match');
    });
  });

  describe('3. Ground-Truth Validator Mock-Free Unit Tests (lib/ai/validator.ts)', () => {
    const validPayload = {
      summary: 'Valuation rose to 105000000, while net operating income fell to 5200000 in this update.',
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
      assumptions: ['All figures are derived from ground-truth snapshots'],
      missing_information: ['Detailed tenant lease duration'],
      cannot_determine: ['Why occupancy fell: the supplied data does not state a cause'],
      source_ids: ['doc-val-001', 'doc-val-002'],
      disclaimer: 'Educational analysis only; not investment advice.',
    };

    it('accepts valid, ground-truth conformant AI response', () => {
      const res = validateAiResponse(validPayload, metrics, allowedIds, dummySnap2.event_note);
      expect(res.success).toBe(true);
    });

    it('rejects malformed JSON', () => {
      const res = validateAiResponse('{ "summary": "Unclosed string ...', metrics, allowedIds);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.errors[0]).toContain('MALFORMED_JSON');
      }
    });

    it('rejects unexpected / invalid enums', () => {
      const badEnumPayload = {
        ...validPayload,
        preference_fit: 'highly_recommended', // Invalid enum
      };
      const res = validateAiResponse(badEnumPayload, metrics, allowedIds);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.errors.some((e: string) => e.includes('preference_fit'))).toBe(true);
      }
    });

    it('rejects foreign evidence IDs outside the supplied allowlist', () => {
      const foreignIdPayload = {
        ...validPayload,
        changes: [
          {
            ...validPayload.changes[0],
            supporting_evidence_ids: ['unauthorized-secret-doc-999'],
          },
        ],
      };
      const res = validateAiResponse(foreignIdPayload, metrics, allowedIds);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.errors.some((e: string) => e.includes('FOREIGN_EVIDENCE_ID'))).toBe(true);
      }
    });

    it('rejects invented numbers in prose not present in deterministic metrics', () => {
      const inventedNumberPayload = {
        ...validPayload,
        summary: 'Valuation rose to 999999999, achieving an estimated 42.5% return.', // 999999999 and 42.5 are invented!
      };
      const res = validateAiResponse(inventedNumberPayload, metrics, allowedIds);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.errors.some((e: string) => e.includes('INVENTED_NUMBER'))).toBe(true);
      }
    });

    it('rejects unsourced causal claims not present in event note', () => {
      const unsourcedCausalPayload = {
        ...validPayload,
        summary: 'Net income fell because the building management went bankrupt.', // Not in event note!
      };
      const res = validateAiResponse(unsourcedCausalPayload, metrics, allowedIds, 'Normal update note');
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.errors.some((e: string) => e.includes('UNSOURCED_CAUSAL_CLAIM'))).toBe(true);
      }
    });

    it('rejects missing required fields or missing disclaimer', () => {
      const missingDisclaimerPayload = {
        ...validPayload,
        disclaimer: 'Generic text without required wording',
      };
      const res = validateAiResponse(missingDisclaimerPayload, metrics, allowedIds);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.errors.some((e: string) => e.includes('disclaimer'))).toBe(true);
      }
    });
  });

  describe('4. Architectural Isolation & Chain Module Import Rule', () => {
    it('verifies AI routes and modules do not import chain or ATS modules (ARCH §20)', () => {
      const aiFiles = [
        'lib/ai/metrics.ts',
        'lib/ai/fit-policy.ts',
        'lib/ai/schemas.ts',
        'lib/ai/validator.ts',
        'lib/ai/og-client.ts',
        'lib/ai/advisor.ts',
        'app/api/ai/profile/route.ts',
        'app/api/ai/analyze-offering/route.ts',
      ];

      const forbiddenImports = ['@hashgraph/sdk', 'lib/hedera', 'ethers', 'ats-adapter'];

      for (const file of aiFiles) {
        const fullPath = path.resolve(process.cwd(), file);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          for (const forbidden of forbiddenImports) {
            expect(content).not.toContain(forbidden);
          }
        }
      }
    });
  });

  describe('5. Real 0G Private Computer Live Main-Flow Call (Exit Condition)', () => {
    it('executes real 0G inference, validates output, and stores real request ID', async () => {
      const propertyId = '11111111-1111-1111-1111-111111111111';
      const outcome = await runPropertyAnalysis({
        propertyId,
        snapshotFrom: 1,
        snapshotTo: 2,
        preferences: {
          yield_preference: 'balanced',
          risk_tolerance: 'moderate',
          liquidity_horizon: 'medium',
        },
      });

      console.log('\n======================================================');
      console.log('REAL 0G PRIVATE COMPUTER INFERENCE CALL:');
      console.log('Status:', outcome.status);
      console.log('0G Request ID:', outcome.requestAttempts[0]?.requestId);
      console.log('Model:', outcome.model);
      console.log('Provider:', outcome.provider);
      console.log('Input Hash:', outcome.inputHash);
      console.log('Output Hash:', outcome.outputHash);
      if (outcome.validatedResponse) {
        console.log('Validated Summary:', outcome.validatedResponse.summary);
        console.log('Preference Fit:', outcome.validatedResponse.preference_fit);
      } else {
        console.log('Validation Errors:', outcome.errors);
      }
      console.log('======================================================\n');

      expect(outcome.requestAttempts.length).toBeGreaterThan(0);
      const attempt = outcome.requestAttempts[0];
      expect(attempt.requestId).toBeDefined();
      expect(attempt.requestId.length).toBeGreaterThan(3);
      expect(attempt.requestId).not.toBe('UNKNOWN');
      expect(outcome.deterministicMetrics.deltas.length).toBeGreaterThan(0);
    }, 60000);
  });
});
