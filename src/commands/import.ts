import { Command } from 'commander';
import type { IImportOptions } from '../types/index.js';
import { Logger } from '../lib/logger.js';
import { CSVProcessor } from '../lib/csv-processor.js';
import { DNSResolver } from '../lib/dns-resolver.js';
import fs from 'fs';
import path from 'path';

export function createImportCommand(): Command {
  const importCmd = new Command('import')
    .description('Import DNS records from CSV file')
    .argument('<file>', 'CSV file path to import')
    .option('-f, --format <format>', 'CSV format (cloudflare, route53, generic, auto)', 'auto')
    .option('-r, --resolve', 'Resolve DNS records after import to verify')
    .option('-s, --streaming', 'Use streaming for large files')
    .option('-l, --limit <number>', 'Limit number of records to import')
    .option('-v, --verbose', 'Show detailed output')
    .option('-j, --json', 'Output as JSON')
    .option('-q, --quiet', 'Suppress non-error output')
    .action(async (file: string, options: IImportOptions) => {
      const logger = new Logger({ verbose: options.verbose, quiet: options.quiet });

      try {
        // Validate file exists
        const filePath = path.resolve(file);
        if (!fs.existsSync(filePath)) {
          throw new Error(`File not found: ${filePath}`);
        }

        const processor = new CSVProcessor();
        logger.startSpinner(`Importing DNS records from ${path.basename(filePath)}...`);

        let result;
        let recordCount = 0;

        if (options.streaming) {
          // Use streaming for large files
          const processedRecords: any[] = [];
          const limit = options.limit ? parseInt(options.limit, 10) : Infinity;

          const streamResult = await processor.parseStreaming(
            filePath,
            (record) => {
              if (recordCount >= limit) return;

              processedRecords.push(record);
              recordCount++;

              if (!options.quiet && recordCount % 100 === 0) {
                logger.info(`Processed ${recordCount} records...`);
              }
            },
            options.format === 'auto' ? 'generic' : (options.format as any),
          );

          result = {
            records: processedRecords,
            errors: streamResult.errors,
            totalRows: streamResult.totalProcessed,
            validRows: streamResult.totalProcessed - streamResult.errors.length,
          };
        } else {
          // Use standard parsing
          switch (options.format) {
            case 'cloudflare':
              result = await processor.parseCloudflare(filePath);
              break;
            case 'route53':
              result = await processor.parseRoute53(filePath);
              break;
            case 'generic':
              result = await processor.parseGeneric(filePath);
              break;
            default:
              result = await processor.parseAuto(filePath);
          }

          // Apply limit if specified
          if (options.limit) {
            const limit = parseInt(options.limit, 10);
            result.records = result.records.slice(0, limit);
          }
        }

        logger.stopSpinner(true, `Successfully imported ${result.records.length} DNS records`);

        // Display summary
        if (!options.json) {
          logger.info(`Total rows processed: ${result.totalRows}`);
          logger.info(`Valid records: ${result.validRows}`);
          if (result.errors.length > 0) {
            logger.warn(`Errors encountered: ${result.errors.length}`);
          }

          // Show record type breakdown
          const typeCounts = result.records.reduce(
            (acc, record) => {
              acc[record.type] = (acc[record.type] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          );

          logger.info('\nRecord types imported:');
          Object.entries(typeCounts).forEach(([type, count]) => {
            logger.info(`  ${type}: ${count}`);
          });
        }

        // Resolve DNS records if requested
        if (options.resolve) {
          logger.startSpinner('Resolving DNS records to verify...');
          const resolver = new DNSResolver();
          const verificationResults = [];
          let resolvedCount = 0;
          let failedCount = 0;

          for (const record of result.records.slice(0, 10)) {
            // Limit to first 10 for verification
            try {
              const dnsResult = await resolver.resolve(record.domain, record.type);
              if (dnsResult.status === 'success') {
                resolvedCount++;
              } else {
                failedCount++;
              }
              verificationResults.push({
                domain: record.domain,
                type: record.type,
                status: dnsResult.status,
                resolved: dnsResult.status === 'success',
              });
            } catch (error) {
              failedCount++;
              verificationResults.push({
                domain: record.domain,
                type: record.type,
                status: 'error',
                resolved: false,
              });
            }
          }

          logger.stopSpinner(
            true,
            `Verification complete: ${resolvedCount} resolved, ${failedCount} failed`,
          );
        }

        // Output results
        if (options.json) {
          logger.json({
            success: true,
            file: filePath,
            format: options.format,
            summary: {
              totalRows: result.totalRows,
              validRows: result.validRows,
              imported: result.records.length,
              errors: result.errors.length,
            },
            records: result.records,
            errors: result.errors,
          });
        } else {
          logger.success(`Import completed successfully!`);
        }
      } catch (error) {
        logger.stopSpinner(false, 'Import failed');
        logger.error(error instanceof Error ? error.message : 'Unknown error occurred');

        if (options.json) {
          logger.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }

        process.exit(1);
      }
    });

  return importCmd;
}
