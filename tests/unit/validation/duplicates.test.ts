import { describe, it, expect } from 'vitest';
import { findDuplicates } from '../../../src/validation/duplicates.js';
import { ResolvedTransaction } from '../../../src/config/types.js';

const createTransaction = (overrides: Partial<ResolvedTransaction> = {}): ResolvedTransaction => ({
  date: new Date('2026-01-15'),
  organization: 'Test Org',
  account: 'Chase Checking',
  amount: -100,
  lineNumber: 2,
  ...overrides,
});

describe('DuplicateDetection', () => {
  describe('findDuplicates', () => {
    it('should return empty array when no duplicates', () => {
      const transactions: ResolvedTransaction[] = [
        createTransaction({ date: new Date('2026-01-15'), organization: 'Org A', amount: -100 }),
        createTransaction({ date: new Date('2026-01-16'), organization: 'Org A', amount: -100 }),
      ];
      const result = findDuplicates(transactions);
      expect(result).toHaveLength(0);
    });

    it('should detect duplicate (same date, amount, organization)', () => {
      const transactions: ResolvedTransaction[] = [
        createTransaction({ date: new Date('2026-01-15'), organization: 'Org A', amount: -100, lineNumber: 2 }),
        createTransaction({ date: new Date('2026-01-15'), organization: 'Org A', amount: -100, lineNumber: 5 }),
      ];
      const result = findDuplicates(transactions);
      expect(result).toHaveLength(1);
      expect(result[0].lineNumbers).toEqual([2, 5]);
    });

    it('should not flag as duplicate if amount differs', () => {
      const transactions: ResolvedTransaction[] = [
        createTransaction({ date: new Date('2026-01-15'), organization: 'Org A', amount: -100 }),
        createTransaction({ date: new Date('2026-01-15'), organization: 'Org A', amount: -200 }),
      ];
      const result = findDuplicates(transactions);
      expect(result).toHaveLength(0);
    });

    it('should not flag as duplicate if organization differs', () => {
      const transactions: ResolvedTransaction[] = [
        createTransaction({ date: new Date('2026-01-15'), organization: 'Org A', amount: -100 }),
        createTransaction({ date: new Date('2026-01-15'), organization: 'Org B', amount: -100 }),
      ];
      const result = findDuplicates(transactions);
      expect(result).toHaveLength(0);
    });

    it('should not flag as duplicate if date differs', () => {
      const transactions: ResolvedTransaction[] = [
        createTransaction({ date: new Date('2026-01-15'), organization: 'Org A', amount: -100 }),
        createTransaction({ date: new Date('2026-01-16'), organization: 'Org A', amount: -100 }),
      ];
      const result = findDuplicates(transactions);
      expect(result).toHaveLength(0);
    });

    it('should group more than 2 duplicates together', () => {
      const transactions: ResolvedTransaction[] = [
        createTransaction({ date: new Date('2026-01-15'), organization: 'Org A', amount: -100, lineNumber: 2 }),
        createTransaction({ date: new Date('2026-01-15'), organization: 'Org A', amount: -100, lineNumber: 3 }),
        createTransaction({ date: new Date('2026-01-15'), organization: 'Org A', amount: -100, lineNumber: 4 }),
      ];
      const result = findDuplicates(transactions);
      expect(result).toHaveLength(1);
      expect(result[0].lineNumbers).toEqual([2, 3, 4]);
    });

    it('should detect multiple duplicate groups', () => {
      const transactions: ResolvedTransaction[] = [
        createTransaction({ date: new Date('2026-01-15'), organization: 'Org A', amount: -100, lineNumber: 2 }),
        createTransaction({ date: new Date('2026-01-15'), organization: 'Org A', amount: -100, lineNumber: 3 }),
        createTransaction({ date: new Date('2026-02-20'), organization: 'Org B', amount: -200, lineNumber: 4 }),
        createTransaction({ date: new Date('2026-02-20'), organization: 'Org B', amount: -200, lineNumber: 5 }),
      ];
      const result = findDuplicates(transactions);
      expect(result).toHaveLength(2);
    });

    it('should handle empty transaction list', () => {
      const result = findDuplicates([]);
      expect(result).toHaveLength(0);
    });

    it('should handle single transaction', () => {
      const transactions: ResolvedTransaction[] = [
        createTransaction({ date: new Date('2026-01-15'), organization: 'Org A', amount: -100 }),
      ];
      const result = findDuplicates(transactions);
      expect(result).toHaveLength(0);
    });
  });
});
