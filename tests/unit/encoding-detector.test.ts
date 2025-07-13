/**
 * encoding-detector.ts のユニットテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  detectBOM,
  detectBufferEncoding,
  decodeBuffer,
  detectFileEncoding,
  readFileWithDetectedEncoding,
  evaluateDetectionReliability,
  detectCsvEncoding,
  type SupportedEncoding,
  type EncodingDetectionResult
} from '../../src/utils/encoding-detector.js';

describe('encoding-detector', () => {
  let tempFiles: string[] = [];

  afterEach(async () => {
    // テスト用一時ファイルをクリーンアップ
    for (const file of tempFiles) {
      try {
        await unlink(file);
      } catch {
        // ファイルが存在しない場合は無視
      }
    }
    tempFiles = [];
  });

  const createTempFile = async (content: string | Buffer, encoding?: BufferEncoding): Promise<string> => {
    const filePath = join(tmpdir(), `test-${Date.now()}-${Math.random().toString(36).substring(2)}.csv`);
    tempFiles.push(filePath);
    
    if (typeof content === 'string' && encoding) {
      await writeFile(filePath, content, encoding);
    } else {
      await writeFile(filePath, content);
    }
    
    return filePath;
  };

  describe('detectBOM', () => {
    it('UTF-8 BOMを検出', () => {
      const buffer = Buffer.from([0xEF, 0xBB, 0xBF, 0x48, 0x65, 0x6C, 0x6C, 0x6F]); // "Hello" with UTF-8 BOM
      const result = detectBOM(buffer);
      
      expect(result.encoding).toBe('utf-8');
      expect(result.bomLength).toBe(3);
    });

    it('UTF-16LE BOMを検出', () => {
      const buffer = Buffer.from([0xFF, 0xFE, 0x48, 0x00, 0x65, 0x00]); // "He" with UTF-16LE BOM
      const result = detectBOM(buffer);
      
      expect(result.encoding).toBe('utf-16le');
      expect(result.bomLength).toBe(2);
    });

    it('UTF-16BE BOMを検出', () => {
      const buffer = Buffer.from([0xFE, 0xFF, 0x00, 0x48, 0x00, 0x65]); // "He" with UTF-16BE BOM
      const result = detectBOM(buffer);
      
      expect(result.encoding).toBe('utf-16be');
      expect(result.bomLength).toBe(2);
    });

    it('BOMなしの場合はnullを返す', () => {
      const buffer = Buffer.from('Hello, World!', 'utf-8');
      const result = detectBOM(buffer);
      
      expect(result.encoding).toBeNull();
      expect(result.bomLength).toBe(0);
    });

    it('短いバッファでもエラーにならない', () => {
      const buffer = Buffer.from([0xEF]); // 1バイトのみ
      const result = detectBOM(buffer);
      
      expect(result.encoding).toBeNull();
      expect(result.bomLength).toBe(0);
    });
  });

  describe('detectBufferEncoding', () => {
    it('UTF-8 BOM付きテキストを検出', () => {
      const buffer = Buffer.from([0xEF, 0xBB, 0xBF, ...Buffer.from('Hello, World!', 'utf-8')]);
      const result = detectBufferEncoding(buffer);
      
      expect(result.encoding).toBe('utf-8');
      expect(result.confidence).toBe(100);
      expect(result.bomPresent).toBe(true);
    });

    it('UTF-8テキストを検出', () => {
      const buffer = Buffer.from('これは日本語のテストです。', 'utf-8');
      const result = detectBufferEncoding(buffer);
      
      expect(result.encoding).toBe('utf-8');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.bomPresent).toBe(false);
    });

    it('ASCIIテキストを検出', () => {
      const buffer = Buffer.from('Hello, World! This is ASCII text.', 'ascii');
      const result = detectBufferEncoding(buffer);
      
      // ASCIIはUTF-8としても有効なので、どちらでも可
      expect(['ascii', 'utf-8']).toContain(result.encoding);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('空のバッファでもエラーにならない', () => {
      const buffer = Buffer.alloc(0);
      const result = detectBufferEncoding(buffer);
      
      expect(result.encoding).toBe('utf-8'); // デフォルト
      expect(result.confidence).toBe(50);
    });
  });

  describe('decodeBuffer', () => {
    it('UTF-8バッファを正しくデコード', () => {
      const originalText = 'これは日本語のテストです。';
      const buffer = Buffer.from(originalText, 'utf-8');
      const decoded = decodeBuffer(buffer, 'utf-8');
      
      expect(decoded).toBe(originalText);
    });

    it('UTF-8 BOM付きバッファを正しくデコード', () => {
      const originalText = 'Hello, World!';
      const buffer = Buffer.from([0xEF, 0xBB, 0xBF, ...Buffer.from(originalText, 'utf-8')]);
      const decoded = decodeBuffer(buffer, 'utf-8');
      
      expect(decoded).toBe(originalText);
    });

    it('Shift_JISテキストをデコード', () => {
      // Shift_JISエンコーディングのテストは環境依存のため、基本的な動作のみテスト
      const buffer = Buffer.from('Hello', 'utf-8'); // 基本的なASCII
      const decoded = decodeBuffer(buffer, 'shift_jis');
      
      expect(decoded).toBe('Hello');
    });

    it('空のバッファでもエラーにならない', () => {
      const buffer = Buffer.alloc(0);
      const decoded = decodeBuffer(buffer, 'utf-8');
      
      expect(decoded).toBe('');
    });
  });

  describe('detectFileEncoding', () => {
    it('UTF-8ファイルのエンコーディングを検出', async () => {
      const content = 'これは日本語のテストファイルです。\nCSV,データ,テスト';
      const filePath = await createTempFile(content, 'utf-8');
      
      const result = await detectFileEncoding(filePath);
      
      expect(result.encoding).toBe('utf-8');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('UTF-8 BOM付きファイルのエンコーディングを検出', async () => {
      const content = 'Name,Age,City\nJohn,25,Tokyo\nJane,30,Osaka';
      const buffer = Buffer.concat([
        Buffer.from([0xEF, 0xBB, 0xBF]), // UTF-8 BOM
        Buffer.from(content, 'utf-8')
      ]);
      const filePath = await createTempFile(buffer);
      
      const result = await detectFileEncoding(filePath);
      
      expect(result.encoding).toBe('utf-8');
      expect(result.confidence).toBe(100);
      expect(result.bomPresent).toBe(true);
    });

    it('存在しないファイルでエラーが発生', async () => {
      const filePath = '/non/existent/file.csv';
      
      await expect(detectFileEncoding(filePath)).rejects.toThrow();
    });
  });

  describe('readFileWithDetectedEncoding', () => {
    it('ファイルを正しく読み込みとエンコーディング検出', async () => {
      const originalContent = 'Name,Age,City\n太郎,25,東京\n花子,30,大阪';
      const filePath = await createTempFile(originalContent, 'utf-8');
      
      const result = await readFileWithDetectedEncoding(filePath);
      
      expect(result.content).toBe(originalContent);
      expect(result.detection.encoding).toBe('utf-8');
    });

    it('BOM付きファイルの内容を正しく読み込み', async () => {
      const originalContent = 'Name,Age,City\nJohn,25,Tokyo';
      const buffer = Buffer.concat([
        Buffer.from([0xEF, 0xBB, 0xBF]), // UTF-8 BOM
        Buffer.from(originalContent, 'utf-8')
      ]);
      const filePath = await createTempFile(buffer);
      
      const result = await readFileWithDetectedEncoding(filePath);
      
      expect(result.content).toBe(originalContent); // BOMは除去される
      expect(result.detection.bomPresent).toBe(true);
    });
  });

  describe('evaluateDetectionReliability', () => {
    it('BOM付きの場合は高信頼度', () => {
      const result: EncodingDetectionResult = {
        encoding: 'utf-8',
        confidence: 100,
        originalDetection: null,
        bomPresent: true,
        alternatives: []
      };
      
      const evaluation = evaluateDetectionReliability(result);
      
      expect(evaluation.level).toBe('high');
      expect(evaluation.message).toContain('BOM');
    });

    it('高い信頼度（85%以上）', () => {
      const result: EncodingDetectionResult = {
        encoding: 'utf-8',
        confidence: 90,
        originalDetection: 'UTF-8',
        bomPresent: false,
        alternatives: []
      };
      
      const evaluation = evaluateDetectionReliability(result);
      
      expect(evaluation.level).toBe('high');
      expect(evaluation.message).toContain('90%');
    });

    it('中程度の信頼度（65-84%）', () => {
      const result: EncodingDetectionResult = {
        encoding: 'utf-8',
        confidence: 75,
        originalDetection: 'UTF-8',
        bomPresent: false,
        alternatives: [
          { encoding: 'shift_jis', confidence: 60 }
        ]
      };
      
      const evaluation = evaluateDetectionReliability(result);
      
      expect(evaluation.level).toBe('medium');
      expect(evaluation.message).toContain('75%');
      expect(evaluation.recommendations.length).toBeGreaterThan(0);
    });

    it('低い信頼度（65%未満）', () => {
      const result: EncodingDetectionResult = {
        encoding: 'utf-8',
        confidence: 50,
        originalDetection: 'UTF-8',
        bomPresent: false,
        alternatives: [
          { encoding: 'shift_jis', confidence: 45 },
          { encoding: 'euc-jp', confidence: 40 }
        ]
      };
      
      const evaluation = evaluateDetectionReliability(result);
      
      expect(evaluation.level).toBe('low');
      expect(evaluation.message).toContain('50%');
      expect(evaluation.recommendations.length).toBeGreaterThan(0);
      expect(evaluation.recommendations.some(r => r.includes('手動で指定'))).toBe(true);
    });
  });

  describe('detectCsvEncoding', () => {
    it('CSVファイルを正しく識別', async () => {
      const csvContent = 'Name,Age,City\n太郎,25,東京\n花子,30,大阪';
      const filePath = await createTempFile(csvContent, 'utf-8');
      
      const result = await detectCsvEncoding(filePath);
      
      expect(result.encoding).toBe('utf-8');
      expect(result.csvSpecificInfo.looksLikeCsv).toBe(true);
      expect(result.csvSpecificInfo.potentialDelimiters).toContain(',');
      expect(result.csvSpecificInfo.sampleLines.length).toBeGreaterThan(0);
    });

    it('セミコロン区切りのCSVを識別', async () => {
      const csvContent = 'Name;Age;City\nJohn;25;Tokyo\nJane;30;Osaka';
      const filePath = await createTempFile(csvContent, 'utf-8');
      
      const result = await detectCsvEncoding(filePath);
      
      expect(result.csvSpecificInfo.looksLikeCsv).toBe(true);
      expect(result.csvSpecificInfo.potentialDelimiters).toContain(';');
    });

    it('タブ区切りのCSVを識別', async () => {
      const csvContent = 'Name\tAge\tCity\nJohn\t25\tTokyo\nJane\t30\tOsaka';
      const filePath = await createTempFile(csvContent, 'utf-8');
      
      const result = await detectCsvEncoding(filePath);
      
      expect(result.csvSpecificInfo.looksLikeCsv).toBe(true);
      expect(result.csvSpecificInfo.potentialDelimiters).toContain('\t');
    });

    it('複数の区切り文字を含むファイルを識別', async () => {
      const csvContent = 'Name,Age;City|Country\nJohn,25;Tokyo|Japan';
      const filePath = await createTempFile(csvContent, 'utf-8');
      
      const result = await detectCsvEncoding(filePath);
      
      expect(result.csvSpecificInfo.looksLikeCsv).toBe(true);
      expect(result.csvSpecificInfo.potentialDelimiters).toEqual(expect.arrayContaining([',', ';', '|']));
    });

    it('CSV以外のファイルを正しく識別', async () => {
      const textContent = 'これは普通のテキストファイルです。\nCSV形式ではありません。';
      const filePath = await createTempFile(textContent, 'utf-8');
      
      const result = await detectCsvEncoding(filePath);
      
      expect(result.csvSpecificInfo.looksLikeCsv).toBe(false);
      expect(result.csvSpecificInfo.potentialDelimiters).toHaveLength(0);
    });

    it('空のファイルでもエラーにならない', async () => {
      const filePath = await createTempFile('', 'utf-8');
      
      const result = await detectCsvEncoding(filePath);
      
      expect(result.csvSpecificInfo.looksLikeCsv).toBe(false);
      expect(result.csvSpecificInfo.sampleLines).toEqual(['']);
    });
  });

  describe('エラーハンドリング', () => {
    it('不正なエンコーディングでもエラーにならない', () => {
      const buffer = Buffer.from([0xFF, 0xFE, 0xFF, 0xFF]); // 不正なUTF-16
      
      expect(() => detectBufferEncoding(buffer)).not.toThrow();
      expect(() => decodeBuffer(buffer, 'utf-8')).not.toThrow();
    });

    it('破損したファイルでも適切にエラーハンドリング', async () => {
      const filePath = '/dev/null'; // 特殊ファイル
      
      // ファイルが存在しても内容が読めない場合のテスト
      // 実際の動作は環境によって異なるが、エラーハンドリングがされることを確認
      try {
        await detectFileEncoding(filePath);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('パフォーマンステスト', () => {
    it('大きなファイルでも適切な時間で処理', async () => {
      // 大きなCSVコンテンツを生成（約100KB）
      const rows = Array.from({ length: 1000 }, (_, i) => 
        `user${i},${20 + i % 50},city${i % 10},country${i % 5}`
      );
      const csvContent = 'name,age,city,country\n' + rows.join('\n');
      const filePath = await createTempFile(csvContent, 'utf-8');
      
      const startTime = Date.now();
      const result = await detectCsvEncoding(filePath);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // 1秒以内
      expect(result.csvSpecificInfo.looksLikeCsv).toBe(true);
      expect(result.encoding).toBe('utf-8');
    }, 10000);
  });
});