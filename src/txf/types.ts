export interface TxfHeader {
  version: string;
  application: string;
  exportDate: Date;
}

export interface TxfRecord {
  refnum: number;
  copy: number;
  line: number;
  amount: number;
  detail: string;
}

export interface TxfTransaction {
  date: Date;
  organization: string;
  ein?: string;
  account: string;
  amount: number;
}

export interface TxfGeneratorOptions {
  date: Date;
  appVersion?: string;
}
