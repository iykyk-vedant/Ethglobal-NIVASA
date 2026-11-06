import { DeterministicMetrics } from './metrics';
import Decimal from 'decimal.js';

export type PreferenceFit = 'insufficient_evidence' | 'poor_match' | 'partial_match' | 'good_match';

export interface InvestorPreferences {
  yield_preference?: 'modest' | 'balanced' | 'growth';
  risk_tolerance?: 'conservative' | 'moderate' | 'aggressive';
  liquidity_horizon?: 'short' | 'medium' | 'long';
}

export interface FitEvaluationResult {
  preference_fit: PreferenceFit;
  rationale: string;
  risk_factors: string[];
  missing_data: string[];
}

/**
 * Evaluates investor fit with property metrics using deterministic policy rules.
 * Strictly adheres to ARCH §16.2: Missing or incomplete evidence yields 'insufficient_evidence',
 * never an attractive or promotional score.
 */
export function evaluatePreferenceFit(
  metrics: DeterministicMetrics,
  preferences: InvestorPreferences = {},
  options: {
    manifestCompletenessPct?: number | string;
    isDriftActive?: boolean;
    hasActiveOffering?: boolean;
  } = {}
): FitEvaluationResult {
  const missingData: string[] = [];
  const riskFactors: string[] = [];

  const completeness = Number(options.manifestCompletenessPct ?? metrics.to_metrics.checklist_completeness_pct ?? 100);
  const freshnessDays = Number(metrics.to_metrics.evidence_freshness_days ?? 0);
  const occupancy = Number(metrics.to_metrics.occupancy_pct ?? 0);
  const grossYield = Number(metrics.to_metrics.gross_yield_pct ?? 0);

  // Rule 1: Incomplete evidence -> insufficient_evidence
  if (completeness < 100) {
    missingData.push(`Evidence manifest completeness is at ${completeness.toFixed(1)}% (requires 100% verified documents)`);
    return {
      preference_fit: 'insufficient_evidence',
      rationale: 'Evidence is incomplete; analysis cannot determine fit until all checklist items are verified.',
      risk_factors: ['Incomplete property title or municipal evidence'],
      missing_data: missingData,
    };
  }

  // Rule 2: Active drift protocol -> insufficient_evidence
  if (options.isDriftActive) {
    missingData.push('Evidence drift protocol is active; documentation is undergoing re-verification');
    return {
      preference_fit: 'insufficient_evidence',
      rationale: 'Property is currently flagged for evidence drift; fit cannot be evaluated until verification resolves.',
      risk_factors: ['Active evidence discrepancy between chain manifest and registry documents'],
      missing_data: missingData,
    };
  }

  // Rule 3: Stale appraisal (> 365 days) -> insufficient_evidence
  if (freshnessDays > 365) {
    missingData.push(`Valuation report is ${freshnessDays} days old (> 365 days threshold)`);
    return {
      preference_fit: 'insufficient_evidence',
      rationale: 'Underlying appraisal has exceeded the 365-day freshness window; updated valuation required.',
      risk_factors: ['Stale appraisal baseline'],
      missing_data: missingData,
    };
  }

  // Collect observable risk indicators from deltas
  for (const delta of metrics.deltas) {
    if (delta.direction === 'weakened') {
      riskFactors.push(`${delta.label} weakened (${delta.from} -> ${delta.to})`);
    }
  }

  const riskTolerance = preferences.risk_tolerance || 'moderate';
  const yieldPref = preferences.yield_preference || 'balanced';

  // Rule 4: Conservative investor with weakened income indicators -> poor_match
  const noiDelta = metrics.deltas.find((d) => d.indicator === 'net_operating_income_inr');
  const occDelta = metrics.deltas.find((d) => d.indicator === 'occupancy_pct');

  if (riskTolerance === 'conservative') {
    if (noiDelta?.direction === 'weakened' || occDelta?.direction === 'weakened' || occupancy < 90) {
      return {
        preference_fit: 'poor_match',
        rationale: 'Income-based indicators or occupancy softened in this snapshot, diverging from conservative preferences.',
        risk_factors: riskFactors,
        missing_data: missingData,
      };
    }
  }

  // Rule 5: Growth preference with declining gross yield -> poor_match or partial_match
  if (yieldPref === 'growth' && grossYield < 7.0) {
    return {
      preference_fit: 'partial_match',
      rationale: `Gross yield of ${grossYield.toFixed(2)}% is below typical growth preference thresholds.`,
      risk_factors: riskFactors,
      missing_data: missingData,
    };
  }

  // Rule 6: Strong indicators matching balanced/aggressive profile
  if (riskFactors.length === 0 && grossYield >= 7.0 && occupancy >= 90) {
    return {
      preference_fit: 'good_match',
      rationale: 'Deterministic indicators align with stated preference bands across yield and occupancy.',
      risk_factors: riskFactors,
      missing_data: missingData,
    };
  }

  // Default neutral evaluation
  return {
    preference_fit: 'partial_match',
    rationale: 'Indicators present a mixed profile: some metrics improved while income-based indicators weakened.',
    risk_factors: riskFactors,
    missing_data: missingData,
  };
}

