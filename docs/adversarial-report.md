# M15 Adversarial Report

Run time: 2026-11-06T18:48:46.059Z

Expected behavior is listed before test execution. Rows map to the existing suites that exercise the behavior; because a suite can contain skips or failures outside its target case, PASS is intentionally conservative. Scenario 3 is N/A because duplicate scan detection is Tier C and unbuilt.

| Result | Expected behavior | Evidence suite |
|---|---|---|
| FAIL | An issuer without verification cannot activate an offering. | m9-rights-activation.test.ts (failed, skipped, or not run) |
| FAIL | Activation fails closed unless the approved manifest root is on ATS. | m9-rights-activation.test.ts (failed, skipped, or not run) |
| N/A | Duplicate-property scan flag is N/A (Tier C, unbuilt). | Tier C not built |
| FAIL | ATS rejects issue beyond approved supply cap. | m4-ats-wallet-eligibility.test.ts (failed, skipped, or not run) |
| FAIL | ATS rejects receipt/transfer for an unverified wallet. | m4-ats-wallet-eligibility.test.ts (failed, skipped, or not run) |
| FAIL | A non-verifier cannot perform verifier-only actions. | m8-evidence-workflow.test.ts (failed, skipped, or not run) |
| FAIL | Duplicate investment request does not create duplicate allocation. | m5-settlement-engine.test.ts (failed, skipped, or not run) |
| FAIL | Payment confirmation replay does not create duplicate allocation. | m5-settlement-engine.test.ts (failed, skipped, or not run) |
| FAIL | Payment succeeds but failed allocation is not marked complete. | m12-settlement-under-failure.test.ts (failed, skipped, or not run) |
| FAIL | Timeout after submit recovers by transaction ID and allocates once. | m12-settlement-under-failure.test.ts (failed, skipped, or not run) |
| FAIL | Evidence replacement pauses issuance and new orders are refused. | m10-evidence-drift.test.ts (failed, skipped, or not run) |
| FAIL | Evidence uploader cannot approve resume. | m10-evidence-drift.test.ts (failed, skipped, or not run) |
| FAIL | Malformed JSON, invented 0G values, and unavailable call fail closed. | m13-change-intelligence.test.ts (failed, skipped, or not run) |
| FAIL | Tampered rights or manifest fails public Verify. | m11-verify-pages.test.ts (failed, skipped, or not run) |

Vitest exit code: 1; all mapped suites passed: no

