import { CsvRow, ParsedTransaction, RowValidationResult } from './types.js';
import { parseDate } from '../validation/date.js';
import { parseAmount } from '../validation/amount.js';

export function validateRow(row: CsvRow): RowValidationResult {
  const errors: string[] = [];

  // Check required fields
  if (!row.date || row.date.trim() === '') {
    errors.push(`Missing required field: Date (line ${row.lineNumber})`);
  }

  if (!row.merchant || row.merchant.trim() === '') {
    errors.push(`Missing required field: Merchant (line ${row.lineNumber})`);
  }

  if (!row.amount || row.amount.trim() === '') {
    errors.push(`Missing required field: Amount (line ${row.lineNumber})`);
  }

  // If any required fields are missing, return early
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Parse and validate date
  let parsedDate: Date;
  try {
    parsedDate = parseDate(row.date);
  } catch {
    errors.push(`Invalid date format: "${row.date}" (line ${row.lineNumber})`);
    return { valid: false, errors };
  }

  // Parse and validate amount
  let parsedAmount: number;
  try {
    parsedAmount = parseAmount(row.amount);
  } catch (error) {
    if ((error as Error).message.includes('zero')) {
      errors.push(`Amount cannot be zero (line ${row.lineNumber})`);
    } else {
      errors.push(`Invalid amount format: "${row.amount}" (line ${row.lineNumber})`);
    }
    return { valid: false, errors };
  }

  const transaction: ParsedTransaction = {
    date: parsedDate,
    merchant: row.merchant.trim(),
    category: row.category.trim(),
    account: row.account.trim(),
    notes: row.notes.trim(),
    amount: parsedAmount,
    lineNumber: row.lineNumber,
  };

  return {
    valid: true,
    transaction,
    errors: [],
  };
}

export function validateRows(rows: CsvRow[]): {
  valid: boolean;
  transactions: ParsedTransaction[];
  errors: string[];
} {
  const transactions: ParsedTransaction[] = [];
  const allErrors: string[] = [];

  for (const row of rows) {
    const result = validateRow(row);

    if (result.valid && result.transaction) {
      transactions.push(result.transaction);
    } else {
      allErrors.push(...result.errors);
    }
  }

  return {
    valid: allErrors.length === 0,
    transactions,
    errors: allErrors,
  };
}
