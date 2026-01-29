# CSV-to-TXF Implementation Plan

A Test-Driven Development (TDD) implementation plan for converting Monarch Money CSV exports to TurboTax TXF files.

---

## 1. Technology Choices

### Language: TypeScript with Node.js

**Rationale:**
- Excellent CLI tooling ecosystem (Commander.js, yargs)
- Native JSON/YAML parsing support
- Strong type safety catches errors at compile time
- Fast startup time suitable for CLI tools
- Easy to test with Jest/Vitest
- Cross-platform (macOS, Linux, Windows)
- Familiar to most developers

**Alternative considered:** Go would offer faster startup and single binary distribution, but TypeScript provides faster development iteration and richer testing ecosystem.

### Dependencies

| Package | Purpose |
|---------|---------|
| `commander` | CLI argument parsing |
| `yaml` | YAML config file parsing |
| `csv-parse` | CSV parsing with proper quote handling |
| `vitest` | Test runner (faster than Jest, native ESM support) |
| `tsx` | TypeScript execution without build step |
| `@types/node` | Node.js type definitions |

### Build & Distribution

- **Package manager:** npm
- **Bundler:** tsup (for creating single-file CLI distribution)
- **Node version:** 20+ LTS
- **Binary name:** `csv-to-txf`

---

## 2. Project Structure

```
csv-to-txf/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── README.md
├── REQUIREMENTS.md
├── IMPLEMENTATION_PLAN.md
│
├── src/
│   ├── index.ts              # CLI entry point
│   ├── cli/
│   │   ├── index.ts          # Commander setup, command registration
│   │   ├── convert.ts        # Convert command handler
│   │   └── init.ts           # Init command handler
│   │
│   ├── config/
│   │   ├── loader.ts         # YAML config loading
│   │   ├── types.ts          # Config type definitions
│   │   └── validator.ts      # Config validation
│   │
│   ├── csv/
│   │   ├── parser.ts         # CSV parsing
│   │   ├── types.ts          # CSV row type definitions
│   │   └── validator.ts      # Row-level validation
│   │
│   ├── merchant/
│   │   ├── lookup.ts         # Merchant-to-organization lookup
│   │   └── extractor.ts      # Extract unique merchants from CSV
│   │
│   ├── txf/
│   │   ├── generator.ts      # TXF file generation
│   │   ├── formatter.ts      # Amount/date formatting for TXF
│   │   └── types.ts          # TXF record types
│   │
│   ├── validation/
│   │   ├── preflight.ts      # Preflight validation orchestration
│   │   ├── date.ts           # Date range validation
│   │   ├── amount.ts         # Amount validation
│   │   └── duplicates.ts     # Duplicate detection
│   │
│   └── utils/
│       ├── errors.ts         # Custom error classes
│       ├── paths.ts          # Path resolution utilities
│       └── formatting.ts     # Console output formatting
│
├── tests/
│   ├── unit/
│   │   ├── config/
│   │   │   ├── loader.test.ts
│   │   │   └── validator.test.ts
│   │   ├── csv/
│   │   │   ├── parser.test.ts
│   │   │   └── validator.test.ts
│   │   ├── merchant/
│   │   │   ├── lookup.test.ts
│   │   │   └── extractor.test.ts
│   │   ├── txf/
│   │   │   ├── generator.test.ts
│   │   │   └── formatter.test.ts
│   │   └── validation/
│   │       ├── preflight.test.ts
│   │       ├── date.test.ts
│   │       ├── amount.test.ts
│   │       └── duplicates.test.ts
│   │
│   ├── integration/
│   │   ├── convert.test.ts   # End-to-end convert command tests
│   │   └── init.test.ts      # End-to-end init command tests
│   │
│   └── fixtures/
│       ├── csv/
│       │   ├── valid.csv
│       │   ├── empty.csv
│       │   ├── missing-headers.csv
│       │   ├── missing-fields.csv
│       │   ├── quoted-fields.csv
│       │   ├── special-chars.csv
│       │   └── large.csv
│       ├── config/
│       │   ├── valid.yaml
│       │   ├── invalid-yaml.yaml
│       │   ├── missing-fields.yaml
│       │   ├── duplicate-merchants.yaml
│       │   └── empty-org.yaml
│       └── expected/
│           ├── output.txf
│           └── init-output.yaml
│
└── bin/
    └── csv-to-txf.js         # Executable entry point
```

---

## 3. Module Breakdown

### 3.1 Type Definitions

#### `src/csv/types.ts`
```typescript
interface CsvRow {
  date: string;
  merchant: string;
  category: string;
  account: string;
  originalStatement: string;
  notes: string;
  amount: string;
  tags: string;
  owner: string;
  lineNumber: number;  // For error reporting
}

interface ParsedTransaction {
  date: Date;
  merchant: string;
  category: string;
  account: string;
  notes: string;
  amount: number;
  lineNumber: number;
}
```

#### `src/config/types.ts`
```typescript
interface MerchantMapping {
  merchant: string;
  organization: string;
  ein?: string;
}

interface Config {
  mappings: MerchantMapping[];
}

interface ResolvedTransaction {
  date: Date;
  organization: string;
  ein?: string;
  account: string;
  amount: number;
  lineNumber: number;
}
```

#### `src/txf/types.ts`
```typescript
interface TxfHeader {
  version: string;       // "V042"
  application: string;   // "csv-to-txf 1.0.0"
  exportDate: Date;
}

interface TxfRecord {
  refnum: number;        // 280 for cash charity
  copy: number;          // 1
  line: number;          // 1
  amount: number;        // Negative value
  detail: string;        // "MM/DD/YYYY Account Organization"
}
```

### 3.2 Core Modules

