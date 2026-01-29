import { describe, it, expect } from 'vitest';
import { validateRow } from '../../../src/csv/validator.js';
import { CsvRow } from '../../../src/csv/types.js';

const createRow = (overrides: Partial<CsvRow> = {}): CsvRow => ({
  date: '01/15/2026',
  merchant: 'RED CROSS',
  category: 'Donations',
  account: 'Chase Checking',
  originalStatement: 'REDCROSS*DONATION',
  notes: 'Annual donation',
  amount: '-100.00',
  tags: 'tax',
  owner: 'John',
  lineNumber: 2,
  ...overrides,
});

describe('CsvRowValidator', () => {
  describe('validateRow', () => {
    it('should accept valid row with all required fields', () => {
      const row = createRow();
      const result = validateRow(row);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.transaction).toBeDefined();
      expect(result.transaction?.amount).toBe(-100.00);
    });

    it('should reject row with missing date', () => {
      const row = createRow({ date: '' });
      const result = validateRow(row);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('Missing required field: Date')
      );
      expect(result.errors).toContainEqual(
        expect.stringContaining('line 2')
      );
    });

    it('should reject row with missing merchant', () => {
      const row = createRow({ merchant: '' });
      const result = validateRow(row);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('Missing required field: Merchant')
      );
    });

    it('should reject row with missing amount', () => {
      const row = createRow({ amount: '' });
      const result = validateRow(row);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('Missing required field: Amount')
      );
    });

    it('should collect all errors for row with multiple issues', () => {
      const row = createRow({ date: '', merchant: '', amount: '', lineNumber: 5 });
      const result = validateRow(row);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(3);
    });

    it('should parse the date correctly', () => {
      const row = createRow({ date: '01/15/2026' });
      const result = validateRow(row);
      expect(result.valid).toBe(true);
      expect(result.transaction?.date.getFullYear()).toBe(2026);
      expect(result.transaction?.date.getMonth()).toBe(0); // January
      expect(result.transaction?.date.getDate()).toBe(15);
    });

    it('should parse negative amounts', () => {
      const row = createRow({ amount: '-250.50' });
      const result = validateRow(row);
      expect(result.valid).toBe(true);
      expect(result.transaction?.amount).toBe(-250.50);
    });

    it('should convert positive amounts to negative', () => {
      const row = createRow({ amount: '100.00' });
      const result = validateRow(row);
      expect(result.valid).toBe(true);
      expect(result.transaction?.amount).toBe(-100.00);
    });

    it('should reject rows with zero amount', () => {
      const row = createRow({ amount: '0.00' });
      const result = validateRow(row);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('zero')
      );
    });

    it('should reject rows with non-numeric amount', () => {
      const row = createRow({ amount: 'abc' });
      const result = validateRow(row);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('Invalid amount')
      );
    });

    it('should reject rows with invalid date format', () => {
      const row = createRow({ date: 'not-a-date' });
      const result = validateRow(row);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.stringContaining('Invalid date')
      );
    });

    it('should preserve category and account in parsed transaction', () => {
      const row = createRow({ category: 'Charity', account: 'Savings' });
      const result = validateRow(row);
      expect(result.valid).toBe(true);
      expect(result.transaction?.category).toBe('Charity');
      expect(result.transaction?.account).toBe('Savings');
    });
  });
});
