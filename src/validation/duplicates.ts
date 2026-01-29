import { ResolvedTransaction } from '../config/types.js';

export interface DuplicateGroup {
  date: Date;
  organization: string;
  amount: number;
  lineNumbers: number[];
}

export function findDuplicates(transactions: ResolvedTransaction[]): DuplicateGroup[] {
  const groups = new Map<string, ResolvedTransaction[]>();

  for (const transaction of transactions) {
    // Create a key from date, organization, and amount
    const dateStr = transaction.date.toISOString().split('T')[0]; // YYYY-MM-DD
    const key = `${dateStr}|${transaction.organization}|${transaction.amount}`;

    const existing = groups.get(key) || [];
    existing.push(transaction);
    groups.set(key, existing);
  }

  const duplicates: DuplicateGroup[] = [];

  for (const transactions of groups.values()) {
    if (transactions.length > 1) {
      duplicates.push({
        date: transactions[0].date,
        organization: transactions[0].organization,
        amount: transactions[0].amount,
        lineNumbers: transactions.map(t => t.lineNumber).sort((a, b) => a - b),
      });
    }
  }

  return duplicates;
}
