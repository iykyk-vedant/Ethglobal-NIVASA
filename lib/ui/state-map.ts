import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  PauseCircle,
  FileCheck2,
  ShieldCheck,
  ShieldAlert,
  ArrowRightCircle,
  RotateCcw,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import type {
  PropertyStatus,
  ManifestStatus,
  OfferingStatus,
  OrderStatus,
} from '../state/transitions';

export type EligibilityStatus = 'pending' | 'eligible' | 'ineligible' | 'expired' | 'revoked';
export type DocumentStatus = 'active' | 'superseded' | 'expired' | 'rejected';
export type CheckStatus = 'PASS' | 'FAIL' | 'UNAVAILABLE';

export interface StatePresentation {
  label: string;
  icon: LucideIcon;
  description: string;
  badgeClass: string; // Tailwind semantic token classes
  variant: 'success' | 'warning' | 'danger' | 'info' | 'pending';
}

// -----------------------------------------------------------------------------
// 1. Property State Presentation Map
// -----------------------------------------------------------------------------
export const PROPERTY_STATE_MAP: Record<PropertyStatus, StatePresentation> = {
  draft: {
    label: 'Draft',
    icon: Clock,
    description: 'Initial property profile undergoing evidence compilation.',
    badgeClass: 'bg-surface-muted text-text-secondary border-border',
    variant: 'pending',
  },
  submitted: {
    label: 'Submitted for Review',
    icon: ArrowRightCircle,
    description: 'Property documents submitted for title and encumbrance verification.',
    badgeClass: 'bg-status-info/10 text-status-info border-status-info/30',
    variant: 'info',
  },
  in_review: {
    label: 'In Legal Review',
    icon: Clock,
    description: 'Title verification and legal compliance audit actively in progress.',
    badgeClass: 'bg-status-info/10 text-status-info border-status-info/30',
    variant: 'info',
  },
  needs_more_information: {
    label: 'Action Required',
    icon: AlertTriangle,
    description: 'Verifier requested supplemental documentation or clarifications.',
    badgeClass: 'bg-status-warning/10 text-status-warning border-status-warning/30',
    variant: 'warning',
  },
  verified: {
    label: 'Demo Review Completed',
    icon: ShieldCheck,
    description: 'Demonstration verification complete. Not an official legal title guarantee.',
    badgeClass: 'bg-status-success/10 text-status-success border-status-success/30',
    variant: 'success',
  },
  rejected: {
    label: 'Verification Rejected',
    icon: XCircle,
    description: 'Property failed essential title or encumbrance review criteria.',
    badgeClass: 'bg-status-danger/10 text-status-danger border-status-danger/30',
    variant: 'danger',
  },
  disputed: {
    label: 'Under Dispute',
    icon: ShieldAlert,
    description: 'Active title dispute or conflicting revenue documentation flagged.',
    badgeClass: 'bg-status-danger/10 text-status-danger border-status-danger/30',
    variant: 'danger',
  },
  expired: {
    label: 'Review Expired',
    icon: Clock,
    description: 'Annual verification validity window elapsed; re-audit required.',
    badgeClass: 'bg-surface-muted text-text-secondary border-border',
    variant: 'pending',
  },
  revoked: {
    label: 'Review Revoked',
    icon: XCircle,
    description: 'Property verification revoked following material evidence change.',
    badgeClass: 'bg-status-danger/10 text-status-danger border-status-danger/30',
    variant: 'danger',
  },
};

