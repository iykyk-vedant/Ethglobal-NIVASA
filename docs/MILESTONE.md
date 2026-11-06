# NIVASA — MILESTONE.md (Execution Plan for the Coding Agent)

**Product:** NIVASA — India-first RWA lifecycle infrastructure prototype (Hedera ATS + 0G Private Computer)
**Event:** ETHGlobal Mumbai, November 2026 · **Builder:** solo developer + coding agent
**Submission deadline (fixed by the builder): 6 November 2026, 11:00 PM IST** (supersedes the earlier unverified 7 Nov 9:00 AM). **Environment variables are already provided in the local `.env` file.**
**Companion docs (read before coding):**

| Doc | Role |
| --- | --- |
| `NIVASA — Architecture V4 and Execution Source of Truth.md` (**ARCH**) | Behavior, security, data, state machines, API, chain rules, tests |
| `PRD.md` (**PRD**) | Requirements with IDs (FR-x.x), scope, acceptance criteria |
| `UI.md` (**UI**) | Visual system, screens, components, accessibility, copy rules |
| `MILESTONE.md` (this file) | **Order of work**, tasks, exit conditions |

**Precedence on conflict:** ARCH > PRD > UI > MILESTONE. This file never overrides a security or behavior rule; it only sequences work. If a task here conflicts with ARCH, follow ARCH and note it in the Progress Log.

---

## 0. Agent Operating Rules

1. **Work one milestone at a time, in order.** Do not start a milestone until the previous one's exit conditions pass. Tick checkboxes (`- [x]`) and add a line to the Progress Log (§20) as you finish.
2. **Read the referenced sections first.** Each milestone lists `Refs:` (e.g. `ARCH §14`, `PRD FR-5.x`, `UI §8.7`). Open them before writing code.
3. **Never invent capabilities or claims.** If an ATS/0G/Hedera call is unverified, prove it with a real testnet call or stop and mark it `BLOCKED (human)`. Never fabricate tx IDs, request IDs, roots, hashes, models or HashScan links.
4. **Human-gated steps** (marked 🔑) need things the agent cannot create: funded testnet accounts, API keys, the live deadline, 0G access. Stop, list exactly what is needed, and continue only with non-blocked work.
5. **Never cut** (ARCH §23.2): atomic `reserve_units`, outbox + idempotency, RLS + separation of duties, simulation labels, real ATS use, real 0G call, adversarial tests 7–11.
6. **Security invariants in every milestone:** no chain calls inline in route handlers; no service-role/signer/0G keys in client code or `NEXT_PUBLIC_*`; every mutation derives identity from the session, validates with Zod, checks Origin, rate-limits, and returns stable error codes; every privileged mutation writes an audit entry; hiding a button is never authorization.
7. **Money and units:** `numeric(20,2)` in DB, decimal library in TS (`lib/money/decimal.ts`), unit counts `bigint`/strings. Never `Number()` a money string. UI never recalculates financial metrics with floats.
8. **Canonical states** live only in `lib/state/transitions.ts`; generate enums + DB CHECKs from it. No generic "update status" endpoint. UI maps states to labels through **one** presentation map (UI §13.4).
9. **Forbidden copy** (UI §6.3): "government verified/approved", "DELTA compliant", "clear title", "legally verified", "guaranteed", "safe investment", "recommended investment", "ownership token", "buy property", "invest now", "Verified Property". Order is never "settled" before reconciliation. Use "Demo review completed" / "Simulated verification".
10. **Every milestone ends green:** `npm run typecheck`, `npm run lint`, `npm test` pass; no secrets committed; `.env.example` updated with names only.
11. **Commit hygiene:** one logical commit per task group; message format `M<n>.<task>: <summary>`.
12. **When stuck > 30 min** on one task, apply the milestone's `Fallback`, log it, and move on.

---

## 1. Deadline, Tiers, Checkpoints and Cut Ladder

### 1.0 Deadline and time budget (authoritative)

- **Hard deadline:** 2026-11-06 23:00 IST. **Internal submit target:** 22:30 IST (30-minute buffer for upload/portal problems).
- **Feature freeze:** deadline − 3.5 h = **19:30 IST**. After freeze only M15 work (tests, README, videos, submission) is allowed.
- **Video recording window:** start no later than **21:15 IST**; both videos (Hedera, separate 0G) must be done by **22:00 IST**.
- At the start of M0 the agent runs `TZ=Asia/Kolkata date` and computes **hours remaining = 23:00 − now**. Tier is chosen by this table (it overrides the hour estimates elsewhere):

| Hours remaining at M0 | Route | What to build |
| --- | --- | --- |
| **≥ 25 h** | Full Tier A + B | M0–M15 |
| **12 – 25 h** | Tier A + the cheapest differentiators | M0–M7, then M8→M9→M11, M10 only if time; M12 timeout-fault only; skip M13 detail |
| **< 12 h (likely tonight)** | **Compressed route (ARCH §23.3)** | M0, M1 (compressed ≤ 2 h), M2 (seed data, no real evidence workflow), M3 (shell + banner + tokens only), M4, M5, M6, M7, then M15. D1–D6 are described in the README as **designed, not built** unless time clearly remains |

- If the clock shows less than 6 hours remaining: **skip M3 polish, skip the landing page beyond a minimal version, skip M8–M14 entirely**, and deliver the thin slice + restriction proof + one real 0G request ID + two short videos. A smaller honest demo beats a larger broken one.
- Re-check the clock at the end of every milestone and write `hours remaining` in the Progress Log. If a milestone overruns its budget by more than 50%, apply its fallback immediately.

### 1.1 Environment variables (already provided)

- All required variables (Supabase, Hedera accounts/keys and URLs, ATS addresses, 0G, cron secret, demo flags, etc.) are **already set in the local `.env`** by the builder. **Do not ask for them, do not regenerate them, do not print or log their values, and never commit `.env`.**
- The agent's job is only to (a) read them through `lib/env.ts` (Zod-validated, server-only), (b) report **which variable names are missing or empty** (names only), and (c) keep `.env.example` as a names-only template.
- If a variable the milestone needs is missing, stop and list the **names** needed; do not guess values.
- Deployer/admin keys and the investor test-wallet keys stay in the operator environment (`.env` read only by scripts under `scripts/`), never imported by app code.