| Module | Responsibility | Inputs | Outputs |
|--------|----------------|--------|---------|
| `csv/parser` | Parse CSV file into row objects | File path/content | `CsvRow[]` |
| `csv/validator` | Validate individual CSV rows | `CsvRow` | `ParsedTransaction` or errors |
| `config/loader` | Load and parse YAML config | File path | `Config` object |
| `config/validator` | Validate config structure | `Config` | Validated config or errors |
| `merchant/lookup` | Find organization for merchant | Merchant name, Config | `MerchantMapping` or undefined |
| `merchant/extractor` | Extract unique merchants from CSV | `CsvRow[]` | `string[]` (sorted, unique) |
| `validation/preflight` | Orchestrate all preflight checks | CSV rows, Config | Validation result with all errors |
| `validation/date` | Validate dates within tax year | Date, tax year | Warning if out of range |
| `validation/amount` | Validate amounts (non-zero, numeric) | Amount string | Parsed number or error |
| `validation/duplicates` | Detect duplicate transactions | Transactions array | List of duplicate groups |
| `txf/formatter` | Format dates/amounts for TXF | Date, amount | Formatted strings |
| `txf/generator` | Generate complete TXF output | Transactions, options | TXF file content |
| `cli/convert` | Handle convert command | CLI args | Exit code |
| `cli/init` | Handle init command | CLI args | Exit code |

---

## 4. Test Strategy

### 4.1 Testing Pyramid

```
                    ┌────────────────┐
                    │  Integration   │  2 test suites
                    │    Tests       │  (convert, init)
                    └───────┬────────┘
                            │
               ┌────────────┴────────────┐
               │      Unit Tests         │  12+ test suites
               │   (per module)          │  (~100 test cases)
               └─────────────────────────┘
```

### 4.2 Test Fixtures

#### CSV Fixtures

**`fixtures/csv/valid.csv`**
```csv
Date,Merchant,Category,Account,Original Statement,Notes,Amount,Tags,Owner
01/15/2026,RED CROSS,Donations,Chase Checking,REDCROSS*DONATION,Annual donation,-100.00,tax,John
02/20/2026,UNITED WAY,Donations,Chase Checking,UNITEDWAY PLEDGE,,-250.50,tax,John
03/10/2026,GOODWILL DONATION,Donations,Chase Checking,GOODWILL #1234,Clothing drop-off,-75.00,,John
```

**`fixtures/csv/quoted-fields.csv`**
```csv
Date,Merchant,Category,Account,Original Statement,Notes,Amount,Tags,Owner
01/15/2026,"CHURCH OF THE GOOD SHEPHERD, INC.",Donations,Chase Checking,CHURCH DONATION,,-500.00,tax,John
```

**`fixtures/csv/empty.csv`**
```csv
Date,Merchant,Category,Account,Original Statement,Notes,Amount,Tags,Owner
```

#### Config Fixtures

**`fixtures/config/valid.yaml`**
```yaml
mappings:
  - merchant: "RED CROSS"
    organization: "American National Red Cross"
    ein: "53-0196605"
  - merchant: "UNITED WAY"
    organization: "United Way Worldwide"
    ein: "13-1635294"
  - merchant: "GOODWILL DONATION"
    organization: "Goodwill Industries International"
```

**`fixtures/config/duplicate-merchants.yaml`**
```yaml
mappings:
  - merchant: "RED CROSS"
    organization: "American National Red Cross"
    ein: "53-0196605"
  - merchant: "red cross"
    organization: "Red Cross of California"
    ein: "99-9999999"
```

#### Expected Output Fixtures

**`fixtures/expected/output.txf`**
```
V042
Acsv-to-txf 1.0.0
D01/28/2026
TD
N280
C1
L1
$-100.00
X01/15/2026 Chase Checking American National Red Cross EIN:53-0196605
^
TD
N280
C1
L1
$-250.50
X02/20/2026 Chase Checking United Way Worldwide EIN:13-1635294
^
TD
N280
C1
L1
$-75.00
X03/10/2026 Chase Checking Goodwill Industries International
^
```

---

## 5. Sample Test Cases

### 5.1 YAML Config Parsing (`config/loader.test.ts`)

```typescript
describe('ConfigLoader', () => {
  describe('loadConfig', () => {
    it('should parse a valid YAML config file', async () => {
      const config = await loadConfig('fixtures/config/valid.yaml');
      expect(config.mappings).toHaveLength(3);
      expect(config.mappings[0]).toEqual({
        merchant: 'RED CROSS',
        organization: 'American National Red Cross',
        ein: '53-0196605'
      });
    });

    it('should handle config without EIN fields', async () => {
      const config = await loadConfig('fixtures/config/valid.yaml');
      const goodwill = config.mappings.find(m => m.merchant === 'GOODWILL DONATION');
      expect(goodwill?.ein).toBeUndefined();
    });

    it('should throw ConfigNotFoundError for missing file', async () => {
      await expect(loadConfig('nonexistent.yaml'))
        .rejects.toThrow(ConfigNotFoundError);
    });

    it('should throw ConfigParseError for invalid YAML syntax', async () => {
      await expect(loadConfig('fixtures/config/invalid-yaml.yaml'))
        .rejects.toThrow(ConfigParseError);
    });

    it('should resolve tilde paths to home directory', async () => {
      // Mock home directory
      const config = await loadConfig('~/.config/csv-to-txf/mappings.yaml');
      expect(config).toBeDefined();
    });
  });
});
```

### 5.2 Config Validation (`config/validator.test.ts`)

```typescript
describe('ConfigValidator', () => {
  describe('validateConfig', () => {
    it('should accept valid config with all required fields', () => {
      const config = { mappings: [{ merchant: 'TEST', organization: 'Test Org' }] };
      expect(() => validateConfig(config)).not.toThrow();
    });

    it('should reject config with empty merchant', () => {
      const config = { mappings: [{ merchant: '', organization: 'Test Org' }] };
      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
    });

    it('should reject config with empty organization', () => {
      const config = { mappings: [{ merchant: 'TEST', organization: '' }] };
      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
    });

    it('should reject config with missing mappings array', () => {
      const config = {};
      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
    });

    it('should reject config with empty mappings array', () => {
      const config = { mappings: [] };
      expect(() => validateConfig(config)).toThrow(ConfigValidationError);
    });

    it('should return warning for duplicate merchants (case-insensitive)', () => {
      const config = {
        mappings: [
          { merchant: 'RED CROSS', organization: 'Org 1' },
          { merchant: 'red cross', organization: 'Org 2' }
        ]
      };
      const result = validateConfig(config);
      expect(result.warnings).toContain('Duplicate merchant: "red cross" (matches "RED CROSS")');
    });
  });
});
```

### 5.3 Merchant Lookup (`merchant/lookup.test.ts`)

