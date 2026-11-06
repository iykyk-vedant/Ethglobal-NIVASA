/**
 * NIVASA - ATS Adapter (Narrow Hedera Boundary)
 * ARCH §8.5 · PRD FR-6.2 · PLAN M4
 *
 * Implements the AtsAdapter interface with role-separated keys:
 * - Compliance key: registerInvestor, revokeInvestor
 * - Pauser key: pauseAsset, unpauseAsset
 * - Issuer-agent key: prepareIssue, submitPrepared
 * - Deployer/Admin key: setDocument
 *
 * Supports 'sdk' and 'manual' modes.
 * Zero signing of client-supplied calldata.
 */

import {
  Client,
  PrivateKey,
  ContractExecuteTransaction,
  ContractId,
  TransactionId,
  AccountId,
} from '@hashgraph/sdk';
import { ethers } from 'ethers';
import { createRequire } from 'module';
import {
  getHederaConfig,
  getComplianceClient,
  getIssuerClient,
  getPauserClient,
  getDeployerClient,
  toEvmAddress,
  getHashScanTxUrl,
} from './config';
import {
  AtsAdapter,
  AtsAdapterMode,
  AssetConfig,
  TxRef,
  PreparedTx,
  TxStatus,
} from './types';
import {
  readTokenSupply,
  readHolderBalance,
  readKycStatus,
  readPauseState,
  readDocument,
  verifyMirrorTransaction,
} from './chain-reads';

const req = createRequire(import.meta.url);
const {
  KycFacet__factory,
  PauseFacet__factory,
  MintFacet__factory,
  DocumentationFacet__factory,
} = req('@hashgraph/asset-tokenization-contracts/typechain-types');

const kycIface = KycFacet__factory.createInterface();
const pauseIface = PauseFacet__factory.createInterface();
const mintIface = MintFacet__factory.createInterface();
const docIface = DocumentationFacet__factory.createInterface();

export class SdkAtsAdapter implements AtsAdapter {
  readonly mode: AtsAdapterMode = 'sdk';

  async getAssetConfiguration(assetRef?: string): Promise<AssetConfig> {
    const config = getHederaConfig();
    const targetAddress = assetRef ? toEvmAddress(assetRef) : config.assetAddress;
    const contractId = config.assetContractId;

    const [supplyResult, pauseResult, rightsDoc, manifestDoc] = await Promise.all([
      readTokenSupply(targetAddress),
      readPauseState(targetAddress),
      readDocument('rights', targetAddress),
      readDocument('evidence-manifest', targetAddress),
    ]);

    return {
      contractId,
      evmAddress: targetAddress,
      symbol: 'PROPERTY-MH-001',
      name: 'Godrej Platina Commercial Wing A',
      isin: 'INE002A01018',
      maxSupply: supplyResult.data?.maxSupply ?? 10000n,
      currentSupply: supplyResult.data?.totalUnits ?? 0n,
      isPaused: pauseResult.data ?? false,
      internalKycActive: true,
      rightsDocumentHash: rightsDoc.data?.hash,
      manifestDocumentHash: manifestDoc.data?.hash,
      lastSyncAt: new Date().toISOString(),
    };
  }

