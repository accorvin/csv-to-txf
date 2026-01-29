import { describe, it, expect } from 'vitest';
import { parseDate, validateDateInTaxYear } from '../../../src/validation/date.js';
import { DateParseError } from '../../../src/utils/errors.js';

describe('DateValidation', () => {
  describe('parseDate', () => {
    it('should parse MM/DD/YYYY format', () => {
      const date = parseDate('01/15/2026');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(0); // January
      expect(date.getDate()).toBe(15);
    });

    it('should parse YYYY-MM-DD format', () => {
      const date = parseDate('2026-01-15');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(15);
    });

    it('should parse M/D/YYYY format (no leading zeros)', () => {
      const date = parseDate('1/5/2026');
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(5);
    });

    it('should throw DateParseError for invalid date string', () => {
      expect(() => parseDate('not-a-date')).toThrow(DateParseError);
    });

    it('should throw DateParseError for invalid date values', () => {
      expect(() => parseDate('13/45/2026')).toThrow(DateParseError);
    });

    it('should throw DateParseError for February 30th', () => {
      expect(() => parseDate('02/30/2026')).toThrow(DateParseError);
    });

    it('should handle December correctly', () => {
      const date = parseDate('12/25/2026');
      expect(date.getMonth()).toBe(11); // December is month 11
      expect(date.getDate()).toBe(25);
    });

    it('should trim whitespace', () => {
      const date = parseDate('  01/15/2026  ');
      expect(date.getFullYear()).toBe(2026);
    });
  });

  describe('validateDateInTaxYear', () => {
    it('should return valid for date within tax year', () => {
      const result = validateDateInTaxYear(new Date(2026, 5, 15), 2026);
      expect(result.inRange).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('should return warning for date before tax year', () => {
      const result = validateDateInTaxYear(new Date(2025, 11, 31), 2026);
      expect(result.inRange).toBe(false);
      expect(result.warning).toContain('outside tax year 2026');
    });

    it('should return warning for date after tax year', () => {
      const result = validateDateInTaxYear(new Date(2027, 0, 1), 2026);
      expect(result.inRange).toBe(false);
      expect(result.warning).toContain('outside tax year 2026');
    });

    it('should accept first day of tax year', () => {
      const result = validateDateInTaxYear(new Date(2026, 0, 1), 2026);
      expect(result.inRange).toBe(true);
    });

    it('should accept last day of tax year', () => {
      const result = validateDateInTaxYear(new Date(2026, 11, 31), 2026);
      expect(result.inRange).toBe(true);
    });
  });
});
