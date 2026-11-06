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
            Manage real-world property documentation, track Merkle-rooted evidence manifests, and review verification milestones.
          </p>
        </div>

        <Link
          href="/issuer/new"
          className="text-xs font-semibold px-4 py-2.5 rounded-lg bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-secondary)] transition-colors shadow-sm"
        >
          + New Property Submission
        </Link>
      </div>

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

