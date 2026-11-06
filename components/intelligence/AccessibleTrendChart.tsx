import React from 'react';
import { PropertySnapshotData, computeSnapshotDerivedMetrics } from '@/lib/ai/delta';
import { formatINR } from '@/lib/money/decimal';

interface AccessibleTrendChartProps {
  snapshots: PropertySnapshotData[];
}

export function AccessibleTrendChart({ snapshots }: AccessibleTrendChartProps) {
  // ARCH §16.4 & UI §8.8: STRICT RULE: ONLY render chart when >= 3 snapshots exist!
  if (!snapshots || snapshots.length < 3) {
    return (
      <div className="p-4 rounded-xl border border-dashed border-border bg-surface-muted text-xs text-text-secondary flex items-center justify-between gap-4">
        <div>
          <span className="font-semibold text-text-primary block mb-0.5">
            Longitudinal Trend Visualization
          </span>
          <p>
            Historical trend charts are activated when 3 or more property snapshots exist (current count: {snapshots?.length || 0}). For 2 snapshots, side-by-side comparison and delta table provide the clearest mathematical representation.
          </p>
        </div>
        <span className="shrink-0 px-2.5 py-1 rounded bg-surface-card border border-border font-mono text-[11px] text-text-secondary">
          ≥ 3 snapshots required
        </span>
      </div>
    );
  }

  // Pre-compute metrics for all snapshots
  const parsedSnapshots = snapshots.map((s) => ({
    ...s,
    derived: computeSnapshotDerivedMetrics(s),
  }));

  // SVG dimensions for pure lightweight accessible chart
  const height = 180;
  const width = 600;
  const padding = 35;

  const valuations = parsedSnapshots.map((s) => parseFloat(s.derived.valuation_inr.replace(/,/g, '')));
  const minVal = Math.min(...valuations) * 0.95;
  const maxVal = Math.max(...valuations) * 1.05;
  const valRange = maxVal - minVal || 1;

  const points = parsedSnapshots.map((s, idx) => {
    const x = padding + (idx / (parsedSnapshots.length - 1)) * (width - 2 * padding);
    const val = parseFloat(s.derived.valuation_inr.replace(/,/g, ''));
    const y = height - padding - ((val - minVal) / valRange) * (height - 2 * padding);
    return { x, y, val, snapshot: s };
  });

  const pathD = points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');

  return (
    <div className="rounded-xl border border-border bg-surface-card overflow-hidden shadow-card p-5 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-text-primary">
          Historical Valuation Trend (Accessible SVG)
        </h3>
        <p className="text-xs text-text-secondary mt-0.5">
          Longitudinal tracking across {snapshots.length} verified/simulated snapshots. Paired with visible table fallback below.
        </p>
      </div>

      {/* Lightweight Accessible SVG Line Chart */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44 text-brand-primary"
          role="img"
          aria-label="Line chart showing property valuation trend across snapshots"
        >
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="currentColor" strokeOpacity="0.1" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="currentColor" strokeOpacity="0.1" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="currentColor" strokeOpacity="0.2" />

          {/* Path */}
          <path d={pathD} fill="none" stroke="currentColor" strokeWidth="2.5" />

          {/* Points */}
          {points.map((pt, i) => (
            <g key={i}>
              <circle cx={pt.x} cy={pt.y} r="4.5" fill="currentColor" />
              <text
                x={pt.x}
                y={pt.y - 10}
                textAnchor="middle"
                fontSize="10"
                fill="currentColor"
                className="font-mono"
              >
                Snap #{pt.snapshot.snapshot_no}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Accessible Data Table Fallback (UI §8.8 & §12 WCAG AA) */}
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="bg-surface-muted px-3 py-2 text-xs font-semibold text-text-secondary border-b border-border">
          Visible Accessible Data Table Fallback
        </div>
        <table className="w-full text-xs text-left">
          <thead className="bg-surface-card text-text-secondary border-b border-border">
            <tr>
              <th scope="col" className="p-2.5">Snapshot</th>
              <th scope="col" className="p-2.5">As-of Date</th>
              <th scope="col" className="p-2.5 text-right">Valuation</th>
              <th scope="col" className="p-2.5 text-right">Occupancy</th>
              <th scope="col" className="p-2.5 text-right">Gross Yield</th>
              <th scope="col" className="p-2.5">Provenance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {parsedSnapshots.map((s) => (
              <tr key={s.snapshot_no} className="hover:bg-surface-muted/50">
                <td className="p-2.5 font-medium font-mono text-text-primary">#{s.snapshot_no}</td>
                <td className="p-2.5 text-text-secondary">{new Date(s.as_of).toLocaleDateString()}</td>
                <td className="p-2.5 text-right font-mono font-medium text-text-primary">{formatINR(s.derived.valuation_inr)}</td>
                <td className="p-2.5 text-right font-mono text-text-secondary">{s.derived.occupancy_pct}%</td>
                <td className="p-2.5 text-right font-mono text-text-secondary">{s.derived.gross_yield_pct}%</td>
                <td className="p-2.5 text-text-secondary capitalize">{s.provenance.replace(/_/g, ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

