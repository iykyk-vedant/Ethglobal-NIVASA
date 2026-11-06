import { Client, PrivateKey, ContractExecuteTransaction, ContractId } from '@hashgraph/sdk';
import { createRequire } from 'module';
import { ethers } from 'ethers';
import fs from 'fs';

const req = createRequire(import.meta.url);
const { FactoryFacet__factory } = req('@hashgraph/asset-tokenization-contracts/typechain-types');
const { EQUITY_CONFIG_ID, ATS_ROLES } = req('@hashgraph/asset-tokenization-contracts/scripts');

const envContent = fs.readFileSync('.env', 'utf-8');
const idMatch = envContent.match(/HEDERA_DEPLOYER_ACCOUNT_ID=(.*)/);
const keyMatch = envContent.match(/HEDERA_DEPLOYER_PRIVATE_KEY=(.*)/);

const deployerId = idMatch[1].trim();
const deployerKey = PrivateKey.fromStringECDSA(keyMatch[1].trim());

// Hedera EVM address for deployer
const deployerEvm = '0x0000000000000000000000000000000000ace2c4';
const deployerPublicKeyEvm = '0x493c69eb4fcfb8080121656ff350448bd5ec1bf1';

const client = Client.forTestnet();
client.setOperator(deployerId, deployerKey);

const iface = FactoryFacet__factory.createInterface();

// ATS Factory v8 and Resolver on Hedera Testnet
const factoryId = '0.0.9213391';
const resolverAddress = '0xBA2D5FC2083A0b8f164c50e65d782087fBA18E0a';

const equityData = {
  security: {
    resolver: resolverAddress,
    maxSupply: 10000n,
    resolverProxyConfiguration: { key: EQUITY_CONFIG_ID, version: 1n },
    erc20MetadataInfo: {
      name: 'NIVASA Commercial 001',
      symbol: 'PROPERTY-MH-001',
      isin: 'INE002A01018',
      decimals: 0n
    },
    rbacs: [
      {
        role: ATS_ROLES.DEFAULT_ADMIN_ROLE,
        members: [deployerEvm, deployerPublicKeyEvm]
      },
      {
        role: ATS_ROLES.ROLE_SSI_MANAGER,
        members: [deployerEvm, deployerPublicKeyEvm]
      },
      {
        role: ATS_ROLES.ROLE_KYC,
        members: [deployerEvm, deployerPublicKeyEvm, '0x2e73ccc2559078b49c82a8fae4b3b38d5ebb1912']
      }
    ],
    externalPauses: [],
    externalControlLists: [],
    externalKycLists: [],
    compliance: ethers.ZeroAddress,
    identityRegistry: ethers.ZeroAddress,
    arePartitionsProtected: false,
    isMultiPartition: false,
    isControllable: true,
    isWhiteList: false,
    clearingActive: false,
    internalKycActivated: true,
    erc20VotesActivated: false
  },
  equityDetails: {
    votingRight: true,
    informationRight: true,
    liquidationRight: true,
    subscriptionRight: false,
    conversionRight: false,
    redemptionRight: false,
    putRight: false,
    dividendRight: 1,
    currency: '0x494e52',
    nominalValue: 1000n,
    nominalValueDecimals: 2
  }
};

const factoryRegulationData = {
  regulationType: 1, // REG_S
  regulationSubType: 0,
  additionalSecurityData: {
    countriesControlListType: true,
    listOfCountries: '',
    info: 'NIVASA Real Estate Prototype'
  }
};

const calldata = iface.encodeFunctionData('deployEquity', [equityData, factoryRegulationData]);

console.log('Submitting deployEquity to ATS Factory v8 (0.0.9213391)...');
try {
  const tx = new ContractExecuteTransaction()
    .setContractId(ContractId.fromString(factoryId))
    .setGas(12_000_000)
    .setFunctionParameters(Buffer.from(calldata.slice(2), 'hex'));

  const response = await tx.execute(client);
  console.log('Transaction ID:', response.transactionId.toString());
  const receipt = await response.getReceipt(client);
  console.log('Receipt status:', receipt.status.toString());
  const record = await response.getRecord(client);
  const resultBytes = record.contractFunctionResult.asBytes();
  const decoded = iface.decodeFunctionResult('deployEquity', resultBytes);
  console.log('SUCCESS! Deployed Equity Proxy Address:', decoded[0]);
  console.log('Gas used:', record.contractFunctionResult.gasUsed.toString());
} catch (err) {
  console.error('Error during deployEquity:', err);
}

