import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const publicPrivilegedName = /NEXT_PUBLIC_[A-Z0-9_]*(?:SERVICE_ROLE|PRIVATE_KEY|SIGNER|OG_API_KEY|CRON_SECRET)/i;
const privateNames = [
  'SUPABASE_SERVICE_ROLE_KEY', 'CRON_SECRET', 'PARCEL_HMAC_SECRET', 'OG_API_KEY', 'OG_STORAGE_PRIVATE_KEY',
  'HEDERA_DEPLOYER_PRIVATE_KEY', 'HEDERA_ISSUER_AGENT_PRIVATE_KEY', 'HEDERA_COMPLIANCE_PRIVATE_KEY',
  'HEDERA_PAUSER_PRIVATE_KEY', 'HEDERA_INVESTOR_ELIGIBLE_PRIVATE_KEY', 'HEDERA_INVESTOR_INELIGIBLE_PRIVATE_KEY',
];
const likelySecretPatterns = [
  { kind: 'credential assignment', re: /\b(?:[A-Z0-9_]*(?:PRIVATE_KEY|SERVICE_ROLE_KEY|SECRET|API_KEY)|privateKey|apiKey|secretToken)\s*[:=]\s*['"`]([A-Za-z0-9_./+=:-]{16,})['"`]/i },
  { kind: 'GitHub token', re: /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/ },
  { kind: 'Slack token', re: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
  { kind: 'secret API token', re: /\bsk-(?:live|test)-[A-Za-z0-9]{16,}\b/ },
  { kind: 'JWT credential', re: /\beyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/ },
];
const secrets = new Map();
for (const envFile of ['.env', '.env.local']) {
  try {
    for (const line of readFileSync(path.join(root, envFile), 'utf8').split(/\r?\n/)) {
      const at = line.indexOf('=');
      if (at < 1) continue;
      const name = line.slice(0, at).trim();
      const value = line.slice(at + 1).trim().replace(/^['"]|['"]$/g, '');
      if (privateNames.includes(name) && value.length >= 8) secrets.set(name, value);
    }
  } catch {}
}

const sourceFiles = [];
const bundleFiles = [];
function walk(dir, output, skipDirs = new Set()) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    const rel = path.relative(root, full);
    let info;
    try { info = lstatSync(full); } catch { continue; }
    if (info.isSymbolicLink()) continue;
    if (info.isDirectory()) {
      if (!skipDirs.has(entry)) walk(full, output, skipDirs);
      continue;
    }
    if (/^\.env(?:\..+)?$/i.test(entry) || /\.(?:ts|tsx|js|mjs|cjs|json|md|css|html|sql|yaml|yml|txt|map)$/i.test(entry)) output.push({ full, rel });
  }
}
walk(root, sourceFiles, new Set(['.git', 'node_modules', '.next', 'storage']));
walk(path.join(root, '.next', 'static'), bundleFiles);
const leaks = [];
function scan(files, label) {
  for (const file of files) {
    let body;
    try { body = readFileSync(file.full, 'utf8'); } catch { continue; }
    if (publicPrivilegedName.test(body)) leaks.push(`${label}: ${file.rel} references a privileged NEXT_PUBLIC_ variable name`);
    const isEnvFile = label === 'source' && /^\.env(?:\.|$)/i.test(file.rel);
    if (!isEnvFile) {
      for (const pattern of likelySecretPatterns) {
        if (pattern.re.test(body)) leaks.push(`${label}: ${file.rel} matches likely ${pattern.kind} pattern`);
      }
    }
    if (isEnvFile) continue;
    for (const [name, value] of secrets) if (body.includes(value)) leaks.push(`${label}: ${file.rel} contains configured ${name}`);
  }
}
scan(sourceFiles, 'source');
scan(bundleFiles, 'bundle');
if (!bundleFiles.length) leaks.push('bundle: no built client files found; bundle scan could not be completed');
if (leaks.length) {
  process.stdout.write(`FAIL: ${leaks.length} secret scan finding(s).\n${leaks.join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`PASS: no configured server secret values found in ${sourceFiles.length} repository text files or ${bundleFiles.length} available .next/static client files.\n`);
}
