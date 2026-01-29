export interface MerchantMapping {
  merchant: string;
  organization: string;
  ein?: string;
}

export interface Config {
  mappings: MerchantMapping[];
}

export interface ValidationResult {
  valid: boolean;
  warnings: string[];
}

export interface ResolvedTransaction {
  date: Date;
  organization: string;
  ein?: string;
  account: string;
  amount: number;
  lineNumber: number;
}
