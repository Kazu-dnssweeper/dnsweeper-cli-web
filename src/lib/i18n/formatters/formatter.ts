/**
 * 国際化フォーマッター
 */

import type { LocalizationContext, NumberFormatOptions } from '../core/types.js';

export class I18nFormatter {
  private context: LocalizationContext;

  constructor(context: LocalizationContext) {
    this.context = context;
  }

  /**
   * 数値のフォーマット
   */
  formatNumber(
    value: number,
    options?: Partial<NumberFormatOptions>
  ): string {
    const opts = {
      ...this.context.numberFormat,
      ...options
    };

    // 整数部と小数部を分割
    const [integerPart, decimalPart] = value.toFixed(opts.precision).split('.');

    // 千の位区切り
    const formattedInteger = integerPart.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      opts.thousand
    );

    // 小数点の処理
    let result = formattedInteger;
    if (decimalPart && opts.precision > 0) {
      result += opts.decimal + decimalPart;
    }

    return result;
  }

  /**
   * 通貨のフォーマット
   */
  formatCurrency(
    value: number,
    currency?: string,
    display?: 'symbol' | 'code' | 'name'
  ): string {
    const currencyCode = currency || this.context.currency;
    const displayType = display || this.context.numberFormat.currencyDisplay;

    const formatted = this.formatNumber(value);
    const symbol = this.getCurrencySymbol(currencyCode);

    switch (displayType) {
      case 'symbol':
        return this.context.rtl ? `${formatted} ${symbol}` : `${symbol}${formatted}`;
      case 'code':
        return `${formatted} ${currencyCode}`;
      case 'name':
        return `${formatted} ${this.getCurrencyName(currencyCode)}`;
      default:
        return formatted;
    }
  }

  /**
   * 日付のフォーマット
   */
  formatDate(
    date: Date | string | number,
    format?: string
  ): string {
    const d = date instanceof Date ? date : new Date(date);
    const fmt = format || this.context.dateFormat;

    const replacements: Record<string, string> = {
      'YYYY': d.getFullYear().toString(),
      'YY': d.getFullYear().toString().slice(-2),
      'MM': (d.getMonth() + 1).toString().padStart(2, '0'),
      'M': (d.getMonth() + 1).toString(),
      'DD': d.getDate().toString().padStart(2, '0'),
      'D': d.getDate().toString()
    };

    let result = fmt;
    for (const [key, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(key, 'g'), value);
    }

    return result;
  }

  /**
   * 時刻のフォーマット
   */
  formatTime(
    date: Date | string | number,
    format?: string
  ): string {
    const d = date instanceof Date ? date : new Date(date);
    const fmt = format || this.context.timeFormat;

    const hours24 = d.getHours();
    const hours12 = hours24 % 12 || 12;
    const ampm = hours24 < 12 ? 'AM' : 'PM';

    const replacements: Record<string, string> = {
      'HH': hours24.toString().padStart(2, '0'),
      'H': hours24.toString(),
      'hh': hours12.toString().padStart(2, '0'),
      'h': hours12.toString(),
      'mm': d.getMinutes().toString().padStart(2, '0'),
      'm': d.getMinutes().toString(),
      'ss': d.getSeconds().toString().padStart(2, '0'),
      's': d.getSeconds().toString(),
      'A': ampm,
      'a': ampm.toLowerCase()
    };

    let result = fmt;
    for (const [key, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(key, 'g'), value);
    }

    return result;
  }

  /**
   * 日付時刻のフォーマット
   */
  formatDateTime(
    date: Date | string | number,
    dateFormat?: string,
    timeFormat?: string
  ): string {
    const formattedDate = this.formatDate(date, dateFormat);
    const formattedTime = this.formatTime(date, timeFormat);
    return `${formattedDate} ${formattedTime}`;
  }

  /**
   * 相対時間のフォーマット
   */
  formatRelativeTime(date: Date | string | number): string {
    const d = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    // 言語別のメッセージ（簡易版）
    const messages: Record<string, Record<string, string>> = {
      en: {
        justNow: 'just now',
        minutesAgo: '{n} minutes ago',
        hoursAgo: '{n} hours ago',
        daysAgo: '{n} days ago',
        future: 'in the future'
      },
      ja: {
        justNow: 'たった今',
        minutesAgo: '{n}分前',
        hoursAgo: '{n}時間前',
        daysAgo: '{n}日前',
        future: '未来'
      }
    };

    const msg = messages[this.context.language] || messages.en;

    if (diffMs < 0) {
      return msg.future;
    } else if (diffSeconds < 60) {
      return msg.justNow;
    } else if (diffMinutes < 60) {
      return msg.minutesAgo.replace('{n}', diffMinutes.toString());
    } else if (diffHours < 24) {
      return msg.hoursAgo.replace('{n}', diffHours.toString());
    } else {
      return msg.daysAgo.replace('{n}', diffDays.toString());
    }
  }

  /**
   * パーセンテージのフォーマット
   */
  formatPercentage(value: number, decimals: number = 0): string {
    const percentage = value * 100;
    const formatted = this.formatNumber(percentage, { precision: decimals });
    return `${formatted}%`;
  }

  /**
   * ファイルサイズのフォーマット
   */
  formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    const formatted = this.formatNumber(size, { precision: unitIndex > 0 ? 2 : 0 });
    return `${formatted} ${units[unitIndex]}`;
  }

  /**
   * 通貨シンボルの取得
   */
  private getCurrencySymbol(currency: string): string {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CNY: '¥',
      KRW: '₩',
      INR: '₹',
      RUB: '₽',
      BRL: 'R$',
      CAD: 'C$',
      AUD: 'A$',
      AED: 'د.إ'
    };
    return symbols[currency] || currency;
  }

  /**
   * 通貨名の取得
   */
  private getCurrencyName(currency: string): string {
    const names: Record<string, Record<string, string>> = {
      en: {
        USD: 'US Dollar',
        EUR: 'Euro',
        GBP: 'British Pound',
        JPY: 'Japanese Yen',
        CNY: 'Chinese Yuan'
      },
      ja: {
        USD: '米ドル',
        EUR: 'ユーロ',
        GBP: '英ポンド',
        JPY: '日本円',
        CNY: '中国元'
      }
    };
    
    const langNames = names[this.context.language] || names.en;
    return langNames[currency] || currency;
  }

  /**
   * コンテキストの更新
   */
  updateContext(context: Partial<LocalizationContext>): void {
    this.context = { ...this.context, ...context };
  }
}