# NIVASA — Product Requirements Document (PRD)

| | |
| --- | --- |
| **Product** | NIVASA — India-first real-world-asset (RWA) lifecycle infrastructure prototype |
| **Document version** | 1.0 (derived from *Architecture V4 and Execution Source of Truth*, 6 Nov 2026) |
| **Status** | Draft for build; hackathon prototype |
| **Owner / Builder** | Solo developer (intermediate Solidity / dApp experience) |
| **Event** | ETHGlobal Mumbai, November 2026 |
| **Chain / Stack** | Hedera Testnet (Asset Tokenization Studio, "ATS"), Next.js + Supabase, 0G Private Computer |

> **Prototype disclaimer.** NIVASA is an engineering prototype using one fictional Maharashtra commercial property and simulated figures. It is not legal, tax, investment, valuation or regulatory advice. It must not solicit or accept real investment, issue a real security, promise property ownership, or be represented as government-approved. Every screen carries the label **SIMULATED DEMO. NOT A REAL OFFERING.**

---

## 1. Overview

### 1.1 Product summary
NIVASA demonstrates one **complete, honest, verifiable asset lifecycle** for a single fictional Mumbai commercial property: evidence review → rights definition → evidence-gated token issuance → eligible-investor participation → recoverable settlement → pause/resume on evidence change → public verification → AI-explained change analysis.

It is deliberately **not a marketplace**. The product thesis is that existing tokenization demos prove a token can be created, but responsible tokenization needs a connected workflow that ties property evidence to the token itself and lets a stranger verify the result.

### 1.2 Problem statement — the Real-World Asset Lifecycle Gap
Real-world assets carry large economic value, but turning them into trustworthy digital instruments involves:
- fragmented property evidence,
- unclear investor rights,
- disconnected compliance steps,
- weak post-issuance accountability (what happens when evidence changes, or a settlement step fails?).

### 1.3 Why this positioning
A prior-art search of the ETHGlobal showcase dataset (snapshot 25 Sep 2026) found fractional real-estate tokenization with KYC/whitelist to be crowded (59+ projects), and Hedera ATS used for bonds, collateral and lending but **not for property issuance**. NIVASA therefore positions as lifecycle infrastructure, not a marketplace.

**Permitted claim:** *"In a keyword search of a 25 September 2026 snapshot of the ETHGlobal showcase, we did not find a project combining property evidence review, evidence-gated ATS issuance, automatic pause on evidence change, recoverable settlement and a public verification page."*
**Prohibited claims:** first, only, novel in the world; legal compliance; title verification; regulatory approval; investment suitability.

---

## 2. Goals and Non-Goals

### 2.1 Goals
1. Prove a real **Hedera ATS lifecycle**: configure, issue, restrict, pause and resume, with on-chain transaction evidence.
2. Make settlement **safe**: idempotent, recoverable, never falsely "complete".
3. **Bind evidence to the token** (D1) and handle evidence changes fail-closed (D2).
4. Let anyone **verify, not trust** (D3 public Verify page).
5. Use **0G Private Computer** for evidence-cited change analysis with real request IDs (D5).
6. Add India-first depth: Maharashtra evidence checklist, completeness score, benchmark sanity band (D6).
7. Deliver a polished issuer / verifier / investor / admin experience.

### 2.2 Non-Goals (explicitly out of scope)
Marketplace, secondary trading, AMM, multi-property support, bridges, real fiat settlement, government land-record integration, autonomous trading agent, x402 payments, custom ERC-3643 or custom registry contract, Arc integration, real KYC/identity documents, real deeds.

### 2.3 Success criteria
A judge can independently verify: what the fictional submission contains; what the verifier reviewed; which evidence root and rights hash sit on the ATS asset; which Hedera transactions occurred; what happened to the asset when evidence changed; which verified wallet received the token; which 0G request produced the analysis; which inputs were simulated; and what happens when a critical step fails.

---

## 3. Target Users and Roles

| Role | Responsibilities | Must NOT be able to |
| --- | --- | --- |
| **Issuer** | Create property; upload evidence; propose offering and rights; upload revised evidence | Approve own property/manifest/offering; change eligibility; grant roles |
| **Verifier** | Review evidence manifests; review investor eligibility; approve resume after drift | Issue tokens; review own submissions; grant roles |
| **Investor** | Bind wallet; request eligibility; place orders; view holdings; run analysis | Read others' data; set own status; bypass restrictions |
| **Admin** | Assign roles (trusted server path); activate/pause/close offerings; read-only audit view; demo controls | Unilaterally approve every stage |
| **Public visitor** | Open the Verify page without login | See personal or private data |

No user may set their own role, KYC status, eligibility or verification status through any public API. **Separation of duties is enforced in the database**, not only the UI:
- manifest reviewer ≠ property issuer
- offering approver ≠ offering proposer
- eligibility reviewer ≠ investor being reviewed
- post-drift resume approver ≠ uploader of the changed evidence

---

## 4. Product Differentiators (D1–D6)

