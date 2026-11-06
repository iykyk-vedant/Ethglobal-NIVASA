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
  manifest_version?: number;
  rights_version?: string;
  operating_costs_sourced?: boolean;
}

export type MetricDirection = 'improved' | 'weakened' | 'unchanged' | 'unsupported';

export type IndicatorKey =
  | 'valuation'
  | 'occupancy'
  | 'annual_rent'
  | 'operating_costs'
  | 'gross_yield'
  | 'net_operating_income'
  | 'net_income_yield'
  | 'checklist_completeness'
  | 'evidence_freshness'
  | 'version_change';

export interface IndicatorDelta {
  indicator: IndicatorKey | string;
  label: string;
  from: string;
  to: string;
  absolute_change: string;
  percentage_change: string;
  direction: MetricDirection;
  policy_flag: string | null;
  supporting_evidence_ids: string[];
  is_money: boolean;
  is_rate: boolean;
  is_percentage_points: boolean;
  unit: string;
}

export interface DeterministicDeltaResult {
  snapshot_from_no: number;
  snapshot_to_no: number;
  from_metrics: Record<string, string | boolean>;
  to_metrics: Record<string, string | boolean>;
  deltas: IndicatorDelta[];
  indicators: Record<string, IndicatorDelta>;
  allowed_numbers: string[];
  evidence_ids: string[];
}

/**
 * Computes deterministic derived financial and operational metrics for a property snapshot.
 * Uses exact Decimal arithmetic with zero floating-point math on monetary values (ARCH §16.4, §17.1).
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
  const noiInr = noi.toFixed(2);

  // Net income yield = (NOI ÷ valuation) * 100 (only when costs are sourced and present)
  let netIncomeYieldPct = '0.00';
  const costsSourced = snapshot.operating_costs_sourced !== false && !operatingCosts.isZero();
  if (!valuation.isZero() && costsSourced) {
    netIncomeYieldPct = noi.div(valuation).mul(100).toFixed(2);
  }

  // Days since valuation date (freshness)
  const asOfDate = new Date(snapshot.as_of);
  const valDate = new Date(snapshot.valuation_date);
  const diffDays = Math.max(0, Math.floor((asOfDate.getTime() - valDate.getTime()) / (1000 * 60 * 60 * 24)));

  return {
    valuation_inr: valuation.toFixed(2),
    annual_rent_inr: annualRent.toFixed(2),
    operating_costs_inr: operatingCosts.toFixed(2),
    occupancy_pct: occupancy.toFixed(2),
    gross_yield_pct: grossYieldPct,
    net_operating_income_inr: noiInr,
    net_income_yield_pct: netIncomeYieldPct,
    evidence_freshness_days: String(diffDays),
    checklist_completeness_pct: snapshot.checklist_completeness_pct || '100.00',
    manifest_version: snapshot.manifest_version ? `v${snapshot.manifest_version}` : 'v1',
    rights_version: snapshot.rights_version || 'v1.0',
    operating_costs_sourced: costsSourced,
  };
}

export interface ComputeDeltaOptions {
  manifestDocuments?: Array<{ id: string; document_type: string; sha256_hash?: string }>;
  manifestVersionFrom?: number;
  manifestVersionTo?: number;
  rightsVersionFrom?: string;
  rightsVersionTo?: string;
}

/**
 * Computes deterministic deltas between two property snapshots per ARCH §16.4.
 *
 * Emits for each indicator:
 * - from, to, absolute change, percentage change, direction, policy flag, supporting evidence IDs.
 * - Handles 'unsupported' when supporting evidence is absent or operating costs are unsourced.
 * - Reversible, strictly decimal-based, zero floating-point math on money.
 */
