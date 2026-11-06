/**
 * NIVASA - Canonical State Machines & Transitions
 * ARCH §9, §17.1, §17.5 · PRD §9 · PLAN M2.1
 *
 * Single source of truth for:
 * 1. Property Status (§9.1)
 * 2. Evidence Manifest Status (§9.2)
 * 3. Offering Status (§9.3)
 * 4. Order Status (§9.4)
 *
 * Database CHECK constraints and allowed_transitions table seed
 * MUST be generated from this file.
 */

// ---------------------------------------------------------------------------
// 1. Property State Machine (§9.1)
// ---------------------------------------------------------------------------
export const PROPERTY_STATUSES = [
  "draft",
  "submitted",
  "in_review",
  "needs_more_information",
  "verified",
  "rejected",
  "disputed",
  "expired",
  "revoked",
] as const;

export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export const PROPERTY_TRANSITIONS: Record<PropertyStatus, readonly PropertyStatus[]> = {
  draft: ["submitted"],
  submitted: ["in_review"],
  in_review: ["verified", "rejected", "needs_more_information"],
  needs_more_information: ["submitted"],
  verified: ["in_review", "disputed", "expired", "revoked"],
  rejected: [],
  disputed: ["in_review", "revoked"],
  expired: [],
  revoked: [],
};

// ---------------------------------------------------------------------------
// 2. Evidence Manifest State Machine (§9.2)
// ---------------------------------------------------------------------------
export const MANIFEST_STATUSES = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "superseded",
  "superseded-pending",
] as const;

export type ManifestStatus = (typeof MANIFEST_STATUSES)[number];

export const MANIFEST_TRANSITIONS: Record<ManifestStatus, readonly ManifestStatus[]> = {
  draft: ["submitted"],
  submitted: ["approved", "rejected"],
  approved: ["superseded", "superseded-pending"],
  "superseded-pending": ["superseded", "approved"],
  rejected: [],
  superseded: ["approved"],
};

// ---------------------------------------------------------------------------
// 3. Offering State Machine (§9.3)
// ---------------------------------------------------------------------------
export const OFFERING_STATUSES = [
  "draft",
  "proposed",
  "legal_review_pending",
  "approved_for_demo",
  "token_configured",
  "active",
  "paused",
  "paused_evidence_drift",
  "closed",
] as const;

export type OfferingStatus = (typeof OFFERING_STATUSES)[number];

export const OFFERING_TRANSITIONS: Record<OfferingStatus, readonly OfferingStatus[]> = {
  draft: ["proposed"],
  proposed: ["legal_review_pending"],
  legal_review_pending: ["approved_for_demo"],
  approved_for_demo: ["token_configured"],
  token_configured: ["active", "legal_review_pending"],
  active: ["paused", "paused_evidence_drift", "closed", "legal_review_pending"],
  paused: ["active", "closed"],
  paused_evidence_drift: ["active", "closed"],
  closed: [],
};

// ---------------------------------------------------------------------------
// 4. Order State Machine (§9.4)
// ---------------------------------------------------------------------------
export const ORDER_STATUSES = [
  "UNITS_RESERVED",
  "PAYMENT_PENDING",
  "PAYMENT_CONFIRMED",
  "ALLOCATION_PENDING",
  "ALLOCATION_SUBMITTED",
  "ALLOCATION_CONFIRMED",
  "COMPLETED",
  "REJECTED",
  "EXPIRED",
  "PAYMENT_FAILED",
  "ALLOCATION_FAILED",
  "REFUND_PENDING",
  "REFUNDED",
  "RECONCILIATION_REQUIRED",
  "MANUAL_REVIEW",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  UNITS_RESERVED: ["PAYMENT_PENDING", "EXPIRED", "REJECTED"],
  PAYMENT_PENDING: ["PAYMENT_CONFIRMED", "PAYMENT_FAILED", "EXPIRED"],
  PAYMENT_CONFIRMED: ["ALLOCATION_PENDING", "ALLOCATION_FAILED", "REFUND_PENDING", "MANUAL_REVIEW"],
  ALLOCATION_PENDING: ["ALLOCATION_SUBMITTED", "ALLOCATION_FAILED", "MANUAL_REVIEW"],
  ALLOCATION_SUBMITTED: [
    "ALLOCATION_CONFIRMED",
    "ALLOCATION_FAILED",
    "RECONCILIATION_REQUIRED",
  ],
  ALLOCATION_CONFIRMED: ["COMPLETED", "RECONCILIATION_REQUIRED"],
  COMPLETED: [],
  REJECTED: [],
  EXPIRED: [],
  PAYMENT_FAILED: [],
  ALLOCATION_FAILED: ["REFUND_PENDING", "MANUAL_REVIEW"],
  REFUND_PENDING: ["REFUNDED"],
  REFUNDED: [],
  RECONCILIATION_REQUIRED: ["COMPLETED", "MANUAL_REVIEW"],
  MANUAL_REVIEW: ["COMPLETED", "REFUND_PENDING", "REJECTED"],
};

// ---------------------------------------------------------------------------
// Entity Type Union & Unified Registry
// ---------------------------------------------------------------------------
export type StateEntityType = "property" | "manifest" | "offering" | "order";

export interface TransitionRule {
  entityType: StateEntityType;
  fromStatus: string;
  toStatus: string;
}

export const CANONICAL_TRANSITIONS: Record<
  StateEntityType,
  {
    statuses: readonly string[];
    transitions: Record<string, readonly string[]>;
  }
> = {
  property: {
    statuses: PROPERTY_STATUSES,
    transitions: PROPERTY_TRANSITIONS,
  },
  manifest: {
    statuses: MANIFEST_STATUSES,
    transitions: MANIFEST_TRANSITIONS,
  },
  offering: {
    statuses: OFFERING_STATUSES,
    transitions: OFFERING_TRANSITIONS,
  },
  order: {
    statuses: ORDER_STATUSES,
    transitions: ORDER_TRANSITIONS,
  },
};

/**
 * Validates whether a state transition is permitted for an entity type.
 */
export function isValidTransition(
  entityType: StateEntityType,
  fromStatus: string,
  toStatus: string
): boolean {
  if (fromStatus === toStatus) return true; // Idempotent no-op
  const config = CANONICAL_TRANSITIONS[entityType];
  if (!config) return false;
  const allowed = config.transitions[fromStatus];
  return Array.isArray(allowed) && allowed.includes(toStatus);
}

/**
 * Generates SQL CHECK constraint expression for a status column.
 */
export function generateSqlCheckConstraint(
  entityType: StateEntityType,
  columnName = "status"
): string {
  const statuses = CANONICAL_TRANSITIONS[entityType].statuses;
  const list = statuses.map((s) => `'${s}'`).join(", ");
  return `${columnName} IN (${list})`;
}

/**
 * Generates SQL INSERT statements to seed the `allowed_transitions` table.
 */
export function generateAllowedTransitionsSql(): string {
  const rows: { entity: string; from: string; to: string }[] = [];

  for (const [entityType, config] of Object.entries(CANONICAL_TRANSITIONS)) {
    for (const [fromStatus, toList] of Object.entries(config.transitions)) {
      for (const toStatus of toList) {
        rows.push({ entity: entityType, from: fromStatus, to: toStatus });
      }
    }
  }

  const valuesSql = rows
    .map(
      (r) =>
        `  ('${r.entity}', '${r.from}', '${r.to}')`
    )
    .join(",\n");

  return `INSERT INTO allowed_transitions (entity_type, from_status, to_status) VALUES\n${valuesSql}\nON CONFLICT (entity_type, from_status, to_status) DO NOTHING;`;
}

