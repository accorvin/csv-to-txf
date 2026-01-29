import { TxfTransaction, TxfGeneratorOptions } from './types.js';
import { formatDate, formatAmount, formatDetailLine } from './formatter.js';

const CRLF = '\r\n';
const TXF_VERSION = 'V042';
const REFNUM_CASH_CHARITY = 280;

export function generateHeader(options: TxfGeneratorOptions): string {
  const appVersion = options.appVersion || '1.0.0';
  const dateStr = formatDate(options.date);

  return [
    TXF_VERSION,
    `Acsv-to-txf ${appVersion}`,
    `D${dateStr}`,
  ].join(CRLF) + CRLF;
}

export function generateRecord(transaction: TxfTransaction): string {
  const detailLine = formatDetailLine({
    date: transaction.date,
    account: transaction.account,
    organization: transaction.organization,
    ein: transaction.ein,
  });

  const amountStr = formatAmount(transaction.amount);

  return [
    'TD',
    `N${REFNUM_CASH_CHARITY}`,
    'C1',
    'L1',
    `$${amountStr}`,
    `X${detailLine}`,
    '^',
  ].join(CRLF) + CRLF;
}

export function generateTxf(
  transactions: TxfTransaction[],
  options: TxfGeneratorOptions
): string {
  let output = generateHeader(options);

  for (const transaction of transactions) {
    output += generateRecord(transaction);
  }

  return output;
}
