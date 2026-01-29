import { describe, it, expect } from 'vitest';
import { parseCSV } from '../../../src/csv/parser.js';
import { CsvParseError } from '../../../src/utils/errors.js';
import path from 'path';

const fixturesPath = path.resolve(__dirname, '../../fixtures/csv');

describe('CsvParser', () => {
  describe('parseCSV', () => {
    it('should parse valid CSV with all columns', async () => {
      const rows = await parseCSV(path.join(fixturesPath, 'valid.csv'));
      expect(rows).toHaveLength(3);
      expect(rows[0]).toEqual({
        date: '01/15/2026',
        merchant: 'RED CROSS',
        category: 'Donations',
        account: 'Chase Checking',
        originalStatement: 'REDCROSS*DONATION',
        notes: 'Annual donation',
        amount: '-100.00',
        tags: 'tax',
        owner: 'John',
        lineNumber: 2
      });
    });

    it('should handle quoted fields containing commas', async () => {
      const rows = await parseCSV(path.join(fixturesPath, 'quoted-fields.csv'));
      expect(rows[0].merchant).toBe('CHURCH OF THE GOOD SHEPHERD, INC.');
    });

    it('should return empty array for empty CSV (headers only)', async () => {
      const rows = await parseCSV(path.join(fixturesPath, 'empty.csv'));
      expect(rows).toHaveLength(0);
    });

    it('should throw CsvParseError for file without headers', async () => {
      await expect(parseCSV(path.join(fixturesPath, 'no-headers.csv')))
        .rejects.toThrow(CsvParseError);
    });

    it('should handle empty optional fields', async () => {
      const rows = await parseCSV(path.join(fixturesPath, 'valid.csv'));
      const rowWithEmptyNotes = rows.find(r => r.notes === '');
      expect(rowWithEmptyNotes).toBeDefined();
    });

    it('should preserve line numbers for error reporting', async () => {
      const rows = await parseCSV(path.join(fixturesPath, 'valid.csv'));
      expect(rows[0].lineNumber).toBe(2); // Line 1 is header
      expect(rows[1].lineNumber).toBe(3);
      expect(rows[2].lineNumber).toBe(4);
    });

    it('should handle UTF-8 characters', async () => {
      const rows = await parseCSV(path.join(fixturesPath, 'unicode.csv'));
      expect(rows[0].notes).toContain('Café');
    });

    it('should throw CsvParseError for non-existent file', async () => {
      await expect(parseCSV('nonexistent.csv'))
        .rejects.toThrow();
    });

    it('should parse the second row correctly', async () => {
      const rows = await parseCSV(path.join(fixturesPath, 'valid.csv'));
      expect(rows[1]).toEqual({
        date: '02/20/2026',
        merchant: 'UNITED WAY',
        category: 'Donations',
        account: 'Chase Checking',
        originalStatement: 'UNITEDWAY PLEDGE',
        notes: '',
        amount: '-250.50',
        tags: 'tax',
        owner: 'John',
        lineNumber: 3
      });
    });
  });
});
