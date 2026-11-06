import { getAtsAdapter } from '../lib/hedera/ats-adapter';
import { clearChainReadCache, readPauseState } from '../lib/hedera/chain-reads';

async function main() {
  const adapter = getAtsAdapter();
  console.log('Unpausing asset on Hedera Testnet via Pauser key...');
  const txRef = await adapter.unpauseAsset();
  console.log('Unpause tx:', txRef);
  clearChainReadCache();
  const state = await readPauseState();
  console.log('New pause state on-chain:', state);
}

main().catch(console.error);

