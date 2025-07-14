/**
 * ログトランスポート
 */

import { existsSync } from 'node:fs';
import { writeFile, mkdir, stat, readdir, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { createFormatter } from './formatters.js';

import type {
  LogEntry,
  LogTransport,
  TransportConfig,
  RotationConfig,
} from './types.js';

/**
 * コンソールトランスポート
 */
export class ConsoleTransport implements LogTransport {
  private formatter;

  constructor(private config: TransportConfig) {
    this.formatter = createFormatter(config.format || 'pretty');
  }

  async log(entry: LogEntry): Promise<void> {
    if (entry.level > this.config.level) {
      return;
    }

    const formatted = this.formatter.format(entry);

    if (entry.level === 0) {
      // ERROR
      console.error(formatted);
    } else {
      // eslint-disable-next-line no-console
      console.log(formatted);
    }
  }

  async close(): Promise<void> {
    // コンソールトランスポートはクローズ処理不要
  }
}

/**
 * ファイルトランスポート
 */
export class FileTransport implements LogTransport {
  private formatter;

  constructor(private config: TransportConfig) {
    this.formatter = createFormatter(config.format || 'json');
  }

  async log(entry: LogEntry): Promise<void> {
    if (entry.level > this.config.level) {
      return;
    }

    if (!this.config.filename) {
      throw new Error('Filename is required for file transport');
    }

    const formatted = this.formatter.format(entry);

    // ディレクトリを作成
    const dir = dirname(this.config.filename);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    // ファイルに追記
    await writeFile(this.config.filename, formatted + '\n', { flag: 'a' });
  }

  async close(): Promise<void> {
    // ファイルトランスポートはクローズ処理不要
  }
}

/**
 * ローテーションファイルトランスポート
 */
export class RotatingFileTransport implements LogTransport {
  private formatter;
  private rotationConfig: RotationConfig;

  constructor(private config: TransportConfig) {
    this.formatter = createFormatter(config.format || 'json');
    this.rotationConfig = {
      maxSize: config.maxSize || 10 * 1024 * 1024, // 10MB
      maxFiles: config.maxFiles || 5,
      compress: false,
    };
  }

  async log(entry: LogEntry): Promise<void> {
    if (entry.level > this.config.level) {
      return;
    }

    if (!this.config.filename) {
      throw new Error('Filename is required for rotating file transport');
    }

    const formatted = this.formatter.format(entry);

    // ローテーションチェック
    await this.checkRotation();

    // ディレクトリを作成
    const dir = dirname(this.config.filename);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    // ファイルに追記
    await writeFile(this.config.filename, formatted + '\n', { flag: 'a' });
  }

  async close(): Promise<void> {
    // ローテーションファイルトランスポートはクローズ処理不要
  }

  private async checkRotation(): Promise<void> {
    if (!this.config.filename || !existsSync(this.config.filename)) {
      return;
    }

    const stats = await stat(this.config.filename);

    if (stats.size >= this.rotationConfig.maxSize) {
      await this.rotateFile();
    }
  }

  private async rotateFile(): Promise<void> {
    if (!this.config.filename) {
      return;
    }

    const _dir = dirname(this.config.filename);
    const filename = this.config.filename;

    // 既存のローテーションファイルをシフト
    for (let i = this.rotationConfig.maxFiles - 1; i >= 1; i--) {
      const oldFile = `${filename}.${i}`;
      const newFile = `${filename}.${i + 1}`;

      if (existsSync(oldFile)) {
        if (i === this.rotationConfig.maxFiles - 1) {
          // 最古のファイルを削除
          await unlink(oldFile);
        } else {
          // ファイルをリネーム
          await this.renameFile(oldFile, newFile);
        }
      }
    }

    // 現在のファイルを .1 にリネーム
    await this.renameFile(filename, `${filename}.1`);
  }

  private async renameFile(oldPath: string, newPath: string): Promise<void> {
    try {
      const { rename } = await import('node:fs/promises');
      await rename(oldPath, newPath);
    } catch (error) {
      // リネームに失敗した場合はコピー＆削除
      const { copyFile, unlink } = await import('node:fs/promises');
      await copyFile(oldPath, newPath);
      await unlink(oldPath);
    }
  }

  async getLogFiles(): Promise<string[]> {
    if (!this.config.filename) {
      return [];
    }

    const dir = dirname(this.config.filename);
    const basename = this.config.filename.split('/').pop() || '';

    try {
      const files = await readdir(dir);
      return files
        .filter(file => file.startsWith(basename))
        .sort()
        .map(file => join(dir, file));
    } catch (error) {
      return [];
    }
  }
}

/**
 * トランスポートファクトリー
 */
export function createTransport(config: TransportConfig): LogTransport {
  switch (config.type) {
    case 'console':
      return new ConsoleTransport(config);
    case 'file':
      return new FileTransport(config);
    case 'rotating-file':
      return new RotatingFileTransport(config);
    default:
      throw new Error(`Unsupported transport type: ${config.type}`);
  }
}
