/**
 * エンコーディング検出ユーティリティのテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs/promises';
import * as chardet from 'chardet';

import { EncodingDetector } from '../../../src/utils/encoding-detector.js';

// モックの設定
vi.mock('fs/promises');
vi.mock('chardet');

describe('EncodingDetector', () => {
  let detector: EncodingDetector;

  beforeEach(() => {
    vi.clearAllMocks();
    detector = new EncodingDetector();
  });

  describe('detectFileEncoding', () => {
    it('UTF-8エンコーディングを正しく検出する', async () => {
      const mockContent = Buffer.from('これはテストです', 'utf8');
      vi.mocked(fs.readFile).mockResolvedValue(mockContent);
      vi.mocked(chardet.detect).mockReturnValue('UTF-8');

      const result = await detector.detectFileEncoding('test.txt');

      expect(result).toEqual({
        encoding: 'UTF-8',
        confidence: 100,
        language: null,
      });
      expect(fs.readFile).toHaveBeenCalledWith('test.txt');
    });

    it('Shift_JISエンコーディングを検出する', async () => {
      const mockContent = Buffer.from('テスト', 'utf8');
      vi.mocked(fs.readFile).mockResolvedValue(mockContent);
      vi.mocked(chardet.detect).mockReturnValue('Shift_JIS');

      const result = await detector.detectFileEncoding('test.txt');

      expect(result).toEqual({
        encoding: 'Shift_JIS',
        confidence: 100,
        language: null,
      });
    });

    it('エンコーディング検出に失敗した場合のエラーハンドリング', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

      await expect(detector.detectFileEncoding('nonexistent.txt'))
        .rejects.toThrow('File not found');
    });

    it('バッファからエンコーディングを検出する', async () => {
      const buffer = Buffer.from('Hello World', 'utf8');
      vi.mocked(chardet.detect).mockReturnValue('UTF-8');

      const result = await detector.detectFromBuffer(buffer);

      expect(result).toEqual({
        encoding: 'UTF-8',
        confidence: 100,
        language: null,
      });
      expect(chardet.detect).toHaveBeenCalledWith(buffer);
    });

    it('null結果の場合はASCIIとして扱う', async () => {
      const buffer = Buffer.from('ASCII text', 'utf8');
      vi.mocked(chardet.detect).mockReturnValue(null);

      const result = await detector.detectFromBuffer(buffer);

      expect(result).toEqual({
        encoding: 'ASCII',
        confidence: 100,
        language: null,
      });
    });
  });

  describe('convertEncoding', () => {
    it('UTF-8からShift_JISに変換する', async () => {
      const input = 'こんにちは';
      const buffer = Buffer.from(input, 'utf8');

      const result = await detector.convertEncoding(buffer, 'UTF-8', 'Shift_JIS');

      // 実際の変換は実装によるが、Bufferが返されることを確認
      expect(result).toBeInstanceOf(Buffer);
    });

    it('同じエンコーディングの場合は変換しない', async () => {
      const input = Buffer.from('Hello', 'utf8');
      
      const result = await detector.convertEncoding(input, 'UTF-8', 'UTF-8');

      expect(result).toBe(input);
    });
  });

  describe('detectCSVEncoding', () => {
    it('BOM付きUTF-8を検出する', async () => {
      const bomBuffer = Buffer.concat([
        Buffer.from([0xEF, 0xBB, 0xBF]), // UTF-8 BOM
        Buffer.from('name,age\nJohn,30', 'utf8')
      ]);
      vi.mocked(fs.readFile).mockResolvedValue(bomBuffer);

      const result = await detector.detectCSVEncoding('test.csv');

      expect(result.encoding).toBe('UTF-8');
      expect(result.hasBOM).toBe(true);
    });

    it('BOMなしCSVファイルを検出する', async () => {
      const buffer = Buffer.from('name,age\nJohn,30', 'utf8');
      vi.mocked(fs.readFile).mockResolvedValue(buffer);
      vi.mocked(chardet.detect).mockReturnValue('UTF-8');

      const result = await detector.detectCSVEncoding('test.csv');

      expect(result.encoding).toBe('UTF-8');
      expect(result.hasBOM).toBe(false);
    });
  });

  describe('isUTF8', () => {
    it('UTF-8エンコーディングを正しく判定する', () => {
      expect(detector.isUTF8('UTF-8')).toBe(true);
      expect(detector.isUTF8('utf-8')).toBe(true);
      expect(detector.isUTF8('UTF8')).toBe(true);
    });

    it('非UTF-8エンコーディングを正しく判定する', () => {
      expect(detector.isUTF8('Shift_JIS')).toBe(false);
      expect(detector.isUTF8('EUC-JP')).toBe(false);
      expect(detector.isUTF8('ISO-8859-1')).toBe(false);
    });
  });

  describe('サポートされているエンコーディング', () => {
    it('主要なエンコーディングがサポートされている', () => {
      const supported = detector.getSupportedEncodings();

      expect(supported).toContain('UTF-8');
      expect(supported).toContain('Shift_JIS');
      expect(supported).toContain('EUC-JP');
      expect(supported).toContain('ISO-8859-1');
      expect(supported).toContain('Windows-1252');
    });
  });

  describe('エンコーディング正規化', () => {
    it('エンコーディング名を正規化する', () => {
      expect(detector.normalizeEncoding('utf-8')).toBe('UTF-8');
      expect(detector.normalizeEncoding('UTF8')).toBe('UTF-8');
      expect(detector.normalizeEncoding('shift_jis')).toBe('Shift_JIS');
      expect(detector.normalizeEncoding('shift-jis')).toBe('Shift_JIS');
    });
  });
});