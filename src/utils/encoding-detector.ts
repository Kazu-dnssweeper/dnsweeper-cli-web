/**
 * CSV文字エンコーディング自動検出ユーティリティ
 */

import { readFile } from 'node:fs/promises';
import { TextDecoder } from 'node:util';

import { detect as chardetDetect } from 'chardet';

import { DnsSweeperError } from '../lib/errors.js';

/**
 * サポートされているエンコーディング
 */
export type SupportedEncoding =
  | 'utf-8'
  | 'utf-16le'
  | 'utf-16be'
  | 'shift_jis'
  | 'euc-jp'
  | 'iso-2022-jp'
  | 'windows-1252'
  | 'ascii';

/**
 * エンコーディング検出結果
 */
export interface EncodingDetectionResult {
  encoding: SupportedEncoding;
  confidence: number;
  originalDetection: string | null;
  bomPresent: boolean;
  alternatives: Array<{
    encoding: SupportedEncoding;
    confidence: number;
  }>;
}

/**
 * バイト順マーク（BOM）の定義
 */
const BOM_PATTERNS = {
  'utf-8': new Uint8Array([0xef, 0xbb, 0xbf]),
  'utf-16le': new Uint8Array([0xff, 0xfe]),
  'utf-16be': new Uint8Array([0xfe, 0xff]),
  'utf-32le': new Uint8Array([0xff, 0xfe, 0x00, 0x00]),
  'utf-32be': new Uint8Array([0x00, 0x00, 0xfe, 0xff]),
} as const;

/**
 * chardetエンコーディング名を標準名にマッピング
 */
const ENCODING_MAPPING: Record<string, SupportedEncoding> = {
  'UTF-8': 'utf-8',
  UTF8: 'utf-8',
  'UTF-16LE': 'utf-16le',
  'UTF-16BE': 'utf-16be',
  'UTF-16': 'utf-16le', // デフォルトとしてLE
  Shift_JIS: 'shift_jis',
  SHIFT_JIS: 'shift_jis',
  'EUC-JP': 'euc-jp',
  'ISO-2022-JP': 'iso-2022-jp',
  'windows-1252': 'windows-1252',
  ASCII: 'ascii',
  'US-ASCII': 'ascii',
};

/**
 * BOMを検出
 */
export function detectBOM(buffer: Buffer): {
  encoding: SupportedEncoding | null;
  bomLength: number;
} {
  const uint8Array = new Uint8Array(buffer);

  // UTF-32 BOMを先にチェック（UTF-16と区別するため）
  if (uint8Array.length >= 4) {
    if (
      uint8Array
        .subarray(0, 4)
        .every((byte, i) => byte === BOM_PATTERNS['utf-32le'][i])
    ) {
      return { encoding: null, bomLength: 4 }; // UTF-32はサポートしない
    }
    if (
      uint8Array
        .subarray(0, 4)
        .every((byte, i) => byte === BOM_PATTERNS['utf-32be'][i])
    ) {
      return { encoding: null, bomLength: 4 }; // UTF-32はサポートしない
    }
  }

  // UTF-8 BOM
  if (
    uint8Array.length >= 3 &&
    uint8Array
      .subarray(0, 3)
      .every((byte, i) => byte === BOM_PATTERNS['utf-8'][i])
  ) {
    return { encoding: 'utf-8', bomLength: 3 };
  }

  // UTF-16 BOM
  if (uint8Array.length >= 2) {
    if (
      uint8Array
        .subarray(0, 2)
        .every((byte, i) => byte === BOM_PATTERNS['utf-16le'][i])
    ) {
      return { encoding: 'utf-16le', bomLength: 2 };
    }
    if (
      uint8Array
        .subarray(0, 2)
        .every((byte, i) => byte === BOM_PATTERNS['utf-16be'][i])
    ) {
      return { encoding: 'utf-16be', bomLength: 2 };
    }
  }

  return { encoding: null, bomLength: 0 };
}

/**
 * ファイルのエンコーディングを自動検出
 */