| ID | Capability | What a judge sees |
| --- | --- | --- |
| **D1** | Evidence-gated issuance | Activation refused until an approved manifest root and the rights hash are read back from the ATS asset |
| **D2** | Evidence-drift auto-pause | Revised document uploaded → asset pauses on Hedera → orders stop → re-review resumes |
| **D3** | Public Verify page | No-login page; each check PASS / FAIL / UNAVAILABLE against the chain |
| **D4** | Settlement under failure | Injected fault, visible timeline, exactly one confirmed allocation, no duplicate |
| **D5** | Change intelligence | Property snapshot changes; 0G explains what moved and cites evidence IDs |
| **D6** | India-first evidence | Maharashtra checklist, completeness score, RBI HPI / Ready Reckoner sanity band |

**Build priority:** D1 → D2 → D3 → D4 → D5 → D6. **Cut order is reverse** (D6 first).

---

## 5. Demo Asset

One fictional Mumbai commercial property. All figures labelled **SIMULATED, NOT A REAL OFFERING.**

| Item | Value |
| --- | --- |
| Valuation | INR 10,00,00,000 |
| Units / unit value | 10,000 units × INR 10,000 |
| Demo allocation | 5 units (INR 50,000) |
| Simulated annual rent / gross yield | INR 72,00,000 / 7.2% (rent ÷ valuation; not net yield, forecast or guarantee) |
| Identifiers | Offering `NIVASA-MH-001`, rights v1.0, asset ref `PROPERTY-MH-001` |

**Snapshot 2 (scripted event):** valuation INR 10,50,00,000; occupancy 90% → 85%; rent INR 72,00,000 → 68,00,000; operating costs INR 14,00,000 → 16,00,000. Narrative: *valuation rose while income-based indicators weakened*. All figures are computed by code, never stored by hand or invented by the model.

---

## 6. User Journey (Eight-Beat Demo)

1. **Evidence.** Issuer submits property against the Maharashtra checklist. A different user reviews. Server builds a Merkle-rooted evidence manifest; verifier approves that exact version.
2. **Rights.** A versioned rights document states what the token does and does not represent.
3. **Gated issuance (D1).** ATS asset configured with cap + KYC; rights hash and manifest root are written to the asset; offering activates only because both exist.
4. **Participation.** Wallet binding by signature → eligibility → signed acknowledgement of rights hash → reservation → simulated payment.
5. **Allocation under failure (D4).** Demo fault interrupts first submission; worker recovers from stored transaction ID; one allocation confirms; reconciliation completes the order.
6. **Restriction.** Transfer to an ineligible wallet is rejected by ATS (recorded proof run).
7. **Evidence drift (D2).** Issuer uploads a revised valuation report → offering pauses on Hedera → new orders refused → different verifier re-approves → asset resumes.
8. **Verify and understand (D3, D5).** Public Verify page passes; a scripted event changes the snapshot; 0G explains the change with a stored request ID.

---

## 7. Functional Requirements

Priority key: **P0** = Tier A core, **P1** = Tier B differentiators, **P2** = Tier C stretch.

### 7.1 Identity, Roles and Wallet Binding
| ID | Requirement | Pri |
| --- | --- | --- |
| FR-1.1 | Supabase auth with role-aware access (issuer, investor, verifier, admin). Role grants only via a server-only function. | P0 |
| FR-1.2 | Wallet binding: single-use nonce (≥16 bytes, ~10 min expiry) → EIP-191 signature naming domain, user ID, nonce, chain ID 296, expiry → server recovers signer, consumes nonce, sets `wallet_verified_at`. | P0 |
| FR-1.3 | A wallet belongs to exactly one user. Changing a bound wallet revokes the old on-chain registration and requires fresh eligibility review. | P0 |
| FR-1.4 | Investor eligibility request → verifier review (reviewer ≠ investor) → on approval the worker registers the wallet on-chain (`sync_eligibility`); expiry/revocation revokes on-chain. | P0 |

