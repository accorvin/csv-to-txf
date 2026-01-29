import { describe, it, expect } from 'vitest';
import { extractUniqueMerchants } from '../../../src/merchant/extractor.js';
import { CsvRow } from '../../../src/csv/types.js';

const createRow = (merchant: string): CsvRow => ({
  date: '01/15/2026',
  merchant,
  category: 'Donations',
  account: 'Chase Checking',
  originalStatement: '',
  notes: '',
  amount: '-100.00',
  tags: '',
  owner: 'John',
  lineNumber: 2,
});

describe('MerchantExtractor', () => {
  describe('extractUniqueMerchants', () => {
    it('should extract unique merchants from CSV rows', () => {
      const rows: CsvRow[] = [
        createRow('RED CROSS'),
        createRow('UNITED WAY'),
        createRow('RED CROSS')
      ];
      const result = extractUniqueMerchants(rows);
      expect(result).toHaveLength(2);
      expect(result).toContain('RED CROSS');
      expect(result).toContain('UNITED WAY');
    });

    it('should sort merchants alphabetically', () => {
      const rows: CsvRow[] = [
        createRow('ZEBRA CHARITY'),
        createRow('ALPHA ORG'),
        createRow('MIDDLE PLACE')
      ];
      const result = extractUniqueMerchants(rows);
      expect(result).toEqual(['ALPHA ORG', 'MIDDLE PLACE', 'ZEBRA CHARITY']);
    });

    it('should preserve original case of first occurrence', () => {
      const rows: CsvRow[] = [
        createRow('Red Cross'),
        createRow('RED CROSS')
      ];
      const result = extractUniqueMerchants(rows);
      expect(result).toEqual(['Red Cross']);
    });

    it('should deduplicate case-insensitively', () => {
      const rows: CsvRow[] = [
        createRow('red cross'),
        createRow('RED CROSS'),
        createRow('Red Cross')
      ];
      const result = extractUniqueMerchants(rows);
      expect(result).toHaveLength(1);
    });

    it('should return empty array for empty input', () => {
      const result = extractUniqueMerchants([]);
      expect(result).toEqual([]);
    });

    it('should handle merchants with special characters', () => {
      const rows: CsvRow[] = [
        createRow("ST. MARY'S CHURCH"),
        createRow('CHURCH #123')
      ];
      const result = extractUniqueMerchants(rows);
      expect(result).toContain("CHURCH #123");
      expect(result).toContain("ST. MARY'S CHURCH");
    });

    it('should handle single merchant', () => {
      const rows: CsvRow[] = [createRow('SINGLE ORG')];
      const result = extractUniqueMerchants(rows);
      expect(result).toEqual(['SINGLE ORG']);
    });

    it('should trim whitespace from merchants', () => {
      const rows: CsvRow[] = [
        createRow('  RED CROSS  '),
        createRow('RED CROSS')
      ];
      const result = extractUniqueMerchants(rows);
      expect(result).toHaveLength(1);
    });
  });
});
