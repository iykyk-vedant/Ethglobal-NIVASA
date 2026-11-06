import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { AiResponse } from '@/lib/ai/schemas';
import { RequestAttempt } from '@/lib/ai/og-client';

interface Props {
  status: 'Available' | 'Pending' | 'Temporarily unavailable' | 'Validation failed';
  validatedResponse: AiResponse | null;
  preferenceFit: string;
  requestId: string;
  timestamp: string;
  provider: string;
  model: string;
  inputHash: string;
  outputHash: string;
  requestAttempts?: RequestAttempt[];
  errors?: string[];
}

function getPreferenceFitBadge(fit: string) {
  // STRICT RULE UI §8.8: Neutral labels ONLY; NO green "recommended" styling!
  switch (fit) {
    case 'good_match':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--surface-muted)] text-[var(--text-primary)] border border-[var(--border)]">
          Aligned with Stated Preferences
        </span>
      );
    case 'partial_match':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[var(--surface-muted)] text-[var(--text-secondary)] border border-[var(--border)]">
          Partial Alignment with Preferences
        </span>
      );
    case 'poor_match':
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          Weak Alignment with Stated Preferences
        </span>
      );
    case 'insufficient_evidence':
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-stone-100 dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-700">
          Insufficient Evidence for Fit Assessment
        </span>
      );
  }
}

function getStatusBadge(status: Props['status']) {
  switch (status) {
    case 'Available':
      return <Badge variant="success">Available</Badge>;
    case 'Pending':
      return <Badge variant="neutral">Pending</Badge>;
    case 'Validation failed':
      return <Badge variant="danger">Validation failed</Badge>;
    case 'Temporarily unavailable':
    default:
      return <Badge variant="warning">Temporarily unavailable</Badge>;
  }
}

export function AiExplanationPanel({
  status,
  validatedResponse,
  preferenceFit,
  requestId,
  timestamp,
  provider,
  model,
  inputHash,
  outputHash,
  requestAttempts = [],
  errors = [],
}: Props) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-card)] overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-muted)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            0G Change Explanation
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(status)}
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Preference Fit Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg border border-[var(--border)] bg-[var(--surface-page)]">
          <div>
            <div className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              Preference Fit Indicator
            </div>
            <div className="text-sm text-[var(--text-primary)] mt-0.5">
              Fit with your stated preferences based on current indicators:
            </div>
          </div>
          <div>{getPreferenceFitBadge(preferenceFit)}</div>
        </div>

        {/* Content depending on status */}
        {status === 'Available' && validatedResponse ? (
          <div className="space-y-5">
            {/* Validated Summary */}
            <div>
              <h4 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Ground-Truth Summary
              </h4>
              <p className="text-sm text-[var(--text-primary)] leading-relaxed bg-[var(--surface-muted)] p-3.5 rounded-lg border border-[var(--border)]">
                {validatedResponse.summary}
              </p>
            </div>

            {/* Grid of Risk Flags & Assumptions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Risk Flags */}
              <div className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--surface-card)]">
                <h5 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="text-amber-600">⚠️</span> Risk Indicators
                </h5>
                {validatedResponse.risk_flags.length > 0 ? (
                  <ul className="text-xs text-[var(--text-secondary)] space-y-1.5 list-disc list-inside">
                    {validatedResponse.risk_flags.map((rf, i) => (
                      <li key={i}>{rf}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[var(--text-secondary)]">No critical risk flags detected.</p>
                )}
              </div>

              {/* Assumptions */}
              <div className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--surface-card)]">
                <h5 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span>📋</span> Grounding Assumptions
                </h5>
                <ul className="text-xs text-[var(--text-secondary)] space-y-1.5 list-disc list-inside">
                  {validatedResponse.assumptions.map((as, i) => (
                    <li key={i}>{as}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Missing Info & Cannot Determine */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Missing Information */}
              <div className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--surface-card)]">
                <h5 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2">
                  Missing Information
                </h5>
                {validatedResponse.missing_information.length > 0 ? (
                  <ul className="text-xs text-[var(--text-secondary)] space-y-1.5 list-disc list-inside">
                    {validatedResponse.missing_information.map((mi, i) => (
                      <li key={i}>{mi}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[var(--text-secondary)]">All baseline checklist fields populated.</p>
                )}
              </div>

              {/* Cannot Determine */}
              <div className="p-3.5 rounded-lg border border-[var(--border)] bg-[var(--surface-card)]">
                <h5 className="text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2">
                  Cannot Determine
                </h5>
                <ul className="text-xs text-[var(--text-secondary)] space-y-1.5 list-disc list-inside">
                  {validatedResponse.cannot_determine.map((cd, i) => (
                    <li key={i}>{cd}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Cited Evidence IDs */}
            <div>
              <h5 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Supported Evidence Records
              </h5>
              <div className="flex flex-wrap gap-1.5">
                {validatedResponse.source_ids.map((id) => (
                  <span
                    key={id}
                    className="font-mono text-xs px-2.5 py-1 rounded bg-[var(--surface-muted)] text-[var(--text-primary)] border border-[var(--border)]"
                  >
                    {id}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center space-y-3 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-muted)]">
            <div className="text-sm font-medium text-[var(--text-primary)]">
              {status === 'Validation failed'
                ? 'Model output rejected by ground-truth validator'
                : 'Analysis temporarily unavailable'}
            </div>
            <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
              Deterministic metrics remain fully accurate and accessible above. The AI layer refuses to display ungrounded, unvalidated, or hallucinated claims.
            </p>
            {errors.length > 0 && (
              <div className="text-left text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-3 rounded border border-rose-200 dark:border-rose-900 max-w-md mx-auto space-y-1">
                <div className="font-semibold">Rejection details:</div>
                {errors.map((e, idx) => (
                  <div key={idx} className="font-mono">{e}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Provenance & Audit Footer */}
        <div className="pt-4 border-t border-[var(--border)] text-xs text-[var(--text-secondary)] space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono">
            <div>
              <span className="text-[var(--text-primary)] font-medium">0G Request ID:</span>{' '}
              <span className="text-[var(--brand-secondary)]">{requestId}</span>
            </div>
            <div>
              <span className="text-[var(--text-primary)] font-medium">Provider & Model:</span>{' '}
              <span>{provider.toUpperCase()} ({model})</span>
            </div>
            <div className="truncate">
              <span className="text-[var(--text-primary)] font-medium">Input Hash:</span>{' '}
              <span title={inputHash}>{inputHash.slice(0, 16)}...</span>
            </div>
            <div className="truncate">
              <span className="text-[var(--text-primary)] font-medium">Output Hash:</span>{' '}
              <span title={outputHash}>{outputHash.slice(0, 16)}...</span>
            </div>
            <div>
              <span className="text-[var(--text-primary)] font-medium">Timestamp:</span>{' '}
              <span>{timestamp}</span>
            </div>
            <div>
              <span className="text-[var(--text-primary)] font-medium">Attempts Recorded:</span>{' '}
              <span>{requestAttempts.length} call(s)</span>
            </div>
          </div>

          {/* Educational Disclaimer */}
          <div className="p-3 rounded bg-[var(--surface-muted)] text-[11px] text-[var(--text-secondary)] italic border border-[var(--border)] mt-3">
            Educational analysis only; not investment advice. NIVASA uses 0G Private Computer as the verifiable inference provider for evidence-grounded change analysis. Output does not guarantee financial performance.
          </div>
        </div>
      </div>
    </div>
  );
}

