#!/usr/bin/env node
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { Command } from 'commander';

import {
  createListCommand,
  createAddCommand,
  createDeleteCommand,
  createImportCommand,
  createAnalyzeCommand,
  createLookupCommand,
  createSweepCommand,
  createValidateCommand,
  performanceCommand,
  createSyncCommand,
} from './commands/index.js';
import { createOptimizeCommand } from './commands/optimize.js';
import { createSecurityCommand } from './commands/security.js';
import { loadConfig } from './lib/config.js';
import { Logger } from './lib/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createProgram(): Command {
  const packageJson = JSON.parse(
    readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')
  ) as {
    version: string;
    description: string;
  };

  const program = new Command()
    .name('dnsweeper')
    .description(packageJson.description)
    .version(packageJson.version)
    .option('-v, --verbose', 'Enable verbose output')
    .option('-q, --quiet', 'Suppress non-error output')
    .option('-c, --config <path>', 'Path to configuration file');

  program.addCommand(createListCommand());
  program.addCommand(createAddCommand());
  program.addCommand(createDeleteCommand());
  program.addCommand(createImportCommand());
  program.addCommand(createAnalyzeCommand());
  program.addCommand(createLookupCommand());
  program.addCommand(createSweepCommand());
  program.addCommand(createValidateCommand());
  program.addCommand(performanceCommand);
  program.addCommand(createSyncCommand());
  program.addCommand(createOptimizeCommand());
  program.addCommand(createSecurityCommand());

  program.on('command:*', () => {
    const logger = new Logger();
    logger.error(`Invalid command: ${program.args.join(' ')}`);
    logger.info('Run "dnsweeper --help" for a list of available commands');
    process.exit(1);
  });

  return program;
}

export async function main(): Promise<void> {
  try {
    // 現在のディレクトリが取得できるか確認
    try {
      process.cwd();
    } catch (cwdError) {
      // GitHub Actions等で作業ディレクトリが削除された場合の対処
      process.chdir('/tmp');
    }

    const program = createProgram();

    // 設定ファイルの読み込み（パース前に実行）
    const opts = program.opts();
    const config = await loadConfig(opts.config);

    // グローバル設定をプログラムに追加
    (
      program as typeof program & { dnsSweeperConfig: typeof config }
    ).dnsSweeperConfig = config;

    await program.parseAsync(process.argv);
  } catch (error) {
    const logger = new Logger();
    logger.error(
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
    process.exit(1);
  }
}

// テスト環境では自動実行しない
if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  void main();
}
