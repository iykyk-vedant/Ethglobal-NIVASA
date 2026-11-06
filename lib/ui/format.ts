import { formatINR, toMoneyString } from '../money/decimal';

export { formatINR, toMoneyString };

/**
 * Format unit count as integer string with standard grouping (e.g. 10,000 units).
 */
export function formatUnits(units: string | bigint | number): string {
  const s = units.toString();
  // Standard integer grouping
  const parts = s.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts[0];
}

/**
 * Format percentage or percentage-point values with consistent precision.
 * Distinguishes percentage points (pp) from percentage change (%).
 */
export function formatPercent(
  val: string | number,
  options?: { isPercentagePoint?: boolean; showSign?: boolean }
): string {
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return '0.00%';

  const fixed = num.toFixed(2);
  const sign = options?.showSign && num > 0 ? '+' : '';
  const unit = options?.isPercentagePoint ? ' pp' : '%';

  return `${sign}${fixed}${unit}`;
}

/**
 * Formats ISO timestamp to institutional date string (e.g. "06 Nov 2026, 11:30 AM IST").
 */
export function formatDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';

  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }) + ' IST';
}

/**
 * Formats ISO timestamp to date only (e.g. "06 Nov 2026").
 */
export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';

  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

/**
 * Format built-up area in square feet or square meters.
 */
export function formatArea(val: number | string, unit: 'sqft' | 'sqm' = 'sqft'): string {
  const n = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(n)) return '—';
  if (unit === 'sqft') {
    return `${n.toLocaleString('en-IN')} sq ft`;
  }
  const sqft = Math.round(n * 10.7639);
  return `${n.toLocaleString('en-IN', { maximumFractionDigits: 1 })} sq.m (${sqft.toLocaleString('en-IN')} sq.ft)`;
}
