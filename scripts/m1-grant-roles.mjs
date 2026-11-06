import { Client, PrivateKey, ContractExecuteTransaction, ContractId } from '@hashgraph/sdk';
import { createRequire } from 'module';
import fs from 'fs';

const req = createRequire(import.meta.url);
const { AccessControlFacet__factory } = req('@hashgraph/asset-tokenization-contracts/typechain-types');
const { ATS_ROLES } = req('@hashgraph/asset-tokenization-contracts/scripts');

const envContent = fs.readFileSync('.env', 'utf-8');
const idMatch = envContent.match(/HEDERA_DEPLOYER_ACCOUNT_ID=(.*)/);
const keyMatch = envContent.match(/HEDERA_DEPLOYER_PRIVATE_KEY=(.*)/);
const assetMatch = envContent.match(/ATS_ASSET_CONTRACT_ID=(.*)/);

const deployerId = idMatch[1].trim();
const deployerKey = PrivateKey.fromStringECDSA(keyMatch[1].trim());
const assetContractId = assetMatch[1].trim();

const client = Client.forTestnet();
client.setOperator(deployerId, deployerKey);

const iface = AccessControlFacet__factory.createInterface();

// Accounts and their EVM addresses
const rolesToGrant = [
  // ROLE_ISSUER to Issuer Agent (0.0.11324646)
  { role: ATS_ROLES.ROLE_ISSUER, account: '0x2ef488213a7675c4cb24ecf31f139f777bb4660f' },
  { role: ATS_ROLES.ROLE_ISSUER, account: '0x0000000000000000000000000000000000acde46' }, // long-zero for 11324646
  // ROLE_PAUSER to Pauser (0.0.11330245)
  { role: ATS_ROLES.ROLE_PAUSER, account: '0x0000000000000000000000000000000000ace2c5' },
  { role: ATS_ROLES.ROLE_PAUSER, account: '0xc83a7de5e31f76de9db4618fdd1ba323cd895dda' },
  // ROLE_DOCUMENTER to Deployer (0.0.11330244)
  { role: ATS_ROLES.ROLE_DOCUMENTER, account: '0x0000000000000000000000000000000000ace2c4' },
  { role: ATS_ROLES.ROLE_DOCUMENTER, account: '0x493c69eb4fcfb8080121656ff350448bd5ec1bf1' },
  // ROLE_KYC to Compliance (0.0.11324672)
  { role: ATS_ROLES.ROLE_KYC, account: '0x2e73ccc2559078b49c82a8fae4b3b38d5ebb1912' },
  { role: ATS_ROLES.ROLE_KYC, account: '0x0000000000000000000000000000000000acde60' }, // long-zero for 11324672
];

console.log(`Granting roles on asset ${assetContractId}...`);

for (const { role, account } of rolesToGrant) {
  const calldata = iface.encodeFunctionData('grantRole', [role, account]);
  const tx = new ContractExecuteTransaction()
    .setContractId(ContractId.fromString(assetContractId))
    .setGas(500_000)
    .setFunctionParameters(Buffer.from(calldata.slice(2), 'hex'));

  const response = await tx.execute(client);
  const receipt = await response.getReceipt(client);
  console.log(`Granted role ${role.slice(0, 10)}... to ${account.slice(0, 12)}... status: ${receipt.status.toString()} (tx: ${response.transactionId.toString()})`);
}

console.log('All roles granted successfully!');

