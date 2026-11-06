import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
const content = fs.readFileSync(envPath, "utf-8");
const env = {};
for (const line of content.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const match = trimmed.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2].trim();
  }
}

const mirrorUrl = env.HEDERA_MIRROR_NODE_URL || "https://testnet.mirrornode.hedera.com";

async function checkAccount(label, accountId) {
  if (!accountId) {
    console.log(`${label}: NOT CONFIGURED`);
    return;
  }
  try {
    const res = await fetch(`${mirrorUrl}/api/v1/accounts/${accountId}`);
    if (!res.ok) {
      console.log(`${label} (${accountId}): Mirror query failed with HTTP ${res.status}`);
      return;
    }
    const data = await res.json();
    const balanceHbar = (data.balance?.balance || 0) / 100_000_000;
    const keyType = data.key?._type || "UNKNOWN";
    const evmAddress = data.evm_address;
    console.log(`${label} (${accountId}):`);
    console.log(`  Balance: ${balanceHbar} HBAR`);
    console.log(`  Key Type: ${keyType}`);
    console.log(`  EVM Address: ${evmAddress || "none"}`);
    console.log(`  Status: ${balanceHbar > 0 ? "FUNDED" : "UNFUNDED"}`);
  } catch (err) {
    console.log(`${label} (${accountId}): Error ${err.message}`);
  }
}

async function main() {
  console.log(`Querying Hedera Mirror Node at: ${mirrorUrl}`);
  await checkAccount("Issuer Agent", env.HEDERA_ISSUER_AGENT_ACCOUNT_ID);
  await checkAccount("Compliance", env.HEDERA_COMPLIANCE_ACCOUNT_ID);
  await checkAccount("Deployer / Admin", env.HEDERA_DEPLOYER_ACCOUNT_ID);
  await checkAccount("Pauser", env.HEDERA_PAUSER_ACCOUNT_ID);
  await checkAccount("Eligible Investor", env.HEDERA_INVESTOR_ELIGIBLE_ACCOUNT_ID);
  await checkAccount("Ineligible Investor", env.HEDERA_INVESTOR_INELIGIBLE_ACCOUNT_ID);
}

main();
