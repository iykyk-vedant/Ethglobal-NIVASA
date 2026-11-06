# NIVASA — Architecture V4 and Execution Source of Truth

**Version:** 4.0, Differentiation Edition (supersedes V3) · **Last updated:** 6 November 2026 (IST) · **Status:** Working technical source of truth **Project:** NIVASA — India-first real-world-asset lifecycle infrastructure prototype (commercial real estate, Hedera ATS, 0G) **Builder:** Solo developer, intermediate Solidity / dApp experience · **Event:** ETHGlobal Mumbai, November 2026

> **Important:** This is an engineering plan, not legal, tax, investment, valuation or regulatory advice. NIVASA is a prototype. Do not solicit or accept real public investment, issue a real security, promise property ownership, or represent the platform as government-approved. Any production launch requires Indian legal counsel, a properly authorized issuer or vehicle, regulatory analysis, independent property diligence and a professional security review.

---

## 0. What changed from V3 (read first)

V3 fixed the engineering. V4 fixes the **positioning**. A prior-art search of the ETHGlobal showcase dataset (section 1.2) showed that fractional real-estate tokenization with KYC and a whitelist is crowded, and that Hedera ATS has been used at this hackathon series for bond markets, collateral and lending, not for property issuance. V4 keeps every V3 security control, adds six differentiators, pays for them by trimming secondary features, and corrects the working date.

| # | Area | V3 | V4 | Why |
| --- | --- | --- | --- | --- |
| 1 | Positioning | Compliance-aware real-estate tokenization | Real-world-asset lifecycle infrastructure: evidence, rights, gated issuance, settlement, verification | A marketplace pitch invites the question of why build another one |
| 2 | Issuance | Offering activates after approval | **Evidence-gated issuance (D1):** activation requires an approved evidence manifest; its root and the rights hash are written to the ATS asset | Ties evidence to the token itself |
| 3 | Evidence changes | Not handled after approval | **Evidence-drift protocol (D2):** any post-approval evidence change pauses the ATS asset until re-review | A real lifecycle operation no prior project showed |
| 4 | Trust | Judges trust the UI | **Public Verify page (D3):** recomputes hashes and reads the chain, pass or fail per check | Verify, do not trust |
| 5 | Failure handling | Documented design | **Settlement under failure (D4):** timeline UI and a demo-only fault injector with live recovery | The failure path becomes visible |
| 6 | AI | Metrics plus explanation | **Change intelligence (D5):** two property snapshots, deterministic delta, 0G explains what changed and cites evidence IDs | Gives 0G a load-bearing role and a reason to return |
| 7 | India depth | DELTA-inspired framing | **Maharashtra evidence checklist as data (D6)**, completeness scoring, RBI HPI and Ready Reckoner sanity band | Local depth the global ERC-3643 projects lack |
| 8 | Distribution | Core lifecycle demo | Stretch; pause and resume (D2) is now the lifecycle operation | Time |
| 9 | HCS anchoring | Default | Stretch | Time |
| 10 | Date and time | Dated 5 November; single 24-hour plan | Dated 6 November; **tiered plan** (A core, B differentiators, C stretch) | Deadline is unverified and may be under a day away |
| 11 | x402 | Not targeted | Still not targeted | No real data provider, adds a second spending key, risks the main track |
| 12 | Size | 15 tables, 21 mutation routes | 15 tables, 24 mutation routes (distribution tables moved to stretch; evidence\_manifests and property\_snapshots added) | Differentiators need two new records |

---

## 1. Positioning and prior art

### 1.1 Problem statement (the Real-World Asset Lifecycle Gap)

Real-world assets such as commercial real estate carry large economic value, but turning them into trustworthy digital instruments involves fragmented property evidence, unclear investor rights, disconnected compliance steps and weak post-issuance accountability. Existing tokenization demos show that a token can be created. Responsible tokenization also needs a connected workflow: evidence review, rights definition, investor eligibility, controlled issuance, recoverable settlement, and a way for anyone to verify the result and to see what happens when the evidence changes.

NIVASA demonstrates that connected workflow through an India-focused prototype on Hedera, with explainable AI-assisted asset intelligence. This is NIVASA's own framing, not a claim that every other platform lacks these capabilities.

### 1.2 Prior-art findings

**Method:** keyword search of the ETHGlobal showcase dataset (github.com/Marcussy34/ethglobal; 18,693 projects, 69 events; snapshot dated 25 September 2026), plus targeted web searches of showcase pages.

| Question | Result |
| --- | --- |
| Property or real estate with tokenization | 59 projects (103 on the broader RWA or property filter). 14 are from ETHGlobal New Delhi, 5 from ETHOnline 2025, 4 from Taipei |
| Common pattern | Fractional ownership, ERC-3643 whitelist and KYC, rent splits, marketplace |
| Prize-winning examples | Ours (Buenos Aires), Revora (Taipei), BrickFi (Taipei), Domus (New York 2025), CondoFi (Bangkok), 0xEstate (London) |
| Projects mentioning Hedera ATS | 12 (10 from ETHOnline 2026): bond markets, repo, collateral holds, lending, secondary markets. **None for real estate** |
| Real estate with reconciliation, idempotency or outbox | None found |
| Real estate with an evidence workflow | BlockEstate (deeds as NFTs); ZoneProof (zoning-data registry on Hedera, New York 2026). Neither runs a token lifecycle |
| India-specific real-estate tokenization | Fragmenta (ERC-3643, Self, 0G marketplace). Nothing on DELTA, RERA or SEBI |
| Hedera Tokenization of Anything winners seen | Rialto and NameGate (ETHOnline 2026); neither real estate |

**Limits:** keyword search misses projects that describe themselves in other words; the snapshot stops on 25 September 2026; the dataset covers showcase entries only. Re-check recent events before the submission claims anything.

### 1.3 Closest prior art and how NIVASA differs

| Prior project | What it did | NIVASA difference |
| --- | --- | --- |
| Ownify (New Delhi) | ERC-3643 tokens, admin-managed investor whitelist, Supabase | Same stack shape; NIVASA adds evidence-gated issuance, drift pause, recoverable settlement and public verification |
| ArEstate, TerraTrust (New Delhi) | ERC-3643 property tokens, identity registry, oracles or leases | Not ATS; no evidence-to-token linkage |
| Brick Busters, Fragmenta (New Delhi) | Fractional marketplaces with KYC and revenue splits | NIVASA is not a marketplace; one asset, full lifecycle |
| Ours (Buenos Aires, winner) | ERC-3643, SPV per property | NIVASA makes no regulated-ownership claim and proves each step on chain |
| ZoneProof (New York 2026) | Zoning-data registry, oracle, Hedera anchoring | Evidence there is a data feed; NIVASA ties reviewed evidence to the asset's on-chain state |
| Bond Desk, Tenor, Captable (ETHOnline 2026) | ATS bonds and secondary markets | Trading venues for bonds; NIVASA covers issuance and the property evidence behind it |
| rehold, HYPOTHECA (ETHOnline 2026) | ATS holds for collateral and repo | Post-issuance financing; NIVASA covers pre-issuance evidence and gating |

### 1.4 What we may and may not claim

**May say:** in a keyword search of a 25 September 2026 snapshot of the ETHGlobal showcase, we did not find a project combining property evidence review, evidence-gated ATS issuance, automatic pause on evidence change, recoverable settlement and a public verification page.

**May not say:** first, only, novel in the world, or that no one has done this. Never imply legal compliance, title verification, regulatory approval or investment suitability.

### 1.5 The six differentiators

| ID | Capability | What a judge sees | Specified in |
| --- | --- | --- | --- |
| D1 | Evidence-gated issuance | Activation is refused until an approved manifest and the rights hash are on the ATS asset | Sections 10, 11 |
| D2 | Evidence-drift auto-pause | Upload a revised document, the asset pauses on Hedera, orders stop, re-review resumes it | Section 12 |
| D3 | Public Verify page | Open page with no login, each check passes or fails against the chain | Section 13 |
| D4 | Settlement under failure | Injected fault, visible timeline, one confirmed allocation, no duplicate | Section 14 |
| D5 | Change intelligence | Property snapshot changes, 0G explains what moved and cites evidence IDs | Section 16 |
| D6 | India-first evidence | Maharashtra checklist, completeness score, benchmark sanity band | Sections 10.2, 16.5 |

**Build order:** D1, D2, D3, D4, D5, D6. **Cut order is the reverse:** D6 goes first. D1 to D3 and the Hedera lifecycle proof are what the primary prize rewards.

---

## 2. Standing corrections (carried forward, still authoritative)

1. **DELTA is proposed, not an enacted framework.** Say inspired by the proposed Maharashtra DELTA framework; never compliant with or authorized by it.
2. **Tokenization is not land ownership.** Define the token's rights in a rights document; counsel must confirm any ownership claim.
3. **An SPV does not solve securities regulation.** SEBI SM REIT is a reference only (its asset-value threshold is far above a demo asset). Fictional data and a simulated economic-interest representation only.
4. **ATS runtime:** follow the exact Node, npm and SDK versions of the release you pin and record them in the README.
5. **ATS is a set of EVM contracts using the Diamond Pattern** (ERC-1400 and partial ERC-3643), not a vanilla ERC-20 and not an HTS token. Use the ATS SDK, ABIs and deployed configuration. Never claim an unrelated ERC-20 is an ATS asset.
6. **0G Storage is optional.** Real Private Computer inference with real request IDs is the requirement. Never fabricate a request ID, root hash, model or proof.
7. **Prize figures change.** Re-read the live prize page before submission.
8. **0G failure handling:** show analysis temporarily unavailable; keep deterministic metrics; never substitute an unlabelled model.
9. **Payment and allocation are not atomic.** Use an explicit settlement state machine, idempotency, reconciliation and recovery.
10. **A hash proves integrity, not authenticity.** Record source, reviewer, method, status and limitations for every document.

---

## 3. Executive decision

Build **one complete, honest, verifiable asset lifecycle** for a single fictional Maharashtra commercial property on Hedera Testnet. Do not build a marketplace. Prove each step with evidence a judge can inspect.

### 3.1 Demo journey (eight beats)

1. **Evidence.** The issuer submits the property with a Maharashtra evidence checklist. A different user reviews it. The server builds an evidence manifest (Merkle root over document hashes) and the verifier approves that exact version.
2. **Rights.** A versioned rights document states what the token represents and does not represent.
3. **Gated issuance (D1).** The ATS asset is configured with a cap and KYC. The rights hash and the manifest root are written to the asset. The offering activates only because both exist.
4. **Participation.** Wallet binding by signature, eligibility, signed acknowledgement of the rights hash, reservation, simulated payment.
5. **Allocation under failure (D4).** A demo fault interrupts the first submission. The worker recovers from the stored transaction ID, one allocation confirms, reconciliation completes the order.
6. **Restriction.** A transfer to an ineligible wallet is rejected by ATS, shown as a recorded proof run.
7. **Evidence drift (D2).** The issuer uploads a revised valuation report. The offering pauses on Hedera, new orders stop, a verifier re-approves, the asset resumes.
8. **Verify and understand (D3, D5).** The public Verify page passes its checks. A scripted property event changes the snapshot; 0G explains the change with a stored request ID.

### 3.2 Priorities (ordered)

1. Hedera ATS lifecycle: configure, issue, restrict, pause and resume, with on-chain proof.
2. Safe settlement: idempotent, recoverable, never falsely complete.
3. Evidence-to-token linkage and drift handling (D1, D2).
4. Public verification (D3).
5. 0G change intelligence with a real request ID (D5).
6. India-first evidence depth and benchmarks (D6).
7. A polished investor and issuer experience.

