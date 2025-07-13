/**
 * structured-logger.ts のユニットテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { unlink, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import {
  StructuredLogger,
  LogLevel,
  LOG_LEVEL_NAMES,
  ConsoleTransport,
  FileTransport,
  createLogger,
  getLogger,
  setGlobalLogger,
  logMethod,
  type LogEntry,
  type LogFormat
} from '../../src/lib/structured-logger.js';

describe('StructuredLogger', () => {
  let logger: StructuredLogger;
  let tempFiles: string[] = [];

  beforeEach(() => {
    logger = new StructuredLogger();
    tempFiles = [];
  });

  afterEach(async () => {
    // テスト用一時ファイルをクリーンアップ
    for (const file of tempFiles) {
      try {
        if (existsSync(file)) {
          await unlink(file);
        }
      } catch {
        // ファイルが存在しない場合は無視
      }
    }
    tempFiles = [];
    
    vi.clearAllMocks();
  });

  const createTempFile = (): string => {
    const filePath = join(tmpdir(), `test-log-${Date.now()}-${Math.random().toString(36).substring(2)}.log`);
    tempFiles.push(filePath);
    return filePath;
  };

  describe('LogLevel', () => {
    it('ログレベルが正しく定義されている', () => {
      expect(LogLevel.ERROR).toBe(0);
      expect(LogLevel.WARN).toBe(1);
      expect(LogLevel.INFO).toBe(2);
      expect(LogLevel.DEBUG).toBe(5);
    });

    it('ログレベル名が正しく定義されている', () => {
      expect(LOG_LEVEL_NAMES[LogLevel.ERROR]).toBe('error');
      expect(LOG_LEVEL_NAMES[LogLevel.WARN]).toBe('warn');
      expect(LOG_LEVEL_NAMES[LogLevel.INFO]).toBe('info');
      expect(LOG_LEVEL_NAMES[LogLevel.DEBUG]).toBe('debug');
    });
  });

  describe('ConsoleTransport', () => {
    let consoleLogSpy: any;
    let consoleErrorSpy: any;
    let consoleWarnSpy: any;

    beforeEach(() => {
      consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('コンソールに正常に出力', () => {
      const transport = new ConsoleTransport(LogLevel.INFO);
      const entry: LogEntry = {
        timestamp: '2023-01-01T00:00:00.000Z',
        level: LogLevel.INFO,
        levelName: 'info',
        message: 'Test message'
      };

      transport.write(entry);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('INFO')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test message')
      );
    });

    it('エラーレベルはconsole.errorを使用', () => {
      const transport = new ConsoleTransport(LogLevel.ERROR);
      const entry: LogEntry = {
        timestamp: '2023-01-01T00:00:00.000Z',
        level: LogLevel.ERROR,
        levelName: 'error',
        message: 'Error message'
      };

      transport.write(entry);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('ERROR')
      );
    });

    it('警告レベルはconsole.warnを使用', () => {
      const transport = new ConsoleTransport(LogLevel.WARN);
      const entry: LogEntry = {
        timestamp: '2023-01-01T00:00:00.000Z',
        level: LogLevel.WARN,
        levelName: 'warn',
        message: 'Warning message'
      };

      transport.write(entry);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('WARN')
      );
    });

    it('ログレベルフィルタリング', () => {
      const transport = new ConsoleTransport(LogLevel.WARN);
      
      expect(transport.shouldLog(LogLevel.ERROR)).toBe(true);
      expect(transport.shouldLog(LogLevel.WARN)).toBe(true);
      expect(transport.shouldLog(LogLevel.INFO)).toBe(false);
      expect(transport.shouldLog(LogLevel.DEBUG)).toBe(false);
    });

    it('JSONフォーマット出力', () => {
      const transport = new ConsoleTransport(LogLevel.INFO, { json: true });
      const entry: LogEntry = {
        timestamp: '2023-01-01T00:00:00.000Z',
        level: LogLevel.INFO,
        levelName: 'info',
        message: 'Test message',
        meta: { key: 'value' }
      };

      transport.write(entry);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Test message"')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"key":"value"')
      );
    });

    it('メタデータを含む出力', () => {
      const transport = new ConsoleTransport(LogLevel.INFO);
      const entry: LogEntry = {
        timestamp: '2023-01-01T00:00:00.000Z',
        level: LogLevel.INFO,
        levelName: 'info',
        message: 'Test message',
        meta: { userId: 123, action: 'login' }
      };

      transport.write(entry);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('{"userId":123,"action":"login"}')
      );
    });
  });

  describe('FileTransport', () => {
    it('ファイルに正常に出力', async () => {
      const logFile = createTempFile();
      const transport = new FileTransport(logFile, LogLevel.INFO);
      
      const entry: LogEntry = {
        timestamp: '2023-01-01T00:00:00.000Z',
        level: LogLevel.INFO,
        levelName: 'info',
        message: 'Test message'
      };

      await transport.write(entry);

      expect(existsSync(logFile)).toBe(true);
      
      const content = await import('node:fs/promises').then(fs => fs.readFile(logFile, 'utf-8'));
      expect(content).toContain('"message":"Test message"');
    });

    it('ディレクトリが存在しない場合は作成', async () => {
      const logDir = join(tmpdir(), `test-log-dir-${Date.now()}`);
      const logFile = join(logDir, 'test.log');
      tempFiles.push(logFile);
      
      const transport = new FileTransport(logFile, LogLevel.INFO);
      
      const entry: LogEntry = {
        timestamp: '2023-01-01T00:00:00.000Z',
        level: LogLevel.INFO,
        levelName: 'info',
        message: 'Test message'
      };

      await transport.write(entry);

      expect(existsSync(logFile)).toBe(true);
    });

    it('ファイルローテーション', async () => {
      const logFile = createTempFile();
      const transport = new FileTransport(logFile, LogLevel.INFO, { json: true }, {
        maxSize: 100, // 100バイトで小さく設定
        maxFiles: 3
      });
      
      // 複数のログエントリを書き込んでローテーションを発生させる
      for (let i = 0; i < 10; i++) {
        const entry: LogEntry = {
          timestamp: '2023-01-01T00:00:00.000Z',
          level: LogLevel.INFO,
          levelName: 'info',
          message: `Test message ${i} with some additional content to exceed the size limit`
        };
        
        await transport.write(entry);
      }

      // ローテーションファイルが作成されることを確認
      expect(existsSync(logFile)).toBe(true);
      expect(existsSync(`${logFile}.1`)).toBe(true);
    });
  });

  describe('StructuredLogger', () => {
    it('トランスポートを追加', () => {
      const transport = new ConsoleTransport(LogLevel.INFO);
      logger.addTransport(transport);
      
      // プライベートプロパティなので、間接的にテスト
      expect(() => logger.info('test')).not.toThrow();
    });

    it('デフォルトメタデータを設定', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const transport = new ConsoleTransport(LogLevel.INFO, { json: true });
      logger.addTransport(transport);
      
      logger.setDefaultMeta({ service: 'test', version: '1.0.0' });
      logger.info('Test message');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"service":"test"')
      );
      
      consoleLogSpy.mockRestore();
    });

    it('コンテキストスタック管理', () => {
      logger.pushContext('module1');
      logger.pushContext('function1');
      
      expect(logger.getCurrentContext()).toBe('module1:function1');
      
      expect(logger.popContext()).toBe('function1');
      expect(logger.getCurrentContext()).toBe('module1');
      
      expect(logger.popContext()).toBe('module1');
      expect(logger.getCurrentContext()).toBeUndefined();
    });

    it('各レベルのログメソッド', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const transport = new ConsoleTransport(LogLevel.SILLY);
      logger.addTransport(transport);
      
      logger.error('Error message');
      logger.warn('Warning message');
      logger.info('Info message');
      logger.debug('Debug message');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('ERROR'));
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('WARN'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('INFO'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('DEBUG'));
      
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('エラーオブジェクトを含むログ', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const transport = new ConsoleTransport(LogLevel.ERROR, { json: true });
      logger.addTransport(transport);
      
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test';
      
      logger.error('Error occurred', { context: 'test' }, error);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('"name":"Error"')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Test error"')
      );
      
      consoleErrorSpy.mockRestore();
    });

    it('タイマー機能', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const transport = new ConsoleTransport(LogLevel.INFO, { json: true });
      logger.addTransport(transport);
      
      const timer = logger.startTimer('test-operation');
      
      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 10));
      
      timer();
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"duration"')
      );
      
      consoleLogSpy.mockRestore();
    });

    it('プロファイル機能（成功）', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const transport = new ConsoleTransport(LogLevel.INFO);
      logger.addTransport(transport);
      
      const result = await logger.profile('test-function', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'success';
      });
      
      expect(result).toBe('success');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Starting: test-function')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Completed: test-function')
      );
      
      consoleLogSpy.mockRestore();
    });

    it('プロファイル機能（エラー）', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const transport = new ConsoleTransport(LogLevel.INFO);
      logger.addTransport(transport);
      
      await expect(logger.profile('test-function', async () => {
        throw new Error('Test error');
      })).rejects.toThrow('Test error');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Starting: test-function')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed: test-function')
      );
      
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('子ロガーの作成', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const transport = new ConsoleTransport(LogLevel.INFO, { json: true });
      logger.addTransport(transport);
      
      logger.setDefaultMeta({ service: 'parent' });
      const childLogger = logger.child({ module: 'child' }, 'child-context');
      
      childLogger.info('Child message');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"service":"parent"')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"module":"child"')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('child-context')
      );
      
      consoleLogSpy.mockRestore();
    });
  });

  describe('ログレベル解析', () => {
    it('文字列からログレベルを正しく解析', () => {
      expect(StructuredLogger.parseLogLevel('error')).toBe(LogLevel.ERROR);
      expect(StructuredLogger.parseLogLevel('WARN')).toBe(LogLevel.WARN);
      expect(StructuredLogger.parseLogLevel('info')).toBe(LogLevel.INFO);
      expect(StructuredLogger.parseLogLevel('debug')).toBe(LogLevel.DEBUG);
      expect(StructuredLogger.parseLogLevel('unknown')).toBe(LogLevel.INFO);
    });

    it('warning の別名をサポート', () => {
      expect(StructuredLogger.parseLogLevel('warning')).toBe(LogLevel.WARN);
    });
  });

  describe('createLogger', () => {
    it('デフォルト設定でロガーを作成', () => {
      const logger = createLogger();
      expect(logger).toBeInstanceOf(StructuredLogger);
    });

    it('文字列レベルでロガーを作成', () => {
      const logger = createLogger({ level: 'debug' });
      expect(logger).toBeInstanceOf(StructuredLogger);
    });

    it('ファイル出力を含むロガーを作成', () => {
      const logFile = createTempFile();
      const logger = createLogger({ 
        level: LogLevel.INFO,
        file: logFile,
        meta: { service: 'test' }
      });
      
      expect(logger).toBeInstanceOf(StructuredLogger);
    });

    it('コンソール出力を無効化', () => {
      const logger = createLogger({ console: false });
      expect(logger).toBeInstanceOf(StructuredLogger);
    });
  });

  describe('グローバルロガー', () => {
    afterEach(() => {
      // グローバルロガーをリセット
      setGlobalLogger(createLogger());
    });

    it('グローバルロガーを設定・取得', () => {
      const customLogger = createLogger({ level: 'debug' });
      setGlobalLogger(customLogger);
      
      const retrieved = getLogger();
      expect(retrieved).toBe(customLogger);
    });

    it('グローバルロガーがない場合はデフォルトを作成', () => {
      // グローバルロガーをクリア（privateなので間接的にテスト）
      const logger = getLogger();
      expect(logger).toBeInstanceOf(StructuredLogger);
    });
  });

  describe('logMethodデコレーター', () => {
    class TestClass {
      @logMethod(LogLevel.DEBUG, true, true)
      async testMethod(param1: string, param2: number): Promise<string> {
        return `${param1}-${param2}`;
      }

      @logMethod(LogLevel.DEBUG)
      async errorMethod(): Promise<void> {
        throw new Error('Test error');
      }
    }

    it('メソッド呼び出しをログに記録', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const transport = new ConsoleTransport(LogLevel.DEBUG);
      const logger = createLogger();
      logger.addTransport(transport);
      setGlobalLogger(logger);
      
      const instance = new TestClass();
      const result = await instance.testMethod('test', 123);
      
      expect(result).toBe('test-123');
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Method called: TestClass.testMethod')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Method completed: TestClass.testMethod')
      );
      
      consoleLogSpy.mockRestore();
    });

    it('メソッドエラーをログに記録', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const transport = new ConsoleTransport(LogLevel.DEBUG);
      const logger = createLogger();
      logger.addTransport(transport);
      setGlobalLogger(logger);
      
      const instance = new TestClass();
      
      await expect(instance.errorMethod()).rejects.toThrow('Test error');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Method failed: TestClass.errorMethod')
      );
      
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('エラーハンドリング', () => {
    it('無効なトランスポートでもエラーにならない', () => {
      expect(() => {
        logger.addTransport(null as any);
      }).not.toThrow();
    });

    it('空のメッセージでもログを記録', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const transport = new ConsoleTransport(LogLevel.INFO);
      logger.addTransport(transport);
      
      logger.info('');
      
      expect(consoleLogSpy).toHaveBeenCalled();
      
      consoleLogSpy.mockRestore();
    });

    it('大きなメタデータオブジェクトを処理', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const transport = new ConsoleTransport(LogLevel.INFO, { json: true });
      logger.addTransport(transport);
      
      const largeMeta = {
        data: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `value-${i}` }))
      };
      
      logger.info('Large meta test', largeMeta);
      
      expect(consoleLogSpy).toHaveBeenCalled();
      
      consoleLogSpy.mockRestore();
    });
  });

  describe('パフォーマンス', () => {
    it('大量のログを高速で処理', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const transport = new ConsoleTransport(LogLevel.INFO);
      logger.addTransport(transport);
      
      const start = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        logger.info(`Message ${i}`, { index: i });
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // 1秒以内
      expect(consoleLogSpy).toHaveBeenCalledTimes(1000);
      
      consoleLogSpy.mockRestore();
    });
  });
});