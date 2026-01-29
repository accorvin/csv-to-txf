import { writeFile } from 'fs/promises';
import { basename, dirname, join } from 'path';
import { loadConfig } from '../config/loader.js';
import { validateConfig } from '../config/validator.js';
import { parseCSV } from '../csv/parser.js';
import { validateRows } from '../csv/validator.js';
import { extractUniqueMerchants } from '../merchant/extractor.js';
import { lookupMerchant, createMerchantLookupMap } from '../merchant/lookup.js';
import { validateAllMerchantsMapped } from '../validation/preflight.js';
import { validateDateInTaxYear } from '../validation/date.js';
import { checkLargeContribution } from '../validation/amount.js';
import { findDuplicates } from '../validation/duplicates.js';
import { generateTxf } from '../txf/generator.js';
import { ResolvedTransaction, Config } from '../config/types.js';
import { TxfTransaction } from '../txf/types.js';
import { resolvePath } from '../utils/paths.js';

export interface ConvertOptions {
  config: string;
  output?: string;
  taxYear: number;
  category?: string;
  dryRun: boolean;
  verbose: boolean;
  quiet: boolean;
}

export interface ConvertResult {
  success: boolean;
  exitCode: number;
  transactionsProcessed: number;
  totalAmount: number;
  uniqueOrganizations: number;
  warnings: string[];
  errors: string[];
}