### 3.3 Not doing

Marketplace, secondary trading, AMM, multi-property support, bridges, real fiat settlement, government land-record integration, autonomous trading agent, x402 payments, custom ERC-3643, custom registry contract, Arc integration.

### 3.4 Time tiers

The deadline recorded earlier (7 November 2026, 9:00 AM IST) is **unverified**. Check the live dashboard now and count the real hours left before choosing a tier. Plan for sleep, recording and submission.

| Tier | Content | Estimated hours | Choose it when |
| --- | --- | --- | --- |
| A. Core | ATS gate, thin slice (eligibility, reservation, allocation, reconciliation), restriction proof, minimal AI call with request ID | 14 to 16 | Under about 20 hours remain |
| B. Differentiators | D1 to D4 fully, D5 simplified | 22 to 25 in total | About 25 or more hours remain |
| C. Stretch | D6 benchmarks, HCS anchoring, ATS dividend, duplicate-detection UI | beyond B | Only if Tier B finishes with time to spare |

Section 23 gives the phase plan and cut ladder.

---

## 4. Scope, roles, screens, demo asset

### 4.1 Roles (MVP)

| Role | Responsibilities | Must not be able to |
| --- | --- | --- |
| Issuer | Create property, upload evidence, propose offering and rights, upload revised evidence | Approve own property, manifest or offering; change eligibility; grant roles |
| Verifier | Review evidence manifests; review investor eligibility; approve resume after drift | Issue tokens, review own submissions, grant roles |
| Investor | Bind wallet, request eligibility, place orders, view holdings, run analysis | Read others' data, set own status, bypass restrictions |
| Admin | Assign roles through a trusted server path; activate, pause and close offerings; read-only audit view; demo controls | Unilaterally approve every stage |

No user may set their own role, KYC status, eligibility or verification status through any public API.

**Separation of duties is enforced in the database,** not only in the UI:

- A manifest reviewer must differ from the property's issuer.
- An offering approver must differ from the offering proposer.
- An eligibility reviewer must differ from the investor being reviewed.
- A resume after an evidence-drift pause must be approved by a reviewer who did not upload the changed evidence.

### 4.2 Screens (MVP)

1. **Landing:** what NIVASA is and the prototype limitations.
2. **Offering page:** rights summary, evidence status, drift banner when paused, link to the Verify page.
3. **Issuer dashboard:** Maharashtra checklist with completeness score, document upload, manifest versions, rights versions.
4. **Verifier dashboard:** review queue, manifest comparison against the previous version, decision form with required reason.
5. **Investor dashboard:** chain-confirmed holdings separate from pending orders, wallet binding, settlement timeline, receipt link.
6. **Property Intelligence:** snapshot history, deterministic changes, 0G analysis with request ID.
7. **Public Verify page** (no login): section 13.
8. **Admin ops:** stuck or dead jobs, order timelines, demo controls (flag-gated).

### 4.3 Demo asset

One fictional Mumbai commercial property. Every figure carries the label **SIMULATED, NOT A REAL OFFERING.**

- Valuation INR 10,00,00,000; 10,000 units; unit value INR 10,000; demo allocation 5 units (INR 50,000).
- Simulated annual rent INR 72,00,000; gross yield 7.2%.
- Snapshot 1 (baseline): occupancy 90%, annual rent INR 72,00,000, operating costs INR 14,00,000.
- Snapshot 2 (scripted event, section 16.3): updated valuation report, occupancy 85%, higher operating costs.

The 7.2% is simulated gross rent divided by simulated valuation. It is not net yield, a forecast, a verified return or a guarantee.

---

## 5. Non-negotiable system principles

1. **Legal rights before token labels.** Every offering links to a versioned rights document.
2. **Evidence before approval, and evidence stays attached.** Approval binds to one exact manifest version; changing evidence invalidates it.
3. **Restrictions at the token layer.** Backend checks alone do not stop direct wallet transfers.
4. **The chain is authoritative for balances and asset state.** Database values are views and must be reconciled.
5. **No false settlement success.** An order is COMPLETED only after reconciliation confirms on-chain evidence.
6. **Drift fails closed.** Unreviewed evidence change pauses issuance; it never continues silently.
7. **Verify, do not trust.** Every public claim has a check a stranger can run.
8. **No sensitive data on public chain or public storage.** Only hashes and roots go on chain.
9. **AI explains; deterministic code calculates.** The model never invents figures, authorizes actions or touches the chain.
10. **Fail closed for privileged actions.**
11. **Audit every privileged mutation** in a hash-chained log.
12. **Prototype status is always visible.** Demo and fault controls are flag-gated and bannered.
13. **One canonical state model** in code, enforced by the database.
14. **Chain side effects go through the outbox.** No route handler submits a chain transaction inline.
15. **Least-privilege keys.** No single key holds every ATS role.

---

## 6. System architecture

### 6.1 Layers

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Frontend | Next.js App Router, TypeScript, Tailwind | Server components for reads; client components only for wallet actions |
| API | Next.js Route Handlers, Zod | Authenticated mutations, role checks, validation, stable error codes |
| Domain | lib modules | Evidence, manifests, drift, offering, eligibility, settlement, reconciliation, verification, AI, audit |
| Data | Supabase Postgres and private Storage | Operational data, private documents, SQL functions for atomic operations |
| Worker | Cron-triggered protected route | Outbox processing, drift checks, reservation expiry, reconciliation, eligibility sync |
| Chain | Hedera Testnet: ATS contracts, JSON-RPC relay, Mirror Node | Token lifecycle, balances, asset state, documents, events |
| AI | 0G Private Computer plus deterministic TypeScript engine | Change explanation and metrics |

### 6.2 Runtime topology

```text
Browser --> Next.js (server components read through RLS-scoped client)
   |          \-- Route Handlers (mutations) --> SQL functions (rpc)
   |                                        \--> outbox_jobs  (never inline chain calls)
   |
   \--> /verify/* (public, read-only) --> chain reads + public SQL function

Worker (cron) --> claims outbox jobs --> ATS adapter --> Hedera (SDK / JSON-RPC)
   |                                          \-> Mirror Node + contract calls (reconcile, verify)
   \--> drift checker, expiry sweeper, eligibility sync, supply reconcile

AI route --> deterministic metrics + snapshot delta --> 0G Private Computer --> Zod validation --> ai_episodes
```

### 6.3 Sources of truth

| Component | Source of truth for |
| --- | --- |
| ATS contracts on Hedera | Asset configuration, cap, KYC status, pause state, balances, issuance and transfer events, anchored document hashes |
| Supabase | Profiles, private documents, workflow state, orders, manifests, snapshots |
| Verification process | Human review outcome and evidence references |
| Deterministic engine | Numeric calculations, snapshot deltas, policy thresholds |
| 0G inference | Natural-language explanation and structured analysis proposal |
| Rights document | What the interest is intended to mean, subject to enforceability |

No single system proves every fact. Store provenance and reconciliation status.

### 6.4 Access model

- **Reads:** server components use a user-scoped Supabase client, so RLS is real protection.
- **Public Verify reads:** a narrow SECURITY DEFINER function returns only offering-level, non-personal fields.
- **Writes:** route handlers call SECURITY DEFINER SQL functions or a narrow service-role module (lib/db/admin.ts) exporting only listed operations. Document each in supabase/policies.md.
- **Worker:** service role, server-side only, protected by a secret header and platform cron verification.
- **Cookie-authenticated mutations:** check the Origin header, require a JSON content type, rate-limit every mutation and AI route.
- Service-role and signer keys never appear in NEXT\_PUBLIC variables or client bundles.

---

## 7. Repository structure

```text
nivasa/
  app/
    (public)/ page.tsx, offerings/[id]/page.tsx, verify/offering/[id]/page.tsx, verify/receipt/[token]/page.tsx
    (app)/ dashboard, issuer, verifier, intelligence, admin
    api/ properties/ offerings/ wallet/ eligibility/ investments/ ai/ demo/ admin/ cron/worker/
  components/ evidence, offering, investor, timeline, verify, intelligence, admin, ui
  config/
    evidence-checklist.maharashtra.json   # document types, weights, validity rules (D6)
    demo-events.json                      # scripted simulated property events (D5)
  data/benchmarks/ rbi_hpi.csv, rr_rates.csv, SOURCES.md   # Tier C
  lib/
    auth/ db/ (client.ts, admin.ts) validation/ money/decimal.ts
    state/transitions.ts                 # single canonical transition table
    evidence/ (manifest.ts, merkle.ts, drift.ts, checklist.ts)
    settlement/ (orders.ts, outbox.ts, reconcile.ts, faults.ts)
    hedera/ (config.ts, ats-adapter.ts, chain-reads.ts, types.ts)
    verify/ (checks.ts)
    ai/ (og-client.ts, delta.ts, metrics.ts, fit-policy.ts, schemas.ts, advisor.ts)
    audit/ chain.ts
  supabase/ migrations/, functions/reserve_units.sql, seed.sql, policies.md
  scripts/ ats-gate.ts, restriction-proof.ts, adversarial.ts
  docs/ architecture.md, threat-model.md, limitations.md, demo-script.md, ats-gate.md, decisions/
  .env.example, README.md, package.json
```

ATS stays an external dependency, cloned and pinned separately. There is no contracts folder unless the ATS gate proves a custom contract is unavoidable.

**Code rules:** components never contain ABI or chain logic; all Hedera and ATS calls live in lib/hedera; privileged business rules live on the server and in real ATS controls; commit .env.example only; use separate testnet accounts per key role.

---

## 8. Chain architecture

### 8.1 What NIVASA relies on from ATS

| Capability | Use in NIVASA | Status |
| --- | --- | --- |
| Diamond-proxy asset created through a factory and business-logic resolver | Create the demo asset | Verified in ATS docs; confirm factory entry points in your pinned release |
| Cap or max supply; role-based access control | On-chain supply limit and role separation | Confirm exact setting and enforcement |
| KYC and whitelist; transfer restrictions | Eligible-wallet enforcement and the restricted-transfer proof | Confirm the exact flow |
| Document management (ERC-1400 / ERC-1643 style) | Anchor the **rights-document hash** and the **evidence-manifest root** | Confirm a set-document call exists in the SDK and can be updated or versioned |
| Pause and unpause | **D2 drift pause** and resume; the Hedera lifecycle operation | Confirm semantics: pause usually halts all transfers |
| Freeze, controller operations | Optional further lifecycle demonstrations | Confirm which are enabled |
| Deployed testnet addresses page | Avoid deploying the full facet stack yourself | Check first |
| Snapshots and equity dividends | Stretch distribution demo | Confirm equity vs bond fit |

Every row marked confirm is a Phase 1 gate checkbox. Do not code an adapter method until a real testnet transaction proves it.

### 8.2 No custom contract

Rights and manifest hashes use ATS document management. Audit tamper evidence uses the hash-chained audit log; publishing its head hash to an HCS topic is a Tier C option. Reintroduce a custom contract only if the gate proves ATS cannot hold what is needed, and record the decision.

### 8.3 Reading chain state

