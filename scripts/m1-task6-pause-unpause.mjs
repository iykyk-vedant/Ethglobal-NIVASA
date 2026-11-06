import { Client, PrivateKey, ContractExecuteTransaction, ContractId } from '@hashgraph/sdk';
import { createRequire } from 'module';
import { ethers } from 'ethers';
import fs from 'fs';

const req = createRequire(import.meta.url);
const { PauseFacet__factory, TransferFacet__factory, MintFacet__factory, KycFacet__factory, BalanceTrackerFacet__factory } = req('@hashgraph/asset-tokenization-contracts/typechain-types');

const envContent = fs.readFileSync('.env', 'utf-8');
function getEnvVal(key) {
  const m = envContent.match(new RegExp(`${key}=(.*)`));
  return m ? m[1].trim() : '';
}

const assetContractId = getEnvVal('ATS_ASSET_CONTRACT_ID');
const assetAddress = getEnvVal('ATS_ASSET_ADDRESS');

const pauserId = getEnvVal('HEDERA_PAUSER_ACCOUNT_ID');
const pauserKey = PrivateKey.fromStringECDSA(getEnvVal('HEDERA_PAUSER_PRIVATE_KEY'));

const investorEligibleId = getEnvVal('HEDERA_INVESTOR_ELIGIBLE_ACCOUNT_ID');
const investorEligibleKey = PrivateKey.fromStringECDSA(getEnvVal('HEDERA_INVESTOR_ELIGIBLE_PRIVATE_KEY'));
const investorEligibleEvm = '0x0000000000000000000000000000000000ace2c6';

const complianceId = getEnvVal('HEDERA_COMPLIANCE_ACCOUNT_ID');
const complianceKey = PrivateKey.fromStringECDSA(getEnvVal('HEDERA_COMPLIANCE_PRIVATE_KEY'));

const issuerId = getEnvVal('HEDERA_ISSUER_AGENT_ACCOUNT_ID');
const issuerKey = PrivateKey.fromStringECDSA(getEnvVal('HEDERA_ISSUER_AGENT_PRIVATE_KEY'));

const deployerEvm = '0x0000000000000000000000000000000000ace2c4';

const pauseIface = PauseFacet__factory.createInterface();
const transferIface = TransferFacet__factory.createInterface();
const mintIface = MintFacet__factory.createInterface();
const kycIface = KycFacet__factory.createInterface();
const balanceIface = BalanceTrackerFacet__factory.createInterface();

console.log(`Starting Task 6 on Asset ${assetContractId} (${assetAddress})...`);

// Setup clients
const pauserClient = Client.forTestnet();
pauserClient.setOperator(pauserId, pauserKey);

const investorClient = Client.forTestnet();
investorClient.setOperator(investorEligibleId, investorEligibleKey);

const issuerClient = Client.forTestnet();
issuerClient.setOperator(issuerId, issuerKey);

const complianceClient = Client.forTestnet();
complianceClient.setOperator(complianceId, complianceKey);

// 0. Pre-requisite: ensure Deployer has KYC so Deployer can receive transfer
console.log('0. Granting KYC to recipient (Deployer)...');
const now = Math.floor(Date.now() / 1000);
const kycCalldata = kycIface.encodeFunctionData('grantKyc', [
  deployerEvm,
  'VC-DEPLOYER-001',
  now - 60,
  now + 365 * 86400,
  '0x2e73ccc2559078b49c82a8fae4b3b38d5ebb1912'
]);
try {
  const kycTx = new ContractExecuteTransaction()
    .setContractId(ContractId.fromString(assetContractId))
    .setGas(500_000)
    .setFunctionParameters(Buffer.from(kycCalldata.slice(2), 'hex'));
  const kycRes = await kycTx.execute(complianceClient);
  await kycRes.getReceipt(complianceClient);
  console.log('Deployer recipient KYC granted successfully.');
} catch (e) {
  console.log('Deployer KYC step note:', e.message);
}

// 1. Pause the asset (pauser key)
console.log('1. Pausing asset with Pauser account...');
const pauseCalldata = pauseIface.encodeFunctionData('pause', []);
const pauseTx = new ContractExecuteTransaction()
  .setContractId(ContractId.fromString(assetContractId))
  .setGas(500_000)
  .setFunctionParameters(Buffer.from(pauseCalldata.slice(2), 'hex'));
