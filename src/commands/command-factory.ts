/**
 * コマンドファクトリー
 *
 * すべてのコマンドインスタンスを生成する中央管理クラス
 */

import { createAddCommand } from './add.js';
import { createAnalyzeCommand } from './analyze.js';
// 既存のコマンドインポート（段階的に置き換え）
import { createDeleteCommand } from './delete.js';
import { createImportCommand } from './import.js';
import { createListCommand } from './list.js';
import { createLookupCommand } from './lookup-refactored.js';
import { createLookupCommand as createLookupCommandOld } from './lookup.js';
import { createOptimizeCommand } from './optimize.js';
import { performanceCommand } from './performance.js';
import { createSecurityCommand } from './security.js';
import { createSweepCommand } from './sweep.js';
import { createSyncCommand } from './sync.js';
import { createValidateCommand } from './validate.js';

import type { Command } from 'commander';

// リファクタリングされたコマンド

export interface CommandConfig {
  useRefactored?: boolean; // リファクタリング版を使用するかどうか
}

export class CommandFactory {
  private config: CommandConfig;

  constructor(config: CommandConfig = {}) {
    this.config = {
      useRefactored: false, // デフォルトは既存版を使用
      ...config,
    };
  }

  /**
   * すべてのコマンドを作成
   */
  createAllCommands(): Command[] {
    return [
      this.createAddCommand(),
      this.createAnalyzeCommand(),
      this.createDeleteCommand(),
      this.createImportCommand(),
      this.createListCommand(),
      this.createLookupCommand(),
      this.createPerformanceCommand(),
      this.createSweepCommand(),
      this.createSyncCommand(),
      this.createValidateCommand(),
      this.createOptimizeCommand(),
      this.createSecurityCommand(),
    ];
  }

  /**
   * 個別コマンドの作成メソッド
   */
  createAddCommand(): Command {
    return createAddCommand();
  }

  createAnalyzeCommand(): Command {
    return createAnalyzeCommand();
  }

  createDeleteCommand(): Command {
    return createDeleteCommand();
  }

  createImportCommand(): Command {
    return createImportCommand();
  }

  createListCommand(): Command {
    return createListCommand();
  }

  createLookupCommand(): Command {
    if (this.config.useRefactored) {
      return createLookupCommand();
    }
    return createLookupCommandOld();
  }

  createPerformanceCommand(): Command {
    return performanceCommand;
  }

  createSweepCommand(): Command {
    return createSweepCommand();
  }

  createSyncCommand(): Command {
    return createSyncCommand();
  }

  createValidateCommand(): Command {
    return createValidateCommand();
  }

  createOptimizeCommand(): Command {
    return createOptimizeCommand();
  }

  createSecurityCommand(): Command {
    return createSecurityCommand();
  }

  /**
   * 設定の更新
   */
  updateConfig(config: Partial<CommandConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * リファクタリング進捗の取得
   */
  getRefactoringProgress(): {
    total: number;
    refactored: number;
    percentage: number;
    commands: Array<{ name: string; refactored: boolean }>;
  } {
    const commands = [
      { name: 'add', refactored: false },
      { name: 'analyze', refactored: false },
      { name: 'delete', refactored: false },
      { name: 'import', refactored: false },
      { name: 'list', refactored: false },
      { name: 'lookup', refactored: true },
      { name: 'performance', refactored: false },
      { name: 'sweep', refactored: false },
      { name: 'sync', refactored: false },
      { name: 'validate', refactored: false },
      { name: 'optimize', refactored: false },
      { name: 'security', refactored: false },
    ];

    const refactored = commands.filter(c => c.refactored).length;

    return {
      total: commands.length,
      refactored,
      percentage: Math.round((refactored / commands.length) * 100),
      commands,
    };
  }
}

// デフォルトのファクトリーインスタンス
export const commandFactory = new CommandFactory();
