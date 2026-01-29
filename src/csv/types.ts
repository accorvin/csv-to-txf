export interface CsvRow {
  date: string;
  merchant: string;
  category: string;
  account: string;
  originalStatement: string;
  notes: string;
  amount: string;
  tags: string;
  owner: string;
  lineNumber: number;
}

export interface ParsedTransaction {
  date: Date;
  merchant: string;
  category: string;
  account: string;
  notes: string;
  amount: number;
  lineNumber: number;
}

export interface RowValidationResult {
  valid: boolean;
  transaction?: ParsedTransaction;
  errors: string[];
}