```typescript
describe('MerchantLookup', () => {
  const config: Config = {
    mappings: [
      { merchant: 'RED CROSS', organization: 'American National Red Cross', ein: '53-0196605' },
      { merchant: 'UNITED WAY', organization: 'United Way Worldwide', ein: '13-1635294' },
      { merchant: 'Goodwill Donation', organization: 'Goodwill Industries International' }
    ]
  };

  describe('lookupMerchant', () => {
    it('should find exact match (same case)', () => {
      const result = lookupMerchant('RED CROSS', config);
      expect(result).toEqual({
        merchant: 'RED CROSS',
        organization: 'American National Red Cross',
        ein: '53-0196605'
      });
    });

    it('should find case-insensitive match (lowercase)', () => {
      const result = lookupMerchant('red cross', config);
      expect(result?.organization).toBe('American National Red Cross');
    });

    it('should find case-insensitive match (mixed case)', () => {
      const result = lookupMerchant('Red Cross', config);
      expect(result?.organization).toBe('American National Red Cross');
    });

    it('should find case-insensitive match (config has mixed case)', () => {
      const result = lookupMerchant('GOODWILL DONATION', config);
      expect(result?.organization).toBe('Goodwill Industries International');
    });

    it('should return undefined for unmapped merchant', () => {
      const result = lookupMerchant('UNKNOWN CHARITY', config);
      expect(result).toBeUndefined();
    });

    it('should require exact match after normalization', () => {
      const result = lookupMerchant('RED CROSS INC', config);
      expect(result).toBeUndefined();
    });

    it('should return first match when duplicates exist', () => {
      const duplicateConfig: Config = {
        mappings: [
          { merchant: 'TEST', organization: 'First Org' },
          { merchant: 'test', organization: 'Second Org' }
        ]
      };
      const result = lookupMerchant('TEST', duplicateConfig);
      expect(result?.organization).toBe('First Org');
    });

    it('should handle merchants with special characters', () => {
      const specialConfig: Config = {
        mappings: [
          { merchant: "ST. MARY'S CHURCH", organization: "St. Mary's Catholic Church" }
        ]
      };
      const result = lookupMerchant("ST. MARY'S CHURCH", specialConfig);
      expect(result?.organization).toBe("St. Mary's Catholic Church");
    });
  });
});
```

### 5.4 Merchant Extractor (`merchant/extractor.test.ts`)

```typescript
describe('MerchantExtractor', () => {
  describe('extractUniqueMerchants', () => {
    it('should extract unique merchants from CSV rows', () => {
      const rows: CsvRow[] = [
        { merchant: 'RED CROSS', ...rest },
        { merchant: 'UNITED WAY', ...rest },
        { merchant: 'RED CROSS', ...rest }
      ];
      const result = extractUniqueMerchants(rows);
      expect(result).toEqual(['RED CROSS', 'UNITED WAY']);
    });

    it('should sort merchants alphabetically', () => {
      const rows: CsvRow[] = [
        { merchant: 'ZEBRA CHARITY', ...rest },
        { merchant: 'ALPHA ORG', ...rest },
        { merchant: 'MIDDLE PLACE', ...rest }
      ];
      const result = extractUniqueMerchants(rows);
      expect(result).toEqual(['ALPHA ORG', 'MIDDLE PLACE', 'ZEBRA CHARITY']);
    });

    it('should preserve original case of first occurrence', () => {
      const rows: CsvRow[] = [
        { merchant: 'Red Cross', ...rest },
        { merchant: 'RED CROSS', ...rest }
      ];
      const result = extractUniqueMerchants(rows);
      expect(result).toEqual(['Red Cross']);
    });

    it('should deduplicate case-insensitively', () => {
      const rows: CsvRow[] = [
        { merchant: 'red cross', ...rest },
        { merchant: 'RED CROSS', ...rest },
        { merchant: 'Red Cross', ...rest }
      ];
      const result = extractUniqueMerchants(rows);
      expect(result).toHaveLength(1);
    });

    it('should return empty array for empty input', () => {
      const result = extractUniqueMerchants([]);
      expect(result).toEqual([]);
    });

    it('should handle merchants with special characters', () => {
      const rows: CsvRow[] = [
        { merchant: "ST. MARY'S CHURCH", ...rest },
        { merchant: 'CHURCH #123', ...rest }
      ];
      const result = extractUniqueMerchants(rows);
      expect(result).toContain("ST. MARY'S CHURCH");
      expect(result).toContain('CHURCH #123');
    });
  });
});
```

### 5.5 Preflight Validation (`validation/preflight.test.ts`)

```typescript
describe('PreflightValidation', () => {
  describe('validateAllMerchantsMapped', () => {
    it('should pass when all merchants have mappings', () => {
      const merchants = ['RED CROSS', 'UNITED WAY'];
      const config: Config = {
        mappings: [
          { merchant: 'RED CROSS', organization: 'Org 1' },
          { merchant: 'UNITED WAY', organization: 'Org 2' }
        ]
      };
      const result = validateAllMerchantsMapped(merchants, config);
      expect(result.valid).toBe(true);
      expect(result.unmappedMerchants).toHaveLength(0);
    });

    it('should fail when any merchant is unmapped', () => {
      const merchants = ['RED CROSS', 'UNKNOWN CHARITY'];
      const config: Config = {
        mappings: [{ merchant: 'RED CROSS', organization: 'Org 1' }]
      };
      const result = validateAllMerchantsMapped(merchants, config);
      expect(result.valid).toBe(false);
      expect(result.unmappedMerchants).toEqual(['UNKNOWN CHARITY']);
    });

    it('should list all unmapped merchants (not just first)', () => {
      const merchants = ['A', 'B', 'C'];
      const config: Config = { mappings: [] };
      const result = validateAllMerchantsMapped(merchants, config);
      expect(result.unmappedMerchants).toEqual(['A', 'B', 'C']);
    });

    it('should match merchants case-insensitively', () => {
      const merchants = ['red cross'];
      const config: Config = {
        mappings: [{ merchant: 'RED CROSS', organization: 'Org 1' }]
      };
      const result = validateAllMerchantsMapped(merchants, config);
      expect(result.valid).toBe(true);
    });
  });

  describe('runPreflightChecks', () => {
    it('should aggregate all validation results', async () => {
      const result = await runPreflightChecks({
        csvPath: 'fixtures/csv/valid.csv',
        configPath: 'fixtures/config/valid.yaml'
      });
      expect(result.configValid).toBe(true);
      expect(result.allMerchantsMapped).toBe(true);
      expect(result.canProceed).toBe(true);
    });

    it('should stop processing if config is invalid', async () => {
      const result = await runPreflightChecks({
        csvPath: 'fixtures/csv/valid.csv',
        configPath: 'fixtures/config/invalid-yaml.yaml'
      });
      expect(result.configValid).toBe(false);
      expect(result.canProceed).toBe(false);
    });

    it('should report unmapped merchants before processing', async () => {
      const result = await runPreflightChecks({
        csvPath: 'fixtures/csv/unmapped-merchant.csv',
        configPath: 'fixtures/config/valid.yaml'
      });
      expect(result.allMerchantsMapped).toBe(false);
      expect(result.unmappedMerchants.length).toBeGreaterThan(0);
    });
  });
});
```