### 1.2 Tiers

| Tier | Milestones | Hours (est.) | Definition |
| --- | --- | --- | --- |
| **A — Core** | M0–M7 | ~16 | ATS gate, thin slice settlement, restriction proof, minimal 0G call |
| **B — Differentiators** | M8–M14 | ~+8 | D1–D4 full, D5 simplified, ops UI |
| **Hardening** | M15 | ~3 | Adversarial suite, RLS tests, a11y/responsive, README, videos |
| **C — Stretch** | M16 | as available | D6 benchmarks, HCS anchoring, dividend, duplicate UI |

**Checkpoints (relative to the 23:00 IST deadline):** feature freeze 19:30 IST; recording starts by 21:15; submit by 22:30. Build-hour 5 → if M1 incomplete, switch adapter to **manual mode**; build-hour 12 → if M5/M6 incomplete, start the cut ladder; ~3.5 h before deadline → **feature freeze** (only M15 remains).

**Cut ladder (drop in order):** 1) Tier C → 2) D6 benchmarks (keep checklist + score) → 3) ops/timeline polish → 4) duplicate-detection UI → 5) signed acknowledgement → unsigned labelled checkbox → 6) D5 → single-snapshot explanation → 7) SDK adapter → manual mode → 8) D4 → timeout fault only.

**If < ~12 h remain:** compressed M1, seeded data, deliver only eligibility → reservation → allocation → reconciliation → restriction proof → minimal 0G call → two videos; describe D1–D6 as designed, not built.

---

## 2. Milestone Overview

| # | Milestone | Tier | Est. h | Depends on | 🔑 Human-gated |
| --- | --- | --- | --- | --- | --- |
| M0 | Scope freeze & repo scaffold | A | 0.5 | — | Version pins (deadline fixed, env provided) |
| M1 | ATS go/no-go gate | A | ≤4 (≤2 if compressed) | M0 | Confirm accounts funded |
| M2 | Database, auth, RLS, audit, seed | A | 2 | M0 | — (Supabase env provided) |
| M3 | Design system, app shell, trust banners | A | 2 | M0 | — |
| M4 | ATS adapter, wallet binding, eligibility | A | 2 | M1, M2 | — |
| M5 | Reservation, outbox, allocation, reconciliation | A | 3 | M4 | — |
| M6 | Investor, offering & settlement UI + restriction proof | A | 2.5 | M3, M5 | Test wallets |
| M7 | Minimal AI (0G) | A | 2 | M2, M3 | Confirm 0G key works |
| M8 | Evidence system (checklist, manifest, review) | B | 2.5 | M2, M3 | — |
| M9 | Rights + D1 activation gate | B | 2 | M1, M8 | — |
| M10 | D2 evidence-drift pause/resume | B | 2 | M9 | — |
| M11 | D3 Public Verify pages | B | 1.5 | M9 | — |
| M12 | D4 timeline, fault injector, assertion panel | B | 1 | M5, M6 | — |
| M13 | D5 change intelligence + Intelligence UI | B | 1.5 | M7, M8 | — |
| M14 | Admin ops, audit, demo controls UI | B | 1.5 | M5, M10, M12 | — |
| M15 | Hardening, tests, README, demo, submission | A/B | 3 | all | Video recording, submit by 22:30 IST |
| M16 | Stretch (Tier C) | C | — | M15 | — |

---

## M0 — Scope Freeze & Repo Scaffold  *(Tier A · 0.5 h)*

**Goal:** A buildable repo with pinned versions and a one-page scope record.
**Refs:** ARCH §3.4, §7, §26, §29 · PRD §15 · UI §13.3

- [ ] M0.1 Deadline is **fixed: 2026-11-06 23:00 IST** (§1.0). Run `TZ=Asia/Kolkata date`, compute hours remaining, pick the route from the §1.0 table and record it in `docs/scope.md`. 🔑 Human only double-checks the prize page for exact Hedera/0G requirements and video length.
- [ ] M0.2 🔑 Pin ATS release/commit, Node, npm, SDK versions → `docs/scope.md` and README stub.
- [ ] M0.3 Init Next.js (App Router, TypeScript strict), Tailwind, Zod, Vitest, ESLint, Prettier, `@supabase/supabase-js`, Lucide icons, `next/font` (Inter, Playfair Display, JetBrains Mono with fallbacks).
- [ ] M0.4 Create the repo structure from ARCH §7 (`app/`, `components/{ui,shell,evidence,offering,investor,timeline,verify,intelligence,admin}`, `config/`, `lib/*`, `supabase/`, `scripts/`, `docs/`), with `.gitkeep`/README stubs.
- [ ] M0.5 `.env` is **already populated by the builder** (§1.1). Verify it is git-ignored, create/refresh `.env.example` with **names only** (ARCH §26.2), add a script `npm run env:check` that prints only **missing/empty variable names** (never values), and add npm scripts: `dev`, `build`, `typecheck`, `lint`, `test`, `adversarial` (placeholder).
- [ ] M0.6 Commit the three spec docs into `docs/spec/` for agent reference.
- [ ] M0.7 Env guard: `lib/env.ts` validates env with Zod and **refuses to start** when `APP_ENV=production` and any `DEMO_*` flag is true.

**Exit:** `npm run dev/build/typecheck/lint/test` succeed on an empty app; `docs/scope.md` exists.

---

## M1 — ATS Go/No-Go Gate  *(Tier A · hard 4-hour timebox · 🔑)*

**Goal:** Prove the Hedera ATS operations with **real testnet transactions** before building anything that depends on them.
**Refs:** ARCH §8, §8.6, §29 · PRD FR-6.1–6.6

