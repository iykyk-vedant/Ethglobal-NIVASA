# M15 submission evidence decisions — 6 November 2026

## DEC-M15-01 — Duplicate detection marked N/A

- **Reason:** ARCH §22.3 classifies the duplicate-property scan flag as Tier C; no such capability is built.
- **Alternatives:** claim a pass without a feature; attempt a late feature; mark N/A.
- **Impact:** Scenario 3 is N/A; no duplicate-detection UI or control is claimed.

## DEC-M15-02 — Report current integration failures without suppressing them

- **Reason:** The M15 suite run produced 40 passing, 15 failing and 54 skipped tests. Failures include missing initialized user profiles and missing expected snapshot rows for live 0G inference; several ATS/settlement suites were skipped by environment guards.
- **Alternatives:** hide failures, report the earlier stated baseline as current proof, or preserve actual output and mark exit blocked.
- **Impact:** Adversarial report remains red; Tier A/B M15 exit is not certified. Re-run with correctly initialized disposable test data and provider state.

## DEC-M15-03 — No live demo run or recording claimed

- **Reason:** Current workspace has no attached Hedera or 0G recording, and the failed M15 run did not establish the complete eight-beat path or a resolvable live 0G request.
- **Alternatives:** stage screenshots/IDs (prohibited), omit the evidence claim, or complete a fresh live run and capture it.
- **Impact:** Video, clean-browser test, link verification, current prize/rules review and submission remain human-pending. The planned 21:15/22:30/23:00 IST milestones have elapsed according to the current clock.

## DEC-M15-04 — D6 benchmark snapshots remain unbuilt

- **Reason:** ARCH places benchmarks in Tier C; no benchmark source bundle was found among the reviewed M15 files.
- **Alternatives:** add a last-minute dataset or disclose it as not built.
- **Impact:** The evidence checklist is built; static benchmark inputs are DESIGNED-NOT-BUILT and are not used to support claims.

## DEC-M15-05 — License remains unspecified

- **Reason:** No LICENSE file or owner-approved license choice is present.
- **Alternatives:** add a permissive license without authorization or state no license grant.
- **Impact:** README says all rights reserved by default until the owner chooses a license.

## DEC-M15-06 — RLS-scoped multi-user acceptance is not certified

- **Reason:** Existing `test/m2-database.test.ts` has anonymous-client checks plus privileged database checks, but the reviewed test uses do not establish the requested two-investor/one-issuer authenticated RLS-scoped client matrix. Its concurrency case uses five one-unit calls, not the ARCH §22.1 twenty parallel reservations for the last five units.
- **Alternatives:** infer coverage from policies or prior milestone status, or record the precise gap and run the requested fixture before claiming acceptance.
- **Impact:** RLS isolation/concurrency acceptance remains incomplete for M15 despite RLS policies, atomic reservation code and existing DB tests.

## DEC-M15-07 — Removed hard-coded cron fallback

- **Reason:** The secret scan matched the configured cron credential embedded as a fallback in the worker and three tests.
- **Alternatives:** suppress the scanner or preserve the fallback, or fail closed when production configuration is absent and generate random test-only values.
- **Impact:** Production worker now requires configured `CRON_SECRET`; tests use random values if no test secret is configured. A repeat scan found no configured server-secret value in repository text or the available `.next/static` files; a successful fresh production build was not obtained.

## DEC-M15-08 — Live database security suite could not reach Supabase

- **Reason:** Direct M2 test execution failed before running any of its 20 tests because DNS resolution for the configured Supabase pooler returned `ENOTFOUND`. The adversarial API suites also received 401 responses for test identities whose profile rows were not initialized.
- **Alternatives:** treat policy files or the user's earlier 192-test summary as current M15 proof, or record the network/test-fixture blocker and leave RLS/concurrency acceptance pending.
- **Impact:** No M15 claim that authenticated RLS, two-investor/one-issuer isolation, or exact ARCH §22.1 concurrency passed. Restore DNS and initialize the disposable test identities, then rerun.

## DEC-M15-09 — Production guards now check both runtime signals — 7 November 2026

- **Reason:** `APP_ENV` defaults to `demo`; checks based only on that variable could leave a demo flag enabled when the framework runtime sets `NODE_ENV=production`. The worker also had a demo-trigger bypass that did not check the runtime.
- **Alternatives:** require deployments to set APP_ENV correctly or enforce production status in the code using both environment signals.
- **Impact:** Environment validation and all demo gates use either `APP_ENV` or `NODE_ENV`; the worker demo-trigger bypass refuses production. Added six environment tests and two focused production guard tests.

## DEC-M15-10 — Full project test run remains red — 7 November 2026

- **Reason:** `npm test` produced 17 files: 92 passed, 18 failed, 86 skipped. Database-backed suites fail or skip with unreachable DNS/uninitialized profiles; live inference lacks snapshots; an ATS restriction proof exceeded its timeout; a settlement fixture has no rights version.
- **Alternatives:** claim the earlier milestone test summary or leave the latest run visible.
- **Impact:** Project-wide test acceptance is not met; the unresolved external fixtures/network and failing integration cases need repair and rerun.

## DEC-M15-11 — Production build unavailable in this environment — 7 November 2026

- **Reason:** A clean build attempt could not resolve `fonts.googleapis.com` and Next.js failed with `EPERM` while creating nested `.next` route output directories. A single-worker retry did not remove the filesystem error, so the temporary worker limit was reverted.
- **Alternatives:** remove the selected fonts or claim a partial build succeeded, or preserve the UI fonts and report the build as unverified.
- **Impact:** No fresh production client bundle is certified. The secret scanner can inspect only the `.next/static` assets that exist after the failed build; run `npm run build` in a network-enabled environment with writable build output.