### 5.6 CSV Parsing (`csv/parser.test.ts`)

```typescript
describe('CsvParser', () => {
  describe('parseCSV', () => {
    it('should parse valid CSV with all columns', async () => {
      const rows = await parseCSV('fixtures/csv/valid.csv');
      expect(rows).toHaveLength(3);
      expect(rows[0]).toEqual({
        date: '01/15/2026',
        merchant: 'RED CROSS',
        category: 'Donations',
        account: 'Chase Checking',
        originalStatement: 'REDCROSS*DONATION',
        notes: 'Annual donation',
        amount: '-100.00',
        tags: 'tax',
        owner: 'John',
        lineNumber: 2
      });
    });

    it('should handle quoted fields containing commas', async () => {
      const rows = await parseCSV('fixtures/csv/quoted-fields.csv');
      expect(rows[0].merchant).toBe('CHURCH OF THE GOOD SHEPHERD, INC.');
    });

    it('should return empty array for empty CSV (headers only)', async () => {
      const rows = await parseCSV('fixtures/csv/empty.csv');
      expect(rows).toHaveLength(0);
    });

    it('should throw CsvParseError for file without headers', async () => {
      await expect(parseCSV('fixtures/csv/no-headers.csv'))
        .rejects.toThrow(CsvParseError);
    });

    it('should handle empty optional fields', async () => {
      const rows = await parseCSV('fixtures/csv/valid.csv');
      const rowWithEmptyNotes = rows.find(r => r.notes === '');
      expect(rowWithEmptyNotes).toBeDefined();
    });

    it('should preserve line numbers for error reporting', async () => {
      const rows = await parseCSV('fixtures/csv/valid.csv');
      expect(rows[0].lineNumber).toBe(2); // Line 1 is header
      expect(rows[1].lineNumber).toBe(3);
    });

    it('should handle UTF-8 characters', async () => {
      const rows = await parseCSV('fixtures/csv/unicode.csv');
      expect(rows[0].notes).toContain('Café');
    });
  });
});
```

### 5.7 CSV Row Validation (`csv/validator.test.ts`)

```typescript
describe('CsvRowValidator', () => {
  describe('validateRow', () => {
    it('should accept valid row with all required fields', () => {
      const row: CsvRow = {
        date: '01/15/2026',
        merchant: 'RED CROSS',
        amount: '-100.00',
        ...optionalFields,
        lineNumber: 2
      };
      const result = validateRow(row);
      expect(result.valid).toBe(true);
      expect(result.transaction.amount).toBe(-100.00);
    });

    it('should reject row with missing date', () => {
      const row: CsvRow = { date: '', merchant: 'TEST', amount: '-100.00', lineNumber: 2, ...rest };
      const result = validateRow(row);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: Date (line 2)');
    });

    it('should reject row with missing merchant', () => {
      const row: CsvRow = { date: '01/15/2026', merchant: '', amount: '-100.00', lineNumber: 2, ...rest };
      const result = validateRow(row);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: Merchant (line 2)');
    });

    it('should reject row with missing amount', () => {
      const row: CsvRow = { date: '01/15/2026', merchant: 'TEST', amount: '', lineNumber: 2, ...rest };
      const result = validateRow(row);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: Amount (line 2)');
    });

    it('should collect all errors for row with multiple issues', () => {
      const row: CsvRow = { date: '', merchant: '', amount: '', lineNumber: 5, ...rest };
      const result = validateRow(row);
      expect(result.errors.length).toBe(3);
    });
  });
});
```

### 5.8 Date Validation (`validation/date.test.ts`)

```typescript
describe('DateValidation', () => {
  describe('parseDate', () => {
    it('should parse MM/DD/YYYY format', () => {
      const date = parseDate('01/15/2026');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(0); // January
      expect(date.getDate()).toBe(15);
    });

    it('should parse YYYY-MM-DD format', () => {
      const date = parseDate('2026-01-15');
      expect(date.getFullYear()).toBe(2026);
    });

    it('should parse M/D/YYYY format (no leading zeros)', () => {
      const date = parseDate('1/5/2026');
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(5);
    });

    it('should throw DateParseError for invalid date string', () => {
      expect(() => parseDate('not-a-date')).toThrow(DateParseError);
    });

    it('should throw DateParseError for invalid date values', () => {
      expect(() => parseDate('13/45/2026')).toThrow(DateParseError);
    });
  });

  describe('validateDateInTaxYear', () => {
    it('should return valid for date within tax year', () => {
      const result = validateDateInTaxYear(new Date('2026-06-15'), 2026);
      expect(result.inRange).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('should return warning for date before tax year', () => {
      const result = validateDateInTaxYear(new Date('2025-12-31'), 2026);
      expect(result.inRange).toBe(false);
      expect(result.warning).toContain('outside tax year 2026');
    });

    it('should return warning for date after tax year', () => {
      const result = validateDateInTaxYear(new Date('2027-01-01'), 2026);
      expect(result.inRange).toBe(false);
      expect(result.warning).toContain('outside tax year 2026');
    });

    it('should accept first day of tax year', () => {
      const result = validateDateInTaxYear(new Date('2026-01-01'), 2026);
      expect(result.inRange).toBe(true);
    });

    it('should accept last day of tax year', () => {
      const result = validateDateInTaxYear(new Date('2026-12-31'), 2026);
      expect(result.inRange).toBe(true);
    });
  });
});
```

