import React from 'react';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getAdminDbClient } from '@/lib/db/admin';
import { runPropertyAnalysis } from '@/lib/ai/advisor';
import { ProvenanceLegend } from '@/components/intelligence/ProvenanceLegend';
import { DeterministicMetricsTable } from '@/components/intelligence/DeterministicMetricsTable';
import { AiExplanationPanel } from '@/components/intelligence/AiExplanationPanel';
import { IntelligenceControls } from '@/components/intelligence/IntelligenceControls';
import { InvestorPreferences } from '@/lib/ai/fit-policy';

interface PageProps {
  params: Promise<{ propertyId: string }>;
}

export default async function PropertyIntelligencePage({ params }: PageProps) {
  const { propertyId } = await params;
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

  // 2. Read preferences from cookie
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

  // 3. Run analysis
  let outcome = null;
  let analysisError = null;

  try {
    outcome = await runPropertyAnalysis({
      propertyId,
      snapshotFrom: 1,
      snapshotTo: 2,
      preferences,
    });
  } catch (err: unknown) {
    analysisError = (err as Error).message;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Breadcrumb & Navigation */}
      <nav className="flex items-center gap-2 text-xs text-[var(--text-secondary)] font-medium">
        <Link href="/" className="hover:text-[var(--text-primary)] transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link href="/investor" className="hover:text-[var(--text-primary)] transition-colors">
          Investor
        </Link>
        <span>/</span>
        <span className="text-[var(--text-primary)]">Property Intelligence</span>
      </nav>

      {/* Header */}
      <div className="border-b border-[var(--border)] pb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[var(--surface-muted)] text-[var(--text-secondary)] border border-[var(--border)]">
              {property.asset_ref}
            </span>
            <span className="text-xs text-[var(--text-secondary)] font-medium">
              Verified Real Estate Asset
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Property Intelligence
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-2xl">
            {property.title} — Ground-truth change analysis powered by the 0G Private Computer. Pre-computed exact decimal metrics with zero floating-point estimation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/offerings/${property.id}`}
            className="text-xs font-medium px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-card)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)] transition-colors"
          >
            View Offering Terms →
          </Link>
        </div>
      </div>

      {/* Provenance Legend */}
      <ProvenanceLegend />

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
          {/* Section 1: Deterministic Metrics Table */}
          <DeterministicMetricsTable
            metrics={outcome.deterministicMetrics}
            snapshotFromLabel="Snapshot 1 (Baseline)"
            snapshotToLabel="Snapshot 2 (Scripted Update)"
          />

          {/* Section 2: 0G Explanation Panel */}
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
        </div>
      ) : (
        <div className="p-8 text-center rounded-xl border border-[var(--border)] bg-[var(--surface-card)] space-y-3">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            Analysis Service Temporarily Unavailable
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
            {analysisError || 'Unable to load snapshot metrics or establish connection to 0G router.'}
          </p>
        </div>
      )}
    </div>
  );
}

