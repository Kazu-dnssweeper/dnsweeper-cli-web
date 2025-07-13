#!/usr/bin/env node
import { Command } from 'commander';
import {
  createListCommand,
  createAddCommand,
  createDeleteCommand,
  createImportCommand,
  createAnalyzeCommand,
} from './commands/index.js';
import { Logger } from './lib/logger.js';
import { loadConfig, DnsSweeperConfig } from './lib/config.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function createProgram(): Command {
  const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')) as {
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
    const program = createProgram();
    
    // 設定ファイルの読み込み（パース前に実行）
    const opts = program.opts();
    const config = await loadConfig(opts.config);
    
    // グローバル設定をプログラムに追加
    (program as any).dnsSweeperConfig = config;
    
    await program.parseAsync(process.argv);
  } catch (error) {
    const logger = new Logger();
    logger.error(error instanceof Error ? error.message : 'Unknown error occurred');
    process.exit(1);
  }
}

void main();
