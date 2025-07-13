import { describe, it, expect } from 'vitest';
import {
  normalizeIPv6,
  expandIPv6,
  compressIPv6,
  isValidIPv6,
  compareIPv6,
  isLinkLocalIPv6,
  isUniqueLocalIPv6,
  isMulticastIPv6,
  extractIPv6Prefix,
  getIPv6Scope,
} from '../ipv6.js';

describe('IPv6ユーティリティ', () => {
  describe('normalizeIPv6', () => {
    it('正規化されたアドレスを返す', () => {
      // ゼロ圧縮
      expect(normalizeIPv6('2001:0db8:0000:0000:0000:0000:0000:0001')).toBe('2001:db8::1');
      expect(normalizeIPv6('2001:db8:0:0:0:0:0:1')).toBe('2001:db8::1');
      expect(normalizeIPv6('2001:0DB8::1')).toBe('2001:db8::1');
      
      // 大文字を小文字に
      expect(normalizeIPv6('2001:DB8:CAFE:BABE::1')).toBe('2001:db8:cafe:babe::1');
      
      // すでに正規化されているアドレス
      expect(normalizeIPv6('2001:db8::1')).toBe('2001:db8::1');
      
      // ループバックアドレス
      expect(normalizeIPv6('0000:0000:0000:0000:0000:0000:0000:0001')).toBe('::1');
      expect(normalizeIPv6('::1')).toBe('::1');
      
      // 未指定アドレス
      expect(normalizeIPv6('0000:0000:0000:0000:0000:0000:0000:0000')).toBe('::');
      expect(normalizeIPv6('::')).toBe('::');
    });

    it('IPv4射影アドレスを正しく処理する', () => {
      expect(normalizeIPv6('::ffff:192.168.1.1')).toBe('::ffff:192.168.1.1');
      expect(normalizeIPv6('::FFFF:192.168.1.1')).toBe('::ffff:192.168.1.1');
    });

    it('無効なアドレスでエラーをスロー', () => {
      expect(() => normalizeIPv6('invalid')).toThrow('Invalid IPv6 address');
      expect(() => normalizeIPv6('2001:db8::1::2')).toThrow('Invalid IPv6 address');
      expect(() => normalizeIPv6('2001:db8:gggg::1')).toThrow('Invalid IPv6 address');
    });
  });

  describe('expandIPv6', () => {
    it('省略形を完全形式に展開', () => {
      expect(expandIPv6('2001:db8::1')).toBe('2001:0db8:0000:0000:0000:0000:0000:0001');
      expect(expandIPv6('::1')).toBe('0000:0000:0000:0000:0000:0000:0000:0001');
      expect(expandIPv6('::')).toBe('0000:0000:0000:0000:0000:0000:0000:0000');
      expect(expandIPv6('2001:db8::')).toBe('2001:0db8:0000:0000:0000:0000:0000:0000');
      expect(expandIPv6('::2001:db8')).toBe('0000:0000:0000:0000:0000:0000:2001:0db8');
    });

    it('すでに展開されているアドレスを処理', () => {
      expect(expandIPv6('2001:0db8:0000:0000:0000:0000:0000:0001')).toBe('2001:0db8:0000:0000:0000:0000:0000:0001');
    });
  });

  describe('compressIPv6', () => {
    it('最長のゼロ連続を圧縮', () => {
      expect(compressIPv6('2001:0db8:0000:0000:0000:0000:0000:0001')).toBe('2001:db8::1');
      expect(compressIPv6('0000:0000:0000:0000:0000:0000:0000:0001')).toBe('::1');
      expect(compressIPv6('2001:0000:0000:0db8:0000:0000:0000:0001')).toBe('2001::db8:0:0:0:1');
      expect(compressIPv6('fe80:0000:0000:0000:0000:0000:0000:0001')).toBe('fe80::1');
    });

    it('圧縮する必要がないアドレスを処理', () => {
      expect(compressIPv6('2001:0db8:cafe:babe:dead:beef:0000:0001')).toBe('2001:db8:cafe:babe:dead:beef:0:1');
    });

    it('同じ長さのゼロ連続がある場合、最初のものを圧縮', () => {
      expect(compressIPv6('2001:0000:0000:0db8:0000:0000:cafe:0001')).toBe('2001::db8:0:0:cafe:1');
    });
  });

  describe('isValidIPv6', () => {
    it('有効なIPv6アドレスを判定', () => {
      expect(isValidIPv6('2001:db8::1')).toBe(true);
      expect(isValidIPv6('::1')).toBe(true);
      expect(isValidIPv6('::')).toBe(true);
      expect(isValidIPv6('2001:db8:cafe:babe:dead:beef:0:1')).toBe(true);
      expect(isValidIPv6('fe80::1%eth0')).toBe(true);
      expect(isValidIPv6('::ffff:192.168.1.1')).toBe(true);
    });

    it('無効なIPv6アドレスを判定', () => {
      expect(isValidIPv6('invalid')).toBe(false);
      expect(isValidIPv6('2001:db8::1::2')).toBe(false);
      expect(isValidIPv6('2001:db8:gggg::1')).toBe(false);
      expect(isValidIPv6('2001:db8::1:2:3:4:5:6:7:8')).toBe(false);
      expect(isValidIPv6('192.168.1.1')).toBe(false);
    });
  });

  describe('compareIPv6', () => {
    it('同じアドレスの異なる表記を正しく比較', () => {
      expect(compareIPv6('2001:db8::1', '2001:0db8:0000:0000:0000:0000:0000:0001')).toBe(true);
      expect(compareIPv6('::1', '0000:0000:0000:0000:0000:0000:0000:0001')).toBe(true);
      expect(compareIPv6('2001:DB8::1', '2001:db8::1')).toBe(true);
    });

    it('異なるアドレスを正しく比較', () => {
      expect(compareIPv6('2001:db8::1', '2001:db8::2')).toBe(false);
      expect(compareIPv6('::1', '::2')).toBe(false);
    });

    it('無効なアドレスの比較', () => {
      expect(compareIPv6('invalid', '2001:db8::1')).toBe(false);
      expect(compareIPv6('2001:db8::1', 'invalid')).toBe(false);
    });
  });

  describe('isLinkLocalIPv6', () => {
    it('リンクローカルアドレスを判定', () => {
      expect(isLinkLocalIPv6('fe80::1')).toBe(true);
      expect(isLinkLocalIPv6('FE80::1')).toBe(true);
      expect(isLinkLocalIPv6('fe80:0000:0000:0000:0000:0000:0000:0001')).toBe(true);
    });

    it('リンクローカルでないアドレスを判定', () => {
      expect(isLinkLocalIPv6('2001:db8::1')).toBe(false);
      expect(isLinkLocalIPv6('::1')).toBe(false);
      expect(isLinkLocalIPv6('fc00::1')).toBe(false);
    });
  });

  describe('isUniqueLocalIPv6', () => {
    it('ユニークローカルアドレスを判定', () => {
      expect(isUniqueLocalIPv6('fc00::1')).toBe(true);
      expect(isUniqueLocalIPv6('fd00::1')).toBe(true);
      expect(isUniqueLocalIPv6('FC00::1')).toBe(true);
      expect(isUniqueLocalIPv6('FD00::1')).toBe(true);
    });

    it('ユニークローカルでないアドレスを判定', () => {
      expect(isUniqueLocalIPv6('2001:db8::1')).toBe(false);
      expect(isUniqueLocalIPv6('fe80::1')).toBe(false);
      expect(isUniqueLocalIPv6('::1')).toBe(false);
    });
  });

  describe('isMulticastIPv6', () => {
    it('マルチキャストアドレスを判定', () => {
      expect(isMulticastIPv6('ff02::1')).toBe(true);
      expect(isMulticastIPv6('FF02::1')).toBe(true);
      expect(isMulticastIPv6('ff01::1')).toBe(true);
      expect(isMulticastIPv6('ff05::1')).toBe(true);
    });

    it('マルチキャストでないアドレスを判定', () => {
      expect(isMulticastIPv6('2001:db8::1')).toBe(false);
      expect(isMulticastIPv6('fe80::1')).toBe(false);
      expect(isMulticastIPv6('::1')).toBe(false);
    });
  });

  describe('extractIPv6Prefix', () => {
    it('指定されたプレフィックス長でアドレスを切り取る', () => {
      expect(extractIPv6Prefix('2001:db8:cafe:babe::1', 64)).toBe('2001:db8:cafe:babe::');
      expect(extractIPv6Prefix('2001:db8:cafe:babe::1', 48)).toBe('2001:db8:cafe::');
      expect(extractIPv6Prefix('2001:db8:cafe:babe::1', 32)).toBe('2001:db8::');
      expect(extractIPv6Prefix('2001:db8:cafe:babe::1', 16)).toBe('2001::');
    });

    it('部分的なビットマスクを適用', () => {
      expect(extractIPv6Prefix('2001:db8:cafe:babe::1', 56)).toBe('2001:db8:cafe:ba00::');
      expect(extractIPv6Prefix('2001:db8:cafe:babe::1', 60)).toBe('2001:db8:cafe:bab0::');
    });

    it('無効なプレフィックス長でエラー', () => {
      expect(() => extractIPv6Prefix('2001:db8::1', -1)).toThrow('Invalid prefix length');
      expect(() => extractIPv6Prefix('2001:db8::1', 129)).toThrow('Invalid prefix length');
    });
  });

  describe('getIPv6Scope', () => {
    it('アドレスのスコープを正しく判定', () => {
      expect(getIPv6Scope('::1')).toBe('loopback');
      expect(getIPv6Scope('::')).toBe('unspecified');
      expect(getIPv6Scope('fe80::1')).toBe('link-local');
      expect(getIPv6Scope('fc00::1')).toBe('unique-local');
      expect(getIPv6Scope('fd00::1')).toBe('unique-local');
      expect(getIPv6Scope('ff02::1')).toBe('multicast');
      expect(getIPv6Scope('2001:db8::1')).toBe('global');
    });
  });
});