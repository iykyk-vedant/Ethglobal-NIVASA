'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ChecklistConfigItem } from '@/lib/evidence/checklist';

interface Props {
  isOpen: boolean;
  propertyId: string;
  checklistItems: ChecklistConfigItem[];
  preselectedCode?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DocumentUploadDialog({
  isOpen,
  propertyId,
  checklistItems,
  preselectedCode,
  onClose,
  onSuccess,
}: Props) {
  const [docType, setDocType] = useState<string>(preselectedCode || checklistItems[0]?.code || 'property_card');
  const [sourceName, setSourceName] = useState('');
  const [sourceRef, setSourceRef] = useState('');
  const [issuedAt, setIssuedAt] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [limitationNote, setLimitationNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSyntheticConfirmed, setIsSyntheticConfirmed] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [serverHash, setServerHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Please select a file to upload.');
      return;
    }
    if (!isSyntheticConfirmed) {
      setErrorMsg('You must confirm that this is sample/synthetic demonstration data.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setServerHash(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', docType);
      formData.append('source_name', sourceName);
      formData.append('source_reference', sourceRef);
      if (issuedAt) formData.append('issued_at', issuedAt);
      if (validUntil) formData.append('valid_until', validUntil);
      if (limitationNote) formData.append('limitation_note', limitationNote);

      const res = await fetch(`/api/properties/${propertyId}/documents`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      setServerHash(data.serverHash);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border)] shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            Upload Evidence Document
          </h3>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-lg"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        {serverHash && (
          <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <span>✓</span> Document Stored & Server Hash Verified!
            </div>
            <div className="font-mono text-[11px] break-all select-all">
              SHA-256: {serverHash}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-medium text-[var(--text-primary)] block mb-1">
              Document Checklist Category *
            </label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--focus)] outline-none"
            >
              {checklistItems.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.name} ({item.required ? 'Required - ' : 'Optional - '}{item.weight} pts)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-[var(--text-secondary)] block mb-1">
                Issuing Authority / Source
              </label>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="e.g. Sub-Registrar / MCGM"
                className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-primary)] outline-none"
              />
            </div>
            <div>
              <label className="font-medium text-[var(--text-secondary)] block mb-1">
                Reference / Registration No.
              </label>
              <input
                type="text"
                value={sourceRef}
                onChange={(e) => setSourceRef(e.target.value)}
                placeholder="e.g. REG-MH-2026-0091"
                className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-primary)] outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-[var(--text-secondary)] block mb-1">
                Issue Date
              </label>
              <input
                type="date"
                value={issuedAt}
                onChange={(e) => setIssuedAt(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-primary)] outline-none"
              />
            </div>
            <div>
              <label className="font-medium text-[var(--text-secondary)] block mb-1">
                Valid Until Date (Optional)
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-primary)] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="font-medium text-[var(--text-secondary)] block mb-1">
              Limitation / Qualification Note (Optional)
            </label>
            <input
              type="text"
              value={limitationNote}
              onChange={(e) => setLimitationNote(e.target.value)}
              placeholder="e.g. Certified copy received; subject to mutation entry"
              className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-primary)] outline-none"
            />
          </div>

          <div>
            <label className="font-medium text-[var(--text-primary)] block mb-1">
              File Attachment (PDF, PNG, JPEG &le; 15MB) *
            </label>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full p-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-page)] text-[var(--text-primary)] cursor-pointer"
            />
            {file && (
              <div className="mt-1 text-[11px] text-[var(--text-secondary)]">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          <div className="p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] flex items-start gap-2.5">
            <input
              type="checkbox"
              id="synthetic-confirmation"
              checked={isSyntheticConfirmed}
              onChange={(e) => setIsSyntheticConfirmed(e.target.checked)}
              className="mt-0.5 rounded border-[var(--border)] text-[var(--brand-primary)] focus:ring-[var(--focus)]"
            />
            <label htmlFor="synthetic-confirmation" className="text-[11px] text-[var(--text-secondary)] cursor-pointer select-none">
              I confirm that this document is sample/synthetic demonstration data uploaded strictly for prototype verification, containing no confidential real-world PII.
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
            <Button variant="secondary" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={isUploading}>
              Upload & Compute Hash
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
