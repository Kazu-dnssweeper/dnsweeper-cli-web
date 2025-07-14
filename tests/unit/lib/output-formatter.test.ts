import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OutputFormatter, createFormatter, formatAnalysisResult, type AnalysisResult } from '../../../src/lib/output-formatter.js';
import type { IDNSRecord } from '../../../src/types/index.js';

describe('OutputFormatter', () => {
  let formatter: OutputFormatter;
  let mockResult: AnalysisResult;

  beforeEach(() => {
    formatter = new OutputFormatter();
    
    // モック分析結果データ
    mockResult = {
      summary: {
        total: 3,
        byType: {
          A: 2,
          AAAA: 0,
          CNAME: 1,
          MX: 0,
          TXT: 0,
          NS: 0,
          SOA: 0,
          SRV: 0,
          PTR: 0,
          CAA: 0
        },
        byRisk: {
          low: 1,
          medium: 1,
          high: 1,
          critical: 0
        },
        duration: 1500
      },
      records: [
        {
          id: 'test-1',
          name: 'example.com',
          type: 'A',
          value: '192.168.1.1',
          ttl: 300,
          created: new Date('2024-01-01'),
          updated: new Date('2024-01-01'),
          riskLevel: 'low',
          riskScore: 15,
          recommendations: []
        },
        {
          id: 'test-2',
          name: 'www.example.com',
          type: 'CNAME',
          value: 'example.com',
          ttl: 3600,
          created: new Date('2024-01-01'),
          updated: new Date('2024-01-01'),
          riskLevel: 'medium',
          riskScore: 45,
          recommendations: ['TTL値を確認してください']
        },
        {
          id: 'test-3',
          name: 'old.example.com',
          type: 'A',
          value: '10.0.0.1',
          ttl: 60,
          created: new Date('2023-01-01'),
          updated: new Date('2023-01-01'),
          riskLevel: 'high',
          riskScore: 85,
          recommendations: ['古いレコードです', 'TTLが短すぎます']
        }
      ] as Array<IDNSRecord & {
        riskLevel: 'low' | 'medium' | 'high' | 'critical';
        riskScore: number;
        recommendations: string[];
      }>,
      metadata: {
        scannedAt: new Date('2024-01-01T12:00:00Z'),
        source: 'test.csv',
        version: '1.0.0'
      }
    };
  });

  describe('constructor', () => {
    it('デフォルト設定で作成される', () => {
      const defaultFormatter = new OutputFormatter();
      expect(defaultFormatter).toBeDefined();
    });

    it('カスタム設定で作成される', () => {
      const customFormatter = new OutputFormatter({
        format: 'json',
        colors: false,
        verbose: true
      });
      expect(customFormatter).toBeDefined();
    });
  });

  describe('format', () => {
    it('JSON形式で出力', () => {
      formatter = new OutputFormatter({ format: 'json' });
      const result = formatter.format(mockResult);
      
      expect(result).toContain('"total": 3');
      expect(result).toContain('"example.com"');
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('コンパクトJSON形式で出力', () => {
      formatter = new OutputFormatter({ format: 'json', compact: true });
      const result = formatter.format(mockResult);
      
      expect(result).not.toContain('\n');
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('CSV形式で出力', () => {
      formatter = new OutputFormatter({ format: 'csv' });
      const result = formatter.format(mockResult);
      
      const lines = result.split('\n');
      expect(lines).toHaveLength(4); // ヘッダー + 3レコード
      expect(lines[0]).toContain('ID,Name,Type,Value');
      expect(lines[1]).toContain('test-1,example.com,A,192.168.1.1');
    });

    it('CSVのカンマ・クォートエスケープ', () => {
      const resultWithCommas = {
        ...mockResult,
        records: [{
          ...mockResult.records[0],
          value: 'value,with,commas',
          recommendations: ['推奨事項1', '推奨事項2']
        }]
      };

      formatter = new OutputFormatter({ format: 'csv' });
      const result = formatter.format(resultWithCommas);
      
      expect(result).toContain('"value,with,commas"');
      expect(result).toContain('推奨事項1; 推奨事項2');
    });

    it('テーブル形式で出力', () => {
      formatter = new OutputFormatter({ format: 'table', colors: false });
      const result = formatter.format(mockResult);
      
      expect(result).toContain('📊 分析サマリー');
      expect(result).toContain('総レコード数: 3');
      expect(result).toContain('Name');
      expect(result).toContain('Type');
      expect(result).toContain('example.com');
    });

    it('テキスト形式で出力', () => {
      formatter = new OutputFormatter({ format: 'text', colors: false });
      const result = formatter.format(mockResult);
      
      expect(result).toContain('=== DNS分析結果 ===');
      expect(result).toContain('🔍 example.com (A)');
      expect(result).toContain('値: 192.168.1.1');
    });

    it('色無効時にANSIエスケープコードが含まれない', () => {
      formatter = new OutputFormatter({ format: 'table', colors: false });
      const result = formatter.format(mockResult);
      
      // ANSIエスケープシーケンスが含まれていないことを確認
      expect(result).not.toMatch(/\u001b\[[0-9;]*m/);
    });

    it('サポートされていない形式でエラー', () => {
      formatter = new OutputFormatter({ format: 'xml' as any });
      
      expect(() => formatter.format(mockResult)).toThrow('サポートされていない出力形式');
    });
  });

  describe('writeToFile', () => {
    it('ファイルに出力機能が呼び出し可能', async () => {
      // 実際のファイル書き込みではなく、機能の呼び出し可能性をテスト
      formatter = new OutputFormatter({ format: 'json' });
      
      // エラーが発生しないことを確認（実際のファイル書き込みは行わない）
      const promise = formatter.writeToFile(mockResult, '/tmp/test.json');
      await expect(promise).resolves.not.toThrow();
    });

    it('CSVファイル出力機能が呼び出し可能', async () => {
      formatter = new OutputFormatter({ format: 'csv' });
      
      // エラーが発生しないことを確認（実際のファイル書き込みは行わない）
      const promise = formatter.writeToFile(mockResult, '/tmp/test.csv');
      await expect(promise).resolves.not.toThrow();
    });

    it('ファイル名が指定されていない場合エラー', async () => {
      formatter = new OutputFormatter({ format: 'json' });
      
      await expect(formatter.writeToFile(mockResult)).rejects.toThrow(
        '出力ファイル名が指定されていません'
      );
    });
  });

  describe('リスクレベル表示', () => {
    it('各リスクレベルが適切に色分けされる', () => {
      // 色付きのテストはchalkが実際に色を出力するかに依存するため、
      // 色設定がtrueの場合の基本動作をテスト
      formatter = new OutputFormatter({ format: 'table', colors: true });
      const result = formatter.format(mockResult);
      
      // 基本的な内容が含まれることを確認
      expect(result).toContain('📊 分析サマリー');
      expect(result).toContain('LOW');
      expect(result).toContain('MEDIUM');
      expect(result).toContain('HIGH');
    });

    it('詳細モードでメタデータが表示される', () => {
      formatter = new OutputFormatter({ format: 'table', verbose: true });
      const result = formatter.format(mockResult);
      
      expect(result).toContain('📋 メタデータ');
      expect(result).toContain('スキャン日時:');
      expect(result).toContain('test.csv');
    });
  });

  describe('推奨事項表示', () => {
    it('推奨事項がテキスト形式で表示される', () => {
      formatter = new OutputFormatter({ format: 'text', colors: false });
      const result = formatter.format(mockResult);
      
      expect(result).toContain('推奨事項:');
      expect(result).toContain('• TTL値を確認してください');
      expect(result).toContain('• 古いレコードです');
    });

    it('推奨事項がないレコードでは推奨事項セクションが表示されない', () => {
      const resultNoRecommendations = {
        ...mockResult,
        records: [mockResult.records[0]] // 推奨事項がないレコードのみ
      };

      formatter = new OutputFormatter({ format: 'text', colors: false });
      const result = formatter.format(resultNoRecommendations);
      
      expect(result).not.toContain('推奨事項:');
    });
  });

  describe('ユーティリティ関数', () => {
    it('createFormatter', () => {
      const formatter = createFormatter({ format: 'json' });
      expect(formatter).toBeDefined();
    });

    it('formatAnalysisResult', () => {
      const result = formatAnalysisResult(mockResult, 'json', false);
      expect(result).toContain('"total": 3');
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('formatAnalysisResult デフォルトパラメータ', () => {
      const result = formatAnalysisResult(mockResult);
      expect(result).toContain('📊 分析サマリー');
    });
  });

  describe('エラーハンドリング', () => {
    it('空のレコード配列を処理', () => {
      const emptyResult = {
        ...mockResult,
        records: [],
        summary: {
          ...mockResult.summary,
          total: 0
        }
      };

      formatter = new OutputFormatter({ format: 'table' });
      const result = formatter.format(emptyResult);
      
      expect(result).toContain('総レコード数: 0');
    });

    it('非常に長いレコード名を処理', () => {
      const longNameResult = {
        ...mockResult,
        records: [{
          ...mockResult.records[0],
          name: 'a'.repeat(100) + '.example.com'
        }]
      };

      formatter = new OutputFormatter({ format: 'table' });
      const result = formatter.format(longNameResult);
      
      expect(result).toBeDefined();
    });
  });

  describe('パフォーマンス', () => {
    it('大量のレコードを処理', () => {
      const largeResult = {
        ...mockResult,
        records: Array(1000).fill(null).map((_, i) => ({
          ...mockResult.records[0],
          id: `test-${i}`,
          name: `record-${i}.example.com`
        })),
        summary: {
          ...mockResult.summary,
          total: 1000
        }
      };

      formatter = new OutputFormatter({ format: 'csv' });
      const startTime = Date.now();
      const result = formatter.format(largeResult);
      const duration = Date.now() - startTime;
      
      expect(result).toBeDefined();
      expect(duration).toBeLessThan(1000); // 1秒以内
      expect(result.split('\n')).toHaveLength(1001); // ヘッダー + 1000レコード
    });
  });
});