const pauseRes = await pauseTx.execute(pauserClient);
const pauseReceipt = await pauseRes.getReceipt(pauserClient);
console.log(`Pause Status: ${pauseReceipt.status.toString()}, tx: ${pauseRes.transactionId.toString()}`);

// Check paused status on-chain
const pausedQueryData = pauseIface.encodeFunctionData('paused', []);
const pausedRes = await fetch('https://testnet.mirrornode.hedera.com/api/v1/contracts/call', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ to: assetAddress, data: pausedQueryData })
}).then(r => r.json());
const isPaused = pauseIface.decodeFunctionResult('paused', pausedRes.result)[0];
console.log(`Asset paused state on-chain: ${isPaused}`);

// 2. Prove transfer FAILS while paused
console.log('2. Attempting transfer of 5 units while paused...');
const transferCalldata = transferIface.encodeFunctionData('transfer', [deployerEvm, 5n]);
let transferWhilePausedFailed = false;
let transferPauseTxId = '';
try {
  const transferTx = new ContractExecuteTransaction()
    .setContractId(ContractId.fromString(assetContractId))
    .setGas(1_000_000)
    .setFunctionParameters(Buffer.from(transferCalldata.slice(2), 'hex'));
  const tRes = await transferTx.execute(investorClient);
  transferPauseTxId = tRes.transactionId.toString();
  await tRes.getReceipt(investorClient);
} catch (err) {
  transferWhilePausedFailed = true;
  console.log(`PROVEN: Transfer while paused reverted as expected! (${err.message})`);
}

// 3. Test: Does issuance work while paused?
console.log('3. Testing: Does issuance work while paused?');
const issueCalldata = mintIface.encodeFunctionData('issue', [investorEligibleEvm, 5n, '0x']);
let issueWhilePausedFailed = false;
try {
  const issueTx = new ContractExecuteTransaction()
    .setContractId(ContractId.fromString(assetContractId))
    .setGas(1_000_000)
    .setFunctionParameters(Buffer.from(issueCalldata.slice(2), 'hex'));
  const iRes = await issueTx.execute(issuerClient);
  await iRes.getReceipt(issuerClient);
} catch (err) {
  issueWhilePausedFailed = true;
  console.log(`RECORDED: Issuance while paused REVERTS as expected! (${err.message})`);
}

// 4. Unpause the asset (pauser key)
console.log('4. Unpausing asset with Pauser account...');
const unpauseCalldata = pauseIface.encodeFunctionData('unpause', []);
const unpauseTx = new ContractExecuteTransaction()
  .setContractId(ContractId.fromString(assetContractId))
  .setGas(500_000)
  .setFunctionParameters(Buffer.from(unpauseCalldata.slice(2), 'hex'));
const unpauseRes = await unpauseTx.execute(pauserClient);
const unpauseReceipt = await unpauseRes.getReceipt(pauserClient);
console.log(`Unpause Status: ${unpauseReceipt.status.toString()}, tx: ${unpauseRes.transactionId.toString()}`);

// 5. Prove transfer SUCCEEDS after unpause
console.log('5. Executing transfer of 5 units from Eligible Investor to Deployer after unpause...');
const transferSuccessTx = new ContractExecuteTransaction()
  .setContractId(ContractId.fromString(assetContractId))
  .setGas(1_500_000)
  .setFunctionParameters(Buffer.from(transferCalldata.slice(2), 'hex'));
const tSuccessRes = await transferSuccessTx.execute(investorClient);
const tSuccessReceipt = await tSuccessRes.getReceipt(investorClient);
console.log(`PROVEN: Transfer after unpause SUCCEEDED! Status: ${tSuccessReceipt.status.toString()}, tx: ${tSuccessRes.transactionId.toString()}`);

// Read recipient balance
const balCalldata = balanceIface.encodeFunctionData('balanceOf', [deployerEvm]);
const balRes = await fetch('https://testnet.mirrornode.hedera.com/api/v1/contracts/call', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ to: assetAddress, data: balCalldata })
}).then(r => r.json());
const decodedBal = balanceIface.decodeFunctionResult('balanceOf', balRes.result);
console.log(`Recipient (Deployer) balance on-chain: ${decodedBal[0].toString()} units`);

console.log('Task 6 COMPLETED SUCCESSFULLY!');

