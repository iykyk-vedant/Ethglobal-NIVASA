import fs from "fs";
import path from "path";

// Names of variables required for full operations
const REQUIRED_VARS = [
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
  "PARCEL_HMAC_SECRET",
  "HEDERA_NETWORK",
  "HEDERA_JSON_RPC_URL",
  "HEDERA_MIRROR_NODE_URL",
  "HEDERA_ISSUER_AGENT_ACCOUNT_ID",
  "HEDERA_ISSUER_AGENT_PRIVATE_KEY",
  "HEDERA_COMPLIANCE_ACCOUNT_ID",
  "HEDERA_COMPLIANCE_PRIVATE_KEY",
  "ISSUER_DAILY_UNIT_CAP",
  "ATS_ADAPTER_MODE",
  "OG_API_KEY",
];

const envPath = path.resolve(process.cwd(), ".env");

if (!fs.existsSync(envPath)) {
  console.error("Missing .env file in root directory.");
  process.exit(1);
}

const content = fs.readFileSync(envPath, "utf-8");
const envMap = new Map();

for (const line of content.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const match = trimmed.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (match) {
    const key = match[1];
    const value = match[2].trim();
    envMap.set(key, value);
  }
}

const missingOrEmpty = [];

for (const varName of REQUIRED_VARS) {
  if (!envMap.has(varName)) {
    missingOrEmpty.push(`${varName} (missing)`);
  } else if (envMap.get(varName).length === 0) {
    missingOrEmpty.push(`${varName} (empty)`);
  }
}

if (missingOrEmpty.length > 0) {
  console.log("Environment check: The following required variables are missing or empty:");
  for (const item of missingOrEmpty) {
    console.log(`  - ${item}`);
  }
  process.exit(0);
} else {
  console.log("Environment check: All required variables are present and populated.");
}

