import { toDecimal, toMoneyString } from '@/lib/money/decimal';
import Decimal from 'decimal.js';

export interface PropertySnapshotData {
  snapshot_no: number;
  as_of: string;
  occupancy_pct: string;
  annual_rent_inr: string;
  operating_costs_inr: string;
  valuation_amount_inr: string;
  valuation_date: string;
  provenance: 'independently_verified' | 'issuer_reported' | 'public_source' | 'simulated' | 'unknown';
  event_note?: string | null;
  manifest_id?: string | null;
  checklist_completeness_pct?: string;
  evidence_record_ids?: string[];
}

export type MetricDirection = 'improved' | 'weakened' | 'unchanged' | 'unsupported';

export interface MetricDelta {
  indicator: string;
  label: string;
  from: string;
  to: string;
  absolute_change: string;
  percentage_change: string;
  direction: MetricDirection;
  policy_flag?: string | null;
  supporting_evidence_ids: string[];
}

export interface DeterministicMetrics {
  snapshot_from_no: number;
  snapshot_to_no: number;
  from_metrics: Record<string, string>;
  to_metrics: Record<string, string>;
  deltas: MetricDelta[];
  allowed_numbers: string[];
  evidence_ids: string[];
}

/**
 * Computes deterministic derived financial and operational metrics for a property snapshot.
 * Uses exact Decimal arithmetic with zero floating-point math on monetary values.
 */
export function computeSnapshotDerivedMetrics(snapshot: PropertySnapshotData) {
  const valuation = toDecimal(String(snapshot.valuation_amount_inr));
  const annualRent = toDecimal(String(snapshot.annual_rent_inr));
  const operatingCosts = toDecimal(String(snapshot.operating_costs_inr));
  const occupancy = toDecimal(String(snapshot.occupancy_pct));

  // Gross yield = (rent ÷ valuation) * 100
  let grossYieldPct = '0.00';
  if (!valuation.isZero()) {
    grossYieldPct = annualRent.div(valuation).mul(100).toFixed(2);
  }

  // Net Operating Income (NOI) = rent - operating costs
  const noi = annualRent.minus(operatingCosts);
  const noiInr = toMoneyString(noi.toFixed(2));

  // Net income yield = (NOI ÷ valuation) * 100 (only when costs are present and valuation > 0)
  let netIncomeYieldPct = '0.00';
  if (!valuation.isZero() && !operatingCosts.isZero()) {
    netIncomeYieldPct = noi.div(valuation).mul(100).toFixed(2);
  }

  // Days since valuation date (freshness)
  const asOfDate = new Date(snapshot.as_of);
  const valDate = new Date(snapshot.valuation_date);
  const diffDays = Math.max(0, Math.floor((asOfDate.getTime() - valDate.getTime()) / (1000 * 60 * 60 * 24)));

  return {
    valuation_inr: toMoneyString(valuation.toFixed(2)),
    annual_rent_inr: toMoneyString(annualRent.toFixed(2)),
    operating_costs_inr: toMoneyString(operatingCosts.toFixed(2)),
    occupancy_pct: occupancy.toFixed(2),
    gross_yield_pct: grossYieldPct,
    net_operating_income_inr: noiInr,
    net_income_yield_pct: netIncomeYieldPct,
    evidence_freshness_days: String(diffDays),
    checklist_completeness_pct: snapshot.checklist_completeness_pct || '100.00',
  };
}

/**
 * Computes the deterministic metric delta between two snapshots.
 */
