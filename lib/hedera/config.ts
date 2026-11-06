/**
 * NIVASA - Hedera Network & Role Configuration
 * ARCH §8.4, §8.5 · PRD FR-6.4
 *
 * Role-separated ECDSA operator keys are held server-side only:
 * - Deployer / Admin: Holds DEFAULT_ADMIN_ROLE, ROLE_DOCUMENTER, ROLE_SSI_MANAGER
 * - Compliance: Holds ROLE_KYC and is a registered SSI issuer for investor attestations
 * - Issuer-Agent: Holds ROLE_ISSUER for unit minting
 * - Pauser: Holds ROLE_PAUSER for operational freeze
 */

import { Client, PrivateKey, AccountId, ContractId } from '@hashgraph/sdk';
import { AtsAdapterMode } from './types';

export const HEDERA_CHAIN_ID = 296; // Hedera Testnet EVM Chain ID
export const DEFAULT_MIRROR_NODE_URL = 'https://testnet.mirrornode.hedera.com';
export const DEFAULT_JSON_RPC_URL = 'https://testnet.hashio.io/api';

export function getHederaConfig() {
  const mirrorNodeUrl = process.env.HEDERA_MIRROR_NODE_URL || DEFAULT_MIRROR_NODE_URL;
  const jsonRpcUrl = process.env.HEDERA_JSON_RPC_URL || DEFAULT_JSON_RPC_URL;
  const assetContractId = process.env.ATS_ASSET_CONTRACT_ID || '0.0.11330441';
  const assetAddress = process.env.ATS_ASSET_ADDRESS || '0x52ed835e649a4b045a21bc5e240623d8a77f73ef';
  const adapterMode: AtsAdapterMode = (process.env.ATS_ADAPTER_MODE as AtsAdapterMode) || 'sdk';

  return {
    chainId: HEDERA_CHAIN_ID,
    network: 'testnet',
    mirrorNodeUrl: mirrorNodeUrl.replace(/\/$/, ''),
    jsonRpcUrl: jsonRpcUrl.replace(/\/$/, ''),
    assetContractId,
    assetAddress,
    adapterMode,
    accounts: {
      compliance: {
        accountId: process.env.HEDERA_COMPLIANCE_ACCOUNT_ID || '',
        privateKey: process.env.HEDERA_COMPLIANCE_PRIVATE_KEY || '',
      },
      issuerAgent: {
        accountId: process.env.HEDERA_ISSUER_AGENT_ACCOUNT_ID || '',
        privateKey: process.env.HEDERA_ISSUER_AGENT_PRIVATE_KEY || '',
      },
      pauser: {
        accountId: process.env.HEDERA_PAUSER_ACCOUNT_ID || '',
        privateKey: process.env.HEDERA_PAUSER_PRIVATE_KEY || '',
      },
      deployer: {
        accountId: process.env.HEDERA_DEPLOYER_ACCOUNT_ID || '',
        privateKey: process.env.HEDERA_DEPLOYER_PRIVATE_KEY || '',
      },
    },
  };
}

/**
 * Normalizes a Hedera Account ID (0.0.X) or EVM address to standard EVM format (0x...).
 */
export function toEvmAddress(accountOrAddress: string): string {
  const trimmed = accountOrAddress.trim();
  if (trimmed.startsWith('0x') && trimmed.length === 42) {
    return trimmed.toLowerCase();
  }
  // Parse Hedera 0.0.X format to EVM long-zero address
  const match = trimmed.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (match) {
    const num = BigInt(match[3]);
    const hex = num.toString(16).padStart(8, '0');
    return ('0x' + '0'.repeat(32) + hex).toLowerCase();
  }
  throw new Error(`[HEDERA_CONFIG_ERROR] Invalid account ID or EVM address format: "${accountOrAddress}"`);
}

/**
 * Creates an authenticated Hedera Client for the Compliance role.
 */
export function getComplianceClient(): Client {
  const { accounts } = getHederaConfig();
  if (!accounts.compliance.accountId || !accounts.compliance.privateKey) {
    throw new Error('[HEDERA_CONFIG_ERROR] Compliance operator credentials not configured in environment.');
  }
  const client = Client.forTestnet();
  client.setOperator(
    accounts.compliance.accountId,
    PrivateKey.fromStringECDSA(accounts.compliance.privateKey)
  );
  return client;
}

/**
 * Creates an authenticated Hedera Client for the Issuer-Agent role.
 */
export function getIssuerClient(): Client {
  const { accounts } = getHederaConfig();
  if (!accounts.issuerAgent.accountId || !accounts.issuerAgent.privateKey) {
    throw new Error('[HEDERA_CONFIG_ERROR] Issuer-Agent operator credentials not configured in environment.');
  }
  const client = Client.forTestnet();
  client.setOperator(
    accounts.issuerAgent.accountId,
    PrivateKey.fromStringECDSA(accounts.issuerAgent.privateKey)
  );
  return client;
}

/**
 * Creates an authenticated Hedera Client for the Pauser role.
 */
export function getPauserClient(): Client {
  const { accounts } = getHederaConfig();
  if (!accounts.pauser.accountId || !accounts.pauser.privateKey) {
    throw new Error('[HEDERA_CONFIG_ERROR] Pauser operator credentials not configured in environment.');
  }
  const client = Client.forTestnet();
  client.setOperator(
    accounts.pauser.accountId,
    PrivateKey.fromStringECDSA(accounts.pauser.privateKey)
  );
  return client;
}

/**
 * Creates an authenticated Hedera Client for the Deployer/Admin role.
 */
export function getDeployerClient(): Client {
  const { accounts } = getHederaConfig();
  if (!accounts.deployer.accountId || !accounts.deployer.privateKey) {
    throw new Error('[HEDERA_CONFIG_ERROR] Deployer operator credentials not configured in environment.');
  }
  const client = Client.forTestnet();
  client.setOperator(
    accounts.deployer.accountId,
    PrivateKey.fromStringECDSA(accounts.deployer.privateKey)
  );
  return client;
}

/**
 * Formats a real Hedera transaction ID to HashScan explorer URL.
 */
export function getHashScanTxUrl(txId: string): string {
  const [acc, time] = txId.split('@');
  const formatted = time ? `${acc}-${time.replace('.', '-')}` : txId;
  return `https://hashscan.io/testnet/transaction/${formatted}`;
}
