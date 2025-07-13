import { Command } from 'commander';
import type { IListOptions } from '../types/index.js';
import { Logger } from '../lib/logger.js';
import { DNSResolver } from '../lib/dns-resolver.js';

export function createListCommand(): Command {
  const list = new Command('list')
    .alias('ls')
    .description('List DNS records')
    .option('-t, --type <type>', 'Filter by record type (A, AAAA, CNAME, etc.)')
    .option('-n, --name <name>', 'Filter by record name')
    .option('-l, --limit <number>', 'Limit number of results', '50')
    .option('-v, --verbose', 'Show detailed output')
    .option('-j, --json', 'Output as JSON')
    .option('-q, --quiet', 'Suppress non-error output')
    .action(async (options: IListOptions) => {
      const logger = new Logger({ verbose: options.verbose, quiet: options.quiet });
      const resolver = new DNSResolver();

      try {
        // For demo purposes, we'll query a few example domains
        // In real implementation, this would be configurable
        const domains = ['google.com', 'github.com', 'cloudflare.com'];
        const recordType = options.type || 'A';

        logger.startSpinner(`Fetching ${recordType} records...`);

        const results = await resolver.lookupMultiple(domains, recordType);

        // Convert DNS responses to display format
        const records = results.flatMap((result, index) => {
          if (result.status === 'success') {
            return result.records.map((record) => ({
              id: `${index + 1}`,
              name: result.query.domain,
              type: record.type,
              value: record.value,
              ttl: record.ttl || 3600,
              priority: record.priority,
              weight: record.weight,
              port: record.port,
            }));
          }
          return [];
        });

        // Apply filters
        let filteredRecords = records;
        if (options.name) {
          filteredRecords = records.filter((record) =>
            record.name.toLowerCase().includes(options.name?.toLowerCase() ?? ''),
          );
        }
        if (options.type) {
          filteredRecords = records.filter((record) => record.type === options.type);
        }

        // Apply limit
        const limitStr = options.limit || '50';
        const limit = parseInt(limitStr, 10);
        if (filteredRecords.length > limit) {
          filteredRecords = filteredRecords.slice(0, limit);
        }

        logger.stopSpinner(true, 'DNS records fetched successfully');

        if (options.json) {
          logger.json(filteredRecords);
        } else {
          logger.table(filteredRecords);
        }

        logger.success(`Found ${filteredRecords.length} DNS records`);
      } catch (error) {
        logger.stopSpinner(false, 'Failed to fetch DNS records');
        logger.error(error instanceof Error ? error.message : 'Unknown error occurred');
        process.exit(1);
      }
    });

  return list;
}
