'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ChecklistItemEvaluation } from '@/lib/evidence/checklist';
import { DocumentUploadDialog } from './DocumentUploadDialog';
import { EvidenceChangeWarningDialog } from './EvidenceChangeWarningDialog';
import checklistData from '@/config/evidence-checklist.maharashtra.json';

export interface DocumentRowData {
  id: string;
  document_type: string;
  sha256_hash: string;
  mime_type: string;
  size_bytes: number;
  source_name: string;
  source_reference: string;
  issued_at: string | null;
  valid_until: string | null;
  received_at: string;
  status: string;
  limitation_note?: string | null;
}

interface Props {
  propertyId: string;
  items: ChecklistItemEvaluation[];
  documents: DocumentRowData[];
  isApprovedManifest: boolean;
  canEdit: boolean;
  onRefresh: () => void;
}

export function EvidenceChecklistTable({
  propertyId,
  items,
  documents,
  isApprovedManifest,
  canEdit,
  onRefresh,
}: Props) {
  const [activeUploadCode, setActiveUploadCode] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [pendingUploadCode, setPendingUploadCode] = useState<string | null>(null);
  const [expandedHashes, setExpandedHashes] = useState<Record<string, boolean>>({});

  const docsMap = new Map<string, DocumentRowData>();
  documents.forEach((d) => {
    if (d.status === 'active') {
      docsMap.set(d.document_type.toLowerCase(), d);
    }
  });

  const handleActionClick = (code: string) => {
    if (isApprovedManifest) {
      setPendingUploadCode(code);
      setShowWarning(true);
    } else {
      setActiveUploadCode(code);
    }
  };

  const handleWarningConfirm = () => {
    setShowWarning(false);
    if (pendingUploadCode) {
      setActiveUploadCode(pendingUploadCode);
      setPendingUploadCode(null);
    }
  };

  const toggleHashExpand = (docId: string) => {
    setExpandedHashes((prev) => ({ ...prev, [docId]: !prev[docId] }));
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] overflow-hidden shadow-sm">
      <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-muted)] flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            Maharashtra Evidence Checklist
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Document requirements for asset onboarding under state legal frameworks.
          </p>
        </div>
        {canEdit && (
          <Button size="sm" onClick={() => handleActionClick('property_card')}>
            + Upload Document
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-card)] text-[var(--text-secondary)] font-medium">
              <th className="py-3 px-4">Document Type</th>
              <th className="py-3 px-4">Required</th>
              <th className="py-3 px-4">Points</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Issuing Authority / Ref</th>
              <th className="py-3 px-4">
                Server SHA-256 Hash
                <span className="block text-[10px] font-normal">Identical file bytes produce the same hash.</span>
              </th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {items.map((item) => {
              const doc = docsMap.get(item.code.toLowerCase());
              const isPresent = Boolean(doc);
              const isExpanded = doc ? expandedHashes[doc.id] : false;
              const hasMatchingContent = Boolean(doc && documents.some(
                (other) => other.id !== doc.id && other.sha256_hash.toLowerCase() === doc.sha256_hash.toLowerCase()
              ));
              const expiredByDate = Boolean(doc?.valid_until && new Date(doc.valid_until).getTime() < Date.now());
              const staleByAge = Boolean(
                item.status === 'expired' && !expiredByDate && item.max_age_days !== null &&
                item.daysOld !== undefined && item.daysOld > item.max_age_days
              );
              const expiryReason = item.status === 'expired' && doc
                ? expiredByDate && doc.valid_until
                  ? `Validity ended ${new Date(doc.valid_until).toLocaleDateString()}`
                  : item.max_age_days !== null && item.daysOld !== undefined
                    ? `Internal freshness rule: issued ${item.daysOld} days ago; refresh interval ${item.max_age_days} days. This is not a legal validity decision.`
                    : 'Outside its configured validity period'
                : null;

              return (
                <tr key={item.code} className="hover:bg-[var(--surface-muted)] transition-colors">
                  <td className="py-3.5 px-4 font-medium text-[var(--text-primary)] max-w-xs">
                    <div>{item.name}</div>
                    {doc?.limitation_note && (
                      <span className="text-[11px] text-[var(--text-secondary)] block italic mt-0.5">
                        Note: {doc.limitation_note}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {item.required ? (
                      <span className="text-rose-600 font-semibold">Yes</span>
                    ) : (
                      <span className="text-[var(--text-secondary)]">Optional</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono">{item.weight} pts</td>
                  <td className="py-3.5 px-4">
                    {item.status === 'verified' ? (
                      <Badge variant="success">Active</Badge>
                    ) : item.status === 'expired' ? (
                      <div className="space-y-1">
                        <Badge variant={staleByAge ? 'warning' : 'danger'}>
                          {staleByAge ? 'Needs refresh' : 'Expired'}
                        </Badge>
                        {expiryReason && <span className="block max-w-40 text-[10px] text-[var(--status-danger)]">{expiryReason}</span>}
                      </div>
                    ) : (
                      <Badge variant="neutral">Missing</Badge>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-[var(--text-secondary)] max-w-xs">
                    {doc ? (
                      <div>
                        <div className="text-[var(--text-primary)] font-medium truncate">
                          {doc.source_name || '—'}
                        </div>
                        <div className="font-mono text-[11px] text-[var(--text-secondary)] truncate">
                          {doc.source_reference || '—'}
                        </div>
                      </div>
                    ) : (
                      <span className="italic text-[var(--text-secondary)]">Pending upload</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px]">
                    {doc ? (
                      <div>
                        <span
                          className="cursor-pointer hover:underline text-[var(--brand-secondary)]"
                          onClick={() => toggleHashExpand(doc.id)}
                          title="Click to expand full hash"
                        >
                          {isExpanded
                            ? doc.sha256_hash
                            : `${doc.sha256_hash.slice(0, 10)}...${doc.sha256_hash.slice(-6)}`}
                        </span>
                        {hasMatchingContent && (
                          <span className="mt-1 block text-[10px] text-[var(--text-secondary)]">
                            Same content hash as another checklist upload
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[var(--text-secondary)]">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    {doc && (
                      <a
                        href={`/api/properties/documents/${doc.id}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-[11px] font-medium text-[var(--brand-secondary)] hover:underline"
                      >
                        Preview / Download
                      </a>
                    )}
                    {canEdit && (
                      <Button
                        size="sm"
                        variant={isPresent ? 'secondary' : 'primary'}
                        onClick={() => handleActionClick(item.code)}
                        className="text-[11px] py-1 px-2.5 h-auto"
                      >
                        {isPresent ? 'Replace' : 'Upload'}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Upload Dialog */}
      <DocumentUploadDialog
        isOpen={Boolean(activeUploadCode)}
        propertyId={propertyId}
        checklistItems={checklistData.items}
        preselectedCode={activeUploadCode}
        onClose={() => setActiveUploadCode(null)}
        onSuccess={() => {
          setActiveUploadCode(null);
          onRefresh();
        }}
      />

      {/* Drift Warning Dialog */}
      <EvidenceChangeWarningDialog
        isOpen={showWarning}
        documentTypeName={pendingUploadCode || undefined}
        onConfirm={handleWarningConfirm}
        onCancel={() => {
          setShowWarning(false);
          setPendingUploadCode(null);
        }}
      />
    </div>
  );
}