- [ ] M1.1 🔑 Check for already-deployed ATS testnet addresses; reuse if present. Record in `docs/ats-gate.md`.
- [ ] M1.2 🔑 Run documented ATS setup with pinned versions; use the **accounts and keys already in `.env`** (confirm each is ECDSA and funded by checking balance; if any is missing, report the variable **name**): deployer/admin, issuer-agent, compliance, pauser, plus two investor test wallets (one eligible, one not). Chain ID 296.
- [ ] M1.3 Create the demo asset with **cap, KYC, transfer restrictions** (asset ref `PROPERTY-MH-001`, 10,000 units).
- [ ] M1.4 Register one investor wallet; issue units; read balance by contract call; read the issue event from Mirror Node.
- [ ] M1.5 **Set a document** (`rights` hash) and **a second** (`evidence-manifest` root); read both back; confirm update/versioning behavior.
- [ ] M1.6 **Pause → prove transfer fails → unpause → prove transfer succeeds.** Record whether **issuance works while paused** and what pause halts.
- [ ] M1.7 Transfer from an **unregistered wallet** fails; capture the failed contract-call record on Mirror Node.
- [ ] M1.8 Record: valid-duration max for tx (ARCH §14.2), Mirror/JSON-RPC rate limits, EVM address derivation.
- [ ] M1.9 Write `scripts/ats-gate.ts` reproducing 1.3–1.7, and `docs/ats-gate.md` with **every tx ID** and HashScan links.
- [ ] M1.10 **Timebox for tonight's deadline: if the SDK path is not working after 90 minutes, switch to manual mode immediately.** Decide **adapter mode** (`sdk` or `manual`) and log it. If ATS cannot work at all: **stop** and escalate; never present a custom ERC-20 as ATS.

**Exit:** all of ARCH §8.6 items 1–9 proven with real tx IDs in `docs/ats-gate.md`, or manual mode explicitly chosen with disclosed limits.
**Fallback:** SDK stalls but ATS UI works → manual mode (operator supplies tx IDs; NIVASA records and reconciles). Disclose in README.

---

## M2 — Database, Auth, RLS, Audit, Seed  *(Tier A · 2 h · 🔑 Supabase project)*

**Goal:** Authenticated, role-aware data layer with every integrity rule enforced in Postgres.
**Refs:** ARCH §4.1, §9, §17, §18, §22.1 · PRD §3, §9, §11

- [ ] M2.1 `lib/state/transitions.ts` — single canonical transition table for property, manifest, offering, order; generate TS enums + SQL CHECKs + `allowed_transitions` seed.
- [ ] M2.2 Migrations for the **15 MVP tables** (ARCH §17.2) with UUID PKs, timestamptz, constraints, partial unique indexes (one approved manifest/property, one confirmed attempt/order, one active role per user, outbox `(type, dedupe_key)`, `idempotency_key`).
- [ ] M2.3 Enable `pgcrypto` and `pg_trgm`. Triggers: transition enforcement; derived property `verification_status`; separation-of-duties (manifest reviewer ≠ issuer, offering approver ≠ proposer, eligibility reviewer ≠ investor, resume approver ≠ evidence uploader); immutability of approved manifests and `property_snapshots`.
- [ ] M2.4 `audit_append(...)` with advisory lock + hash chain; revoke UPDATE/DELETE on `audit_logs` from app roles.
- [ ] M2.5 `reserve_units` + `counts_against_supply` exactly per ARCH §17.4 (can be wired to routes in M5).
- [ ] M2.6 `public_offering_view(offering_id)` SECURITY DEFINER, offering-level non-personal fields only.
- [ ] M2.7 RLS on **every** table, default deny, per-role policies (ARCH §18); `supabase/policies.md` documenting every service-role path. Server-only `grant_role` function; no policy lets a user write `user_roles`.
- [ ] M2.8 `lib/db/client.ts` (RLS-scoped user client) and `lib/db/admin.ts` (narrow service-role module exporting only listed operations). `lib/money/decimal.ts`.
- [ ] M2.9 Supabase auth (email/magic link), session helper, `requireRole()` guard, Origin check + JSON content-type + rate-limit middleware, stable error-code map (ARCH §19).
- [ ] M2.10 `seed.sql`: users for issuer, verifier(s) (two, distinct), investors (two), admin; a **verified property with an approved manifest**; a draft offering; rights v1; **demo accounts selectable only via authenticated seeded-account sign-in** (UI §5.4), never a self-assigned role.
- [ ] M2.11 Private storage bucket (no public read) + signed-URL helper that logs every issuance.

**Exit tests (Vitest + SQL):** RLS cross-investor read denied; user cannot set own role/eligibility/wallet_verified; invalid transitions rejected; SoD violations rejected; audit chain verifies and UPDATE/DELETE on `audit_logs` fail; 20 parallel `reserve_units` for the last 5 units yield exactly the permitted orders.

---

## M3 — Design System, App Shell, Trust Banners  *(Tier A · 2 h)*

**Goal:** The visual foundation and global trust UX every screen inherits.
**Refs:** UI §2–§6, §9, §10, §12, §13 · ARCH §21

