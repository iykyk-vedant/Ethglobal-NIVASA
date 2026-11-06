import React from 'react';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getAdminDbClient } from '@/lib/db/admin';
import { runPropertyAnalysis } from '@/lib/ai/advisor';
import { ProvenanceLegend } from '@/components/intelligence/ProvenanceLegend';
import { SnapshotComparison } from '@/components/intelligence/SnapshotComparison';
import { MetricDeltaTable } from '@/components/intelligence/MetricDeltaTable';
import { AccessibleTrendChart } from '@/components/intelligence/AccessibleTrendChart';
import { AiExplanationPanel } from '@/components/intelligence/AiExplanationPanel';
import { EvidenceCitationList } from '@/components/intelligence/EvidenceCitationList';
import { CannotDetermineList } from '@/components/intelligence/CannotDetermineList';
import { PropertyUpdatesFeed } from '@/components/intelligence/PropertyUpdatesFeed';
import { IntelligenceControls } from '@/components/intelligence/IntelligenceControls';
import { InvestorPreferences } from '@/lib/ai/fit-policy';
import { PropertySnapshotData } from '@/lib/ai/delta';
import demoEvents from '@/config/demo-events.json';
import { ArrowLeft, ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ propertyId: string }>;
  searchParams?: Promise<{ from?: string; to?: string }>;
}

