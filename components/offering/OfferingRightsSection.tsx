'use client';

import React, { useState } from 'react';
import { PlusCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RightsSummary } from './RightsSummary';
import { RightsVersionCard } from './RightsVersionCard';
import { RightsDiffViewer, RightsVersionData } from './RightsDiffViewer';
import { ProposeRightsDialog } from './ProposeRightsDialog';

export interface OfferingRightsSectionProps {
  offeringId: string;
  currentRights: any;
  previousRights?: any | null;
  allVersions: any[];
  canPropose?: boolean;
}

export const OfferingRightsSection: React.FC<OfferingRightsSectionProps> = ({
  offeringId,
  currentRights,
  previousRights,
  allVersions,
  canPropose = true,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const currentVersionData: RightsVersionData = {
    version: currentRights?.version || 1,
    rights_document_hash: currentRights?.rights_document_hash || '',
    represents: currentRights?.represents,
    does_not_represent: currentRights?.does_not_represent,
    income_entitlement_rule: currentRights?.income_entitlement_rule,
    transfer_rule: currentRights?.transfer_rule,
    redemption_rule: currentRights?.redemption_rule,
    voting_or_control_rights: currentRights?.voting_or_control_rights,
    risk_disclosures: currentRights?.risk_disclosures,
  };

  const previousVersionData: RightsVersionData | null = previousRights
    ? {
        version: previousRights.version,
        rights_document_hash: previousRights.rights_document_hash || '',
        represents: previousRights.represents,
        does_not_represent: previousRights.does_not_represent,
        income_entitlement_rule: previousRights.income_entitlement_rule,
        transfer_rule: previousRights.transfer_rule,
        redemption_rule: previousRights.redemption_rule,
        voting_or_control_rights: previousRights.voting_or_control_rights,
        risk_disclosures: previousRights.risk_disclosures,
      }
    : null;

  return (
    <div className="space-y-6" data-testid="offering-rights-section">
      {/* 1. Rights Summary Card */}
      <RightsSummary
        version={currentRights?.version || 1}
        rightsType={currentRights?.rights_type || 'Commercial Fractional Economic Interest'}
        rightsDocumentHash={currentRights?.rights_document_hash || ''}
        represents={currentRights?.represents}
        doesNotRepresent={currentRights?.does_not_represent}
        incomeEntitlementRule={currentRights?.income_entitlement_rule}
        transferRule={currentRights?.transfer_rule}
        redemptionRule={currentRights?.redemption_rule}
        votingOrControlRights={currentRights?.voting_or_control_rights}
        riskDisclosures={currentRights?.risk_disclosures}
        simulatedStatus={currentRights?.simulated_status}
      />

      {/* 2. Version History and Propose New Version Header */}
      <div className="border border-[var(--border-subtle)] rounded-lg p-5 bg-[var(--surface-primary)] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-[var(--brand-forest)]" aria-hidden="true" />
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Rights Version History &amp; Revisions
              </h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Each version is cryptographically hashed and anchored on Hedera ATS DocumentationFacet.
            </p>
          </div>

          {canPropose && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDialogOpen(true)}
              className="text-xs flex items-center gap-1.5"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Propose New Rights Version</span>
            </Button>
          )}
        </div>

        {/* List of Version Cards */}
        <div className="space-y-3">
          {allVersions.map((v) => (
            <RightsVersionCard
              key={v.id || v.version}
              version={v.version}
              isActive={v.version === currentRights?.version}
              rightsType={v.rights_type || 'Commercial Fractional Economic Interest'}
              documentHash={v.rights_document_hash}
              approvedBy={v.approved_by}
              approvedAt={v.approved_at}
              onchainDocTx={v.onchain_doc_tx}
              createdAt={v.created_at}
            />
          ))}
        </div>
      </div>

      {/* 3. Read-Only Current vs Previous Diff Viewer */}
      <RightsDiffViewer
        currentVersion={currentVersionData}
        previousVersion={previousVersionData}
      />

      {/* Propose Rights Dialog Modal */}
      <ProposeRightsDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        offeringId={offeringId}
        currentVersion={currentRights?.version || 1}
        initialTerms={{
          rights_type: currentRights?.rights_type,
          represents: currentRights?.represents,
          does_not_represent: currentRights?.does_not_represent,
          income_entitlement_rule: currentRights?.income_entitlement_rule,
          transfer_rule: currentRights?.transfer_rule,
          redemption_rule: currentRights?.redemption_rule,
          voting_or_control_rights: currentRights?.voting_or_control_rights,
          risk_disclosures: currentRights?.risk_disclosures,
        }}
        onSuccess={() => {
          window.location.reload();
        }}
      />
    </div>
  );
};

