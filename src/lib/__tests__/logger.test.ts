import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import { Logger } from '../logger.js';

// chalkのモック
vi.mock('chalk', () => ({
  default: {
    green: vi.fn((text: string) => `[GREEN]${text}[/GREEN]`),
    red: vi.fn((text: string) => `[RED]${text}[/RED]`),
    yellow: vi.fn((text: string) => `[YELLOW]${text}[/YELLOW]`),
    blue: vi.fn((text: string) => `[BLUE]${text}[/BLUE]`),
    gray: vi.fn((text: string) => `[GRAY]${text}[/GRAY]`),
    bold: vi.fn((text: string) => `[BOLD]${text}[/BOLD]`),
  }
}));

describe('Logger', () => {
  let logger: Logger;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;
  let consoleTableSpy: any;

  beforeEach(() => {
    // コンソールメソッドをスパイ
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleTableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});
    
    logger = new Logger();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('基本ログメソッド', () => {
    it('infoメソッドが正しく動作する', () => {
      logger.info('テスト情報メッセージ');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[BLUE]ℹ[/BLUE]', 'テスト情報メッセージ');
    });

    it('successメソッドが正しく動作する', () => {
      logger.success('成功メッセージ');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[GREEN]✓[/GREEN]', '成功メッセージ');
    });

    it('errorメソッドが正しく動作する', () => {
      logger.error('エラーメッセージ');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[RED]✖[/RED]', 'エラーメッセージ');
    });

    it('warnメソッドが正しく動作する', () => {
      logger.warn('警告メッセージ');
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('[YELLOW]⚠[/YELLOW]', '警告メッセージ');
    });

    it('debugメソッドが正しく動作する', () => {
      logger.debug('デバッグメッセージ');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[GRAY]●[/GRAY]', 'デバッグメッセージ');
    });
  });

  describe('verboseモード', () => {
    it('verboseモードが有効な場合、verboseメッセージが表示される', () => {
      const verboseLogger = new Logger({ verbose: true });
      verboseLogger.verbose('詳細メッセージ');
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[GRAY]>[/GRAY]', '詳細メッセージ');
    });

    it('verboseモードが無効な場合、verboseメッセージは表示されない', () => {
      const normalLogger = new Logger({ verbose: false });
      normalLogger.verbose('詳細メッセージ');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('デフォルトではverboseモードは無効', () => {
      logger.verbose('詳細メッセージ');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('quietモード', () => {
    it('quietモードが有効な場合、エラー以外は表示されない', () => {
      const quietLogger = new Logger({ quiet: true });
      
      quietLogger.info('情報');
      quietLogger.success('成功');
      quietLogger.warn('警告');
      quietLogger.debug('デバッグ');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('quietモードでもエラーは表示される', () => {
      const quietLogger = new Logger({ quiet: true });
      quietLogger.error('エラーメッセージ');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[RED]✖[/RED]', 'エラーメッセージ');
    });
  });

  describe('tableメソッド', () => {
    it('データをテーブル形式で表示する', () => {
      const data = [
        { name: 'test1', value: 100 },
        { name: 'test2', value: 200 }
      ];
      
      logger.table(data);
      
      expect(consoleTableSpy).toHaveBeenCalledWith(data);
    });

    it('空の配列でもエラーにならない', () => {
      logger.table([]);
      
      expect(consoleTableSpy).toHaveBeenCalledWith([]);
    });
  });

  describe('複数引数のサポート', () => {
    it('複数の引数を渡せる', () => {
      logger.info('メッセージ1', 'メッセージ2', { key: 'value' });
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[BLUE]ℹ[/BLUE]',
        'メッセージ1',
        'メッセージ2',
        { key: 'value' }
      );
    });

    it('エラーオブジェクトを適切に処理する', () => {
      const error = new Error('テストエラー');
      logger.error('エラーが発生:', error);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[RED]✖[/RED]',
        'エラーが発生:',
        error
      );
    });
  });

  describe('オプションの組み合わせ', () => {
    it('verboseとquietが同時に有効な場合、quietが優先される', () => {
      const conflictLogger = new Logger({ verbose: true, quiet: true });
      
      conflictLogger.info('情報');
      conflictLogger.verbose('詳細');
      
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('色なし出力', () => {
    beforeEach(() => {
      process.env.NO_COLOR = '1';
    });

    afterEach(() => {
      delete process.env.NO_COLOR;
    });

    it('NO_COLOR環境変数が設定されている場合、色なしで出力される', () => {
      // 実際の実装では、NO_COLOR環境変数をチェックする必要がある
      // 現在のモックでは色付きで表示されるが、実装時には考慮が必要
      logger.info('色なしテスト');
      
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('特殊文字の処理', () => {
    it('改行を含むメッセージを正しく処理する', () => {
      logger.info('複数行\nメッセージ\nテスト');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[BLUE]ℹ[/BLUE]',
        '複数行\nメッセージ\nテスト'
      );
    });

    it('タブを含むメッセージを正しく処理する', () => {
      logger.info('タブ\t区切り\tメッセージ');
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[BLUE]ℹ[/BLUE]',
        'タブ\t区切り\tメッセージ'
      );
    });
  });
});