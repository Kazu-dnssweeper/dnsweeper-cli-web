/**
 * タイムゾーン・日付形式ローカライザー
 *
 * グローバル対応のためのタイムゾーン・日付・時刻処理機能
 * - 地域別タイムゾーン自動検出
 * - 文化的な日付・時刻形式対応
 * - 業務時間・営業日管理
 * - 相対時間表示
 * - 多言語対応
 */

import { EventEmitter } from 'events';

import { I18nManager } from './i18n-manager.js';
import { Logger } from './logger.js';

export interface TimezoneInfo {
  timezone: string;
  offset: number;
  abbreviation: string;
  isDST: boolean;
  dstOffset?: number;
  region: string;
  country: string;
  city: string;
  utcOffset: string;
}

export interface LocaleDateTimeFormat {
  dateFormat: string;
  timeFormat: string;
  dateTimeFormat: string;
  shortDateFormat: string;
  longDateFormat: string;
  timeFormat12: string;
  timeFormat24: string;
  weekStartsOn: 0 | 1; // 0 = Sunday, 1 = Monday
  firstWeekContainsDate: 1 | 4; // 1 = Jan 1st, 4 = First Thursday
}

export interface BusinessHours {
  timezone: string;
  regularHours: {
    [day: string]: {
      open: string;
      close: string;
      isOpen: boolean;
    };
  };
  specialHours: {
    date: string;
    open?: string;
    close?: string;
    isOpen: boolean;
    reason?: string;
  }[];
  holidays: {
    date: string;
    name: string;
    isRecurring: boolean;
    region?: string;
  }[];
}

export interface RelativeTimeOptions {
  style: 'long' | 'short' | 'narrow';
  numeric: 'always' | 'auto';
  unit?: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
}

export interface DateTimeLocalizerOptions {
  defaultTimezone?: string;
  autoDetectTimezone?: boolean;
  enableDST?: boolean;
  defaultLocale?: string;
  fallbackLocale?: string;
  enableBusinessHours?: boolean;
  enableHolidays?: boolean;
  enableRelativeTime?: boolean;
  cacheSize?: number;
  updateInterval?: number;
}

/**
 * タイムゾーン・日付形式ローカライザー
 */
export class TimezoneLocalizer extends EventEmitter {
  private logger: Logger;
  private i18nManager: I18nManager;
  private options: DateTimeLocalizerOptions;
  private timezoneCache: Map<string, TimezoneInfo>;
  private formatCache: Map<string, LocaleDateTimeFormat>;
  private businessHoursCache: Map<string, BusinessHours>;
  private currentTimezone: string;
  private currentLocale: string;
  private updateInterval?: NodeJS.Timeout;

  constructor(
    logger?: Logger,
    i18nManager?: I18nManager,
    options: DateTimeLocalizerOptions = {}
  ) {
    super();
    this.logger = logger || new Logger({ logLevel: 'info' });
    this.i18nManager = i18nManager || new I18nManager();
    this.options = {
      defaultTimezone: 'UTC',
      autoDetectTimezone: true,
      enableDST: true,
      defaultLocale: 'en-US',
      fallbackLocale: 'en-US',
      enableBusinessHours: true,
      enableHolidays: true,
      enableRelativeTime: true,
      cacheSize: 100,
      updateInterval: 3600000, // 1時間
      ...options,
    };

    this.timezoneCache = new Map();
    this.formatCache = new Map();
    this.businessHoursCache = new Map();

    this.currentTimezone = this.options.defaultTimezone!;
    this.currentLocale = this.options.defaultLocale!;

    this.initializeTimezones();
    this.initializeDateFormats();
    this.initializeBusinessHours();

    if (this.options.autoDetectTimezone) {
      this.detectTimezone();
    }

    if (this.options.updateInterval) {
      this.startPeriodicUpdate();
    }
  }

