import { describe, it, expect } from "vitest";
import {
  PROPERTY_STATUSES,
  PROPERTY_TRANSITIONS,
  MANIFEST_STATUSES,
  MANIFEST_TRANSITIONS,
  OFFERING_STATUSES,
  OFFERING_TRANSITIONS,
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
  CANONICAL_TRANSITIONS,
  isValidTransition,
  generateSqlCheckConstraint,
  generateAllowedTransitionsSql,
  StateEntityType,
} from "./transitions";

describe("State Transitions & Constraints (ARCH §9, §17.1)", () => {
  it("verifies all transition target states exist in their respective status sets", () => {
    // Property
    for (const [from, toList] of Object.entries(PROPERTY_TRANSITIONS)) {
      expect(PROPERTY_STATUSES).toContain(from);
      for (const to of toList) {
        expect(PROPERTY_STATUSES).toContain(to);
      }
    }

    // Manifest
    for (const [from, toList] of Object.entries(MANIFEST_TRANSITIONS)) {
      expect(MANIFEST_STATUSES).toContain(from);
      for (const to of toList) {
        expect(MANIFEST_STATUSES).toContain(to);
      }
    }

    // Offering
    for (const [from, toList] of Object.entries(OFFERING_TRANSITIONS)) {
      expect(OFFERING_STATUSES).toContain(from);
      for (const to of toList) {
        expect(OFFERING_STATUSES).toContain(to);
      }
    }

    // Order
    for (const [from, toList] of Object.entries(ORDER_TRANSITIONS)) {
      expect(ORDER_STATUSES).toContain(from);
      for (const to of toList) {
        expect(ORDER_STATUSES).toContain(to);
      }
    }
  });

  it("generates SQL CHECK constraints that accurately match TypeScript status arrays", () => {
    const entityTypes: StateEntityType[] = ["property", "manifest", "offering", "order"];

    for (const entityType of entityTypes) {
      const sqlCheck = generateSqlCheckConstraint(entityType, "status");
      const expectedStatuses = CANONICAL_TRANSITIONS[entityType].statuses;

      for (const status of expectedStatuses) {
        expect(sqlCheck).toContain(`'${status}'`);
      }
      expect(sqlCheck.startsWith("status IN (")).toBe(true);
      expect(sqlCheck.endsWith(")")).toBe(true);
    }
  });

  it("generates valid allowed_transitions SQL seed containing every valid edge", () => {
    const sql = generateAllowedTransitionsSql();
    expect(sql).toContain("INSERT INTO allowed_transitions");

    // Check specific critical transitions per ARCH §9
    expect(sql).toContain("('property', 'draft', 'submitted')");
    expect(sql).toContain("('property', 'in_review', 'verified')");
    expect(sql).toContain("('manifest', 'submitted', 'approved')");
    expect(sql).toContain("('manifest', 'approved', 'superseded')");
    expect(sql).toContain("('offering', 'active', 'paused_evidence_drift')");
    expect(sql).toContain("('offering', 'paused_evidence_drift', 'active')");
    expect(sql).toContain("('order', 'UNITS_RESERVED', 'PAYMENT_PENDING')");
    expect(sql).toContain("('order', 'ALLOCATION_CONFIRMED', 'COMPLETED')");
  });

  it("enforces isValidTransition logic including idempotency and rejection of invalid edges", () => {
    // Idempotent transitions are permitted
    expect(isValidTransition("property", "in_review", "in_review")).toBe(true);
    expect(isValidTransition("offering", "active", "active")).toBe(true);

    // Valid forward transitions
    expect(isValidTransition("property", "draft", "submitted")).toBe(true);
    expect(isValidTransition("offering", "token_configured", "active")).toBe(true);
    expect(isValidTransition("order", "PAYMENT_PENDING", "PAYMENT_CONFIRMED")).toBe(true);

    // Invalid backwards or illegal skips
    expect(isValidTransition("property", "verified", "draft")).toBe(false);
    expect(isValidTransition("manifest", "draft", "approved")).toBe(false); // must submit first
    expect(isValidTransition("offering", "draft", "active")).toBe(false); // must go through verification & config
    expect(isValidTransition("order", "UNITS_RESERVED", "COMPLETED")).toBe(false); // cannot skip payment & allocation
  });
});

