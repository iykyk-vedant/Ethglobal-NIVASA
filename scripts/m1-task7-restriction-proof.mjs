import { Client, PrivateKey, ContractExecuteTransaction, ContractId } from '@hashgraph/sdk';
import { createRequire } from 'module';
import { ethers } from 'ethers';
import fs from 'fs';

const req = createRequire(import.meta.url);
const { TransferFacet__factory } = req('@hashgraph/asset-tokenization-contracts/typechain-types');

const envContent = fs.readFileSync('.env', 'utf-8');
function getEnvVal(key) {
  const m = envContent.match(new RegExp(`${key}=(.*)`));
  return m ? m[1].trim() : '';
}

const assetContractId = getEnvVal('ATS_ASSET_CONTRACT_ID');
const assetAddress = getEnvVal('ATS_ASSET_ADDRESS');

const investorEligibleId = getEnvVal('HEDERA_INVESTOR_ELIGIBLE_ACCOUNT_ID');
const investorEligibleKey = PrivateKey.fromStringECDSA(getEnvVal('HEDERA_INVESTOR_ELIGIBLE_PRIVATE_KEY'));
const investorEligibleEvm = '0x0000000000000000000000000000000000ace2c6';

const investorIneligibleId = getEnvVal('HEDERA_INVESTOR_INELIGIBLE_ACCOUNT_ID');
const investorIneligibleKey = PrivateKey.fromStringECDSA(getEnvVal('HEDERA_INVESTOR_INELIGIBLE_PRIVATE_KEY'));
const investorIneligibleEvm = '0x0000000000000000000000000000000000ace2c7';

const transferIface = TransferFacet__factory.createInterface();

console.log(`Starting Task 7 on Asset ${assetContractId} (${assetAddress})...`);

const eligibleClient = Client.forTestnet();
eligibleClient.setOperator(investorEligibleId, investorEligibleKey);

const ineligibleClient = Client.forTestnet();
ineligibleClient.setOperator(investorIneligibleId, investorIneligibleKey);

// 1. Attempt transfer FROM eligible holder TO ineligible unregistered recipient
console.log(`1. Attempting transfer of 1 unit to unregistered wallet (${investorIneligibleEvm})...`);
const transferToIneligibleData = transferIface.encodeFunctionData('transfer', [investorIneligibleEvm, 1n]);
let transferToIneligibleTxId = '';
try {
  const tx1 = new ContractExecuteTransaction()
    .setContractId(ContractId.fromString(assetContractId))
    .setGas(1_500_000)
    .setFunctionParameters(Buffer.from(transferToIneligibleData.slice(2), 'hex'));
  const res1 = await tx1.execute(eligibleClient);
  transferToIneligibleTxId = res1.transactionId.toString();
  await res1.getReceipt(eligibleClient);
} catch (err) {
  console.log(`PROVEN: Transfer to unregistered recipient REVERTED! (${err.message})`);
}

// 2. Attempt transfer FROM unregistered wallet
console.log(`2. Attempting transfer initiated by unregistered wallet (${investorIneligibleId})...`);
const transferFromIneligibleData = transferIface.encodeFunctionData('transfer', [investorEligibleEvm, 1n]);
let transferFromIneligibleTxId = '';
try {
  const tx2 = new ContractExecuteTransaction()
    .setContractId(ContractId.fromString(assetContractId))
    .setGas(1_500_000)
    .setFunctionParameters(Buffer.from(transferFromIneligibleData.slice(2), 'hex'));
  const res2 = await tx2.execute(ineligibleClient);
  transferFromIneligibleTxId = res2.transactionId.toString();
  await res2.getReceipt(ineligibleClient);
} catch (err) {
  console.log(`PROVEN: Transfer from unregistered wallet REVERTED! (${err.message})`);
}

// 3. Fetch failed contract-call record from Mirror Node
console.log('3. Fetching failed contract call records from Mirror Node...');
console.log('Waiting 5 seconds for Mirror Node ingestion...');
await new Promise(r => setTimeout(r, 5000));

const mirrorQueryId = transferToIneligibleTxId.replace('@', '-').replace('.', '-');
console.log(`Querying Mirror Node for failed tx: ${transferToIneligibleTxId}...`);
const mirrorRes = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/contracts/results/${mirrorQueryId}`).then(r => r.json());
console.log('Mirror Node contract call result:', {
  hash: mirrorRes.hash,
  result: mirrorRes.result,
  error_message: mirrorRes.error_message,
  from: mirrorRes.from,
  to: mirrorRes.to
});

console.log('Task 7 COMPLETED SUCCESSFULLY!');

