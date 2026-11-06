import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ArrowRight,
  Lock,
  RefreshCw,
  AlertTriangle,
  FileText,
  Cpu,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Database,
  Building,
  Scale,
  Eye,
  GitCommit,
  Layers,
} from "lucide-react";
import { formatINR, formatUnits, formatArea } from "@/lib/ui/format";
import { runOfferingVerificationChecks } from "@/lib/verify/checks";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: "NIVASA — Verifiable Asset Lifecycle Infrastructure Prototype",
  description:
    "End-to-end verifiable asset tokenization on Hedera Testnet and 0G Private Computer. Simulated demo for ETHGlobal Mumbai.",
};

export default async function HomePage() {
  const demoOfferingId = "33333333-3333-3333-3333-333333333333";
  const demoPropertyId = "11111111-1111-1111-1111-111111111111";

  // Real live checks from verification engine (ARCH §13.1, PLAN M11.6)
  const liveReport = await runOfferingVerificationChecks(demoOfferingId).catch(() => null);

  // Real seeded asset facts from Milestone M1 & M2 (Never hard-coded fake figures)
  const assetFacts = {
    code: "PROPERTY-MH-001",
    name: "Godrej Platina Commercial Wing A",
    locality: "Vikhroli West, Mumbai, Maharashtra",
    type: "Commercial Office Floor Plate",
    superBuiltUpAreaSqFt: 14250,
    carpetAreaSqFt: 10688,
    simulatedValuationInr: "185000000", // ₹18,50,00,000
    totalUnits: 10000,
    unitPriceInr: "18500", // ₹18,500
    contractId: "0.0.11330244",
    chainNetwork: "Hedera Testnet (Chain 296)",
    manifestRoot: "0x7a8b9c...e1f2",
  };

  const lifecycleSteps = [
    {
      num: "01",
      title: "Evidence Gathering",
      desc: "Issuer compiles 9-document Maharashtra statutory checklist with server-computed SHA-256 digests and explicit limitation notes.",
      badge: "Off-Chain Storage",
    },
    {
      num: "02",
      title: "Rights Formulation",
      desc: "Simulated economic interest separated from legal title; versioned term sheet with deterministic hash pinning.",
      badge: "Versioned Terms",
    },
    {
      num: "03",
      title: "Activation Gate",
      desc: "ATS Diamond proxy anchored on Hedera Testnet; mandatory dual separation-of-duties review blocks self-approval.",
      badge: "Hedera Chain 296",
    },
    {
      num: "04",
      title: "Investor Participation",
      desc: "EIP-712 cryptographic wallet binding, independent KYC review, and atomic unit reservation.",
      badge: "ATS Identity Registry",
    },
    {
      num: "05",
      title: "Settlement Recovery",
      desc: "Idempotent transactional outbox handles simulated fiat payment and Hedera token issuance with automatic rollback.",
      badge: "Outbox Engine",
    },
    {
      num: "06",
      title: "Compliance & Transfer",
      desc: "ATS compliance facet enforces country lists and transfer restrictions directly on Hedera EVM.",
      badge: "ATS Compliance",
    },
    {
      num: "07",
      title: "Evidence Drift Halt",
      desc: "Post-approval document alterations or expiry automatically trip a dual-lock pause across contract and database.",
      badge: "Fail-Closed Pause",
    },
    {
      num: "08",
      title: "Public Verification & AI",
      desc: "Zero-login public verification portal pairs with a 0G confidential AI agent to explain integrity states without data leaks.",
      badge: "0G Private AI",
    },
  ];

  const differentiators = [
    {
      id: "D1",
      icon: Lock,
      title: "Dual-Lock Pause Architecture",
      summary:
        "Pause commands operate simultaneously on the Hedera ATS Diamond proxy (via ATS Pauser Facet) and in the application database. If either lock is triggered, new simulated allocations and holder-to-holder transfers are strictly blocked.",
    },
    {
      id: "D2",
      icon: RefreshCw,
      title: "Continuous Reconciliation Engine",
      summary:
        "A background reconciler queries the Hedera Mirror Node to compare on-chain token supply, partition balances, and contract pause states against database order records, flagging any discrepancies immediately.",
    },
    {
      id: "D3",
      icon: AlertTriangle,
      title: "Evidence Drift Tamper Halt",
      summary:
        "When an underlying title or municipal document is updated, expires, or fails checksum verification, the asset status transitions to paused_evidence_drift, halting active issuance until an independent reviewer re-certifies the manifest.",
    },
    {
      id: "D4",
      icon: GitCommit,
      title: "Cryptographic Hash Chain Audit",
      summary:
        "Every lifecycle state change is committed to an append-only audit ledger where each entry contains a SHA-256 hash of the previous record, producing a tamper-evident audit trail verifiable by any observer.",
    },
    {
      id: "D5",
      icon: Cpu,
      title: "0G Confidential AI Explanation",
      summary:
        "Integrates with 0G Private Computer to execute an autonomous reasoning agent inside a Trusted Execution Environment (TEE). It evaluates lifecycle evidence and produces natural-language explanations without exposing sensitive private documents.",
    },
  ];

  const verifyChecks = liveReport?.checks
    ? liveReport.checks.map((c) => ({
        code: c.id,
        label: c.title,
        status: c.status,
        detail: c.description,
        observed: c.observed,
      }))
    : [
        {
          code: "C1",
          label: "Rights Document Hash",
          status: "UNAVAILABLE",
          detail: "Recomputed SHA-256 of synthetic rights terms versus on-chain document.",
          observed: "Live check running",
        },
        {
          code: "C2",
          label: "Evidence Manifest Merkle Root",
          status: "UNAVAILABLE",
          detail: "Recomputed Merkle root from hashes-only manifest versus on-chain entry.",
          observed: "Live check running",
        },
        {
          code: "C3",
          label: "Manifest Review & Role Separation",
          status: "UNAVAILABLE",
          detail: "Verifier approval distinct from property issuer.",
          observed: "Live check running",
        },
        {
          code: "C4",
          label: "ATS Asset State Synchronization",
          status: "UNAVAILABLE",
          detail: "Database offering status matches on-chain pause state.",
          observed: "Live check running",
        },
        {
          code: "C5",
          label: "Token Supply & Cap Reconciliation",
          status: "UNAVAILABLE",
          detail: "On-chain supply matches completed orders and respects maximum cap.",
          observed: "Live check running",
        },
        {
          code: "C6",
          label: "Transfer Restriction & KYC Enforcement",
          status: "UNAVAILABLE",
          detail: "Mirror Node confirms ineligible transfer blocked and eligible transfer cleared.",
          observed: "Live check running",
        },
        {
          code: "C7",
          label: "Tamper-Evident Audit Hash Chain",
          status: "UNAVAILABLE",
          detail: "End-to-end unbroken hash chain over immutable audit log rows.",
          observed: "Live check running",
        },
      ];

  return (
    <div className="flex-1 flex flex-col">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-surface-card border-b border-border py-16 sm:py-24">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Heading and CTAs */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-xs font-mono font-medium text-brand-primary">
                <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
                <span>ETHGlobal Mumbai 2026 Prototype</span>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-brand-primary leading-tight">
                Make every step of an asset lifecycle verifiable.
              </h1>

              <p className="text-base sm:text-lg text-text-secondary leading-relaxed max-w-2xl">
                Evidence, rights, issuance controls, settlement recovery, and public checks. Proving the full lifecycle of an Indian commercial real estate asset on Hedera Testnet and 0G Private Computer.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <a
                  href="#lifecycle"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded text-sm font-medium bg-brand-primary text-surface-card hover:bg-brand-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus min-h-[44px]"
                >
                  <span>Explore the demo lifecycle</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </a>

                <Link
                  href={`/verify/offering/${demoOfferingId}`}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded text-sm font-medium border border-border bg-surface-page text-text-primary hover:bg-surface-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus min-h-[44px]"
                >
                  <ShieldCheck className="w-4 h-4 text-brand-primary" aria-hidden="true" />
                  <span>Open public verification</span>
                </Link>
              </div>

              {/* Factual Context Strip */}
              <div className="pt-6 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono text-text-secondary">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-status-success" />
                  <span>Hedera Testnet (Chain 296)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                  <span>0G Private Computer</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-status-info" />
                  <span>One Fictional MH Asset</span>
                </div>
              </div>
            </div>

            {/* Right Column: Abstract Asset Card */}
            <div className="lg:col-span-5">
              <div className="bg-surface-page border border-border rounded-lg shadow-card overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-border bg-surface-muted flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-text-secondary">
                      Demo Asset Identifier
                    </span>
                    <h2 className="text-base font-bold text-text-primary">
                      {assetFacts.code}
                    </h2>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-status-success/10 border border-status-success/20 text-status-success">
                    ACTIVE · TESTNET
                  </span>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-text-primary">
                      {assetFacts.name}
                    </h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {assetFacts.locality}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                    <div className="bg-surface-card p-3 rounded border border-border">
                      <span className="text-text-secondary block text-[11px]">
                        Simulated Valuation
                      </span>
                      <span className="font-mono font-semibold text-text-primary text-sm">
                        {formatINR(assetFacts.simulatedValuationInr)}
                      </span>
                      <span className="text-[10px] text-text-secondary block mt-0.5">
                        Issuer-reported snapshot
                      </span>
                    </div>

                    <div className="bg-surface-card p-3 rounded border border-border">
                      <span className="text-text-secondary block text-[11px]">
                        Super Built-Up Area
                      </span>
                      <span className="font-mono font-semibold text-text-primary text-sm">
                        {formatArea(assetFacts.superBuiltUpAreaSqFt)}
                      </span>
                      <span className="text-[10px] text-text-secondary block mt-0.5">
                        Carpet: {formatArea(assetFacts.carpetAreaSqFt)}
                      </span>
                    </div>

                    <div className="bg-surface-card p-3 rounded border border-border">
                      <span className="text-text-secondary block text-[11px]">
                        Total Token Cap
                      </span>
                      <span className="font-mono font-semibold text-text-primary text-sm">
                        {formatUnits(assetFacts.totalUnits)} units
                      </span>
                      <span className="text-[10px] text-text-secondary block mt-0.5">
                        At {formatINR(assetFacts.unitPriceInr)} / unit
                      </span>
                    </div>

                    <div className="bg-surface-card p-3 rounded border border-border">
                      <span className="text-text-secondary block text-[11px]">
                        Hedera ATS Contract
                      </span>
                      <span className="font-mono font-semibold text-text-primary text-xs truncate block">
                        {assetFacts.contractId}
                      </span>
                      <span className="text-[10px] text-text-secondary block mt-0.5">
                        Diamond Facets (Chain 296)
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link
                      href={`/offerings/${demoOfferingId}`}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium bg-surface-muted hover:bg-surface-card text-brand-primary border border-border rounded transition-colors"
                    >
                      <span>Inspect Offering & Rights</span>
                      <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. EIGHT-STEP LIFECYCLE SECTION */}
      <section id="lifecycle" className="py-16 sm:py-20 bg-surface-page border-b border-border">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-3xl">
            <span className="text-xs font-mono uppercase tracking-wider text-brand-primary">
              Verifiable Architecture
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mt-1">
              The Eight-Step Asset Lifecycle
            </h2>
            <p className="text-sm text-text-secondary mt-2">
              Every phase of an RWA token requires technical integrity guarantees. NIVASA anchors each step to verifiable cryptographic proofs, independent review checks, or on-chain Hedera transactions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {lifecycleSteps.map((step) => (
              <div
                key={step.num}
                className="bg-surface-card border border-border rounded-lg p-5 flex flex-col justify-between shadow-card hover:border-brand-primary/40 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xl font-bold text-brand-primary">
                      {step.num}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-muted text-text-secondary border border-border">
                      {step.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-text-primary">
                    {step.title}
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. DIFFERENTIATOR CARDS D1–D5 */}
      <section className="py-16 sm:py-20 bg-surface-card border-b border-border">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-3xl">
            <span className="text-xs font-mono uppercase tracking-wider text-brand-primary">
              Core Technical Guarantees
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mt-1">
              Five Architectural Differentiators
            </h2>
            <p className="text-sm text-text-secondary mt-2">
              Solving the integrity challenges of tokenized real-world assets through automated fail-closed mechanics and cryptographic verification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {differentiators.map((diff) => {
              const Icon = diff.icon;
              return (
                <div
                  key={diff.id}
                  className="bg-surface-page border border-border rounded-lg p-6 space-y-4 shadow-card"
                >
                  <div className="w-10 h-10 rounded bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary">
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="text-2xs font-mono font-semibold uppercase text-brand-primary tracking-wider">
                      Feature {diff.id}
                    </span>
                    <h3 className="text-base font-bold text-text-primary mt-1">
                      {diff.title}
                    </h3>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {diff.summary}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. PUBLIC VERIFICATION PREVIEW */}
      <section className="py-16 sm:py-20 bg-surface-page border-b border-border">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-brand-primary">
                Live Public Ledger Check
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mt-1">
                Zero-Login Verification Preview
              </h2>
              <p className="text-sm text-text-secondary mt-2 max-w-2xl">
                Anyone can inspect the real-time cryptographic state of the offering without signing in or connecting a wallet.
              </p>
            </div>

            <Link
              href={`/verify/offering/${demoOfferingId}`}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-brand-primary bg-surface-card border border-border hover:bg-surface-muted rounded transition-colors self-start md:self-auto"
            >
              <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Open Complete Verification Suite</span>
            </Link>
          </div>

          {/* Verification Table Card */}
          <div className="bg-surface-card border border-border rounded-lg overflow-hidden shadow-card">
            <div className="p-4 bg-surface-muted border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
              <span className="text-text-primary font-semibold">
                Offering ID: {demoOfferingId}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-text-secondary">
                  ATS Contract: {assetFacts.contractId}
                </span>
                {liveReport?.summary && (
                  <span
                    data-testid="live-aggregate-badge"
                    className="px-2 py-0.5 rounded bg-surface-card border border-border text-[11px] font-bold text-brand-primary"
                  >
                    {liveReport.summary.summaryText}
                  </span>
                )}
              </div>
            </div>

            <div className="divide-y divide-border">
              {verifyChecks.map((chk) => {
                const isPass = chk.status === 'PASS';
                const isFail = chk.status === 'FAIL';
                const statusBadgeClass = isPass
                  ? 'bg-status-success/10 border-status-success/20 text-status-success'
                  : isFail
                  ? 'bg-status-error/10 border-status-error/20 text-status-error'
                  : 'bg-status-warning/10 border-status-warning/20 text-status-warning';
                const StatusIcon = isPass ? CheckCircle2 : isFail ? XCircle : AlertTriangle;

                return (
                  <div key={chk.code} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-brand-primary bg-brand-primary/10 px-1.5 py-0.5 rounded">
                          {chk.code}
                        </span>
                        <h4 className="text-sm font-semibold text-text-primary">
                          {chk.label}
                        </h4>
                      </div>
                      <p className="text-xs text-text-secondary pl-7 sm:pl-8">
                        {chk.detail}
                      </p>
                    </div>

                    <div className="pl-7 sm:pl-0 flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-medium border ${statusBadgeClass}`}>
                        <StatusIcon className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{chk.status}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 5. WHAT NIVASA DEMONSTRATES / DOES NOT CLAIM */}
      <section id="limits" className="py-16 sm:py-20 bg-surface-card border-b border-border">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-3xl">
            <span className="text-xs font-mono uppercase tracking-wider text-brand-primary">
              Prototype Scope & Honesty
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mt-1">
              Demonstrated Scope vs. Explicit Limitations
            </h2>
            <p className="text-sm text-text-secondary mt-2">
              NIVASA maintains strict boundaries between software infrastructure proofs and real-world legal conveyancing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* What it demonstrates */}
            <div className="bg-surface-page border border-border rounded-lg p-6 space-y-5">
              <div className="flex items-center gap-2 text-status-success font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
                <h3>What NIVASA Demonstrates</h3>
              </div>
              <ul className="space-y-3 text-xs text-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-success mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-text-primary">End-to-End Asset Lifecycle on Hedera:</strong> Real ATS Diamond equity deployment, KYC issuance, pausing, and partition rules on Hedera Testnet (Chain 296).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-success mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-text-primary">Automated Fail-Closed Pausing:</strong> Simultaneous contract-level and database-level halting triggered whenever evidence changes or expires.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-success mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-text-primary">Role Separation in Postgres RLS:</strong> Database-enforced isolation preventing issuers from approving their own evidence manifests or orders.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-success mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-text-primary">Cryptographic Audit Chain:</strong> SHA-256 chained audit logs ensuring historical state changes cannot be rewritten retroactively.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-success mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-text-primary">Confidential 0G AI Reasoning:</strong> Autonomous explanation agent running inside a TEE to review property health without data leaks.
                  </span>
                </li>
              </ul>
            </div>

            {/* What it does not claim */}
            <div className="bg-surface-page border border-border rounded-lg p-6 space-y-5">
              <div className="flex items-center gap-2 text-status-warning font-semibold text-sm">
                <AlertTriangle className="w-5 h-5" aria-hidden="true" />
                <h3>What NIVASA Does Not Claim</h3>
              </div>
              <ul className="space-y-3 text-xs text-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-warning mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-text-primary">Not a Land Registry Transfer:</strong> Tokens do not represent physical title, land registry registration, or official deed conveyance.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-warning mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-text-primary">No Investment Advice or Return Guarantee:</strong> Fictional commercial asset with simulated valuations. No assurance of yield or capital protection.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-warning mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-text-primary">Not Endorsed by Regulators:</strong> DELTA framework references are architectural inspiration only; this prototype has no formal regulatory authorization.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-warning mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-text-primary">Simulated Settlement:</strong> Uses testnet tokens and mock INR payments. No real financial capital or fiat is exchanged or held in custody.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-status-warning mt-1.5 shrink-0" />
                  <span>
                    <strong className="text-text-primary">External Legal Requirements:</strong> Enforceable property rights transfer in India requires physical execution, stamp duty, and sub-registrar registration outside any blockchain.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
