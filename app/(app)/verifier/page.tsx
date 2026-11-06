import React from 'react';
import Link from 'next/link';
import { getAdminDbClient } from '@/lib/db/admin';
import { Badge } from '@/components/ui/Badge';

export default async function VerifierDashboardPage() {
  const adminDb = getAdminDbClient();

  const { data: properties } = await adminDb
    .from('properties')
    .select('*, evidence_manifests(id, version, checklist_completeness, status, merkle_root, created_at)')
    .order('created_at', { ascending: false });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-[var(--border)] pb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-mono text-[var(--text-secondary)] mb-1">
            Independent Verification Portal · Maharashtra Jurisdiction
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            Evidence Verification Queue
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Perform independent title and evidence review on Merkle-rooted document manifests. Verifier determinations are bound to an immutable manifest version.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/verifier/eligibility/demo-investor-eligible"
            className="text-xs px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Investor Eligibility Queue &rarr;
          </Link>
          <Link
            href="/issuer"
            className="text-xs px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Issuer Portal &rarr;
          </Link>
        </div>
      </div>

      {/* Separation of Duties Compliance Callout */}
      <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] flex items-start gap-3 text-xs text-[var(--text-secondary)]">
        <div className="text-base text-[var(--brand-primary)]">🛡️</div>
        <div className="space-y-0.5">
          <span className="font-semibold text-[var(--text-primary)]">
            Separation of Duties (SoD) Active (ARCH §10.5, §19):
          </span>
          <p>
            An issuer can never review or verify their own property submission. Each decision requires a signed rationale and is permanently logged in the append-only verification audit log.
          </p>
        </div>
      </div>

      {/* Queue Table */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-muted)]">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Properties Submitted for Review
          </h3>
        </div>

        <div className="divide-y divide-[var(--border)]">
          {properties && properties.length > 0 ? (
            properties.map((prop) => {
              const manifests = prop.evidence_manifests || [];
              const latestManifest = manifests.length > 0 ? manifests[manifests.length - 1] : null;
              const isVerified = prop.verification_status === 'verified';
              const isSubmitted = prop.verification_status === 'submitted';

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
                            : isSubmitted
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

                    <div className="text-xs font-mono text-[var(--text-secondary)]">
                      Asset Ref: {prop.id}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-6">
                    <div className="text-right text-xs">
                      <div className="text-[var(--text-secondary)]">Checklist Completeness</div>
                      <div className="font-mono font-bold text-sm text-[var(--text-primary)]">
                        {latestManifest?.checklist_completeness || 0}%
                      </div>
                      <div className="text-[10px] text-[var(--text-secondary)] font-mono">
                        {latestManifest ? `Root: ${latestManifest.merkle_root.slice(0, 10)}...` : 'No manifest'}
                      </div>
                    </div>

                    <Link
                      href={`/verifier/properties/${prop.id}`}
                      className="text-xs font-semibold px-4 py-2 rounded-lg bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-secondary)] transition-colors shadow-sm"
                    >
                      Review Evidence &rarr;
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
              No properties in queue.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

