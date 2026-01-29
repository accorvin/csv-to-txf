import { AmountParseError, AmountValidationError } from '../utils/errors.js';

export interface LargeContributionResult {
  warning?: string;
}

export function parseAmount(amountString: string): number {
  const trimmed = amountString.trim();

  // Remove dollar sign and commas
  const cleaned = trimmed.replace(/[$,]/g, '');

  // Parse as float
  const amount = parseFloat(cleaned);

  if (isNaN(amount)) {
    throw new AmountParseError(amountString);
  }

  if (amount === 0) {
    throw new AmountValidationError('Amount cannot be zero');
  }

  // TXF requires expenses as negative, so convert positive to negative
  return amount > 0 ? -amount : amount;
}

export function checkLargeContribution(amount: number): LargeContributionResult {
  const absoluteAmount = Math.abs(amount);

  if (absoluteAmount >= 250) {
    return {
      warning: `Donation of $${absoluteAmount.toFixed(2)} exceeds $250 threshold - receipt required for tax deduction`,
    };
  }

  return {};
}
