'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentRowData[]>(initialDocuments);
  const [manifests, setManifests] = useState<ManifestVersionSummary[]>(initialManifests);
  const [isSubmittingManifest, setIsSubmittingManifest] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProposingOffering, setIsProposingOffering] = useState(false);
  const [offeringError, setOfferingError] = useState<string | null>(null);
  const [tokenName, setTokenName] = useState(`${property.name} Economic Interest`);
  const [tokenSymbol, setTokenSymbol] = useState(`NVS-${property.id.slice(0, 4).toUpperCase()}`);
  const [totalUnits, setTotalUnits] = useState('10000');
  const [unitPriceInr, setUnitPriceInr] = useState('1000.00');
  const [minimumUnits, setMinimumUnits] = useState('1');
  const [maximumUnitsPerInvestor, setMaximumUnitsPerInvestor] = useState('500');

  const latestManifest = manifests.length > 0 ? manifests[0] : null;
  const isApproved = manifests.some((m) => m.status === 'approved');

  const handleProposeOffering = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setOfferingError(null);
    setIsProposingOffering(true);
    try {
      const response = await fetch('/api/offerings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: property.id,
          token_name: tokenName.trim(),
          token_symbol: tokenSymbol.trim(),
          total_units: Number(totalUnits),
          unit_price_inr: unitPriceInr.trim(),
          minimum_units: Number(minimumUnits),
          maximum_units_per_investor: Number(maximumUnitsPerInvestor),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Offering proposal could not be created.');
      }
      if (!data.offering?.id) {
        throw new Error('The proposal was accepted, but no offering reference was returned. Contact the operator before retrying.');
      }
      router.push(`/offerings/${data.offering.id}`);
    } catch (error) {
      setOfferingError(error instanceof Error ? error.message : 'Offering proposal could not be created.');
    } finally {
      setIsProposingOffering(false);
    }
  };

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

      <section className="p-5 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] space-y-4 text-xs" aria-labelledby="offering-setup-heading">
        <div className="space-y-1">
          <h4 id="offering-setup-heading" className="text-sm font-semibold text-[var(--text-primary)]">
            Legal Rights & Offering Schedule (D1)
          </h4>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            Propose a simulated offering for this property. You will review and submit its rights terms on the next screen. A proposal is not active or available for investment until the required independent approvals and activation checks pass.
          </p>
        </div>

        {offeringError && (
          <div role="alert" className="p-3 rounded-lg border border-[var(--status-danger)] text-[var(--status-danger)] bg-[var(--surface-card)]">
            {offeringError}
          </div>
        )}

        {!isOwner ? (
          <p className="text-[var(--text-secondary)]">Only this property’s issuer can propose an offering.</p>
        ) : !isApproved || property.status !== 'verified' ? (
          <p className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-card)] text-[var(--text-secondary)]">
            Offering proposals become available after this property is verified and its evidence manifest is approved.
          </p>
        ) : (
          <form onSubmit={handleProposeOffering} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1.5">
              <span className="font-medium text-[var(--text-primary)]">Offering name</span>
              <input required minLength={3} maxLength={120} value={tokenName} onChange={(event) => setTokenName(event.target.value)} className="w-full min-h-11 rounded-md border border-[var(--border)] bg-[var(--surface-card)] px-3 text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]" />
            </label>
            <label className="space-y-1.5">
              <span className="font-medium text-[var(--text-primary)]">Asset symbol</span>
              <input required minLength={2} maxLength={20} value={tokenSymbol} onChange={(event) => setTokenSymbol(event.target.value)} className="w-full min-h-11 rounded-md border border-[var(--border)] bg-[var(--surface-card)] px-3 text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]" />
            </label>
            <label className="space-y-1.5">
              <span className="font-medium text-[var(--text-primary)]">Proposed unit supply cap</span>
              <input required type="number" min="1" step="1" value={totalUnits} onChange={(event) => setTotalUnits(event.target.value)} className="w-full min-h-11 rounded-md border border-[var(--border)] bg-[var(--surface-card)] px-3 text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]" />
            </label>
            <label className="space-y-1.5">
              <span className="font-medium text-[var(--text-primary)]">Simulated unit price (INR)</span>
              <input required inputMode="decimal" pattern="[0-9]+(\\.[0-9]{1,2})?" value={unitPriceInr} onChange={(event) => setUnitPriceInr(event.target.value)} className="w-full min-h-11 rounded-md border border-[var(--border)] bg-[var(--surface-card)] px-3 text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]" />
              <span className="block text-[var(--text-secondary)]">Entered and sent as a decimal string to avoid currency rounding.</span>
            </label>
            <label className="space-y-1.5">
              <span className="font-medium text-[var(--text-primary)]">Minimum units per investor</span>
              <input required type="number" min="1" step="1" value={minimumUnits} onChange={(event) => setMinimumUnits(event.target.value)} className="w-full min-h-11 rounded-md border border-[var(--border)] bg-[var(--surface-card)] px-3 text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]" />
            </label>
            <label className="space-y-1.5">
              <span className="font-medium text-[var(--text-primary)]">Maximum units per investor</span>
              <input required type="number" min="1" step="1" value={maximumUnitsPerInvestor} onChange={(event) => setMaximumUnitsPerInvestor(event.target.value)} className="w-full min-h-11 rounded-md border border-[var(--border)] bg-[var(--surface-card)] px-3 text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]" />
            </label>
            <div className="md:col-span-2 flex flex-col items-start gap-3 border-t border-[var(--border)] pt-4">
              <p className="text-[var(--text-secondary)]">Prototype only: these terms do not establish legal ownership, regulatory approval, or investment rights.</p>
              <Button type="submit" isLoading={isProposingOffering}>Create offering proposal</Button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

