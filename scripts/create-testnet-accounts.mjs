import fs from "fs";
import path from "path";
import { Client, PrivateKey, AccountCreateTransaction, Hbar } from "@hashgraph/sdk";

const envPath = path.resolve(process.cwd(), ".env");
if (!fs.existsSync(envPath)) {
  console.error("Missing .env file");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf-8");
const envVars = {};
for (const line of envContent.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const match = trimmed.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (match) {
    envVars[match[1]] = match[2].trim();
  }
}

const operatorId = envVars.HEDERA_ISSUER_AGENT_ACCOUNT_ID;
const rawKey = envVars.HEDERA_ISSUER_AGENT_PRIVATE_KEY;

if (!operatorId || !rawKey) {
  console.error("Missing HEDERA_ISSUER_AGENT_ACCOUNT_ID or HEDERA_ISSUER_AGENT_PRIVATE_KEY in .env");
  process.exit(1);
}

const operatorKey = PrivateKey.fromStringECDSA(rawKey);
const client = Client.forTestnet();
client.setOperator(operatorId, operatorKey);

async function createAccount(roleName, initialHbar = 25) {
  console.log(`Creating ${roleName} account on Hedera Testnet...`);
  const privateKey = PrivateKey.generateECDSA();
  const publicKey = privateKey.publicKey;

  const tx = new AccountCreateTransaction()
    .setKey(publicKey)
    .setInitialBalance(new Hbar(initialHbar));

  const response = await tx.execute(client);
  const receipt = await response.getReceipt(client);
  const accountId = receipt.accountId.toString();
  const evmAddress = "0x" + publicKey.toEvmAddress();

  console.log(`  -> Created ${roleName}: ${accountId} (${evmAddress}) funded with ${initialHbar} HBAR`);

  return {
    accountId,
    privateKeyRaw: privateKey.toStringRaw(),
    evmAddress,
  };
}

async function main() {
  const newEntries = [];

  // 1. Deployer
  if (!envVars.HEDERA_DEPLOYER_ACCOUNT_ID) {
    const deployer = await createAccount("Deployer / Admin", 50);
    newEntries.push(`HEDERA_DEPLOYER_ACCOUNT_ID=${deployer.accountId}`);
    newEntries.push(`HEDERA_DEPLOYER_PRIVATE_KEY=${deployer.privateKeyRaw}`);
  } else {
    console.log(`HEDERA_DEPLOYER_ACCOUNT_ID already present: ${envVars.HEDERA_DEPLOYER_ACCOUNT_ID}`);
  }

  // 2. Pauser
  if (!envVars.HEDERA_PAUSER_ACCOUNT_ID) {
    const pauser = await createAccount("Pauser", 25);
    newEntries.push(`HEDERA_PAUSER_ACCOUNT_ID=${pauser.accountId}`);
    newEntries.push(`HEDERA_PAUSER_PRIVATE_KEY=${pauser.privateKeyRaw}`);
  } else {
    console.log(`HEDERA_PAUSER_ACCOUNT_ID already present: ${envVars.HEDERA_PAUSER_ACCOUNT_ID}`);
  }

  // 3. Eligible Investor
  if (!envVars.HEDERA_INVESTOR_ELIGIBLE_ACCOUNT_ID) {
    const eligible = await createAccount("Eligible Investor", 25);
    newEntries.push(`HEDERA_INVESTOR_ELIGIBLE_ACCOUNT_ID=${eligible.accountId}`);
    newEntries.push(`HEDERA_INVESTOR_ELIGIBLE_PRIVATE_KEY=${eligible.privateKeyRaw}`);
  } else {
    console.log(`HEDERA_INVESTOR_ELIGIBLE_ACCOUNT_ID already present: ${envVars.HEDERA_INVESTOR_ELIGIBLE_ACCOUNT_ID}`);
  }

  // 4. Ineligible Investor
  if (!envVars.HEDERA_INVESTOR_INELIGIBLE_ACCOUNT_ID) {
    const ineligible = await createAccount("Ineligible Investor", 25);
    newEntries.push(`HEDERA_INVESTOR_INELIGIBLE_ACCOUNT_ID=${ineligible.accountId}`);
    newEntries.push(`HEDERA_INVESTOR_INELIGIBLE_PRIVATE_KEY=${ineligible.privateKeyRaw}`);
  } else {
    console.log(`HEDERA_INVESTOR_INELIGIBLE_ACCOUNT_ID already present: ${envVars.HEDERA_INVESTOR_INELIGIBLE_ACCOUNT_ID}`);
  }

  // Set ATS factory and resolver addresses if empty
  let updatedContent = envContent;
  if (!envVars.ATS_FACTORY_ADDRESS || envVars.ATS_FACTORY_ADDRESS === "") {
    updatedContent = updatedContent.replace(/^ATS_FACTORY_ADDRESS=.*$/m, "ATS_FACTORY_ADDRESS=0x5fa65ca30d1984701f10476664327f97c864a9d3");
    console.log("Set ATS_FACTORY_ADDRESS=0x5fa65ca30d1984701f10476664327f97c864a9d3 (0.0.7708432)");
  }
  if (!envVars.ATS_RESOLVER_ADDRESS || envVars.ATS_RESOLVER_ADDRESS === "") {
    updatedContent = updatedContent.replace(/^ATS_RESOLVER_ADDRESS=.*$/m, "ATS_RESOLVER_ADDRESS=0xefef4cae9642631cfc6d997d6207ee48fa78fe42");
    console.log("Set ATS_RESOLVER_ADDRESS=0xefef4cae9642631cfc6d997d6207ee48fa78fe42 (0.0.7707874)");
  }
  if (!envVars.ATS_ASSET_REF || envVars.ATS_ASSET_REF === "") {
    updatedContent = updatedContent.replace(/^ATS_ASSET_REF=.*$/m, "ATS_ASSET_REF=PROPERTY-MH-001");
    console.log("Set ATS_ASSET_REF=PROPERTY-MH-001");
  }

  if (newEntries.length > 0) {
    updatedContent = updatedContent.trimEnd() + "\n\n# Newly Generated Hedera Role & Investor Accounts\n" + newEntries.join("\n") + "\n";
  }

  fs.writeFileSync(envPath, updatedContent, "utf-8");
  console.log("Successfully updated .env with test accounts and ATS addresses.");
}

main().catch((err) => {
  console.error("Account creation failed:", err);
  process.exit(1);
});
