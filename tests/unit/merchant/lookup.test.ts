import { describe, it, expect } from 'vitest';
import { lookupMerchant } from '../../../src/merchant/lookup.js';
import { Config } from '../../../src/config/types.js';

describe('MerchantLookup', () => {
  const config: Config = {
    mappings: [
      { merchant: 'RED CROSS', organization: 'American National Red Cross', ein: '53-0196605' },
      { merchant: 'UNITED WAY', organization: 'United Way Worldwide', ein: '13-1635294' },
      { merchant: 'Goodwill Donation', organization: 'Goodwill Industries International' }
    ]
  };

  describe('lookupMerchant', () => {
    it('should find exact match (same case)', () => {
      const result = lookupMerchant('RED CROSS', config);
      expect(result).toEqual({
        merchant: 'RED CROSS',
        organization: 'American National Red Cross',
        ein: '53-0196605'
      });
    });

    it('should find case-insensitive match (lowercase)', () => {
      const result = lookupMerchant('red cross', config);
      expect(result?.organization).toBe('American National Red Cross');
    });

    it('should find case-insensitive match (mixed case)', () => {
      const result = lookupMerchant('Red Cross', config);
      expect(result?.organization).toBe('American National Red Cross');
    });

    it('should find case-insensitive match (config has mixed case)', () => {
      const result = lookupMerchant('GOODWILL DONATION', config);
      expect(result?.organization).toBe('Goodwill Industries International');
    });

    it('should return undefined for unmapped merchant', () => {
      const result = lookupMerchant('UNKNOWN CHARITY', config);
      expect(result).toBeUndefined();
    });

    it('should require exact match after normalization', () => {
      const result = lookupMerchant('RED CROSS INC', config);
      expect(result).toBeUndefined();
    });

    it('should return first match when duplicates exist', () => {
      const duplicateConfig: Config = {
        mappings: [
          { merchant: 'TEST', organization: 'First Org' },
          { merchant: 'test', organization: 'Second Org' }
        ]
      };
      const result = lookupMerchant('TEST', duplicateConfig);
      expect(result?.organization).toBe('First Org');
    });

    it('should handle merchants with special characters', () => {
      const specialConfig: Config = {
        mappings: [
          { merchant: "ST. MARY'S CHURCH", organization: "St. Mary's Catholic Church" }
        ]
      };
      const result = lookupMerchant("ST. MARY'S CHURCH", specialConfig);
      expect(result?.organization).toBe("St. Mary's Catholic Church");
    });

    it('should handle merchants with numbers and symbols', () => {
      const specialConfig: Config = {
        mappings: [
          { merchant: 'CHURCH #123', organization: 'Church 123' }
        ]
      };
      const result = lookupMerchant('CHURCH #123', specialConfig);
      expect(result?.organization).toBe('Church 123');
    });

    it('should trim whitespace before matching', () => {
      const result = lookupMerchant('  RED CROSS  ', config);
      expect(result?.organization).toBe('American National Red Cross');
    });
  });
});