export async function convert(
  csvPath: string,
  options: ConvertOptions
): Promise<ConvertResult> {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Resolve paths
  const resolvedCsvPath = resolvePath(csvPath);
  const resolvedConfigPath = resolvePath(options.config);

  // Determine output path
  const outputPath = options.output
    ? resolvePath(options.output)
    : join(dirname(resolvedCsvPath), `${basename(resolvedCsvPath, '.csv')}.txf`);

  // Load and validate config
  let config: Config;
  try {
    config = await loadConfig(resolvedConfigPath);
  } catch (error) {
    errors.push((error as Error).message);
    return {
      success: false,
      exitCode: 2,
      transactionsProcessed: 0,
      totalAmount: 0,
      uniqueOrganizations: 0,
      warnings,
      errors,
    };
  }

  try {
    const validationResult = validateConfig(config);
    warnings.push(...validationResult.warnings);
  } catch (error) {
    errors.push((error as Error).message);
    return {
      success: false,
      exitCode: 1,
      transactionsProcessed: 0,
      totalAmount: 0,
      uniqueOrganizations: 0,
      warnings,
      errors,
    };
  }

  // Parse CSV
  let csvRows;
  try {
    csvRows = await parseCSV(resolvedCsvPath);
  } catch (error) {
    errors.push((error as Error).message);
    return {
      success: false,
      exitCode: 2,
      transactionsProcessed: 0,
      totalAmount: 0,
      uniqueOrganizations: 0,
      warnings,
      errors,
    };
  }

  // Filter by category if specified
  if (options.category) {
    csvRows = csvRows.filter(row =>
      row.category.toLowerCase() === options.category!.toLowerCase()
    );
  }

  // Handle empty CSV
  if (csvRows.length === 0) {
    if (!options.quiet) {
      console.log('No transactions to process.');
    }
    return {
      success: true,
      exitCode: 0,
      transactionsProcessed: 0,
      totalAmount: 0,
      uniqueOrganizations: 0,
      warnings,
      errors,
    };
  }

  // Preflight: Check all merchants are mapped
  const merchants = extractUniqueMerchants(csvRows);
  const merchantCheck = validateAllMerchantsMapped(merchants, config);

  if (!merchantCheck.valid) {
    errors.push('The following merchants are not mapped in the config:');
    for (const merchant of merchantCheck.unmappedMerchants) {
      errors.push(`  - ${merchant}`);
    }
    errors.push('');
    errors.push('Run "csv-to-txf init <csv-file> --merge" to add them to your config.');
    return {
      success: false,
      exitCode: 3,
      transactionsProcessed: 0,
      totalAmount: 0,
      uniqueOrganizations: 0,
      warnings,
      errors,
    };
  }

  // Validate all rows
  const rowValidation = validateRows(csvRows);
  if (!rowValidation.valid) {
    errors.push(...rowValidation.errors);
    return {
      success: false,
      exitCode: 1,
      transactionsProcessed: 0,
      totalAmount: 0,
      uniqueOrganizations: 0,
      warnings,
      errors,
    };
  }

  // Create lookup map and resolve transactions
  const lookupMap = createMerchantLookupMap(config);
  const resolvedTransactions: ResolvedTransaction[] = [];

  for (const tx of rowValidation.transactions) {
    const mapping = lookupMap.get(tx.merchant.toLowerCase())!;

    // Check date in tax year
    const dateCheck = validateDateInTaxYear(tx.date, options.taxYear);
    if (!dateCheck.inRange && dateCheck.warning) {
      warnings.push(`Line ${tx.lineNumber}: ${dateCheck.warning}`);
    }

    // Check large contribution
    const largeCheck = checkLargeContribution(tx.amount);
    if (largeCheck.warning) {
      warnings.push(`Line ${tx.lineNumber}: ${largeCheck.warning}`);
    }

    resolvedTransactions.push({
      date: tx.date,
      organization: mapping.organization,
      ein: mapping.ein,
      account: tx.account,
      amount: tx.amount,
      lineNumber: tx.lineNumber,
    });
  }

  // Check for duplicates
  const duplicates = findDuplicates(resolvedTransactions);
  for (const dup of duplicates) {
    warnings.push(
      `Potential duplicate: ${dup.organization} on ${dup.date.toLocaleDateString()} ` +
      `for $${Math.abs(dup.amount).toFixed(2)} (lines ${dup.lineNumbers.join(', ')})`
    );
  }

  // Convert to TXF transactions
  const txfTransactions: TxfTransaction[] = resolvedTransactions.map(tx => ({
    date: tx.date,
    organization: tx.organization,
    ein: tx.ein,
    account: tx.account,
    amount: tx.amount,
  }));

  // Generate TXF
  const txfContent = generateTxf(txfTransactions, { date: new Date() });

  // Calculate summary
  const totalAmount = resolvedTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const uniqueOrgs = new Set(resolvedTransactions.map(tx => tx.organization)).size;

  // Write output (unless dry run)
  if (!options.dryRun) {
    try {
      await writeFile(outputPath, txfContent, 'ascii');
    } catch (error) {
      errors.push(`Failed to write output file: ${(error as Error).message}`);
      return {
        success: false,
        exitCode: 2,
        transactionsProcessed: 0,
        totalAmount: 0,
        uniqueOrganizations: 0,
        warnings,
        errors,
      };
    }
  }

  // Print summary
  if (!options.quiet) {
    console.log('');
    console.log(`${resolvedTransactions.length} transactions processed`);
    console.log(`Total: $${Math.abs(totalAmount).toFixed(2)}`);
    console.log(`${uniqueOrgs} unique organizations`);

    if (warnings.length > 0) {
      console.log(`${warnings.length} warning(s)`);
    }

    if (options.dryRun) {
      console.log('');
      console.log('[Dry run - no file written]');
    } else {
      console.log('');
      console.log(`Output written to: ${outputPath}`);
    }
  }

  if (options.verbose) {
    console.log('');
    console.log('Warnings:');
    for (const warning of warnings) {
      console.log(`  ${warning}`);
    }

    console.log('');
    console.log('Generated TXF:');
    console.log(txfContent);
  }

  return {
    success: true,
    exitCode: 0,
    transactionsProcessed: resolvedTransactions.length,
    totalAmount,
    uniqueOrganizations: uniqueOrgs,
    warnings,
    errors,
  };
}
