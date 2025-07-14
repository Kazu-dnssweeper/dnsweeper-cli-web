/**
 * encoding-detector.ts のテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  detectBOM,
  detectBufferEncoding,
  detectFileEncoding,
  decodeBuffer,
  readFileWithDetectedEncoding,
  evaluateDetectionReliability,
  detectCsvEncoding,
  type SupportedEncoding,
  type EncodingDetectionResult
} from '../../../src/utils/encoding-detector.js';

// chardetをモック化
vi.mock('chardet', () => ({
  detect: vi.fn()
}));

describe('encoding-detector utility', () => {
  let tempDir: string;

  beforeEach(async () => {
    // テスト用の一時ディレクトリを作成
    tempDir = join(tmpdir(), 'encoding-detector-test', Date.now().toString());
    await mkdir(tempDir, { recursive: true });
  });

  describe('detectBOM', () => {
    it('should detect UTF-8 BOM', () => {
      const buffer = Buffer.from([0xef, 0xbb, 0xbf, 0x48, 0x65, 0x6c, 0x6c, 0x6f]); // UTF-8 BOM + "Hello"
      const result = detectBOM(buffer);
      
      expect(result.encoding).toBe('utf-8');
      expect(result.bomLength).toBe(3);
    });

    it('should detect UTF-16LE BOM', () => {
      const buffer = Buffer.from([0xff, 0xfe, 0x48, 0x00, 0x65, 0x00]); // UTF-16LE BOM + "He"
      const result = detectBOM(buffer);
      
      expect(result.encoding).toBe('utf-16le');
      expect(result.bomLength).toBe(2);
    });

    it('should detect UTF-16BE BOM', () => {
      const buffer = Buffer.from([0xfe, 0xff, 0x00, 0x48, 0x00, 0x65]); // UTF-16BE BOM + "He"
      const result = detectBOM(buffer);
      
      expect(result.encoding).toBe('utf-16be');
      expect(result.bomLength).toBe(2);
    });

    it('should not detect BOM in plain text', () => {
      const buffer = Buffer.from('Hello World', 'utf-8');
      const result = detectBOM(buffer);
      
      expect(result.encoding).toBe(null);
      expect(result.bomLength).toBe(0);
    });

    it('should handle empty buffer', () => {
      const buffer = Buffer.from([]);
      const result = detectBOM(buffer);
      
      expect(result.encoding).toBe(null);
      expect(result.bomLength).toBe(0);
    });

    it('should handle UTF-32 BOM (not supported)', () => {
      const buffer = Buffer.from([0xff, 0xfe, 0x00, 0x00, 0x48, 0x00, 0x00, 0x00]); // UTF-32LE BOM
      const result = detectBOM(buffer);
      
      expect(result.encoding).toBe(null);
      expect(result.bomLength).toBe(4);
    });
  });

  describe('detectBufferEncoding', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should detect encoding with BOM', () => {
      const buffer = Buffer.from([0xef, 0xbb, 0xbf, 0x48, 0x65, 0x6c, 0x6c, 0x6f]); // UTF-8 BOM + "Hello"
      
      const result = detectBufferEncoding(buffer);
      
      expect(result.encoding).toBe('utf-8');
      expect(result.confidence).toBe(100);
      expect(result.bomPresent).toBe(true);
      expect(result.alternatives).toEqual([]);
    });

    it('should use chardet when no BOM is present', async () => {
      const buffer = Buffer.from('Hello World', 'utf-8');
      
      const { detect } = await import('chardet');
      vi.mocked(detect).mockReturnValue([
        { name: 'UTF-8', confidence: 95 },
        { name: 'ASCII', confidence: 85 }
      ]);

      const result = detectBufferEncoding(buffer);
      
      expect(result.encoding).toBe('utf-8');
      expect(result.confidence).toBe(95);
      expect(result.bomPresent).toBe(false);
      expect(result.alternatives).toHaveLength(1);
      expect(result.alternatives[0].encoding).toBe('ascii');
      expect(result.alternatives[0].confidence).toBe(85);
    });

    it('should handle string detection result', async () => {
      const buffer = Buffer.from('Hello World', 'utf-8');
      
      const { detect } = await import('chardet');
      vi.mocked(detect).mockReturnValue('UTF-8');

      const result = detectBufferEncoding(buffer);
      
      expect(result.encoding).toBe('utf-8');
      expect(result.confidence).toBe(80);
      expect(result.bomPresent).toBe(false);
    });

    it('should default to utf-8 when detection fails', () => {
      const buffer = Buffer.from('Hello World', 'utf-8');
      
      vi.mocked(detect).mockReturnValue(null);

      const result = detectBufferEncoding(buffer);
      
      expect(result.encoding).toBe('utf-8');
      expect(result.confidence).toBe(50);
      expect(result.bomPresent).toBe(false);
    });

    it('should map chardet encoding names correctly', () => {
      const buffer = Buffer.from('Hello World', 'utf-8');
      
      vi.mocked(detect).mockReturnValue([
        { name: 'Shift_JIS', confidence: 90 }
      ]);

      const result = detectBufferEncoding(buffer);
      
      expect(result.encoding).toBe('shift_jis');
      expect(result.confidence).toBe(90);
    });

    it('should handle unknown encoding names', () => {
      const buffer = Buffer.from('Hello World', 'utf-8');
      
      vi.mocked(detect).mockReturnValue([
        { name: 'UNKNOWN_ENCODING', confidence: 90 }
      ]);

      const result = detectBufferEncoding(buffer);
      
      expect(result.encoding).toBe('utf-8');
      expect(result.confidence).toBe(90);
    });

    it('should limit alternatives to top 3', () => {
      const buffer = Buffer.from('Hello World', 'utf-8');
      
      vi.mocked(detect).mockReturnValue([
        { name: 'UTF-8', confidence: 95 },
        { name: 'ASCII', confidence: 85 },
        { name: 'windows-1252', confidence: 75 },
        { name: 'Shift_JIS', confidence: 65 },
        { name: 'EUC-JP', confidence: 55 }
      ]);

      const result = detectBufferEncoding(buffer);
      
      expect(result.alternatives).toHaveLength(3);
      expect(result.alternatives[0].encoding).toBe('ascii');
      expect(result.alternatives[1].encoding).toBe('windows-1252');
      expect(result.alternatives[2].encoding).toBe('shift_jis');
    });
  });

  describe('detectFileEncoding', () => {
    it('should detect encoding from file', async () => {
      const testFile = join(tempDir, 'test.txt');
      const content = 'Hello World';
      
      await writeFile(testFile, content, 'utf-8');

      const { detect } = await import('chardet');
      vi.mocked(detect).mockReturnValue([
        { name: 'UTF-8', confidence: 95 }
      ]);

      const result = await detectFileEncoding(testFile);
      
      expect(result.encoding).toBe('utf-8');
      expect(result.confidence).toBe(95);
    });

    it('should handle file read errors', async () => {
      const nonExistentFile = join(tempDir, 'nonexistent.txt');
      
      await expect(detectFileEncoding(nonExistentFile)).rejects.toThrow();
    });

    it('should handle large files by sampling', async () => {
      const testFile = join(tempDir, 'large.txt');
      const largeContent = 'Hello World '.repeat(1000); // 12KB content
      
      await writeFile(testFile, largeContent, 'utf-8');

      const { detect } = await import('chardet');
      vi.mocked(detect).mockReturnValue([
        { name: 'UTF-8', confidence: 95 }
      ]);

      const result = await detectFileEncoding(testFile);
      
      expect(result.encoding).toBe('utf-8');
      expect(vi.mocked(detect)).toHaveBeenCalledWith(expect.any(Buffer));
      
      // Check that only 8KB was passed to chardet
      const passedBuffer = vi.mocked(detect).mock.calls[0][0] as Buffer;
      expect(passedBuffer.length).toBe(8192);
    });
  });

  describe('decodeBuffer', () => {
    it('should decode UTF-8 buffer', () => {
      const buffer = Buffer.from('Hello World', 'utf-8');
      const result = decodeBuffer(buffer, 'utf-8');
      
      expect(result).toBe('Hello World');
    });

    it('should decode UTF-8 buffer with BOM', () => {
      const buffer = Buffer.from([0xef, 0xbb, 0xbf, 0x48, 0x65, 0x6c, 0x6c, 0x6f]); // UTF-8 BOM + "Hello"
      const result = decodeBuffer(buffer, 'utf-8');
      
      expect(result).toBe('Hello');
    });

    it('should decode UTF-16LE buffer', () => {
      const buffer = Buffer.from('Hello', 'utf16le');
      const result = decodeBuffer(buffer, 'utf-16le');
      
      expect(result).toBe('Hello');
    });

    it('should handle decoding errors gracefully', () => {
      const buffer = Buffer.from([0xff, 0xfe, 0xff, 0xff]); // Invalid UTF-16
      
      // Should not throw due to { fatal: false }
      const result = decodeBuffer(buffer, 'utf-16le');
      
      expect(typeof result).toBe('string');
    });
  });

  describe('readFileWithDetectedEncoding', () => {
    it('should read file with detected encoding', async () => {
      const testFile = join(tempDir, 'test.txt');
      const content = 'Hello World';
      
      await writeFile(testFile, content, 'utf-8');

      const { detect } = await import('chardet');
      vi.mocked(detect).mockReturnValue([
        { name: 'UTF-8', confidence: 95 }
      ]);

      const result = await readFileWithDetectedEncoding(testFile);
      
      expect(result.content).toBe('Hello World');
      expect(result.detection.encoding).toBe('utf-8');
      expect(result.detection.confidence).toBe(95);
    });

    it('should handle files with BOM', async () => {
      const testFile = join(tempDir, 'test-bom.txt');
      const buffer = Buffer.from([0xef, 0xbb, 0xbf, 0x48, 0x65, 0x6c, 0x6c, 0x6f]); // UTF-8 BOM + "Hello"
      
      await writeFile(testFile, buffer);

      const result = await readFileWithDetectedEncoding(testFile);
      
      expect(result.content).toBe('Hello');
      expect(result.detection.encoding).toBe('utf-8');
      expect(result.detection.bomPresent).toBe(true);
    });
  });

  describe('evaluateDetectionReliability', () => {
    it('should return high reliability for BOM detection', () => {
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
      expect(evaluation.recommendations).toHaveLength(0);
    });

    it('should return high reliability for high confidence', () => {
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
      expect(evaluation.recommendations).toHaveLength(0);
    });

    it('should return medium reliability for medium confidence', () => {
      const result: EncodingDetectionResult = {
        encoding: 'utf-8',
        confidence: 70,
        originalDetection: 'UTF-8',
        bomPresent: false,
        alternatives: [
          { encoding: 'ascii', confidence: 60 }
        ]
      };

      const evaluation = evaluateDetectionReliability(result);
      
      expect(evaluation.level).toBe('medium');
      expect(evaluation.message).toContain('70%');
      expect(evaluation.recommendations).toHaveLength(1);
      expect(evaluation.recommendations[0]).toContain('代替候補');
    });

    it('should return low reliability for low confidence', () => {
      const result: EncodingDetectionResult = {
        encoding: 'utf-8',
        confidence: 40,
        originalDetection: 'UTF-8',
        bomPresent: false,
        alternatives: [
          { encoding: 'ascii', confidence: 35 },
          { encoding: 'shift_jis', confidence: 30 }
        ]
      };

      const evaluation = evaluateDetectionReliability(result);
      
      expect(evaluation.level).toBe('low');
      expect(evaluation.message).toContain('40%');
      expect(evaluation.recommendations.length).toBeGreaterThan(0);
      expect(evaluation.recommendations.some(r => r.includes('手動で指定'))).toBe(true);
    });
  });

  describe('detectCsvEncoding', () => {
    it('should detect CSV encoding and CSV-specific info', async () => {
      const testFile = join(tempDir, 'test.csv');
      const csvContent = 'name,age,city\nJohn,25,Tokyo\nJane,30,Osaka';
      
      await writeFile(testFile, csvContent, 'utf-8');

      const { detect } = await import('chardet');
      vi.mocked(detect).mockReturnValue([
        { name: 'UTF-8', confidence: 95 }
      ]);

      const result = await detectCsvEncoding(testFile);
      
      expect(result.encoding).toBe('utf-8');
      expect(result.confidence).toBe(95);
      expect(result.csvSpecificInfo.looksLikeCsv).toBe(true);
      expect(result.csvSpecificInfo.sampleLines).toHaveLength(3);
      expect(result.csvSpecificInfo.potentialDelimiters).toContain(',');
    });

    it('should detect different delimiters', async () => {
      const testFile = join(tempDir, 'test.tsv');
      const tsvContent = 'name\tage\tcity\nJohn\t25\tTokyo\nJane\t30\tOsaka';
      
      await writeFile(testFile, tsvContent, 'utf-8');

      const { detect } = await import('chardet');
      vi.mocked(detect).mockReturnValue([
        { name: 'UTF-8', confidence: 95 }
      ]);

      const result = await detectCsvEncoding(testFile);
      
      expect(result.csvSpecificInfo.looksLikeCsv).toBe(true);
      expect(result.csvSpecificInfo.potentialDelimiters).toContain('\t');
    });

    it('should handle non-CSV files', async () => {
      const testFile = join(tempDir, 'test.txt');
      const textContent = 'This is just plain text without any delimiters';
      
      await writeFile(testFile, textContent, 'utf-8');

      const { detect } = await import('chardet');
      vi.mocked(detect).mockReturnValue([
        { name: 'UTF-8', confidence: 95 }
      ]);

      const result = await detectCsvEncoding(testFile);
      
      expect(result.csvSpecificInfo.looksLikeCsv).toBe(false);
      expect(result.csvSpecificInfo.potentialDelimiters).toHaveLength(0);
    });

    it('should handle decode errors gracefully', async () => {
      const testFile = join(tempDir, 'test.csv');
      const buffer = Buffer.from([0xff, 0xfe, 0xff, 0xff]); // Invalid UTF-16
      
      await writeFile(testFile, buffer);

      const { detect } = await import('chardet');
      vi.mocked(detect).mockReturnValue([
        { name: 'UTF-16LE', confidence: 80 }
      ]);

      const result = await detectCsvEncoding(testFile);
      
      expect(result.csvSpecificInfo.looksLikeCsv).toBe(false);
      expect(result.csvSpecificInfo.sampleLines).toEqual(['']);
    });
  });
});