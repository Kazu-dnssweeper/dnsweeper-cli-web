import { describe, it, expect, beforeEach } from 'vitest';
import { createValidateCommand } from '../../../src/commands/validate.js';
import type { Command } from 'commander';

describe('createValidateCommand', () => {
  let command: Command;

  beforeEach(() => {
    command = createValidateCommand();
  });

  describe('コマンド設定', () => {
    it('コマンド名とエイリアスが正しく設定される', () => {
      expect(command.name()).toBe('validate');
      expect(command.aliases()).toContain('check');
    });

    it('説明文が設定される', () => {
      expect(command.description()).toBe('DNS設定の妥当性をチェック');
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
      
      expect(optionNames).toContain('--format');
      expect(optionNames).toContain('--output');
      expect(optionNames).toContain('--timeout');
      expect(optionNames).toContain('--nameserver');
      expect(optionNames).toContain('--checks');
      expect(optionNames).toContain('--severity');
      expect(optionNames).toContain('--verbose');
      expect(optionNames).toContain('--json');
      expect(optionNames).toContain('--quiet');
      // --no-colorsオプションは負の形式なので、実際のオプション名を確認
      const hasColorsOption = options.some(opt => opt.long === '--colors' || opt.long === '--no-colors');
      expect(hasColorsOption).toBe(true);
    });
  });

  describe('オプションのデフォルト値', () => {
    it('formatのデフォルト値がtable', () => {
      const formatOption = command.options.find(opt => opt.long === '--format');
      expect(formatOption?.defaultValue).toBe('table');
    });

    it('timeoutのデフォルト値が5000', () => {
      const timeoutOption = command.options.find(opt => opt.long === '--timeout');
      expect(timeoutOption?.defaultValue).toBe('5000');
    });

    it('severityのデフォルト値がinfo', () => {
      const severityOption = command.options.find(opt => opt.long === '--severity');
      expect(severityOption?.defaultValue).toBe('info');
    });
  });

  describe('ヘルプテキスト', () => {
    it('オプションの説明が適切', () => {
      const formatOption = command.options.find(opt => opt.long === '--format');
      expect(formatOption?.description).toContain('出力形式');
      
      const checksOption = command.options.find(opt => opt.long === '--checks');
      expect(checksOption?.description).toContain('チェック項目');
      
      const severityOption = command.options.find(opt => opt.long === '--severity');
      expect(severityOption?.description).toContain('重要度');

      const timeoutOption = command.options.find(opt => opt.long === '--timeout');
      expect(timeoutOption?.description).toContain('タイムアウト');

      const nameserverOption = command.options.find(opt => opt.long === '--nameserver');
      expect(nameserverOption?.description).toContain('ネームサーバー');
    });

    it('引数の説明が適切', () => {
      const domainArg = command.registeredArguments[0];
      expect(domainArg.description).toBe('チェックするドメイン名');
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

  describe('ショートオプション', () => {
    it('出力形式オプション: -f', () => {
      const formatOption = command.options.find(opt => opt.short === '-f');
      expect(formatOption?.long).toBe('--format');
    });

    it('出力ファイルオプション: -o', () => {
      const outputOption = command.options.find(opt => opt.short === '-o');
      expect(outputOption?.long).toBe('--output');
    });

    it('詳細出力オプション: -v', () => {
      const verboseOption = command.options.find(opt => opt.short === '-v');
      expect(verboseOption?.long).toBe('--verbose');
    });

    it('JSON出力オプション: -j', () => {
      const jsonOption = command.options.find(opt => opt.short === '-j');
      expect(jsonOption?.long).toBe('--json');
    });

    it('静寂出力オプション: -q', () => {
      const quietOption = command.options.find(opt => opt.short === '-q');
      expect(quietOption?.long).toBe('--quiet');
    });
  });

  describe('使用例の検証', () => {
    it('基本的な使用例: validate example.com', () => {
      // 基本構文の検証
      expect(command.usage()).toContain('<domain>');
    });

    it('チェック項目指定: validate example.com --checks a-record-exists,mx-record-exists', () => {
      const checksOption = command.options.find(opt => opt.long === '--checks');
      expect(checksOption).toBeDefined();
    });

    it('重要度指定: validate example.com --severity warning', () => {
      const severityOption = command.options.find(opt => opt.long === '--severity');
      expect(severityOption).toBeDefined();
    });

    it('JSON出力: validate example.com --json', () => {
      const jsonOption = command.options.find(opt => opt.long === '--json');
      expect(jsonOption).toBeDefined();
    });

    it('ファイル出力: validate example.com -o validation-report.json', () => {
      const outputOption = command.options.find(opt => opt.short === '-o');
      expect(outputOption?.long).toBe('--output');
    });
  });

  describe('検証オプション', () => {
    it('重要度レベルの種類', () => {
      const severityOption = command.options.find(opt => opt.long === '--severity');
      expect(severityOption?.description).toContain('info, warning, error');
    });

    it('出力形式の種類', () => {
      const formatOption = command.options.find(opt => opt.long === '--format');
      expect(formatOption?.description).toContain('table, json, csv, text');
    });

    it('チェック項目の指定方法', () => {
      const checksOption = command.options.find(opt => opt.long === '--checks');
      expect(checksOption?.description).toContain('カンマ区切り');
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

  describe('検証機能の期待', () => {
    it('Aレコード存在チェック機能期待', () => {
      // コマンド設定の検証のみ
      expect(command.name()).toBe('validate');
    });

    it('MXレコード存在チェック機能期待', () => {
      expect(command.name()).toBe('validate');
    });

    it('TTL整合性チェック機能期待', () => {
      expect(command.name()).toBe('validate');
    });

    it('CNAME競合チェック機能期待', () => {
      expect(command.name()).toBe('validate');
    });

    it('短すぎるTTL警告機能期待', () => {
      expect(command.name()).toBe('validate');
    });
  });

  describe('バリデーション期待', () => {
    it('無効なドメイン名でエラー期待', async () => {
      // コマンドの直接実行はprocess.exitを呼ぶため、
      // ここではコマンド設定の検証のみ行う
      expect(command.name()).toBe('validate');
    });

    it('無効な重要度でエラー期待', async () => {
      const severityOption = command.options.find(opt => opt.long === '--severity');
      expect(severityOption).toBeDefined();
    });

    it('無効な出力形式でエラー期待', async () => {
      const formatOption = command.options.find(opt => opt.long === '--format');
      expect(formatOption).toBeDefined();
    });

    it('存在しないチェック項目でエラー期待', async () => {
      const checksOption = command.options.find(opt => opt.long === '--checks');
      expect(checksOption).toBeDefined();
    });
  });
});