### 5.9 Amount Validation (`validation/amount.test.ts`)

```typescript
describe('AmountValidation', () => {
  describe('parseAmount', () => {
    it('should parse negative amount (Monarch expense format)', () => {
      const result = parseAmount('-100.00');
      expect(result).toBe(-100.00);
    });

    it('should parse positive amount and negate it', () => {
      const result = parseAmount('100.00');
      expect(result).toBe(-100.00); // TXF requires negative for expenses
    });

    it('should parse amount with dollar sign', () => {
      const result = parseAmount('$-50.00');
      expect(result).toBe(-50.00);
    });

    it('should parse amount with commas', () => {
      const result = parseAmount('-1,234.56');
      expect(result).toBe(-1234.56);
    });

    it('should throw AmountParseError for non-numeric value', () => {
      expect(() => parseAmount('abc')).toThrow(AmountParseError);
    });

    it('should throw AmountValidationError for zero amount', () => {
      expect(() => parseAmount('0.00')).toThrow(AmountValidationError);
    });
  });

  describe('checkLargeContribution', () => {
    it('should not warn for amounts under $250', () => {
      const result = checkLargeContribution(-249.99);
      expect(result.warning).toBeUndefined();
    });

    it('should warn for amounts at $250 threshold', () => {
      const result = checkLargeContribution(-250.00);
      expect(result.warning).toContain('exceeds $250');
      expect(result.warning).toContain('receipt required');
    });

    it('should warn for amounts over $250', () => {
      const result = checkLargeContribution(-500.00);
      expect(result.warning).toBeDefined();
    });
  });
});
```

### 5.10 Duplicate Detection (`validation/duplicates.test.ts`)

```typescript
describe('DuplicateDetection', () => {
  describe('findDuplicates', () => {
    it('should return empty array when no duplicates', () => {
      const transactions: ResolvedTransaction[] = [
        { date: new Date('2026-01-15'), organization: 'Org A', amount: -100, ...rest },
        { date: new Date('2026-01-16'), organization: 'Org A', amount: -100, ...rest },
      ];
      const result = findDuplicates(transactions);
      expect(result).toHaveLength(0);
    });

    it('should detect duplicate (same date, amount, organization)', () => {
      const transactions: ResolvedTransaction[] = [
        { date: new Date('2026-01-15'), organization: 'Org A', amount: -100, lineNumber: 2, ...rest },
        { date: new Date('2026-01-15'), organization: 'Org A', amount: -100, lineNumber: 5, ...rest },
      ];
      const result = findDuplicates(transactions);
      expect(result).toHaveLength(1);
      expect(result[0].lineNumbers).toEqual([2, 5]);
    });

    it('should not flag as duplicate if amount differs', () => {
      const transactions: ResolvedTransaction[] = [
        { date: new Date('2026-01-15'), organization: 'Org A', amount: -100, ...rest },
        { date: new Date('2026-01-15'), organization: 'Org A', amount: -200, ...rest },
      ];
      const result = findDuplicates(transactions);
      expect(result).toHaveLength(0);
    });

    it('should not flag as duplicate if organization differs', () => {
      const transactions: ResolvedTransaction[] = [
        { date: new Date('2026-01-15'), organization: 'Org A', amount: -100, ...rest },
        { date: new Date('2026-01-15'), organization: 'Org B', amount: -100, ...rest },
      ];
      const result = findDuplicates(transactions);
      expect(result).toHaveLength(0);
    });

    it('should group more than 2 duplicates together', () => {
      const transactions: ResolvedTransaction[] = [
        { date: new Date('2026-01-15'), organization: 'Org A', amount: -100, lineNumber: 2, ...rest },
        { date: new Date('2026-01-15'), organization: 'Org A', amount: -100, lineNumber: 3, ...rest },
        { date: new Date('2026-01-15'), organization: 'Org A', amount: -100, lineNumber: 4, ...rest },
      ];
      const result = findDuplicates(transactions);
      expect(result).toHaveLength(1);
      expect(result[0].lineNumbers).toEqual([2, 3, 4]);
    });
  });
});
```

### 5.11 TXF Formatter (`txf/formatter.test.ts`)

```typescript
describe('TxfFormatter', () => {
  describe('formatDate', () => {
    it('should format date as MM/DD/YYYY', () => {
      const result = formatDate(new Date('2026-01-15'));
      expect(result).toBe('01/15/2026');
    });

    it('should pad single digit months and days', () => {
      const result = formatDate(new Date('2026-05-05'));
      expect(result).toBe('05/05/2026');
    });
  });

  describe('formatAmount', () => {
    it('should format with exactly 2 decimal places', () => {
      expect(formatAmount(-100)).toBe('-100.00');
    });

    it('should format fractional amounts correctly', () => {
      expect(formatAmount(-123.456)).toBe('-123.46'); // Rounded
    });

    it('should format whole numbers with decimals', () => {
      expect(formatAmount(-50)).toBe('-50.00');
    });

    it('should preserve negative sign', () => {
      expect(formatAmount(-99.99)).toBe('-99.99');
    });
  });

  describe('formatDetailLine', () => {
    it('should format detail line with EIN', () => {
      const result = formatDetailLine({
        date: new Date('2026-01-15'),
        account: 'Chase Checking',
        organization: 'American Red Cross',
        ein: '53-0196605'
      });
      expect(result).toBe('01/15/2026 Chase Checking American Red Cross EIN:53-0196605');
    });

    it('should format detail line without EIN', () => {
      const result = formatDetailLine({
        date: new Date('2026-01-15'),
        account: 'Chase Checking',
        organization: 'Goodwill Industries'
      });
      expect(result).toBe('01/15/2026 Chase Checking Goodwill Industries');
    });

    it('should truncate organization names over 64 characters', () => {
      const longName = 'A'.repeat(70);
      const result = formatDetailLine({
        date: new Date('2026-01-15'),
        account: 'Checking',
        organization: longName
      });
      expect(result.length).toBeLessThanOrEqual(100); // Reasonable max
      expect(result).toContain('A'.repeat(64));
    });
  });
});
```

