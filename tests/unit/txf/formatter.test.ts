import { describe, it, expect } from 'vitest';
import { formatDate, formatAmount, formatDetailLine } from '../../../src/txf/formatter.js';

describe('TxfFormatter', () => {
  describe('formatDate', () => {
    it('should format date as MM/DD/YYYY', () => {
      const result = formatDate(new Date(2026, 0, 15)); // January 15, 2026
      expect(result).toBe('01/15/2026');
    });

    it('should pad single digit months and days', () => {
      const result = formatDate(new Date(2026, 4, 5)); // May 5, 2026
      expect(result).toBe('05/05/2026');
    });

    it('should handle December correctly', () => {
      const result = formatDate(new Date(2026, 11, 25)); // December 25, 2026
      expect(result).toBe('12/25/2026');
    });

    it('should handle last day of year', () => {
      const result = formatDate(new Date(2026, 11, 31)); // December 31, 2026
      expect(result).toBe('12/31/2026');
    });
  });

  describe('formatAmount', () => {
    it('should format with exactly 2 decimal places', () => {
      expect(formatAmount(-100)).toBe('-100.00');
    });

    it('should format fractional amounts correctly (rounded)', () => {
      expect(formatAmount(-123.456)).toBe('-123.46');
    });

    it('should format whole numbers with decimals', () => {
      expect(formatAmount(-50)).toBe('-50.00');
    });

    it('should preserve negative sign', () => {
      expect(formatAmount(-99.99)).toBe('-99.99');
    });

    it('should round correctly', () => {
      // Note: -123.455 in floating point is actually slightly less than .455
      // so it rounds to -123.45. Use a clear rounding case instead.
      expect(formatAmount(-123.456)).toBe('-123.46');
      expect(formatAmount(-123.454)).toBe('-123.45');
    });

    it('should handle large amounts', () => {
      expect(formatAmount(-10000.00)).toBe('-10000.00');
    });
  });

  describe('formatDetailLine', () => {
    it('should format detail line with EIN', () => {
      const result = formatDetailLine({
        date: new Date(2026, 0, 15),
        account: 'Chase Checking',
        organization: 'American Red Cross',
        ein: '53-0196605'
      });
      expect(result).toBe('01/15/2026 Chase Checking American Red Cross EIN:53-0196605');
    });

    it('should format detail line without EIN', () => {
      const result = formatDetailLine({
        date: new Date(2026, 0, 15),
        account: 'Chase Checking',
        organization: 'Goodwill Industries'
      });
      expect(result).toBe('01/15/2026 Chase Checking Goodwill Industries');
    });

    it('should truncate organization names over 64 characters', () => {
      const longName = 'A'.repeat(70);
      const result = formatDetailLine({
        date: new Date(2026, 0, 15),
        account: 'Checking',
        organization: longName
      });
      // Should contain exactly 64 A's
      const orgPart = result.split(' ').slice(2).join(' ');
      expect(orgPart).toBe('A'.repeat(64));
    });

    it('should handle empty account gracefully', () => {
      const result = formatDetailLine({
        date: new Date(2026, 0, 15),
        account: '',
        organization: 'Test Org'
      });
      expect(result).toBe('01/15/2026  Test Org');
    });
  });
});
