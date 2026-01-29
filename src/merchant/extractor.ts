import { CsvRow } from '../csv/types.js';

export function extractUniqueMerchants(rows: CsvRow[]): string[] {
  const seen = new Map<string, string>(); // lowercase -> original (first occurrence)

  for (const row of rows) {
    const trimmed = row.merchant.trim();
    const lower = trimmed.toLowerCase();

    if (!seen.has(lower)) {
      seen.set(lower, trimmed);
    }
  }

  // Get unique merchants and sort alphabetically (case-insensitive)
  const merchants = Array.from(seen.values());
  merchants.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  return merchants;
}