- [ ] M3.1 Tailwind config + CSS custom properties **exactly** per UI §3.5; components consume semantic tokens only (no scattered hex). Fonts: Inter (UI), Playfair Display (landing hero only), JetBrains Mono (hashes/IDs), with fallbacks.
- [ ] M3.2 Primitives in `components/ui`: Button (primary/secondary/destructive/disabled, 44 px targets, visible focus ring), Input/Field with persistent labels + error association, Dialog (focus trap, Esc, focus return), Badge, Table (real headers, caption, mobile card/scroll adaptation), Skeleton, Tooltip, Toast (only after persisted server state).
- [ ] M3.3 Shell: `AppShell`, `PublicHeader`, `SidebarNavigation` (role-specific nav, UI §5.4), `MobileBottomNavigation` (investor), `PageHeader`, `Breadcrumbs`, `PageContainer`, `RoleLabel`.
- [ ] M3.4 **`PrototypeBanner`**: `SIMULATED DEMO · NOT A REAL OFFERING` on **every route**, non-dismissible, visible on mobile, amber/neutral treatment, with info popover. `DemoFlagBanner` driven by **server-provided flag state** (`SIMULATED PAYMENT ENABLED`, `FAULT INJECTION ENABLED (DEMO)`, `SCRIPTED PROPERTY EVENTS ENABLED (DEMO)`).
- [ ] M3.5 Legal/prototype footer (UI §6.4) on every public/offering/verify page.
- [ ] M3.6 Shared trust components: `HashValue` (monospace, copy, view-full, label of what was hashed), `TransactionReference` (HashScan link only for real tx IDs), `ChainReference`, `ProvenanceBadge`, `LimitationNote`, `CorrelationId`.
- [ ] M3.7 **Single state presentation map** (`lib/ui/state-map.ts`): canonical state → label, icon, description, semantic color; every badge has text + icon, never color-only. Covers property, manifest, offering, order, eligibility, document, verification-check states.
- [ ] M3.8 Formatting helpers: INR with Indian grouping (`₹10,00,00,000`), tabular numerals, percent vs percentage-point labelling; no float math on money.
- [ ] M3.9 Route-level `loading.tsx` / `error.tsx` for major segments; `prefers-reduced-motion` support; empty-state component (what / why / available action).
- [ ] M3.10 Landing page `/` per UI §8.1 (hero, lifecycle 8-step overview, D1–D5 sections, "does / does not claim", footer). **No fake metrics, no "Earn 7.2%"**. Verify preview shows real data only.

**Exit:** banner present on every route (test it); axe/Lighthouse a11y ≥ 95 on landing; keyboard-only nav works; viewports 375/768/1024/1440 render without horizontal body scroll; contrast ≥ AA.

---

## M4 — ATS Adapter, Wallet Binding, Eligibility  *(Tier A · 2 h)*

**Goal:** The narrow chain boundary plus provable wallet ownership and eligibility sync.
**Refs:** ARCH §8.5, §15.1, §14.4 · PRD FR-1.x, FR-6.x · UI §8.4 (eligibility), §8.6

- [ ] M4.1 `lib/hedera/{config,types,ats-adapter,chain-reads}.ts` implementing the `AtsAdapter` interface (ARCH §8.5) in `sdk` and `manual` modes, using only methods **proven in M1**. No endpoint signs client calldata.
- [ ] M4.2 Chain reads via JSON-RPC / Mirror contract-call (not HTS endpoints); confirmation = SUCCESS receipt + Mirror record; cached reads with last-sync timestamp; failures return `UNAVAILABLE`/pending, never a default success.
- [ ] M4.3 `POST /api/wallet/nonce` (≥16 bytes, ~10 min, single use) and `POST /api/wallet/verify` (EIP-191, domain/user ID/nonce/chain 296/expiry; recover signer; consume nonce; set `wallet_verified_at`). One wallet ↔ one user; changing wallet revokes old on-chain registration and requires new review.
- [ ] M4.4 `POST /api/eligibility/requests` (investor) and `POST /api/eligibility/:id/review` (verifier, ≠ investor, reason required).
- [ ] M4.5 Outbox skeleton (`lib/settlement/outbox.ts`): enqueue, claim with `FOR UPDATE SKIP LOCKED`, exponential backoff, max attempts, `dead` status, unique `(type, dedupe_key)`; `POST /api/cron/worker` protected by `CRON_SECRET` + bounded work per invocation.
- [ ] M4.6 Worker job `sync_eligibility`: register on chain after approval; revoke on expiry/revocation; update `chain_status`.
- [ ] M4.7 UI `/investor/wallet` (UI §8.6): states Not connected → Awaiting signature → Verification pending → Verified for demo / failed / rejected / wallet changed; **never mark verified from wallet extension alone**; eligibility panel shows DB status and ATS registration status separately.
- [ ] M4.8 UI `/verifier/eligibility/[id]` (UI §8.4): SoD state shown, reason required, DB eligibility vs chain registration separated.

**Exit:** investor binds a wallet by signature, verifier approves, worker registers the wallet on Hedera (tx ID visible); replayed nonce rejected; user cannot self-approve.

---

## M5 — Reservation, Outbox, Allocation, Reconciliation  *(Tier A · 3 h)*

**Goal:** Safe, idempotent, recoverable settlement. **Highest-risk milestone; no shortcuts.**
**Refs:** ARCH §9.4, §14, §15.2, §17.4 · PRD FR-5.x · UI §8.7

- [x] M5.1 `POST /api/investments`: requires `Idempotency-Key` + signed acknowledgement (ARCH §15.2); server verifies signature **and** exact terms vs DB; calls `reserve_units` via RPC; stable error codes (`NOT_ELIGIBLE`, `INSUFFICIENT_UNITS`, `OFFERING_NOT_ACTIVE`, `OFFERING_PAUSED_EVIDENCE`, …).
- [x] M5.2 `POST /api/demo/payment-confirmation` (admin, `DEMO_PAYMENTS=true`, refuses in production, audited) → `PAYMENT_CONFIRMED`; DB trigger enqueues `allocate_units` (dedupe key = order ID).
- [x] M5.3 `allocate_units` job: set `ALLOCATION_PENDING`; **re-check eligibility + offering active (fail closed → `MANUAL_REVIEW`)**; adapter `prepareIssue` with explicit tx ID; **persist attempt (attempt_no, tx ID, signed-bytes hash) before submit and commit**; submit; mark `ALLOCATION_SUBMITTED`.
- [x] M5.4 Confirm step: receipt + Mirror Node → attempt `confirmed`, order `ALLOCATION_CONFIRMED`, enqueue `reconcile_order`.
- [x] M5.5 **Unknown-outcome handling** (ARCH §14.2): timeout ⇒ attempt `unknown`; query Mirror by stored tx ID; found-success → continue; found-failed → attempt n+1 with new ID; not found → resubmit same signed bytes, or new attempt only after valid-duration window. **Never two live attempts.**
- [x] M5.6 `reconcile_order`: verify issuance event for tx, receiving wallet, unit count, holder balance → `COMPLETED` (**only here**) or `RECONCILIATION_REQUIRED`.
- [x] M5.7 Failure path: `ALLOCATION_FAILED` → `REFUND_PENDING` (simulated) or `MANUAL_REVIEW`; never dropped, never complete.
- [x] M5.8 Jobs: `expire_reservations`, `reconcile_supply`, `stuck_orders`; issuer-agent daily issuance cap (`ISSUER_DAILY_UNIT_CAP`).
- [x] M5.9 `GET /api/investments/:id` (owner-only poll for timeline).
- [x] M5.10 Tests: invariants of ARCH §14.9 — reserved+allocated ≤ supply; ≤1 confirmed attempt/order; `COMPLETED` only after reconciliation; replayed job/request/payment changes nothing; payment OK + allocation fail ≠ COMPLETED.