  async registerInvestor(wallet: string, validUntil: Date): Promise<TxRef> {
    const config = getHederaConfig();
    const evmWallet = toEvmAddress(wallet);
    const client = getComplianceClient();
    // Compliance public key address is the registered SSI issuer on-chain
    const complianceEvm = ('0x' + PrivateKey.fromStringECDSA(config.accounts.compliance.privateKey).publicKey.toEvmAddress()).toLowerCase();

    const nowSec = Math.floor(Date.now() / 1000);
    const validFromSec = nowSec - 60; // 1 minute buffer for clock skew
    const validToSec = Math.floor(validUntil.getTime() / 1000);
    const vcId = `VC-NIVASA-${Date.now()}`;

    // grantKyc(address _investor, string _vcId, uint256 _validFrom, uint256 _validTo, address _issuer)
    const calldata = kycIface.encodeFunctionData('grantKyc', [
      evmWallet,
      vcId,
      validFromSec,
      validToSec,
      complianceEvm,
    ]);

    const tx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(config.assetContractId))
      .setGas(600_000)
      .setFunctionParameters(Buffer.from(calldata.slice(2), 'hex'));

    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);
    const txId = response.transactionId.toString();

    const isSuccess = receipt.status.toString() === 'SUCCESS';
    return {
      txId,
      status: isSuccess ? 'SUCCESS' : 'FAILED',
      hashScanUrl: getHashScanTxUrl(txId),
      raw: { receiptStatus: receipt.status.toString(), vcId },
    };
  }

  async revokeInvestor(wallet: string): Promise<TxRef> {
    const config = getHederaConfig();
    const evmWallet = toEvmAddress(wallet);
    const client = getComplianceClient();

    const calldata = kycIface.encodeFunctionData('revokeKyc', [evmWallet]);

    const tx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(config.assetContractId))
      .setGas(400_000)
      .setFunctionParameters(Buffer.from(calldata.slice(2), 'hex'));

    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);
    const txId = response.transactionId.toString();

    const isSuccess = receipt.status.toString() === 'SUCCESS';
    return {
      txId,
      status: isSuccess ? 'SUCCESS' : 'FAILED',
      hashScanUrl: getHashScanTxUrl(txId),
      raw: { receiptStatus: receipt.status.toString() },
    };
  }

  async setDocument(assetRef: string, name: string, uri: string, hash: string): Promise<TxRef> {
    const config = getHederaConfig();
    const client = getDeployerClient();
    const bytes32Name = ethers.encodeBytes32String(name);
    const bytes32Hash = hash.startsWith('0x') && hash.length === 66 ? hash : ethers.keccak256(ethers.toUtf8Bytes(hash));

    const calldata = docIface.encodeFunctionData('setDocument', [bytes32Name, uri, bytes32Hash]);

    const tx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(config.assetContractId))
      .setGas(500_000)
      .setFunctionParameters(Buffer.from(calldata.slice(2), 'hex'));

    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);
    const txId = response.transactionId.toString();

    return {
      txId,
      status: receipt.status.toString() === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
      hashScanUrl: getHashScanTxUrl(txId),
    };
  }

  async getDocument(assetRef: string, name: string): Promise<{ uri: string; hash: string; lastModified?: Date }> {
    const docResult = await readDocument(name, assetRef);
    if (!docResult.data) {
      throw new Error(`Document "${name}" unavailable from chain: ${docResult.error}`);
    }
    return {
      uri: docResult.data.uri,
      hash: docResult.data.hash,
      lastModified: new Date(docResult.data.lastModified * 1000),
    };
  }

  async pauseAsset(assetRef?: string): Promise<TxRef> {
    const config = getHederaConfig();
    const client = getPauserClient();

    const calldata = pauseIface.encodeFunctionData('pause', []);

    const tx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(config.assetContractId))
      .setGas(300_000)
      .setFunctionParameters(Buffer.from(calldata.slice(2), 'hex'));

    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);
    const txId = response.transactionId.toString();

    return {
      txId,
      status: receipt.status.toString() === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
      hashScanUrl: getHashScanTxUrl(txId),
    };
  }

  async unpauseAsset(assetRef?: string): Promise<TxRef> {
    const config = getHederaConfig();
    const client = getPauserClient();

    const calldata = pauseIface.encodeFunctionData('unpause', []);

    const tx = new ContractExecuteTransaction()
      .setContractId(ContractId.fromString(config.assetContractId))
      .setGas(300_000)
      .setFunctionParameters(Buffer.from(calldata.slice(2), 'hex'));

    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);
    const txId = response.transactionId.toString();

    return {
      txId,
      status: receipt.status.toString() === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
      hashScanUrl: getHashScanTxUrl(txId),
    };
  }

  async isPaused(assetRef?: string): Promise<boolean> {
    const res = await readPauseState(assetRef);
    if (res.data === null) {
      throw new Error(`Unable to determine pause state: ${res.error}`);
    }
    return res.data;
  }

  async prepareIssue(orderId: string, wallet: string, units: bigint): Promise<PreparedTx> {
    const config = getHederaConfig();
    const evmWallet = toEvmAddress(wallet);
    const issuerAccountId = AccountId.fromString(config.accounts.issuerAgent.accountId);

    // Explicit deterministic TransactionId generated upfront per ARCH §14.1
    const txId = TransactionId.generate(issuerAccountId).toString();
    const calldata = mintIface.encodeFunctionData('issue', [evmWallet, units, '0x']);

    return {
      txId,
      targetContract: config.assetContractId,
      functionName: 'issue',
      args: [evmWallet, units.toString(), '0x'],
      encodedCalldata: calldata,
      callerRole: 'issuer',
      createdAt: new Date().toISOString(),
    };
  }

  async submitPrepared(p: PreparedTx): Promise<TxRef> {
    const config = getHederaConfig();
    const client = getIssuerClient();

    const tx = new ContractExecuteTransaction()
      .setTransactionId(TransactionId.fromString(p.txId))
      .setContractId(ContractId.fromString(p.targetContract))
      .setGas(800_000)
      .setFunctionParameters(Buffer.from(p.encodedCalldata.slice(2), 'hex'));

    const response = await tx.execute(client);
    const receipt = await response.getReceipt(client);
    const txId = response.transactionId.toString();

    return {
      txId,
      status: receipt.status.toString() === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
      hashScanUrl: getHashScanTxUrl(txId),
    };
  }

  async getHolderBalance(assetRef: string, wallet: string): Promise<bigint> {
    const res = await readHolderBalance(wallet, assetRef);
    if (res.data === null) {
      throw new Error(`Balance read unavailable for ${wallet}: ${res.error}`);
    }
    return res.data;
  }

  async getTxStatus(txId: string): Promise<TxStatus> {
    const res = await verifyMirrorTransaction(txId);
    if (res.status === 'PENDING') {
      return { txId, status: 'PENDING' };
    }
    if (res.data?.confirmed) {
      return { txId, status: 'SUCCESS', consensusTimestamp: res.data.timestamp, result: res.data.result };
    }
    return { txId, status: 'FAILED', result: res.data?.result || res.error };
  }

  async canTransfer(assetRef: string, from: string, to: string, units: bigint): Promise<boolean> {
    const [paused, fromKyc, toKyc, fromBal] = await Promise.all([
      this.isPaused(assetRef),
      readKycStatus(from, assetRef),
      readKycStatus(to, assetRef),
      this.getHolderBalance(assetRef, from),
    ]);

    if (paused) return false;
    if (fromKyc.data !== 1 || toKyc.data !== 1) return false;
    if (fromBal < units) return false;
    return true;
  }
}

