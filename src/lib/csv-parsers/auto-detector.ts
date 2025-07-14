/**
 * CSV自動検出機能
 * エンコーディングと区切り文字を自動検出
 */

import fs from 'fs';

import {
  detectCsvEncoding,
  readFileWithDetectedEncoding,
  evaluateDetectionReliability,
  type SupportedEncoding,
} from '../../utils/encoding-detector.js';

import type { IFileReadResult } from './types.js';

export class CSVAutoDetector {
  /**
   * エンコーディングと区切り文字を自動検出してファイルを読み込み
   */
  async readFileWithAutoDetection(
    filePath: string,
    options: {
      autoDetectEncoding?: boolean;
      autoDetectDelimiter?: boolean;
      encoding?: SupportedEncoding;
      delimiter?: string;
    } = {}
  ): Promise<IFileReadResult> {
    const {
      autoDetectEncoding = true,
      autoDetectDelimiter = true,
      encoding = 'utf-8',
      delimiter = ',',
    } = options;

    let fileContent: string;
    let encodingInfo: IFileReadResult['encodingInfo'];
    let delimiters: IFileReadResult['delimiters'];

    // エンコーディング自動検出
    if (autoDetectEncoding) {
      const detectionResult = await detectCsvEncoding(filePath);
      const fileResult = await readFileWithDetectedEncoding(filePath);
      fileContent = fileResult.content;

      encodingInfo = {
        detectedEncoding: detectionResult.encoding,
        confidence: detectionResult.confidence,
        reliability: evaluateDetectionReliability(detectionResult).level,
        bomPresent: detectionResult.bomPresent,
      };
    } else {
      fileContent = fs.readFileSync(filePath, { encoding: encoding as BufferEncoding });
    }

    // 区切り文字自動検出
    if (autoDetectDelimiter) {
      delimiters = this.detectDelimiters(fileContent);
    } else {
      delimiters = {
        detected: [delimiter],
        used: delimiter,
      };
    }

    return {
      fileContent,
      encodingInfo,
      delimiters,
    };
  }

  /**
   * CSV区切り文字を自動検出
   */
  private detectDelimiters(content: string): {
    detected: string[];
    used: string;
  } {
    const possibleDelimiters = [',', ';', '\t', '|'];
    const delimiterCounts: Record<string, number> = {};
    const lines = content.split('\n').slice(0, 5); // 最初の5行で判定

    // 各区切り文字の出現回数をカウント
    for (const delimiter of possibleDelimiters) {
      let totalCount = 0;
      let consistentCount = 0;
      let expectedCount = -1;

      for (const line of lines) {
        if (line.trim() === '') continue;

        const count = (line.match(new RegExp(`\\${delimiter}`, 'g')) || [])
          .length;

        if (expectedCount === -1) {
          expectedCount = count;
        }

        totalCount += count;
        if (count === expectedCount) {
          consistentCount++;
        }
      }

      // 一貫性のスコアを計算
      const consistency = consistentCount / lines.length;
      delimiterCounts[delimiter] = totalCount * consistency;
    }

    // 最も高いスコアの区切り文字を選択
    const detected = Object.entries(delimiterCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([delimiter]) => delimiter);

    return {
      detected,
      used: detected[0] || ',',
    };
  }

  /**
   * CSVフォーマットを自動判定
   */
  async detectFormat(
    filePath: string
  ): Promise<'cloudflare' | 'route53' | 'generic'> {
    const { fileContent } = await this.readFileWithAutoDetection(filePath);

    const firstLine = fileContent.split('\n')[0].toLowerCase();
    const headers = firstLine.split(',').map(h => h.trim());

    // Cloudflare形式の検出
    if (
      headers.includes('name') &&
      headers.includes('type') &&
      headers.includes('content')
    ) {
      return 'cloudflare';
    }

    // Route53形式の検出
    if (
      headers.includes('name') &&
      headers.includes('type') &&
      headers.includes('value')
    ) {
      return 'route53';
    }

    // 汎用形式の検出
    if (
      headers.includes('domain') &&
      headers.includes('record_type') &&
      headers.includes('value')
    ) {
      return 'generic';
    }

    // デフォルトは汎用形式
    return 'generic';
  }
}