- **Balances and pause state:** contract calls through the JSON-RPC relay (or the Mirror Node contract-call endpoint). Do not use HTS token endpoints for ATS assets.
- **Events and evidence:** Mirror Node contract results and logs for the asset's contract ID, indexed by consensus timestamp. A rejected transfer appears as a failed contract call record; confirm that during the gate.
- **Finality:** Hedera has deterministic finality. Confirmed means a SUCCESS receipt plus the record visible on Mirror Node. No confirmation-depth or reorg logic.
- **Mirror lag:** show a pending state and last-sync time; cache reads; the worker reconciles.

### 8.4 Accounts and keys

| Account | ATS role(s) | Held by | Notes |
| --- | --- | --- | --- |
| Deployer / admin | Default admin | Operator machine only | Used in Phase 1 setup; never in the app environment |
| Issuer-agent | Issuance | Worker only | Smallest key the app holds; add a daily issuance cap |
| Compliance | KYC grant and revoke | Worker only | Distinct from issuer-agent |
| Pauser | Pause and unpause | Worker only, invoked only by the drift or admin jobs | Distinct from issuer-agent |
| Investor test wallets | None | Test operator | One eligible, one ineligible, for the restriction proof |

Use **ECDSA** keys for accounts that interact with the EVM layer; verify in the gate. Hedera Testnet EVM chain ID is 296. Fund every account early; ATS operations cost HBAR. There is no endpoint that signs client-supplied calldata.

### 8.5 ATS adapter (narrow, two modes)

```ts
export interface AtsAdapter {
  mode: 'sdk' | 'manual';
  getAssetConfiguration(assetRef: string): Promise<AssetConfig>;
  registerInvestor(wallet: string, validUntil: Date): Promise<TxRef>;
  revokeInvestor(wallet: string): Promise<TxRef>;
  setDocument(assetRef: string, name: string, uri: string, hash: string): Promise<TxRef>;
  getDocument(assetRef: string, name: string): Promise<{ uri: string; hash: string }>;
  pauseAsset(assetRef: string): Promise<TxRef>;
  unpauseAsset(assetRef: string): Promise<TxRef>;
  isPaused(assetRef: string): Promise<boolean>;
  prepareIssue(orderId: string, wallet: string, units: bigint): Promise<PreparedTx>; // txId plus signed bytes
  submitPrepared(p: PreparedTx): Promise<TxRef>;      // manual mode: operator supplies the tx ID
  getHolderBalance(assetRef: string, wallet: string): Promise<bigint>;
  getTxStatus(txId: string): Promise<TxStatus>;
  canTransfer(assetRef: string, from: string, to: string, units: bigint): Promise<boolean>;
}
```

These are NIVASA method names, not ATS API names. **Manual mode** lets the ATS web UI perform issuance, pause and document operations while NIVASA orchestrates, records the operator-supplied transaction IDs and reconciles from chain data. It must be disclosed in the README if used.

### 8.6 ATS go/no-go gate (hard 4-hour timebox)

Prove all of these with real testnet transactions; record every transaction ID in docs/ats-gate.md:

1. Check for already-deployed testnet ATS addresses; reuse them if present.
2. Run the documented setup with pinned versions.
3. Create and fund ECDSA testnet accounts.
4. Create the demo asset with a cap, KYC and transfer restrictions.
5. Register one investor wallet; issue units to it.
6. Read the balance with a contract call; read the issue event from Mirror Node.
7. **Set a document** (rights hash) and **update or add a second** (manifest root); read both back.
8. **Pause the asset, prove a transfer fails, unpause it, prove it succeeds.**
9. Attempt a transfer from an unregistered wallet and capture the failure record (restriction proof).

If the SDK path stalls but the ATS UI works, switch to manual mode. If ATS cannot be made to work at all, do not present a custom ERC-20 as ATS; decide whether to continue and do not claim the ATS prize.

---

## 9. Canonical state machines

These are the only definitions. Implement them once in lib/state/transitions.ts, generate TypeScript enums and database CHECK constraints from it, and enforce transitions with a database trigger against an allowed\_transitions table. Never expose a generic update-status endpoint.

### 9.1 Property

```text
draft -> submitted -> in_review -> verified
                              \-> rejected
                              \-> needs_more_information -> submitted
verified -> in_review          (new evidence manifest awaiting review)
verified -> disputed -> in_review | revoked
verified -> expired | revoked
```

### 9.2 Evidence manifest

```text
draft -> submitted -> approved -> superseded
                  \-> rejected
```

At most one approved, non-superseded manifest exists per property. An approved manifest is immutable.

### 9.3 Offering

```text
draft -> proposed -> legal_review_pending -> approved_for_demo
      -> token_configured -> active
active <-> paused                       (manual pause and resume, admin)
active -> paused_evidence_drift -> active   (resume after re-approval, section 12)
active | paused | paused_evidence_drift -> closed
```

Guards: proposed requires a verified property with an approved manifest. token\_configured requires ATS configuration evidence. **active requires all of the D1 conditions in section 11.2.** approved\_for\_demo means the simulated review workflow is complete, not legal authorization for public investment.

### 9.4 Order

```text
UNITS_RESERVED -> PAYMENT_PENDING -> PAYMENT_CONFIRMED -> ALLOCATION_PENDING
  -> ALLOCATION_SUBMITTED -> ALLOCATION_CONFIRMED -> COMPLETED
```

Exception states: REJECTED, EXPIRED, PAYMENT\_FAILED, ALLOCATION\_FAILED, REFUND\_PENDING, REFUNDED, RECONCILIATION\_REQUIRED, MANUAL\_REVIEW.

**COMPLETED is set only by reconciliation** after on-chain balance and transfer evidence match the order. Eligibility is checked atomically inside the reservation function. If payment succeeds but allocation fails, the order enters ALLOCATION\_FAILED then REFUND\_PENDING or MANUAL\_REVIEW; it is never silently dropped.

---

## 10. Evidence system (D1, D6)

### 10.1 Verification is a human or authorized process

A blockchain cannot verify a deed, title, encumbrance, boundary or valuation. NIVASA records who reviewed which evidence, by what method, and what limitations remain. The hackathon verifier is a simulation, not a substitute for qualified professionals and authoritative sources. The demo uses synthetic or explicitly permitted sample documents only; never upload real deeds, Aadhaar or PAN.

### 10.2 Maharashtra evidence checklist (config, not code)

config/evidence-checklist.maharashtra.json lists document types for a Maharashtra commercial property. The list is **illustrative, not legal advice; actual requirements vary by property type, location and legal structure.**

| Document type | Required | Weight | Validity rule |
| --- | --- | --- | --- |
| Property Card | Yes | 15 | Recency window set in config |
| Sale or conveyance deed | Yes | 15 | None |
| Index II extract | Yes | 10 | None |
| Encumbrance search | Yes | 15 | Expires after configured days |
| Approved building plans | Yes | 10 | None |
| Occupancy Certificate | Yes | 10 | None |
| Property tax receipt | Yes | 5 | Current year |
| Valuation report | Yes | 15 | Expires after configured days |
| Lease or rent evidence | No | 5 | Needed before any rent figure is shown as supported |

**Completeness score** = weighted share of required documents that are present, in status verified and within validity. It is shown with its limits and never labelled clear title. A missing or expired required document lowers the score and appears in the AI input as missing\_information.

### 10.3 Evidence record (per document)

Document type; private storage path; SHA-256 (computed server-side); source or issuing authority; source reference; issue and valid-until dates; received date; MIME type and size; uploader; reviewer; review method; status (pending, in\_review, verified, rejected, needs\_more\_information, expired, revoked); limitation note; superseded-by reference.

### 10.4 Evidence manifest

At submission and after any document change, the server builds a manifest:

```json
{
  "property_id": "uuid",
  "version": 2,
  "policy_version": "mh-checklist-1",
  "checklist_completeness": 85,
  "documents": [
    { "type": "valuation_report", "sha256": "...", "source_ref": "...",
      "status": "verified", "valid_until": "2027-03-31" }
  ]
}
```

- Each leaf is the SHA-256 of the canonical JSON (sorted keys, no whitespace) of one document entry.
- The root is a Merkle root with sorted-pair hashing. Document each rule in lib/evidence/merkle.ts and test it with fixed vectors.
- The manifest contains hashes, types and statuses only, no document content, so it is safe to publish for the Verify page.
- A verifier approves **one exact manifest version**. Approval records the root and manifest hash in evidence\_manifests; the root is what goes on chain.
- The verifier screen shows a diff against the previous version.

### 10.5 Decision model

Property-level decisions are an append-only history in property\_verifications; the current verification status is derived from the latest decision by trigger. A single verified flag is never the only record. UI labels show **Demo review completed** or **Simulated verification**, never a green Verified Property badge for a demo click.

### 10.6 Duplicate detection (Tier C UI)

Signals: normalized address, trigram similarity (pg\_trgm), an HMAC of any parcel or survey identifier using a server secret (a plain hash of a low-entropy identifier is brute-forceable), issuer identity. A match raises a review flag, never a conclusion of fraud.

### 10.7 Upload hardening

- Compute SHA-256 on the server over the received stream; never trust a client hash.
- Allowlist MIME types (PDF, PNG, JPEG), cap size, strip image metadata.
- Private bucket; signed URLs with a short lifetime; log every signed-URL issuance.
- Never send documents to the LLM.

---

## 11. Rights and offering (D1)

### 11.1 Rights document (versioned)

Each offering has numbered rights versions describing: what the token represents (a simulated economic interest), what it does not represent (title, ownership, voting or control unless stated), income entitlement rule, transfer rule (eligible wallets only), redemption rule, risk disclosures, and the simulated status. Example identifiers: offering NIVASA-MH-001, rights version 1.0, asset reference PROPERTY-MH-001. A rights document is a product and legal specification, not a legal opinion. A hash proves integrity, not legal validity.

### 11.2 The D1 activation gate

An offering becomes **active** only when all of these are true. The transition is made by a worker job after it verifies each condition, never by the activate route itself:

1. The property is verified and has a current approved manifest.
2. A rights version exists with a stored document hash.
3. The ATS asset exists with its cap, KYC and transfer restrictions configured.
4. The ATS asset holds a document named rights whose hash equals the rights version hash (read back from chain).
5. The ATS asset holds a document named evidence-manifest whose value equals the approved manifest root (read back from chain).
6. An eligibility policy version is set.

The activate route only enqueues set\_rights\_document, set\_manifest\_document and verify\_activation jobs. If any read-back fails the offering stays in token\_configured and the ops panel shows which condition failed.

### 11.3 Rights changes

A new rights version requires re-approval and re-anchoring. Existing orders stay pinned to the version the investor signed (section 15).

---

## 12. Evidence-drift protocol (D2)

If the evidence behind an active offering changes after approval, issuance must stop until a reviewer approves the new evidence. NIVASA enforces this on the ATS asset, so the pause is a real, provable Hedera lifecycle operation.

### 12.1 Triggers

| ID | Trigger | Detected by |
| --- | --- | --- |
| T1 | A document is added, replaced or removed after a manifest was approved | The document route, synchronously, by enqueuing a drift job |
| T2 | A stored file's recomputed SHA-256 differs from the manifest | Periodic integrity check job |
| T3 | A required document passes its valid\_until date | Periodic check job |
| T4 | The valuation snapshot is older than the policy window (configurable; off for the demo) | Periodic check job |
| T5 | A dispute or revocation is recorded by an admin | Admin action |

The demo uses T1: the issuer uploads a revised valuation report.

### 12.2 Flow

