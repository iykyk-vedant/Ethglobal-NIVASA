/**
 * Scripted Property Events & Demo Flag Helpers
 * ARCH §16.3, §19 · PRD FR-8.2 · UI §8.8
 */

export function isPropertyEventsEnabled(): boolean {
  if (process.env.APP_ENV === 'production') return false;
  return process.env.DEMO_EVENTS === 'true' || process.env.DEMO_EVENTS === '1';
}
