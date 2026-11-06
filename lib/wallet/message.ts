/**
 * NIVASA - Wallet Binding EIP-191 Message Formatter
 * ARCH §15.1 · PLAN M4.3
 */

export interface WalletVerificationMessageParams {
  domain?: string;
  userId: string;
  nonce: string;
  chainId?: number;
  expiresAt: string;
}

export function buildWalletVerificationMessage(params: WalletVerificationMessageParams): string {
  const domain = params.domain || 'nivasa.realestate';
  const chainId = params.chainId ?? 296;
  const canonicalExpires = new Date(params.expiresAt).toISOString();

  return [
    'NIVASA Demo Wallet Verification',
    `Domain: ${domain}`,
    `User ID: ${params.userId}`,
    `Nonce: ${params.nonce}`,
    `Chain ID: ${chainId}`,
    `Expires: ${canonicalExpires}`,
  ].join('\n');
}
