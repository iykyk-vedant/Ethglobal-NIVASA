"use client";

import React, { useState } from 'react';
import { PropertySnapshotData } from '@/lib/ai/delta';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Sparkles, Calendar, ArrowRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PropertyUpdatesFeedProps {
  propertyId: string;
  snapshots: PropertySnapshotData[];
  latestEpisodeId?: string | null;
}

export function PropertyUpdatesFeed({
  propertyId,
  snapshots,
  latestEpisodeId,
}: PropertyUpdatesFeedProps) {
  const router = useRouter();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAnalyzeSinceLast = async () => {
    try {
      setIsAnalyzing(true);
      setErrorMsg(null);

      const snapFrom = snapshots.length > 1 ? snapshots[snapshots.length - 2].snapshot_no : 1;
      const snapTo = snapshots[snapshots.length - 1].snapshot_no;

      const res = await fetch('/api/ai/analyze-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          snapshotFrom: snapFrom,
          snapshotTo: snapTo,
          previousEpisodeId: latestEpisodeId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to trigger change analysis');
      }

      router.refresh();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface-card overflow-hidden shadow-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <h3 className="text-base font-semibold text-text-primary">
            Property Updates & Drift Events Feed
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Append-only history of published evidence packages and scripted events (Reason to return).
          </p>
        </div>

        <Button
          onClick={handleAnalyzeSinceLast}
          disabled={isAnalyzing || snapshots.length < 2}
          className="bg-brand-primary text-white hover:bg-brand-primary/90 text-xs flex items-center gap-1.5"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Analyzing with 0G...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              Analyze What Changed
            </>
          )}
        </Button>
      </div>

      {errorMsg && (
        <div className="p-3 text-xs text-status-danger bg-status-danger/10 border border-status-danger/20 rounded-lg">
          {errorMsg}
        </div>
      )}

      <div className="space-y-3">
        {snapshots.map((snap) => (
          <div
            key={snap.snapshot_no}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border border-border bg-surface-muted/40 hover:bg-surface-muted transition-colors gap-3"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface-card border border-border text-text-primary">
                  Snapshot #{snap.snapshot_no}
                </span>
                <span className="text-xs text-text-secondary flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(snap.as_of).toLocaleDateString()}
                </span>
                <Badge
                  variant={snap.provenance === 'simulated' ? 'warning' : 'neutral'}
                  className="text-[10px]"
                >
                  {snap.provenance.replace(/_/g, ' ')}
                </Badge>
              </div>
              <p className="text-xs text-text-secondary font-medium">
                {snap.event_note || 'Baseline valuation and property onboarding'}
              </p>
            </div>

            <div className="text-right sm:shrink-0 text-xs">
              <span className="text-text-secondary block">Valuation</span>
              <span className="font-mono font-medium text-text-primary">
                ₹{snap.valuation_amount_inr}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
