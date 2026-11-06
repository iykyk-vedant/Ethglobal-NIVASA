# NIVASA — Scope Record and Execution Plan

**Event:** ETHGlobal Mumbai (November 2026)  
**Product:** India-First Real-World-Asset (RWA) Lifecycle Infrastructure Prototype  
**Date of Record:** 6 November 2026  
**Status:** Frozen for Execution  

---

## 1. Authoritative Timeline and Time Budget

- **Clock Start (M0):** 02:29 IST, 6 November 2026
- **Hard Submission Deadline:** 23:00 IST, 6 November 2026
- **Hours Remaining at M0:** ~20.5 hours (20h 31m)
- **Feature Freeze Target:** 19:30 IST (~17.0 hours remaining)
- **Video Recording Window:** Starts by 21:15 IST (both Hedera and 0G videos finished by 22:00 IST)
- **Internal Submission Target:** 22:30 IST (30-minute buffer for platform/upload latency)

---

## 2. Chosen Route and Tier Allocation

Based on **PLAN §1.0** (12 – 25 hours band):
**Route: Tier A (Core) + Cheapest Differentiators**

### Milestone Time Budgets

| Milestone | Scope / Deliverable | Tier | Budget | Target Completion (IST) |
|---|---|---|---|---|
| **M0** | Scope Freeze & Repo Scaffold | A | 0.5 h | 02:45 IST |
| **M1** | ATS Go/No-Go Gate (Hedera Testnet tx proof) | A | ≤3.5 h | 06:15 IST |
| **M2** | Database, Auth, RLS, Audit Chain, Seed Data | A | 2.0 h | 08:15 IST |
| **M3** | Design System, App Shell, Trust Banners, Tokens | A | 2.0 h | 10:15 IST |
| **M4** | ATS Adapter, Wallet Binding, Eligibility Flow | A | 2.0 h | 12:15 IST |
| **M5** | Supply Reservation, Outbox Worker, Reconciliation | A | 3.0 h | 15:15 IST |
| **M6** | Investor UI, Offering Page, Restriction Proof | A | 2.0 h | 17:15 IST |
| **M7** | Minimal AI (0G Private Computer TEE Integration) | A | 1.5 h | 18:45 IST |
| **M8** | Evidence System (Maharashtra Checklist & Merkle Manifest) | B | 1.5 h | 19:30 IST *(Freeze Cutoff)* |
| **M9** | Rights + D1 Activation Gate | B | 1.0 h | If time permits before freeze |
| **M11** | D3 Public Verify Pages (Zero-PII Chain Reconciliation) | B | 1.0 h | If time permits before freeze |
| **M10** | D2 Evidence-Drift Pause/Resume | B | 1.0 h | Standby / Stretch |
| **M12** | D4 Timeout Fault Injector | B | 0.5 h | Standby / Stretch |
| **M15** | Hardening, Adversarial Suite, Videos, Submission | A/B | 3.0 h | 19:30 – 22:30 IST |

*Cut Ladder Rule:* If M1 takes >90 min on SDK, switch immediately to manual mode. If by 15:15 IST M5 is unfinished, drop Tier B items and prioritize thin-slice delivery.

---

## 3. Pinned System Versions

| Component | Pinned Version | Source / Notes |
|---|---|---|
| **Node.js** | `v22.18.0` | Active runtime (target `>=20.x`) |
| **npm** | `10.9.3` | Node package manager |
| **Next.js** | `15.0.3` | App Router, React Server Components |
| **React** | `18.3.1` | React runtime |
| **TypeScript** | `5.6.3` | Strict mode enabled |
| **Tailwind CSS** | `3.4.15` | Semantic tokens per UI §3.5 |
| **Zod** | `3.23.8` | Fail-closed runtime validation |
| **Vitest** | `2.1.4` | Unit & invariant testing |
| **Supabase Client**| `@supabase/supabase-js` `2.46.1` | DB and Auth client |
| **Icons** | `lucide-react` `0.456.0` | Semantic status & UI icons |
| **Hedera ATS** | `main` branch / `@hashgraph/sdk` `^2.54.0` | Asset Tokenization Studio |
| **0G Compute** | OpenAI-compatible REST API | 0G Private Computer endpoint |

---

## 4. Key Architectural Decisions

1. **Precedence:** ARCH > PRD > UI > PLAN.
2. **Deterministic Settlement:** Two-phase settlement with Postgres atomic `reserve_units` function, transactional outbox table, and idempotent background reconciliation worker.
3. **No Floats:** Monetary values stored as `numeric(20,2)` in Postgres and processed with arbitrary-precision decimal strings in TS (`lib/money/decimal.ts`).
4. **State Machine Integrity:** Single canonical definition in `lib/state/transitions.ts`, enforced via DB trigger.
5. **Separation of Duties:** Enforced at database level (Verifier ≠ Issuer, Proposer ≠ Approver, Uploader ≠ Resume Approver, Investor ≠ Eligibility Reviewer).
6. **Fail-Closed Security:** Unreachable chain reads return `UNAVAILABLE`. Production refuses to boot with any `DEMO_*` flags active.
7. **Trust Posture:** Non-dismissible simulation banners on every page. Forbidden terminology strictly banned.

---

## 5. Open Items Checklist (ARCH §29)

- [ ] **1. Live Submission Requirements:** Double-check ETHGlobal Mumbai live portal for exact Hedera track name, 0G requirements, and max video length. *(Human Gate)*
- [ ] **2. Prior-Art & Rules:** Verify ETHGlobal pre-existing work rules and originality compliance.
- [x] **3. ATS Pinned Commit:** Pinned `@hashgraph/asset-tokenization-contracts@^8.0.0` and `@hashgraph/sdk@^2.81.0`. Deployed on Testnet via official Factory `0.0.9213391` / Resolver `0.0.9212226`.
- [x] **4. Deployed Testnet Addresses:** Reused official Factory v8 `0.0.9213391` and Resolver `0.0.9212226`. Asset Diamond deployed at `0.0.11330441` (`0x52ed835e649a4b045a21bc5e240623d8a77f73ef`).
- [x] **5. Asset Restrictions:** KYC enabled (`internalKycActivated: true`), cap = 10,000 units, transfer restrictions verified.
- [x] **6. Document Management:** Proved `"rights"` and `"evidence-manifest"` storage on `DocumentationFacet`. Proved overwrite updates hash and timestamp.
- [x] **7. Pause Semantics:** Proved pause halts BOTH secondary transfers AND primary issuance via `onlyUnpaused`. Unpause restores operations cleanly.
- [x] **8. Rejection Proof:** Proved un-registered investor transfer fails with `InvalidKycStatus()` (`0xfc855b1b`). Failure record queryable on Mirror Node.
- [x] **9. ECDSA Key Requirements:** All 6 accounts funded with `ECDSA_SECP256K1` keys; EVM long-zero addressing documented for contract interactions.
- [x] **10. Rate Limits:** Documented Mirror Node (~100 req/s) and Hashio Relay (100 req/10s).
- [x] **11. Transaction Duration:** Confirmed max valid duration is 180s on Hedera Testnet.
- [ ] **12. 0G Compute Endpoint:** Confirm active 0G model name, auth header format, and attestation payload.
- [ ] **13. Maharashtra Benchmarks:** Confirm availability of local data (Ready Reckoner / RBI HPI) for Tier C / D6.
- [ ] **14. Recent Showcase Check:** Re-check showcase entries for real estate tokenization prototypes.
- [ ] **15. Legal Wording:** Ensure Maharashtra DELTA framing is clearly cited as a proposed draft framework.