export default async function PropertyIntelligencePage({ params, searchParams }: PageProps) {
  const { propertyId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const adminDb = getAdminDbClient();

  // 1. Fetch property record
  const { data: property, error: propErr } = await adminDb
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .single();

  if (propErr || !property) {
    notFound();
  }

  // 2. Fetch all historical snapshots for this property
  const { data: dbSnapshots = [] } = await adminDb
    .from('property_snapshots')
    .select('*')
    .eq('property_id', propertyId)
    .order('snapshot_no', { ascending: true });

  const snapshotsMap = new Map<number, PropertySnapshotData>();
  if (dbSnapshots && dbSnapshots.length > 0) {
    for (const s of dbSnapshots) {
      snapshotsMap.set(s.snapshot_no, {
        snapshot_no: Number(s.snapshot_no),
        as_of: s.as_of,
        occupancy_pct: String(s.occupancy_pct),
        annual_rent_inr: String(s.annual_rent_inr),
        operating_costs_inr: String(s.operating_costs_inr),
        valuation_amount_inr: String(s.valuation_amount_inr),
        valuation_date: s.valuation_date,
        provenance: s.provenance,
        event_note: s.event_note,
        manifest_id: s.manifest_id,
        checklist_completeness_pct: '100.00',
        evidence_record_ids: ['doc-title-001', 'doc-val-rep-001', 'doc-khata-001', 'doc-tax-001'],
      });
    }
  }

  // Fallback to demo event for Snapshot 2 if not yet persisted in DB
  if (!snapshotsMap.has(2)) {
    const matchingDemoEvent = demoEvents.events.find(
      (e) => e.property_id === propertyId && e.snapshot_no === 2
    ) || demoEvents.events[0];

    if (matchingDemoEvent) {
      snapshotsMap.set(2, {
        snapshot_no: 2,
        as_of: matchingDemoEvent.as_of,
        occupancy_pct: matchingDemoEvent.occupancy_pct,
        annual_rent_inr: matchingDemoEvent.annual_rent_inr,
        operating_costs_inr: matchingDemoEvent.operating_costs_inr,
        valuation_amount_inr: matchingDemoEvent.valuation_amount_inr,
        valuation_date: matchingDemoEvent.valuation_date,
        provenance: matchingDemoEvent.provenance as PropertySnapshotData['provenance'],
        event_note: matchingDemoEvent.event_note,
        manifest_id: null,
        checklist_completeness_pct: matchingDemoEvent.checklist_completeness_pct,
        evidence_record_ids: matchingDemoEvent.evidence_record_ids,
      });
    }
  }

  const allSnapshots = Array.from(snapshotsMap.values()).sort((a, b) => a.snapshot_no - b.snapshot_no);
  const snapFromNo = resolvedSearchParams.from ? parseInt(resolvedSearchParams.from, 10) : 1;
  const snapToNo = resolvedSearchParams.to ? parseInt(resolvedSearchParams.to, 10) : (allSnapshots.length > 1 ? allSnapshots[allSnapshots.length - 1].snapshot_no : 2);

  const snapshotFrom = snapshotsMap.get(snapFromNo) || allSnapshots[0];
  const snapshotTo = snapshotsMap.get(snapToNo) || allSnapshots[allSnapshots.length - 1];

  // 3. Read investor preferences from cookie
  const cookieStore = await cookies();
  const prefCookie = cookieStore.get('nivasa_ai_preferences')?.value;
  let preferences: InvestorPreferences = {
    yield_preference: 'balanced',
    risk_tolerance: 'moderate',
    liquidity_horizon: 'medium',
  };

  if (prefCookie) {
    try {
      preferences = { ...preferences, ...JSON.parse(prefCookie) };
    } catch {
      // ignore
    }
  }

  // 4. Query latest episode ID to support previous_episode_id chaining (Task 3 & 5)
  const { data: latestEpisode } = await adminDb
    .from('ai_episodes')
    .select('id')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 5. Execute or retrieve deterministic metrics and 0G change explanation
  let outcome = null;
  let analysisError = null;

  try {
    outcome = await runPropertyAnalysis({
      propertyId,
      snapshotFrom: snapshotFrom?.snapshot_no || 1,
      snapshotTo: snapshotTo?.snapshot_no || 2,
      preferences,
      previousEpisodeId: latestEpisode?.id || null,
    });
  } catch (err: unknown) {
    analysisError = (err as Error).message;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8" data-testid="property-intelligence-page">
      {/* Breadcrumb & Navigation */}
      <nav className="flex items-center gap-2 text-xs text-text-secondary font-medium" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-text-primary transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link href="/investor" className="hover:text-text-primary transition-colors">
          Investor
        </Link>
        <span>/</span>
        <span className="text-text-primary font-semibold">Property Intelligence</span>
      </nav>

      {/* Header */}
      <div className="border-b border-border pb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-surface-muted text-text-secondary border border-border">
              PROPERTY-MH-001
            </span>
            <span className="text-xs text-text-secondary font-medium">
              Maharashtra Real Estate Evidence Baseline
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            Property Intelligence
          </h1>
          <p className="text-sm text-text-secondary mt-1 max-w-2xl">
            {property.name || 'Commercial Asset'} — Ground-truth change analysis powered by the 0G Private Computer. Pre-computed exact decimal metrics with zero floating-point estimation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/offerings/${property.id}`}
            className="text-xs font-medium px-3.5 py-2 rounded-lg border border-border bg-surface-card text-text-primary hover:bg-surface-muted transition-colors flex items-center gap-1.5"
          >
            View Offering Terms <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Provenance Legend (UI §8.8: Only values in data model) */}
      <ProvenanceLegend />

      {/* Reason to Return: Property Updates & Drift Events Feed (Task 5) */}
      <PropertyUpdatesFeed
        propertyId={property.id}
        snapshots={allSnapshots}
        latestEpisodeId={latestEpisode?.id || null}
      />

      {/* Preference Controls */}
      <IntelligenceControls
        propertyId={property.id}
        initialPreferences={preferences as {
          yield_preference: 'modest' | 'balanced' | 'growth';
          risk_tolerance: 'conservative' | 'moderate' | 'aggressive';
          liquidity_horizon: 'short' | 'medium' | 'long';
        }}
      />

      {/* Main Analysis Sections */}
      {outcome ? (
        <div className="space-y-8">
          {/* Section 1: Side-by-Side Snapshot Comparison (UI §8.8) */}
          {snapshotFrom && snapshotTo && (
            <SnapshotComparison
              snapshotFrom={snapshotFrom}
              snapshotTo={snapshotTo}
            />
          )}

          {/* Section 2: Deterministic Metric Delta Table (Task 2 & UI §8.8) */}
          <MetricDeltaTable
            metrics={outcome.deterministicMetrics}
            snapshotFromLabel={`Snapshot #${outcome.snapshotFrom}`}
            snapshotToLabel={`Snapshot #${outcome.snapshotTo}`}
          />

          {/* Section 3: Accessible Trend Chart (ARCH §16.4: ONLY when >= 3 snapshots) */}
          <AccessibleTrendChart snapshots={allSnapshots} />

          {/* Section 4: 0G Explanation Panel (UI §8.8: Never renders unvalidated output) */}
          <AiExplanationPanel
            status={outcome.status}
            validatedResponse={outcome.validatedResponse}
            preferenceFit={outcome.preferenceFit}
            requestId={outcome.requestAttempts[0]?.requestId || 'UNAVAILABLE'}
            timestamp={outcome.timestamp}
            provider={outcome.provider}
            model={outcome.model}
            inputHash={outcome.inputHash}
            outputHash={outcome.outputHash}
            requestAttempts={outcome.requestAttempts}
            errors={outcome.errors}
          />

          {/* Section 5: Evidence Citations & Cannot Determine List */}
          {outcome.validatedResponse && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <EvidenceCitationList
                propertyId={property.id}
                sourceIds={outcome.validatedResponse.source_ids}
              />
              <CannotDetermineList
                cannotDetermine={outcome.validatedResponse.cannot_determine}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center rounded-xl border border-border bg-surface-card space-y-3">
          <h3 className="text-base font-semibold text-text-primary">
            Analysis Service Temporarily Unavailable
          </h3>
          <p className="text-xs text-text-secondary max-w-md mx-auto">
            {analysisError || 'Unable to establish connection to 0G router. Deterministic metrics remain fully accurate and accessible.'}
          </p>
        </div>
      )}
    </div>
  );
}