export async function detectFileEncoding(
  filePath: string
): Promise<EncodingDetectionResult> {
  try {
    // ファイルの最初の数KBを読み込み（大容量ファイル対応）
    const buffer = await readFile(filePath);
    const sampleSize = Math.min(buffer.length, 8192); // 8KB
    const sampleBuffer = buffer.subarray(0, sampleSize);

    return detectBufferEncoding(sampleBuffer);
  } catch (error) {
    throw new DnsSweeperError(
      `ファイルエンコーディング検出に失敗: ${filePath}`,
      'ENCODING_DETECTION_ERROR',
      {
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    );
  }
}

/**
 * バッファのエンコーディングを自動検出
 */
export function detectBufferEncoding(buffer: Buffer): EncodingDetectionResult {
  // BOM検出
  const bomResult = detectBOM(buffer);
  if (bomResult.encoding) {
    return {
      encoding: bomResult.encoding,
      confidence: 100,
      originalDetection: null,
      bomPresent: true,
      alternatives: [],
    };
  }

  // chardetによる検出
  const detected = chardetDetect(buffer);

  if (!detected) {
    // 検出できない場合はUTF-8をデフォルトとする
    return {
      encoding: 'utf-8',
      confidence: 50,
      originalDetection: null,
      bomPresent: false,
      alternatives: [],
    };
  }

  // 検出結果の配列処理
  const detections: Array<{ name: string; confidence: number }> = Array.isArray(
    detected
  )
    ? detected
    : [{ name: detected as string, confidence: 80 }];
  const primary = detections[0];

  if (!primary) {
    return {
      encoding: 'utf-8' as SupportedEncoding,
      confidence: 50,
      originalDetection: 'utf-8',
      bomPresent: bomResult.bomLength > 0,
      alternatives: [],
    };
  }

  // エンコーディング名のマッピング
  const mappedEncoding =
    ENCODING_MAPPING[primary.name.toUpperCase()] || 'utf-8';

  // 代替候補の処理
  const alternatives = Array.isArray(detections)
    ? detections
        .slice(1)
        .map((d: any) => ({
          encoding:
            ENCODING_MAPPING[d.name.toUpperCase()] ||
            ('utf-8' as SupportedEncoding),
          confidence: d.confidence || 0,
        }))
        .filter((alt: any) => alt.encoding !== mappedEncoding)
        .slice(0, 3) // 上位3つまで
    : [];

  return {
    encoding: mappedEncoding,
    confidence: primary.confidence || 80,
    originalDetection: primary.name,
    bomPresent: bomResult.bomLength > 0,
    alternatives,
  };
}

/**
 * 指定されたエンコーディングでバッファをデコード
 */
export function decodeBuffer(
  buffer: Buffer,
  encoding: SupportedEncoding
): string {
  try {
    // BOMを除去
    const bomResult = detectBOM(buffer);
    const actualBuffer =
      bomResult.bomLength > 0 ? buffer.subarray(bomResult.bomLength) : buffer;

    // TextDecoderでデコード
    const decoder = new TextDecoder(encoding, { fatal: false });
    return decoder.decode(actualBuffer);
  } catch (error) {
    throw new DnsSweeperError(
      `文字デコードに失敗: ${encoding}`,
      'DECODE_ERROR',
      {
        encoding,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    );
  }
}

/**
 * ファイルを適切なエンコーディングで読み込み
 */
export async function readFileWithDetectedEncoding(filePath: string): Promise<{
  content: string;
  detection: EncodingDetectionResult;
}> {
  const buffer = await readFile(filePath);
  const detection = detectBufferEncoding(buffer);
  const content = decodeBuffer(buffer, detection.encoding);

  return {
    content,
    detection,
  };
}

/**
 * エンコーディング検出結果の信頼性を評価
 */
export function evaluateDetectionReliability(result: EncodingDetectionResult): {
  level: 'high' | 'medium' | 'low';
  message: string;
  recommendations: string[];
} {
  const recommendations: string[] = [];

  if (result.bomPresent) {
    return {
      level: 'high',
      message: 'BOMが検出されたため、エンコーディングは確実です',
      recommendations: [],
    };
  }

  if (result.confidence >= 85) {
    return {
      level: 'high',
      message: `高い信頼度でエンコーディングを検出 (${result.confidence}%)`,
      recommendations: [],
    };
  }

  if (result.confidence >= 65) {
    if (result.alternatives.length > 0) {
      recommendations.push(
        `代替候補: ${result.alternatives.map(alt => `${alt.encoding} (${alt.confidence}%)`).join(', ')}`
      );
    }

    return {
      level: 'medium',
      message: `中程度の信頼度でエンコーディングを検出 (${result.confidence}%)`,
      recommendations,
    };
  }

  recommendations.push(
    'ファイルのエンコーディングを手動で指定することを検討してください'
  );
  recommendations.push(
    'ファイルの文字化けが発生する場合は、別のエンコーディングを試してください'
  );

  if (result.alternatives.length > 0) {
    recommendations.push(
      `試行候補: ${result.alternatives.map(alt => alt.encoding).join(', ')}`
    );
  }

  return {
    level: 'low',
    message: `低い信頼度でのエンコーディング検出 (${result.confidence}%)`,
    recommendations,
  };
}

/**
 * CSVファイル用の特別な検出ロジック
 */
export async function detectCsvEncoding(filePath: string): Promise<
  EncodingDetectionResult & {
    csvSpecificInfo: {
      looksLikeCsv: boolean;
      sampleLines: string[];
      potentialDelimiters: string[];
    };
  }
> {
  const buffer = await readFile(filePath);
  const detection = detectBufferEncoding(buffer);

  // CSVかどうかの判定用に最初の数行をデコード
  let sampleContent: string;
  try {
    sampleContent = decodeBuffer(
      buffer.subarray(0, Math.min(buffer.length, 2048)),
      detection.encoding
    );
  } catch {
    // デコードに失敗した場合はUTF-8で再試行
    try {
      sampleContent = decodeBuffer(
        buffer.subarray(0, Math.min(buffer.length, 2048)),
        'utf-8'
      );
    } catch {
      sampleContent = '';
    }
  }

  const lines = sampleContent.split(/\r?\n/).slice(0, 5);

  // CSV判定（簡易）
  const looksLikeCsv =
    lines.length > 0 &&
    lines.some(
      line => line.includes(',') || line.includes(';') || line.includes('\t')
    );

  // 潜在的な区切り文字を検出
  const delimiters = [',', ';', '\t', '|'];
  const potentialDelimiters = delimiters.filter(delimiter =>
    lines.some(line => line.includes(delimiter))
  );

  return {
    ...detection,
    csvSpecificInfo: {
      looksLikeCsv,
      sampleLines: lines,
      potentialDelimiters,
    },
  };
}
