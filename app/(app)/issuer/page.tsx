import React from 'react';
import Link from 'next/link';
import { getAdminDbClient } from '@/lib/db/admin';
import { getCurrentUser } from '@/lib/auth/server-session';
import { Badge } from '@/components/ui/Badge';

export default async function IssuerDashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null; // The issuer layout redirects unauthenticated visitors.
  const adminDb = getAdminDbClient();

  let propertiesQuery = adminDb
    .from('properties')
    .select('*, evidence_manifests(version, checklist_completeness, status)')
    .order('created_at', { ascending: false });
  if (!user.roles.includes('admin')) propertiesQuery = propertiesQuery.eq('issuer_id', user.userId);
  const { data: properties } = await propertiesQuery;

  let offeringsQuery = adminDb
    .from('offerings')
    .select('id, property_id, token_name, token_symbol, status, ats_asset_ref, token_contract_id, token_evm_address, created_at')
    .order('created_at', { ascending: false });
  if (!user.roles.includes('admin')) offeringsQuery = offeringsQuery.eq('issuer_id', user.userId);
  const { data: offerings } = await offeringsQuery;
  const propertyNames = new Map((properties || []).map((property) => [property.id, property.name]));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-[var(--border)] pb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-[var(--text-secondary)] mb-1">
            Issuer Portal · Maharashtra RWA
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Issuer Property Submissions
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manage property evidence, follow offering proposals, and inspect token and chain status.
          </p>
        </div>

        <Link
          href="/issuer/new"
          className="text-xs font-semibold px-4 py-2.5 rounded-lg bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-secondary)] transition-colors shadow-sm"
        >
          + New Property Submission
        </Link>
      </div>

      <section id="offerings" className="scroll-mt-20 space-y-4" aria-labelledby="issuer-offerings-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="issuer-offerings-heading" className="text-lg font-semibold text-[var(--text-primary)]">My Offerings &amp; Tokens</h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">Proposals and their current on-chain deployment status.</p>
          </div>
          <span className="text-xs text-[var(--text-secondary)]">{offerings?.length || 0} total</span>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] overflow-hidden shadow-sm divide-y divide-[var(--border)]">
          {offerings && offerings.length > 0 ? offerings.map((offering) => {
            const chainReference = offering.token_contract_id || offering.token_evm_address;
            const statusVariant = offering.status === 'active' ? 'success' : offering.status.startsWith('paused') ? 'warning' : 'pending';
            return (
              <article key={offering.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-sm text-[var(--text-primary)]">{offering.token_name}</h3>
                    <span className="font-mono text-xs text-[var(--text-secondary)]">{offering.token_symbol}</span>
                    <Badge variant={statusVariant}>{offering.status.replaceAll('_', ' ')}</Badge>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">Property: {propertyNames.get(offering.property_id) || 'Property record'}</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {chainReference ? <>ATS reference: <span className="font-mono">{chainReference}</span></> : 'Token deployment is pending activation and chain confirmation.'}
                  </p>
                </div>
                <Link
                  href={`/offerings/${offering.id}`}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                >
                  View token &amp; chain status <span aria-hidden="true" className="ml-1">→</span>
                </Link>
              </article>
            );
          }) : (
            <p className="p-5 text-sm text-[var(--text-secondary)]">No offerings yet. Open a verified property with an approved manifest to create an offering proposal.</p>
          )}
        </div>
      </section>

      {/* Properties List */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-muted)]">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Onboarded Assets & Evidence Sets
          </h3>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {properties && properties.length > 0 ? (
            properties.map((prop) => {
              const latestManifest = prop.evidence_manifests?.[prop.evidence_manifests.length - 1];
              const isVerified = prop.verification_status === 'verified';

              return (
                <div
                  key={prop.id}
                  className="p-5 flex flex-wrap items-center justify-between gap-4 hover:bg-[var(--surface-muted)] transition-colors"
                >
                  <div className="space-y-1.5 max-w-lg">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-[var(--text-primary)]">
                        {prop.name}
                      </span>
                      <Badge
                        variant={
                          isVerified
                            ? 'success'
                            : prop.verification_status === 'submitted'
                            ? 'info'
                            : 'neutral'
                        }
                      >
                        {isVerified ? 'Demo Review Completed' : prop.verification_status.toUpperCase()}
                      </Badge>
                    </div>

                    <div className="text-xs text-[var(--text-secondary)]">
                      {prop.city}, {prop.locality} · {prop.built_up_area_sqm} sqm built-up area
                    </div>

                    <div className="text-xs text-[var(--text-secondary)] font-mono">
                      Asset Ref: {prop.id}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-6">
                    <div className="text-right text-xs">
                      <div className="text-[var(--text-secondary)]">Checklist Completeness</div>
                      <div className="font-mono font-bold text-sm text-[var(--text-primary)]">
                        {latestManifest?.checklist_completeness || 0}%
                      </div>
                      <div className="text-[10px] text-[var(--text-secondary)]">
                        {latestManifest ? `Manifest v${latestManifest.version}` : 'No manifest'}
                      </div>
                    </div>

                    <Link
                      href={`/issuer/properties/${prop.id}`}
                      className="text-xs font-semibold px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-primary)] hover:bg-[var(--surface-card)] transition-colors"
                    >
                      Manage Evidence &rarr;
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
              No property submissions found. Click &quot;+ New Property Submission&quot; to begin onboarding an asset.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