### 7.2 Evidence System (D1, D6)
| ID | Requirement | Pri |
| --- | --- | --- |
| FR-2.1 | Issuer creates property and uploads documents against `config/evidence-checklist.maharashtra.json` (Property Card, Sale/Conveyance Deed, Index II, Encumbrance Search, Approved Plans, Occupancy Certificate, Property Tax Receipt, Valuation Report; optional Lease evidence). Checklist is illustrative, not legal advice. | P0 |
| FR-2.2 | Per-document record: type, private storage path, server-computed SHA-256, source/issuing authority, source reference, issue and valid-until dates, MIME/size, uploader, reviewer, review method, status, limitation note, superseded-by. | P0 |
| FR-2.3 | Upload hardening: server-side hashing over the received stream; MIME allowlist (PDF/PNG/JPEG); size cap; strip image metadata; private bucket; short-lived signed URLs, every issuance logged; documents never sent to the LLM. | P0 |
| FR-2.4 | **Evidence manifest:** leaf = SHA-256 of canonical JSON (sorted keys, no whitespace) of each document entry; root = Merkle root with sorted-pair hashing; manifest contains hashes, types, statuses only. Tested with fixed vectors. | P1 |
| FR-2.5 | Verifier approves **one exact manifest version**; at most one approved, non-superseded manifest per property; approved manifests are immutable. Verifier UI shows diff vs previous version; every decision requires a reason. | P1 |
| FR-2.6 | **Completeness score** = weighted share of required documents that are present, verified and within validity. Shown with its limits; never labelled "clear title". | P1 |
| FR-2.7 | Property-level decisions are an append-only history (`property_verifications`); UI says "Demo review completed" / "Simulated verification", never a green "Verified Property" badge. | P0 |
| FR-2.8 | Benchmarks: static versioned RBI HPI (residential context only; don't splice differing base years) and Maharashtra Ready Reckoner rates as a sanity band (ratio < 1 raises a review flag). Never fetched live. | P2 |
| FR-2.9 | Duplicate detection (pg_trgm on normalized address, HMAC of parcel/survey ID, issuer identity) raises a review flag, never a fraud conclusion. | P2 |

### 7.3 Rights and Offering (D1)
| ID | Requirement | Pri |
| --- | --- | --- |
| FR-3.1 | Versioned rights document: what the token represents (simulated economic interest), what it does not (title, ownership, voting/control unless stated), income entitlement, transfer rule, redemption rule, risk disclosures, simulated status. | P0 |
| FR-3.2 | Offering proposal requires a verified property with an approved manifest; approver ≠ proposer. | P0 |
| FR-3.3 | **D1 activation gate.** Offering becomes `active` only when a worker job confirms all six: (1) verified property + approved manifest; (2) rights version with stored hash; (3) ATS asset with cap, KYC, transfer restrictions; (4) on-chain document `rights` equals rights hash; (5) on-chain document `evidence-manifest` equals approved manifest root; (6) eligibility policy version set. The activate route only enqueues jobs. If any read-back fails the offering stays `token_configured` and the ops panel shows which condition failed. | P1 |
| FR-3.4 | New rights versions need re-approval and re-anchoring; existing orders remain pinned to the version signed. | P1 |

### 7.4 Evidence-Drift Protocol (D2)
| ID | Requirement | Pri |
| --- | --- | --- |
| FR-4.1 | Triggers: **T1** document added/replaced/removed after approval (demo trigger); **T2** stored-file hash mismatch; **T3** required document past valid-until; **T4** stale valuation snapshot (off for demo); **T5** admin-recorded dispute/revocation. | P1 (T1), P2 (T2–T5 where time allows) |
| FR-4.2 | On detection (dedupe key: property + trigger + manifest version): build manifest n+1 as `submitted`; move offering `active → paused_evidence_drift` (reservations refused immediately); enqueue `pause_asset` (pauser key) and read `isPaused` back. | P1 |
| FR-4.3 | In-flight orders: unsubmitted → `MANUAL_REVIEW`; already submitted continue to confirmation/reconciliation; failures follow the normal failure path; never lost or falsely complete. | P1 |
| FR-4.4 | Re-review by a verifier who is not the uploader; `POST /api/offerings/:id/resume` enqueues `set_manifest_document`, `unpause_asset`, `verify_activation`. Return to `active` only after the new root is read back on-chain and `isPaused = false`. | P1 |
| FR-4.5 | UX: offering-page banner "Issuance paused: evidence changed on [date], re-review in progress"; orders refused with `OFFERING_PAUSED_EVIDENCE`; disclose that pause may also halt holder-to-holder transfers. | P1 |
| FR-4.6 | Every step writes an audit entry (old/new roots, tx IDs). Same drift event processed twice → one manifest version and one pause. | P1 |

### 7.5 Investment, Settlement and Recovery (D4)
| ID | Requirement | Pri |
| --- | --- | --- |
| FR-5.1 | `POST /api/investments` with `Idempotency-Key` and signed acknowledgement (offering ID, rights version + hash, units, price, total, wallet, nonce, expiry, "simulated demo" text). Server verifies signature and terms, then calls atomic `reserve_units`. | P0 |
| FR-5.2 | `reserve_units` (Postgres, SECURITY DEFINER) locks the offering row; checks active status, idempotency, minimum, verified wallet, eligibility (including `chain_status = registered`), supply, per-investor max; creates order in `PAYMENT_PENDING` with expiry. | P0 |
| FR-5.3 | Simulated payment (flag-gated `DEMO_PAYMENTS`) moves order to `PAYMENT_CONFIRMED`; trigger enqueues `allocate_units` (dedupe key = order ID). No endpoint lets a browser claim payment/allocation. | P0 |
| FR-5.4 | Worker claims jobs with `SKIP LOCKED`, re-checks eligibility and offering active (fail closed → `MANUAL_REVIEW`), persists attempt_no + tx ID + signed-bytes hash **before** submitting, submits, confirms via receipt + Mirror Node. | P0 |
| FR-5.5 | Timeouts are not failures: attempt becomes `unknown`; query Mirror Node by stored tx ID; found-success → continue; found-failed → attempt n+1 with new ID; not found → resubmit same signed bytes, or new attempt only after valid-duration window passes. Never two live attempts. | P0 |
| FR-5.6 | **Reconcile** compares issuance event, receiving wallet, unit count and holder balance. Match → `COMPLETED`; mismatch → `RECONCILIATION_REQUIRED`. `COMPLETED` is set **only** by reconciliation. | P0 |
| FR-5.7 | Payment succeeded but allocation failed → `ALLOCATION_FAILED` → `REFUND_PENDING` (simulated) or `MANUAL_REVIEW`; never dropped or marked complete. | P0 |
| FR-5.8 | Outbox: at-least-once, idempotent handlers, exponential backoff, max attempts, `dead` status, unique `(type, dedupe_key)`, bounded work per invocation. No chain calls inline in route handlers. | P0 |
| FR-5.9 | **Settlement timeline** per order: each state with timestamp, each attempt with tx ID/status, HashScan links; **assertion panel** after recovery (units on chain, units ordered, attempts used, duplicates prevented). | P1 |
| FR-5.10 | **Fault injector** (`DEMO_FAULTS`): `timeout_after_submit`, `fail_before_submit`, `duplicate_job`; acts on the real code path and chain; persistent "FAULT INJECTION ENABLED (demo)" banner; refuses to start in production; each armed fault audit-logged. | P1 |
| FR-5.11 | Background jobs: `expire_reservations`, `sync_eligibility`, `reconcile_supply`, `stuck_orders`, `integrity_check`, plus those above. | P0/P1 |

### 7.6 Hedera / ATS Integration
| ID | Requirement | Pri |
| --- | --- | --- |
| FR-6.1 | Use real ATS (Diamond-pattern EVM contracts, ERC-1400 / partial ERC-3643), never an unrelated ERC-20 presented as ATS. Hedera Testnet EVM chain ID 296. | P0 |
| FR-6.2 | Narrow `AtsAdapter` interface (SDK mode and disclosed manual mode): `getAssetConfiguration`, `registerInvestor`, `revokeInvestor`, `setDocument`, `getDocument`, `pauseAsset`, `unpauseAsset`, `isPaused`, `prepareIssue`, `submitPrepared`, `getHolderBalance`, `getTxStatus`, `canTransfer`. | P0 |
| FR-6.3 | **ATS go/no-go gate (4-hour timebox)** with real testnet tx IDs in `docs/ats-gate.md`: reuse deployed addresses if available; create/fund ECDSA accounts; create asset with cap/KYC/restrictions; register + issue; read balance and Mirror event; set and read back two documents; pause → failed transfer → unpause → successful transfer; transfer from unregistered wallet fails (captured). | P0 |
| FR-6.4 | Role-separated ECDSA keys: deployer/admin (operator machine only), issuer-agent (issuance, daily cap), compliance (KYC), pauser (worker only). No endpoint signs client-supplied calldata. | P0 |
| FR-6.5 | Chain reads: contract calls via JSON-RPC relay / Mirror contract-call endpoint (not HTS endpoints); Mirror Node for events; confirmed = SUCCESS receipt + Mirror record; handle Mirror lag with pending state + last-sync time. | P0 |
| FR-6.6 | **Restriction proof run** (`scripts/restriction-proof.ts`): eligible and ineligible demo wallets attempt transfers; tx IDs and outcomes written to audit log (`restriction_proof`). | P0 |

### 7.7 Public Verify Page (D3)
| ID | Requirement | Pri |
| --- | --- | --- |
| FR-7.1 | `/verify/offering/[id]` — no login. Checks: **C1** rights-doc hash recomputed = on-chain; **C2** manifest Merkle root recomputed = on-chain; **C3** manifest approved, current, reviewer role ≠ issuer role; **C4** on-chain `isPaused` agrees with DB status; **C5** on-chain supply = sum of COMPLETED orders ≤ cap; **C6** latest restriction proof verified on Mirror Node; **C7** audit-chain head recomputed end to end. | P1 |
| FR-7.2 | Each check shows PASS / FAIL / UNAVAILABLE, evidence link (e.g. HashScan), time checked, and a one-line "what this does not prove". Chain failure → UNAVAILABLE, never default PASS. | P1 |
| FR-7.3 | `/verify/receipt/[token]` — unguessable token; shows units, price snapshot, signed rights version/hash, signature-recovers-to-wallet result, allocation tx link, on-chain balance ≥ units; wallet shortened; no name/email. | P1 |
| FR-7.4 | Data via narrow SECURITY DEFINER `public_offering_view`; ~30 s cache; rate-limited; footer: technical integrity check, not proof of title/legal validity/suitability. Checks are pure functions with injected readers (`lib/verify/checks.ts`) so tamper tests are possible. | P1 |

### 7.8 Property Intelligence and AI (D5)
| ID | Requirement | Pri |
| --- | --- | --- |
| FR-8.1 | Three layers: (1) deterministic TypeScript engine for metrics and snapshot deltas (decimal arithmetic, never floats for money); (2) fit policy with hard limits and missing-data rules (incomplete evidence → `insufficient_evidence`); (3) 0G explanation. | P0 (minimal) / P1 (full) |
| FR-8.2 | Append-only `property_snapshots` (occupancy, rent, costs, valuation, provenance label, event note, manifest ID). Flag-gated scripted event via `POST /api/demo/property-event`, labelled simulated. | P1 |
| FR-8.3 | Delta per indicator: from, to, absolute/percent change, direction, policy flag, supporting evidence IDs (unsupported indicators marked as such). | P1 |
| FR-8.4 | 0G Private Computer call: server-side credentials, ~20–30 s timeout, ≤1 repair retry, **every request ID recorded**, store provider/model/input hash/output hash/validation status/attestation if present. Cache by (user, property, input hash); rate-limit per user; only bucketed/pseudonymized preferences; never documents. | P0 |
| FR-8.5 | Zod-validated response schema (summary, preference_fit enum, changes, risk_flags, assumptions, missing_information, cannot_determine, source_ids, disclaimer). Reject: invalid JSON, bad enums, IDs outside allowlist, numbers not in deterministic metrics, causal claims absent from event note, missing fields. | P0 |
| FR-8.6 | AI may explain and cite; it may **not** forecast returns, invent data, approve anything, trigger pause/resume/transactions, or present advice. Wording: "fit with your stated preferences", "indicators" — never "suitability/recommendation". | P0 |
| FR-8.7 | Prompt-injection defence: issuer free text delimited as untrusted, fixed system policy, ID allowlist. | P0 |
| FR-8.8 | 0G outage → "analysis temporarily unavailable"; deterministic metrics stay; never substitute an unlabelled model. | P0 |
| FR-8.9 | Reason to return: Property Updates feed, "new analysis available" prompt when input hash changes, stale-evidence reminders (T3/T4). | P1 |

### 7.9 Audit and Admin Ops
| ID | Requirement | Pri |
| --- | --- | --- |
| FR-9.1 | Hash-chained, append-only `audit_logs` (advisory-lock append function; UPDATE/DELETE revoked). Every privileged mutation is audited. | P0 |
| FR-9.2 | Admin ops panel: stuck/dead jobs, order timelines with correlation ID across DB/chain/AI logs, demo controls with banners. | P1 |
| FR-9.3 | Demo flags (`DEMO_PAYMENTS`, `DEMO_FAULTS`, `DEMO_EVENTS`) refuse to start when `APP_ENV=production` and show persistent banners. | P0 |

---

## 8. Screens

1. **Landing** — what NIVASA is; prototype limitations.
2. **Offering page** — rights summary, evidence status, completeness score, chain references, drift banner, link to Verify.
3. **Issuer dashboard** — Maharashtra checklist + score, upload, manifest versions, rights versions; warning that revised evidence will pause issuance.
4. **Verifier dashboard** — review queue, manifest diff, evidence sources/hashes, prior decisions, required-reason form.
5. **Investor dashboard** — chain-confirmed holdings (separate from pending orders), last-sync time, wallet status, settlement timeline, receipt link.
6. **Property Intelligence** — snapshot history, deterministic changes, 0G analysis with timestamp + request ID, provenance, cannot-determine items.
7. **Public Verify** (no login) — offering and receipt pages.
8. **Admin ops** — jobs, timelines, flag-gated demo controls.

A persistent **SIMULATED DEMO. NOT A REAL OFFERING.** banner appears on every page.

---

## 9. State Models (single source: `lib/state/transitions.ts`)

Enforced by DB trigger against an `allowed_transitions` table; no generic update-status endpoint.

- **Property:** `draft → submitted → in_review → verified | rejected | needs_more_information → submitted`; `verified → in_review | disputed | expired | revoked`; `disputed → in_review | revoked`.
- **Evidence manifest:** `draft → submitted → approved → superseded` (or `rejected`).
- **Offering:** `draft → proposed → legal_review_pending → approved_for_demo → token_configured → active`; `active ↔ paused`; `active → paused_evidence_drift → active`; any active/paused state `→ closed`. (`approved_for_demo` ≠ legal authorization.)
- **Order:** `UNITS_RESERVED → PAYMENT_PENDING → PAYMENT_CONFIRMED → ALLOCATION_PENDING → ALLOCATION_SUBMITTED → ALLOCATION_CONFIRMED → COMPLETED`; exceptions: `REJECTED, EXPIRED, PAYMENT_FAILED, ALLOCATION_FAILED, REFUND_PENDING, REFUNDED, RECONCILIATION_REQUIRED, MANUAL_REVIEW`.

---

## 10. System Architecture

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Frontend | Next.js App Router, TypeScript, Tailwind | Server components for reads; client components only for wallet actions |
| API | Next.js Route Handlers + Zod | Authenticated mutations, role checks, validation, stable error codes |
| Domain | `lib/*` modules | Evidence, manifests, drift, offering, eligibility, settlement, reconciliation, verification, AI, audit |
| Data | Supabase Postgres + private Storage | Operational data, private docs, SQL functions for atomic operations |
| Worker | Cron-triggered protected route | Outbox, drift checks, expiry, reconciliation, eligibility sync |
| Chain | Hedera Testnet: ATS contracts, JSON-RPC relay, Mirror Node | Token lifecycle, balances, asset state, documents, events |
| AI | 0G Private Computer + deterministic TS engine | Change explanation and metrics |

**Sources of truth:** ATS on Hedera → asset config, cap, KYC, pause, balances, anchored hashes. Supabase → profiles, private docs, workflow state, orders, manifests, snapshots. Verification process → human review outcome. Deterministic engine → numbers. 0G → natural-language explanation only. Rights document → intended meaning of the interest.

**Access model:** RLS-scoped client for reads; narrow SECURITY DEFINER function for public Verify; writes via SECURITY DEFINER SQL or a narrow service-role module; worker uses service role guarded by cron secret; Origin checks, JSON content type and rate limits on every mutation; service-role/signer keys never in client bundles.

---

## 11. Data Model (15 MVP tables)

- **Identity/eligibility:** `profiles`, `user_roles`, `investor_eligibility`
- **Property/evidence:** `properties`, `property_documents`, `evidence_manifests`, `property_verifications`, `property_snapshots`
- **Offering/rights:** `offerings`, `offering_rights`
- **Settlement:** `investment_orders`, `allocation_attempts`, `outbox_jobs`
- **AI/audit:** `ai_episodes`, `audit_logs`

**Conventions:** UUID PKs; timestamptz; RLS on every table; money as `numeric(20,2)` with a decimal library (never JS number); percentages `numeric(5,2)`; units `bigint` (strings in JSON); status CHECKs generated from the transition table; derived values computed not hand-maintained.

**Key constraints:** unique `idempotency_key`; unique `(type, dedupe_key)` on outbox; at most one confirmed `allocation_attempt` per order; at most one approved non-superseded manifest per property; approved manifests and snapshots immutable; separation-of-duties triggers; `audit_logs` append-only by privilege.

**Stretch/deferred:** `distributions`, `distribution_entitlements`, HCS anchoring column (Tier C). Deferred: disputes, valuations, legal structures, payment events, refund records, chain events/transactions, reconciliation runs, ai_evidence.

---

## 12. API Surface (24 mutation routes + 1 poll)

Reads are server components. All routes: authenticated (unless stated), Zod-validated, identity from session, stable error codes, rate-limited.

| Group | Routes |
| --- | --- |
| Property | `POST /api/properties`, `/:id/documents`, `/:id/submit`, `/:id/verifications` |
| Offering | `POST /api/offerings`, `/:id/rights`, `/:id/approve`, `/:id/activate`, `/:id/pause`, `/:id/resume`, `/:id/close` |
| Wallet / eligibility | `POST /api/wallet/nonce`, `/api/wallet/verify`, `/api/eligibility/requests`, `/api/eligibility/:id/review` |
| Investment | `POST /api/investments`; `GET /api/investments/:id` (owner-only poll) |
| Demo (flag-gated) | `POST /api/demo/payment-confirmation`, `/api/demo/faults`, `/api/demo/property-event` |
| AI | `POST /api/ai/profile`, `/api/ai/analyze-offering`, `/api/ai/analyze-changes` |
| Admin / system | `POST /api/admin/roles`, `/api/cron/worker` (cron secret) |

**Stable error codes:** `OFFERING_NOT_FOUND`, `OFFERING_NOT_ACTIVE`, `OFFERING_PAUSED_EVIDENCE`, `WALLET_NOT_VERIFIED`, `NOT_ELIGIBLE`, `BELOW_MINIMUM`, `ABOVE_INVESTOR_MAX`, `INSUFFICIENT_UNITS`, `MANIFEST_NOT_APPROVED`, `SOD_VIOLATION`, `FLAG_DISABLED`.

**Never exposed over HTTP:** allocation, reconciliation, expiry, eligibility sync, drift/integrity checks, pause/unpause, document anchoring, supply reconciliation (these are internal jobs).

---

## 13. Non-Functional Requirements

### 13.1 Security principles (non-negotiable)
Legal rights before token labels • evidence stays attached to approval • restrictions at the token layer • chain is authoritative for balances/asset state • no false settlement success • drift fails closed • verify, don't trust • no sensitive data on public chain/storage • AI explains, code calculates • fail closed for privileged actions • audit every privileged mutation • prototype status always visible • one canonical state model • chain side effects via outbox only • least-privilege keys.

### 13.2 Threat mitigations (summary)
Fake property → provenance + independent review; evidence swap → manifest root bound to approval + D2 pause; over-issuance → ATS cap + supply reconcile + C5; admin compromise → SoD + audit chain; key theft → role-separated keys + issuance cap; wallet spoofing → signed nonce; duplicate allocation → pre-persisted tx ID + query before retry; oversubscription → row-locked reservation; demo controls in prod → flags refuse production; AI hallucination/prompt injection → deterministic metrics, allowlists, validation, delimited untrusted text; Mirror lag → pending/UNAVAILABLE states.

### 13.3 Performance / reliability
- Worker invocations do bounded work within the platform timeout; backoff and dead-letter visibility.
- Verify reads cached ~30 s; chain-read failure degrades to UNAVAILABLE.
- Hedera finality is deterministic: confirmed = SUCCESS receipt + Mirror record; no reorg logic.

### 13.4 Compliance posture
Standing corrections: DELTA is *proposed*, not enacted (say "inspired by", never "compliant with"); tokenization ≠ land ownership; an SPV does not solve securities regulation; a hash proves integrity not authenticity; payment and allocation are not atomic; 0G Storage optional, real inference with real request IDs required; never fabricate request IDs, roots, models or proofs.

---

## 14. Testing and Acceptance

### 14.1 Test strategy
Vitest + Postgres tests against local/branch Supabase (no Hardhat; no custom contract). Coverage areas: RLS (two investors + one issuer, using the RLS-scoped client), separation of duties, invalid transitions, idempotency, **concurrency (20 parallel reservations for the last 5 units yields exactly the permitted orders)**, audit chain integrity, D1 gate failures, Merkle vectors, D2 drift behaviour, D3 tamper tests, D4 fault recovery, D5 validator rejections.

### 14.2 `npm run adversarial` (14 mandatory scenarios; report pasted in README)
1. Unverified issuer activates offering · 2. Activation without manifest root on ATS asset · 3. Duplicate property submitted with different scans · 4. Issue beyond approved supply (ATS cap) · 5. Unverified wallet receives/transfers · 6. Unauthorized verifier action · 7. Same investment request twice · 8. Payment confirmation replayed · 9. Payment succeeds but allocation fails · 10. Timeout after submit → one allocation · 11. Evidence replaced after approval → pause + orders refused · 12. Resume by evidence uploader refused · 13. 0G malformed JSON / invented number / timeout · 14. Tampered rights doc or manifest fails Verify.

### 14.3 Acceptance criteria

**Tier A (core)**
- [ ] ATS genuinely used (SDK mode, or manual mode disclosed); asset on Hedera Testnet with cap, KYC and transfer restrictions.
- [ ] Eligible investor with signature-verified wallet receives allocation; tx inspectable on HashScan.
- [ ] Transfer to unregistered wallet rejected; proof run recorded.
- [ ] Duplicate orders and replayed payments allocate nothing extra; concurrency test passes.
- [ ] Failed allocation never marked COMPLETED; COMPLETED only via reconciliation.
- [ ] Real 0G inference in main flow; request ID stored and shown; invalid output rejected.
- [ ] RLS enabled and tested; users cannot grant own role/eligibility.
- [ ] No secrets in client bundles or Git; README states limitations.

**Tier B (differentiators)**
- [ ] D1: activation refused until approved manifest root and rights hash are read back from the ATS asset.
- [ ] D2: revised evidence pauses offering and asset; orders refused; re-approval by a different reviewer resumes.
- [ ] D3: Verify page runs C1–C7; tampered inputs fail; chain failures show UNAVAILABLE.
- [ ] D4: injected fault ends with one confirmed allocation; timeline shows attempts.
- [ ] D5: scripted event yields deterministic delta and validated, evidence-cited 0G explanation.
- [ ] `npm run adversarial` passes and report is in README.

---

## 15. Delivery Plan

### 15.1 Tiers
| Tier | Content | Est. hours | Choose when |
| --- | --- | --- | --- |
| **A. Core** | ATS gate, thin slice (eligibility, reservation, allocation, reconciliation), restriction proof, minimal 0G call | 14–16 | < ~20 hours remain |
| **B. Differentiators** | D1–D4 fully, D5 simplified | 22–25 total | ≥ ~25 hours remain |
| **C. Stretch** | D6 benchmarks, HCS anchoring, ATS dividend, duplicate-detection UI | beyond B | Only if B finishes early |

The submission deadline (7 Nov 2026, 9:00 AM IST) is **unverified** — confirm on the live dashboard before choosing a tier.

### 15.2 Phases
| Phase | Tier | Hrs | Work | Exit condition |
| --- | --- | --- | --- | --- |
| 0 Freeze scope | A | 0.5 | Confirm deadline; pin ATS/Node/npm; confirm 0G access; repo | Scope + environment page in repo |
| 1 ATS gate | A | ≤4 | Section 7.6 gate incl. documents, pause/unpause, restricted transfer | Reproducible testnet ops; tx IDs in `docs/ats-gate.md` |
| 2 Foundation | A | 2 | Next.js, Tailwind, Supabase auth, migrations, RLS, seed data | Role-aware app on seeded data |
| 3 Thin slice | A | 4.5 | Adapter, wallet binding, eligibility, reservation, payment, outbox worker, allocation, reconcile, restriction proof, portfolio | Real on-chain balance; no double allocation |
| 4 Minimal AI | A | 2 | Metrics, 0G call, validation, episode record | Real request ID stored/shown |
| 5 Evidence gate + drift | B | 2.5 | Manifest, Merkle root, anchoring, D1 jobs, D2 pause/resume | On-chain root gates activation; upload pauses asset |
| 6 Verify page | B | 1.5 | C1–C7, receipt page | Tampered inputs fail |
| 7 Timeline + faults | B | 1 | Timeline, injector, assertion panel | Fault recovery visible |
| 8 Change intelligence | B | 1.5 | Snapshots, scripted event, delta, richer schema | Cited change analysis |
| 9 Widen workflow | B | 1.5 | Issuer checklist, verifier diff, offering page, ops panel | End-to-end usable |
| 10 Hardening + submission | A/B | 3 | Adversarial run, RLS tests, secrets scan, README, diagram, HashScan check, two videos, clean-browser test | Judge can run/inspect and verify |
| 11 Stretch | C | — | D6, HCS, dividend, duplicate UI | Only after Tier B |

**Checkpoints:** hour 5 – if ATS gate incomplete, switch adapter to manual mode; hour 12 – if thin slice unfinished, start cut ladder; ~3.5 h before deadline – feature freeze.

### 15.3 Cut ladder (drop in order)
1) Tier C → 2) D6 benchmarks (keep checklist + score) → 3) ops/timeline polish → 4) duplicate-detection UI → 5) signed acknowledgement → unsigned labelled checkbox → 6) D5 → single-snapshot explanation → 7) SDK adapter → manual mode → 8) D4 → timeout fault only.

