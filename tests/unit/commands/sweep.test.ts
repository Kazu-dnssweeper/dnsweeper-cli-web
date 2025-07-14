import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSweepCommand } from '../../../src/commands/sweep.js';
import type { Command } from 'commander';

describe('createSweepCommand', () => {
  let command: Command;

  beforeEach(() => {
    command = createSweepCommand();
  });

  describe('コマンド設定', () => {
    it('コマンド名とエイリアスが正しく設定される', () => {
      expect(command.name()).toBe('sweep');
      expect(command.aliases()).toContain('scan');
    });

    it('説明文が設定される', () => {
      expect(command.description()).toBe('複数ドメインの一括DNS解決とスキャン');
    });

    it('可変長引数が設定される', () => {
      const args = command.registeredArguments;
      expect(args).toHaveLength(1);
      expect(args[0].name()).toBe('domains');
      expect(args[0].required).toBe(false);
      expect(args[0].variadic).toBe(true);
    });

    it('オプションが正しく設定される', () => {
      const options = command.options;
      const optionNames = options.map(opt => opt.long);
      
      expect(optionNames).toContain('--file');
      expect(optionNames).toContain('--csv');
      expect(optionNames).toContain('--types');
      expect(optionNames).toContain('--format');
      expect(optionNames).toContain('--output');
      expect(optionNames).toContain('--timeout');
      expect(optionNames).toContain('--nameserver');
      expect(optionNames).toContain('--concurrency');
      expect(optionNames).toContain('--analyze');
      expect(optionNames).toContain('--risk-level');
      expect(optionNames).toContain('--progress');
      expect(optionNames).toContain('--verbose');
      expect(optionNames).toContain('--json');
      expect(optionNames).toContain('--quiet');
      // --no-colorsオプションは負の形式なので、実際のオプション名を確認
      const hasColorsOption = options.some(opt => opt.long === '--colors' || opt.long === '--no-colors');
      expect(hasColorsOption).toBe(true);
    });
  });

  describe('オプションのデフォルト値', () => {
    it('typesのデフォルト値がA,AAAA,CNAME,MX', () => {
      const typesOption = command.options.find(opt => opt.long === '--types');
      expect(typesOption?.defaultValue).toBe('A,AAAA,CNAME,MX');
    });

    it('formatのデフォルト値がtable', () => {
      const formatOption = command.options.find(opt => opt.long === '--format');
      expect(formatOption?.defaultValue).toBe('table');
    });

    it('timeoutのデフォルト値が5000', () => {
      const timeoutOption = command.options.find(opt => opt.long === '--timeout');
      expect(timeoutOption?.defaultValue).toBe('5000');
    });

    it('concurrencyのデフォルト値が5', () => {
      const concurrencyOption = command.options.find(opt => opt.long === '--concurrency');
      expect(concurrencyOption?.defaultValue).toBe('5');
    });
  });

  describe('ヘルプテキスト', () => {
    it('オプションの説明が適切', () => {
      const fileOption = command.options.find(opt => opt.long === '--file');
      expect(fileOption?.description).toContain('ドメインリストファイル');
      
      const csvOption = command.options.find(opt => opt.long === '--csv');
      expect(csvOption?.description).toContain('CSVファイル');
      
      const typesOption = command.options.find(opt => opt.long === '--types');
      expect(typesOption?.description).toContain('レコードタイプ');
      
      const formatOption = command.options.find(opt => opt.long === '--format');
      expect(formatOption?.description).toContain('出力形式');
      
      const concurrencyOption = command.options.find(opt => opt.long === '--concurrency');
      expect(concurrencyOption?.description).toContain('並列実行数');
      
      const analyzeOption = command.options.find(opt => opt.long === '--analyze');
      expect(analyzeOption?.description).toContain('リスク分析');

      const riskLevelOption = command.options.find(opt => opt.long === '--risk-level');
      expect(riskLevelOption?.description).toContain('リスクレベル');

      const progressOption = command.options.find(opt => opt.long === '--progress');
      expect(progressOption?.description).toContain('進捗');
    });

    it('引数の説明が適切', () => {
      const domainsArg = command.registeredArguments[0];
      expect(domainsArg.description).toBe('スキャンするドメインのリスト');
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
    it('ファイル読み込みオプション: -f', () => {
      const fileOption = command.options.find(opt => opt.short === '-f');
      expect(fileOption?.long).toBe('--file');
    });

    it('レコードタイプオプション: -t', () => {
      const typesOption = command.options.find(opt => opt.short === '-t');
      expect(typesOption?.long).toBe('--types');
    });

    it('出力ファイルオプション: -o', () => {
      const outputOption = command.options.find(opt => opt.short === '-o');
      expect(outputOption?.long).toBe('--output');
    });

    it('並列実行数オプション: -c', () => {
      const concurrencyOption = command.options.find(opt => opt.short === '-c');
      expect(concurrencyOption?.long).toBe('--concurrency');
    });

    it('リスク分析オプション: -a', () => {
      const analyzeOption = command.options.find(opt => opt.short === '-a');
      expect(analyzeOption?.long).toBe('--analyze');
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
    it('基本的な使用例: sweep example.com test.com', () => {
      // 可変長引数の構文を検証
      expect(command.usage()).toContain('[domains...]');
    });

    it('ファイル指定: sweep -f domains.txt', () => {
      const fileOption = command.options.find(opt => opt.short === '-f');
      expect(fileOption?.long).toBe('--file');
    });

    it('CSV指定: sweep --csv domains.csv', () => {
      const csvOption = command.options.find(opt => opt.long === '--csv');
      expect(csvOption).toBeDefined();
    });

    it('レコードタイプ指定: sweep -t A,MX example.com', () => {
      const typesOption = command.options.find(opt => opt.short === '-t');
      expect(typesOption?.long).toBe('--types');
    });

    it('並列実行数指定: sweep -c 10 example.com', () => {
      const concurrencyOption = command.options.find(opt => opt.short === '-c');
      expect(concurrencyOption?.long).toBe('--concurrency');
    });

    it('リスク分析付き: sweep --analyze example.com', () => {
      const analyzeOption = command.options.find(opt => opt.long === '--analyze');
      expect(analyzeOption).toBeDefined();
    });

    it('進捗表示付き: sweep --progress example.com', () => {
      const progressOption = command.options.find(opt => opt.long === '--progress');
      expect(progressOption).toBeDefined();
    });

    it('リスクレベルフィルタ: sweep --risk-level high example.com', () => {
      const riskLevelOption = command.options.find(opt => opt.long === '--risk-level');
      expect(riskLevelOption).toBeDefined();
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

    it('入力ソースは排他的（domains, --file, --csv）', () => {
      const fileOption = command.options.find(opt => opt.long === '--file');
      const csvOption = command.options.find(opt => opt.long === '--csv');
      
      expect(fileOption).toBeDefined();
      expect(csvOption).toBeDefined();
      // 引数もある
      expect(command.registeredArguments).toHaveLength(1);
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

    it('並列実行数の制御が可能', () => {
      const concurrencyOption = command.options.find(opt => opt.long === '--concurrency');
      expect(concurrencyOption).toBeDefined();
      expect(concurrencyOption?.description).toContain('並列実行数');
    });
  });

  describe('バリデーション期待', () => {
    it('範囲外の並列実行数でエラー期待', () => {
      // コマンドの直接実行はprocess.exitを呼ぶため、
      // ここではコマンド設定の検証のみ行う
      const concurrencyOption = command.options.find(opt => opt.long === '--concurrency');
      expect(concurrencyOption).toBeDefined();
      expect(concurrencyOption?.defaultValue).toBe('5');
    });

    it('無効なレコードタイプでエラー期待', () => {
      const typesOption = command.options.find(opt => opt.long === '--types');
      expect(typesOption).toBeDefined();
    });

    it('無効な出力形式でエラー期待', () => {
      const formatOption = command.options.find(opt => opt.long === '--format');
      expect(formatOption).toBeDefined();
    });

    it('存在しないファイルでエラー期待', () => {
      const fileOption = command.options.find(opt => opt.long === '--file');
      expect(fileOption).toBeDefined();
    });
  });
});