import { Command } from 'commander';
import { convert, ConvertOptions } from './convert.js';
import { generateConfigTemplate, mergeConfigs, generateMergedConfigYaml } from './init.js';
import { parseCSV } from '../csv/parser.js';
import { extractUniqueMerchants } from '../merchant/extractor.js';
import { loadConfig } from '../config/loader.js';
import { getDefaultConfigPath, resolvePath } from '../utils/paths.js';
import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

const program = new Command();

program
  .name('csv-to-txf')
  .description('Convert Monarch Money CSV exports to TXF files for TurboTax')
  .version('1.0.0');

// Convert command (default)
program
  .command('convert <csv-file>', { isDefault: true })
  .description('Convert a CSV file to TXF format')
  .option('-c, --config <path>', 'Path to merchant mappings YAML file', getDefaultConfigPath())
  .option('-o, --output <path>', 'Output TXF file path')
  .option('--tax-year <year>', 'Tax year for date validation', '2026')
  .option('--category <name>', 'Filter by category value')
  .option('--dry-run', 'Validate without writing output', false)
  .option('-v, --verbose', 'Show detailed processing info', false)
  .option('-q, --quiet', 'Suppress warnings, show errors only', false)
  .action(async (csvFile: string, opts) => {
    const options: ConvertOptions = {
      config: opts.config,
      output: opts.output,
      taxYear: parseInt(opts.taxYear, 10),
      category: opts.category,
      dryRun: opts.dryRun,
      verbose: opts.verbose,
      quiet: opts.quiet,
    };

    try {
      const result = await convert(csvFile, options);

      if (!result.success) {
        for (const error of result.errors) {
          console.error(error);
        }
      }

      process.exit(result.exitCode);
    } catch (error) {
      console.error('Unexpected error:', (error as Error).message);
      process.exit(1);
    }
  });

// Init command
program
  .command('init <csv-file>')
  .description('Generate a config template from a CSV file')
  .option('-o, --output <path>', 'Output YAML file path (default: stdout)')
  .option('--merge', 'Merge with existing config file', false)
  .option('-c, --config <path>', 'Path to existing config for --merge', getDefaultConfigPath())
  .action(async (csvFile: string, opts) => {
    try {
      // Parse CSV
      const rows = await parseCSV(resolvePath(csvFile));

      if (rows.length === 0) {
        console.log('No transactions found in CSV file.');
        process.exit(0);
      }

      // Extract unique merchants
      const merchants = extractUniqueMerchants(rows);

      let output: string;

      if (opts.merge) {
        // Load existing config
        try {
          const existingConfig = await loadConfig(opts.config);
          const mergedConfig = mergeConfigs(existingConfig, merchants);
          output = generateMergedConfigYaml(mergedConfig);
        } catch {
          // If config doesn't exist, just generate new template
          output = generateConfigTemplate(merchants);
        }
      } else {
        output = generateConfigTemplate(merchants);
      }

      // Output to file or stdout
      if (opts.output) {
        const outputPath = resolvePath(opts.output);
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, output, 'utf-8');
        console.log(`Config template written to: ${outputPath}`);
        console.log(`Found ${merchants.length} unique merchants.`);
      } else {
        console.log(output);
      }

      process.exit(0);
    } catch (error) {
      console.error('Error:', (error as Error).message);
      process.exit(2);
    }
  });

export { program };

export function run(): void {
  program.parse();
}