1. **Detect.** The job runs with dedupe key (property, trigger, manifest version). It builds manifest version n+1 with status submitted and marks the current approved manifest superseded-pending.
2. **Fail closed.** The offering moves from active to paused\_evidence\_drift through the transition function. Reservations are refused immediately because the reservation function requires status active.
3. **Pause on chain.** The job enqueues pause\_asset. The worker pauses the ATS asset with the pauser key, records the transaction ID, and reads isPaused back.
4. **In-flight orders.** An order not yet submitted is re-checked by the allocation job, which sees the paused offering and moves the order to MANUAL\_REVIEW. An order already submitted continues to confirmation and reconciliation. If an issuance fails because the asset is paused, the order follows the normal failure path (ALLOCATION\_FAILED, then refund or manual review); it is never lost or marked complete. Confirm in the gate whether issuance succeeds while paused.
5. **Re-review.** A verifier (not the uploader of the changed evidence) reviews the new manifest with a diff against the previous one and approves or rejects it.
6. **Resume.** POST /api/offerings/:id/resume enqueues set\_manifest\_document (new root), unpause\_asset and verify\_activation. Only after the new root is read back from chain and isPaused is false does the offering return to active.
7. **Audit.** Each step writes an audit entry with the old and new manifest roots and the transaction IDs.

### 12.3 What users see

- A banner on the offering page: **Issuance paused: evidence changed on \[date\], re-review in progress.**
- Orders are refused with the stable code OFFERING\_PAUSED\_EVIDENCE.
- The Verify page shows check C4 (asset state) matching the paused status, then passing again after resume.
- Existing holders keep their balances. ATS pause typically halts transfers as well, so disclose that pause also stops transfers between holders (confirm semantics in the gate).

### 12.4 Invariants (tested)

- While status is paused\_evidence\_drift, no new order can be created.
- The offering returns to active only when the on-chain manifest document equals the latest approved root and the asset is not paused.
- The same drift event processed twice creates one manifest version and one pause.
- The resume approver differs from the evidence uploader.

### 12.5 Honest limits

Drift detection sees only changes to evidence inside NIVASA. A real-world change, such as a new encumbrance recorded elsewhere, is not detected. The feature demonstrates the mechanism; it does not replace ongoing diligence.

---

## 13. Public Verify page (D3)

A page anyone can open without logging in. It recomputes what it can from public inputs and reads the chain, showing pass or fail per check, each with a link to the evidence. Principle: **verify, do not trust.**

### 13.1 Offering-level checks (/verify/offering/\[id\])

| ID | Check | Inputs | Pass when |
| --- | --- | --- | --- |
| C1 | Rights document hash | Published synthetic rights document; on-chain document named rights | Recomputed SHA-256 equals the on-chain hash |
| C2 | Evidence manifest root | Published manifest JSON (hashes, types, statuses only); on-chain document named evidence-manifest | Recomputed Merkle root equals the on-chain value |
| C3 | Manifest approval | Manifest record | Status approved, current, reviewer role differs from issuer role (identities not shown) |
| C4 | Asset state | On-chain isPaused; database offering status | They agree |
| C5 | Supply | On-chain total supply; sum of units on COMPLETED orders; cap | Equal, and not above the cap |
| C6 | Restriction proof | Most recent recorded proof run; Mirror Node records for its transaction IDs | Ineligible-wallet transfer failed and eligible-wallet transfer succeeded, on chain |
| C7 | Audit chain | Aggregate head hash recomputed over the audit log | Chain verifies end to end |

Each check shows PASS, FAIL or UNAVAILABLE, the evidence link (for example a HashScan transaction), the time checked, and a one-line statement of **what the check does not prove.**

### 13.2 Receipt-level page (/verify/receipt/\[token\])

The investor shares an unguessable token. The page shows, without name or email: units, price snapshot, the rights version and hash the investor signed, whether the signature recovers to the bound wallet, the allocation transaction ID with link, and whether the on-chain balance is at least the units. The wallet is shown shortened.

### 13.3 Rules

- A failed or unreachable chain read is UNAVAILABLE, never PASS by default.
- Cache reads for about 30 seconds; rate-limit the page; return no secrets.
- Public data comes from a narrow SECURITY DEFINER function that exposes offering-level, non-personal fields only.
- Footer on every page: this is a technical integrity check, not proof of title, legal validity or investment suitability.
- Checks are pure functions with injected readers (lib/verify/checks.ts) so tests can feed tampered inputs.

### 13.4 Tests

Changing one byte of the rights document makes C1 fail. Changing one document hash in the manifest makes C2 fail. Unpausing the database row without unpausing the asset makes C4 fail. Disconnecting the chain reader makes every chain-dependent check UNAVAILABLE.

---

## 14. Settlement, outbox and recovery (D4)

### 14.1 Order flow

1. **Create.** POST /api/investments with an Idempotency-Key and a signed acknowledgement. The server verifies the signature (section 15), then calls reserve\_units. The order starts in PAYMENT\_PENDING with an expiry. The function refuses unless the offering is active, so paused and drift-paused offerings accept nothing.
2. **Payment (demo).** The flag-gated demo route records a simulated payment and moves the order to PAYMENT\_CONFIRMED. A trigger inserts an allocate\_units outbox job with dedupe key equal to the order ID.
3. **Claim.** The worker claims jobs with row locking and SKIP LOCKED. It sets ALLOCATION\_PENDING and re-checks eligibility and that the offering is still active, failing closed to MANUAL\_REVIEW.
4. **Prepare.** The adapter builds the issuance transaction with an explicit transaction ID. The worker stores attempt\_no, the transaction ID and a hash of the signed bytes in allocation\_attempts **before** submitting, then commits.
5. **Submit.** The worker submits, marks the attempt submitted and the order ALLOCATION\_SUBMITTED.
6. **Confirm.** The worker reads the receipt and the Mirror Node record. On SUCCESS the attempt becomes confirmed, the order ALLOCATION\_CONFIRMED, and a reconcile job is enqueued.
7. **Reconcile.** Compare chain evidence with the order: the issuance event for this transaction, the receiving wallet, the unit count, the holder balance. A match sets COMPLETED; a mismatch sets RECONCILIATION\_REQUIRED.

### 14.2 Timeouts and unknown outcomes

A timeout is not proof of failure. The attempt becomes unknown and the worker queries Mirror Node by the stored transaction ID.

- **Found and successful:** continue at step 6.
- **Found and failed:** mark the attempt failed; create attempt n+1 with a new transaction ID.
- **Not found:** resubmitting the same signed bytes is safe, because a duplicate transaction ID is rejected rather than executed twice. After the transaction's valid-duration window has passed (verify the current maximum, about three minutes) with nothing on chain, it can never execute and a new attempt with a new ID is safe.

Never create a second attempt while the first could still execute.

### 14.3 Outbox rules

At-least-once delivery with idempotent handlers; exponential backoff, a maximum attempt count and a dead status shown in the ops panel; unique (type, dedupe\_key); each worker invocation does bounded work inside the platform timeout and continues on the next tick. Chain calls never run inline in a request handler.

### 14.4 Background jobs

| Job | Purpose |
| --- | --- |
| allocate\_units, reconcile\_order | The settlement flow above |
| expire\_reservations | Set expired UNITS\_RESERVED and PAYMENT\_PENDING orders to EXPIRED |
| sync\_eligibility | Register on chain after approval; revoke on chain when eligibility expires or is revoked |
| set\_rights\_document, set\_manifest\_document, verify\_activation | D1 gate (section 11.2) |
| evidence\_drift, integrity\_check | D2 triggers T1 to T4 (section 12) |
| pause\_asset, unpause\_asset | D2 on-chain pause and resume |
| reconcile\_supply | Compare on-chain total supply with the sum of COMPLETED orders; record mismatches |
| stuck\_orders | Flag orders pending or submitted longer than a threshold |

### 14.5 Failure after payment

If payment is confirmed but allocation ultimately fails, the order moves to ALLOCATION\_FAILED, then REFUND\_PENDING (simulated) or MANUAL\_REVIEW. It is never dropped and never marked complete.

### 14.6 Payment approach

A clearly labelled simulated payment record plus a real ATS allocation on Hedera Testnet. No real money, no claim of valuable tokens, no claim of fiat delivery-versus-payment.

### 14.7 Settlement timeline and fault injector

The investor and admin screens show a **settlement timeline** for each order: every state with its timestamp, every allocation attempt with its transaction ID and status, and links to HashScan.

For the demo, an admin can arm a one-shot fault with POST /api/demo/faults when DEMO\_FAULTS is true:

| Fault | Effect | Recovery shown |
| --- | --- | --- |
| timeout\_after\_submit | The adapter submits, then the worker behaves as though the response was lost; the attempt becomes unknown | Worker finds the stored transaction ID on Mirror Node, confirms it, continues; on-chain units equal the order, not double |
| fail\_before\_submit | Prepare succeeds, submit throws | Worker retries the same prepared transaction or creates attempt n+1 as section 14.2 dictates |
| duplicate\_job | The same allocate job is enqueued twice | Dedupe key yields one allocation |

The faults act on the real code path and real chain; nothing is faked. The app shows a persistent banner **FAULT INJECTION ENABLED (demo)**, the flag refuses to start in a production environment, and every armed fault is written to the audit log. After recovery the timeline displays an assertion panel: units on chain, units ordered, attempts used, duplicates prevented.

### 14.8 Restriction proof run

scripts/restriction-proof.ts uses two demo test wallets with no value, one registered and eligible, one not registered. It attempts a transfer from each, records the transaction IDs, the expected and observed outcome, and writes the result to the audit log with action restriction\_proof. The Verify page (C6) reads the most recent run and checks the records on Mirror Node. The test keys live in the operator environment, never in the web app.

### 14.9 Invariants (tested)

- Reserved plus allocated units never exceed the approved supply.
- At most one confirmed allocation attempt per order.
- COMPLETED is set only after reconciliation succeeds.
- Replaying a worker job or a request with the same idempotency key changes nothing.

---

## 15. Wallet binding and investor consent

### 15.1 Wallet binding

Without proof of control, a user could claim someone else's address and have it registered for the restricted asset.

1. POST /api/wallet/nonce returns a single-use random nonce (at least 16 bytes) that expires in about 10 minutes.
2. The user signs a message (EIP-191 personal sign) naming the app domain, the user ID, the nonce, chain ID 296 and an expiry.
3. POST /api/wallet/verify recovers the signer, checks it equals the claimed address, consumes the nonce, and sets wallet\_address and wallet\_verified\_at.
4. A wallet belongs to one user. Changing a bound wallet revokes the old on-chain registration and requires fresh eligibility review.

Use one wallet path for the MVP: an EVM wallet configured for the Hedera Testnet JSON-RPC network. The investor never sends an on-chain transaction for allocation; the issuer-agent issues units to the verified wallet.

### 15.2 Signed acknowledgement

Before an order the investor signs a message with: offering ID, rights version, rights-document hash, units, unit price, total amount, wallet address, a nonce, an expiry, and the text that the offering is a simulated demo. The server verifies the signature and the exact terms against current database values, then stores message, signature and wallet on the order. This proves what the investor accepted, and the receipt page (section 13.2) re-checks it. If wallet signing fails in the demo, the cut ladder allows a clearly labelled unsigned checkbox.

### 15.3 Receipt token

Each completed order has a random receipt\_token. The investor chooses whether to share the receipt URL; the page reveals no personal data.

---

## 16. Property intelligence and change analysis (D5, D6)

### 16.1 What AI may and may not do

