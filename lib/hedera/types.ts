/**
 * NIVASA - Hedera ATS Adapter Types & Interfaces
 * ARCH §8.3–§8.5 · PRD FR-6.1–FR-6.6 · PLAN M4
 */

export type AtsAdapterMode = 'sdk' | 'manual';

export interface AssetConfig {
  contractId: string;
  evmAddress: string;
  symbol: string;
  name: string;
  isin: string;
  maxSupply: bigint;
  currentSupply: bigint;
  isPaused: boolean;
  internalKycActive: boolean;
  rightsDocumentHash?: string;
  manifestDocumentHash?: string;
  lastSyncAt: string;
}

export interface TxRef {
  txId: string;
  consensusTimestamp?: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'UNKNOWN';
  hashScanUrl?: string;
  raw?: any;
}

export interface PreparedTx {
  txId: string;
  targetContract: string;
  functionName: string;
  args: any[];
  encodedCalldata: string;
  callerRole: 'compliance' | 'issuer' | 'pauser' | 'deployer';
  createdAt: string;
}

export interface TxStatus {
  txId: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'NOT_FOUND';
  consensusTimestamp?: string;
  blockNumber?: number;
  result?: string;
  errorMessage?: string;
}

export interface ChainReadResult<T> {
  data: T | null;
  status: 'CONFIRMED' | 'PENDING' | 'UNAVAILABLE';
  lastSyncAt: string;
  source: 'mirror_node' | 'json_rpc';
  error?: string;
}

/**
 * Narrow AtsAdapter interface from ARCH §8.5.
 * Only methods proven in Milestone M1 are implemented.
 */
export interface AtsAdapter {
  mode: AtsAdapterMode;
  getAssetConfiguration(assetRef?: string): Promise<AssetConfig>;
  registerInvestor(wallet: string, validUntil: Date): Promise<TxRef>;
  revokeInvestor(wallet: string): Promise<TxRef>;
  setDocument(assetRef: string, name: string, uri: string, hash: string): Promise<TxRef>;
  getDocument(assetRef: string, name: string): Promise<{ uri: string; hash: string; lastModified?: Date }>;
  pauseAsset(assetRef?: string): Promise<TxRef>;
  unpauseAsset(assetRef?: string): Promise<TxRef>;
  isPaused(assetRef?: string): Promise<boolean>;
  prepareIssue(orderId: string, wallet: string, units: bigint): Promise<PreparedTx>;
  submitPrepared(p: PreparedTx): Promise<TxRef>;
  getHolderBalance(assetRef: string, wallet: string): Promise<bigint>;
  getTxStatus(txId: string): Promise<TxStatus>;
  canTransfer(assetRef: string, from: string, to: string, units: bigint): Promise<boolean>;
}