### 5.12 TXF Generator (`txf/generator.test.ts`)

```typescript
describe('TxfGenerator', () => {
  describe('generateHeader', () => {
    it('should generate valid TXF header', () => {
      const header = generateHeader({
        date: new Date('2026-01-28'),
        appVersion: '1.0.0'
      });
      expect(header).toBe('V042\r\nAcsv-to-txf 1.0.0\r\nD01/28/2026\r\n');
    });
  });

  describe('generateRecord', () => {
    it('should generate valid TXF record for charitable contribution', () => {
      const record = generateRecord({
        date: new Date('2026-01-15'),
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
      const record = generateRecord({ ...validTransaction });
      expect(record).toContain('N280');
    });
  });

  describe('generateTxf', () => {
    it('should generate complete TXF file with header and records', () => {
      const transactions = [
        { date: new Date('2026-01-15'), organization: 'Org A', amount: -100, account: 'Checking' }
      ];
      const txf = generateTxf(transactions, { date: new Date('2026-01-28') });
      expect(txf).toMatch(/^V042\r\n/);
      expect(txf).toContain('TD\r\n');
      expect(txf.endsWith('^\r\n')).toBe(true);
    });

    it('should include all transactions in output', () => {
      const transactions = [
        { date: new Date('2026-01-15'), organization: 'Org A', amount: -100, account: 'Checking' },
        { date: new Date('2026-02-20'), organization: 'Org B', amount: -200, account: 'Checking' }
      ];
      const txf = generateTxf(transactions, { date: new Date('2026-01-28') });
      const recordCount = (txf.match(/^TD\r$/gm) || []).length;
      expect(recordCount).toBe(2);
    });

    it('should use CRLF line endings throughout', () => {
      const txf = generateTxf([validTransaction], { date: new Date() });
      expect(txf).not.toMatch(/[^\r]\n/); // No LF without preceding CR
    });

    it('should use ASCII-safe characters only', () => {
      const txf = generateTxf([validTransaction], { date: new Date() });
      expect(txf).toMatch(/^[\x00-\x7F]*$/); // ASCII only
    });
  });
});
```

### 5.13 Init Command (`cli/init.test.ts`)

```typescript
describe('InitCommand', () => {
  describe('generateConfigTemplate', () => {
    it('should generate YAML with all unique merchants', () => {
      const merchants = ['RED CROSS', 'UNITED WAY'];
      const yaml = generateConfigTemplate(merchants);
      expect(yaml).toContain('merchant: "RED CROSS"');
      expect(yaml).toContain('merchant: "UNITED WAY"');
    });

    it('should include placeholder organization fields', () => {
      const yaml = generateConfigTemplate(['TEST']);
      expect(yaml).toContain('organization: ""');
      expect(yaml).toContain('# TODO');
    });

    it('should include commented EIN field', () => {
      const yaml = generateConfigTemplate(['TEST']);
      expect(yaml).toContain('# ein:');
    });

    it('should include header comment', () => {
      const yaml = generateConfigTemplate(['TEST']);
      expect(yaml).toContain('# Generated by csv-to-txf init');
    });

    it('should sort merchants alphabetically', () => {
      const yaml = generateConfigTemplate(['ZEBRA', 'ALPHA', 'MIDDLE']);
      const alphaIndex = yaml.indexOf('ALPHA');
      const middleIndex = yaml.indexOf('MIDDLE');
      const zebraIndex = yaml.indexOf('ZEBRA');
      expect(alphaIndex).toBeLessThan(middleIndex);
      expect(middleIndex).toBeLessThan(zebraIndex);
    });
  });

  describe('mergeConfigs', () => {
    it('should preserve existing mappings', () => {
      const existing = {
        mappings: [
          { merchant: 'RED CROSS', organization: 'American Red Cross', ein: '53-0196605' }
        ]
      };
      const newMerchants = ['RED CROSS', 'UNITED WAY'];
      const result = mergeConfigs(existing, newMerchants);

      const redCross = result.mappings.find(m => m.merchant === 'RED CROSS');
      expect(redCross?.organization).toBe('American Red Cross');
      expect(redCross?.ein).toBe('53-0196605');
    });

    it('should add new merchants with empty organization', () => {
      const existing = {
        mappings: [{ merchant: 'RED CROSS', organization: 'American Red Cross' }]
      };
      const newMerchants = ['RED CROSS', 'UNITED WAY'];
      const result = mergeConfigs(existing, newMerchants);

      const unitedWay = result.mappings.find(m => m.merchant === 'UNITED WAY');
      expect(unitedWay?.organization).toBe('');
    });

    it('should match existing mappings case-insensitively', () => {
      const existing = {
        mappings: [{ merchant: 'Red Cross', organization: 'American Red Cross' }]
      };
      const newMerchants = ['RED CROSS'];
      const result = mergeConfigs(existing, newMerchants);

      expect(result.mappings).toHaveLength(1);
      expect(result.mappings[0].merchant).toBe('Red Cross'); // Preserve original case
    });

    it('should sort merged results alphabetically', () => {
      const existing = { mappings: [{ merchant: 'ZEBRA', organization: 'Z Org' }] };
      const newMerchants = ['ALPHA'];
      const result = mergeConfigs(existing, newMerchants);

      expect(result.mappings[0].merchant).toBe('ALPHA');
      expect(result.mappings[1].merchant).toBe('ZEBRA');
    });
  });
});
```

### 5.14 Integration Tests (`integration/convert.test.ts`)