  /**
   * タイムゾーン情報の初期化
   */
  private initializeTimezones(): void {
    const timezones: TimezoneInfo[] = [
      // 北アメリカ
      {
        timezone: 'America/New_York',
        offset: -5,
        abbreviation: 'EST',
        isDST: false,
        dstOffset: -4,
        region: 'North America',
        country: 'United States',
        city: 'New York',
        utcOffset: 'UTC-5',
      },
      {
        timezone: 'America/Chicago',
        offset: -6,
        abbreviation: 'CST',
        isDST: false,
        dstOffset: -5,
        region: 'North America',
        country: 'United States',
        city: 'Chicago',
        utcOffset: 'UTC-6',
      },
      {
        timezone: 'America/Denver',
        offset: -7,
        abbreviation: 'MST',
        isDST: false,
        dstOffset: -6,
        region: 'North America',
        country: 'United States',
        city: 'Denver',
        utcOffset: 'UTC-7',
      },
      {
        timezone: 'America/Los_Angeles',
        offset: -8,
        abbreviation: 'PST',
        isDST: false,
        dstOffset: -7,
        region: 'North America',
        country: 'United States',
        city: 'Los Angeles',
        utcOffset: 'UTC-8',
      },
      {
        timezone: 'America/Toronto',
        offset: -5,
        abbreviation: 'EST',
        isDST: false,
        dstOffset: -4,
        region: 'North America',
        country: 'Canada',
        city: 'Toronto',
        utcOffset: 'UTC-5',
      },

      // ヨーロッパ
      {
        timezone: 'Europe/London',
        offset: 0,
        abbreviation: 'GMT',
        isDST: false,
        dstOffset: 1,
        region: 'Europe',
        country: 'United Kingdom',
        city: 'London',
        utcOffset: 'UTC+0',
      },
      {
        timezone: 'Europe/Paris',
        offset: 1,
        abbreviation: 'CET',
        isDST: false,
        dstOffset: 2,
        region: 'Europe',
        country: 'France',
        city: 'Paris',
        utcOffset: 'UTC+1',
      },
      {
        timezone: 'Europe/Berlin',
        offset: 1,
        abbreviation: 'CET',
        isDST: false,
        dstOffset: 2,
        region: 'Europe',
        country: 'Germany',
        city: 'Berlin',
        utcOffset: 'UTC+1',
      },
      {
        timezone: 'Europe/Rome',
        offset: 1,
        abbreviation: 'CET',
        isDST: false,
        dstOffset: 2,
        region: 'Europe',
        country: 'Italy',
        city: 'Rome',
        utcOffset: 'UTC+1',
      },
      {
        timezone: 'Europe/Stockholm',
        offset: 1,
        abbreviation: 'CET',
        isDST: false,
        dstOffset: 2,
        region: 'Europe',
        country: 'Sweden',
        city: 'Stockholm',
        utcOffset: 'UTC+1',
      },

      // アジア太平洋
      {
        timezone: 'Asia/Tokyo',
        offset: 9,
        abbreviation: 'JST',
        isDST: false,
        region: 'Asia Pacific',
        country: 'Japan',
        city: 'Tokyo',
        utcOffset: 'UTC+9',
      },
      {
        timezone: 'Asia/Shanghai',
        offset: 8,
        abbreviation: 'CST',
        isDST: false,
        region: 'Asia Pacific',
        country: 'China',
        city: 'Shanghai',
        utcOffset: 'UTC+8',
      },
      {
        timezone: 'Asia/Hong_Kong',
        offset: 8,
        abbreviation: 'HKT',
        isDST: false,
        region: 'Asia Pacific',
        country: 'Hong Kong',
        city: 'Hong Kong',
        utcOffset: 'UTC+8',
      },
      {
        timezone: 'Asia/Singapore',
        offset: 8,
        abbreviation: 'SGT',
        isDST: false,
        region: 'Asia Pacific',
        country: 'Singapore',
        city: 'Singapore',
        utcOffset: 'UTC+8',
      },
      {
        timezone: 'Asia/Seoul',
        offset: 9,
        abbreviation: 'KST',
        isDST: false,
        region: 'Asia Pacific',
        country: 'South Korea',
        city: 'Seoul',
        utcOffset: 'UTC+9',
      },
      {
        timezone: 'Asia/Kolkata',
        offset: 5.5,
        abbreviation: 'IST',
        isDST: false,
        region: 'Asia Pacific',
        country: 'India',
        city: 'Kolkata',
        utcOffset: 'UTC+5:30',
      },
      {
        timezone: 'Asia/Bangkok',
        offset: 7,
        abbreviation: 'ICT',
        isDST: false,
        region: 'Asia Pacific',
        country: 'Thailand',
        city: 'Bangkok',
        utcOffset: 'UTC+7',
      },
      {
        timezone: 'Asia/Manila',
        offset: 8,
        abbreviation: 'PST',
        isDST: false,
        region: 'Asia Pacific',
        country: 'Philippines',
        city: 'Manila',
        utcOffset: 'UTC+8',
      },
      {
        timezone: 'Asia/Jakarta',
        offset: 7,
        abbreviation: 'WIB',
        isDST: false,
        region: 'Asia Pacific',
        country: 'Indonesia',
        city: 'Jakarta',
        utcOffset: 'UTC+7',
      },
      {
        timezone: 'Asia/Kuala_Lumpur',
        offset: 8,
        abbreviation: 'MYT',
        isDST: false,
        region: 'Asia Pacific',
        country: 'Malaysia',
        city: 'Kuala Lumpur',
        utcOffset: 'UTC+8',
      },
      {
        timezone: 'Australia/Sydney',
        offset: 10,
        abbreviation: 'AEST',
        isDST: false,
        dstOffset: 11,
        region: 'Asia Pacific',
        country: 'Australia',
        city: 'Sydney',
        utcOffset: 'UTC+10',
      },

      // 中東・アフリカ
      {
        timezone: 'Asia/Dubai',
        offset: 4,
        abbreviation: 'GST',
        isDST: false,
        region: 'Middle East',
        country: 'UAE',
        city: 'Dubai',
        utcOffset: 'UTC+4',
      },
      {
        timezone: 'Asia/Riyadh',
        offset: 3,
        abbreviation: 'AST',
        isDST: false,
        region: 'Middle East',
        country: 'Saudi Arabia',
        city: 'Riyadh',
        utcOffset: 'UTC+3',
      },
      {
        timezone: 'Asia/Jerusalem',
        offset: 2,
        abbreviation: 'IST',
        isDST: false,
        dstOffset: 3,
        region: 'Middle East',
        country: 'Israel',
        city: 'Jerusalem',
        utcOffset: 'UTC+2',
      },

      // 南米
      {
        timezone: 'America/Sao_Paulo',
        offset: -3,
        abbreviation: 'BRT',
        isDST: false,
        dstOffset: -2,
        region: 'South America',
        country: 'Brazil',
        city: 'São Paulo',
        utcOffset: 'UTC-3',
      },
      {
        timezone: 'America/Argentina/Buenos_Aires',
        offset: -3,
        abbreviation: 'ART',
        isDST: false,
        region: 'South America',
        country: 'Argentina',
        city: 'Buenos Aires',
        utcOffset: 'UTC-3',
      },
      {
        timezone: 'America/Mexico_City',
        offset: -6,
        abbreviation: 'CST',
        isDST: false,
        dstOffset: -5,
        region: 'North America',
        country: 'Mexico',
        city: 'Mexico City',
        utcOffset: 'UTC-6',
      },

      // グローバル
      {
        timezone: 'UTC',
        offset: 0,
        abbreviation: 'UTC',
        isDST: false,
        region: 'Global',
        country: 'Global',
        city: 'UTC',
        utcOffset: 'UTC+0',
      },
    ];

    timezones.forEach(timezone => {
      this.timezoneCache.set(timezone.timezone, timezone);
    });
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
        timeFormat12: 'a h:mm',
        timeFormat24: 'HH:mm',
        weekStartsOn: 0,
        firstWeekContainsDate: 1,
      },
      'zh-CN': {
        dateFormat: 'yyyy-MM-dd',
        timeFormat: 'HH:mm',
        dateTimeFormat: 'yyyy-MM-dd HH:mm',
        shortDateFormat: 'yy-MM-dd',
        longDateFormat: 'yyyy年MM月dd日',
        timeFormat12: 'a h:mm',
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
        weekStartsOn: 0,
        firstWeekContainsDate: 1,
      },
      'hi-IN': {
        dateFormat: 'dd/MM/yyyy',
        timeFormat: 'HH:mm',
        dateTimeFormat: 'dd/MM/yyyy HH:mm',
        shortDateFormat: 'dd/MM/yy',
        longDateFormat: 'dd MMMM yyyy',
        timeFormat12: 'h:mm a',
        timeFormat24: 'HH:mm',
        weekStartsOn: 0,
        firstWeekContainsDate: 1,
      },
    };

    Object.entries(formats).forEach(([locale, format]) => {
      this.formatCache.set(locale, format);
    });
  }

  /**
   * 業務時間の初期化
   */
  private initializeBusinessHours(): void {
    const businessHours: { [region: string]: BusinessHours } = {
      'America/New_York': {
        timezone: 'America/New_York',
        regularHours: {
          sunday: { open: '', close: '', isOpen: false },
          monday: { open: '09:00', close: '17:00', isOpen: true },
          tuesday: { open: '09:00', close: '17:00', isOpen: true },
          wednesday: { open: '09:00', close: '17:00', isOpen: true },
          thursday: { open: '09:00', close: '17:00', isOpen: true },
          friday: { open: '09:00', close: '17:00', isOpen: true },
          saturday: { open: '', close: '', isOpen: false },
        },
        specialHours: [],
        holidays: [
          {
            date: '2024-01-01',
            name: "New Year's Day",
            isRecurring: true,
            region: 'US',
          },
          {
            date: '2024-07-04',
            name: 'Independence Day',
            isRecurring: true,
            region: 'US',
          },
          {
            date: '2024-12-25',
            name: 'Christmas Day',
            isRecurring: true,
            region: 'US',
          },
        ],
      },
      'Europe/London': {
        timezone: 'Europe/London',
        regularHours: {
          sunday: { open: '', close: '', isOpen: false },
          monday: { open: '09:00', close: '17:00', isOpen: true },
          tuesday: { open: '09:00', close: '17:00', isOpen: true },
          wednesday: { open: '09:00', close: '17:00', isOpen: true },
          thursday: { open: '09:00', close: '17:00', isOpen: true },
          friday: { open: '09:00', close: '17:00', isOpen: true },
          saturday: { open: '', close: '', isOpen: false },
        },
        specialHours: [],
        holidays: [
          {
            date: '2024-01-01',
            name: "New Year's Day",
            isRecurring: true,
            region: 'UK',
          },
          {
            date: '2024-12-25',
            name: 'Christmas Day',
            isRecurring: true,
            region: 'UK',
          },
          {
            date: '2024-12-26',
            name: 'Boxing Day',
            isRecurring: true,
            region: 'UK',
          },
        ],
      },
      'Asia/Tokyo': {
        timezone: 'Asia/Tokyo',
        regularHours: {
          sunday: { open: '', close: '', isOpen: false },
          monday: { open: '09:00', close: '18:00', isOpen: true },
          tuesday: { open: '09:00', close: '18:00', isOpen: true },
          wednesday: { open: '09:00', close: '18:00', isOpen: true },
          thursday: { open: '09:00', close: '18:00', isOpen: true },
          friday: { open: '09:00', close: '18:00', isOpen: true },
          saturday: { open: '', close: '', isOpen: false },
        },
        specialHours: [],
        holidays: [
          { date: '2024-01-01', name: '元日', isRecurring: true, region: 'JP' },
          {
            date: '2024-12-29',
            name: '年末年始',
            isRecurring: true,
            region: 'JP',
          },
          {
            date: '2024-12-30',
            name: '年末年始',
            isRecurring: true,
            region: 'JP',
          },
          {
            date: '2024-12-31',
            name: '年末年始',
            isRecurring: true,
            region: 'JP',
          },
        ],
      },
    };

    Object.entries(businessHours).forEach(([timezone, hours]) => {
      this.businessHoursCache.set(timezone, hours);
    });
  }

  /**
   * タイムゾーンの自動検出
   */
  private detectTimezone(): void {
    try {
      // ブラウザ環境での検出
      if (typeof globalThis !== 'undefined' && globalThis.Intl) {
        const detectedTimezone =
          Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (this.timezoneCache.has(detectedTimezone)) {
          this.currentTimezone = detectedTimezone;
          this.logger.info(`タイムゾーン自動検出: ${detectedTimezone}`);
        }
      }

      // Node.js環境での検出
      if (typeof process !== 'undefined' && process.env.TZ) {
        const envTimezone = process.env.TZ;
        if (this.timezoneCache.has(envTimezone)) {
          this.currentTimezone = envTimezone;
          this.logger.info(`環境変数からタイムゾーン検出: ${envTimezone}`);
        }
      }
    } catch (error) {
      this.logger.error(
        'タイムゾーン検出エラー:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * 定期更新の開始
   */
  private startPeriodicUpdate(): void {
    this.updateInterval = setInterval(() => {
      this.updateTimezoneInfo();
    }, this.options.updateInterval);
  }

  /**
   * タイムゾーン情報の更新
   */
  private updateTimezoneInfo(): void {
    try {
      // DST状態の更新
      if (this.options.enableDST) {
        this.updateDSTStatus();
      }

      // キャッシュのクリーンアップ
      this.cleanupCache();

      this.emit('timezone-updated', {
        currentTimezone: this.currentTimezone,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(
        'タイムゾーン情報更新エラー:',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * DST状態の更新
   */
  private updateDSTStatus(): void {
    this.timezoneCache.forEach((timezoneInfo, timezone) => {
      if (timezoneInfo.dstOffset !== undefined) {
        const now = new Date();
        const isDST = this.isDSTActive(now, timezone);

        if (timezoneInfo.isDST !== isDST) {
          timezoneInfo.isDST = isDST;
          this.timezoneCache.set(timezone, timezoneInfo);

          this.emit('dst-changed', {
            timezone,
            isDST,
            timestamp: now,
          });
        }
      }
    });
  }

  /**
   * DST有効状態の判定
   */
  private isDSTActive(date: Date, timezone: string): boolean {
    try {
      const january = new Date(date.getFullYear(), 0, 1);
      const july = new Date(date.getFullYear(), 6, 1);

      const januaryOffset = this.getTimezoneOffset(january, timezone);
      const julyOffset = this.getTimezoneOffset(july, timezone);
      const currentOffset = this.getTimezoneOffset(date, timezone);

      return currentOffset !== Math.max(januaryOffset, julyOffset);
    } catch (error) {
      this.logger.error(
        'DST判定エラー:',
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }
  }

  /**
   * タイムゾーンオフセットの取得
   */
  private getTimezoneOffset(date: Date, timezone: string): number {
    try {
      const utcDate = new Date(
        date.toLocaleString('en-US', { timeZone: 'UTC' })
      );
      const localDate = new Date(
        date.toLocaleString('en-US', { timeZone: timezone })
      );
      return (utcDate.getTime() - localDate.getTime()) / (1000 * 60);
    } catch (error) {
      this.logger.error(
        'タイムゾーンオフセット取得エラー:',
        error instanceof Error ? error : new Error(String(error))
      );
      return 0;
    }
  }

  /**
   * キャッシュのクリーンアップ
   */
  private cleanupCache(): void {
    // 必要に応じてキャッシュサイズを制限
    if (this.formatCache.size > this.options.cacheSize!) {
      const entries = Array.from(this.formatCache.entries());
      entries
        .slice(0, entries.length - this.options.cacheSize!)
        .forEach(([key]) => {
          this.formatCache.delete(key);
        });
    }
  }

  // 公開メソッド

  /**
   * タイムゾーンの設定
   */
  setTimezone(timezone: string): void {
    if (!this.timezoneCache.has(timezone)) {
      throw new Error(`サポートされていないタイムゾーン: ${timezone}`);
    }

    const oldTimezone = this.currentTimezone;
    this.currentTimezone = timezone;

    this.logger.info(`タイムゾーン変更: ${oldTimezone} → ${timezone}`);
    this.emit('timezone-changed', { from: oldTimezone, to: timezone });
  }

  /**
   * ロケールの設定
   */
  setLocale(locale: string): void {
    if (!this.formatCache.has(locale)) {
      // フォールバック処理
      this.logger.warn(
        `未対応のロケール: ${locale}、フォールバック: ${this.options.fallbackLocale}`
      );
      locale = this.options.fallbackLocale!;
    }

    const oldLocale = this.currentLocale;
    this.currentLocale = locale;

    this.logger.info(`ロケール変更: ${oldLocale} → ${locale}`);
    this.emit('locale-changed', { from: oldLocale, to: locale });
  }

  /**
   * 日付のフォーマット
   */
  formatDate(
    date: Date,
    options: {
      timezone?: string;
      locale?: string;
      format?: 'short' | 'long' | 'custom';
      customFormat?: string;
    } = {}
  ): string {
    try {
      const timezone = options.timezone || this.currentTimezone;
      const locale = options.locale || this.currentLocale;
      const format =
        this.formatCache.get(locale) ||
        this.formatCache.get(this.options.fallbackLocale!)!;

      let _formatString: string;
      switch (options.format) {
        case 'short':
          _formatString = format.shortDateFormat;
          break;
        case 'long':
          _formatString = format.longDateFormat;
          break;
        case 'custom':
          // formatString = options.customFormat || format.dateFormat;
          break;
        default:
        // formatString = format.dateFormat;
      }

      // 実際の実装では、date-fns や moment.js などを使用
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
  formatTime(
    time: Date,
    options: {
      timezone?: string;
      locale?: string;
      format?: '12' | '24';
      showSeconds?: boolean;
    } = {}
  ): string {
    try {
      const timezone = options.timezone || this.currentTimezone;
      const locale = options.locale || this.currentLocale;
      // const format =
      //   this.formatCache.get(locale) ||
      //   this.formatCache.get(this.options.fallbackLocale!)!;

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
  formatDateTime(
    dateTime: Date,
    options: {
      timezone?: string;
      locale?: string;
      dateFormat?: 'short' | 'long' | 'custom';
      timeFormat?: '12' | '24';
      showSeconds?: boolean;
    } = {}
  ): string {
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
    options: RelativeTimeOptions = { style: 'long', numeric: 'auto' }
  ): string {
    try {
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (Math.abs(diffDays) >= 7) {
        return this.formatDate(date);
      }

      if (typeof Intl !== 'undefined' && Intl.RelativeTimeFormat) {
        const rtf = new Intl.RelativeTimeFormat(this.currentLocale, {
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
      if (Math.abs(diffDays) > 0) {
        return diffDays > 0
          ? `${diffDays} days ago`
          : `in ${Math.abs(diffDays)} days`;
      } else if (Math.abs(diffHours) > 0) {
        return diffHours > 0
          ? `${diffHours} hours ago`
          : `in ${Math.abs(diffHours)} hours`;
      } else if (Math.abs(diffMinutes) > 0) {
        return diffMinutes > 0
          ? `${diffMinutes} minutes ago`
          : `in ${Math.abs(diffMinutes)} minutes`;
      } else {
        return 'just now';
      }
    } catch (error) {
      this.logger.error(
        '相対時間フォーマットエラー:',
        error instanceof Error ? error : new Error(String(error))
      );
      return this.formatDateTime(date);
    }
  }

  /**
   * 業務時間の判定
   */
  isBusinessHours(date: Date = new Date(), timezone?: string): boolean {
    try {
      const tz = timezone || this.currentTimezone;
      const businessHours = this.businessHoursCache.get(tz);

      if (!businessHours) {
        this.logger.warn(`業務時間設定が見つかりません: ${tz}`);
        return false;
      }

      // 祝日チェック
      if (this.isHoliday(date, businessHours)) {
        return false;
      }

      // 曜日の取得
      const dayOfWeek = date
        .toLocaleDateString('en-US', {
          weekday: 'long',
          timeZone: tz,
        })
        .toLowerCase();

      const dayHours = businessHours.regularHours[dayOfWeek];
      if (!dayHours || !dayHours.isOpen) {
        return false;
      }

      // 時刻の判定
      const timeStr = date.toLocaleTimeString('en-US', {
        timeZone: tz,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
      });

      return timeStr >= dayHours.open && timeStr <= dayHours.close;
    } catch (error) {
      this.logger.error(
        '業務時間判定エラー:',
        error instanceof Error ? error : new Error(String(error))
      );
      return false;
    }
  }

  /**
   * 祝日の判定
   */
  private isHoliday(date: Date, businessHours: BusinessHours): boolean {
    const dateStr = date.toISOString().split('T')[0];
    return businessHours.holidays.some(holiday => holiday.date === dateStr);
  }

  /**
   * 次の営業日の取得
   */
  getNextBusinessDay(date: Date = new Date(), timezone?: string): Date {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    while (!this.isBusinessHours(nextDay, timezone)) {
      nextDay.setDate(nextDay.getDate() + 1);
    }

    return nextDay;
  }

  /**
   * タイムゾーン変換
   */
  convertTimezone(date: Date, fromTimezone: string, toTimezone: string): Date {
    try {
      // 元のタイムゾーンでの時刻文字列を取得
      const dateStr = date.toLocaleString('en-US', { timeZone: fromTimezone });

      // 対象タイムゾーンでのDateオブジェクトを作成
      const convertedDate = new Date(dateStr);

      // タイムゾーンオフセットを調整
      const fromOffset = this.getTimezoneOffset(date, fromTimezone);
      const toOffset = this.getTimezoneOffset(date, toTimezone);
      const offsetDiff = (toOffset - fromOffset) * 60 * 1000;

      return new Date(convertedDate.getTime() + offsetDiff);
    } catch (error) {
      this.logger.error(
        'タイムゾーン変換エラー:',
        error instanceof Error ? error : new Error(String(error))
      );
      return date;
    }
  }

  // ゲッターメソッド

  getCurrentTimezone(): string {
    return this.currentTimezone;
  }

  getCurrentLocale(): string {
    return this.currentLocale;
  }

  getTimezoneInfo(timezone?: string): TimezoneInfo | undefined {
    return this.timezoneCache.get(timezone || this.currentTimezone);
  }

  getAllTimezones(): TimezoneInfo[] {
    return Array.from(this.timezoneCache.values());
  }

  getDateTimeFormat(locale?: string): LocaleDateTimeFormat | undefined {
    return this.formatCache.get(locale || this.currentLocale);
  }

  getBusinessHours(timezone?: string): BusinessHours | undefined {
    return this.businessHoursCache.get(timezone || this.currentTimezone);
  }

  /**
   * 正常終了処理
   */
  async shutdown(): Promise<void> {
    try {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
      }

      // キャッシュのクリア
      this.timezoneCache.clear();
      this.formatCache.clear();
      this.businessHoursCache.clear();

      // イベントリスナーの削除
      this.removeAllListeners();

      this.logger.info('TimezoneLocalizer正常終了');
    } catch (error) {
      this.logger.error(
        'TimezoneLocalizer終了エラー:',
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }
}
