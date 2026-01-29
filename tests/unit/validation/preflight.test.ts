import { describe, it, expect } from 'vitest';
import { validateAllMerchantsMapped } from '../../../src/validation/preflight.js';
import { Config } from '../../../src/config/types.js';

describe('PreflightValidation', () => {
  describe('validateAllMerchantsMapped', () => {
    it('should pass when all merchants have mappings', () => {
      const merchants = ['RED CROSS', 'UNITED WAY'];
      const config: Config = {
        mappings: [
          { merchant: 'RED CROSS', organization: 'Org 1' },
          { merchant: 'UNITED WAY', organization: 'Org 2' }
        ]
      };
      const result = validateAllMerchantsMapped(merchants, config);
      expect(result.valid).toBe(true);
      expect(result.unmappedMerchants).toHaveLength(0);
    });

    it('should fail when any merchant is unmapped', () => {
      const merchants = ['RED CROSS', 'UNKNOWN CHARITY'];
      const config: Config = {
        mappings: [{ merchant: 'RED CROSS', organization: 'Org 1' }]
      };
      const result = validateAllMerchantsMapped(merchants, config);
      expect(result.valid).toBe(false);
      expect(result.unmappedMerchants).toEqual(['UNKNOWN CHARITY']);
    });

    it('should list all unmapped merchants (not just first)', () => {
      const merchants = ['A', 'B', 'C'];
      const config: Config = { mappings: [] };
      const result = validateAllMerchantsMapped(merchants, config);
      expect(result.unmappedMerchants).toEqual(['A', 'B', 'C']);
    });

    it('should match merchants case-insensitively', () => {
      const merchants = ['red cross'];
      const config: Config = {
        mappings: [{ merchant: 'RED CROSS', organization: 'Org 1' }]
      };
      const result = validateAllMerchantsMapped(merchants, config);
      expect(result.valid).toBe(true);
    });

    it('should handle mixed case in both merchants and config', () => {
      const merchants = ['Red Cross', 'United Way'];
      const config: Config = {
        mappings: [
          { merchant: 'RED CROSS', organization: 'Org 1' },
          { merchant: 'united way', organization: 'Org 2' }
        ]
      };
      const result = validateAllMerchantsMapped(merchants, config);
      expect(result.valid).toBe(true);
    });

    it('should handle empty merchants list', () => {
      const merchants: string[] = [];
      const config: Config = {
        mappings: [{ merchant: 'RED CROSS', organization: 'Org 1' }]
      };
      const result = validateAllMerchantsMapped(merchants, config);
      expect(result.valid).toBe(true);
      expect(result.unmappedMerchants).toHaveLength(0);
    });

    it('should preserve original case of unmapped merchants', () => {
      const merchants = ['Unknown Charity'];
      const config: Config = { mappings: [] };
      const result = validateAllMerchantsMapped(merchants, config);
      expect(result.unmappedMerchants).toEqual(['Unknown Charity']);
    });
  });
});