```typescript
describe('Convert Command Integration', () => {
  it('should convert valid CSV to TXF with all mappings', async () => {
    const result = await runCli([
      'convert',
      'fixtures/csv/valid.csv',
      '--config', 'fixtures/config/valid.yaml',
      '--output', 'fixtures/output/test.txf'
    ]);

    expect(result.exitCode).toBe(0);
    const output = await readFile('fixtures/output/test.txf', 'utf-8');
    expect(output).toContain('V042');
    expect(output).toContain('American National Red Cross');
  });

  it('should fail with exit code 3 for unmapped merchants', async () => {
    const result = await runCli([
      'convert',
      'fixtures/csv/unmapped-merchant.csv',
      '--config', 'fixtures/config/valid.yaml'
    ]);

    expect(result.exitCode).toBe(3);
    expect(result.stderr).toContain('unmapped');
  });

  it('should validate dates against tax year', async () => {
    const result = await runCli([
      'convert',
      'fixtures/csv/wrong-year.csv',
      '--config', 'fixtures/config/valid.yaml',
      '--tax-year', '2026'
    ]);

    expect(result.stderr).toContain('warning');
    expect(result.stderr).toContain('outside tax year');
  });

  it('should filter by category when --category specified', async () => {
    const result = await runCli([
      'convert',
      'fixtures/csv/mixed-categories.csv',
      '--config', 'fixtures/config/valid.yaml',
      '--category', 'Donations'
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('3 transactions processed'); // Only donations
  });

  it('should report summary statistics', async () => {
    const result = await runCli([
      'convert',
      'fixtures/csv/valid.csv',
      '--config', 'fixtures/config/valid.yaml'
    ]);

    expect(result.stdout).toContain('transactions processed');
    expect(result.stdout).toContain('Total:');
    expect(result.stdout).toContain('organizations');
  });

  it('should handle dry-run mode without writing file', async () => {
    const result = await runCli([
      'convert',
      'fixtures/csv/valid.csv',
      '--config', 'fixtures/config/valid.yaml',
      '--output', 'fixtures/output/should-not-exist.txf',
      '--dry-run'
    ]);

    expect(result.exitCode).toBe(0);
    const exists = await fileExists('fixtures/output/should-not-exist.txf');
    expect(exists).toBe(false);
  });
});
```

---

## 6. Edge Cases to Test

### 6.1 File Edge Cases

| Edge Case | Test File | Expected Behavior |
|-----------|-----------|-------------------|
| Empty CSV (headers only) | `empty.csv` | Exit 0, report "0 transactions" |
| CSV without headers | `no-headers.csv` | Exit 1, "missing headers" error |
| Malformed CSV (unbalanced quotes) | `malformed.csv` | Exit 1, parse error with line number |
| Very large file (1000+ rows) | `large.csv` | Complete within reasonable time |
| File with BOM | `bom.csv` | Parse correctly, ignore BOM |
| Windows line endings (CRLF) | `crlf.csv` | Parse correctly |
| Empty config file | `empty-config.yaml` | Exit 1, "no mappings found" |
| Malformed YAML | `invalid.yaml` | Exit 1, YAML parse error |
| File not found | N/A | Exit 2, file not found error |
| Permission denied | N/A | Exit 2, permission error |

### 6.2 Data Edge Cases

| Edge Case | Input | Expected Behavior |
|-----------|-------|-------------------|
| Merchant with comma | `"HABITAT FOR HUMANITY, INC."` | Parse as single field |
| Merchant with quotes | `"O'BRIEN'S CHARITY"` | Handle apostrophes |
| Merchant with special chars | `CHURCH #123 & SCHOOL` | Preserve in output |
| Unicode in notes | `Café donation` | Handle gracefully |
| Very long merchant name | 100+ characters | Truncate at 64 chars |
| Amount with currency symbol | `$-100.00` | Parse correctly |
| Amount with thousand separators | `-1,234.56` | Parse as -1234.56 |
| Zero amount | `0.00` | Reject with error |
| Positive amount | `100.00` | Convert to negative |
| Date formats | Various | Parse all documented formats |
| Date on year boundary | `12/31/2025`, `01/01/2027` | Warn, include in output |

### 6.3 Merchant Matching Edge Cases

| Edge Case | Config | Input | Expected |
|-----------|--------|-------|----------|
| Exact match same case | `RED CROSS` | `RED CROSS` | Match |
| Case mismatch | `RED CROSS` | `red cross` | Match |
| Mixed case | `Red Cross` | `RED CROSS` | Match |
| Partial match | `RED CROSS` | `RED CROSS INC` | No match |
| Leading/trailing space | `RED CROSS` | ` RED CROSS ` | Match (after trim) |
| Duplicate config entries | Two `RED CROSS` entries | `RED CROSS` | Use first, warn |
| Same org, different merchants | Two merchants → same org | N/A | Both valid |

---

## 7. Implementation Order (TDD Sequence)

