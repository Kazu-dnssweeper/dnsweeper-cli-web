import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import { detect as chardetDetect } from 'chardet';
import {
  detectBOM,
  detectBufferEncoding,
  detectFileEncoding,
  decodeBuffer,
  readFileWithDetectedEncoding,
  evaluateDetectionReliability,
  detectCsvEncoding,
  type EncodingDetectionResult,
  type SupportedEncoding,
} from '../../../src/utils/encoding-detector.js';

vi.mock('node:fs/promises');
vi.mock('chardet');

describe('encoding-detector', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('detectBOM', () => {
    it('should detect UTF-8 BOM correctly', () => {
      const buffer = Buffer.from([0xEF, 0xBB, 0xBF, 0x68, 0x65, 0x6C, 0x6C, 0x6F]);
      const result = detectBOM(buffer);
      expect(result).toEqual({
        encoding: 'utf-8',
        bomLength: 3
      });
    });

    it('should detect UTF-16LE BOM correctly', () => {
      const buffer = Buffer.from([0xFF, 0xFE, 0x68, 0x00]);
      const result = detectBOM(buffer);
      expect(result).toEqual({
        encoding: 'utf-16le',
        bomLength: 2
      });
    });

    it('should detect UTF-16BE BOM correctly', () => {
      const buffer = Buffer.from([0xFE, 0xFF, 0x00, 0x68]);
      const result = detectBOM(buffer);
      expect(result).toEqual({
        encoding: 'utf-16be',
        bomLength: 2
      });
    });

    it('should return null for no BOM', () => {
      const buffer = Buffer.from([0x68, 0x65, 0x6C, 0x6C, 0x6F]);
      const result = detectBOM(buffer);
      expect(result).toEqual({
        encoding: null,
        bomLength: 0
      });
    });

    it('should handle UTF-32 BOM (unsupported)', () => {
      const buffer = Buffer.from([0xFF, 0xFE, 0x00, 0x00, 0x68, 0x00, 0x00, 0x00]);
      const result = detectBOM(buffer);
      expect(result).toEqual({
        encoding: null,
        bomLength: 4
      });
    });

    it('should handle empty buffer', () => {
      const buffer = Buffer.from([]);
      const result = detectBOM(buffer);
      expect(result).toEqual({
        encoding: null,
        bomLength: 0
      });
    });
  });

  describe('detectBufferEncoding', () => {
    it('should prioritize BOM detection', () => {
      const buffer = Buffer.from([0xEF, 0xBB, 0xBF, 0x68, 0x65, 0x6C, 0x6C, 0x6F]);
      const result = detectBufferEncoding(buffer);
      
      expect(result).toEqual({
        encoding: 'utf-8',
        confidence: 100,
        originalDetection: null,
        bomPresent: true,
        alternatives: []
      });
    });

    it('should use chardet when no BOM is present', () => {
      const buffer = Buffer.from('hello world');
      const mockChardetResult = [
        { name: 'UTF-8', confidence: 90 },
        { name: 'ASCII', confidence: 85 }
      ];
      
      vi.mocked(chardetDetect).mockReturnValue(mockChardetResult);
      
      const result = detectBufferEncoding(buffer);
      
      expect(result.encoding).toBe('utf-8');
      expect(result.confidence).toBe(90);
      expect(result.originalDetection).toBe('UTF-8');
      expect(result.bomPresent).toBe(false);
      expect(result.alternatives).toEqual([
        { encoding: 'ascii', confidence: 85 }
      ]);
    });

    it('should handle single string detection result', () => {
      const buffer = Buffer.from('hello world');
      vi.mocked(chardetDetect).mockReturnValue('UTF-8');
      
      const result = detectBufferEncoding(buffer);
      
      expect(result.encoding).toBe('utf-8');
      expect(result.confidence).toBe(80);
      expect(result.originalDetection).toBe('UTF-8');
      expect(result.alternatives).toEqual([]);
    });

    it('should default to UTF-8 when chardet fails', () => {
      const buffer = Buffer.from('hello world');
      vi.mocked(chardetDetect).mockReturnValue(null);
      
      const result = detectBufferEncoding(buffer);
      
      expect(result.encoding).toBe('utf-8');
      expect(result.confidence).toBe(50);
      expect(result.originalDetection).toBe(null);
      expect(result.bomPresent).toBe(false);
      expect(result.alternatives).toEqual([]);
    });

    it('should handle unknown encoding names', () => {
      const buffer = Buffer.from('hello world');
      vi.mocked(chardetDetect).mockReturnValue([
        { name: 'UNKNOWN_ENCODING', confidence: 90 }
      ]);
      
      const result = detectBufferEncoding(buffer);
      
      expect(result.encoding).toBe('utf-8');
      expect(result.confidence).toBe(90);
      expect(result.originalDetection).toBe('UNKNOWN_ENCODING');
    });
  });

  describe('detectFileEncoding', () => {
    it('should detect file encoding successfully', async () => {
      const mockBuffer = Buffer.from([0xEF, 0xBB, 0xBF, 0x68, 0x65, 0x6C, 0x6C, 0x6F]);
      vi.mocked(readFile).mockResolvedValue(mockBuffer);
      
      const result = await detectFileEncoding('test.csv');
      
      expect(result.encoding).toBe('utf-8');
      expect(result.bomPresent).toBe(true);
      expect(result.confidence).toBe(100);
    });

    it('should throw error when file read fails', async () => {
      vi.mocked(readFile).mockRejectedValue(new Error('File not found'));
      
      await expect(detectFileEncoding('nonexistent.csv')).rejects.toThrow(
        'ファイルエンコーディング検出に失敗'
      );
    });
  });

  describe('decodeBuffer', () => {
    it('should decode UTF-8 buffer correctly', () => {
      const buffer = Buffer.from([0xEF, 0xBB, 0xBF, 0x68, 0x65, 0x6C, 0x6C, 0x6F]);
      const result = decodeBuffer(buffer, 'utf-8');
      
      expect(result).toBe('hello');
    });

    it('should decode buffer without BOM', () => {
      const buffer = Buffer.from('hello world', 'utf-8');
      const result = decodeBuffer(buffer, 'utf-8');
      
      expect(result).toBe('hello world');
    });

    it('should handle decode errors gracefully', () => {
      const buffer = Buffer.from([0xFF, 0xFF, 0xFF]);
      
      // Should not throw due to fatal: false
      const result = decodeBuffer(buffer, 'utf-8');
      expect(typeof result).toBe('string');
    });
  });

  describe('readFileWithDetectedEncoding', () => {
    it('should read file with detected encoding', async () => {
      const mockBuffer = Buffer.from('hello world', 'utf-8');
      vi.mocked(readFile).mockResolvedValue(mockBuffer);
      vi.mocked(chardetDetect).mockReturnValue('UTF-8');
      
      const result = await readFileWithDetectedEncoding('test.txt');
      
      expect(result.content).toBe('hello world');
      expect(result.detection.encoding).toBe('utf-8');
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
      expect(evaluation.recommendations).toEqual([]);
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
      expect(evaluation.message).toContain('高い信頼度');
      expect(evaluation.recommendations).toEqual([]);
    });

    it('should return medium reliability for medium confidence', () => {
      const result: EncodingDetectionResult = {
        encoding: 'utf-8',
        confidence: 70,
        originalDetection: 'UTF-8',
        bomPresent: false,
        alternatives: [
          { encoding: 'ascii', confidence: 65 }
        ]
      };
      
      const evaluation = evaluateDetectionReliability(result);
      
      expect(evaluation.level).toBe('medium');
      expect(evaluation.message).toContain('中程度の信頼度');
      expect(evaluation.recommendations).toEqual(['代替候補: ascii (65%)']);
    });

    it('should return low reliability for low confidence', () => {
      const result: EncodingDetectionResult = {
        encoding: 'utf-8',
        confidence: 40,
        originalDetection: 'UTF-8',
        bomPresent: false,
        alternatives: [
          { encoding: 'shift_jis', confidence: 35 }
        ]
      };
      
      const evaluation = evaluateDetectionReliability(result);
      
      expect(evaluation.level).toBe('low');
      expect(evaluation.message).toContain('低い信頼度');
      expect(evaluation.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('detectCsvEncoding', () => {
    it('should detect CSV encoding with CSV-specific information', async () => {
      const mockBuffer = Buffer.from('name,email\nJohn,john@example.com\nJane,jane@example.com');
      vi.mocked(readFile).mockResolvedValue(mockBuffer);
      vi.mocked(chardetDetect).mockReturnValue('UTF-8');
      
      const result = await detectCsvEncoding('test.csv');
      
      expect(result.encoding).toBe('utf-8');
      expect(result.csvSpecificInfo.looksLikeCsv).toBe(true);
      expect(result.csvSpecificInfo.potentialDelimiters).toContain(',');
      expect(result.csvSpecificInfo.sampleLines).toContain('name,email');
    });

    it('should handle non-CSV files', async () => {
      const mockBuffer = Buffer.from('This is not a CSV file');
      vi.mocked(readFile).mockResolvedValue(mockBuffer);
      vi.mocked(chardetDetect).mockReturnValue('UTF-8');
      
      const result = await detectCsvEncoding('test.txt');
      
      expect(result.csvSpecificInfo.looksLikeCsv).toBe(false);
      expect(result.csvSpecificInfo.potentialDelimiters).toEqual([]);
    });

    it('should detect multiple delimiters', async () => {
      const mockBuffer = Buffer.from('name;email\tphone|address\nJohn;john@example.com\t123|Main St');
      vi.mocked(readFile).mockResolvedValue(mockBuffer);
      vi.mocked(chardetDetect).mockReturnValue('UTF-8');
      
      const result = await detectCsvEncoding('test.csv');
      
      expect(result.csvSpecificInfo.potentialDelimiters).toEqual([';', '\t', '|']);
    });

    it('should handle decode errors gracefully', async () => {
      const mockBuffer = Buffer.from([0xFF, 0xFF, 0xFF]);
      vi.mocked(readFile).mockResolvedValue(mockBuffer);
      vi.mocked(chardetDetect).mockReturnValue('UTF-8');
      
      const result = await detectCsvEncoding('test.csv');
      
      expect(result.csvSpecificInfo.looksLikeCsv).toBe(false);
      expect(result.csvSpecificInfo.sampleLines).toEqual(['\ufffd\ufffd\ufffd']);
    });
  });
});