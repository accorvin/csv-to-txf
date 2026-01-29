import { readFile } from 'fs/promises';
import { parse } from 'csv-parse/sync';
import { CsvRow } from './types.js';
import { CsvParseError } from '../utils/errors.js';
import { resolvePath } from '../utils/paths.js';

const EXPECTED_HEADERS = [
  'Date',
  'Merchant',
  'Category',
  'Account',
  'Original Statement',
  'Notes',
  'Amount',
  'Tags',
  'Owner'
];

export async function parseCSV(csvPath: string): Promise<CsvRow[]> {
  const resolvedPath = resolvePath(csvPath);

  let content: string;
  try {
    content = await readFile(resolvedPath, 'utf-8');
  } catch (error) {
    throw new CsvParseError(`Failed to read CSV file: ${(error as Error).message}`);
  }

  // Handle BOM
  if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
  }

  let records: string[][];
  try {
    records = parse(content, {
      relaxColumnCount: true,
      skipEmptyLines: true,
    });
  } catch (error) {
    throw new CsvParseError(`Failed to parse CSV: ${(error as Error).message}`);
  }

  if (records.length === 0) {
    throw new CsvParseError('CSV file is empty');
  }

  // Validate headers
  const headers = records[0];
  const hasValidHeaders = EXPECTED_HEADERS.every((header, index) => {
    const actualHeader = headers[index]?.trim();
    return actualHeader === header;
  });

  if (!hasValidHeaders) {
    throw new CsvParseError(
      `Invalid CSV headers. Expected: ${EXPECTED_HEADERS.join(', ')}`
    );
  }

  // Parse data rows
  const rows: CsvRow[] = [];

  for (let i = 1; i < records.length; i++) {
    const record = records[i];
    const lineNumber = i + 1; // 1-indexed, accounting for header

    rows.push({
      date: record[0]?.trim() ?? '',
      merchant: record[1]?.trim() ?? '',
      category: record[2]?.trim() ?? '',
      account: record[3]?.trim() ?? '',
      originalStatement: record[4]?.trim() ?? '',
      notes: record[5]?.trim() ?? '',
      amount: record[6]?.trim() ?? '',
      tags: record[7]?.trim() ?? '',
      owner: record[8]?.trim() ?? '',
      lineNumber,
    });
  }

  return rows;
}
