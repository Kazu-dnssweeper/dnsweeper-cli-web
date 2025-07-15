/**
 * 日付・時刻フォーマットシステム
 *
 * 多言語対応の日付・時刻フォーマット、相対時間表示機能
 */

import { EventEmitter } from 'events';

import { Logger } from './logger.js';

import type {
  LocaleDateTimeFormat,
  RelativeTimeOptions,
  DateFormatOptions,
  TimeFormatOptions,
  DateTimeFormatOptions,
} from './timezone-types.js';

export class DateFormatter extends EventEmitter {
  private logger: Logger;
  private formatCache: Map<string, LocaleDateTimeFormat>;
  private fallbackLocale: string;

  constructor(logger?: Logger, fallbackLocale: string = 'en-US') {
    super();
    this.logger = logger || new Logger({ logLevel: 'info' });
    this.formatCache = new Map();
    this.fallbackLocale = fallbackLocale;
    this.initializeDateFormats();
  }

  /**
   * 日付形式の初期化
   */
  private initializeDateFormats(): void {
    const formats: { [locale: string]: LocaleDateTimeFormat } = {
      'en-US': {
        dateFormat: 'MM/dd/yyyy',
        timeFormat: 'h:mm a',
        dateTimeFormat: 'MM/dd/yyyy h:mm a',
        shortDateFormat: 'MM/dd/yy',
        longDateFormat: 'MMMM dd, yyyy',
        timeFormat12: 'h:mm a',
        timeFormat24: 'HH:mm',
        weekStartsOn: 0,
        firstWeekContainsDate: 1,
      },
      'en-GB': {
        dateFormat: 'dd/MM/yyyy',
        timeFormat: 'HH:mm',
        dateTimeFormat: 'dd/MM/yyyy HH:mm',
        shortDateFormat: 'dd/MM/yy',
        longDateFormat: 'dd MMMM yyyy',
        timeFormat12: 'h:mm a',
        timeFormat24: 'HH:mm',
        weekStartsOn: 1,
        firstWeekContainsDate: 4,
      },
      'ja-JP': {
        dateFormat: 'yyyy/MM/dd',
        timeFormat: 'HH:mm',
        dateTimeFormat: 'yyyy/MM/dd HH:mm',
        shortDateFormat: 'yy/MM/dd',
        longDateFormat: 'yyyy年MM月dd日',
        timeFormat12: 'h:mm a',
        timeFormat24: 'HH:mm',
        weekStartsOn: 0,
        firstWeekContainsDate: 1,
      },
      'de-DE': {
        dateFormat: 'dd.MM.yyyy',
        timeFormat: 'HH:mm',
        dateTimeFormat: 'dd.MM.yyyy HH:mm',
        shortDateFormat: 'dd.MM.yy',
        longDateFormat: 'dd. MMMM yyyy',
        timeFormat12: 'h:mm a',
        timeFormat24: 'HH:mm',
        weekStartsOn: 1,
        firstWeekContainsDate: 4,
      },
      'fr-FR': {
        dateFormat: 'dd/MM/yyyy',
        timeFormat: 'HH:mm',
        dateTimeFormat: 'dd/MM/yyyy HH:mm',
        shortDateFormat: 'dd/MM/yy',
        longDateFormat: 'dd MMMM yyyy',
        timeFormat12: 'h:mm a',
        timeFormat24: 'HH:mm',
        weekStartsOn: 1,
        firstWeekContainsDate: 4,
      },
      'es-ES': {
        dateFormat: 'dd/MM/yyyy',
        timeFormat: 'HH:mm',
        dateTimeFormat: 'dd/MM/yyyy HH:mm',
        shortDateFormat: 'dd/MM/yy',
        longDateFormat: 'dd de MMMM de yyyy',
        timeFormat12: 'h:mm a',
        timeFormat24: 'HH:mm',
        weekStartsOn: 1,
        firstWeekContainsDate: 4,
      },
      'it-IT': {
        dateFormat: 'dd/MM/yyyy',
        timeFormat: 'HH:mm',
        dateTimeFormat: 'dd/MM/yyyy HH:mm',
        shortDateFormat: 'dd/MM/yy',
        longDateFormat: 'dd MMMM yyyy',
        timeFormat12: 'h:mm a',
        timeFormat24: 'HH:mm',
        weekStartsOn: 1,
        firstWeekContainsDate: 4,
      },
      'pt-BR': {
        dateFormat: 'dd/MM/yyyy',
        timeFormat: 'HH:mm',
        dateTimeFormat: 'dd/MM/yyyy HH:mm',
        shortDateFormat: 'dd/MM/yy',
        longDateFormat: 'dd de MMMM de yyyy',
        timeFormat12: 'h:mm a',
        timeFormat24: 'HH:mm',
        weekStartsOn: 0,
        firstWeekContainsDate: 1,
      },
      'ru-RU': {
        dateFormat: 'dd.MM.yyyy',
        timeFormat: 'HH:mm',
        dateTimeFormat: 'dd.MM.yyyy HH:mm',
        shortDateFormat: 'dd.MM.yy',
        longDateFormat: 'dd MMMM yyyy г.',
        timeFormat12: 'h:mm a',
        timeFormat24: 'HH:mm',
        weekStartsOn: 1,
        firstWeekContainsDate: 4,
      },
      'ko-KR': {
        dateFormat: 'yyyy. MM. dd.',
        timeFormat: 'HH:mm',
        dateTimeFormat: 'yyyy. MM. dd. HH:mm',
        shortDateFormat: 'yy. MM. dd.',
        longDateFormat: 'yyyy년 MM월 dd일',
        timeFormat12: 'h:mm a',
        timeFormat24: 'HH:mm',
        weekStartsOn: 0,
        firstWeekContainsDate: 1,
      },
      'zh-CN': {
        dateFormat: 'yyyy/MM/dd',
        timeFormat: 'HH:mm',
        dateTimeFormat: 'yyyy/MM/dd HH:mm',
        shortDateFormat: 'yy/MM/dd',
        longDateFormat: 'yyyy年MM月dd日',
        timeFormat12: 'h:mm a',
        timeFormat24: 'HH:mm',
        weekStartsOn: 1,
        firstWeekContainsDate: 4,
      },
      'ar-SA': {
        dateFormat: 'dd/MM/yyyy',
        timeFormat: 'HH:mm',
        dateTimeFormat: 'dd/MM/yyyy HH:mm',
        shortDateFormat: 'dd/MM/yy',
        longDateFormat: 'dd MMMM yyyy',
        timeFormat12: 'h:mm a',
        timeFormat24: 'HH:mm',
        weekStartsOn: 1, // Monday (adjusted to match type constraint)
        firstWeekContainsDate: 1,
      },
    };

    Object.entries(formats).forEach(([locale, format]) => {
      this.formatCache.set(locale, format);
    });

    this.logger.info('日付形式初期化完了', {
      locales: Object.keys(formats).length,
    });
  }