// -----------------------------------------------------------------------------
// 2. Evidence Manifest State Presentation Map
// -----------------------------------------------------------------------------
export const MANIFEST_STATE_MAP: Record<ManifestStatus, StatePresentation> = {
  draft: {
    label: 'Manifest Draft',
    icon: Clock,
    description: 'Evidence manifest being compiled by property issuer.',
    badgeClass: 'bg-surface-muted text-text-secondary border-border',
    variant: 'pending',
  },
  submitted: {
    label: 'Manifest Submitted',
    icon: ArrowRightCircle,
    description: 'Merkle root and checklist committed for verifier sign-off.',
    badgeClass: 'bg-status-info/10 text-status-info border-status-info/30',
    variant: 'info',
  },
  approved: {
    label: 'Manifest Approved',
    icon: FileCheck2,
    description: 'Immutable manifest approved by independent verifier and anchored on-chain.',
    badgeClass: 'bg-status-success/10 text-status-success border-status-success/30',
    variant: 'success',
  },
  rejected: {
    label: 'Manifest Rejected',
    icon: XCircle,
    description: 'Manifest rejected due to missing records or hash mismatches.',
    badgeClass: 'bg-status-danger/10 text-status-danger border-status-danger/30',
    variant: 'danger',
  },
  superseded: {
    label: 'Superseded',
    icon: RotateCcw,
    description: 'Replaced by a newer approved evidence manifest version.',
    badgeClass: 'bg-surface-muted text-text-secondary border-border',
    variant: 'pending',
  },
  'superseded-pending': {
    label: 'Superseded (Pending Review)',
    icon: RotateCcw,
    description: 'Evidence drift detected; manifest awaiting verification of successor version.',
    badgeClass: 'bg-status-warning/10 text-status-warning border-status-warning/30',
    variant: 'warning',
  },
};

// -----------------------------------------------------------------------------
// 3. Offering State Presentation Map
// -----------------------------------------------------------------------------
export const OFFERING_STATE_MAP: Record<OfferingStatus, StatePresentation> = {
  draft: {
    label: 'Draft Offering',
    icon: Clock,
    description: 'Offering terms and fractional configuration in preparation.',
    badgeClass: 'bg-surface-muted text-text-secondary border-border',
    variant: 'pending',
  },
  proposed: {
    label: 'Offering Proposed',
    icon: ArrowRightCircle,
    description: 'Proposed by issuer for verifier and governance review.',
    badgeClass: 'bg-status-info/10 text-status-info border-status-info/30',
    variant: 'info',
  },
  legal_review_pending: {
    label: 'Legal Review Pending',
    icon: Clock,
    description: 'Offering rights document v1 under legal verifier audit.',
    badgeClass: 'bg-status-info/10 text-status-info border-status-info/30',
    variant: 'info',
  },
  approved_for_demo: {
    label: 'Approved for Demo',
    icon: CheckCircle2,
    description: 'Approved for simulated tokenization demo by authorized verifier.',
    badgeClass: 'bg-status-success/10 text-status-success border-status-success/30',
    variant: 'success',
  },
  token_configured: {
    label: 'Token Configured',
    icon: ShieldCheck,
    description: 'Hedera ATS Diamond asset parameters bound and verified.',
    badgeClass: 'bg-status-info/10 text-status-info border-status-info/30',
    variant: 'info',
  },
  active: {
    label: 'Active Offering',
    icon: CheckCircle2,
    description: 'Offering active for simulated eligible investor reservations.',
    badgeClass: 'bg-status-success/10 text-status-success border-status-success/30',
    variant: 'success',
  },
  paused: {
    label: 'Paused',
    icon: PauseCircle,
    description: 'Offering administratively paused by authorized pauser key.',
    badgeClass: 'bg-status-warning/10 text-status-warning border-status-warning/30',
    variant: 'warning',
  },
  paused_evidence_drift: {
    label: 'Paused: Evidence Drift',
    icon: AlertTriangle,
    description: 'Halted automatically: private evidence was modified post-approval.',
    badgeClass: 'bg-status-danger/10 text-status-danger border-status-danger/30',
    variant: 'danger',
  },
  closed: {
    label: 'Offering Closed',
    icon: XCircle,
    description: 'Subscription window concluded or fully allocated.',
    badgeClass: 'bg-surface-muted text-text-secondary border-border',
    variant: 'pending',
  },
};

