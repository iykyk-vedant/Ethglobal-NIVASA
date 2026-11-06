import React from 'react';
import { PropertySnapshotData, computeSnapshotDerivedMetrics } from '@/lib/ai/delta';
import { Badge } from '@/components/ui/Badge';
import { formatINR } from '@/lib/money/decimal';

interface SnapshotComparisonProps {
  snapshotFrom: PropertySnapshotData;
  snapshotTo: PropertySnapshotData;
}

function getProvenanceBadge(provenance: PropertySnapshotData['provenance']) {
  switch (provenance) {
    case 'independently_verified':
      return <Badge variant="success">Independently verified</Badge>;
    case 'issuer_reported':
      return <Badge variant="neutral">Issuer-reported</Badge>;
    case 'public_source':
      return <Badge variant="neutral">Public-source</Badge>;
    case 'simulated':
      return <Badge variant="warning">Simulated (Demo)</Badge>;
    case 'unknown':
    default:
      return <Badge variant="neutral">Unknown</Badge>;
  }
}

export function SnapshotComparison({ snapshotFrom, snapshotTo }: SnapshotComparisonProps) {
  const fromMetrics = computeSnapshotDerivedMetrics(snapshotFrom);
  const toMetrics = computeSnapshotDerivedMetrics(snapshotTo);

  return (
    <div className="rounded-xl border border-border bg-surface-card overflow-hidden shadow-card">
      <div className="p-4 border-b border-border bg-surface-muted flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-text-primary">
            Snapshot Side-by-Side Comparison
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Baseline versus latest published property state. Pre-computed exact figures.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
        {/* Snapshot From */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-muted border border-border text-text-secondary">
                Snapshot #{snapshotFrom.snapshot_no}
              </span>
              <h4 className="text-sm font-semibold text-text-primary mt-1">Baseline State</h4>
            </div>
            {getProvenanceBadge(snapshotFrom.provenance)}
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-secondary">As-of Date</span>
              <span className="font-mono text-text-primary">{new Date(snapshotFrom.as_of).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-secondary">Valuation Amount</span>
              <span className="font-mono font-medium text-text-primary">{formatINR(fromMetrics.valuation_inr)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-secondary">Occupancy</span>
              <span className="font-mono font-medium text-text-primary">{fromMetrics.occupancy_pct}%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-secondary">Annual Rent</span>
              <span className="font-mono text-text-primary">{formatINR(fromMetrics.annual_rent_inr)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-secondary">Operating Costs</span>
              <span className="font-mono text-text-primary">{formatINR(fromMetrics.operating_costs_inr)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-secondary">Gross Yield (Rent ÷ Val)</span>
              <span className="font-mono font-medium text-text-primary">{fromMetrics.gross_yield_pct}%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-secondary">Net Operating Income</span>
              <span className="font-mono font-medium text-text-primary">{formatINR(fromMetrics.net_operating_income_inr)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-secondary">Net Income Yield</span>
              <span className="font-mono text-text-primary">{fromMetrics.net_income_yield_pct}%</span>
            </div>
          </div>

          {snapshotFrom.event_note && (
            <div className="p-3 rounded-lg bg-surface-muted text-xs text-text-secondary border border-border">
              <span className="font-medium text-text-primary block mb-0.5">Event Note:</span>
              {snapshotFrom.event_note}
            </div>
          )}
        </div>

        {/* Snapshot To */}
        <div className="p-5 space-y-4 bg-surface-muted/30">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-muted border border-border text-text-secondary">
                Snapshot #{snapshotTo.snapshot_no}
              </span>
              <h4 className="text-sm font-semibold text-text-primary mt-1">Updated State</h4>
            </div>
            {getProvenanceBadge(snapshotTo.provenance)}
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-secondary">As-of Date</span>
              <span className="font-mono text-text-primary">{new Date(snapshotTo.as_of).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-secondary">Valuation Amount</span>
              <span className="font-mono font-medium text-text-primary">{formatINR(toMetrics.valuation_inr)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-secondary">Occupancy</span>
              <span className="font-mono font-medium text-text-primary">{toMetrics.occupancy_pct}%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-secondary">Annual Rent</span>
              <span className="font-mono text-text-primary">{formatINR(toMetrics.annual_rent_inr)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-secondary">Operating Costs</span>
              <span className="font-mono text-text-primary">{formatINR(toMetrics.operating_costs_inr)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-secondary">Gross Yield (Rent ÷ Val)</span>
              <span className="font-mono font-medium text-text-primary">{toMetrics.gross_yield_pct}%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-secondary">Net Operating Income</span>
              <span className="font-mono font-medium text-text-primary">{formatINR(toMetrics.net_operating_income_inr)}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-text-secondary">Net Income Yield</span>
              <span className="font-mono text-text-primary">
                {toMetrics.operating_costs_sourced ? `${toMetrics.net_income_yield_pct}%` : 'Unsupported'}
              </span>
            </div>
          </div>

          {snapshotTo.event_note && (
            <div className="p-3 rounded-lg bg-surface-muted text-xs text-text-secondary border border-border">
              <span className="font-medium text-text-primary block mb-0.5">Event Note:</span>
              {snapshotTo.event_note}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
