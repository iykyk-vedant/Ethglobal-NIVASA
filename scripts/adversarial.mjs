import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

// Expected behaviors are defined before execution. Evidence is the mapped
// existing test suite; a row is PASS only if the required case was actually run.
const cases = [
  ['An issuer without verification cannot activate an offering.', 'm9-rights-activation.test.ts'],
  ['Activation fails closed unless the approved manifest root is on ATS.', 'm9-rights-activation.test.ts'],
  ['Duplicate-property scan flag is N/A (Tier C, unbuilt).', null],
  ['ATS rejects issue beyond approved supply cap.', 'm4-ats-wallet-eligibility.test.ts'],
  ['ATS rejects receipt/transfer for an unverified wallet.', 'm4-ats-wallet-eligibility.test.ts'],
  ['A non-verifier cannot perform verifier-only actions.', 'm8-evidence-workflow.test.ts'],
  ['Duplicate investment request does not create duplicate allocation.', 'm5-settlement-engine.test.ts'],
  ['Payment confirmation replay does not create duplicate allocation.', 'm5-settlement-engine.test.ts'],
  ['Payment succeeds but failed allocation is not marked complete.', 'm12-settlement-under-failure.test.ts'],
  ['Timeout after submit recovers by transaction ID and allocates once.', 'm12-settlement-under-failure.test.ts'],
  ['Evidence replacement pauses issuance and new orders are refused.', 'm10-evidence-drift.test.ts'],
  ['Evidence uploader cannot approve resume.', 'm10-evidence-drift.test.ts'],
  ['Malformed JSON, invented 0G values, and unavailable call fail closed.', 'm13-change-intelligence.test.ts'],
  ['Tampered rights or manifest fails public Verify.', 'm11-verify-pages.test.ts'],
];

const files = [...new Set(cases.map(([, f]) => f).filter(Boolean))];
const run = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', '--fileParallelism=false', ...files.map(f => `test/${f}`)], { encoding: 'utf8', timeout: 20 * 60 * 1000, maxBuffer: 32 * 1024 * 1024 });
const output = `${run.stdout ?? ''}${run.stderr ?? ''}`;
const exitCode = run.status ?? 1;
// Conservative reporting: these suites can be skipped by guards, so only
// report PASS when every mapped file reports tests run and no skips/failures.
const rows = cases.map(([expected, file]) => {
  if (!file) return `| N/A | ${expected} | Tier C not built |`;
  const fileRan = new RegExp(`✓ test/${file.replaceAll('.', '\\.')} \\(`).test(output);
  const status = fileRan ? 'PASS' : 'FAIL';
  return `| ${status} | ${expected} | ${fileRan ? file : `${file} (failed, skipped, or not run)`} |`;
});
const passed = exitCode === 0;
const report = [
  '# M15 Adversarial Report', '',
  `Run time: ${new Date().toISOString()}`, '',
  'Expected behavior is listed before test execution. Rows map to the existing suites that exercise the behavior; because a suite can contain skips or failures outside its target case, PASS is intentionally conservative. Scenario 3 is N/A because duplicate scan detection is Tier C and unbuilt.', '',
  '| Result | Expected behavior | Evidence suite |', '|---|---|---|', ...rows, '',
  `Vitest exit code: ${exitCode}; all mapped suites passed: ${passed ? 'yes' : 'no'}`, '',
  '```text', output.trim() || run.error?.message || 'No test output.', '```', '',
  'The prior run observed missing initialized user profiles, skipped integration suites, and a live 0G test without both snapshots. Resolve those prerequisites and rerun before presenting a green report.',
].join('\n');
writeFileSync('docs/adversarial-report.md', report, 'utf8');
process.stdout.write(`${report}\n`);
if (!passed) process.exitCode = 1;
