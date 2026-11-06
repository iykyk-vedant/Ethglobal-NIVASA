# NIVASA Row Level Security (RLS) & Service-Role Audit Map

> **Reference:** Architecture V4 §17, §18 · PRD §3, §9, §11 · Milestone M2

This document specifies the exact PostgreSQL Row Level Security (RLS) policies across all 15 core MVP tables and enumerates all authorized code paths using the server-only Supabase Service-Role key.

---

## 1. Core Principles

1. **Default Deny:** Every table has RLS explicitly enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`). Tables without an applicable `USING` or `WITH CHECK` policy evaluate to `false` for unprivileged roles (`anon`, `authenticated`).
2. **Server-Only Service Role:** The service-role key bypasses RLS and is restricted exclusively to background workers, deterministic RPC execution, and server-only state management. It is never bundled into client-side code, nor used for ordinary server-component user reads.
3. **Database-Level Invariant Enforcement:** Separation of duties (SoD), state transition validation, and table immutability are enforced by PostgreSQL `BEFORE` triggers and SQL `CHECK` constraints, guaranteeing integrity even if application logic fails.
4. **No Generic Mutation Endpoints:** No client-facing endpoint can pass arbitrary columns or alter status fields without going through state machine triggers and role authorization.

---

## 2. Table-by-Table RLS Matrix

| Table | SELECT | INSERT | UPDATE | DELETE |
| :--- | :--- | :--- | :--- | :--- |
| **profiles** | Self (`auth.uid() = id`), verifiers, admin | Self on signup | Self only (`auth.uid() = id`) | Disallowed |
| **user_roles** | Self (`auth.uid() = user_id`), admin | Service-role only (`grant_role` RPC) | Service-role only (`grant_role` RPC) | Disallowed |
| **investor_eligibility** | Investor self, verifiers, admin | Investor (`status = 'pending'`) | Verifiers & admin (enforces reviewer != investor via trigger) | Disallowed |
| **properties** | Public if `status = 'verified'`; issuer for owned properties; verifiers; admin | Issuer with active `issuer` role | Issuer only when `status IN ('draft', 'needs_more_information')` | Disallowed |
| **property_documents** | Property issuer, verifiers, admin | Property issuer for owned property | Disallowed (immutable records; superseded via new rows) | Disallowed |
| **evidence_manifests** | Public if `status = 'approved'`; issuer; verifiers; admin | Issuer for owned property (`status = 'draft'`) | Verifier approval (triggers enforce SoD & immutability once approved) | Disallowed |
| **property_verifications** | All authenticated | Verifiers only (`reviewer_id = auth.uid()`, SoD enforced) | Disallowed (append-only) | Disallowed |
| **property_snapshots** | All authenticated | Verifiers & admin | Disallowed (Trigger `enforce_snapshot_immutability` blocks updates) | Disallowed (Trigger blocks deletes) |
| **offerings** | Public if `status IN ('active', 'paused', 'paused_evidence_drift', 'closed')`; issuer; verifiers; admin | Issuer with active `issuer` role | Issuer only when `status = 'draft'`; state machine governs transitions | Disallowed |
| **offering_rights** | All authenticated | Offering issuer | Disallowed (immutable versions) | Disallowed |
| **investment_orders** | Investor self (`investor_id = auth.uid()`), admin | Investor self (via `reserve_units` RPC) | Disallowed for direct client update; managed via settlement engine | Disallowed |
| **allocation_attempts** | Order investor, admin | Service-role settlement engine only | Disallowed (append-only retry history) | Disallowed |
| **outbox_jobs** | Admin only | Service-role only | Service-role only | Disallowed |
| **ai_episodes** | Episode investor, admin | Service-role only (after deterministic 0G verification) | Disallowed (append-only) | Disallowed |
| **audit_logs** | Admin only | Service-role / DB triggers via `audit_append` RPC | **REVOKED AT SQL LEVEL** (`REVOKE UPDATE, DELETE, TRUNCATE`) | **REVOKED AT SQL LEVEL** |

---

## 3. Explicit Service-Role Code Paths

The service-role key is accessed solely through `lib/db/admin.ts`. The table below lists every authorized usage:

### 3.1 `appendAuditLog(params)`
- **File:** `lib/db/admin.ts`
- **RPC:** `audit_append(...)`
- **Purpose:** Appends an entry to the tamper-evident SHA-256 hash chain inside PostgreSQL while holding an advisory transaction lock (`pg_advisory_xact_lock(1844917)`).
- **Triggered By:**
  - Investor wallet nonce verification
  - Private evidence signed-URL generation (`createSignedEvidenceUrl`)
  - Offering state transitions (pause, drift pause, resume)
  - Demo payment confirmation and fault injection

### 3.2 `reserveUnitsRpc(params)`
- **File:** `lib/db/admin.ts`
- **RPC:** `reserve_units(...)`
- **Purpose:** Atomic reservation engine taking an exclusive row lock (`FOR UPDATE`) on the `offerings` table. Validates global supply limits, per-investor caps, accredited eligibility, and wallet verification in a single atomic transaction.
- **Triggered By:** `POST /api/investments`

### 3.3 `grantUserRole(userId, role, grantedBy)`
- **File:** `lib/db/admin.ts`
- **RPC:** `grant_role(...)`
- **Purpose:** Securely assigns a system role (`issuer`, `verifier`, `investor`, `admin`) to a verified user, revoking any preexisting active instance of that role.
- **Triggered By:** `POST /api/admin/roles` (admin only) and initial seed script (`scripts/seed-database.ts`).

### 3.4 Outbox Background Worker
- **File:** `app/api/cron/worker/route.ts` (Worker engine)
- **Tables:** `outbox_jobs`, `allocation_attempts`, `investment_orders`
- **Purpose:** Polls pending jobs (Hedera token issuance, HCS anchoring, eligibility sync), executes external ledger calls, and updates job status with exponential backoff.
- **Triggered By:** Authenticated cron endpoint with `CRON_SECRET`.

### 3.5 AI Episode Archival
- **File:** `lib/ai/explanation.ts`
- **Table:** `ai_episodes`
- **Purpose:** Records complete 0G Private Computer input/output payloads, model version, benchmark snapshots, and deterministic metrics.
- **Triggered By:** `POST /api/ai/analyze-offering` and `POST /api/ai/analyze-changes`.

---

## 4. Verification & Testing

RLS isolation and policy enforcement are verified in `test/m2-database.test.ts`:
- Cross-investor read isolation: Investor B cannot view Investor A's orders or unverified profiles.
- Self-elevation rejection: User cannot grant themselves a role or approve their own manifest/offering.
- Audit chain immutability: Any attempt to execute `UPDATE audit_logs` or `DELETE FROM audit_logs` throws a database permission error.

