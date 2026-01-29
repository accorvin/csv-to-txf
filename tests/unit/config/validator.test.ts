import { describe, it, expect } from 'vitest';
import { validateConfig } from '../../../src/config/validator.js';
import { ConfigValidationError } from '../../../src/utils/errors.js';
import { Config } from '../../../src/config/types.js';

describe('ConfigValidator', () => {
  describe('validateConfig', () => {
    it('should accept valid config with all required fields', () => {
      const config: Config = { mappings: [{ merchant: 'TEST', organization: 'Test Org' }] };
      const result = validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should reject config with empty merchant', () => {
      const config: Config = { mappings: [{ merchant: '', organization: 'Test Org' }] };
      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
    });

    it('should reject config with empty organization', () => {
      const config: Config = { mappings: [{ merchant: 'TEST', organization: '' }] };
      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
    });

    it('should reject config with missing mappings array', () => {
      const config = {} as Config;
      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
    });

    it('should reject config with empty mappings array', () => {
      const config: Config = { mappings: [] };
      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
    });

    it('should return warning for duplicate merchants (case-insensitive)', () => {
      const config: Config = {
        mappings: [
          { merchant: 'RED CROSS', organization: 'Org 1' },
          { merchant: 'red cross', organization: 'Org 2' }
        ]
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.stringContaining('Duplicate merchant')
      );
      expect(result.warnings).toContainEqual(
        expect.stringContaining('red cross')
      );
    });

    it('should accept config with EIN fields', () => {
      const config: Config = {
        mappings: [{ merchant: 'TEST', organization: 'Test Org', ein: '12-3456789' }]
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(true);
    });

    it('should handle multiple valid mappings', () => {
      const config: Config = {
        mappings: [
          { merchant: 'ORG1', organization: 'Organization 1' },
          { merchant: 'ORG2', organization: 'Organization 2' },
          { merchant: 'ORG3', organization: 'Organization 3' }
        ]
      };
      const result = validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect multiple duplicate groups', () => {
      const config: Config = {
        mappings: [
          { merchant: 'RED CROSS', organization: 'Org 1' },
          { merchant: 'red cross', organization: 'Org 2' },
          { merchant: 'UNITED WAY', organization: 'Org 3' },
          { merchant: 'united way', organization: 'Org 4' }
        ]
      };
      const result = validateConfig(config);
      expect(result.warnings.length).toBeGreaterThanOrEqual(2);
    });
  });
});