**Never cut:** reservation function, outbox + idempotency, RLS + separation of duties, simulation labels, real ATS use, real 0G call, adversarial tests 7–11. Never claim an on-chain operation that was not performed.

**If < ~12 hours remain:** compressed ATS gate, seeded data, only eligibility → reservation → allocation → reconciliation → restriction proof → minimal 0G call → two short videos; describe D1–D6 as designed, not built.

---

## 16. Hackathon Strategy and Deliverables

- **Primary prize — Hedera tokenization track** (confirm exact name/requirements on live page): real ATS use, Hedera Testnet deployment, public repo, short demo video. Story: configure → gate on evidence root + rights hash → issue to verified wallet → rejected transfer → pause/resume on drift → public verification.
- **Secondary — 0G Private Computer:** inference in main flow, real request IDs, reason to return, "what breaks without 0G" sentence, separate short video.
- **Not targeted:** x402, Arc, Uniswap AMM, Hedera no-Solidity track, extra identity/oracle/indexing sponsors.

**Demo script (~3 min):** 0:00 problem + banner → 0:20 checklist, review, manifest approval → 0:50 rights hash, gated activation, wallet + signed ack → 1:20 injected timeout, recovery, one HashScan allocation, rejected transfer → 1:55 revised valuation report, pause, refused order, re-approval, resume → 2:25 Verify page passes, 0G analysis with request ID, state limits. Execute the real run before recording; never stage fake HashScan links or request IDs.