**Allowed:** explain deterministic metrics and what changed between snapshots; separate verified, issuer-reported, public-source and simulated data; identify missing or stale information; describe risk indicators; cite the evidence records that support each statement; suggest questions for the investor to investigate.

**Not allowed:** guarantee or forecast returns; invent rent, valuation, occupancy or market data; explain causes that the supplied data does not state; approve verification or eligibility; trigger any pause, resume or transaction; present output as licensed investment advice. Use the wording **fit with your stated preferences** or **indicators**, never suitability or recommendation.

### 16.2 Three layers

1. **Deterministic engine (TypeScript):** per-snapshot metrics and the delta between two snapshots.
2. **Fit policy:** hard limits and missing-data rules. If evidence is incomplete the result is insufficient\_evidence, never an attractive score.
3. **0G explanation:** receives the structured metrics, delta, evidence IDs and provenance labels; returns validated JSON.

### 16.3 Property snapshots and scripted events

Each property has numbered snapshots (property\_snapshots): as-of date, occupancy percentage, annual rent, operating costs, valuation amount and date, a provenance label, an event note, and the evidence manifest it is tied to. The demo ships config/demo-events.json with scripted events, applied by a flag-gated admin action (POST /api/demo/property-event). **Scripted events are clearly labelled simulated; they are never presented as live market information.**

| Item | Snapshot 1 (baseline) | Snapshot 2 (scripted event) |
| --- | --- | --- |
| Valuation | INR 10,00,00,000 | INR 10,50,00,000 (new valuation report uploaded) |
| Occupancy | 90% | 85% |
| Annual rent | INR 72,00,000 | INR 68,00,000 |
| Operating costs | INR 14,00,000 | INR 16,00,000 |
| Gross yield (rent / valuation) | 7.20% | about 6.48% |
| Net operating income (rent minus costs) | INR 58,00,000 | INR 52,00,000 (about 10.3% lower) |
| Net income yield on valuation | 5.80% | about 4.95% |

The interesting case: **valuation rose while income-based indicators weakened.** Uploading the new valuation report also exercises the D2 drift flow, so the two features meet in one demo moment. The code computes every figure; the table above is an example, not stored output.

### 16.4 Deterministic delta

For each indicator the engine emits: from, to, absolute change, percentage change, direction (improved, weakened, unchanged) and a policy flag when the change passes a threshold from the fit policy. Indicators: valuation, occupancy, annual rent, operating costs, gross yield, net operating income, net income yield (only when costs are present and sourced), checklist completeness, evidence freshness (days since the valuation date), and whether a rights or manifest version changed. Money uses decimals (section 17.1); no floating-point arithmetic on money.

Each changed indicator carries the evidence record IDs that support the new value, taken from the snapshot's manifest. An indicator with no supporting evidence is marked unsupported and is passed to the model as such.

### 16.5 India benchmarks (D6, Tier C)

Two official datasets give local context. Keep them as **static, versioned snapshots** in data/benchmarks with SOURCES.md recording URL, retrieval date, terms and any transformation. Never fetch them live at runtime.

- **RBI House Price Index.** Quarterly, compiled from transaction-level data of registration authorities, covering 18 cities including Mumbai, Thane and Pune; time series on the RBI DBIE portal; the latest release found was for Q1 2026-27 (dated 24 August 2026). It measures **residential** prices, so label it residential market context and never a commercial valuation. Newer releases use a 2022-23 base year while older ones used 2010-11; do not splice series with different bases.
- **Maharashtra Ready Reckoner (ASR) rates.** The minimum registration values set by the Department of Registration and Stamps, checkable by zone in the IGR e-ASR service; the state kept rates unchanged for 2026-27. Use as a sanity band: declared valuation per square metre against the zone rate. A ratio below 1 is a review flag. It is a stamp-duty floor, not market value.

Both carry the provenance label public\_source with an as-of date. Their snapshot hash goes into the AI input record. If time is short, drop this section first.

### 16.6 0G integration requirements

- Use the current official 0G Private Computer endpoint, authentication and model name; verify the contract before writing the client. Credentials stay server-side.
- Capture the real request ID from every call. Store provider, model, timestamp, input hash (over canonical JSON), output hash and validation status.
- Timeout of roughly 20 to 30 seconds; at most one repair retry on malformed JSON; record **every** request ID in request\_attempts.
- Cache by (investor or property, input hash) for a short window and rate-limit per user.
- Send only bucketed or pseudonymized preference data; no personal identifiers; never send documents.
- If the response carries an attestation or verification artifact, store and display it.
- If 0G is unavailable show analysis temporarily unavailable; deterministic metrics stay visible. Never substitute an unlabelled model.
- Optional: upload a non-sensitive episode manifest to 0G Storage and record the root hash; this never replaces Private Computer inference.

### 16.7 Response schema

```json
{
  "summary": "Valuation rose, but income-based indicators weakened in this simulated update.",
  "preference_fit": "insufficient_evidence",
  "changes": [
    { "indicator": "net_operating_income", "from": "5800000", "to": "5200000",
      "direction": "weakened", "supporting_evidence_ids": ["doc-valuation-v2", "snap-2"] }
  ],
  "risk_flags": ["Occupancy fell", "Operating costs rose"],
  "assumptions": ["All figures are simulated"],
  "missing_information": ["Independent explanation of the occupancy change"],
  "cannot_determine": ["Why occupancy fell: the supplied data does not state a cause"],
  "source_ids": ["snap-1", "snap-2"],
  "disclaimer": "Educational analysis only; not investment advice."
}
```

preference\_fit is one of insufficient\_evidence, poor\_match, partial\_match, good\_match. Validate with Zod and reject: invalid JSON, unexpected enums, evidence or source IDs outside the supplied allowlist, any number in the prose that does not appear in the deterministic metrics, causal claims not present in the event note, and missing fields.

### 16.8 Reason to return

- A **Property Updates** feed lists snapshots and drift events with a one-click analysis of what changed since the last episode (previous\_episode\_id).
- A prompt appears on the offering page when the input hash differs from the last analysis.
- Stale-evidence reminders come from the T3 and T4 checks.

All three use data already in the system.

### 16.9 Prompt injection and data safety

Issuer-authored free text is untrusted. Pass it inside a delimited quoted block under a fixed system policy, validate IDs against an allowlist, and never send private deeds or identity data. Retrieved text cannot change system rules.

### 16.10 Why 0G matters (submission sentence)

NIVASA uses 0G Private Computer as the inference provider for evidence-grounded change analysis. Remove it and the product loses the step that turns deterministic snapshot deltas into cited explanations, along with its request-level provenance. 0G does not guarantee investment correctness.

---

## 17. Database schema (MVP: 15 tables)

### 17.1 Conventions

- UUID primary keys; timestamptz for times; RLS enabled on every table.
- **Money:** numeric(20,2) in the database; a decimal library (lib/money/decimal.ts) in TypeScript; never a JavaScript number. Supabase returns numeric as a string; never parse it to Number. Percentages use numeric(5,2). Unit counts are bigint (strings in JSON).
- Status columns carry CHECK constraints generated from lib/state/transitions.ts; a trigger rejects transitions not in allowed\_transitions.
- Derived values (verification status, units available) are computed, not hand-maintained.

### 17.2 Tables

**Identity and eligibility**

- **profiles**: id (references auth.users), display\_name, wallet\_address (unique, nullable), wallet\_verified\_at, wallet\_nonce, wallet\_nonce\_expires\_at, created\_at.
- **user\_roles**: id, user\_id, role in (issuer, investor, verifier, admin), granted\_by, granted\_at, revoked\_at. Partial unique index on active (user\_id, role). Grants only through a server-only function.
- **investor\_eligibility**: id, user\_id, offering\_id, status in (pending, eligible, ineligible, expired, revoked), policy\_version, reviewed\_by (CHECK distinct from user\_id), valid\_until, reason\_code, chain\_status in (not\_registered, registered, revoked), created\_at. Partial unique index on (user\_id, offering\_id) where status in (pending, eligible).

**Property and evidence**

