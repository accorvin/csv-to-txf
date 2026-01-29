import { Config, MerchantMapping } from '../config/types.js';

export function lookupMerchant(
  merchantName: string,
  config: Config
): MerchantMapping | undefined {
  const normalizedName = merchantName.trim().toLowerCase();

  for (const mapping of config.mappings) {
    if (mapping.merchant.toLowerCase() === normalizedName) {
      return mapping;
    }
  }

  return undefined;
}

export function createMerchantLookupMap(
  config: Config
): Map<string, MerchantMapping> {
  const map = new Map<string, MerchantMapping>();

  for (const mapping of config.mappings) {
    const key = mapping.merchant.toLowerCase();
    // Only add if not already present (first match wins)
    if (!map.has(key)) {
      map.set(key, mapping);
    }
  }

  return map;
}

export function lookupMerchantFast(
  merchantName: string,
  lookupMap: Map<string, MerchantMapping>
): MerchantMapping | undefined {
  const normalizedName = merchantName.trim().toLowerCase();
  return lookupMap.get(normalizedName);
}
