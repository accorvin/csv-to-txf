import { describe, it, expect } from 'vitest';
import { parseAmount, checkLargeContribution } from '../../../src/validation/amount.js';
import { AmountParseError, AmountValidationError } from '../../../src/utils/errors.js';

describe('AmountValidation', () => {
  describe('parseAmount', () => {
    it('should parse negative amount (Monarch expense format)', () => {
      const result = parseAmount('-100.00');
      expect(result).toBe(-100.00);
    });

    it('should parse positive amount and negate it', () => {
      const result = parseAmount('100.00');
      expect(result).toBe(-100.00);
    });

    it('should parse amount with dollar sign', () => {
      const result = parseAmount('$-50.00');
      expect(result).toBe(-50.00);
    });

    it('should parse positive amount with dollar sign and negate it', () => {
      const result = parseAmount('$100.00');
      expect(result).toBe(-100.00);
    });

    it('should parse amount with commas', () => {
      const result = parseAmount('-1,234.56');
      expect(result).toBe(-1234.56);
    });

    it('should throw AmountParseError for non-numeric value', () => {
      expect(() => parseAmount('abc')).toThrow(AmountParseError);
    });

    it('should throw AmountValidationError for zero amount', () => {
      expect(() => parseAmount('0.00')).toThrow(AmountValidationError);
    });

    it('should throw AmountValidationError for zero', () => {
      expect(() => parseAmount('0')).toThrow(AmountValidationError);
    });

    it('should handle small decimal amounts', () => {
      const result = parseAmount('-0.50');
      expect(result).toBe(-0.50);
    });

    it('should handle amounts with many decimal places', () => {
      const result = parseAmount('-123.456789');
      expect(result).toBeCloseTo(-123.456789, 5);
    });

    it('should trim whitespace', () => {
      const result = parseAmount('  -100.00  ');
      expect(result).toBe(-100.00);
    });
  });

  describe('checkLargeContribution', () => {
    it('should not warn for amounts under $250', () => {
      const result = checkLargeContribution(-249.99);
      expect(result.warning).toBeUndefined();
    });

    it('should warn for amounts at $250 threshold', () => {
      const result = checkLargeContribution(-250.00);
      expect(result.warning).toContain('exceeds $250');
      expect(result.warning).toContain('receipt required');
    });

    it('should warn for amounts over $250', () => {
      const result = checkLargeContribution(-500.00);
      expect(result.warning).toBeDefined();
    });

    it('should handle positive amounts (absolute value)', () => {
      const result = checkLargeContribution(300.00);
      expect(result.warning).toContain('exceeds $250');
    });

    it('should not warn for $100 contribution', () => {
      const result = checkLargeContribution(-100.00);
      expect(result.warning).toBeUndefined();
    });
  });
});
