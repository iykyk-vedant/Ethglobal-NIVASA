/**
 * NIVASA - Hedera Chain Read Service
 * ARCH §8.3 · PRD FR-6.5 · PLAN M4
 *
 * Reads contract state via Mirror Node contract-call REST endpoints.
 * Never calls HTS token endpoints directly (ATS assets are ERC-1400 / Diamond EVM contracts).
 * Fail-closed: on network, contract, or Mirror Node errors, returns UNAVAILABLE with timestamp.
 * Never returns a default 0 or false on read failure.
 */

import { ethers } from 'ethers';
import { createRequire } from 'module';
import { getHederaConfig, toEvmAddress } from './config';
import { ChainReadResult } from './types';

const req = createRequire(import.meta.url);
const {
  BalanceTrackerFacet__factory,
  CapFacet__factory,
  PauseFacet__factory,
  KycFacet__factory,
  DocumentationFacet__factory,
} = req('@hashgraph/asset-tokenization-contracts/typechain-types');

const balanceIface = BalanceTrackerFacet__factory.createInterface();
const capIface = CapFacet__factory.createInterface();
const pauseIface = PauseFacet__factory.createInterface();
const kycIface = KycFacet__factory.createInterface();
const docIface = DocumentationFacet__factory.createInterface();

// In-memory cache with 5-second TTL to avoid rate-limiting Mirror Node
interface CacheEntry<T> {
  result: ChainReadResult<T>;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry<any>>();
const CACHE_TTL_MS = 5000;

function getCached<T>(key: string): ChainReadResult<T> | null {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.result;
  }
  return null;
}