**README must include:** problem; what NIVASA does/doesn't do; legal limitations; prior-art method and limits; architecture diagram; roles/workflows; D1–D6; exact ATS release + adapter mode; testnet references, doc tx IDs, HashScan links; real 0G request IDs; DB setup; RLS/security notes; env vars; local setup; test commands incl. adversarial report; demo link/videos; known limitations; threat model; production requirements; ETHGlobal AI-use disclosure; license.

---

## 17. Risks and Assumptions

| Risk / Assumption | Impact | Mitigation |
| --- | --- | --- |
| ATS SDK/flows differ from docs (largest uncertainty) | Blocks D1/D2 | 4-hour gate; manual adapter mode; disclose honestly |
| Pause semantics unknown (does issuance work while paused? do holder transfers halt?) | Affects D2 behavior and UX copy | Confirm in gate; fall back to DB fail-closed + proven on-chain control |
| Submission deadline unverified / <1 day left | Scope overrun | Tiered plan, cut ladder, <12-hour fallback |
| 0G endpoint/model/auth/attestation unconfirmed | Blocks AI | Verify contract first; safe-stop UX |
| Mirror Node lag / rate limits | Stale UI, flaky reconcile | Pending states, caching, worker reconcile |
| Prior-art claims go stale (snapshot ends 25 Sep 2026) | Credibility | Re-run search; use only the permitted wording |
| DELTA legal status changes | Wrong legal wording | Re-check before any legal copy; say "inspired by proposed" |
| Hackathon rules on pre-existing work / similar ideas | Disqualification | Check ETHGlobal rules before submission |

