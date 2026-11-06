import { Client, PrivateKey, ContractExecuteTransaction, ContractId } from '@hashgraph/sdk';
import { createRequire } from 'module';
import { ethers } from 'ethers';
import fs from 'fs';

const req = createRequire(import.meta.url);
const { KycFacet__factory, MintFacet__factory, BalanceTrackerFacet__factory } = req('@hashgraph/asset-tokenization-contracts/typechain-types');

const envContent = fs.readFileSync('.env', 'utf-8');
function getEnvVal(key) {
  const m = envContent.match(new RegExp(`${key}=(.*)`));
  return m ? m[1].trim() : '';
}

const assetContractId = getEnvVal('ATS_ASSET_CONTRACT_ID');
const assetAddress = getEnvVal('ATS_ASSET_ADDRESS');

const complianceId = getEnvVal('HEDERA_COMPLIANCE_ACCOUNT_ID');
const complianceKey = PrivateKey.fromStringECDSA(getEnvVal('HEDERA_COMPLIANCE_PRIVATE_KEY'));

const issuerId = getEnvVal('HEDERA_ISSUER_AGENT_ACCOUNT_ID');
const issuerKey = PrivateKey.fromStringECDSA(getEnvVal('HEDERA_ISSUER_AGENT_PRIVATE_KEY'));

const investorEligibleId = getEnvVal('HEDERA_INVESTOR_ELIGIBLE_ACCOUNT_ID');
const investorEligibleEvm = '0x0000000000000000000000000000000000ace2c6';

const kycIface = KycFacet__factory.createInterface();
const mintIface = MintFacet__factory.createInterface();
const balanceIface = BalanceTrackerFacet__factory.createInterface();

console.log(`Starting Task 4 on Asset ${assetContractId} (${assetAddress})...`);

// 1. Grant KYC to Eligible Investor using Compliance key
const complianceClient = Client.forTestnet();
complianceClient.setOperator(complianceId, complianceKey);

const now = Math.floor(Date.now() / 1000);
const validFrom = now - 60;
const validTo = now + 365 * 86400;

console.log(`1. Granting KYC to Eligible Investor (${investorEligibleEvm})...`);
const kycCalldata = kycIface.encodeFunctionData('grantKyc', [
  investorEligibleEvm,
  'VC-ELIGIBLE-001',
  validFrom,
  validTo,
  '0x2e73ccc2559078b49c82a8fae4b3b38d5ebb1912'
]);

const kycTx = new ContractExecuteTransaction()
  .setContractId(ContractId.fromString(assetContractId))
  .setGas(500_000)
  .setFunctionParameters(Buffer.from(kycCalldata.slice(2), 'hex'));

const kycRes = await kycTx.execute(complianceClient);
const kycReceipt = await kycRes.getReceipt(complianceClient);
console.log(`KYC Grant Status: ${kycReceipt.status.toString()}, tx: ${kycRes.transactionId.toString()}`);

// Verify KYC status via mirror node contract call
const kycStatusData = kycIface.encodeFunctionData('getKycStatusFor', [investorEligibleEvm]);
const kycQueryRes = await fetch('https://testnet.mirrornode.hedera.com/api/v1/contracts/call', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ to: assetAddress, data: kycStatusData })
}).then(r => r.json());
const decodedKycStatus = kycIface.decodeFunctionResult('getKycStatusFor', kycQueryRes.result);
console.log(`Verified KYC Status on-chain: ${decodedKycStatus[0] === 1n ? 'GRANTED (1)' : decodedKycStatus[0]}`);

// 2. Issue 100 units to Eligible Investor using Issuer Agent key
const issuerClient = Client.forTestnet();
issuerClient.setOperator(issuerId, issuerKey);

console.log(`2. Issuing 100 units to Eligible Investor (${investorEligibleEvm})...`);
const issueCalldata = mintIface.encodeFunctionData('issue', [
  investorEligibleEvm,
  100n,
  '0x'
]);

const issueTx = new ContractExecuteTransaction()
  .setContractId(ContractId.fromString(assetContractId))
  .setGas(1_500_000)
  .setFunctionParameters(Buffer.from(issueCalldata.slice(2), 'hex'));

const issueRes = await issueTx.execute(issuerClient);
const issueReceipt = await issueRes.getReceipt(issuerClient);
console.log(`Issue Status: ${issueReceipt.status.toString()}, tx: ${issueRes.transactionId.toString()}`);

// 3. Read balance via contract call endpoint (NOT HTS)
const balCalldata = balanceIface.encodeFunctionData('balanceOf', [investorEligibleEvm]);
const balRes = await fetch('https://testnet.mirrornode.hedera.com/api/v1/contracts/call', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ to: assetAddress, data: balCalldata })
}).then(r => r.json());
const decodedBal = balanceIface.decodeFunctionResult('balanceOf', balRes.result);
console.log(`Verified Investor Balance on-chain via Mirror contract call: ${decodedBal[0].toString()} units`);

// 4. Fetch issue event from Mirror Node logs
console.log('4. Waiting 4 seconds for Mirror Node ingestion...');
await new Promise(r => setTimeout(r, 4000));
const logsRes = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/contracts/${assetContractId}/results/logs?limit=5&order=desc`).then(r => r.json());
console.log(`Fetched ${logsRes.logs?.length || 0} recent event logs from Mirror Node.`);
if (logsRes.logs?.length > 0) {
  console.log('Latest log topics:', logsRes.logs[0].topics);
}
console.log('Task 4 COMPLETED SUCCESSFULLY!');

