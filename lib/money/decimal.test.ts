import { describe, it, expect } from 'vitest';
import {
  toMoneyString,
  addMoney,
  subMoney,
  mulMoney,
  divMoney,
  compareMoney,
  formatINR,
  assertNumericString,
} from './decimal';

describe('lib/money/decimal', () => {
  it('enforces string inputs and rejects JS Number inputs', () => {
    expect(() => assertNumericString(1234.56 as unknown as string)).toThrow(/must be a numeric string/);
    expect(() => toMoneyString(500 as unknown as string)).toThrow(/must be a numeric string/);
    expect(() => assertNumericString('12345.67')).not.toThrow();
  });

  it('formats to exact 2 decimal places', () => {
    expect(toMoneyString('100')).toBe('100.00');
    expect(toMoneyString('100.5')).toBe('100.50');
    expect(toMoneyString('100.555')).toBe('100.56'); // ROUND_HALF_UP
  });

  it('performs safe financial addition and subtraction without floating-point errors', () => {
    // 0.1 + 0.2 in JS float is 0.30000000000000004
    expect(addMoney('0.10', '0.20')).toBe('0.30');
    expect(subMoney('1000.00', '250.75')).toBe('749.25');
  });

  it('performs safe multiplication for unit orders', () => {
    // 10 units @ 24,000.00 INR = 240,000.00 INR
    expect(mulMoney('24000.00', 10n)).toBe('240000.00');
    expect(mulMoney('24000.00', '25')).toBe('600000.00');
  });

  it('performs safe division and protects against division by zero', () => {
    expect(divMoney('100.00', '4')).toBe('25.00');
    expect(() => divMoney('100.00', '0')).toThrow(/Division by zero/);
  });

  it('correctly compares money amounts', () => {
    expect(compareMoney('100.00', '200.00')).toBe(-1);
    expect(compareMoney('200.00', '200.00')).toBe(0);
    expect(compareMoney('300.00', '200.00')).toBe(1);
  });

  it('formats INR using Indian numbering system (Lakhs and Crores)', () => {
    expect(formatINR('1000.00')).toBe('₹1,000.00');
    expect(formatINR('24000.00')).toBe('₹24,000.00');
    expect(formatINR('100000.00')).toBe('₹1,00,000.00'); // 1 Lakh
    expect(formatINR('10000000.00')).toBe('₹1,00,00,000.00'); // 1 Crore
    expect(formatINR('240000000.00')).toBe('₹24,00,00,000.00'); // 24 Crores
    expect(formatINR('21600000.00')).toBe('₹2,16,00,000.00'); // 2.16 Crores
  });
});

