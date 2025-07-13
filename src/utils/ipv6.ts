/**
 * IPv6アドレス正規化ユーティリティ
 */

/**
 * IPv6アドレスを正規化する
 * - ゼロ圧縮を適用
 * - 小文字に統一
 * - 不要な先頭ゼロを削除
 */
export function normalizeIPv6(address: string): string {
  // 基本的な検証
  if (!isValidIPv6(address)) {
    throw new Error(`Invalid IPv6 address: ${address}`);
  }

  // IPv4射影アドレスの処理
  const ipv4Match = address.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/i);
  if (ipv4Match) {
    return `::ffff:${ipv4Match[1]}`;
  }

  // 省略形を展開
  const expanded = expandIPv6(address);
  
  // 正規化（最長のゼロ連続を圧縮）
  const normalized = compressIPv6(expanded);
  
  return normalized.toLowerCase();
}

/**
 * IPv6アドレスを展開形式に変換
 */
export function expandIPv6(address: string): string {
  let addr = address.toLowerCase();
  
  // :: を処理
  if (addr.includes('::')) {
    const parts = addr.split('::');
    const left = parts[0] ? parts[0].split(':') : [];
    const right = parts[1] ? parts[1].split(':') : [];
    const missing = 8 - left.length - right.length;
    
    const middle = Array(missing).fill('0000');
    const allParts = [...left, ...middle, ...right];
    
    addr = allParts.join(':');
  }
  
  // 各セグメントを4桁に補完
  return addr
    .split(':')
    .map(part => part.padStart(4, '0'))
    .join(':');
}

/**
 * IPv6アドレスを圧縮形式に変換
 */
export function compressIPv6(address: string): string {
  const addr = address.toLowerCase();
  const parts = addr.split(':');
  
  // 各パートから先頭のゼロを削除
  const trimmed = parts.map(part => part.replace(/^0+/, '') || '0');
  
  // 最長のゼロ連続を見つける
  let maxZeroStart = -1;
  let maxZeroLength = 0;
  let currentZeroStart = -1;
  let currentZeroLength = 0;
  
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === '0') {
      if (currentZeroStart === -1) {
        currentZeroStart = i;
        currentZeroLength = 1;
      } else {
        currentZeroLength++;
      }
      
      if (currentZeroLength > maxZeroLength) {
        maxZeroStart = currentZeroStart;
        maxZeroLength = currentZeroLength;
      }
    } else {
      currentZeroStart = -1;
      currentZeroLength = 0;
    }
  }
  
  // 2つ以上の連続するゼロがある場合のみ圧縮
  if (maxZeroLength >= 2) {
    const before = trimmed.slice(0, maxZeroStart);
    const after = trimmed.slice(maxZeroStart + maxZeroLength);
    
    if (before.length === 0 && after.length === 0) {
      return '::';
    } else if (before.length === 0) {
      return '::' + after.join(':');
    } else if (after.length === 0) {
      return before.join(':') + '::';
    } else {
      return before.join(':') + '::' + after.join(':');
    }
  }
  
  return trimmed.join(':');
}

/**
 * IPv6アドレスの妥当性を検証
 */
export function isValidIPv6(address: string): boolean {
  // 基本的なパターンチェック
  const ipv6Pattern = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  
  if (!ipv6Pattern.test(address)) {
    return false;
  }
  
  // :: が複数回出現しないかチェック
  const doubleColonCount = (address.match(/::/g) || []).length;
  if (doubleColonCount > 1) {
    return false;
  }
  
  // 各セグメントが4桁以下かチェック
  const segments = address.split(/::?/);
  for (const segment of segments) {
    if (segment.length > 4) {
      return false;
    }
  }
  
  return true;
}

/**
 * 2つのIPv6アドレスが同じかどうかを比較
 */
export function compareIPv6(addr1: string, addr2: string): boolean {
  try {
    const normalized1 = normalizeIPv6(addr1);
    const normalized2 = normalizeIPv6(addr2);
    return normalized1 === normalized2;
  } catch {
    return false;
  }
}

/**
 * IPv6アドレスがリンクローカルアドレスかどうかを判定
 */
export function isLinkLocalIPv6(address: string): boolean {
  const expanded = expandIPv6(address);
  return expanded.startsWith('fe80:');
}

/**
 * IPv6アドレスがユニークローカルアドレスかどうかを判定
 */
export function isUniqueLocalIPv6(address: string): boolean {
  const expanded = expandIPv6(address);
  return expanded.startsWith('fc') || expanded.startsWith('fd');
}

/**
 * IPv6アドレスがマルチキャストアドレスかどうかを判定
 */
export function isMulticastIPv6(address: string): boolean {
  const expanded = expandIPv6(address);
  return expanded.startsWith('ff');
}

/**
 * IPv6アドレスからプレフィックスを抽出
 */
export function extractIPv6Prefix(address: string, prefixLength: number): string {
  if (prefixLength < 0 || prefixLength > 128) {
    throw new Error(`Invalid prefix length: ${prefixLength}`);
  }
  
  const expanded = expandIPv6(address);
  const parts = expanded.split(':');
  const bitsPerPart = 16;
  const fullParts = Math.floor(prefixLength / bitsPerPart);
  const remainingBits = prefixLength % bitsPerPart;
  
  const prefixParts: string[] = [];
  
  // 完全なパートをコピー
  for (let i = 0; i < fullParts; i++) {
    prefixParts.push(parts[i]);
  }
  
  // 部分的なパートを処理
  if (remainingBits > 0 && fullParts < 8) {
    const partValue = parseInt(parts[fullParts], 16);
    const mask = (0xffff << (16 - remainingBits)) & 0xffff;
    const maskedValue = partValue & mask;
    prefixParts.push(maskedValue.toString(16).padStart(4, '0'));
  }
  
  // 残りをゼロで埋める
  while (prefixParts.length < 8) {
    prefixParts.push('0000');
  }
  
  const prefixAddress = prefixParts.join(':');
  return compressIPv6(prefixAddress);
}

/**
 * IPv6アドレスのスコープを取得
 */
export function getIPv6Scope(address: string): 'global' | 'unique-local' | 'link-local' | 'multicast' | 'loopback' | 'unspecified' {
  const normalized = normalizeIPv6(address);
  
  if (normalized === '::1') {
    return 'loopback';
  }
  
  if (normalized === '::') {
    return 'unspecified';
  }
  
  if (isLinkLocalIPv6(address)) {
    return 'link-local';
  }
  
  if (isUniqueLocalIPv6(address)) {
    return 'unique-local';
  }
  
  if (isMulticastIPv6(address)) {
    return 'multicast';
  }
  
  return 'global';
}