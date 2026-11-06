/**
 * NIVASA - Public Receipt Verification Service (D3)
 * ARCH §13.2, §20 · PRD FR-7.3 · UI §8.10 · PLAN M11.4
 *
 * Verifies settlement proof using unguessable token.
 * Strictly non-personal data:
 * - Units & unit price snapshot
 * - Rights version & rights document hash
 * - EIP-191 signature recovery check against bound wallet
 * - Allocation transaction ID & HashScan link
 * - On-chain ATS token balance check (balance >= units)
 * - Shortened wallet address (e.g. 0x1234...abcd)
 * - ZERO investor name, email, profile, or PII exposed
 */

import { ethers } from 'ethers';
import { getAdminDbClient } from '@/lib/db/admin';
import { getHashScanTxUrl, getHederaConfig } from '@/lib/hedera/config';
import { defaultChainReader, ChainReader, VerificationStatus } from './checks';

export interface PublicReceiptVerification {
  receiptToken: string;
  orderId: string;
  tokenName: string;
  tokenSymbol: string;
  tokenContractId: string;
  units: number;
  unitPriceInr: string;
  totalAmountInr: string;
  rightsVersion: number;
  rightsDocumentHash: string;
  shortenedWallet: string;
  rawWallet: string; // Internal for verification, omitted in public json or truncated
  signatureRecovered: boolean;
  signatureStatus: VerificationStatus;
  onChainBalanceStatus: VerificationStatus;
  onChainBalanceUnits: number | null;
  allocationTxId: string | null;
  allocationTxUrl: string | null;
  attemptNo: number;
  confirmedAt: string | null;
  checkedAt: string;
  limitation: string;
}

/**
 * Verifies public settlement receipt with cryptographic signature recovery
 * and live on-chain balance check against Hedera Testnet ATS contract.
 */
export async function verifyPublicReceipt(
  receiptToken: string,
  customChainReader?: ChainReader
): Promise<PublicReceiptVerification | null> {
  const admin = getAdminDbClient();
  const chainReader = customChainReader || defaultChainReader;
  const checkedAt = new Date().toISOString();
  const limitation =
    'This receipt proves cryptographic settlement and ATS token allocation on Hedera Testnet; it is not proof of real-world title, deed transfer, or registered legal property ownership.';

  // 1. Fetch completed order by unguessable receipt_token
  const { data: order, error } = await admin
    .from('investment_orders')
    .select('id, offering_id, units, unit_price_inr, amount_inr, rights_version, rights_document_hash, ack_message, ack_signature, ack_wallet, status, created_at, updated_at')
    .eq('receipt_token', receiptToken)
    .single();

  if (error || !order || order.status !== 'COMPLETED') {
    return null;
  }

  // 2. Fetch offering details
  const { data: offering } = await admin
    .from('offerings')
    .select('token_name, token_symbol, token_contract_id')
    .eq('id', order.offering_id)
    .single();

  // 3. Fetch confirmed allocation attempt
  const { data: attempt } = await admin
    .from('allocation_attempts')
    .select('chain_tx_id, attempt_no, confirmed_at')
    .eq('order_id', order.id)
    .eq('status', 'confirmed')
    .order('attempt_no', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 4. Verify EIP-191 signature recovery against bound wallet
  let signatureRecovered = false;
  let signatureStatus: VerificationStatus = 'FAIL';

  if (order.ack_message && order.ack_signature && order.ack_wallet) {
    try {
      const recoveredAddress = ethers.verifyMessage(order.ack_message, order.ack_signature);
      if (recoveredAddress.toLowerCase() === order.ack_wallet.toLowerCase()) {
        signatureRecovered = true;
        signatureStatus = 'PASS';
      }
    } catch {
      signatureRecovered = false;
      signatureStatus = 'FAIL';
    }
  }

  // 5. Verify on-chain balance >= units via chainReader
  let onChainBalanceStatus: VerificationStatus = 'UNAVAILABLE';
  let onChainBalanceUnits: number | null = null;
  const assetAddress = offering?.token_contract_id || getHederaConfig().assetAddress;

  if (chainReader.readHolderBalance && order.ack_wallet) {
    try {
      const balance = await chainReader.readHolderBalance(order.ack_wallet, assetAddress);
      if (balance !== null) {
        onChainBalanceUnits = Number(balance);
        if (balance >= BigInt(order.units)) {
          onChainBalanceStatus = 'PASS';
        } else {
          onChainBalanceStatus = 'FAIL';
        }
      }
    } catch {
      onChainBalanceStatus = 'UNAVAILABLE';
    }
  }

  // Format shortened wallet (ARCH §13.2: 0x1234...abcd)
  const wallet = order.ack_wallet || '';
  const shortenedWallet = wallet.length > 10
    ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}`
    : wallet;

  return {
    receiptToken,
    orderId: order.id,
    tokenName: offering?.token_name || 'NIVASA Commercial 001',
    tokenSymbol: offering?.token_symbol || 'PROPERTY-MH-001',
    tokenContractId: assetAddress,
    units: Number(order.units),
    unitPriceInr: order.unit_price_inr,
    totalAmountInr: order.amount_inr,
    rightsVersion: order.rights_version,
    rightsDocumentHash: order.rights_document_hash,
    shortenedWallet,
    rawWallet: wallet,
    signatureRecovered,
    signatureStatus,
    onChainBalanceStatus,
    onChainBalanceUnits,
    allocationTxId: attempt?.chain_tx_id || null,
    allocationTxUrl: attempt?.chain_tx_id ? getHashScanTxUrl(attempt.chain_tx_id) : null,
    attemptNo: attempt?.attempt_no || 1,
    confirmedAt: attempt?.confirmed_at || order.updated_at,
    checkedAt,
    limitation,
  };
}
