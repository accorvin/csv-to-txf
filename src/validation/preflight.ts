import { Config } from '../config/types.js';
import { lookupMerchant } from '../merchant/lookup.js';

export interface MerchantValidationResult {
  valid: boolean;
  unmappedMerchants: string[];
}

export interface PreflightResult {
  configValid: boolean;
  allMerchantsMapped: boolean;
  canProceed: boolean;
  unmappedMerchants: string[];
  configWarnings: string[];
  errors: string[];
}

export function validateAllMerchantsMapped(
  merchants: string[],
  config: Config
): MerchantValidationResult {
  const unmapped: string[] = [];

  for (const merchant of merchants) {
    const mapping = lookupMerchant(merchant, config);
    if (!mapping) {
      unmapped.push(merchant);
    }
  }

  return {
    valid: unmapped.length === 0,
    unmappedMerchants: unmapped,
  };
}
