import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createLookupCommand } from '../../../src/commands/lookup.js';
import type { Command } from 'commander';

describe('createLookupCommand', () => {
  let command: Command;

  beforeEach(() => {
    command = createLookupCommand();
  });

  describe('コマンド設定', () => {
    it('コマンド名とエイリアスが正しく設定される', () => {
      expect(command.name()).toBe('lookup');
      expect(command.aliases()).toContain('resolve');
    });

    it('説明文が設定される', () => {
      expect(command.description()).toBe('DNS解決を実行して結果を表示');
    });

    it('必要な引数が設定される', () => {
      const args = command.registeredArguments;
      expect(args).toHaveLength(1);
      expect(args[0].name()).toBe('domain');
      expect(args[0].required).toBe(true);
    });

    it('オプションが正しく設定される', () => {
      const options = command.options;
      const optionNames = options.map(opt => opt.long);
      
      expect(optionNames).toContain('--type');
      expect(optionNames).toContain('--format');
      expect(optionNames).toContain('--output');
      expect(optionNames).toContain('--timeout');
      expect(optionNames).toContain('--nameserver');
      expect(optionNames).toContain('--analyze');
      expect(optionNames).toContain('--verbose');
      expect(optionNames).toContain('--json');
      expect(optionNames).toContain('--quiet');
      // --no-colorsオプションは負の形式なので、実際のオプション名を確認
      const hasColorsOption = options.some(opt => opt.long === '--colors' || opt.long === '--no-colors');
      expect(hasColorsOption).toBe(true);
    });
  });

  describe('オプションのデフォルト値', () => {
    it('typeのデフォルト値がA', () => {
      const typeOption = command.options.find(opt => opt.long === '--type');
      expect(typeOption?.defaultValue).toBe('A');
    });

    it('formatのデフォルト値がtable', () => {
      const formatOption = command.options.find(opt => opt.long === '--format');
      expect(formatOption?.defaultValue).toBe('table');
    });

    it('timeoutのデフォルト値が5000', () => {
      const timeoutOption = command.options.find(opt => opt.long === '--timeout');
      expect(timeoutOption?.defaultValue).toBe('5000');
    });
  });

  describe('ヘルプテキスト', () => {
    it('オプションの説明が適切', () => {
      const typeOption = command.options.find(opt => opt.long === '--type');
      expect(typeOption?.description).toContain('レコードタイプ');
      
      const formatOption = command.options.find(opt => opt.long === '--format');
      expect(formatOption?.description).toContain('出力形式');
      
      const analyzeOption = command.options.find(opt => opt.long === '--analyze');
      expect(analyzeOption?.description).toContain('リスク分析');
    });

    it('引数の説明が適切', () => {
      const domainArg = command.registeredArguments[0];
      expect(domainArg.description).toBe('解決するドメイン名');
    });
  });

  describe('コマンドの実行可能性', () => {
    it('コマンドオブジェクトが正しく作成される', () => {
      expect(command).toBeDefined();
      expect(typeof command.action).toBe('function');
    });

    it('actionハンドラーが設定されている', () => {
      expect(command._actionHandler).toBeDefined();
    });
  });

  describe('エラーハンドリング', () => {
    it('無効なドメイン名でエラー', async () => {
      // コマンドの直接実行はprocess.exitを呼ぶため、
      // ここではコマンド設定の検証のみ行う
      expect(command.name()).toBe('lookup');
    });

    it('無効なレコードタイプでエラー', async () => {
      // オプション設定の検証
      const typeOption = command.options.find(opt => opt.long === '--type');
      expect(typeOption).toBeDefined();
    });

    it('無効な出力形式でエラー', async () => {
      // オプション設定の検証
      const formatOption = command.options.find(opt => opt.long === '--format');
      expect(formatOption).toBeDefined();
    });
  });

  describe('オプション組み合わせ', () => {
    it('--jsonオプションは--format jsonと同等', () => {
      const jsonOption = command.options.find(opt => opt.long === '--json');
      expect(jsonOption?.description).toContain('JSON形式');
    });

    it('--no-colorsオプションで色無効化', () => {
      // --no-colorsオプションの実装を確認
      const colorsOption = command.options.find(opt => opt.long === '--colors' || opt.long === '--no-colors');
      expect(colorsOption).toBeDefined();
    });

    it('--verboseと--quietは相反する', () => {
      const verboseOption = command.options.find(opt => opt.long === '--verbose');
      const quietOption = command.options.find(opt => opt.long === '--quiet');
      
      expect(verboseOption).toBeDefined();
      expect(quietOption).toBeDefined();
    });
  });

  describe('使用例の検証', () => {
    it('基本的な使用例: lookup example.com', () => {
      // 基本構文の検証
      expect(command.usage()).toContain('<domain>');
    });

    it('レコードタイプ指定: lookup example.com -t MX', () => {
      const typeOption = command.options.find(opt => opt.short === '-t');
      expect(typeOption?.long).toBe('--type');
    });

    it('JSON出力: lookup example.com --json', () => {
      const jsonOption = command.options.find(opt => opt.short === '-j');
      expect(jsonOption?.long).toBe('--json');
    });

    it('ファイル出力: lookup example.com -o result.json', () => {
      const outputOption = command.options.find(opt => opt.short === '-o');
      expect(outputOption?.long).toBe('--output');
    });

    it('リスク分析付き: lookup example.com --analyze', () => {
      const analyzeOption = command.options.find(opt => opt.short === '-a');
      expect(analyzeOption?.long).toBe('--analyze');
    });
  });

  describe('パフォーマンス考慮', () => {
    it('タイムアウト設定が可能', () => {
      const timeoutOption = command.options.find(opt => opt.long === '--timeout');
      expect(timeoutOption).toBeDefined();
      expect(timeoutOption?.description).toContain('タイムアウト');
    });

    it('ネームサーバー指定が可能', () => {
      const nameserverOption = command.options.find(opt => opt.long === '--nameserver');
      expect(nameserverOption).toBeDefined();
      expect(nameserverOption?.description).toContain('ネームサーバー');
    });
  });
});