  /**
   * 日付のフォーマット
   */
  formatDate(date: Date, options: DateFormatOptions = {}): string {
    try {
      const timezone = options.timezone || 'UTC';
      const locale = options.locale || this.fallbackLocale;
      const format =
        this.formatCache.get(locale) ||
        this.formatCache.get(this.fallbackLocale)!;

      let formatString: string;
      switch (options.format) {
        case 'short':
          formatString = format.shortDateFormat;
          break;
        case 'long':
          formatString = format.longDateFormat;
          break;
        case 'custom':
          formatString = options.customFormat || format.dateFormat;
          break;
        default:
          formatString = format.dateFormat;
      }

      // 実際の実装では、date-fns や moment.js などを使用
      // ここではネイティブAPIを使用した簡易実装
      return date.toLocaleDateString(locale, {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch (error) {
      this.logger.error(
        '日付フォーマットエラー:',
        error instanceof Error ? error : new Error(String(error))
      );
      return date.toLocaleDateString();
    }
  }

  /**
   * 時刻のフォーマット
   */
  formatTime(time: Date, options: TimeFormatOptions = {}): string {
    try {
      const timezone = options.timezone || 'UTC';
      const locale = options.locale || this.fallbackLocale;
      const hour12 = options.format === '12';

      return time.toLocaleTimeString(locale, {
        timeZone: timezone,
        hour12,
        hour: '2-digit',
        minute: '2-digit',
        second: options.showSeconds ? '2-digit' : undefined,
      });
    } catch (error) {
      this.logger.error(
        '時刻フォーマットエラー:',
        error instanceof Error ? error : new Error(String(error))
      );
      return time.toLocaleTimeString();
    }
  }

  /**
   * 日時のフォーマット
   */
  formatDateTime(dateTime: Date, options: DateTimeFormatOptions = {}): string {
    try {
      const dateStr = this.formatDate(dateTime, {
        timezone: options.timezone,
        locale: options.locale,
        format: options.dateFormat,
      });

      const timeStr = this.formatTime(dateTime, {
        timezone: options.timezone,
        locale: options.locale,
        format: options.timeFormat,
        showSeconds: options.showSeconds,
      });

      return `${dateStr} ${timeStr}`;
    } catch (error) {
      this.logger.error(
        '日時フォーマットエラー:',
        error instanceof Error ? error : new Error(String(error))
      );
      return dateTime.toLocaleString();
    }
  }

  /**
   * 相対時間の表示
   */
  formatRelativeTime(
    date: Date,
    options: RelativeTimeOptions = { style: 'long', numeric: 'auto' },
    currentLocale: string = this.fallbackLocale
  ): string {
    try {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      // 7日以上前/後は絶対日付表示
      if (Math.abs(diffDays) >= 7) {
        return this.formatDate(date, { locale: currentLocale });
      }

      // Intl.RelativeTimeFormatを使用（サポート環境）
      if (typeof Intl !== 'undefined' && Intl.RelativeTimeFormat) {
        const rtf = new Intl.RelativeTimeFormat(currentLocale, {
          numeric: options.numeric || 'auto',
          style: options.style || 'long',
        });

        if (Math.abs(diffDays) > 0) {
          return rtf.format(-diffDays, 'day');
        } else if (Math.abs(diffHours) > 0) {
          return rtf.format(-diffHours, 'hour');
        } else if (Math.abs(diffMinutes) > 0) {
          return rtf.format(-diffMinutes, 'minute');
        } else {
          return rtf.format(-diffSeconds, 'second');
        }
      }

      // フォールバック実装
      return this.formatRelativeTimeFallback(
        diffDays,
        diffHours,
        diffMinutes,
        diffSeconds,
        currentLocale
      );
    } catch (error) {
      this.logger.error(
        '相対時間フォーマットエラー:',
        error instanceof Error ? error : new Error(String(error))
      );
      return this.formatDateTime(date, { locale: currentLocale });
    }
  }

  /**
   * 相対時間のフォールバック実装
   */
  private formatRelativeTimeFallback(
    diffDays: number,
    diffHours: number,
    diffMinutes: number,
    diffSeconds: number,
    locale: string
  ): string {
    // 簡易的な多言語対応
    const translations: Record<string, Record<string, string>> = {
      'en-US': {
        just_now: 'just now',
        minutes_ago: 'minutes ago',
        hours_ago: 'hours ago',
        days_ago: 'days ago',
        in_minutes: 'in minutes',
        in_hours: 'in hours',
        in_days: 'in days',
      },
      'ja-JP': {
        just_now: '今',
        minutes_ago: '分前',
        hours_ago: '時間前',
        days_ago: '日前',
        in_minutes: '分後',
        in_hours: '時間後',
        in_days: '日後',
      },
      'de-DE': {
        just_now: 'gerade eben',
        minutes_ago: 'Minuten her',
        hours_ago: 'Stunden her',
        days_ago: 'Tage her',
        in_minutes: 'in Minuten',
        in_hours: 'in Stunden',
        in_days: 'in Tagen',
      },
    };

    const t = translations[locale] || translations['en-US'];

    if (Math.abs(diffDays) > 0) {
      return diffDays > 0
        ? `${diffDays} ${t.days_ago}`
        : `${t.in_days} ${Math.abs(diffDays)}`;
    } else if (Math.abs(diffHours) > 0) {
      return diffHours > 0
        ? `${diffHours} ${t.hours_ago}`
        : `${t.in_hours} ${Math.abs(diffHours)}`;
    } else if (Math.abs(diffMinutes) > 0) {
      return diffMinutes > 0
        ? `${diffMinutes} ${t.minutes_ago}`
        : `${t.in_minutes} ${Math.abs(diffMinutes)}`;
    } else {
      return t.just_now;
    }
  }

  /**
   * カスタム日付フォーマット（基本実装）
   */
  formatCustomDate(
    date: Date,
    pattern: string,
    locale: string = this.fallbackLocale
  ): string {
    try {
      // 基本的なパターンマッチング（実際の実装では date-fns などを使用）
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const hour = date.getHours();
      const minute = date.getMinutes();
      const second = date.getSeconds();

      return pattern
        .replace(/yyyy/g, year.toString())
        .replace(/yy/g, year.toString().slice(-2))
        .replace(/MM/g, month.toString().padStart(2, '0'))
        .replace(/M/g, month.toString())
        .replace(/dd/g, day.toString().padStart(2, '0'))
        .replace(/d/g, day.toString())
        .replace(/HH/g, hour.toString().padStart(2, '0'))
        .replace(/mm/g, minute.toString().padStart(2, '0'))
        .replace(/ss/g, second.toString().padStart(2, '0'));
    } catch (error) {
      this.logger.error(
        'カスタム日付フォーマットエラー:',
        error instanceof Error ? error : new Error(String(error))
      );
      return date.toLocaleDateString(locale);
    }
  }

  /**
   * 週の開始日取得
   */
  getWeekStartDay(locale: string): 0 | 1 {
    const format = this.formatCache.get(locale);
    return format?.weekStartsOn || 0;
  }

  /**
   * 月名取得
   */
  getMonthNames(locale: string): string[] {
    try {
      const months: string[] = [];
      for (let i = 0; i < 12; i++) {
        const date = new Date(2024, i, 1);
        months.push(date.toLocaleDateString(locale, { month: 'long' }));
      }
      return months;
    } catch (error) {
      this.logger.error(
        '月名取得エラー:',
        error instanceof Error ? error : new Error(String(error))
      );
      return [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
    }
  }

  /**
   * 曜日名取得
   */
  getDayNames(locale: string): string[] {
    try {
      const days: string[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(2024, 0, i + 1); // 2024年1月1日から開始
        days.push(date.toLocaleDateString(locale, { weekday: 'long' }));
      }
      return days;
    } catch (error) {
      this.logger.error(
        '曜日名取得エラー:',
        error instanceof Error ? error : new Error(String(error))
      );
      return [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ];
    }
  }

  /**
   * APIメソッド
   */
  getDateTimeFormat(locale: string): LocaleDateTimeFormat | undefined {
    return this.formatCache.get(locale);
  }

  getAllSupportedLocales(): string[] {
    return Array.from(this.formatCache.keys());
  }

  hasLocale(locale: string): boolean {
    return this.formatCache.has(locale);
  }

  addCustomFormat(locale: string, format: LocaleDateTimeFormat): void {
    this.formatCache.set(locale, format);
    this.emit('format-added', { locale, format });
  }
}