// -----------------------------------------------------------------------------
// 4. Order State Presentation Map
// -----------------------------------------------------------------------------
export const ORDER_STATE_MAP: Record<OrderStatus, StatePresentation> = {
  UNITS_RESERVED: {
    label: 'Units Reserved',
    icon: Clock,
    description: 'Atomic supply lock acquired. Awaiting payment initiation.',
    badgeClass: 'bg-status-info/10 text-status-info border-status-info/30',
    variant: 'info',
  },
  PAYMENT_PENDING: {
    label: 'Payment Pending',
    icon: Clock,
    description: 'Simulated payment ref generated; awaiting gateway callback.',
    badgeClass: 'bg-status-warning/10 text-status-warning border-status-warning/30',
    variant: 'warning',
  },
  PAYMENT_CONFIRMED: {
    label: 'Payment Confirmed',
    icon: CheckCircle2,
    description: 'Simulated INR payment confirmed; queued for token allocation.',
    badgeClass: 'bg-status-info/10 text-status-info border-status-info/30',
    variant: 'info',
  },
  ALLOCATION_PENDING: {
    label: 'Allocation Pending',
    icon: Clock,
    description: 'Outbox job prepared for Hedera ATS token issuance.',
    badgeClass: 'bg-status-info/10 text-status-info border-status-info/30',
    variant: 'info',
  },
  ALLOCATION_SUBMITTED: {
    label: 'Allocation Submitted',
    icon: ArrowRightCircle,
    description: 'Transaction submitted to Hedera Testnet; awaiting consensus.',
    badgeClass: 'bg-status-info/10 text-status-info border-status-info/30',
    variant: 'info',
  },
  ALLOCATION_CONFIRMED: {
    label: 'On-Chain Allocation Confirmed',
    icon: CheckCircle2,
    description: 'Hedera consensus receipt confirmed; awaiting reconciliation.',
    badgeClass: 'bg-status-info/10 text-status-info border-status-info/30',
    variant: 'info',
  },
  COMPLETED: {
    label: 'Completed & Reconciled',
    icon: ShieldCheck,
    description: 'Mirror Node balance verified matching database order state.',
    badgeClass: 'bg-status-success/10 text-status-success border-status-success/30',
    variant: 'success',
  },
  REJECTED: {
    label: 'Order Rejected',
    icon: XCircle,
    description: 'Order failed compliance or wallet validation rules.',
    badgeClass: 'bg-status-danger/10 text-status-danger border-status-danger/30',
    variant: 'danger',
  },
  EXPIRED: {
    label: 'Reservation Expired',
    icon: Clock,
    description: 'Reservation TTL lapsed without payment; units returned to pool.',
    badgeClass: 'bg-surface-muted text-text-secondary border-border',
    variant: 'pending',
  },
  PAYMENT_FAILED: {
    label: 'Payment Failed',
    icon: XCircle,
    description: 'Simulated payment processing error.',
    badgeClass: 'bg-status-danger/10 text-status-danger border-status-danger/30',
    variant: 'danger',
  },
  ALLOCATION_FAILED: {
    label: 'Allocation Failed',
    icon: AlertTriangle,
    description: 'Hedera contract call reverted; outbox retry scheduled.',
    badgeClass: 'bg-status-danger/10 text-status-danger border-status-danger/30',
    variant: 'danger',
  },
  REFUND_PENDING: {
    label: 'Refund Pending',
    icon: RotateCcw,
    description: 'Allocation permanently failed; refund initiated.',
    badgeClass: 'bg-status-warning/10 text-status-warning border-status-warning/30',
    variant: 'warning',
  },
  REFUNDED: {
    label: 'Refunded',
    icon: CheckCircle2,
    description: 'Simulated payment refunded to investor.',
    badgeClass: 'bg-surface-muted text-text-secondary border-border',
    variant: 'pending',
  },
  RECONCILIATION_REQUIRED: {
    label: 'Reconciliation Required',
    icon: AlertTriangle,
    description: 'Discrepancy detected between database and Mirror Node balance.',
    badgeClass: 'bg-status-warning/10 text-status-warning border-status-warning/30',
    variant: 'warning',
  },
  MANUAL_REVIEW: {
    label: 'Manual Review',
    icon: AlertTriangle,
    description: 'Flagged for operational inspection by system administrator.',
    badgeClass: 'bg-status-warning/10 text-status-warning border-status-warning/30',
    variant: 'warning',
  },
};

