/**
 * Scripted Property Events & Demo Flag Helpers
 * ARCH §16.3, §19 · PRD FR-8.2 · UI §8.8
 */

import { isProductionRuntime } from '@/lib/env';

export function isPropertyEventsEnabled(): boolean {
  if (isProductionRuntime()) return false;
  return process.env.DEMO_EVENTS === 'true' || process.env.DEMO_EVENTS === '1';
}
