import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminDbClient } from '@/lib/db/admin';
import { calculateChecklistCompleteness } from '@/lib/evidence/checklist';
import { ManifestRootCard } from '@/components/evidence/ManifestRootCard';
import { ManifestDiffViewer } from '@/components/evidence/ManifestDiffViewer';
import { EvidenceChecklistTable } from '@/components/evidence/EvidenceChecklistTable';
import { ReviewDecisionForm } from '@/components/evidence/ReviewDecisionForm';
import { Badge } from '@/components/ui/Badge';

interface Props {
  params: Promise<{ id: string }>;
}

function getVerificationSummaryText(summary: unknown): string | null {
  if (typeof summary === 'string') return summary;
  if (summary && typeof summary === 'object' && 'reason' in summary) {
    const reason = (summary as { reason?: unknown }).reason;
    return typeof reason === 'string' ? reason : null;
  }
  return null;
}

export default async function VerifierPropertyReviewPage({ params }: Props) {
  const { id } = await params;
  const adminDb = getAdminDbClient();

  // 1. Fetch Property
  const { data: property, error: propErr } = await adminDb
    .from('properties')
    .select('*')
    .eq('id', id)
    .single();

  if (propErr || !property) {
    notFound();
  }

  // 2. Fetch Manifests
  const { data: manifests, error: manifestsErr } = await adminDb
    .from('evidence_manifests')
    .select('*')
    .eq('property_id', id)
    .order('version', { ascending: false });

  if (manifestsErr) throw new Error(`Failed to load evidence manifests: ${manifestsErr.message}`);

  const manifestList = manifests || [];
  const latestManifest = manifestList.length > 0 ? manifestList[0] : null;
  const previousManifest = manifestList.length > 1 ? manifestList[1] : null;

  // 3. Fetch Active Documents
  const { data: documents, error: documentsErr } = await adminDb
    .from('property_documents')
    .select('*')
    .eq('property_id', id)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (documentsErr) throw new Error(`Failed to load evidence documents: ${documentsErr.message}`);

  const activeDocs = documents || [];

  // 4. Calculate Checklist Evaluation
  const checklistEvaluation = calculateChecklistCompleteness(
    activeDocs.map((d) => ({
      id: d.id,
      document_type: d.document_type,
      status: d.status,
      issued_at: d.issued_at,
      valid_until: d.valid_until,
      received_at: d.received_at,
    }))
  );

  // 5. Fetch Verification History
  const { data: verificationRows, error: verificationsErr } = await adminDb
    .from('property_verifications')
    .select('*')
    .eq('property_id', id)
    .order('decided_at', { ascending: false });

  if (verificationsErr) throw new Error(`Failed to load verification history: ${verificationsErr.message}`);

  const reviewerIds = Array.from(new Set((verificationRows || []).map((row) => row.reviewer_id).filter(Boolean)));
  let reviewerNames = new Map<string, string>();
  if (reviewerIds.length > 0) {
    const { data: reviewers, error: reviewersErr } = await adminDb
      .from('profiles')
      .select('id, display_name')
      .in('id', reviewerIds);
    if (reviewersErr) throw new Error(`Failed to load verifier names: ${reviewersErr.message}`);
    reviewerNames = new Map((reviewers || []).map((reviewer) => [reviewer.id, reviewer.display_name]));
  }
  const verifications = (verificationRows || []).map((row) => ({
    ...row,
    reviewer: { display_name: reviewerNames.get(row.reviewer_id) || null },
  }));

  // 6. Separation of Duties (SoD) Check
  // Default verifier persona: Anand Verma (Title Verifier)
  const defaultVerifierId = '1521f5eb-844c-4f21-85b3-b258c0e19fe4';
  const isEligibleVerifier = property.issuer_id !== defaultVerifierId;
  const sodReason = !isEligibleVerifier
    ? 'Separation of Duties violation: The active user identity matches the property issuer. An issuer cannot verify their own property.'
    : undefined;

  const currentManifestData = latestManifest
    ? {
        version: latestManifest.version,
        merkle_root: latestManifest.merkle_root,
        manifest_hash: latestManifest.manifest_hash,
        documents: Array.isArray(latestManifest.manifest_json?.documents) ? latestManifest.manifest_json.documents : [],
      }
    : null;

  const previousManifestData = previousManifest
    ? {
        version: previousManifest.version,
        merkle_root: previousManifest.merkle_root,
        manifest_hash: previousManifest.manifest_hash,
        documents: Array.isArray(previousManifest.manifest_json?.documents) ? previousManifest.manifest_json.documents : [],
      }
    : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
        <Link href="/verifier" className="hover:text-[var(--text-primary)] transition-colors">
          Verifier Queue
        </Link>
        <span>/</span>
        <span className="font-mono text-[var(--text-primary)]">{property.name}</span>
      </div>

      {/* Header */}
      <div className="border-b border-[var(--border)] pb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              {property.name}
            </h1>
            <Badge
              variant={
                property.verification_status === 'verified'
                  ? 'success'
                  : property.verification_status === 'submitted'
                  ? 'info'
                  : 'neutral'
              }
            >
              {property.verification_status === 'verified'
                ? 'Demo Review Completed'
                : property.verification_status.toUpperCase()}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            {property.address_line_1 || property.normalized_address}, {property.locality}, {property.city} · {property.built_up_area_sqm} sqm
          </p>
          <div className="text-xs font-mono text-[var(--text-secondary)]">
            Asset Identifier: {property.id}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/issuer/properties/${property.id}`}
            className="text-xs px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            View in Issuer Portal &rarr;
          </Link>
        </div>
      </div>

      {/* Manifest Diff Viewer */}
      {currentManifestData && (
        <ManifestDiffViewer
          currentManifest={currentManifestData}
          previousManifest={previousManifestData}
        />
      )}

      {/* Latest Manifest Card */}
      {latestManifest && (
        <ManifestRootCard
          version={latestManifest.version}
          status={latestManifest.status}
          merkleRoot={latestManifest.merkle_root}
          manifestHash={latestManifest.manifest_hash}
          completenessPct={latestManifest.checklist_completeness}
          approvedAt={latestManifest.approved_at}
        />
      )}

      {/* Read-Only Evidence Checklist Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Submitted Evidence Checklist
          </h3>
          <span className="text-xs text-[var(--text-secondary)]">
            Read-only verifier inspection
          </span>
        </div>
        <EvidenceChecklistTable
          propertyId={property.id}
          items={checklistEvaluation.items}
          documents={activeDocs}
          isApprovedManifest={latestManifest?.status === 'approved'}
          canEdit={false}
          onRefresh={() => {}}
        />
      </div>

      {/* Decision Form */}
      {latestManifest && latestManifest.status !== 'approved' ? (
        <ReviewDecisionForm
          propertyId={property.id}
          manifestId={latestManifest.id}
          manifestVersion={latestManifest.version}
          merkleRoot={latestManifest.merkle_root}
          isEligibleVerifier={isEligibleVerifier}
          sodReason={sodReason}
          onSuccess={() => {}}
        />
      ) : (
        <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] text-xs space-y-1.5">
          <div className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <span>✓</span> Manifest Already Verified
          </div>
          <p className="text-[var(--text-secondary)]">
            Evidence manifest v{latestManifest?.version || 1} has already been approved and is locked.
            Any further title updates require the issuer to upload revised evidence and generate a new manifest version.
          </p>
        </div>
      )}

      {/* Verification History Log */}
      {verifications && verifications.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] overflow-hidden shadow-sm space-y-0">
          <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-muted)]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Verification Decision Audit Trail
            </h4>
          </div>
          <div className="divide-y divide-[var(--border)] text-xs">
            {verifications.map((v) => (
              <div key={v.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={v.decision === 'verified' ? 'success' : 'neutral'}>
                      {v.decision === 'verified' ? 'Demo Review Completed' : v.decision.toUpperCase()}
                    </Badge>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {v.reviewer?.display_name || 'Independent Verifier'}
                    </span>
                  </div>
                  <span className="text-[var(--text-secondary)] font-mono">
                    {new Date(v.decided_at).toLocaleString()}
                  </span>
                </div>
                <div className="text-[var(--text-secondary)] pl-2 border-l-2 border-[var(--border)]">
                  {getVerificationSummaryText(v.evidence_summary) || v.limitations || 'Review completed against Maharashtra checklist.'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
