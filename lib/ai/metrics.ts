import {
  computePropertyDelta,
  computeSnapshotDerivedMetrics,
  PropertySnapshotData,
  MetricDirection,
  IndicatorDelta,
  DeterministicDeltaResult,
} from './delta';

export type {
  PropertySnapshotData,
  MetricDirection,
  IndicatorDelta as MetricDelta,
};

export interface DeterministicMetrics extends DeterministicDeltaResult {}

export { computeSnapshotDerivedMetrics };

/**
 * Computes deterministic metric deltas (compatibility bridge to lib/ai/delta.ts)
 */
export function computeMetricDeltas(
  fromSnap: PropertySnapshotData,
  toSnap: PropertySnapshotData,
  toEvidenceIds: string[] = []
): DeterministicMetrics {
  const res = computePropertyDelta(fromSnap, toSnap, toEvidenceIds);
  // Support backwards-compatible M7 indicator names
  const legacyAliases: IndicatorDelta[] = [];
  for (const d of res.deltas) {
    if (d.indicator === 'valuation') legacyAliases.push({ ...d, indicator: 'valuation_inr' });
    if (d.indicator === 'occupancy') legacyAliases.push({ ...d, indicator: 'occupancy_pct' });
    if (d.indicator === 'operating_costs') legacyAliases.push({ ...d, indicator: 'operating_costs_inr' });
    if (d.indicator === 'annual_rent') legacyAliases.push({ ...d, indicator: 'annual_rent_inr' });
    if (d.indicator === 'gross_yield') legacyAliases.push({ ...d, indicator: 'gross_yield_pct' });
    if (d.indicator === 'net_income_yield') legacyAliases.push({ ...d, indicator: 'net_income_yield_pct' });
  }
  return {
    ...res,
    deltas: [...res.deltas, ...legacyAliases],
  };
}
