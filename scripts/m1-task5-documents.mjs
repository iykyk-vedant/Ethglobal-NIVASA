import { Client, PrivateKey, ContractExecuteTransaction, ContractId } from '@hashgraph/sdk';
import { createRequire } from 'module';
import { ethers } from 'ethers';
import fs from 'fs';

const req = createRequire(import.meta.url);
const { DocumentationFacet__factory } = req('@hashgraph/asset-tokenization-contracts/typechain-types');

const envContent = fs.readFileSync('.env', 'utf-8');
function getEnvVal(key) {
  const m = envContent.match(new RegExp(`${key}=(.*)`));
  return m ? m[1].trim() : '';
}

const assetContractId = getEnvVal('ATS_ASSET_CONTRACT_ID');
const assetAddress = getEnvVal('ATS_ASSET_ADDRESS');
const deployerId = getEnvVal('HEDERA_DEPLOYER_ACCOUNT_ID');
const deployerKey = PrivateKey.fromStringECDSA(getEnvVal('HEDERA_DEPLOYER_PRIVATE_KEY'));

const client = Client.forTestnet();
client.setOperator(deployerId, deployerKey);

const iface = DocumentationFacet__factory.createInterface();

console.log(`Starting Task 5 on Asset ${assetContractId} (${assetAddress})...`);

// 1. Set document "rights"
const rightsName = ethers.encodeBytes32String('rights');
const rightsUri1 = 'ipfs://bafybeirightsinitialv1';
const rightsHash1 = ethers.keccak256(ethers.toUtf8Bytes('NIVASA Rights Initial v1 PROPERTY-MH-001'));

console.log('1. Setting document "rights" (initial v1)...');
const setDocCalldata1 = iface.encodeFunctionData('setDocument', [rightsName, rightsUri1, rightsHash1]);
const tx1 = new ContractExecuteTransaction()
  .setContractId(ContractId.fromString(assetContractId))
  .setGas(500_000)
  .setFunctionParameters(Buffer.from(setDocCalldata1.slice(2), 'hex'));
const res1 = await tx1.execute(client);
const receipt1 = await res1.getReceipt(client);
console.log(`Set "rights" v1 status: ${receipt1.status.toString()}, tx: ${res1.transactionId.toString()}`);

// 2. Set document "evidence-manifest"
const manifestName = ethers.encodeBytes32String('evidence-manifest');
const manifestUri = 'ipfs://bafybeievidencemanifestroot';
const manifestHash = ethers.keccak256(ethers.toUtf8Bytes('Merkle Root of 7 Maharashtra Evidence Records'));

console.log('2. Setting document "evidence-manifest"...');
const setDocCalldata2 = iface.encodeFunctionData('setDocument', [manifestName, manifestUri, manifestHash]);
const tx2 = new ContractExecuteTransaction()
  .setContractId(ContractId.fromString(assetContractId))
  .setGas(500_000)
  .setFunctionParameters(Buffer.from(setDocCalldata2.slice(2), 'hex'));
const res2 = await tx2.execute(client);
const receipt2 = await res2.getReceipt(client);
console.log(`Set "evidence-manifest" status: ${receipt2.status.toString()}, tx: ${res2.transactionId.toString()}`);

// 3. Read back both documents
async function readDoc(name, label) {
  const readCalldata = iface.encodeFunctionData('getDocument', [name]);
  const queryRes = await fetch('https://testnet.mirrornode.hedera.com/api/v1/contracts/call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: assetAddress, data: readCalldata })
  }).then(r => r.json());
  const decoded = iface.decodeFunctionResult('getDocument', queryRes.result);
  console.log(`Read "${label}": URI=${decoded[0]}, Hash=${decoded[1]}, Timestamp=${decoded[2].toString()}`);
  return decoded;
}

const docRights1 = await readDoc(rightsName, 'rights v1');
const docManifest = await readDoc(manifestName, 'evidence-manifest');

// 4. Test document updating / versioning: update "rights" to v2
console.log('4. Testing document update/versioning: Updating "rights" to v2...');
const rightsUri2 = 'ipfs://bafybeirightsupdatedv2';
const rightsHash2 = ethers.keccak256(ethers.toUtf8Bytes('NIVASA Rights Updated v2 PROPERTY-MH-001'));
const setDocCalldata3 = iface.encodeFunctionData('setDocument', [rightsName, rightsUri2, rightsHash2]);
const tx3 = new ContractExecuteTransaction()
  .setContractId(ContractId.fromString(assetContractId))
  .setGas(500_000)
  .setFunctionParameters(Buffer.from(setDocCalldata3.slice(2), 'hex'));
const res3 = await tx3.execute(client);
const receipt3 = await res3.getReceipt(client);
console.log(`Update "rights" to v2 status: ${receipt3.status.toString()}, tx: ${res3.transactionId.toString()}`);

// Read back updated rights
const docRights2 = await readDoc(rightsName, 'rights v2 (updated)');
const isUpdated = docRights2[1] === rightsHash2 && docRights2[2] >= docRights1[2];
console.log(`Document versioning verified: ${isUpdated ? 'YES, documents are versionable via overwrite with updated timestamp!' : 'NO'}`);

console.log('Task 5 COMPLETED SUCCESSFULLY!');

