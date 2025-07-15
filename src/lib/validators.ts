/**
 * 共通バリデーション関数
 *
 * 各種入力値の検証を行う共通関数群
 */

import type { DNSRecordType } from '../types/index.js';

/**
 * ドメイン名の検証
 */
export function validateDomain(domain: string): void {
  if (!domain || typeof domain !== 'string') {
    throw new Error('ドメイン名が指定されていません');
  }

  // 基本的なドメイン名の正規表現
  const domainRegex =
    /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!domainRegex.test(domain)) {
    throw new Error(`無効なドメイン名: ${domain}`);
  }

  // 全体の長さチェック
  if (domain.length > 253) {
    throw new Error('ドメイン名が長すぎます（253文字以下）');
  }

  // 各ラベルの長さチェック
  const labels = domain.split('.');
  for (const label of labels) {
    if (label.length > 63) {
      throw new Error('各ラベルは63文字以下である必要があります');
    }
  }

  // 予約済みドメインのチェック（オプション）
  const reservedDomains = ['localhost', 'local'];
  if (reservedDomains.includes(domain.toLowerCase())) {
    throw new Error(`予約済みドメイン名は使用できません: ${domain}`);
  }
}

/**
 * IPアドレスの検証（IPv4）
 */
export function validateIPv4(ip: string): void {
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (!ipv4Regex.test(ip)) {
    throw new Error(`無効なIPv4アドレス: ${ip}`);
  }
}

/**
 * IPアドレスの検証（IPv6）
 */
export function validateIPv6(ip: string): void {
  const ipv6Regex =
    /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  if (!ipv6Regex.test(ip)) {
    throw new Error(`無効なIPv6アドレス: ${ip}`);
  }
}

/**
 * DNSレコードタイプの検証
 */
export function validateRecordType(type: string): DNSRecordType {
  const validTypes: DNSRecordType[] = [
    'A',
    'AAAA',
    'CNAME',
    'MX',
    'TXT',
    'NS',
    'SOA',
    'PTR',
    'SRV',
    'CAA',
    'NAPTR',
    'DS',
    'DNSKEY',
    'RRSIG',
    'NSEC',
    'NSEC3',
    'TLSA',
    'SSHFP',
    'SPF',
    'ANY',
  ];

  const upperType = type.toUpperCase() as DNSRecordType;
  if (!validTypes.includes(upperType)) {
    throw new Error(
      `無効なレコードタイプ: ${type}. 利用可能: ${validTypes.join(', ')}`
    );
  }

  return upperType;
}

/**
 * タイムアウト値の検証
 */
export function validateTimeout(
  value: string | number | undefined,
  defaultValue = 5000
): number {
  const timeout =
    typeof value === 'string' ? parseInt(value, 10) : value || defaultValue;

  if (isNaN(timeout) || timeout <= 0) {
    throw new Error('タイムアウトは正の数値である必要があります');
  }

  if (timeout > 60000) {
    throw new Error('タイムアウトは60秒（60000ms）以下である必要があります');
  }

  return timeout;
}

/**
 * ポート番号の検証
 */
export function validatePort(port: string | number): number {
  const portNumber = typeof port === 'string' ? parseInt(port, 10) : port;

  if (isNaN(portNumber) || portNumber <= 0 || portNumber > 65535) {
    throw new Error('ポート番号は1-65535の範囲で指定してください');
  }

  return portNumber;
}

/**
 * メールアドレスの検証
 */
export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error(`無効なメールアドレス: ${email}`);
  }
}

/**
 * URLの検証
 */
export function validateURL(url: string): void {
  try {
    new URL(url);
  } catch {
    throw new Error(`無効なURL: ${url}`);
  }
}

/**
 * ファイルパスの検証（安全性チェック）
 */
export function validateFilePath(path: string): void {
  // パストラバーサル攻撃の防止
  if (path.includes('..') || path.includes('~')) {
    throw new Error('無効なファイルパス: 相対パスや特殊文字は使用できません');
  }

  // 危険な文字のチェック
  const dangerousChars = ['<', '>', '|', '&', ';', '$', '`', '\n', '\r'];
  for (const char of dangerousChars) {
    if (path.includes(char)) {
      throw new Error(
        `無効なファイルパス: 危険な文字が含まれています: ${char}`
      );
    }
  }
}

/**
 * 数値範囲の検証
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  name: string
): void {
  if (value < min || value > max) {
    throw new Error(`${name}は${min}から${max}の範囲で指定してください`);
  }
}

/**
 * 配列が空でないことの検証
 */
export function validateNonEmptyArray<T>(array: T[], name: string): void {
  if (!Array.isArray(array) || array.length === 0) {
    throw new Error(`${name}が空です`);
  }
}

/**
 * 文字列が空でないことの検証
 */
export function validateNonEmptyString(value: string, name: string): void {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${name}が指定されていません`);
  }
}

/**
 * DNSサーバーアドレスの検証
 */
export function validateDNSServer(server: string): void {
  // IPアドレスまたはドメイン名として検証
  try {
    validateIPv4(server);
    return;
  } catch {
    // IPv4ではない
  }

  try {
    validateIPv6(server);
    return;
  } catch {
    // IPv6ではない
  }

  try {
    validateDomain(server);
    return;
  } catch {
    // ドメイン名でもない
  }

  throw new Error(`無効なDNSサーバーアドレス: ${server}`);
}

/**
 * 日付文字列の検証
 */
export function validateDateString(date: string): Date {
  const parsed = new Date(date);
  if (isNaN(parsed.getTime())) {
    throw new Error(`無効な日付形式: ${date}`);
  }
  return parsed;
}

/**
 * 正規表現パターンの検証
 */
export function validateRegexPattern(pattern: string): RegExp {
  try {
    return new RegExp(pattern);
  } catch (error) {
    throw new Error(`無効な正規表現パターン: ${pattern}`);
  }
}
