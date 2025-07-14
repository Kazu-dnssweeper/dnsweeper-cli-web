import { Command } from 'commander';
import inquirer from 'inquirer';

import { Logger } from '../lib/logger.js';

import type { IDeleteOptions } from '../types/index.js';

export function createDeleteCommand(): Command {
  const deleteCmd = new Command('delete')
    .alias('rm')
    .description('Delete a DNS record')
    .argument('<id>', 'Record ID to delete')
    .option('-f, --force', 'Skip confirmation prompt')
    .option('-v, --verbose', 'Show detailed output')
    .option('-q, --quiet', 'Suppress non-error output')
    .action(async (id: string, options: IDeleteOptions) => {
      const logger = new Logger({
        verbose: options.verbose,
        quiet: options.quiet,
      });

      try {
        if (!options.force) {
          const { confirm } = await inquirer.prompt<{ confirm: boolean }>([
            {
              type: 'confirm',
              name: 'confirm',
              message: `Are you sure you want to delete record ${id}?`,
              default: false,
            },
          ]);

          if (!confirm) {
            logger.info('Deletion cancelled');
            return;
          }
        }

        logger.startSpinner(`Deleting DNS record ${id}...`);

        // TODO: Implement actual DNS record deletion logic
        await new Promise(resolve => setTimeout(resolve, 1000));

        logger.stopSpinner(true, 'DNS record deleted successfully');
        logger.success(`Deleted DNS record: ${id}`);
      } catch (error) {
        logger.stopSpinner(false, 'Failed to delete DNS record');
        logger.error(
          error instanceof Error ? error.message : 'Unknown error occurred'
        );
        process.exit(1);
      }
    });

  return deleteCmd;
}