/**
 * Disclosed manual mode fallback per ARCH §8.5 and Milestone M1 decision.
 */
export class ManualAtsAdapter implements AtsAdapter {
  readonly mode: AtsAdapterMode = 'manual';

  async getAssetConfiguration(assetRef?: string): Promise<AssetConfig> {
    const sdk = new SdkAtsAdapter();
    return sdk.getAssetConfiguration(assetRef);
  }

  async registerInvestor(wallet: string, validUntil: Date): Promise<TxRef> {
    const evmWallet = toEvmAddress(wallet);
    return {
      txId: `MANUAL_REGISTER_${Date.now()}`,
      status: 'PENDING',
      raw: { action: 'registerInvestor', wallet: evmWallet, validUntil },
    };
  }

  async revokeInvestor(wallet: string): Promise<TxRef> {
    const evmWallet = toEvmAddress(wallet);
    return {
      txId: `MANUAL_REVOKE_${Date.now()}`,
      status: 'PENDING',
      raw: { action: 'revokeInvestor', wallet: evmWallet },
    };
  }

  async setDocument(assetRef: string, name: string, uri: string, hash: string): Promise<TxRef> {
    return {
      txId: `MANUAL_DOC_${Date.now()}`,
      status: 'PENDING',
      raw: { action: 'setDocument', name, uri, hash },
    };
  }

  async getDocument(assetRef: string, name: string): Promise<{ uri: string; hash: string; lastModified?: Date }> {
    const sdk = new SdkAtsAdapter();
    return sdk.getDocument(assetRef, name);
  }

  async pauseAsset(assetRef?: string): Promise<TxRef> {
    return {
      txId: `MANUAL_PAUSE_${Date.now()}`,
      status: 'PENDING',
      raw: { action: 'pauseAsset' },
    };
  }

  async unpauseAsset(assetRef?: string): Promise<TxRef> {
    return {
      txId: `MANUAL_UNPAUSE_${Date.now()}`,
      status: 'PENDING',
      raw: { action: 'unpauseAsset' },
    };
  }

  async isPaused(assetRef?: string): Promise<boolean> {
    const sdk = new SdkAtsAdapter();
    return sdk.isPaused(assetRef);
  }

  async prepareIssue(orderId: string, wallet: string, units: bigint): Promise<PreparedTx> {
    const sdk = new SdkAtsAdapter();
    return sdk.prepareIssue(orderId, wallet, units);
  }

  async submitPrepared(p: PreparedTx): Promise<TxRef> {
    return {
      txId: `MANUAL_ISSUE_${Date.now()}`,
      status: 'PENDING',
      raw: p,
    };
  }

  async getHolderBalance(assetRef: string, wallet: string): Promise<bigint> {
    const sdk = new SdkAtsAdapter();
    return sdk.getHolderBalance(assetRef, wallet);
  }

  async getTxStatus(txId: string): Promise<TxStatus> {
    const sdk = new SdkAtsAdapter();
    return sdk.getTxStatus(txId);
  }

  async canTransfer(assetRef: string, from: string, to: string, units: bigint): Promise<boolean> {
    const sdk = new SdkAtsAdapter();
    return sdk.canTransfer(assetRef, from, to, units);
  }
}

/**
 * Adapter factory returning the active adapter implementation based on ATS_ADAPTER_MODE.
 */
let cachedAdapter: AtsAdapter | null = null;

export function getAtsAdapter(): AtsAdapter {
  if (cachedAdapter) return cachedAdapter;
  const { adapterMode } = getHederaConfig();
  if (adapterMode === 'manual') {
    cachedAdapter = new ManualAtsAdapter();
  } else {
    cachedAdapter = new SdkAtsAdapter();
  }
  return cachedAdapter;
}
