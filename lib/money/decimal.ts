import Decimal from 'decimal.js';

// Configure Decimal for financial precision
// 40 digits precision, ROUND_HALF_UP (banker's / commercial standard)
Decimal.set({
  precision: 40,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -30,
  toExpPos: 30,
});

/**
 * Validates that an input is a valid numeric string, never a JS floating point number.
 */
export function assertNumericString(val: unknown, fieldName: string = 'value'): asserts val is string {
  if (typeof val !== 'string') {
    throw new TypeError(
      `[DECIMAL_SECURITY_ERROR] ${fieldName} must be a numeric string, received ${typeof val}. Never pass money through JS Number().`
    );
  }
  if (!/^-?\d+(\.\d+)?$/.test(val.trim())) {
    throw new Error(`[DECIMAL_SECURITY_ERROR] Invalid numeric string format for ${fieldName}: "${val}"`);
  }
}

/**
 * Parses a numeric string into a Decimal instance.
 */
export function toDecimal(val: string | Decimal): Decimal {
  if (val instanceof Decimal) return val;
  assertNumericString(val);
  return new Decimal(val.trim());
}

/**
 * Converts a Decimal or numeric string to fixed 2-decimal string (Postgres numeric(20,2) format).
 */
export function toMoneyString(val: string | Decimal): string {
  const d = toDecimal(val);
  return d.toFixed(2);
}

/**
 * Converts a Decimal or numeric string to percentage string (Postgres numeric(5,2) format).
 */
export function toPercentString(val: string | Decimal): string {
  const d = toDecimal(val);
  return d.toFixed(2);
}

/**
 * Safe addition of two monetary values. Returns 2-decimal numeric string.
 */
export function addMoney(a: string | Decimal, b: string | Decimal): string {
  return toDecimal(a).plus(toDecimal(b)).toFixed(2);
}

/**
 * Safe subtraction of two monetary values (a - b). Returns 2-decimal numeric string.
 */
export function subMoney(a: string | Decimal, b: string | Decimal): string {
  return toDecimal(a).minus(toDecimal(b)).toFixed(2);
}

/**
 * Safe multiplication of unit price by unit count. Returns 2-decimal numeric string.
 * @param unitPrice 2-decimal numeric string
 * @param units integer count (bigint or string)
 */
export function mulMoney(unitPrice: string | Decimal, units: string | bigint): string {
  const priceDec = toDecimal(unitPrice);
  const unitsDec = new Decimal(units.toString());
  return priceDec.times(unitsDec).toFixed(2);
}

/**
 * Safe division. Returns 2-decimal numeric string.
 */
export function divMoney(total: string | Decimal, divisor: string | bigint | Decimal): string {
  const totalDec = toDecimal(total);
  const divDec = divisor instanceof Decimal ? divisor : new Decimal(divisor.toString());
  if (divDec.isZero()) {
    throw new Error('[DECIMAL_SECURITY_ERROR] Division by zero in money calculation');
  }
  return totalDec.dividedBy(divDec).toFixed(2);
}

/**
 * Compare two monetary amounts.
 * Returns -1 if a < b, 0 if a == b, 1 if a > b.
 */
export function compareMoney(a: string | Decimal, b: string | Decimal): number {
  return toDecimal(a).comparedTo(toDecimal(b));
}

/**
 * Checks if amount A is greater than or equal to amount B.
 */
export function gteMoney(a: string | Decimal, b: string | Decimal): boolean {
  return toDecimal(a).greaterThanOrEqualTo(toDecimal(b));
}

/**
 * Checks if amount A is less than or equal to amount B.
 */
export function lteMoney(a: string | Decimal, b: string | Decimal): boolean {
  return toDecimal(a).lessThanOrEqualTo(toDecimal(b));
}

/**
 * Format an INR monetary string into Indian numbering system (Lakhs / Crores).
 * Avoids any loss of precision or Number() conversion.
 * Example: "21600000.00" -> "₹2,16,00,000.00"
 */
export function formatINR(val: string | Decimal, includeSymbol: boolean = true): string {
  const moneyStr = toMoneyString(val);
  const [intPart, decPart] = moneyStr.split('.');
  const isNegative = intPart.startsWith('-');
  const rawInt = isNegative ? intPart.slice(1) : intPart;

  let formattedInt = '';
  if (rawInt.length <= 3) {
    formattedInt = rawInt;
  } else {
    const lastThree = rawInt.slice(-3);
    const remaining = rawInt.slice(0, -3);
    // Indian grouping: every 2 digits before the last 3
    const grouped = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formattedInt = `${grouped},${lastThree}`;
  }

  const prefix = isNegative ? '-' : '';
  const symbol = includeSymbol ? '₹' : '';
  return `${prefix}${symbol}${formattedInt}.${decPart}`;
}

export { Decimal };

