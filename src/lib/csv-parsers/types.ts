/**
 * CSV パーサー共通型定義
 */

import Papa from 'papaparse';

import type { DNSRecordType, ICSVRecord } from '../../types/index.js';
import type { SupportedEncoding } from '../../utils/encoding-detector.js';

export interface ICSVParseOptions {
  skipEmptyLines?: boolean;
  trimValues?: boolean;
  delimiter?: string;
  encoding?: SupportedEncoding;
  autoDetectEncoding?: boolean;
  autoDetectDelimiter?: boolean;
}

export interface ICSVParseResult {
  records: ICSVRecord[];
  errors: Papa.ParseError[];
  meta: Papa.ParseMeta;
  totalRows: number;
  validRows: number;
  encodingInfo?: {
    detectedEncoding: SupportedEncoding;
    confidence: number;
    reliability: 'high' | 'medium' | 'low';
    bomPresent: boolean;
  };
  delimiters?: {
    detected: string[];
    used: string;
  };
}

export interface ICloudflareCSVRow {
  name: string;
  type: string;
  content: string;
  ttl: string;
  priority?: string;
}

export interface IRoute53CSVRow {
  name: string;
  type: string;
  value: string;
  ttl: string;
  weight?: string;
  setidentifier?: string;
}

export interface IGenericCSVRow {
  domain: string;
  record_type: string;
  value: string;
  ttl: string;
  priority?: string;
  weight?: string;
  port?: string;
}

export interface IFileReadResult {
  fileContent: string;
  encodingInfo?: {
    detectedEncoding: SupportedEncoding;
    confidence: number;
    reliability: 'high' | 'medium' | 'low';
    bomPresent: boolean;
  };
  delimiters?: {
    detected: string[];
    used: string;
  };
}