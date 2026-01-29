import { describe, it, expect } from 'vitest';
import { generateHeader, generateRecord, generateTxf } from '../../../src/txf/generator.js';
import { TxfTransaction } from '../../../src/txf/types.js';

describe('TxfGenerator', () => {
  describe('generateHeader', () => {
    it('should generate valid TXF header', () => {
      const header = generateHeader({
        date: new Date(2026, 0, 28),
        appVersion: '1.0.0'
      });
      expect(header).toBe('V042\r\nAcsv-to-txf 1.0.0\r\nD01/28/2026\r\n');
    });

    it('should use default version if not specified', () => {
      const header = generateHeader({
        date: new Date(2026, 0, 28)
      });
      expect(header).toContain('Acsv-to-txf');
    });
  });

  describe('generateRecord', () => {
    it('should generate valid TXF record for charitable contribution', () => {
      const record = generateRecord({
        date: new Date(2026, 0, 15),
        organization: 'American Red Cross',
        ein: '53-0196605',
        account: 'Chase Checking',
        amount: -100.00
      });
      const expected = [
        'TD',
        'N280',
        'C1',
        'L1',
        '$-100.00',
        'X01/15/2026 Chase Checking American Red Cross EIN:53-0196605',
        '^'
      ].join('\r\n') + '\r\n';
      expect(record).toBe(expected);
    });

    it('should use refnum 280 for cash contributions', () => {
      const record = generateRecord({
        date: new Date(2026, 0, 15),
        organization: 'Test Org',
        account: 'Checking',
        amount: -100.00
      });
      expect(record).toContain('N280');
    });

    it('should handle record without EIN', () => {
      const record = generateRecord({
        date: new Date(2026, 0, 15),
        organization: 'Goodwill Industries',
        account: 'Chase Checking',
        amount: -75.00
      });
      expect(record).toContain('X01/15/2026 Chase Checking Goodwill Industries\r\n');
      expect(record).not.toContain('EIN:');
    });
  });

  describe('generateTxf', () => {
    const validTransaction: TxfTransaction = {
      date: new Date(2026, 0, 15),
      organization: 'Test Org',
      account: 'Checking',
      amount: -100.00
    };

    it('should generate complete TXF file with header and records', () => {
      const transactions: TxfTransaction[] = [
        { date: new Date(2026, 0, 15), organization: 'Org A', amount: -100, account: 'Checking' }
      ];
      const txf = generateTxf(transactions, { date: new Date(2026, 0, 28) });
      expect(txf).toMatch(/^V042\r\n/);
      expect(txf).toContain('TD\r\n');
      expect(txf.endsWith('^\r\n')).toBe(true);
    });

    it('should include all transactions in output', () => {
      const transactions: TxfTransaction[] = [
        { date: new Date(2026, 0, 15), organization: 'Org A', amount: -100, account: 'Checking' },
        { date: new Date(2026, 1, 20), organization: 'Org B', amount: -200, account: 'Checking' }
      ];
      const txf = generateTxf(transactions, { date: new Date(2026, 0, 28) });
      const recordCount = (txf.match(/TD\r\n/g) || []).length;
      expect(recordCount).toBe(2);
    });

    it('should use CRLF line endings throughout', () => {
      const txf = generateTxf([validTransaction], { date: new Date(2026, 0, 28) });
      // Should not have LF without CR
      expect(txf).not.toMatch(/[^\r]\n/);
    });

    it('should use ASCII-safe characters only', () => {
      const txf = generateTxf([validTransaction], { date: new Date(2026, 0, 28) });
      // Check all characters are ASCII
      for (let i = 0; i < txf.length; i++) {
        expect(txf.charCodeAt(i)).toBeLessThan(128);
      }
    });

    it('should generate empty body for no transactions', () => {
      const txf = generateTxf([], { date: new Date(2026, 0, 28) });
      expect(txf).toMatch(/^V042\r\n/);
      expect(txf).not.toContain('TD');
    });
  });
});