**Open items to verify before building:** live deadline + prize requirements; ETHGlobal rules on similar/pre-existing work; ATS release, SDK, Node/npm versions; reusable deployed testnet addresses; asset type (equity vs bond); multi-document support; pause/unpause semantics; rejected-transfer records on Mirror Node; ECDSA derivation; Mirror/JSON-RPC limits; max tx valid duration; 0G endpoint/model/attestation; RBI HPI and IGR e-ASR access terms; prior-art re-run; DELTA status.

---

## 18. Out of Scope: Production Readiness

Before any real investor launch: Indian legal and securities analysis, issuer/SPV structuring, DELTA status confirmation, title search and independent diligence, independent valuation and governance, RERA analysis, KYC/AML/sanctions, DPDP Act assessment, tax/stamp duty/accounting, regulated payment and custody providers, investor disclosures and grievance handling, smart-contract and application security audit, multisig custody, operational controls for distributions/redemption/defaults, secondary-transfer analysis, penetration testing, and append-only audit storage outside the app DB. **A prototype showing technical feasibility does not establish legal feasibility or regulatory permission.**

---

## 19. Guiding Principle

When uncertain, do not invent a capability or claim: verify official documentation, test the exact integration, record the evidence, and update the source-of-truth document. **Build one honest, reproducible, secure lifecycle — not a larger demo implying guarantees the system cannot prove.**
