import { Command } from 'commander';
import type { IAddOptions, DNSRecordType } from '../types/index.js';
import { Logger } from '../lib/logger.js';

export function createAddCommand(): Command {
  const add = new Command('add')
    .description('Add a new DNS record')
    .argument('<name>', 'Record name (e.g., example.com)')
    .argument('<type>', 'Record type (A, AAAA, CNAME, MX, TXT, etc.)')
    .argument('<value>', 'Record value')
    .option('-t, --ttl <seconds>', 'Time to live in seconds', '3600')
    .option('-p, --priority <number>', 'Priority (for MX and SRV records)')
    .option('-w, --weight <number>', 'Weight (for SRV records)')
    .option('--port <number>', 'Port (for SRV records)')
    .option('-v, --verbose', 'Show detailed output')
    .option('-j, --json', 'Output as JSON')
    .option('-q, --quiet', 'Suppress non-error output')
    .action((name: string, type: string, value: string, options: IAddOptions) => {
      const logger = new Logger({ verbose: options.verbose, quiet: options.quiet });

      try {
        const recordType = type.toUpperCase() as DNSRecordType;

        logger.startSpinner(`Adding ${recordType} record for ${name}...`);

        // TODO: Implement actual DNS record creation logic
        const newRecord = {
          id: Date.now().toString(),
          name,
          type: recordType,
          value,
          ttl: parseInt(options.ttl ?? '3600', 10),
          priority: options.priority ? parseInt(options.priority, 10) : undefined,
          weight: options.weight ? parseInt(options.weight, 10) : undefined,
          port: options.port ? parseInt(options.port, 10) : undefined,
          created: new Date(),
          updated: new Date(),
        };

        logger.stopSpinner(true, 'DNS record added successfully');

        if (options.json) {
          logger.json(newRecord);
        } else {
          logger.success(`Added ${recordType} record: ${name} → ${value}`);
          logger.info(`TTL: ${newRecord.ttl} seconds`);
        }
      } catch (error) {
        logger.stopSpinner(false, 'Failed to add DNS record');
        logger.error(error instanceof Error ? error.message : 'Unknown error occurred');
        process.exit(1);
      }
    });

  return add;
}