- **properties**: id, issuer\_id, name, description, city, locality, property\_type, normalized\_address, parcel\_ref\_hmac, built\_up\_area\_sqm, rr\_zone\_ref, verification\_status (derived), is\_demo default true, created\_at, updated\_at.
- **property\_documents**: id, property\_id, document\_type (from the checklist config), private\_storage\_path, sha256\_hash, mime\_type, size\_bytes, source\_name, source\_reference, issued\_at, valid\_until, received\_at, status, uploaded\_by, superseded\_by, created\_at.
- **evidence\_manifests**: id, property\_id, version (unique with property\_id), manifest\_json, manifest\_hash, merkle\_root, checklist\_completeness, status in (draft, submitted, approved, rejected, superseded), created\_by, approved\_by (CHECK distinct from the property's issuer by trigger), approved\_at, onchain\_doc\_tx, created\_at. Partial unique index allowing one approved, non-superseded manifest per property. Approved rows are immutable.
- **property\_verifications**: id, property\_id, manifest\_id, review\_stage, decision, reviewer\_id (trigger enforces reviewer is distinct from the issuer), evidence\_summary jsonb, limitations, policy\_version, decided\_at, supersedes\_id.
- **property\_snapshots**: id, property\_id, snapshot\_no (unique with property\_id), as\_of, occupancy\_pct, annual\_rent\_inr, operating\_costs\_inr, valuation\_amount\_inr, valuation\_date, provenance in (independently\_verified, issuer\_reported, public\_source, simulated, unknown), event\_note, manifest\_id, created\_by, created\_at. Append-only.

**Offering and rights**

- **offerings**: id, property\_id, issuer\_id, proposed\_by, approved\_by (CHECK distinct from proposed\_by), token\_name, token\_symbol, asset\_type, chain\_id default 296, ats\_asset\_ref, token\_contract\_id, token\_evm\_address, total\_units bigint, unit\_price\_inr, minimum\_units, maximum\_units\_per\_investor, status, paused\_reason, current\_rights\_version, current\_manifest\_id, rights\_doc\_tx, manifest\_doc\_tx, configuration\_hash, created\_at, updated\_at.
- **offering\_rights**: id, offering\_id, version (unique with offering\_id), rights\_type, rights\_document\_path, rights\_document\_hash, income\_entitlement\_rule, transfer\_rule, redemption\_rule, voting\_or\_control\_rights, risk\_disclosures, approved\_by, approved\_at.

**Settlement**

- **investment\_orders**: id, idempotency\_key (unique), receipt\_token (unique), investor\_id, offering\_id, units, unit\_price\_inr (snapshot), amount\_inr (computed server-side), rights\_version, rights\_document\_hash, ack\_message, ack\_signature, ack\_wallet, status, eligibility\_snapshot jsonb, simulated\_payment\_ref, expires\_at, created\_at, updated\_at. CHECK units > 0.
- **allocation\_attempts**: id, order\_id, attempt\_no (unique with order\_id), chain\_tx\_id, signed\_tx\_hash, status in (prepared, submitted, confirmed, failed, unknown), error, submitted\_at, confirmed\_at, consensus\_timestamp. Partial unique index allowing at most one confirmed attempt per order. Retries add rows; history is never overwritten.
- **outbox\_jobs**: id, type, dedupe\_key, order\_id, offering\_id, property\_id, payload jsonb, status in (pending, running, done, failed, dead), attempts, max\_attempts, next\_run\_at, locked\_by, locked\_at, last\_error, created\_at. Unique (type, dedupe\_key); index on (status, next\_run\_at).

**AI and audit**

- **ai\_episodes**: id, investor\_id, property\_id, snapshot\_from, snapshot\_to, request\_id, provider, model\_name, model\_version, input\_hash, output\_hash, input\_snapshot jsonb, deterministic\_metrics jsonb, validated\_response jsonb, request\_attempts jsonb (every 0G request ID including a repair retry), benchmark\_snapshot\_hash, previous\_episode\_id, status, created\_at. Index on (investor\_id, property\_id, input\_hash).
- **audit\_logs**: id bigserial, actor\_user\_id, actor\_wallet, action, resource\_type, resource\_id, before\_hash, after\_hash, reason, prev\_hash, row\_hash, created\_at. Written only by an append function that takes an advisory lock and sets row\_hash to the SHA-256 of prev\_hash plus the canonical row content. UPDATE and DELETE are revoked from application roles.

### 17.3 Stretch and deferred tables

**Stretch (Tier C):** distributions, distribution\_entitlements (ATS dividend snapshot, simulated payout), and an anchored\_tx\_id column on audit\_logs for HCS anchoring. **Deferred:** property\_disputes, property\_valuations, legal\_structures, payment\_events, refund\_records, chain\_transactions, chain\_events, reconciliation\_runs, ai\_evidence.

### 17.4 Atomic reservation function

supabase-js cannot run multi-statement transactions or row locks, so reservation lives in Postgres and is called through rpc. Locking the offering row serializes all reservations for that offering; the idempotency check runs after the lock so concurrent duplicates cannot both insert. The receipt\_token needs pgcrypto (gen\_random\_bytes); confirm the extension is enabled.

```sql
create or replace function counts_against_supply(s text, exp timestamptz)
returns boolean language sql stable as $$
  select s in ('PAYMENT_CONFIRMED','ALLOCATION_PENDING','ALLOCATION_SUBMITTED',
               'ALLOCATION_CONFIRMED','COMPLETED','ALLOCATION_FAILED',
               'REFUND_PENDING','RECONCILIATION_REQUIRED','MANUAL_REVIEW')
      or (s in ('UNITS_RESERVED','PAYMENT_PENDING') and exp > now());
$$;

create or replace function reserve_units(
  p_key text, p_investor uuid, p_offering uuid, p_units bigint,
  p_ack_message text, p_ack_signature text,
  p_ttl interval default interval '15 minutes'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  o offerings%rowtype; pr profiles%rowtype;
  v_existing uuid; v_held bigint; v_mine bigint; v_order uuid;
begin
  select * into o from offerings where id = p_offering for update;
  if not found then raise exception 'OFFERING_NOT_FOUND'; end if;
  if o.status = 'paused_evidence_drift' then raise exception 'OFFERING_PAUSED_EVIDENCE'; end if;
  if o.status <> 'active' then raise exception 'OFFERING_NOT_ACTIVE'; end if;

  select id into v_existing from investment_orders where idempotency_key = p_key;
  if found then return v_existing; end if;

  if p_units < o.minimum_units then raise exception 'BELOW_MINIMUM'; end if;

  select * into pr from profiles where id = p_investor;
  if pr.wallet_verified_at is null then raise exception 'WALLET_NOT_VERIFIED'; end if;

  perform 1 from investor_eligibility
   where user_id = p_investor and offering_id = p_offering
     and status = 'eligible' and valid_until > now() and chain_status = 'registered';
  if not found then raise exception 'NOT_ELIGIBLE'; end if;

  select coalesce(sum(units),0) into v_held from investment_orders
   where offering_id = p_offering and counts_against_supply(status, expires_at);
  if v_held + p_units > o.total_units then raise exception 'INSUFFICIENT_UNITS'; end if;

  select coalesce(sum(units),0) into v_mine from investment_orders
   where offering_id = p_offering and investor_id = p_investor
     and counts_against_supply(status, expires_at);
  if o.maximum_units_per_investor is not null
     and v_mine + p_units > o.maximum_units_per_investor then
    raise exception 'ABOVE_INVESTOR_MAX';
  end if;

  insert into investment_orders (idempotency_key, receipt_token, investor_id, offering_id,
      units, unit_price_inr, amount_inr, rights_version, rights_document_hash,
      ack_message, ack_signature, ack_wallet, status, expires_at)
  select p_key, encode(gen_random_bytes(16), 'hex'), p_investor, p_offering, p_units,
         o.unit_price_inr, p_units * o.unit_price_inr, r.version, r.rights_document_hash,
         p_ack_message, p_ack_signature, pr.wallet_address,
         'PAYMENT_PENDING', now() + p_ttl
    from offering_rights r
   where r.offering_id = p_offering and r.version = o.current_rights_version
  returning id into v_order;

  return v_order;
end $$;
```

The application verifies the signature (section 15) before calling this function. Eligibility, wallet verification and the offering status are checked in the same transaction, so a revoked investor or a drift-paused offering cannot slip through between check and reserve.

### 17.5 Triggers and functions to write

- allowed\_transitions enforcement for property, manifest, offering and order status.
- Derived property verification\_status from the latest property\_verifications row.
- Separation-of-duties checks (reviewer versus issuer, approver versus proposer, resume approver versus evidence uploader).
- Immutability of approved manifests and of property\_snapshots.
- audit\_append(...) with the advisory lock and hash chain.
- public\_offering\_view(offering\_id): the narrow function behind the Verify page.

---

## 18. RLS and database security

- RLS enabled on every table; default deny; explicit policies per role.
- Investors read only their own profile, eligibility, orders and AI episodes.
- Issuers read and modify only their own properties, documents and offerings, and only in states that allow editing.
- Verifiers read the evidence needed for review and write decisions; they cannot change issuer identity or documents.
- Role grants happen only through a server-only function; no policy lets a user write user\_roles.
- The service-role key is server-only. Document every service-role code path in supabase/policies.md.
- The private storage bucket has no public read. Only the synthetic rights document and the hashes-only manifest are published for the Verify page.
- Unique constraints give idempotency and replay protection: idempotency\_key, outbox dedupe, one confirmed attempt per order, one approved manifest per property.
- audit\_logs is append-only by privilege, not convention.
- Hiding a button is never authorization; every route re-checks role and ownership.
- RLS tests use at least two investors and one issuer against the RLS-scoped client, not the service role.

---

## 19. API design (24 mutation routes)

Reads (offering page, dashboards, review queue, audit view, Property Intelligence history, the public Verify pages) are served by **server components**, not API routes. All routes require authentication unless stated, validate bodies and path IDs with Zod, derive identity from the session (never a client-supplied user or reviewer ID), return stable error codes, and are rate-limited.

| Method | Endpoint | Permission | Purpose |
| --- | --- | --- | --- |
| POST | /api/properties | issuer | Create property draft |
| POST | /api/properties/:id/documents | issuer | Upload private evidence; after manifest approval it enqueues a drift job (T1) |
| POST | /api/properties/:id/submit | issuer | Build the manifest and submit for review |
| POST | /api/properties/:id/verifications | verifier | Decision on one manifest version, with limitations |
| POST | /api/offerings | issuer | Propose offering |
| POST | /api/offerings/:id/rights | issuer | Add a rights-document version |
| POST | /api/offerings/:id/approve | verifier or admin (not the proposer) | Approve for demo |
| POST | /api/offerings/:id/activate | admin | Enqueue the D1 gate jobs |
| POST | /api/offerings/:id/pause | admin | Manual pause job |
| POST | /api/offerings/:id/resume | verifier or admin (not the evidence uploader) | Enqueue resume jobs; requires a current approved manifest |
| POST | /api/offerings/:id/close | admin | Close offering |
| POST | /api/wallet/nonce | investor | Issue a single-use nonce |
| POST | /api/wallet/verify | investor | Verify signed nonce, bind wallet |
| POST | /api/eligibility/requests | investor | Request demo eligibility |
| POST | /api/eligibility/:id/review | verifier (not the investor) | Approve, reject or revoke |
| POST | /api/investments | investor | Create order (Idempotency-Key header plus signed acknowledgement) |
| POST | /api/demo/payment-confirmation | admin, DEMO\_PAYMENTS=true | Record simulated payment |
| POST | /api/demo/faults | admin, DEMO\_FAULTS=true | Arm a one-shot fault |
| POST | /api/demo/property-event | admin, DEMO\_EVENTS=true | Apply a scripted simulated property event |
| POST | /api/ai/profile | investor | Save bucketed preferences |
| POST | /api/ai/analyze-offering | investor | Metrics plus 0G explanation |
| POST | /api/ai/analyze-changes | investor | Snapshot delta plus 0G explanation |
| POST | /api/admin/roles | admin | Grant or revoke role |
| POST | /api/cron/worker | cron secret | Run outbox and background jobs |

One read-only poll also exists: GET /api/investments/:id (owner only), used by the settlement timeline.

**Stable error codes:** OFFERING\_NOT\_FOUND, OFFERING\_NOT\_ACTIVE, OFFERING\_PAUSED\_EVIDENCE, WALLET\_NOT\_VERIFIED, NOT\_ELIGIBLE, BELOW\_MINIMUM, ABOVE\_INVESTOR\_MAX, INSUFFICIENT\_UNITS, MANIFEST\_NOT\_APPROVED, SOD\_VIOLATION, FLAG\_DISABLED.

**Internal jobs, not HTTP routes:** allocation, reconciliation, expiry, eligibility sync, drift and integrity checks, pause and unpause, document anchoring, supply reconciliation. Exposing these over HTTP would let anyone trigger spending of a signer key.

There is no endpoint through which a browser can claim payment succeeded or tokens were allocated, and none that signs client-supplied calldata. Every demo route is gated by an environment flag that refuses to start in a production environment and shows a persistent banner while on.

---

## 20. Threat model

| Threat | Example | Required mitigation |
| --- | --- | --- |
| Fake property | Fabricated deed uploaded | Evidence provenance, independent review, explicit limitations |
| Evidence swapped after approval | Issuer replaces a document after sign-off | Manifest root bound to approval; D2 pause until re-review |
| Manifest forgery | DB manifest differs from chain | On-chain root read-back before activation and on the Verify page (C2) |
| Over-issuance | Token admin mints above approved supply | ATS cap and role controls; supply reconcile job; Verify check C5 |
| Admin compromise | Attacker approves own property | Separation of duties in the database, audit chain, pause |
| Single key theft | One key holds every ATS role | Role-separated ECDSA accounts; issuance cap; pauser separate |
| Unauthorized transfer | Token sent to an unverified wallet | Token-layer KYC and transfer restrictions; restriction proof run |
| Wallet spoofing | User claims another person's address | Signed-nonce binding; unique wallet per user |
| KYC expiry drift | Expired user still allowed on chain | sync\_eligibility revokes on chain; allocation re-checks and fails closed |
| Payment replay | Same demo payment recorded twice | Unique idempotency key and outbox dedupe key |
| Duplicate allocation | Retry after timeout mints twice | Pre-persisted transaction ID, query before retry, one confirmed attempt per order |
| Oversubscription | Concurrent buyers reserve the last units | reserve\_units with offering row lock |
| Pause abuse | Attacker triggers pause repeatedly | Pause only through jobs; dedupe keys; pauser key held by the worker only |
| Exposed internal action | Anyone triggers allocation | No HTTP route; cron secret on worker |
| Demo controls in production | Fault injector or free payment left on | Flags refuse production, banner, audit entry for every use |
| Serverless timeout | Request dies mid-settlement | Outbox plus worker; no inline chain calls |
| Database compromise | One investor reads another's data | RLS, least privilege, server-only service key, RLS-scoped reads |
| Audit tampering | Row edited after the fact | Hash chain, revoked UPDATE and DELETE |
| Verify-page data leak | Page reveals personal or private data | Narrow public function; hashes-only manifest; receipt token unguessable |
| Document leak | Public URL exposes a deed | Private bucket, short-lived signed URLs |
| AI hallucination | Model invents a cause or number | Deterministic metrics, allowlisted IDs, number and causal-claim validation |
| Prompt injection | Property text tells the model to ignore policy | Delimited untrusted data, fixed policy, no document text to the model |
| Stale benchmark data | Old reference data looks current | Static snapshot with as-of date and hash; never live |
| 0G outage | Inference unavailable | Safe stop; deterministic metrics remain |
| Mirror Node lag | Portfolio or Verify page stale | Pending and UNAVAILABLE states, last-sync time |
| Fake demo claims | Testnet data looks real | Persistent simulation labels, honest README |

### 20.1 Security boundaries

The frontend is untrusted. User metadata is untrusted. AI output is untrusted until validated. A hash is integrity evidence, not authenticity proof. A database status is not proof of chain state. A submitted transaction is not a confirmed one. A testnet transaction is not a real settlement. An admin decision is not independent legal verification.

---

## 21. Frontend behavior and trust UX

- **Persistent banner on every page:** SIMULATED DEMO. NOT A REAL OFFERING. Extra banners appear when payment, fault or event demo flags are on.
- **Offering page:** what the token represents and does not; rights version and hash; manifest status, completeness score and limitations; chain references; the drift banner when paused; a prominent link to the Verify page.
- **Issuer dashboard:** the checklist with a completeness score, per-document status, manifest versions, and a warning before uploading revised evidence that it will pause issuance.
- **Verifier dashboard:** manifest diff against the previous version, evidence sources and hashes, prior decisions, required reason for every decision.
- **Investor dashboard:** chain-confirmed holdings separate from pending orders; last chain sync time; wallet status; the settlement timeline with attempts and HashScan links; receipt link.
- **Property Intelligence:** snapshot history, deterministic changes with direction and evidence IDs, the 0G analysis with timestamp and request ID, provenance and cannot-determine items.
- **Admin ops:** stuck and dead jobs, order timelines with a correlation ID across database, chain and AI logs, demo controls with their banners.

---

## 22. Testing strategy

Automated tests run with Vitest (plus Postgres tests for SQL) against a local or branch Supabase. No Hardhat suite is needed because there is no custom contract.

### 22.1 Database and API

- Unauthenticated requests rejected; an investor cannot read another investor's rows (RLS-scoped client).
- Separation of duties: issuer cannot approve own manifest; offering approver cannot be the proposer; eligibility reviewer cannot be the investor; resume approver cannot be the evidence uploader.
- Users cannot set their own role, wallet verification, KYC or eligibility.
- Invalid state transitions are rejected by the trigger.
- Same Idempotency-Key returns the same order.
- **Concurrency:** 20 parallel reservation calls for the last 5 units produce exactly the permitted number of orders.
- Reservation fails for an unverified wallet, an ineligible investor, below minimum, above per-investor maximum, a paused offering, and a drift-paused offering (OFFERING\_PAUSED\_EVIDENCE).
- The audit hash chain verifies end to end; UPDATE and DELETE on audit\_logs fail.

### 22.2 Differentiator tests

- **D1:** activation stays blocked when the manifest document is missing on chain, when its root differs from the approved root, or when the rights hash differs.
- **D1:** Merkle root test vectors (fixed documents produce fixed roots; reordering inputs does not change the root under sorted-pair hashing).
- **D2:** replacing a document after approval pauses the offering and the asset; the same drift event processed twice creates one manifest version and one pause; resume works only after re-approval and a matching on-chain root.
- **D3:** the tamper tests in section 13.4.
- **D4:** each armed fault ends with exactly one confirmed allocation and units on chain equal to units ordered.
- **D5:** the AI validator rejects an invented number, a cause not in the event note, an evidence ID outside the allowlist, and malformed JSON; the AI route cannot cause any chain action.

### 22.3 Ten-plus mandatory adversarial tests

Write the expected behavior first. Run them with one command, **npm run adversarial**, which prints a pass or fail report to paste into the README as judge-visible evidence.

1. Unverified issuer attempts to activate an offering.
2. Activation attempted without the manifest root on the ATS asset.
3. Same property submitted twice with different scans (duplicate flag; Tier C UI).
4. Token administrator attempts to issue beyond the approved supply (exercise the ATS cap).
5. Unverified wallet attempts to receive or transfer the restricted asset.
6. Unauthorized user calls a verifier action.
7. Same investment request submitted twice.
8. Payment confirmation replayed.
9. Payment succeeds but allocation fails (inject the failure).
10. Timeout after submit (fault injector) still yields one allocation.
11. Evidence replaced after approval: the offering pauses and new orders are refused.
12. Resume attempted by the evidence uploader is refused.
13. 0G returns malformed JSON, an invented number, or times out.
14. A tampered rights document or manifest makes the Verify page fail.

---

## 23. Build plan for a solo developer

The order is deliberate: prove the chain, build a thin slice on seeded data, then add the differentiators in order. If time collapses, remove secondary features, never security controls or evidence integrity. Hours are estimates; ATS is the largest uncertainty.

| Phase | Tier | Hours | Work | Exit condition |
| --- | --- | --- | --- | --- |
| 0. Freeze scope | A | 0.5 | Confirm deadline on the live dashboard; pin ATS release, Node and npm; confirm 0G access; create repo; commit this document | One page of scope and environment decisions in the repo |
| 1. ATS gate | A | up to 4 | Section 8.6, including documents, pause and unpause, restricted transfer | Real testnet operations reproducible; transaction IDs in docs/ats-gate.md |
| 2. Foundation | A | 2 | Next.js, Tailwind, Supabase auth, migrations (core tables, transitions, audit chain, reserve\_units), RLS, seed.sql with users, a verified property with an approved manifest, a draft offering and rights v1 | Authenticated, role-aware app with seeded data |
| 3. Thin slice | A | 4.5 | ATS adapter, wallet binding, eligibility, reservation, demo payment, outbox worker, allocation, reconcile, restriction proof run, portfolio with HashScan links | Investor sees a real on-chain balance; duplicates cannot allocate twice; failed allocation is not marked complete |
| 4. Minimal AI | A | 2 | Deterministic metrics, 0G call with request ID, schema validation, episode record | Real 0G inference in the main flow with the request ID stored and shown |
| 5. Evidence gate and drift | B | 2.5 | Manifest builder, Merkle root, document anchoring, activation jobs (D1), drift job and pause and resume (D2) | Activation requires on-chain root; document upload pauses the asset; re-approval resumes it |
| 6. Verify page | B | 1.5 | Checks C1 to C7, receipt page | A stranger can run the checks; tampered inputs fail |
| 7. Timeline and faults | B | 1 | Settlement timeline, fault injector, assertion panel | Fault recovery visible and correct |
| 8. Change intelligence | B | 1.5 | Snapshots, scripted event, delta, richer 0G schema and validation | Change analysis with evidence IDs and request ID |
| 9. Widen the workflow | B | 1.5 | Issuer checklist screen, verifier diff, offering page, ops panel | Issuer to verifier to offering is usable end to end |
| 10. Hardening and submission | A and B | 3 | npm run adversarial, RLS tests, secrets scan, README, diagram, verify HashScan links, record both videos, clean-browser test, submit before the verified deadline | A judge can run or inspect the repo, use the demo and verify chain and 0G evidence |
| 11. Stretch | C | as available | D6 benchmarks, HCS anchoring, ATS dividend, duplicate-detection UI | Only after Tier B is complete |

Totals: Tier A about 16 hours; Tier B adds about 8, so about 24 in total.

### 23.1 Checkpoints

- **Build hour 5:** if the ATS gate is not complete, switch the adapter to manual mode and continue.
- **Build hour 12:** if the thin slice is not finished, start the cut ladder.
- **About 3.5 hours before the deadline:** feature freeze; only hardening, README and videos remain.

### 23.2 Cut ladder (drop in this order)

1. Tier C items.
2. D6 benchmarks (keep the checklist and completeness score).
3. Ops-panel and timeline polish (keep the underlying logs).
4. Duplicate-detection UI.
5. Signed acknowledgement replaced by a clearly labelled unsigned checkbox.
6. D5 reduced to a single-snapshot explanation.
7. SDK adapter replaced by manual mode.
8. D4 reduced to the timeout fault only.

**Never cut:** the reservation function, outbox and idempotency, RLS and separation of duties, simulation labels, real ATS use, the real 0G call, and adversarial tests 7 through 11. If pause and unpause cannot be proven in the gate, D2 keeps its database fail-closed behavior and uses whichever on-chain control the gate did prove, disclosed plainly. Never claim an on-chain operation that was not performed.

### 23.3 If fewer than about 12 hours remain

Run the ATS gate compressed, seed the evidence and offering data, and deliver only: eligibility, reservation, allocation, reconciliation, the restriction proof, a minimal 0G call with a stored request ID, and two short videos. Describe D1 to D6 in the README as designed and not yet built. A smaller honest demo beats a larger broken one.

---

## 24. MVP acceptance criteria

**Tier A (core)**

- [ ] ATS is genuinely used (SDK mode, or manual mode disclosed); the asset exists on Hedera Testnet with cap, KYC and transfer restrictions.
- [ ] An eligible investor with a signature-verified wallet receives an allocation; the transaction is inspectable on HashScan.
- [ ] A transfer to an unregistered wallet is rejected; the proof run is recorded.
- [ ] Duplicate orders and replayed payments allocate nothing extra; the concurrency test passes.
- [ ] A failed allocation is never marked COMPLETED; COMPLETED is set only by reconciliation.
- [ ] Real 0G inference runs in the main flow; the request ID is stored and shown; invalid output is rejected.
- [ ] RLS enabled and tested; users cannot grant their own role or eligibility.
- [ ] No secrets in client bundles or Git; README states the limitations.

**Tier B (differentiators)**

- [ ] D1: activation is refused until the approved manifest root and rights hash are read back from the ATS asset.
- [ ] D2: uploading revised evidence pauses the offering and the asset; orders are refused; re-approval by a different reviewer resumes it.
- [ ] D3: the public Verify page runs checks C1 to C7; tampered inputs fail; chain failures show UNAVAILABLE.
- [ ] D4: an injected fault ends with one confirmed allocation; the timeline shows the attempts.
- [ ] D5: a scripted event produces a deterministic delta and a validated, evidence-cited 0G explanation.
- [ ] `npm run adversarial` passes and its report is in the README.

---

## 25. ETHGlobal Mumbai strategy

Re-read the live prize page before submission; requirements and amounts change.

### 25.1 Primary: Hedera tokenization track

The track name varies by event (the dataset shows Tokenization of Anything at ETHOnline 2026 and Tokenization on Hedera at other events), so confirm the exact name and requirements on the live page. Required proof is expected to include real ATS use, a Hedera Testnet deployment, a public repository and a short demo video. NIVASA's lifecycle story, each step with transaction evidence: configure an asset with a cap and KYC, gate activation on an on-chain evidence root and rights hash, issue to a verified wallet, show a rejected transfer to an unregistered wallet, pause and resume on evidence drift, and let anyone verify it on the Verify page.

### 25.2 Secondary: 0G Private Computer

Good fit only because AI is a real feature. Required proof is expected to include Private Computer inference in the main flow, real request IDs, a working app, a reason to return (section 16.8), a sentence on what breaks without 0G (section 16.10) and a short video. Record it separately from the Hedera video.

### 25.3 Not targeted

- **x402 agent payments.** The earlier idea had no real data provider (paying our own synthetic API looks artificial), adds a second spending key against least-privilege custody, and would compete for time with the primary track. List it as future work only.
- Arc, Uniswap AMM (unrestricted pools conflict with a restricted asset), the Hedera no-Solidity track (our architecture is ATS), and extra identity, oracle or indexing sponsors.

Two excellent verifiable integrations beat five superficial ones.

### 25.4 Demo script (about three minutes; the Hedera cut can run longer if the rules allow)

| Time | Beat |
| --- | --- |
| 0:00 to 0:20 | The lifecycle-gap problem; the simulation banner; one fictional Maharashtra property |
| 0:20 to 0:50 | Checklist and completeness score; a different user reviews; the manifest is approved |
| 0:50 to 1:20 | Rights version and hash; gated activation with the root and hash read back from the ATS asset; wallet binding and signed acknowledgement |
| 1:20 to 1:55 | Allocation with an injected timeout; the timeline shows recovery; one allocation on HashScan; the rejected transfer from the proof run |
| 1:55 to 2:25 | The issuer uploads a revised valuation report; the asset pauses on Hedera; an order is refused; a different reviewer re-approves; the asset resumes |
| 2:25 to 3:00 | The Verify page passes; the 0G change analysis with its request ID; state the limits: proposed DELTA, no title transfer, no real solicitation, testnet and simulated figures |

Execute the real run before recording, then show it. Never stage fake HashScan links, invented request IDs or screenshots that imply a test flow is live.

---

## 26. README and environment

### 26.1 README must include

Project summary and the lifecycle-gap problem; what NIVASA does and does not do; legal and regulatory limitations; the prior-art method and its limits (section 1.2) with claims worded as in section 1.4; architecture diagram; roles and workflows; the six differentiators; ATS integration with exact release or commit and adapter mode; testnet asset references, document transaction IDs and HashScan links; 0G integration with actual request IDs; database setup; RLS and security notes; environment variables; local setup; test commands including npm run adversarial and its report; demo link and videos; known limitations; threat model; future production requirements; the AI-use disclosure ETHGlobal requires; license.

Never publish .env.local, private keys, service-role keys, real KYC data, personal identity data or private deeds.

### 26.2 Environment (.env.example, names only)

```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_ENV=demo                          # demo | production (demo flags refuse production)
CRON_SECRET=
DEMO_PAYMENTS=false
DEMO_FAULTS=false
DEMO_EVENTS=false
PARCEL_HMAC_SECRET=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=            # server only

# Hedera (server only; the deployer key is NOT in the app environment)
HEDERA_NETWORK=testnet
HEDERA_JSON_RPC_URL=
HEDERA_MIRROR_NODE_URL=
HEDERA_ISSUER_AGENT_ACCOUNT_ID=
HEDERA_ISSUER_AGENT_PRIVATE_KEY=
HEDERA_COMPLIANCE_ACCOUNT_ID=
HEDERA_COMPLIANCE_PRIVATE_KEY=
HEDERA_PAUSER_ACCOUNT_ID=
HEDERA_PAUSER_PRIVATE_KEY=
ISSUER_DAILY_UNIT_CAP=

# ATS
ATS_ADAPTER_MODE=sdk                  # sdk | manual
ATS_ASSET_REF=
ATS_FACTORY_ADDRESS=
ATS_RESOLVER_ADDRESS=

# 0G Private Computer (server only)
OG_API_KEY=
OG_BASE_URL=
OG_MODEL=

# Optional 0G Storage (server only)
OG_STORAGE_PRIVATE_KEY=
OG_STORAGE_RPC=
OG_STORAGE_INDEXER=
```

Use the exact endpoint and variable format from current provider docs. Demo test-wallet keys for the restriction proof stay in the operator environment, not in this file.

---

## 27. Production readiness (explicitly out of hackathon scope)

Before any real investor launch NIVASA would need, at minimum: written Indian legal analysis of the instrument and issuer; confirmation of DELTA's legislative status and operative rules; central and state law analysis; securities characterization with registration or exemption analysis; company, trust or SPV structuring advice; title search and independent legal diligence; encumbrance and litigation review; independent valuation and governance; RERA analysis where applicable; KYC, AML and sanctions design; data protection assessment under India's DPDP Act, including consent and a deletion path that coexists with audit retention; tax, stamp duty, registration and accounting analysis; regulated payment and custody providers; investor disclosures and grievance handling; a smart-contract and application security audit; multisig key custody, rotation and recovery; operational controls for distributions, redemption, defaults and disputes; secondary-transfer analysis; independent penetration testing and monitoring; append-only audit storage outside the application database. A prototype that shows technical feasibility does not establish legal feasibility or regulatory permission.

---

## 28. Decision log

| Decision | Current choice | Reason | Change from V3 |
| --- | --- | --- | --- |
| Positioning | RWA lifecycle infrastructure for one asset | Marketplace framing is crowded | **changed** |
| Differentiators | D1 to D6 (evidence-gated issuance, drift pause, Verify page, failure demo, change intelligence, India evidence) | Prior-art search found these gaps | **new** |
| Lifecycle operation for the Hedera demo | Pause and resume on evidence drift, plus restriction proof | More meaningful than a dividend | **changed** |
| Evidence binding | Merkle manifest root anchored as an ATS document | Ties evidence to the token | **new** |
| Public verification | Verify page with pass, fail, unavailable states | Judges can check without trusting the UI | **new** |
| AI | Snapshot change analysis with evidence-ID citations | Load-bearing 0G use and a reason to return | **changed** |
| Distribution and HCS anchoring | Stretch (Tier C) | Time | **changed** |
| x402 | Not targeted | No real data provider; second signer key; time | none |
| Plan | Tiered A, B, C with a cut ladder | Deadline unverified, possibly under a day away | **changed** |
| Custom contract | None | ATS documents suffice | none |
| Payments | Simulated only | No real investment funds | none |
| Keys | Role-separated ECDSA accounts, pauser separate | Least privilege | extended |
| Tables and routes | 15 tables, 24 mutation routes | Differentiators need manifests and snapshots | **changed** |

Record any further change in docs/decisions/ with date, reason, alternatives and impact.

---

## 29. Verify before building (open items)

Not proven when V4 was written. Each is a gate checkbox; update this document with the result.

- [ ] Live submission deadline and current prize requirements, including the exact Hedera track name and video length.
- [ ] ETHGlobal's rules on pre-existing work and on submitting a project with an idea similar to earlier showcase entries.
- [ ] ATS release or commit, SDK package name and status, Node and npm versions.
- [ ] Whether ATS already provides deployed testnet addresses you can reuse.
- [ ] Asset type (equity or bond) for the rights text; exact cap, KYC and whitelist configuration steps.
- [ ] Whether the SDK can set, update and read back **multiple named documents** on one asset.
- [ ] Pause and unpause semantics: what is halted, who may call it, and **whether issuance works while paused**.
- [ ] Whether a rejected transfer leaves a failed contract-call record readable on Mirror Node.
- [ ] ECDSA account requirement and EVM address derivation.
- [ ] Contract-call and logs endpoints and rate limits for the Mirror Node and JSON-RPC relay you will use.
- [ ] Current maximum transaction valid duration (section 14.2).
- [ ] 0G Private Computer endpoint, model name, authentication format, and whether responses carry an attestation.
- [ ] Access and terms for the RBI HPI series and IGR e-ASR rates, if D6 is attempted.
- [ ] Re-run the prior-art search for events after 25 September 2026.
- [ ] Current status of DELTA (Bill, Act, rules, commencement) before any legal wording changes.

---

## 30. Official and primary references

Re-check before implementation; repositories, API docs, bounty rules and legal status change.

**Hackathon and prior art**

- ETHGlobal Mumbai prizes: https://ethglobal.com/events/mumbai/prizes
- ETHGlobal showcase dataset (used for section 1.2): https://github.com/Marcussy34/ethglobal
- Showcase pages of the closest projects: https://ethglobal.com/showcase/ownify-ho29q, https://ethglobal.com/showcase/arestate-srqfz, https://ethglobal.com/showcase/zoneproof-9iujc, https://ethglobal.com/showcase/bond-desk-1jn36, https://ethglobal.com/showcase/rehold-traxr

**Hedera and ATS**

- ATS documentation: https://docs.hedera.com/solutions/tokenization/ats
- ATS contract overview (Diamond Pattern, ERC-1400, partial ERC-3643): https://docs.tokenization-studio.hedera.com/ats/developer-guides/contracts/overview
- ATS GitHub repository: https://github.com/hashgraph/asset-tokenization-studio
- Hedera Mirror Node REST API: https://docs.hedera.com/reference/rest-api
- Hedera SDKs: https://docs.hedera.com/hedera/sdks-and-apis

**0G**

- 0G Private Computer: https://pc.0g.ai
- 0G Compute documentation: https://docs.0g.ai/developer-hub/building-on-0g/compute-network/overview
- 0G Storage SDK: https://docs.0g.ai/developer-hub/building-on-0g/storage/sdk

**India benchmarks (D6)**

- RBI All-India House Price Index, Q1 2026-27 press release: https://www.rbi.org.in/Scripts/BS\_PressReleaseDisplay.aspx?prid=63436
- RBI Database on Indian Economy: https://data.rbi.org.in/DBIE/#/dbie/home
- IGR Maharashtra (e-ASR ready reckoner rates): https://igrmaharashtra.gov.in/Home

**Maharashtra DELTA context (reporting, not the enacted text)**

- Business Standard, July 2026: https://www.business-standard.com/india-news/maharashtra-eyes-delta-act-for-blockchain-based-tokenisation-of-land-assets-126072001502\_1.html
- Business Standard, September 2026: https://www.business-standard.com/india-news/maharashtra-to-soon-bring-delta-act-to-tokenise-immovable-properties-126090901232\_1.html
- PIB, Global Fintech Fest 2026: https://www.pib.gov.in/PressReleasePage.aspx?PRID=2308027&lang=1&reg=3

**Indian legal and regulatory references**

- Transfer of Property Act, 1882: https://ldo.mohua.gov.in/administrator/storage/officedocs\_eng/The\_Transfer\_Of\_Property\_Act\_1882.pdf
- Registration Act, 1908: https://www.indiacode.nic.in/bitstream/123456789/19013/1/the\_registration\_act%2C\_1908.pdf
- SEBI SM REIT FAQ (18 June 2024): https://www.sebi.gov.in/sebi\_data/faqfiles/sep-2024/1726209828599.pdf

Obtain the official Gazette, Bill or Act text before making any legal assertion.

---

## 31. Final operating instruction

When uncertain, do not invent a capability or claim. Verify current official documentation, test the exact integration, record the evidence and update this document.

The project succeeds when a judge can independently verify: what the fictional property submission contains; what the verifier actually reviewed; which evidence root and rights hash sit on the ATS asset; which Hedera transactions occurred; what happened to the asset when the evidence changed; which verified wallet received the token; what 0G request produced the analysis; which inputs were simulated; and what happens when a critical step fails.

**Build one honest, reproducible, secure lifecycle. Do not build a larger demo that implies legal, financial or technical guarantees the system cannot prove.**