export function computeMetricDeltas(
  fromSnap: PropertySnapshotData,
  toSnap: PropertySnapshotData,
  toEvidenceIds: string[] = []
): DeterministicMetrics {
  const from = computeSnapshotDerivedMetrics(fromSnap);
  const to = computeSnapshotDerivedMetrics(toSnap);

  const indicators: Array<{
    key: keyof typeof from;
    label: string;
    isMoney: boolean;
    isRate: boolean;
    higherIsBetter: boolean;
  }> = [
    { key: 'valuation_inr', label: 'Valuation', isMoney: true, isRate: false, higherIsBetter: true },
    { key: 'occupancy_pct', label: 'Occupancy', isMoney: false, isRate: true, higherIsBetter: true },
    { key: 'annual_rent_inr', label: 'Annual Rent', isMoney: true, isRate: false, higherIsBetter: true },
    { key: 'operating_costs_inr', label: 'Operating Costs', isMoney: true, isRate: false, higherIsBetter: false }, // Higher cost is weakened!
    { key: 'gross_yield_pct', label: 'Gross Yield', isMoney: false, isRate: true, higherIsBetter: true },
    { key: 'net_operating_income_inr', label: 'Net Operating Income', isMoney: true, isRate: false, higherIsBetter: true },
    { key: 'net_income_yield_pct', label: 'Net Income Yield', isMoney: false, isRate: true, higherIsBetter: true },
    { key: 'checklist_completeness_pct', label: 'Checklist Completeness', isMoney: false, isRate: true, higherIsBetter: true },
    { key: 'evidence_freshness_days', label: 'Evidence Freshness', isMoney: false, isRate: false, higherIsBetter: false }, // Fewer days is better!
  ];

  const deltas: MetricDelta[] = [];
  const allowedNumbers = new Set<string>();

  for (const ind of indicators) {
    const fromValRaw = from[ind.key];
    const toValRaw = to[ind.key];

    // Collect raw strings into allowed numbers set
    allowedNumbers.add(fromValRaw);
    allowedNumbers.add(toValRaw);

    const fromDec = toDecimal(fromValRaw);
    const toDec = toDecimal(toValRaw);
    const absDiff = toDec.minus(fromDec);

    let pctChange = '0.00';
    if (!fromDec.isZero()) {
      pctChange = absDiff.div(fromDec.abs()).mul(100).toFixed(2);
      allowedNumbers.add(pctChange);
      allowedNumbers.add(absDiff.abs().toFixed(2));
    }

    let direction: MetricDirection = 'unchanged';
    if (absDiff.isPositive() && !absDiff.isZero()) {
      direction = ind.higherIsBetter ? 'improved' : 'weakened';
    } else if (absDiff.isNegative()) {
      direction = ind.higherIsBetter ? 'weakened' : 'improved';
    }

    let policyFlag: string | null = null;
    if (ind.key === 'occupancy_pct' && toDec.lt(90)) {
      policyFlag = 'Occupancy fell below target 90%';
      allowedNumbers.add('90');
      allowedNumbers.add('90.00');
    } else if (ind.key === 'net_operating_income_inr' && direction === 'weakened') {
      policyFlag = 'Net operating income declined';
    } else if (ind.key === 'operating_costs_inr' && direction === 'weakened') {
      policyFlag = 'Operating expenses increased';
    }

    deltas.push({
      indicator: ind.key,
      label: ind.label,
      from: ind.isMoney ? toMoneyString(fromValRaw) : fromValRaw,
      to: ind.isMoney ? toMoneyString(toValRaw) : toValRaw,
      absolute_change: ind.isMoney ? toMoneyString(absDiff.toFixed(2)) : absDiff.toFixed(2),
      percentage_change: pctChange,
      direction,
      policy_flag: policyFlag,
      supporting_evidence_ids: toEvidenceIds.length > 0 ? toEvidenceIds : ['unsupported'],
    });
  }

  // Also add common human formatted versions of the numbers (e.g. without decimals if .00)
  const expandedNumbers = new Set<string>();
  for (const num of allowedNumbers) {
    expandedNumbers.add(num);
    const cleaned = num.replace(/,/g, '');
    expandedNumbers.add(cleaned);
    if (cleaned.endsWith('.00')) {
      expandedNumbers.add(cleaned.slice(0, -3));
    }
  }

  return {
    snapshot_from_no: fromSnap.snapshot_no,
    snapshot_to_no: toSnap.snapshot_no,
    from_metrics: from,
    to_metrics: to,
    deltas,
    allowed_numbers: Array.from(expandedNumbers),
    evidence_ids: toEvidenceIds,
  };
}
