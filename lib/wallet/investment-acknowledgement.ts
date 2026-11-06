/**
 * NIVASA - Investment Acknowledgement EIP-191 Formatter & Verifier
 * ARCH §15.2 · PRD FR-5.1 · PLAN M5.1
 *
 * Formats deterministic message for investor signing prior to order creation:
 * - offering ID
 * - rights version
 * - rights document hash
 * - units
 * - unit price INR
 * - total amount INR
 * - bound wallet address
 * - nonce
 * - expiry timestamp (ISO)
 * - non-voting fractional simulated demo disclaimer statement
 */

export const CANONICAL_SIMULATED_DEMO_STATEMENT =
  'I acknowledge that this offering is a simulated demo on Hedera Testnet and does not represent real financial investment, legal title, or ownership of physical real estate.';

export interface InvestmentAcknowledgementParams {
  offeringId: string;
  rightsVersion: number;
  rightsDocumentHash: string;
  units: string;
  unitPriceInr: string;
  totalAmountInr: string;
  walletAddress: string;
  nonce: string;
  expiresAt: string;
  statement?: string;
}

export function buildInvestmentAcknowledgementMessage(
  params: InvestmentAcknowledgementParams
): string {
  const statement = params.statement || CANONICAL_SIMULATED_DEMO_STATEMENT;
  const canonicalExpires = new Date(params.expiresAt).toISOString();
  const normalizedWallet = params.walletAddress.toLowerCase();

  return [
    'NIVASA Investment Order Acknowledgement',
    `Offering ID: ${params.offeringId}`,
    `Rights Version: ${params.rightsVersion}`,
    `Rights Document Hash: ${params.rightsDocumentHash}`,
    `Units: ${params.units}`,
    `Unit Price INR: ${params.unitPriceInr}`,
    `Total Amount INR: ${params.totalAmountInr}`,
    `Wallet: ${normalizedWallet}`,
    `Nonce: ${params.nonce}`,
    `Expires: ${canonicalExpires}`,
    `Disclaimer: ${statement}`,
  ].join('\n');
}