function setCached<T>(key: string, result: ChainReadResult<T>): ChainReadResult<T> {
  cache.set(key, {
    result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
  return result;
}

/**
 * Executes a read-only EVM contract call via Hedera Mirror Node.
 */
async function callMirrorContract(toAddress: string, data: string): Promise<string> {
  const { mirrorNodeUrl } = getHederaConfig();
  const url = `${mirrorNodeUrl}/api/v1/contracts/call`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second network timeout

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        to: toAddress,
        data,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Mirror Node HTTP ${res.status}: ${errText}`);
    }

    const json = await res.json();
    if (!json.result || json.result === '0x') {
      throw new Error(`Mirror Node returned empty contract result for target ${toAddress}`);
    }
    return json.result;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Reads token total supply and max cap from ATS Diamond.
 */
export async function readTokenSupply(
  assetAddress?: string
): Promise<ChainReadResult<{ totalUnits: bigint; maxSupply: bigint }>> {
  const config = getHederaConfig();
  const target = assetAddress || config.assetAddress;
  const cacheKey = `supply:${target}`;

  const cached = getCached<{ totalUnits: bigint; maxSupply: bigint }>(cacheKey);
  if (cached) return cached;

  const lastSyncAt = new Date().toISOString();

  try {
    const supplyCalldata = balanceIface.encodeFunctionData('totalSupply', []);
    const capCalldata = capIface.encodeFunctionData('getMaxSupply', []);

    const [supplyRaw, capRaw] = await Promise.all([
      callMirrorContract(target, supplyCalldata),
      callMirrorContract(target, capCalldata),
    ]);

    const decodedSupply = balanceIface.decodeFunctionResult('totalSupply', supplyRaw);
    const decodedCap = capIface.decodeFunctionResult('getMaxSupply', capRaw);

    const result: ChainReadResult<{ totalUnits: bigint; maxSupply: bigint }> = {
      data: {
        totalUnits: BigInt(decodedSupply[0].toString()),
        maxSupply: BigInt(decodedCap[0].toString()),
      },
      status: 'CONFIRMED',
      lastSyncAt,
      source: 'mirror_node',
    };

    return setCached(cacheKey, result);
  } catch (err: any) {
    return {
      data: null,
      status: 'UNAVAILABLE',
      lastSyncAt,
      source: 'mirror_node',
      error: err.message || 'Failed to read token supply from Mirror Node',
    };
  }
}

/**
 * Reads token holder balance from ATS Diamond for a specific wallet address.
 */
export async function readHolderBalance(
  wallet: string,
  assetAddress?: string
): Promise<ChainReadResult<bigint>> {
  const config = getHederaConfig();
  const target = assetAddress || config.assetAddress;
  const evmWallet = toEvmAddress(wallet);
  const cacheKey = `balance:${target}:${evmWallet}`;

  const cached = getCached<bigint>(cacheKey);
  if (cached) return cached;

  const lastSyncAt = new Date().toISOString();

  try {
    const balanceCalldata = balanceIface.encodeFunctionData('balanceOf', [evmWallet]);
    const raw = await callMirrorContract(target, balanceCalldata);
    const decoded = balanceIface.decodeFunctionResult('balanceOf', raw);

    const result: ChainReadResult<bigint> = {
      data: BigInt(decoded[0].toString()),
      status: 'CONFIRMED',
      lastSyncAt,
      source: 'mirror_node',
    };

    return setCached(cacheKey, result);
  } catch (err: any) {
    return {
      data: null,
      status: 'UNAVAILABLE',
      lastSyncAt,
      source: 'mirror_node',
      error: err.message || `Failed to read balance for ${wallet}`,
    };
  }
}

/**
 * Reads on-chain KYC status for a wallet address from ATS KycFacet.
 * Returns: 0 = NOT_GRANTED, 1 = GRANTED, 2 = REVOKED
 */
export async function readKycStatus(
  wallet: string,
  assetAddress?: string
): Promise<ChainReadResult<number>> {
  const config = getHederaConfig();
  const target = assetAddress || config.assetAddress;
  const evmWallet = toEvmAddress(wallet);
  const cacheKey = `kyc:${target}:${evmWallet}`;

  const cached = getCached<number>(cacheKey);
  if (cached) return cached;

  const lastSyncAt = new Date().toISOString();

  try {
    const kycCalldata = kycIface.encodeFunctionData('getKycStatusFor', [evmWallet]);
    const raw = await callMirrorContract(target, kycCalldata);
    const decoded = kycIface.decodeFunctionResult('getKycStatusFor', raw);

    const statusNum = Number(decoded[0]);

    const result: ChainReadResult<number> = {
      data: statusNum,
      status: 'CONFIRMED',
      lastSyncAt,
      source: 'mirror_node',
    };

    return setCached(cacheKey, result);
  } catch (err: any) {
    return {
      data: null,
      status: 'UNAVAILABLE',
      lastSyncAt,
      source: 'mirror_node',
      error: err.message || `Failed to read KYC status for ${wallet}`,
    };
  }
}

/**
 * Reads pause state from ATS Pausable/PauseFacet.
 */
export async function readPauseState(
  assetAddress?: string
): Promise<ChainReadResult<boolean>> {
  const config = getHederaConfig();
  const target = assetAddress || config.assetAddress;
  const cacheKey = `paused:${target}`;

  const cached = getCached<boolean>(cacheKey);
  if (cached) return cached;

  const lastSyncAt = new Date().toISOString();

  try {
    const pausedCalldata = pauseIface.encodeFunctionData('paused', []);
    const raw = await callMirrorContract(target, pausedCalldata);
    const decoded = pauseIface.decodeFunctionResult('paused', raw);

    const result: ChainReadResult<boolean> = {
      data: Boolean(decoded[0]),
      status: 'CONFIRMED',
      lastSyncAt,
      source: 'mirror_node',
    };

    return setCached(cacheKey, result);
  } catch (err: any) {
    return {
      data: null,
      status: 'UNAVAILABLE',
      lastSyncAt,
      source: 'mirror_node',
      error: err.message || 'Failed to read pause state from Mirror Node',
    };
  }
}

/**
 * Reads document entry from ATS DocumentationFacet (e.g. 'rights', 'evidence-manifest').
 */
export async function readDocument(
  name: string,
  assetAddress?: string
): Promise<ChainReadResult<{ uri: string; hash: string; lastModified: number }>> {
  const config = getHederaConfig();
  const target = assetAddress || config.assetAddress;
  const bytes32Name = ethers.encodeBytes32String(name);
  const cacheKey = `doc:${target}:${name}`;

  const cached = getCached<{ uri: string; hash: string; lastModified: number }>(cacheKey);
  if (cached) return cached;

  const lastSyncAt = new Date().toISOString();

  try {
    const docCalldata = docIface.encodeFunctionData('getDocument', [bytes32Name]);
    const raw = await callMirrorContract(target, docCalldata);
    const decoded = docIface.decodeFunctionResult('getDocument', raw);

    const result: ChainReadResult<{ uri: string; hash: string; lastModified: number }> = {
      data: {
        uri: decoded[0],
        hash: decoded[1],
        lastModified: Number(decoded[2]),
      },
      status: 'CONFIRMED',
      lastSyncAt,
      source: 'mirror_node',
    };

    return setCached(cacheKey, result);
  } catch (err: any) {
    return {
      data: null,
      status: 'UNAVAILABLE',
      lastSyncAt,
      source: 'mirror_node',
      error: err.message || `Failed to read document "${name}"`,
    };
  }
}

/**
 * Verifies transaction confirmation against Mirror Node.
 * Confirmed = SUCCESS receipt + transaction record visible in Mirror Node.
 */
export async function verifyMirrorTransaction(
  txId: string
): Promise<ChainReadResult<{ confirmed: boolean; result: string; timestamp?: string }>> {
  const { mirrorNodeUrl } = getHederaConfig();
  // Standard Hedera txId: "0.0.X@12345.678" -> Mirror Node format: "0.0.X-12345-678"
  const [acc, time] = txId.split('@');
  const formattedId = time ? `${acc}-${time.replace('.', '-')}` : txId;
  const url = `${mirrorNodeUrl}/api/v1/transactions/${formattedId}`;
  const lastSyncAt = new Date().toISOString();

  try {
    let res = await fetch(url);
    if (!res.ok && res.status === 404) {
      for (let retry = 0; retry < 3; retry++) {
        await new Promise((r) => setTimeout(r, 1500));
        res = await fetch(url);
        if (res.ok) break;
      }
    }
    if (!res.ok) {
      if (res.status === 404) {
        return {
          data: { confirmed: false, result: 'PENDING_MIRROR_INGESTION' },
          status: 'PENDING',
          lastSyncAt,
          source: 'mirror_node',
        };
      }
      throw new Error(`Mirror Node returned status ${res.status}`);
    }

    const data = await res.json();
    const transactions = data.transactions || [];
    if (transactions.length === 0) {
      return {
        data: { confirmed: false, result: 'NOT_FOUND' },
        status: 'PENDING',
        lastSyncAt,
        source: 'mirror_node',
      };
    }

    const firstTx = transactions[0];
    const isSuccess = firstTx.result === 'SUCCESS';

    return {
      data: {
        confirmed: isSuccess,
        result: firstTx.result,
        timestamp: firstTx.consensus_timestamp,
      },
      status: isSuccess ? 'CONFIRMED' : 'UNAVAILABLE',
      lastSyncAt,
      source: 'mirror_node',
    };
  } catch (err: any) {
    return {
      data: null,
      status: 'UNAVAILABLE',
      lastSyncAt,
      source: 'mirror_node',
      error: err.message || `Failed to verify transaction ${txId}`,
    };
  }
}
