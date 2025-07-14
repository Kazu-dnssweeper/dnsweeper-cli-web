/**
 * ログフォーマッター
 */

import type { LogEntry, LogFormatter } from './types.js';

/**
 * JSONフォーマッター
 */
export class JSONFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    return JSON.stringify(entry);
  }
}

/**
 * テキストフォーマッター
 */
export class TextFormatter implements LogFormatter {
  format(entry: LogEntry): string {
    const timestamp = entry.timestamp;
    const level = entry.levelName.toUpperCase();
    const message = entry.message;
    const context = entry.context ? `[${entry.context}]` : '';
    const correlationId = entry.correlationId ? `{${entry.correlationId}}` : '';
    const duration = entry.duration ? `(${entry.duration}ms)` : '';

    let formatted = `${timestamp} ${level} ${context}${correlationId} ${message}${duration}`;

    if (entry.meta && Object.keys(entry.meta).length > 0) {
      formatted += ` ${JSON.stringify(entry.meta)}`;
    }

    if (entry.error) {
      formatted += `\n${entry.error.stack || entry.error.message}`;
    }

    return formatted;
  }
}

/**
 * プリティフォーマッター（色付き）
 */
export class PrettyFormatter implements LogFormatter {
  private colors: Record<string, string> = {
    error: '\x1b[31m', // red
    warn: '\x1b[33m', // yellow
    info: '\x1b[36m', // cyan
    http: '\x1b[35m', // magenta
    verbose: '\x1b[37m', // white
    debug: '\x1b[32m', // green
    silly: '\x1b[90m', // gray
    reset: '\x1b[0m', // reset
  };

  format(entry: LogEntry): string {
    const timestamp = this.colorize('gray', entry.timestamp);
    const level = this.colorize(
      entry.levelName,
      entry.levelName.toUpperCase().padEnd(7)
    );
    const message = entry.message;
    const context = entry.context
      ? this.colorize('blue', `[${entry.context}]`)
      : '';
    const correlationId = entry.correlationId
      ? this.colorize('gray', `{${entry.correlationId}}`)
      : '';
    const duration = entry.duration
      ? this.colorize('gray', `(${entry.duration}ms)`)
      : '';

    let formatted = `${timestamp} ${level} ${context}${correlationId} ${message}${duration}`;

    if (entry.meta && Object.keys(entry.meta).length > 0) {
      formatted += ` ${this.colorize('gray', JSON.stringify(entry.meta))}`;
    }

    if (entry.error) {
      formatted += `\n${this.colorize('red', entry.error.stack || entry.error.message)}`;
    }

    return formatted;
  }

  private colorize(color: string, text: string): string {
    const colorCode = this.colors[color] || this.colors.reset;
    return `${colorCode}${text}${this.colors.reset}`;
  }
}

/**
 * カスタムフォーマッター
 */
export class CustomFormatter implements LogFormatter {
  private template: string;

  constructor(template: string = '{{timestamp}} {{level}} {{message}}') {
    this.template = template;
  }

  format(entry: LogEntry): string {
    let formatted = this.template;

    // 基本的なプレースホルダーの置換
    formatted = formatted.replace('{{timestamp}}', entry.timestamp);
    formatted = formatted.replace('{{level}}', entry.levelName.toUpperCase());
    formatted = formatted.replace('{{message}}', entry.message);
    formatted = formatted.replace('{{context}}', entry.context || '');
    formatted = formatted.replace(
      '{{correlationId}}',
      entry.correlationId || ''
    );
    formatted = formatted.replace(
      '{{duration}}',
      entry.duration ? `${entry.duration}ms` : ''
    );

    // メタデータの置換
    if (entry.meta) {
      formatted = formatted.replace('{{meta}}', JSON.stringify(entry.meta));

      // 個別のメタデータフィールドの置換
      Object.keys(entry.meta).forEach(key => {
        formatted = formatted.replace(
          `{{meta.${key}}}`,
          String(entry.meta![key])
        );
      });
    }

    // エラー情報の置換
    if (entry.error) {
      formatted = formatted.replace('{{error.name}}', entry.error.name);
      formatted = formatted.replace('{{error.message}}', entry.error.message);
      formatted = formatted.replace('{{error.stack}}', entry.error.stack || '');
    }

    return formatted;
  }
}

/**
 * フォーマッターファクトリー
 */
export function createFormatter(
  type: 'json' | 'text' | 'pretty' | string
): LogFormatter {
  switch (type) {
    case 'json':
      return new JSONFormatter();
    case 'text':
      return new TextFormatter();
    case 'pretty':
      return new PrettyFormatter();
    default:
      // カスタムテンプレートとして扱う
      return new CustomFormatter(type);
  }
}