export function computePropertyDelta(
  fromSnap: PropertySnapshotData,
  toSnap: PropertySnapshotData,
  toEvidenceIds: string[] = [],
  options?: ComputeDeltaOptions
): DeterministicDeltaResult {
  const from = computeSnapshotDerivedMetrics(fromSnap);
  const to = computeSnapshotDerivedMetrics(toSnap);

  const manifestDocs = options?.manifestDocuments || [];
  const getDocIdsForType = (types: string[]): string[] => {
    const matched = manifestDocs
      .filter((d) => types.includes(d.document_type))
      .map((d) => d.id);
    if (matched.length > 0) return matched;
    // Fall back to toEvidenceIds if available
    const fallback = toEvidenceIds.filter((id) =>
      types.some((t) => id.toLowerCase().includes(t.toLowerCase().replace(/_/g, '')))
    );
    return fallback.length > 0 ? fallback : [];
  };

  const allowedNumbers = new Set<string>();
  const deltas: IndicatorDelta[] = [];
  const indicators: Record<string, IndicatorDelta> = {};

  // 1. Valuation
  {
    const fromDec = toDecimal(from.valuation_inr);
    const toDec = toDecimal(to.valuation_inr);
    const absDiff = toDec.minus(fromDec);
    const pctDiff = fromDec.isZero() ? '0.00' : absDiff.div(fromDec.abs()).mul(100).toFixed(2);
    const dir: MetricDirection = absDiff.gt(0) ? 'improved' : absDiff.lt(0) ? 'weakened' : 'unchanged';
    const evidenceIds = getDocIdsForType(['valuation_report']);
    const supporting = evidenceIds.length > 0 ? evidenceIds : toEvidenceIds.filter((id) => id.includes('val'));

    const delta: IndicatorDelta = {
      indicator: 'valuation',
      label: 'Valuation',
      from: toMoneyString(from.valuation_inr),
      to: toMoneyString(to.valuation_inr),
      absolute_change: toMoneyString(absDiff.toFixed(2)),
      percentage_change: pctDiff,
      direction: dir,
      policy_flag: null,
      supporting_evidence_ids: supporting.length > 0 ? supporting : ['unsupported'],
      is_money: true,
      is_rate: false,
      is_percentage_points: false,
      unit: 'INR',
    };
    deltas.push(delta);
    indicators['valuation'] = delta;
    allowedNumbers.add(from.valuation_inr);
    allowedNumbers.add(to.valuation_inr);
    allowedNumbers.add(absDiff.abs().toFixed(2));
    allowedNumbers.add(pctDiff);
  }

  // 2. Occupancy (percentage-point change vs percentage change)
  {
    const fromDec = toDecimal(from.occupancy_pct);
    const toDec = toDecimal(to.occupancy_pct);
    const absDiff = toDec.minus(fromDec); // percentage points
    const pctDiff = fromDec.isZero() ? '0.00' : absDiff.div(fromDec.abs()).mul(100).toFixed(2);
    const dir: MetricDirection = absDiff.gt(0) ? 'improved' : absDiff.lt(0) ? 'weakened' : 'unchanged';
    const policyFlag = toDec.lt(90) ? 'Occupancy fell below target 90%' : null;
    const evidenceIds = getDocIdsForType(['rent_roll', 'lease_rent_agreement', 'valuation_report']);
    const supporting = evidenceIds.length > 0 ? evidenceIds : toEvidenceIds.filter((id) => id.includes('rent') || id.includes('roll'));

    const delta: IndicatorDelta = {
      indicator: 'occupancy',
      label: 'Occupancy',
      from: `${from.occupancy_pct}%`,
      to: `${to.occupancy_pct}%`,
      absolute_change: `${absDiff.toFixed(2)} pp`,
      percentage_change: pctDiff,
      direction: dir,
      policy_flag: policyFlag,
      supporting_evidence_ids: supporting.length > 0 ? supporting : ['unsupported'],
      is_money: false,
      is_rate: true,
      is_percentage_points: true,
      unit: '%',
    };
    deltas.push(delta);
    indicators['occupancy'] = delta;
    allowedNumbers.add(from.occupancy_pct);
    allowedNumbers.add(to.occupancy_pct);
    allowedNumbers.add(absDiff.abs().toFixed(2));
    allowedNumbers.add(pctDiff);
    if (policyFlag) allowedNumbers.add('90');
  }

  // 3. Annual Rent
  {
    const fromDec = toDecimal(from.annual_rent_inr);
    const toDec = toDecimal(to.annual_rent_inr);
    const absDiff = toDec.minus(fromDec);
    const pctDiff = fromDec.isZero() ? '0.00' : absDiff.div(fromDec.abs()).mul(100).toFixed(2);
    const dir: MetricDirection = absDiff.gt(0) ? 'improved' : absDiff.lt(0) ? 'weakened' : 'unchanged';
    const evidenceIds = getDocIdsForType(['lease_rent_agreement', 'rent_roll']);
    const supporting = evidenceIds.length > 0 ? evidenceIds : toEvidenceIds.filter((id) => id.includes('rent'));

    const delta: IndicatorDelta = {
      indicator: 'annual_rent',
      label: 'Annual Rent',
      from: toMoneyString(from.annual_rent_inr),
      to: toMoneyString(to.annual_rent_inr),
      absolute_change: toMoneyString(absDiff.toFixed(2)),
      percentage_change: pctDiff,
      direction: dir,
      policy_flag: null,
      supporting_evidence_ids: supporting.length > 0 ? supporting : ['unsupported'],
      is_money: true,
      is_rate: false,
      is_percentage_points: false,
      unit: 'INR',
    };
    deltas.push(delta);
    indicators['annual_rent'] = delta;
    allowedNumbers.add(from.annual_rent_inr);
    allowedNumbers.add(to.annual_rent_inr);
    allowedNumbers.add(absDiff.abs().toFixed(2));
    allowedNumbers.add(pctDiff);
  }

  // 4. Operating Costs (CRITICAL: Higher cost is WEAKENED)
  {
    const fromDec = toDecimal(from.operating_costs_inr);
    const toDec = toDecimal(to.operating_costs_inr);
    const absDiff = toDec.minus(fromDec);
    const pctDiff = fromDec.isZero() ? '0.00' : absDiff.div(fromDec.abs()).mul(100).toFixed(2);
    const dir: MetricDirection = absDiff.gt(0) ? 'weakened' : absDiff.lt(0) ? 'improved' : 'unchanged';
    const policyFlag = absDiff.gt(0) ? 'Operating expenses increased' : null;
    const evidenceIds = getDocIdsForType(['operating_statement', 'property_tax_receipt', 'valuation_report']);
    const supporting = evidenceIds.length > 0 ? evidenceIds : toEvidenceIds.filter((id) => id.includes('cost') || id.includes('tax') || id.includes('val'));

    const delta: IndicatorDelta = {
      indicator: 'operating_costs',
      label: 'Operating Costs',
      from: toMoneyString(from.operating_costs_inr),
      to: toMoneyString(to.operating_costs_inr),
      absolute_change: toMoneyString(absDiff.toFixed(2)),
      percentage_change: pctDiff,
      direction: dir,
      policy_flag: policyFlag,
      supporting_evidence_ids: supporting.length > 0 ? supporting : ['unsupported'],
      is_money: true,
      is_rate: false,
      is_percentage_points: false,
      unit: 'INR',
    };
    deltas.push(delta);
    indicators['operating_costs'] = delta;
    allowedNumbers.add(from.operating_costs_inr);
    allowedNumbers.add(to.operating_costs_inr);
    allowedNumbers.add(absDiff.abs().toFixed(2));
    allowedNumbers.add(pctDiff);
  }

  // 5. Gross Yield (Rent ÷ Valuation)
  {
    const fromDec = toDecimal(from.gross_yield_pct);
    const toDec = toDecimal(to.gross_yield_pct);
    const absDiff = toDec.minus(fromDec); // percentage points
    const pctDiff = fromDec.isZero() ? '0.00' : absDiff.div(fromDec.abs()).mul(100).toFixed(2);
    const dir: MetricDirection = absDiff.gt(0) ? 'improved' : absDiff.lt(0) ? 'weakened' : 'unchanged';
    const evidenceIds = getDocIdsForType(['valuation_report', 'lease_rent_agreement']);
    const supporting = evidenceIds.length > 0 ? evidenceIds : toEvidenceIds.filter((id) => id.includes('val') || id.includes('rent'));

    const delta: IndicatorDelta = {
      indicator: 'gross_yield',
      label: 'Gross Yield',
      from: `${from.gross_yield_pct}%`,
      to: `${to.gross_yield_pct}%`,
      absolute_change: `${absDiff.toFixed(2)} pp`,
      percentage_change: pctDiff,
      direction: dir,
      policy_flag: null,
      supporting_evidence_ids: supporting.length > 0 ? supporting : ['unsupported'],
      is_money: false,
      is_rate: true,
      is_percentage_points: true,
      unit: '%',
    };
    deltas.push(delta);
    indicators['gross_yield'] = delta;
    allowedNumbers.add(from.gross_yield_pct);
    allowedNumbers.add(to.gross_yield_pct);
    allowedNumbers.add(absDiff.abs().toFixed(2));
    allowedNumbers.add(pctDiff);
  }

  // 6. Net Operating Income (NOI = Rent - Operating Costs)
  {
    const fromDec = toDecimal(from.net_operating_income_inr);
    const toDec = toDecimal(to.net_operating_income_inr);
    const absDiff = toDec.minus(fromDec);
    const pctDiff = fromDec.isZero() ? '0.00' : absDiff.div(fromDec.abs()).mul(100).toFixed(2);
    const dir: MetricDirection = absDiff.gt(0) ? 'improved' : absDiff.lt(0) ? 'weakened' : 'unchanged';
    const policyFlag = absDiff.lt(0) ? 'Net operating income declined' : null;
    const evidenceIds = getDocIdsForType(['lease_rent_agreement', 'operating_statement', 'valuation_report']);
    const supporting = evidenceIds.length > 0 ? evidenceIds : toEvidenceIds.filter((id) => id.includes('rent') || id.includes('val'));

    const delta: IndicatorDelta = {
      indicator: 'net_operating_income',
      label: 'Net Operating Income',
      from: toMoneyString(from.net_operating_income_inr),
      to: toMoneyString(to.net_operating_income_inr),
      absolute_change: toMoneyString(absDiff.toFixed(2)),
      percentage_change: pctDiff,
      direction: dir,
      policy_flag: policyFlag,
      supporting_evidence_ids: supporting.length > 0 ? supporting : ['unsupported'],
      is_money: true,
      is_rate: false,
      is_percentage_points: false,
      unit: 'INR',
    };
    deltas.push(delta);
    indicators['net_operating_income'] = delta;
    allowedNumbers.add(from.net_operating_income_inr);
    allowedNumbers.add(to.net_operating_income_inr);
    allowedNumbers.add(absDiff.abs().toFixed(2));
    allowedNumbers.add(pctDiff);
  }

  // 7. Net Income Yield (Only when costs are sourced and present)
  {
    const costsSourced = to.operating_costs_sourced;
    const fromDec = toDecimal(from.net_income_yield_pct);
    const toDec = toDecimal(to.net_income_yield_pct);
    const absDiff = toDec.minus(fromDec);
    const pctDiff = fromDec.isZero() ? '0.00' : absDiff.div(fromDec.abs()).mul(100).toFixed(2);
    const dir: MetricDirection = !costsSourced ? 'unsupported' : absDiff.gt(0) ? 'improved' : absDiff.lt(0) ? 'weakened' : 'unchanged';
    const policyFlag = !costsSourced ? 'Operating costs not independently sourced' : null;
    const evidenceIds = getDocIdsForType(['operating_statement', 'valuation_report']);
    const supporting = costsSourced ? (evidenceIds.length > 0 ? evidenceIds : toEvidenceIds.filter((id) => id.includes('val') || id.includes('cost'))) : ['unsupported'];

    const delta: IndicatorDelta = {
      indicator: 'net_income_yield',
      label: 'Net Income Yield',
      from: `${from.net_income_yield_pct}%`,
      to: costsSourced ? `${to.net_income_yield_pct}%` : 'N/A',
      absolute_change: costsSourced ? `${absDiff.toFixed(2)} pp` : 'N/A',
      percentage_change: costsSourced ? pctDiff : 'N/A',
      direction: dir,
      policy_flag: policyFlag,
      supporting_evidence_ids: supporting.length > 0 ? supporting : ['unsupported'],
      is_money: false,
      is_rate: true,
      is_percentage_points: true,
      unit: '%',
    };
    deltas.push(delta);
    indicators['net_income_yield'] = delta;
    if (costsSourced) {
      allowedNumbers.add(from.net_income_yield_pct);
      allowedNumbers.add(to.net_income_yield_pct);
      allowedNumbers.add(absDiff.abs().toFixed(2));
      allowedNumbers.add(pctDiff);
    }
  }

  // 8. Checklist Completeness
  {
    const fromDec = toDecimal(from.checklist_completeness_pct);
    const toDec = toDecimal(to.checklist_completeness_pct);
    const absDiff = toDec.minus(fromDec);
    const pctDiff = fromDec.isZero() ? '0.00' : absDiff.div(fromDec.abs()).mul(100).toFixed(2);
    const dir: MetricDirection = absDiff.gt(0) ? 'improved' : absDiff.lt(0) ? 'weakened' : 'unchanged';
    const policyFlag = toDec.lt(100) ? 'Checklist incomplete: missing required documents' : null;
    const supporting = toSnap.manifest_id ? [toSnap.manifest_id] : toEvidenceIds;

    const delta: IndicatorDelta = {
      indicator: 'checklist_completeness',
      label: 'Checklist Completeness',
      from: `${from.checklist_completeness_pct}%`,
      to: `${to.checklist_completeness_pct}%`,
      absolute_change: `${absDiff.toFixed(2)} pp`,
      percentage_change: pctDiff,
      direction: dir,
      policy_flag: policyFlag,
      supporting_evidence_ids: supporting.length > 0 ? supporting : ['unsupported'],
      is_money: false,
      is_rate: true,
      is_percentage_points: true,
      unit: '%',
    };
    deltas.push(delta);
    indicators['checklist_completeness'] = delta;
    allowedNumbers.add(from.checklist_completeness_pct);
    allowedNumbers.add(to.checklist_completeness_pct);
    allowedNumbers.add(absDiff.abs().toFixed(2));
    allowedNumbers.add(pctDiff);
    if (policyFlag) allowedNumbers.add('100');
  }

  // 9. Evidence Freshness (Days since valuation date: fewer is improved, more is weakened)
  {
    const fromDays = parseInt(from.evidence_freshness_days, 10);
    const toDays = parseInt(to.evidence_freshness_days, 10);
    const diffDays = toDays - fromDays;
    const dir: MetricDirection = diffDays > 0 ? 'weakened' : diffDays < 0 ? 'improved' : 'unchanged';
    const policyFlag = toDays > 180 ? 'Valuation report older than 6 months' : null;
    const evidenceIds = getDocIdsForType(['valuation_report']);
    const supporting = evidenceIds.length > 0 ? evidenceIds : toEvidenceIds.filter((id) => id.includes('val'));

    const delta: IndicatorDelta = {
      indicator: 'evidence_freshness',
      label: 'Evidence Freshness',
      from: `${from.evidence_freshness_days} days`,
      to: `${to.evidence_freshness_days} days`,
      absolute_change: `${diffDays > 0 ? `+${diffDays}` : String(diffDays)} days`,
      percentage_change: fromDays === 0 ? '0.00' : ((diffDays / fromDays) * 100).toFixed(2),
      direction: dir,
      policy_flag: policyFlag,
      supporting_evidence_ids: supporting.length > 0 ? supporting : ['unsupported'],
      is_money: false,
      is_rate: false,
      is_percentage_points: false,
      unit: 'days',
    };
    deltas.push(delta);
    indicators['evidence_freshness'] = delta;
    allowedNumbers.add(from.evidence_freshness_days);
    allowedNumbers.add(to.evidence_freshness_days);
    allowedNumbers.add(String(Math.abs(diffDays)));
  }

  // 10. Rights / Manifest Version Change
  {
    const manifestFrom = options?.manifestVersionFrom ? `v${options.manifestVersionFrom}` : from.manifest_version;
    const manifestTo = options?.manifestVersionTo ? `v${options.manifestVersionTo}` : to.manifest_version;
    const rightsFrom = options?.rightsVersionFrom || from.rights_version;
    const rightsTo = options?.rightsVersionTo || to.rights_version;
    const changed = manifestFrom !== manifestTo || rightsFrom !== rightsTo;

    const supporting = toSnap.manifest_id ? [toSnap.manifest_id] : toEvidenceIds;

    const delta: IndicatorDelta = {
      indicator: 'version_change',
      label: 'Version Updates',
      from: `Manifest ${manifestFrom} / Rights ${rightsFrom}`,
      to: `Manifest ${manifestTo} / Rights ${rightsTo}`,
      absolute_change: changed ? 'Updated' : 'Unchanged',
      percentage_change: '0.00',
      direction: changed ? 'improved' : 'unchanged',
      policy_flag: changed ? 'Evidence manifest or rights version advanced' : null,
      supporting_evidence_ids: supporting.length > 0 ? supporting : ['unsupported'],
      is_money: false,
      is_rate: false,
      is_percentage_points: false,
      unit: 'version',
    };
    deltas.push(delta);
    indicators['version_change'] = delta;
  }

  // Expand allowed numbers for validator (raw, no commas, trimmed decimals)
  const expandedNumbers = new Set<string>();
  for (const num of allowedNumbers) {
    expandedNumbers.add(num);
    const cleaned = num.replace(/,/g, '').trim();
    expandedNumbers.add(cleaned);
    if (cleaned.endsWith('.00')) {
      expandedNumbers.add(cleaned.slice(0, -3));
    }
  }

  // Allow standard digits 0, 1, 2, 85, 90, 100
  expandedNumbers.add('0');
  expandedNumbers.add('1');
  expandedNumbers.add('2');
  expandedNumbers.add('85');
  expandedNumbers.add('90');
  expandedNumbers.add('100');

  return {
    snapshot_from_no: fromSnap.snapshot_no,
    snapshot_to_no: toSnap.snapshot_no,
    from_metrics: from,
    to_metrics: to,
    deltas,
    indicators,
    allowed_numbers: Array.from(expandedNumbers),
    evidence_ids: toEvidenceIds,
  };
}