**Exit:** an eligible investor ends with a real on-chain balance and an order that reached `COMPLETED` through reconciliation; duplicate key / replayed payment allocate nothing extra.

---

## M6 — Investor, Offering & Settlement UI + Restriction Proof  *(Tier A · 2.5 h · 🔑 test wallets)*

**Goal:** Make the thin slice usable and inspectable.
**Refs:** UI §8.2, §8.5, §8.7, §11.4 · ARCH §14.6, §14.8 · PRD FR-5.9, FR-6.6

- [ ] M6.1 `/offerings/[id]` (UI §8.2): asset overview with **SIMULATED** labels + provenance, rights summary (represents / does not represent), evidence panel, token/chain panel (ATS ref, address, chain 296, cap/supply with chain-confirmed vs DB-reported distinction, last sync), participation panel (investor only; copy never says Invest/Buy now), offering-state UI table.
- [ ] M6.2 `/investor` dashboard (UI §8.5): wallet status, eligibility, **chain-confirmed holdings separate from pending orders**, last chain sync, recent orders; **no ROI/profit/expected-income KPIs**; stale-balance label when Mirror lags.
- [ ] M6.3 `DemoOrderForm` + `SignedAcknowledgementPanel` (UI §8.7): server-computed available supply/min/max, exact-decimal total, full acknowledgement text, wallet signature, `Idempotency-Key`, pending state; no checkout/card fields.
- [ ] M6.4 `/investor/orders/[id]`: `SettlementTimeline` (every state, timestamp, source, attempt, tx ID, HashScan link), `AllocationAttemptList`; `unknown` shown as "Checking transaction outcome"; no optimistic success toast.
- [ ] M6.5 `scripts/restriction-proof.ts` (ARCH §14.8): eligible vs unregistered wallets attempt transfers; record tx IDs, expected/observed outcome; write audit action `restriction_proof`. Keys stay in the **operator env**, not the web app.
- [ ] M6.6 `ReceiptLinkCard` (share URL generated from `receipt_token`).
- [ ] M6.7 Polling live-region updates for order status (announced without stealing focus).

**Exit (Tier A demo path):** seeded property → investor binds wallet → eligible → order → simulated payment → allocation → `COMPLETED`; HashScan links work; restriction proof recorded.

---

## M7 — Minimal AI (0G Private Computer)  *(Tier A · 2 h · 🔑 0G access)*

**Goal:** A real 0G inference with a stored real request ID in the main flow.
**Refs:** ARCH §16, §22.2 (D5) · PRD FR-8.x · UI §8.8

- [ ] M7.1 🔑 Verify current 0G endpoint, auth, model name, attestation behavior; update `.env.example` (`OG_API_KEY`, `OG_BASE_URL`, `OG_MODEL`).
- [ ] M7.2 `lib/ai/metrics.ts` (deterministic, decimal-based), `fit-policy.ts` (incomplete evidence → `insufficient_evidence`), `schemas.ts` (Zod per ARCH §16.7), `og-client.ts` (server-side only, 20–30 s timeout, ≤1 repair retry, **record every request ID** in `request_attempts`), `advisor.ts`.
- [ ] M7.3 Validator rejects: invalid JSON, bad enums, IDs outside allowlist, numbers absent from deterministic metrics, causal claims not in event note, missing fields. Untrusted issuer text delimited under fixed system policy; **no documents sent**.
- [ ] M7.4 `POST /api/ai/profile` (bucketed prefs) and `POST /api/ai/analyze-offering`; cache by (user, property, input hash); per-user rate limit; store `ai_episodes` (provider, model, input/output hash, validation status, attestation if present).
- [ ] M7.5 0G unavailable ⇒ "Analysis temporarily unavailable"; deterministic metrics remain; never substitute an unlabelled model. The AI route **cannot** trigger any chain action.
- [ ] M7.6 Minimal UI on `/intelligence/[propertyId]`: deterministic metrics, `AiExplanationPanel` with status (`Available / Pending / Temporarily unavailable / Validation failed`), request ID + timestamp, disclaimer ("Educational analysis only; not investment advice"), wording "fit with your stated preferences". Unvalidated output never rendered.

**Exit:** one real 0G call returns a validated response with a real request ID, stored and displayed; malformed/invented-number responses are rejected in tests.

> ### ✅ TIER A CHECKPOINT
> All Tier A acceptance items in PRD §14.3 pass. If time is short, jump to **M15** after this point.

---

## M8 — Evidence System: Checklist, Manifest, Review  *(Tier B · 2.5 h)*

**Goal:** Real evidence workflow replacing seeded approval (D1 foundation, D6 checklist).
**Refs:** ARCH §10, §12.1, §19 · PRD FR-2.x · UI §8.3, §8.4

