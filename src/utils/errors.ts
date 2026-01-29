export class ConfigNotFoundError extends Error {
  constructor(path: string) {
    super(`Configuration file not found: ${path}`);
    this.name = 'ConfigNotFoundError';
  }
}

export class ConfigParseError extends Error {
  constructor(message: string) {
    super(`Failed to parse configuration file: ${message}`);
    this.name = 'ConfigParseError';
  }
}

export class ConfigValidationError extends Error {
  constructor(message: string) {
    super(`Configuration validation error: ${message}`);
    this.name = 'ConfigValidationError';
  }
}

export class CsvParseError extends Error {
  constructor(message: string, public lineNumber?: number) {
    super(lineNumber ? `CSV parse error at line ${lineNumber}: ${message}` : `CSV parse error: ${message}`);
    this.name = 'CsvParseError';
  }
}

export class CsvValidationError extends Error {
  constructor(message: string, public lineNumber: number) {
    super(`Validation error at line ${lineNumber}: ${message}`);
    this.name = 'CsvValidationError';
  }
}

export class DateParseError extends Error {
  constructor(dateString: string) {
    super(`Invalid date format: "${dateString}"`);
    this.name = 'DateParseError';
  }
}

export class AmountParseError extends Error {
  constructor(amountString: string) {
    super(`Invalid amount format: "${amountString}"`);
    this.name = 'AmountParseError';
  }
}

export class AmountValidationError extends Error {
  constructor(message: string) {
    super(`Amount validation error: ${message}`);
    this.name = 'AmountValidationError';
  }
}

export class FileIOError extends Error {
  constructor(message: string, public path: string) {
    super(`File I/O error for "${path}": ${message}`);
    this.name = 'FileIOError';
  }
}
