import { Config, ValidationResult } from './types.js';
import { ConfigValidationError } from '../utils/errors.js';

export function validateConfig(config: Config): ValidationResult {
  const warnings: string[] = [];

  // Check if mappings array exists
  if (!config.mappings) {
    throw new ConfigValidationError('Config must contain a "mappings" array');
  }

  // Check if mappings is an array
  if (!Array.isArray(config.mappings)) {
    throw new ConfigValidationError('Config "mappings" must be an array');
  }

  // Check if mappings is not empty
  if (config.mappings.length === 0) {
    throw new ConfigValidationError('Config "mappings" array cannot be empty');
  }

  // Validate each mapping
  for (let i = 0; i < config.mappings.length; i++) {
    const mapping = config.mappings[i];

    if (!mapping.merchant || mapping.merchant.trim() === '') {
      throw new ConfigValidationError(
        `Mapping at index ${i} has empty or missing "merchant" field`
      );
    }

    if (!mapping.organization || mapping.organization.trim() === '') {
      throw new ConfigValidationError(
        `Mapping at index ${i} has empty or missing "organization" field`
      );
    }
  }

  // Check for duplicate merchants (case-insensitive)
  const seenMerchants = new Map<string, string>(); // lowercase -> original

  for (const mapping of config.mappings) {
    const lowerMerchant = mapping.merchant.toLowerCase();

    if (seenMerchants.has(lowerMerchant)) {
      const original = seenMerchants.get(lowerMerchant)!;
      warnings.push(
        `Duplicate merchant: "${mapping.merchant}" (matches "${original}")`
      );
    } else {
      seenMerchants.set(lowerMerchant, mapping.merchant);
    }
  }

  return {
    valid: true,
    warnings,
  };
}
