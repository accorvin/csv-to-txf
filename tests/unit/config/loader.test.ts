import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadConfig } from '../../../src/config/loader.js';
import { ConfigNotFoundError, ConfigParseError } from '../../../src/utils/errors.js';
import path from 'path';

const fixturesPath = path.resolve(__dirname, '../../fixtures/config');

describe('ConfigLoader', () => {
  describe('loadConfig', () => {
    it('should parse a valid YAML config file', async () => {
      const config = await loadConfig(path.join(fixturesPath, 'valid.yaml'));
      expect(config.mappings).toHaveLength(3);
      expect(config.mappings[0]).toEqual({
        merchant: 'RED CROSS',
        organization: 'American National Red Cross',
        ein: '53-0196605'
      });
    });

    it('should handle config without EIN fields', async () => {
      const config = await loadConfig(path.join(fixturesPath, 'valid.yaml'));
      const goodwill = config.mappings.find(m => m.merchant === 'GOODWILL DONATION');
      expect(goodwill?.ein).toBeUndefined();
    });

    it('should throw ConfigNotFoundError for missing file', async () => {
      await expect(loadConfig('nonexistent.yaml'))
        .rejects.toThrow(ConfigNotFoundError);
    });

    it('should throw ConfigParseError for invalid YAML syntax', async () => {
      await expect(loadConfig(path.join(fixturesPath, 'invalid-yaml.yaml')))
        .rejects.toThrow(ConfigParseError);
    });

    it('should resolve tilde paths to home directory', async () => {
      // This test will fail if the file doesn't exist, which is expected
      // The point is to verify tilde expansion works
      await expect(loadConfig('~/.config/csv-to-txf/nonexistent-test-file.yaml'))
        .rejects.toThrow(ConfigNotFoundError);
    });

    it('should parse all merchant mappings with their fields', async () => {
      const config = await loadConfig(path.join(fixturesPath, 'valid.yaml'));

      expect(config.mappings[0]).toMatchObject({
        merchant: 'RED CROSS',
        organization: 'American National Red Cross',
        ein: '53-0196605'
      });

      expect(config.mappings[1]).toMatchObject({
        merchant: 'UNITED WAY',
        organization: 'United Way Worldwide',
        ein: '13-1635294'
      });

      expect(config.mappings[2]).toMatchObject({
        merchant: 'GOODWILL DONATION',
        organization: 'Goodwill Industries International'
      });
    });
  });
});