```text
[1m[7m[36m RUN [39m[27m[22m [36mv2.1.9 [39m[90mD:/Ethglobal[39m

 [31m❯[39m test/m5-settlement-engine.test.ts [2m([22m[2m13 tests[22m[2m | [22m[31m2 failed[39m[2m)[22m[33m 34593[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M5: Settlement Engine & Recovery[2m > [22m1. Order Reservation & Acknowledgement Verification (POST /api/investments)[2m > [22mrequires Idempotency-Key header [33m407[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M5: Settlement Engine & Recovery[2m > [22m1. Order Reservation & Acknowledgement Verification (POST /api/investments)[2m > [22mrejects order if acknowledgement terms differ from DB values [33m905[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M5: Settlement Engine & Recovery[2m > [22m1. Order Reservation & Acknowledgement Verification (POST /api/investments)[2m > [22mrejects order if signature does not match bound wallet [33m927[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M5: Settlement Engine & Recovery[2m > [22m1. Order Reservation & Acknowledgement Verification (POST /api/investments)[2m > [22msuccessfully reserves units with valid signature and terms [33m3025[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M5: Settlement Engine & Recovery[2m > [22m2. Offering Pause & Restriction Guardrails (ARCH §17.4)[2m > [22mrefuses reservation when offering is paused_evidence_drift with OFFERING_PAUSED_EVIDENCE [33m853[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M5: Settlement Engine & Recovery[2m > [22m2. Offering Pause & Restriction Guardrails (ARCH §17.4)[2m > [22mrefuses reservation when offering is not active with OFFERING_NOT_ACTIVE [33m828[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M5: Settlement Engine & Recovery[2m > [22m3. Simulated Payment Confirmation & Outbox Trigger (POST /api/demo/payment-confirmation)[2m > [22mrefuses payment confirmation from non-admin role [33m1993[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M5: Settlement Engine & Recovery[2m > [22m3. Simulated Payment Confirmation & Outbox Trigger (POST /api/demo/payment-confirmation)[2m > [22mmoves order to PAYMENT_CONFIRMED and trigger automatically inserts allocate_units job [33m2364[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M5: Settlement Engine & Recovery[2m > [22m3. Simulated Payment Confirmation & Outbox Trigger (POST /api/demo/payment-confirmation)[2m > [22mreplaying payment confirmation is idempotent and does not create extra jobs [33m2763[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M5: Settlement Engine & Recovery[2m > [22m4. Allocation, Outbox Worker & Hedera Reconciliation[2m > [22menforces DB constraint: at most one confirmed allocation attempt per order [33m2910[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M5: Settlement Engine & Recovery[2m > [22m4. Allocation, Outbox Worker & Hedera Reconciliation[2m > [22mfails closed to MANUAL_REVIEW if investor eligibility was revoked before allocation [33m4301[2mms[22m[39m
[31m   [31m×[31m Milestone M5: Settlement Engine & Recovery[2m > [22m4. Allocation, Outbox Worker & Hedera Reconciliation[2m > [22mhandles simulated timeout after submit: confirms via Mirror Node without double allocation[33m 6526[2mms[22m[31m[39m
[31m     → expected 'unknown' to be 'injected_timeout' // Object.is equality[39m
[31m   [31m×[31m Milestone M5: Settlement Engine & Recovery[2m > [22m4. Allocation, Outbox Worker & Hedera Reconciliation[2m > [22mend-to-end: executes worker, issues units on Hedera Testnet, reconciles, and reaches COMPLETED[33m 5995[2mms[22m[31m[39m
[31m     → expected false to be true // Object.is equality[39m
 [32m✓[39m test/m11-verify-pages.test.ts [2m([22m[2m20 tests[22m[2m)[22m[90m 67[2mms[22m[39m
 [32m✓[39m test/m8-evidence-workflow.test.ts [2m([22m[2m21 tests[22m[2m)[22m[33m 9887[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M8: Real Evidence Workflow & Merkle Manifests[2m > [22m3. Server-side SHA-256 & Storage Security[2m > [22mcomputes exact SHA-256 server-side over bytes regardless of client claims [33m584[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M8: Real Evidence Workflow & Merkle Manifests[2m > [22m4. API Endpoints & Separation of Duties (SoD) Invariant[2m > [22mIssuer creates draft property submission via POST /api/properties [33m590[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M8: Real Evidence Workflow & Merkle Manifests[2m > [22m4. API Endpoints & Separation of Duties (SoD) Invariant[2m > [22mIssuer uploads document via POST /api/properties/:id/documents [33m1800[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M8: Real Evidence Workflow & Merkle Manifests[2m > [22m4. API Endpoints & Separation of Duties (SoD) Invariant[2m > [22mIssuer submits manifest via POST /api/properties/:id/submit -> generates Manifest v1 [33m1687[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M8: Real Evidence Workflow & Merkle Manifests[2m > [22m4. API Endpoints & Separation of Duties (SoD) Invariant[2m > [22mSECURITY INVARIANT (SoD): Property issuer is STRICTLY FORBIDDEN from verifying own property [33m726[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M8: Real Evidence Workflow & Merkle Manifests[2m > [22m4. API Endpoints & Separation of Duties (SoD) Invariant[2m > [22mSECURITY: Non-verifier user (investor) cannot record verification decisions [33m389[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M8: Real Evidence Workflow & Merkle Manifests[2m > [22m4. API Endpoints & Separation of Duties (SoD) Invariant[2m > [22mVALIDATION: Rejects verification decision without substantive rationale (< 10 chars) [33m375[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M8: Real Evidence Workflow & Merkle Manifests[2m > [22m4. API Endpoints & Separation of Duties (SoD) Invariant[2m > [22mSUCCESS: Independent verifier approves Manifest v1 with valid justification [33m1881[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M8: Real Evidence Workflow & Merkle Manifests[2m > [22m4. API Endpoints & Separation of Duties (SoD) Invariant[2m > [22mIMMUTABILITY: Approved manifest cannot be re-verified or mutated [33m540[2mms[22m[39m
 [31m❯[39m test/m12-settlement-under-failure.test.ts [2m([22m[2m7 tests[22m[2m | [22m[31m3 failed[39m[2m)[22m[33m 28488[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M12: D4 Settlement Under Failure & Fault Injector[2m > [22m1. Environment & Authorization Guardrails (POST /api/demo/faults)[2m > [22mrefuses fault arming from non-admin role with FORBIDDEN (403) [33m835[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M12: D4 Settlement Under Failure & Fault Injector[2m > [22m1. Environment & Authorization Guardrails (POST /api/demo/faults)[2m > [22mstrictly refuses when DEMO_FAULTS=false or APP_ENV=production (FLAG_DISABLED 403) [33m323[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M12: D4 Settlement Under Failure & Fault Injector[2m > [22m1. Environment & Authorization Guardrails (POST /api/demo/faults)[2m > [22mrejects arming without a substantive reason (< 5 characters) [33m339[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M12: D4 Settlement Under Failure & Fault Injector[2m > [22m2. Fault Arming, Consumption & Audit Log Trail[2m > [22marms a fault, writes to demo_fault_injections, and records fault_injection_armed in audit_logs [33m1933[2mms[22m[39m
[31m   [31m×[31m Milestone M12: D4 Settlement Under Failure & Fault Injector[2m > [22m3. Armed timeout_after_submit: Consensus Recovery & Assertion Panel (Exit Condition)[2m > [22mwith timeout_after_submit armed, worker recovers from stored tx ID via Mirror Node, exactly one allocation confirms, assertions pass[33m 7220[2mms[22m[31m[39m
[31m     → expected 'unknown' to be 'injected_timeout' // Object.is equality[39m
[31m   [31m×[31m Milestone M12: D4 Settlement Under Failure & Fault Injector[2m > [22m4. Armed fail_before_submit: Sequential Attempt Retry (ARCH §14.2)[2m > [22mwith fail_before_submit armed, attempt #1 fails before submit; worker creates attempt #2 with new tx ID and succeeds[33m 9665[2mms[22m[31m[39m
[31m     → expected false to be true // Object.is equality[39m
[31m   [31m×[31m Milestone M12: D4 Settlement Under Failure & Fault Injector[2m > [22m5. Duplicate Outbox Job Interception (ARCH §14.3)[2m > [22mintercepts duplicate allocate_units job enqueue; dedupe key yields strictly ONE execution[33m 7233[2mms[22m[31m[39m
[31m     → expected false to be true // Object.is equality[39m
[90mstdout[2m | test/m13-change-intelligence.test.ts[2m > [22m[2mMilestone M13: D5 Change Intelligence & 0G Verification[2m > [22m[2m5. Real 0G Private Computer Change Intelligence Call (Exit Condition)[2m > [22m[2mexecutes live 0G inference, validates output, and records real request ID
[22m[39m
======================================================
REAL 0G PRIVATE COMPUTER CHANGE INTELLIGENCE:
Status: Available
0G Request ID: e5c463e071fb7ae9, 37d5f58d-6caf-409a-bc1a-19de2fc648bc
Model: qwen-flash
Input Hash: 18b6c2ff8165ad9b28afa918cb61d90fbaae970bbb56c01bef2d6201afe6c63a
Output Hash: d826c769537421989e7009aefb099ed5fb54cd5d4b3933e57a420d486c83385f
Validated Summary: The property's valuation decreased from 240,000,000.00 to 105,000,000.00, occupancy dropped from 94.50% to 85.00%, and annual rent declined from 21,600,000.00 to 6,800,000.00, indicating a significant weakening in income-generating capacity. Operating costs improved from 3,240,000.00 to 1,600,000.00, while evidence freshness improved from 35 days to 5 days. The net operating income weakened from 18,360,000.00 to 5,200,000.00, and yield metrics (gross and net) declined accordingly.
Preference Fit: partial_match
Changes Explained: [33m4[39m
Cited Source IDs: [ [32m'doc-title-001'[39m, [32m'doc-val-rep-001'[39m, [32m'doc-khata-001'[39m, [32m'doc-tax-001'[39m ]
======================================================


 [32m✓[39m test/m13-change-intelligence.test.ts [2m([22m[2m14 tests[22m[2m)[22m[33m 18530[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M13: D5 Change Intelligence & 0G Verification[2m > [22m3. Scripted Property Event Endpoint (POST /api/demo/property-event)[2m > [22mrefuses execution from non-admin role with FORBIDDEN (403) [33m407[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M13: D5 Change Intelligence & 0G Verification[2m > [22m3. Scripted Property Event Endpoint (POST /api/demo/property-event)[2m > [22mappends a simulated snapshot row #2 and records property_event_applied in audit_logs [33m1598[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M13: D5 Change Intelligence & 0G Verification[2m > [22m4. Security Invariant: AI Route Cannot Trigger Chain Mutations[2m > [22mverifies that calling change intelligence leaves on-chain ATS state and supply completely untouched [33m8362[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M13: D5 Change Intelligence & 0G Verification[2m > [22m5. Real 0G Private Computer Change Intelligence Call (Exit Condition)[2m > [22mexecutes live 0G inference, validates output, and records real request ID [33m6500[2mms[22m[39m
 [32m✓[39m test/m4-ats-wallet-eligibility.test.ts [2m([22m[2m13 tests[22m[2m)[22m[33m 26921[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M4: ATS Adapter, Wallet Binding, Eligibility & Worker Sync[2m > [22m1. Wallet Nonce Generation (POST /api/wallet/nonce)[2m > [22mgenerates a crypto-secure random nonce with >= 16 bytes and ~10 min expiry [33m473[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M4: ATS Adapter, Wallet Binding, Eligibility & Worker Sync[2m > [22m2. Wallet Verification & Signature Recovery (POST /api/wallet/verify)[2m > [22mrejects verification if signature was generated from a different address [33m822[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M4: ATS Adapter, Wallet Binding, Eligibility & Worker Sync[2m > [22m2. Wallet Verification & Signature Recovery (POST /api/wallet/verify)[2m > [22mrejects expired nonces [33m530[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M4: ATS Adapter, Wallet Binding, Eligibility & Worker Sync[2m > [22m2. Wallet Verification & Signature Recovery (POST /api/wallet/verify)[2m > [22msuccessfully verifies valid signature, consumes nonce, and commits bound wallet [33m1520[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M4: ATS Adapter, Wallet Binding, Eligibility & Worker Sync[2m > [22m2. Wallet Verification & Signature Recovery (POST /api/wallet/verify)[2m > [22mrejects replaying the same nonce (single-use enforcement) [33m391[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M4: ATS Adapter, Wallet Binding, Eligibility & Worker Sync[2m > [22m2. Wallet Verification & Signature Recovery (POST /api/wallet/verify)[2m > [22mprevents a second user from claiming an already bound wallet address [33m950[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M4: ATS Adapter, Wallet Binding, Eligibility & Worker Sync[2m > [22m3. Separation of Duties (SoD) & Eligibility Review (POST /api/eligibility/*)[2m > [22mallows verified investor to submit accreditation request [33m953[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M4: ATS Adapter, Wallet Binding, Eligibility & Worker Sync[2m > [22m3. Separation of Duties (SoD) & Eligibility Review (POST /api/eligibility/*)[2m > [22mstrictly rejects self-review (investor cannot approve own eligibility) [33m398[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M4: ATS Adapter, Wallet Binding, Eligibility & Worker Sync[2m > [22m3. Separation of Duties (SoD) & Eligibility Review (POST /api/eligibility/*)[2m > [22mallows independent verifier to approve eligibility and enqueues sync_eligibility job [33m1250[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M4: ATS Adapter, Wallet Binding, Eligibility & Worker Sync[2m > [22m4. Idempotent Hedera Chain Sync & Outbox Worker[2m > [22mexecutes sync_eligibility worker and handles duplicate runs idempotently [33m1454[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M4: ATS Adapter, Wallet Binding, Eligibility & Worker Sync[2m > [22m4. Idempotent Hedera Chain Sync & Outbox Worker[2m > [22mprotects the worker cron route with CRON_SECRET and bounded execution [33m16772[2mms[22m[39m
 [32m✓[39m test/m9-rights-activation.test.ts [2m([22m[2m10 tests[22m[2m)[22m[33m 20198[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M9: Rights & D1 Activation Gate (Evidence-Gated Issuance)[2m > [22mrejects offering proposal when property is not verified or manifest is unapproved [33m722[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M9: Rights & D1 Activation Gate (Evidence-Gated Issuance)[2m > [22msuccessfully proposes offering for verified property with approved manifest [33m998[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M9: Rights & D1 Activation Gate (Evidence-Gated Issuance)[2m > [22madds versioned rights document with deterministic SHA-256 hash [33m1457[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M9: Rights & D1 Activation Gate (Evidence-Gated Issuance)[2m > [22mstrictly enforces SoD: Proposer cannot approve their own offering [33m393[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M9: Rights & D1 Activation Gate (Evidence-Gated Issuance)[2m > [22mallows independent verifier to approve offering for demo [33m1123[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M9: Rights & D1 Activation Gate (Evidence-Gated Issuance)[2m > [22mconfigures ATS token parameters and computes configuration_hash [33m953[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M9: Rights & D1 Activation Gate (Evidence-Gated Issuance)[2m > [22menqueues D1 gate outbox jobs without making inline chain calls; offering stays token_configured [33m1916[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M9: Rights & D1 Activation Gate (Evidence-Gated Issuance)[2m > [22mverify_activation fails closed when on-chain document hashes do not match DB [33m1873[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M9: Rights & D1 Activation Gate (Evidence-Gated Issuance)[2m > [22mexecutes real on-chain document anchoring for rights and manifest on Hedera Testnet [33m5659[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M9: Rights & D1 Activation Gate (Evidence-Gated Issuance)[2m > [22mverify_activation succeeds when on-chain documents match and marks offering active [33m1983[2mms[22m[39m
[90mstdout[2m | test/m10-evidence-drift.test.ts[2m > [22m[2mMilestone M10: D2 Evidence-Drift Protocol & Asset Pause/Resume[2m > [22m[2m3. Job pause_asset: worker pauses ATS asset on Hedera Testnet and reads isPaused back as true
[22m[39mReal Hedera Asset Pause Tx ID: 0.0.11330245@1793990892.085864359

[90mstdout[2m | test/m10-evidence-drift.test.ts[2m > [22m[2mMilestone M10: D2 Evidence-Drift Protocol & Asset Pause/Resume[2m > [22m[2m10. Resume lifecycle: verifier resumes offering, jobs anchor new root, unpause asset on Hedera, verify_activation confirms isPaused=false and sets active
[22m[39mReal Hedera Asset Unpause Tx ID: 0.0.11330245@1793990908.500139046

[90mstdout[2m | test/m10-evidence-drift.test.ts[2m > [22m[2mMilestone M10: D2 Evidence-Drift Protocol & Asset Pause/Resume[2m > [22m[2m10. Resume lifecycle: verifier resumes offering, jobs anchor new root, unpause asset on Hedera, verify_activation confirms isPaused=false and sets active
[22m[39mReal Hedera New Manifest Root Anchor Tx ID: 0.0.11330244@1793990913.877617660

 [32m✓[39m test/m10-evidence-drift.test.ts [2m([22m[2m11 tests[22m[2m)[22m[33m 36150[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M10: D2 Evidence-Drift Protocol & Asset Pause/Resume[2m > [22m1. Trigger T1: uploading a document after approval triggers evidence drift and enqueues job [33m2059[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M10: D2 Evidence-Drift Protocol & Asset Pause/Resume[2m > [22m2. Job evidence_drift: builds manifest n+1 as submitted, marks current manifest superseded-pending, and moves offering to paused_evidence_drift [33m2493[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M10: D2 Evidence-Drift Protocol & Asset Pause/Resume[2m > [22m3. Job pause_asset: worker pauses ATS asset on Hedera Testnet and reads isPaused back as true [33m5913[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M10: D2 Evidence-Drift Protocol & Asset Pause/Resume[2m > [22m5. In-flight unsubmitted orders transition to MANUAL_REVIEW when processed while offering is paused [33m2500[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M10: D2 Evidence-Drift Protocol & Asset Pause/Resume[2m > [22m6. Idempotency Invariant: same drift event processed twice creates ONE manifest version and ONE pause [33m1133[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M10: D2 Evidence-Drift Protocol & Asset Pause/Resume[2m > [22m7. Separation of Duties (Adversarial 12): Resume attempted by the evidence uploader is strictly refused with SOD_VIOLATION (403) [33m380[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M10: D2 Evidence-Drift Protocol & Asset Pause/Resume[2m > [22m8. Resume is refused before an approved manifest exists (MANIFEST_NOT_APPROVED 400) [33m586[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M10: D2 Evidence-Drift Protocol & Asset Pause/Resume[2m > [22m9. Re-review by independent verifier: approves Manifest v2, superseding previous manifests [33m2255[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M10: D2 Evidence-Drift Protocol & Asset Pause/Resume[2m > [22m10. Resume lifecycle: verifier resumes offering, jobs anchor new root, unpause asset on Hedera, verify_activation confirms isPaused=false and sets active [33m14104[2mms[22m[39m
   [33m[2m✓[22m[39m Milestone M10: D2 Evidence-Drift Protocol & Asset Pause/Resume[2m > [22m11. Job integrity_check: successfully runs and evaluates manifests for T2/T3 triggers [33m713[2mms[22m[39m

[2m Test Files [22m [1m[31m2 failed[39m[22m[2m | [22m[1m[32m6 passed[39m[22m[90m (8)[39m
[2m      Tests [22m [1m[31m5 failed[39m[22m[2m | [22m[1m[32m104 passed[39m[22m[90m (109)[39m
[2m   Start at [22m 00:15:37
[2m   Duration [22m 188.38s[2m (transform 539ms, setup 45ms, collect 11.41s, tests 174.83s, environment 1ms, prepare 574ms)[22m

[33mThe CJS build of Vite's Node API is deprecated. See https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated for more details.[39m
[31m⎯⎯⎯⎯⎯⎯⎯[1m[7m Failed Tests 5 [27m[22m⎯⎯⎯⎯⎯⎯⎯[39m

[31m[1m[7m FAIL [27m[22m[39m test/m12-settlement-under-failure.test.ts[2m > [22mMilestone M12: D4 Settlement Under Failure & Fault Injector[2m > [22m3. Armed timeout_after_submit: Consensus Recovery & Assertion Panel (Exit Condition)[2m > [22mwith timeout_after_submit armed, worker recovers from stored tx ID via Mirror Node, exactly one allocation confirms, assertions pass
[31m[1mAssertionError[22m: expected 'unknown' to be 'injected_timeout' // Object.is equality[39m

Expected: [32m"injected_timeout"[39m
Received: [31m"unknown"[39m

[36m [2m❯[22m test/m12-settlement-under-failure.test.ts:[2m347:27[22m[39m
    [90m345| [39m      [90m// 2. First worker execution: submits to Hedera, fault is consum[39m…
    [90m346| [39m      [35mconst[39m run1 [33m=[39m [35mawait[39m [34mprocessAllocateUnits[39m({ orderId })[33m;[39m
    [90m347| [39m      [34mexpect[39m(run1[33m.[39maction)[33m.[39m[34mtoBe[39m([32m'injected_timeout'[39m)[33m;[39m
    [90m   | [39m                          [31m^[39m
    [90m348| [39m      [34mexpect[39m(run1[33m.[39mtxId)[33m.[39m[34mtoBeDefined[39m()[33m;[39m
    [90m349| [39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/5]⎯[22m[39m

[31m[1m[7m FAIL [27m[22m[39m test/m12-settlement-under-failure.test.ts[2m > [22mMilestone M12: D4 Settlement Under Failure & Fault Injector[2m > [22m4. Armed fail_before_submit: Sequential Attempt Retry (ARCH §14.2)[2m > [22mwith fail_before_submit armed, attempt #1 fails before submit; worker creates attempt #2 with new tx ID and succeeds
[31m[1mAssertionError[22m: expected false to be true // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- true[39m
[31m+ false[39m

[36m [2m❯[22m test/m12-settlement-under-failure.test.ts:[2m435:28[22m[39m
    [90m433| [39m      [90m// 3. Second worker execution (Retry): creates Attempt #2 with N[39m…
    [90m434| [39m      [35mconst[39m run2 [33m=[39m [35mawait[39m [34mprocessAllocateUnits[39m({ orderId })[33m;[39m
    [90m435| [39m      [34mexpect[39m(run2[33m.[39msuccess)[33m.[39m[34mtoBe[39m([35mtrue[39m)[33m;[39m
    [90m   | [39m                           [31m^[39m
    [90m436| [39m      [34mexpect[39m(run2[33m.[39maction)[33m.[39m[34mtoBe[39m([32m'confirmed'[39m)[33m;[39m
    [90m437| [39m      [34mexpect[39m(run2[33m.[39mtxId)[33m.[39m[34mtoBeDefined[39m()[33m;[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/5]⎯[22m[39m

[31m[1m[7m FAIL [27m[22m[39m test/m12-settlement-under-failure.test.ts[2m > [22mMilestone M12: D4 Settlement Under Failure & Fault Injector[2m > [22m5. Duplicate Outbox Job Interception (ARCH §14.3)[2m > [22mintercepts duplicate allocate_units job enqueue; dedupe key yields strictly ONE execution
[31m[1mAssertionError[22m: expected false to be true // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- true[39m
[31m+ false[39m

[36m [2m❯[22m test/m12-settlement-under-failure.test.ts:[2m505:29[22m[39m
    [90m503| [39m      [90m// Execute worker once[39m
    [90m504| [39m      [35mconst[39m alloc [33m=[39m [35mawait[39m [34mprocessAllocateUnits[39m({ orderId })[33m;[39m
    [90m505| [39m      [34mexpect[39m(alloc[33m.[39msuccess)[33m.[39m[34mtoBe[39m([35mtrue[39m)[33m;[39m
    [90m   | [39m                            [31m^[39m
    [90m506| [39m
    [90m507| [39m      [90m// Execute worker second time (replay)[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/5]⎯[22m[39m

[31m[1m[7m FAIL [27m[22m[39m test/m5-settlement-engine.test.ts[2m > [22mMilestone M5: Settlement Engine & Recovery[2m > [22m4. Allocation, Outbox Worker & Hedera Reconciliation[2m > [22mhandles simulated timeout after submit: confirms via Mirror Node without double allocation
[31m[1mAssertionError[22m: expected 'unknown' to be 'injected_timeout' // Object.is equality[39m

Expected: [32m"injected_timeout"[39m
Received: [31m"unknown"[39m

[36m [2m❯[22m test/m5-settlement-engine.test.ts:[2m644:34[22m[39m
    [90m642| [39m        injectedFault[33m:[39m [32m'timeout_after_submit'[39m[33m,[39m
    [90m643| [39m      })[33m;[39m
    [90m644| [39m      [34mexpect[39m(faultResult[33m.[39maction)[33m.[39m[34mtoBe[39m([32m'injected_timeout'[39m)[33m;[39m
    [90m   | [39m                                 [31m^[39m
    [90m645| [39m
    [90m646| [39m      [90m// Verify attempt was persisted with status = 'unknown'[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/5]⎯[22m[39m

[31m[1m[7m FAIL [27m[22m[39m test/m5-settlement-engine.test.ts[2m > [22mMilestone M5: Settlement Engine & Recovery[2m > [22m4. Allocation, Outbox Worker & Hedera Reconciliation[2m > [22mend-to-end: executes worker, issues units on Hedera Testnet, reconciles, and reaches COMPLETED
[31m[1mAssertionError[22m: expected false to be true // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- true[39m
[31m+ false[39m

[36m [2m❯[22m test/m5-settlement-engine.test.ts:[2m678:35[22m[39m
    [90m676| [39m      [90m// 1. Process allocate_units[39m
    [90m677| [39m      [35mconst[39m allocResult [33m=[39m [35mawait[39m [34mprocessAllocateUnits[39m({ orderId[33m:[39m orderT…
    [90m678| [39m      [34mexpect[39m(allocResult[33m.[39msuccess)[33m.[39m[34mtoBe[39m([35mtrue[39m)[33m;[39m
    [90m   | [39m                                  [31m^[39m
    [90m679| [39m      [34mexpect[39m(allocResult[33m.[39maction)[33m.[39m[34mtoBe[39m([32m'confirmed'[39m)[33m;[39m
    [90m680| [39m      [34mexpect[39m(allocResult[33m.[39mtxId)[33m.[39m[34mtoBeDefined[39m()[33m;[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/5]⎯[22m[39m
```

The prior run observed missing initialized user profiles, skipped integration suites, and a live 0G test without both snapshots. Resolve those prerequisites and rerun before presenting a green report.