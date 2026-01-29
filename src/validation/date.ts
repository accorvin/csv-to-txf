import { DateParseError } from '../utils/errors.js';

export interface DateValidationResult {
  inRange: boolean;
  warning?: string;
}

export function parseDate(dateString: string): Date {
  const trimmed = dateString.trim();

  // Try MM/DD/YYYY or M/D/YYYY format
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, month, day, year] = slashMatch;
    const date = new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10)
    );

    // Validate the date is real
    if (
      date.getFullYear() === parseInt(year, 10) &&
      date.getMonth() === parseInt(month, 10) - 1 &&
      date.getDate() === parseInt(day, 10)
    ) {
      return date;
    }
  }

  // Try YYYY-MM-DD format
  const dashMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dashMatch) {
    const [, year, month, day] = dashMatch;
    const date = new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10)
    );

    // Validate the date is real
    if (
      date.getFullYear() === parseInt(year, 10) &&
      date.getMonth() === parseInt(month, 10) - 1 &&
      date.getDate() === parseInt(day, 10)
    ) {
      return date;
    }
  }

  throw new DateParseError(dateString);
}

export function validateDateInTaxYear(
  date: Date,
  taxYear: number
): DateValidationResult {
  const year = date.getFullYear();

  if (year === taxYear) {
    return { inRange: true };
  }

  return {
    inRange: false,
    warning: `Date ${formatDateForMessage(date)} is outside tax year ${taxYear}`,
  };
}

function formatDateForMessage(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}