- [ ] M8.1 `config/evidence-checklist.maharashtra.json` (types, required, weights, validity rules per ARCH §10.2; marked illustrative, not legal advice). `lib/evidence/checklist.ts` computes **completeness score** (weighted share of required docs present, verified, within validity).
- [ ] M8.2 `POST /api/properties`, `POST /api/properties/:id/documents`: server-side SHA-256 over received stream; MIME allowlist (PDF/PNG/JPEG); size cap; strip image metadata; private storage; log signed URL issuance; **never send documents to LLM**.
- [ ] M8.3 `lib/evidence/{manifest,merkle}.ts`: canonical JSON (sorted keys, no whitespace) leaf hashing; Merkle root with sorted-pair hashing; documented rules; **fixed test vectors** (reordering inputs doesn't change root).
- [ ] M8.4 `POST /api/properties/:id/submit` builds manifest vN; `POST /api/properties/:id/verifications` (verifier ≠ issuer, **reason required**, bound to one exact manifest version); approved manifest immutable; append-only decisions.
- [ ] M8.5 UI `/issuer` + `/issuer/properties/[id]` (UI §8.3): `EvidenceChecklistTable`, `DocumentUploadDialog` (synthetic-docs confirmation, server hash shown after accept), `ChecklistProgress` with "not a title-clearance score", `ManifestVersionList`, `ManifestRootCard`, evidence-change warning dialog, rights section stub.
- [ ] M8.6 UI `/verifier` + `/verifier/properties/[id]` (UI §8.4): queue, `ManifestDiffViewer` vs previous version, SoD state ("Eligible to review"/"You cannot review this submission"), `ReviewDecisionForm` with confirmation step naming the exact version.
- [ ] M8.7 Labels: "Demo review completed" / "Simulated verification" only.

**Exit:** issuer uploads → submits → different verifier approves one manifest version → root/hash stored; Merkle vectors pass; issuer cannot approve own.

---

## M9 — Rights + D1 Activation Gate  *(Tier B · 2 h)*

**Goal:** Evidence-gated issuance: activation only when rights hash and manifest root are read back from the ATS asset.
**Refs:** ARCH §11, §9.3 · PRD FR-3.x · UI §8.2, §8.3 (rights)

- [ ] M9.1 `POST /api/offerings` (propose; requires verified property + approved manifest), `POST /api/offerings/:id/rights` (versioned; doc hash stored), `POST /api/offerings/:id/approve` (≠ proposer).
- [ ] M9.2 Token configuration step records ATS asset ref/contract/EVM address and `configuration_hash` (`token_configured`).
- [ ] M9.3 Jobs `set_rights_document`, `set_manifest_document`, `verify_activation`: write docs via adapter, **read back from chain**, check all six D1 conditions (ARCH §11.2). `POST /api/offerings/:id/activate` (admin) **only enqueues**; the worker performs the `active` transition.
- [ ] M9.4 On any read-back failure: stay `token_configured`; record which condition failed.
- [ ] M9.5 `POST /api/offerings/:id/pause|close` (admin, jobs only for chain effects, audited).
- [ ] M9.6 UI: `ActivationGateChecklist` (per-condition result), `RightsSummary`, `RightsVersionCard`, rights compare, "re-approval & re-anchoring" explanation, `AtsAssetSummary`, `SupplySummary`; propose-rights confirmation dialog.
- [ ] M9.7 Tests (D1): activation blocked when manifest doc missing on chain / root differs / rights hash differs.

**Exit:** offering reaches `active` **only** after chain read-back of both documents matches DB; failing conditions are visible.

---

## M10 — D2 Evidence-Drift Pause/Resume  *(Tier B · 2 h)*

**Goal:** Post-approval evidence change pauses issuance on Hedera until re-review.
**Refs:** ARCH §12 · PRD FR-4.x · UI §8.2, §8.3, §10.6

- [ ] M10.1 Drift job `evidence_drift` (dedupe key: property + trigger + manifest version): builds manifest n+1 (`submitted`), marks current approved manifest superseded-pending, offering → `paused_evidence_drift` (reservations refused instantly via `reserve_units`).
- [ ] M10.2 Job `pause_asset` (pauser key, worker only) → read `isPaused` back. T1 wired from the documents route; `integrity_check` job for T2/T3 (T4/T5 optional).
- [ ] M10.3 In-flight orders: unsubmitted → `MANUAL_REVIEW`; submitted continue to confirmation/reconciliation; paused-asset issuance failure follows normal failure path (use M1.6 findings).
- [ ] M10.4 `POST /api/offerings/:id/resume` (verifier/admin, **≠ evidence uploader**, requires current approved manifest) enqueues `set_manifest_document`, `unpause_asset`, `verify_activation`; back to `active` only when on-chain root = latest approved root **and** `isPaused=false`.
- [ ] M10.5 Audit entries with old/new roots and tx IDs at every step.
- [ ] M10.6 UI: `EvidenceDriftBanner` ("Issuance paused: evidence changed on [date], re-review in progress."), orders refused with `OFFERING_PAUSED_EVIDENCE`, disclosure that pause may halt holder transfers, issuer pre-upload warning dialog, resume confirmation dialog.
- [ ] M10.7 Tests (D2 / adversarial 11–12): replace doc after approval → offering+asset pause, orders refused; same event twice → one manifest + one pause; resume by uploader refused; resume works only after re-approval and matching on-chain root.

**Exit:** uploading a revised valuation report pauses offering and asset; a different verifier re-approves; the asset resumes with chain read-back.

---

## M11 — D3 Public Verify Pages  *(Tier B · 1.5 h)*

**Goal:** A stranger can verify, not trust.
**Refs:** ARCH §13 · PRD FR-7.x · UI §8.9, §8.10, §11.3

- [x] M11.1 `lib/verify/checks.ts`: **pure functions with injected readers** for C1–C7 (ARCH §13.1). Result = PASS | FAIL | UNAVAILABLE + evidence link + checked-at + "what this does not prove". **Chain failure/unreachable ⇒ UNAVAILABLE, never PASS.**
- [x] M11.2 Publish the **synthetic rights document** and **hashes-only manifest** for the page; data only via `public_offering_view`; ~30 s cache; rate-limited; no secrets/personal data.
- [x] M11.3 `/verify/offering/[id]` (no login): header with summary like "5 PASS · 1 FAIL · 1 UNAVAILABLE" (never a blanket "verified" badge), `VerificationSummary`, `VerificationCheckCard` ×7 with expandable technical details and copy controls.
- [x] M11.4 `/verify/receipt/[token]`: units, price snapshot, signed rights version/hash, signature-recovers-to-wallet, allocation tx link, on-chain balance ≥ units, **shortened wallet only**, no name/email.
- [x] M11.5 Footer: technical integrity check; not proof of title/legal validity/suitability.
- [x] M11.6 Tests (ARCH §13.4): one-byte change to rights doc ⇒ C1 FAIL; one manifest hash changed ⇒ C2 FAIL; DB row unpaused but asset paused ⇒ C4 FAIL; chain reader disconnected ⇒ all chain-dependent checks UNAVAILABLE.

**Exit:** page runs C1–C7 on real data; all four tamper tests behave as specified. [PASS - test/m11-verify-pages.test.ts 20/20 green; live Hedera contract 0.0.11330441 verified]

---

## M12 — D4 Settlement Timeline, Fault Injector, Assertion Panel  *(Tier B · 1 h)*

**Goal:** Make the failure path visible and prove recovery.
**Refs:** ARCH §14.7 · PRD FR-5.9–5.10 · UI §8.7, §8.11

- [x] M12.1 `lib/settlement/faults.ts` + `POST /api/demo/faults` (admin, `DEMO_FAULTS=true`, production-refusing, audited): one-shot `timeout_after_submit`, `fail_before_submit`, `duplicate_job`. Faults act on the **real** code path and chain.
- [x] M12.2 `ReconciliationAssertionPanel`: units on chain, units ordered, attempts used, duplicates prevented — values from the real reconciliation result.
- [x] M12.3 Timeline polish on `/investor/orders/[id]` and admin order view (all attempts with tx IDs, statuses, HashScan links).
- [x] M12.4 Tests (D4 / adversarial 9–10): each armed fault ends with exactly one confirmed allocation and on-chain units = ordered units.

**Exit:** with `timeout_after_submit` armed, the worker recovers via the stored tx ID; one allocation; assertion panel correct. [PASS - test/m12-settlement-under-failure.test.ts 7/7 green, Hedera Testnet consensus recovery verified]

---

## M13 — D5 Change Intelligence + Intelligence UI  *(Tier B · 1.5 h)*

**Goal:** 0G explains what changed between two snapshots, citing evidence IDs.
**Refs:** ARCH §16.3–16.10 · PRD FR-8.2–8.9 · UI §8.8

- [ ] M13.1 `config/demo-events.json` (scripted event per ARCH §16.3) and `POST /api/demo/property-event` (admin, `DEMO_EVENTS=true`, audited, labelled simulated). Snapshots append-only, tied to a manifest.
- [ ] M13.2 `lib/ai/delta.ts`: per-indicator from/to/absolute/percent change/direction/policy flag/supporting evidence IDs (unsupported indicators flagged); indicators per ARCH §16.4.
- [ ] M13.3 `POST /api/ai/analyze-changes` using the richer schema, `previous_episode_id`, evidence-ID allowlist, number and causal-claim validation, every request ID recorded.
- [ ] M13.4 UI (UI §8.8): provenance legend, snapshot selector/timeline, `SnapshotComparison`, `MetricDeltaTable` (percentage vs percentage-point; Improved/Weakened/Unchanged/Unsupported text labels), `AccessibleTrendChart` only if ≥ 3 snapshots (always with table fallback), `AiExplanationPanel`, `EvidenceCitationList`, `CannotDetermineList`, provenance footer (provider, model, request ID, input/output hash, timestamp, validation status).
- [ ] M13.5 Reason to return: Property Updates feed + "new analysis available" prompt on input-hash change.
- [ ] M13.6 Tests (D5): validator rejects invented number, cause absent from event note, evidence ID outside allowlist, malformed JSON.

**Exit:** scripted event → deterministic delta → validated, evidence-cited 0G explanation with real request ID.
**Cut:** single-snapshot explanation (ladder #6).

---

## M14 — Admin Ops, Audit, Demo Controls UI  *(Tier B · 1.5 h)*

**Goal:** Operators can see stuck work and use demo controls safely.
**Refs:** UI §8.11, §10.6 · ARCH §14.3, §21 · PRD FR-9.x

- [ ] M14.1 `/admin/ops`: queue counts (pending/running/failed/dead), `OutboxJobsTable` (type, dedupe key, attempts, next run, last error, related IDs), stuck orders with `CorrelationId`, reconcile/supply mismatches, chain-sync health.
- [ ] M14.2 `/admin/audit`: read-only `AuditLogTable` (actor, action, resource, reason, before/after hash, prev/row hash) + hash-chain verification state.
- [ ] M14.3 `/admin/demo`: server-backed enabled state per flag; payment confirmation, fault arm, scripted event; confirmation dialog naming object/action/side effect; audit reference after success; disabled when flag false or production.
- [ ] M14.4 `POST /api/admin/roles` (admin; grant/revoke; confirmation dialog; audited).
- [ ] M14.5 Never reveal private keys or private payloads; never show an action as complete before the server confirms.

**Exit:** an operator can find a stuck/dead job, see its correlation ID across DB/chain/AI, and use demo controls with banners and audit references.

---

## M15 — Hardening, Tests, README, Demo, Submission  *(Tier A/B · 3 h · 🔑 recording)*

**Goal:** A judge can run/inspect the repo, use the demo, and verify chain and 0G evidence.
**Refs:** ARCH §22, §24, §25, §26 · PRD §14, §16 · UI §12, §17

- [ ] M15.1 `npm run adversarial` implementing the **14 scenarios** (ARCH §22.3) with an expected-behavior-first report; paste output into README. (Scenario 3 duplicate flag is Tier C → mark N/A if unbuilt.)
- [ ] M15.2 RLS tests with two investors + one issuer against the RLS-scoped client; concurrency test; audit-chain test; SoD tests; secrets scan (no keys in client bundles/Git).
- [ ] M15.3 UI acceptance (UI §17): banner on every route; forbidden-copy grep (`rg -i` for terms in §0.9) returns nothing; Lighthouse/axe a11y; keyboard-only run of every main flow; 200 % zoom; 375/768/1024/1440 px; reduced-motion; hashes copy/expand.
- [ ] M15.4 Execute the **real demo run** end to end (ARCH §25.4), then record: Hedera video and a **separate** 0G video. Never stage fake HashScan links or request IDs.
- [ ] M15.5 README per ARCH §26.1: problem, does/doesn't, legal limits, prior-art method + limits (permitted wording only), architecture diagram, roles, D1–D6 status (built vs designed), exact ATS release + adapter mode, testnet asset refs/doc tx IDs/HashScan links, real 0G request IDs, setup, env vars, test commands + adversarial report, limitations, threat model, production requirements, **AI-use disclosure**, license.
- [ ] M15.6 Docs: `docs/{architecture,threat-model,limitations,demo-script,ats-gate}.md`, `docs/decisions/`.
- [ ] M15.7 🔑 Re-read live prize pages and ETHGlobal rules; clean-browser test; **submit by 22:30 IST (deadline 23:00 IST, 6 Nov 2026)**.

**Exit:** PRD §14.3 Tier A (and Tier B, if built) checklists fully ticked; adversarial report green; videos recorded.

---

## M16 — Stretch (Tier C)  *(only after M15 and with time to spare)*

- [ ] M16.1 D6 benchmarks: `data/benchmarks/{rbi_hpi.csv,rr_rates.csv,SOURCES.md}` as **static versioned snapshots** (never live); RBI HPI labelled residential context; Ready Reckoner as sanity band; snapshot hash in AI input; `provenance=public_source` with as-of date.
- [ ] M16.2 HCS anchoring of audit head hash (`anchored_tx_id`).
- [ ] M16.3 ATS dividend/snapshot demo (`distributions`, `distribution_entitlements`) — only if ATS equity capability is confirmed.
- [ ] M16.4 Duplicate-detection review flag UI (pg_trgm, HMAC of parcel ID with `PARCEL_HMAC_SECRET`).

---

## 17. Cross-Cutting Requirements (apply to every milestone)

| Area | Rule |
| --- | --- |
| **API** | Mutation routes per ARCH §19 (24 + 1 poll); Zod on body and path IDs; identity from session; stable error codes (`OFFERING_NOT_FOUND`, `OFFERING_NOT_ACTIVE`, `OFFERING_PAUSED_EVIDENCE`, `WALLET_NOT_VERIFIED`, `NOT_ELIGIBLE`, `BELOW_MINIMUM`, `ABOVE_INVESTOR_MAX`, `INSUFFICIENT_UNITS`, `MANIFEST_NOT_APPROVED`, `SOD_VIOLATION`, `FLAG_DISABLED`); internal jobs are **never** HTTP routes |
| **Keys** | Role-separated ECDSA accounts; deployer key never in app env; pauser used only by drift/admin jobs; issuer-agent daily cap |
| **Rendering** | Server Components for reads; Client Components only for wallet actions, forms, dialogs, copy, polling; `Suspense` around chain/AI reads; `next/image` for property imagery |
| **Chain truth** | Show application status, ATS asset status, tx receipt status and Mirror sync status as **separate** facts; chain ID 296 + "Hedera Testnet" in technical panels |
| **Provenance** | Only `independently_verified / issuer_reported / public_source / simulated / unknown`; never upgrade a value's provenance in the UI |
| **Accessibility** | WCAG 2.2 AA; semantic headings (one H1); labelled fields; focus trap/return in dialogs; no color-only status; live regions for async updates |
| **Audit** | Every privileged mutation and demo-flag use writes `audit_logs`; UI surfaces the audit reference where useful |

---

## 18. Global Definition of Done (per milestone)

- [ ] All tasks ticked; exit conditions met with evidence (test output, tx IDs, screenshots path).
- [ ] `typecheck`, `lint`, `test` green; new behavior has tests where ARCH §22 requires.
- [ ] No hard-coded hex outside tokens; no forbidden copy; banner still on every route.
- [ ] No secrets in repo/bundles; `.env.example` current; `supabase/policies.md` updated for any service-role path.
- [ ] Progress Log updated; any deviation recorded in `docs/decisions/` (date, reason, alternatives, impact).

---

## 19. Open Items to Resolve During the Build (ARCH §29)

Track and update with results: live deadline + prize requirements · ETHGlobal rules on similar/pre-existing work · ATS release/SDK/Node/npm pins · reusable deployed ATS testnet addresses · asset type (equity vs bond) for rights text · multi-document support on one asset · pause/unpause semantics incl. **issuance while paused** · rejected-transfer record visible on Mirror Node · ECDSA/EVM derivation · Mirror/JSON-RPC limits · max tx valid duration · 0G endpoint/model/auth/attestation · RBI HPI and IGR e-ASR access (if D6) · prior-art re-run after 25 Sep 2026 · current DELTA legal status.

---

## 20. Progress Log (agent appends here)

| Date/time (IST) | Milestone.Task | Status | Evidence (tx ID / test / file) | Notes / deviations |
| --- | --- | --- | --- | --- |
| 2026-11-06 18:35 | M11 (D3 Verify Pages) | DONE | `test/m11-verify-pages.test.ts` (20/20 pass), 8 responsive screenshots in `docs/screenshots/m11/` | C1–C7 pure checks, zero-PII receipts, 4 tamper tests, rate-limited public APIs |
| 2026-11-06 19:48 | M12 (D4 Failure Settlement) | DONE | `test/m12-settlement-under-failure.test.ts` (7/7 pass), 8 responsive screenshots in `docs/screenshots/m12/` | Fault injector (timeout/fail/duplicate), persistent banner, assertion panel, admin demo ops |

---

## 21. Final Instruction

When uncertain, do not invent a capability or claim — verify official documentation, test the exact integration, record the evidence, and update the docs. **Build one honest, reproducible, secure lifecycle. Every screen must show what was submitted, what was reviewed, what changed, what the chain confirms, what remains uncertain, and what the prototype cannot prove.**
