'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ChecklistProgress } from './ChecklistProgress';
import { EvidenceChecklistTable, DocumentRowData } from './EvidenceChecklistTable';
import { ManifestRootCard } from './ManifestRootCard';
import { ManifestVersionList, ManifestVersionSummary } from './ManifestVersionList';
import { ChecklistItemEvaluation } from '@/lib/evidence/checklist';

interface PropertyData {
  id: string;
  name: string;
  description: string;
  city: string;
  locality: string;
  property_type: string;
  built_up_area_sqm: number;
  status: string;
  verification_status: string;
}

interface Props {
  property: PropertyData;
  initialDocuments: DocumentRowData[];
  initialManifests: ManifestVersionSummary[];
  checklistEvaluation: {
    completenessPct: string;
    earnedWeight: number;
    totalRequiredWeight: number;
    isComplete: boolean;
    items: ChecklistItemEvaluation[];
  };
  isOwner: boolean;
}

export function IssuerPropertyWorkspace({
  property,
  initialDocuments,
  initialManifests,
  checklistEvaluation,
  isOwner,
}: Props) {
  const [documents, setDocuments] = useState<DocumentRowData[]>(initialDocuments);
  const [manifests, setManifests] = useState<ManifestVersionSummary[]>(initialManifests);
  const [isSubmittingManifest, setIsSubmittingManifest] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const latestManifest = manifests.length > 0 ? manifests[0] : null;
  const isApproved = manifests.some((m) => m.status === 'approved');

  const handleRefresh = async () => {
    try {
      const res = await fetch(`/api/properties/${property.id}/documents`);
      const data = await res.json();
      if (data.documents) {
        setDocuments(data.documents);
      }
      window.location.reload();
    } catch {
      // ignore
    }
  };

  const handleSubmitForVerification = async () => {
    setIsSubmittingManifest(true);
    setErrorMsg(null);
    setSubmitSuccess(null);

    try {
      const res = await fetch(`/api/properties/${property.id}/submit`, {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Manifest submission failed');
      }

      setSubmitSuccess(`Manifest v${data.version} submitted successfully! Merkle Root: ${data.merkleRoot.slice(0, 16)}...`);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsSubmittingManifest(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Messages */}
      {errorMsg && (
        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300">
          {errorMsg}
        </div>
      )}

      {submitSuccess && (
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-xs text-emerald-800 dark:text-emerald-300">
          ✓ {submitSuccess}
        </div>
      )}

      {/* Checklist Progress */}
      <ChecklistProgress
        completenessPct={checklistEvaluation.completenessPct}
        earnedWeight={checklistEvaluation.earnedWeight}
        totalRequiredWeight={checklistEvaluation.totalRequiredWeight}
        isComplete={checklistEvaluation.isComplete}
      />

      {/* Action Bar */}
      <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-card)] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">
            Submission Lifecycle
          </h4>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Submit your uploaded evidence to compute a Merkle-rooted manifest version for independent verifier review.
          </p>
        </div>

        {isOwner && (
          <Button
            size="sm"
            onClick={handleSubmitForVerification}
            isLoading={isSubmittingManifest}
            disabled={documents.length === 0}
          >
            Submit Evidence Manifest v{manifests.length + 1}
          </Button>
        )}
      </div>

      {/* Latest Manifest Root Card */}
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

      {/* Evidence Checklist Table */}
      <EvidenceChecklistTable
        propertyId={property.id}
        items={checklistEvaluation.items}
        documents={documents}
        isApprovedManifest={isApproved}
        canEdit={isOwner}
        onRefresh={handleRefresh}
      />

      {/* Manifest Version History */}
      <ManifestVersionList manifests={manifests} />

      {/* Rights Section Placeholder (UI §8.3) */}
      <div className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] space-y-2 text-xs">
        <h4 className="text-sm font-semibold text-[var(--text-primary)]">
          Legal Rights & Offering Schedule (D1)
        </h4>
        <p className="text-[var(--text-secondary)] leading-relaxed">
          The versioned legal rights document (defining economic rights, token unit distribution, and liquidation priorities) can be configured once this evidence manifest is formally reviewed and approved by an independent verifier.
        </p>
      </div>
    </div>
  );
}