### Phase 1: Foundation (Weeks 1-2)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Project Setup                                            │
│    - Initialize npm project                                 │
│    - Configure TypeScript, ESLint, Vitest                   │
│    - Create directory structure                             │
│    - Set up test fixtures                                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Error Classes & Types                                    │
│    RED: Write tests for custom error classes                │
│    GREEN: Implement ConfigNotFoundError, CsvParseError, etc.│
│    REFACTOR: Ensure consistent error message format         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Config Loader                                            │
│    RED: Write config/loader.test.ts                         │
│    GREEN: Implement YAML loading, path resolution           │
│    REFACTOR: Extract path utils                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Config Validator                                         │
│    RED: Write config/validator.test.ts                      │
│    GREEN: Implement validation rules                        │
│    REFACTOR: Create validation result type                  │
└─────────────────────────────────────────────────────────────┘
```

### Phase 2: Core Parsing (Weeks 2-3)

```
┌─────────────────────────────────────────────────────────────┐
│ 5. CSV Parser                                               │
│    RED: Write csv/parser.test.ts                            │
│    GREEN: Implement CSV parsing with csv-parse              │
│    REFACTOR: Add line number tracking                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. CSV Row Validator                                        │
│    RED: Write csv/validator.test.ts                         │
│    GREEN: Implement required field validation               │
│    REFACTOR: Aggregate multiple errors per row              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Date Validation                                          │
│    RED: Write validation/date.test.ts                       │
│    GREEN: Implement date parsing and tax year check         │
│    REFACTOR: Support multiple date formats                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. Amount Validation                                        │
│    RED: Write validation/amount.test.ts                     │
│    GREEN: Implement parsing and $250 warning                │
│    REFACTOR: Handle currency symbols, separators            │
└─────────────────────────────────────────────────────────────┘
```

### Phase 3: Merchant Logic (Weeks 3-4)

```
┌─────────────────────────────────────────────────────────────┐
│ 9. Merchant Lookup                                          │
│    RED: Write merchant/lookup.test.ts                       │
│    GREEN: Implement case-insensitive matching               │
│    REFACTOR: Optimize lookup with Map                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 10. Merchant Extractor                                      │
│     RED: Write merchant/extractor.test.ts                   │
│     GREEN: Extract unique merchants, sort alphabetically    │
│     REFACTOR: Case-insensitive deduplication                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 11. Preflight Validation                                    │
│     RED: Write validation/preflight.test.ts                 │
│     GREEN: Orchestrate all checks, fail fast                │
│     REFACTOR: Create comprehensive result object            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 12. Duplicate Detection                                     │
│     RED: Write validation/duplicates.test.ts                │
│     GREEN: Detect same date/amount/org                      │
│     REFACTOR: Group duplicates for reporting                │
└─────────────────────────────────────────────────────────────┘
```

### Phase 4: TXF Generation (Weeks 4-5)

```
┌─────────────────────────────────────────────────────────────┐
│ 13. TXF Formatter                                           │
│     RED: Write txf/formatter.test.ts                        │
│     GREEN: Date format, amount format, detail line          │
│     REFACTOR: Ensure CRLF, ASCII compliance                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 14. TXF Generator                                           │
│     RED: Write txf/generator.test.ts                        │
│     GREEN: Header, records, complete file                   │
│     REFACTOR: Stream writing for large files                │
└─────────────────────────────────────────────────────────────┘
```

### Phase 5: CLI Commands (Weeks 5-6)

```
┌─────────────────────────────────────────────────────────────┐
│ 15. Init Command Template Generation                        │
│     RED: Write cli/init.test.ts (template tests)            │
│     GREEN: Generate YAML template                           │
│     REFACTOR: Add comments, formatting                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 16. Init Command Merge Logic                                │
│     RED: Write cli/init.test.ts (merge tests)               │
│     GREEN: Implement config merging                         │
│     REFACTOR: Preserve existing data, sort output           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 17. Convert Command                                         │
│     RED: Write cli/convert.test.ts (unit tests)             │
│     GREEN: Wire up all components                           │
│     REFACTOR: Clean exit codes, error handling              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 18. CLI Entry Point                                         │
│     RED: Write cli/index.test.ts                            │
│     GREEN: Commander setup, argument parsing                │
│     REFACTOR: Help text, version info                       │
└─────────────────────────────────────────────────────────────┘
```

### Phase 6: Integration & Polish (Week 6)

```
┌─────────────────────────────────────────────────────────────┐
│ 19. Integration Tests                                       │
│     RED: Write integration/convert.test.ts                  │
│     GREEN: End-to-end happy path                            │
│     REFACTOR: Add error scenarios                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 20. Integration Tests (Init)                                │
│     RED: Write integration/init.test.ts                     │
│     GREEN: End-to-end init command                          │
│     REFACTOR: Merge scenarios                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 21. Summary Report & Verbose Mode                           │
│     RED: Add tests for output formatting                    │
│     GREEN: Implement summary, verbose output                │
│     REFACTOR: Consistent styling                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 22. Build & Distribution                                    │
│     - Configure tsup bundler                                │
│     - Test binary on macOS                                  │
│     - Write README installation instructions                │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Module Dependencies

```
                        ┌──────────────┐
                        │   cli/index  │
                        └──────┬───────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       ┌──────────┐     ┌───────────┐    ┌───────────┐
       │cli/init  │     │cli/convert│    │utils/paths│
       └────┬─────┘     └─────┬─────┘    └───────────┘
            │                 │
    ┌───────┴───────┐   ┌─────┴─────────────────────┐
    │               │   │                           │
    ▼               ▼   ▼                           ▼
┌────────────┐ ┌────────────┐              ┌────────────────┐
│ merchant/  │ │ config/    │              │ validation/    │
│ extractor  │ │ loader     │              │ preflight      │
└────────────┘ └─────┬──────┘              └───────┬────────┘
                     │                             │
                     ▼                    ┌────────┼────────┐
              ┌────────────┐              │        │        │
              │ config/    │              ▼        ▼        ▼
              │ validator  │          ┌──────┐ ┌──────┐ ┌──────────┐
              └────────────┘          │date  │ │amount│ │duplicates│
                                      └──────┘ └──────┘ └──────────┘

       ┌──────────────────────────────────────────────┐
       │                                              │
       ▼                                              ▼
┌─────────────┐    ┌─────────────┐           ┌─────────────┐
│ csv/parser  │───▶│ csv/        │           │ merchant/   │
│             │    │ validator   │           │ lookup      │
└─────────────┘    └─────────────┘           └──────┬──────┘
                                                    │
                                                    ▼
                                            ┌─────────────┐
                                            │ txf/        │
                                            │ generator   │
                                            └──────┬──────┘
                                                   │
                                                   ▼
                                            ┌─────────────┐
                                            │ txf/        │
                                            │ formatter   │
                                            └─────────────┘
```

---

## 9. Test Coverage Goals

| Module | Line Coverage Target | Branch Coverage Target |
|--------|---------------------|----------------------|
| config/loader | 95% | 90% |
| config/validator | 95% | 90% |
| csv/parser | 90% | 85% |
| csv/validator | 95% | 90% |
| merchant/lookup | 100% | 100% |
| merchant/extractor | 100% | 95% |
| validation/* | 95% | 90% |
| txf/formatter | 100% | 100% |
| txf/generator | 95% | 90% |
| cli/* | 80% | 75% |
| **Overall** | **90%** | **85%** |

---

## 10. Risk Areas & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| TXF format incompatibility with TurboTax | High | Test with actual TurboTax Desktop; reference official TXF spec |
| CSV parsing edge cases from Monarch | Medium | Collect real-world samples; add fixture-driven tests |
| Date parsing ambiguity | Low | Support explicit formats; document expected input |
| Large file performance | Low | Test with 1000+ row fixture; optimize only if needed |
| Unicode handling in ASCII TXF | Medium | Strip or transliterate non-ASCII in organization names |

---

## 11. Next Steps

1. **Review this plan** - Identify any missing requirements or edge cases
2. **Create test fixtures** - Build sample CSV and config files before coding
3. **Set up project** - Initialize npm, TypeScript, Vitest configuration
4. **Begin Phase 1** - Start with error classes and config loader tests
5. **Iterate** - Follow TDD cycle: Red → Green → Refactor for each module