// -----------------------------------------------------------------------------
// 5. Investor Eligibility Presentation Map
// -----------------------------------------------------------------------------
export const ELIGIBILITY_STATE_MAP: Record<EligibilityStatus, StatePresentation> = {
  pending: {
    label: 'Eligibility Pending',
    icon: Clock,
    description: 'Accreditation and identity review in progress.',
    badgeClass: 'bg-status-info/10 text-status-info border-status-info/30',
    variant: 'info',
  },
  eligible: {
    label: 'Demo Eligible',
    icon: CheckCircle2,
    description: 'Authorized for simulated investment order placement on testnet.',
    badgeClass: 'bg-status-success/10 text-status-success border-status-success/30',
    variant: 'success',
  },
  ineligible: {
    label: 'Ineligible',
    icon: XCircle,
    description: 'Did not meet investor qualification or compliance criteria.',
    badgeClass: 'bg-status-danger/10 text-status-danger border-status-danger/30',
    variant: 'danger',
  },
  expired: {
    label: 'Eligibility Expired',
    icon: Clock,
    description: 'Annual KYC validity elapsed; re-submission required.',
    badgeClass: 'bg-surface-muted text-text-secondary border-border',
    variant: 'pending',
  },
  revoked: {
    label: 'Eligibility Revoked',
    icon: ShieldAlert,
    description: 'Eligibility revoked; on-chain transfer permissions removed.',
    badgeClass: 'bg-status-danger/10 text-status-danger border-status-danger/30',
    variant: 'danger',
  },
};

// -----------------------------------------------------------------------------
// 6. Public Verification Checks Presentation Map (C1–C7)
// -----------------------------------------------------------------------------
export const CHECK_STATE_MAP: Record<CheckStatus, StatePresentation> = {
  PASS: {
    label: 'PASS',
    icon: CheckCircle2,
    description: 'Cryptographic proof verified against public ledger.',
    badgeClass: 'bg-status-success/15 text-status-success border-status-success/40',
    variant: 'success',
  },
  FAIL: {
    label: 'FAIL',
    icon: XCircle,
    description: 'Discrepancy or integrity failure detected.',
    badgeClass: 'bg-status-danger/15 text-status-danger border-status-danger/40',
    variant: 'danger',
  },
  UNAVAILABLE: {
    label: 'UNAVAILABLE',
    icon: HelpCircle,
    description: 'External proof service or ledger endpoint temporarily unreachable.',
    badgeClass: 'bg-status-warning/15 text-status-warning border-status-warning/40',
    variant: 'warning',
  },
};

// -----------------------------------------------------------------------------
// 7. Canonical Presentation Getters
// -----------------------------------------------------------------------------
export function getPropertyStatePresentation(status: PropertyStatus): StatePresentation {
  return PROPERTY_STATE_MAP[status] || PROPERTY_STATE_MAP.draft;
}

export function getManifestStatePresentation(status: ManifestStatus): StatePresentation {
  return MANIFEST_STATE_MAP[status] || MANIFEST_STATE_MAP.draft;
}

export function getOfferingStatePresentation(status: OfferingStatus): StatePresentation {
  return OFFERING_STATE_MAP[status] || OFFERING_STATE_MAP.draft;
}

export function getOrderStatePresentation(status: OrderStatus): StatePresentation {
  return ORDER_STATE_MAP[status] || ORDER_STATE_MAP.UNITS_RESERVED;
}

export function getEligibilityStatePresentation(status: EligibilityStatus): StatePresentation {
  return ELIGIBILITY_STATE_MAP[status] || ELIGIBILITY_STATE_MAP.pending;
}

export function getCheckStatePresentation(status: CheckStatus): StatePresentation {
  return CHECK_STATE_MAP[status] || CHECK_STATE_MAP.UNAVAILABLE;
}

