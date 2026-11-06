import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  formatINR,
  formatUnits,
  formatPercent,
  formatArea,
} from "../lib/ui/format";
import {
  getPropertyStatePresentation,
  getManifestStatePresentation,
  getOfferingStatePresentation,
  getOrderStatePresentation,
  getEligibilityStatePresentation,
  getCheckStatePresentation,
} from "../lib/ui/state-map";
import {
  PROPERTY_STATUSES,
  MANIFEST_STATUSES,
  OFFERING_STATUSES,
  ORDER_STATUSES,
} from "../lib/state/transitions";

describe("Milestone M3: UI Design System, Primitives, Shell & Landing Page", () => {
  describe("1. Formatting Helpers (lib/ui/format.ts)", () => {
    it("formats INR with Indian lakh/crore number grouping", () => {
      expect(formatINR("185000000")).toBe("₹18,50,00,000.00");
      expect(formatINR("10000000")).toBe("₹1,00,00,000.00");
      expect(formatINR("18500")).toBe("₹18,500.00");
      expect(formatINR("500")).toBe("₹500.00");
      expect(formatINR("0")).toBe("₹0.00");
    });

    it("formats units with tabular comma formatting", () => {
      expect(formatUnits(10000)).toBe("10,000");
      expect(formatUnits(1)).toBe("1");
      expect(formatUnits(1000000)).toBe("1,000,000");
    });

    it("formats percentages and distinguishes percentage points", () => {
      expect(formatPercent(7.2)).toBe("7.20%");
      expect(formatPercent(0.5, { isPercentagePoint: true })).toBe("0.50 pp");
      expect(formatPercent(12.3456, { showSign: true })).toBe("+12.35%");
    });

    it("formats area in square feet", () => {
      expect(formatArea(14250)).toBe("14,250 sq ft");
      expect(formatArea(10688)).toBe("10,688 sq ft");
      expect(formatArea(100, "sqm")).toBe("100 sq.m (1,076 sq.ft)");
    });
  });

  describe("2. Canonical State Presentation Map (lib/ui/state-map.ts)", () => {
    it("provides complete presentation mapping for all property statuses", () => {
      for (const status of PROPERTY_STATUSES) {
        const presentation = getPropertyStatePresentation(status);
        expect(presentation).toBeDefined();
        expect(presentation.label).toBeTruthy();
        expect(presentation.variant).toMatch(/^(success|warning|danger|info|pending)$/);
        expect(presentation.icon).toBeDefined();
      }
    });

    it("provides complete presentation mapping for all manifest statuses", () => {
      for (const status of MANIFEST_STATUSES) {
        const presentation = getManifestStatePresentation(status);
        expect(presentation).toBeDefined();
        expect(presentation.label).toBeTruthy();
        expect(presentation.variant).toMatch(/^(success|warning|danger|info|pending)$/);
        expect(presentation.icon).toBeDefined();
      }
    });

    it("provides complete presentation mapping for all offering statuses", () => {
      for (const status of OFFERING_STATUSES) {
        const presentation = getOfferingStatePresentation(status);
        expect(presentation).toBeDefined();
        expect(presentation.label).toBeTruthy();
        expect(presentation.variant).toMatch(/^(success|warning|danger|info|pending)$/);
        expect(presentation.icon).toBeDefined();
      }
    });

    it("provides complete presentation mapping for all order statuses", () => {
      for (const status of ORDER_STATUSES) {
        const presentation = getOrderStatePresentation(status);
        expect(presentation).toBeDefined();
        expect(presentation.label).toBeTruthy();
        expect(presentation.variant).toMatch(/^(success|warning|danger|info|pending)$/);
        expect(presentation.icon).toBeDefined();
      }
    });

    it("provides complete presentation mapping for eligibility and verify checks", () => {
      const eligibilityStatuses = ["pending", "eligible", "ineligible", "expired", "revoked"] as const;
      for (const status of eligibilityStatuses) {
        const pres = getEligibilityStatePresentation(status);
        expect(pres.label).toBeTruthy();
        expect(pres.icon).toBeDefined();
        expect(pres.variant).toMatch(/^(success|warning|danger|info|pending)$/);
      }

      for (const check of ["PASS", "FAIL", "UNAVAILABLE"] as const) {
        const pres = getCheckStatePresentation(check);
        expect(pres.label).toBeTruthy();
        expect(pres.icon).toBeDefined();
        expect(pres.variant).toMatch(/^(success|warning|danger|info|pending)$/);
      }
    });
  });

  describe("3. Root Shell & Persistent Simulation Banner", () => {
    it("verifies PrototypeBanner contains exact text 'SIMULATED DEMO · NOT A REAL OFFERING'", () => {
      const bannerPath = path.resolve(process.cwd(), "components/shell/PrototypeBanner.tsx");
      const content = fs.readFileSync(bannerPath, "utf-8");
      expect(content).toContain("SIMULATED DEMO · NOT A REAL OFFERING");
    });

    it("verifies PrototypeBanner is mounted in RootLayout so every route displays it", () => {
      const layoutPath = path.resolve(process.cwd(), "app/layout.tsx");
      const content = fs.readFileSync(layoutPath, "utf-8");
      expect(content).toContain("<PrototypeBanner");
    });

    it("verifies LegalFooter contains exact UI §6.4 limitation statement", () => {
      const footerPath = path.resolve(process.cwd(), "components/shell/LegalFooter.tsx");
      const content = fs.readFileSync(footerPath, "utf-8");
      expect(content).toContain("Technical prototype only.");
      expect(content).toContain("This page does not establish title, legal validity, regulatory authorization, or investment suitability.");
      expect(content).toContain("DELTA references are inspired by a proposed framework and do not mean NIVASA is compliant with or approved under it.");
    });
  });

  describe("4. Master Prompt Rule 11 Copy Restrictions Sweep", () => {
    const forbiddenPhrases = [
      "government verified",
      "government approved",
      "DELTA compliant",
      "clear title",
      "legally verified",
      "guaranteed return",
      "safe investment",
      "recommended investment",
      "investment suitability",
      "ownership token",
      "buy property",
      "invest now",
      "passive income",
      "risk-free",
      "official title deed",
    ];

    it("verifies no forbidden phrases appear in UI components and app pages", () => {
      const scanDirs = [
        path.resolve(process.cwd(), "app"),
        path.resolve(process.cwd(), "components"),
      ];

      function scan(dir: string, violations: string[] = []): string[] {
        if (!fs.existsSync(dir)) return violations;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (entry.name !== "node_modules" && entry.name !== ".next") {
              scan(fullPath, violations);
            }
          } else if (/\.(tsx|ts|jsx|js|md)$/.test(entry.name)) {
            const content = fs.readFileSync(fullPath, "utf-8");
            for (const phrase of forbiddenPhrases) {
              const regex = new RegExp(`\\b${phrase}\\b`, "i");
              // Exclude limitation note explanations that explicitly say "What NIVASA does not claim" or disclaimers
              const matches = content.match(regex);
              if (matches) {
                // If it's in a disclaimer saying "does not establish ... investment suitability" or "do not mean NIVASA is DELTA compliant", check if it's a disclaimer
                const lines = content.split("\n");
                lines.forEach((line, idx) => {
                  if (regex.test(line)) {
                    // Allowed only if it's explicitly negating/disclaiming: e.g. "not", "does not", "Avoid:"
                    const isNegated = /(does not|not|Avoid|Never|Prohibited|forbidden|claim)/i.test(line);
                    if (!isNegated) {
                      violations.push(`${fullPath}:${idx + 1} matches forbidden phrase: "${phrase}" -> "${line.trim()}"`);
                    }
                  }
                });
              }
            }
          }
        }
        return violations;
      }

      const allViolations: string[] = [];
      for (const dir of scanDirs) {
        scan(dir, allViolations);
      }

      expect(allViolations).toEqual([]);
    });
  });

  describe("5. Semantic Design Token Enforcement", () => {
    it("ensures zero hardcoded hex values in components and app routes", () => {
      const scanDirs = [
        path.resolve(process.cwd(), "app"),
        path.resolve(process.cwd(), "components"),
      ];

      const hexRegex = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;
      const violations: string[] = [];

      function checkDir(dir: string) {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            checkDir(fullPath);
          } else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) {
            const content = fs.readFileSync(fullPath, "utf-8");
            const lines = content.split("\n");
            lines.forEach((line, idx) => {
              if (line.includes("globals.css") || line.includes("lint-tokens")) return;
              const matches = line.match(hexRegex);
              if (matches) {
                violations.push(`${fullPath}:${idx + 1} contains raw hex: ${matches.join(", ")}`);
              }
            });
          }
        }
      }

      for (const dir of scanDirs) {
        checkDir(dir);
      }

      expect(violations).toEqual([]);
    });
  });
});
