# csv-to-txf

CLI tool to convert Monarch Money CSV exports to TXF files for importing charitable contributions into TurboTax Desktop.

## Features

- Converts Monarch Money CSV transaction exports to TXF format
- YAML config for mapping merchant names to official organization names
- Case-insensitive merchant matching
- Aggregates multiple donations to the same organization
- Validates dates against tax year
- Warns about contributions over $250 (receipt required)
- Detects duplicate transactions
- TXF v042 format compatible with TurboTax Desktop

## Installation

```bash
git clone https://github.com/accorvin/csv-to-txf.git
cd csv-to-txf
npm install
```

## Quick Start

### 1. Export transactions from Monarch Money

1. Go to Settings > Data in Monarch Money
2. Download your transactions as CSV
3. Filter to charitable donations only

### 2. Generate a config template

```bash
npx tsx src/index.ts init donations.csv -o ~/.config/csv-to-txf/mappings.yaml
```

### 3. Edit the config file

Fill in the official organization names and EINs:

```yaml
mappings:
  - merchant: "RED CROSS"
    organization: "American National Red Cross"
    ein: "53-0196605"

  - merchant: "UNITED WAY"
    organization: "United Way Worldwide"
    ein: "13-1635294"
```

### 4. Convert to TXF

```bash
# Basic conversion
npx tsx src/index.ts convert donations.csv -c ~/.config/csv-to-txf/mappings.yaml

# Aggregate multiple donations to same org (recommended)
npx tsx src/index.ts convert donations.csv -c mappings.yaml --aggregate

# Dry run (validate without writing)
npx tsx src/index.ts convert donations.csv -c mappings.yaml --dry-run
```

### 5. Import into TurboTax Desktop

1. Open TurboTax Desktop
2. Go to **File → Import → From TXF Files** (Mac) or **File → Import → From Accounting Software** (Windows)
3. Select your `.txf` file
4. Review imported contributions in Schedule A

## Command Reference

### convert

Convert a CSV file to TXF format.

```
csv-to-txf convert <csv-file> [options]

Options:
  -c, --config <path>    Path to merchant mappings YAML (default: ~/.config/csv-to-txf/mappings.yaml)
  -o, --output <path>    Output TXF file path (default: <input>.txf)
  --tax-year <year>      Tax year for validation (default: 2026)
  --category <name>      Filter transactions by category
  --aggregate            Combine multiple donations to same organization
  --dry-run              Validate only, don't write file
  -v, --verbose          Show detailed output including generated TXF
  -q, --quiet            Suppress warnings
```

### init

Generate a config template from a CSV file.

```
csv-to-txf init <csv-file> [options]

Options:
  -o, --output <path>    Output YAML file (default: stdout)
  --merge                Merge with existing config, preserving filled-in values
  -c, --config <path>    Existing config path for --merge
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Validation error |
| 2 | File I/O error |
| 3 | Unmapped merchants |

## CSV Format

The tool expects Monarch Money's CSV export format:

```
Date,Merchant,Category,Account,Original Statement,Notes,Amount,Tags,Owner
```

## Development

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run in development
npx tsx src/index.ts --help
```

## License

MIT
