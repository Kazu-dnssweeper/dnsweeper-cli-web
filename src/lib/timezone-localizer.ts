/**
 * タイムゾーン・日付形式ローカライザー - メインクラス
 *
 * 分離された機能モジュールを統合する軽量なマネージャークラス
 */

import { EventEmitter } from 'events';

import { BusinessHoursManager } from './business-hours.js';
import { DateFormatter } from './date-formatter.js';
import { I18nManager } from './i18n-manager.js';
import { Logger } from './logger.js';
import { TimezoneDetector } from './timezone-detector.js';

import type {
  DateTimeLocalizerOptions,
  TimezoneInfo,
  LocaleDateTimeFormat,
  BusinessHours,
  RelativeTimeOptions,
  DateFormatOptions,
  TimeFormatOptions,
  DateTimeFormatOptions,
} from './timezone-types.js';

/**
 * タイムゾーン・日付形式ローカライザー
 */
export class TimezoneLocalizer extends EventEmitter {
  private logger: Logger;
  private i18nManager: I18nManager;
  private options: Required<DateTimeLocalizerOptions>;
  private currentTimezone: string;
  private currentLocale: string;
  private updateInterval?: NodeJS.Timeout;

  // 機能モジュール
  private timezoneDetector: TimezoneDetector;
  private dateFormatter: DateFormatter;
  private businessHoursManager: BusinessHoursManager;

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
    } as Required<DateTimeLocalizerOptions>;

    this.currentTimezone = this.options.defaultTimezone;
    this.currentLocale = this.options.defaultLocale;

    // 機能モジュールの初期化
    this.timezoneDetector = new TimezoneDetector(this.logger);
    this.dateFormatter = new DateFormatter(
      this.logger,
      this.options.fallbackLocale
    );
    this.businessHoursManager = new BusinessHoursManager(this.logger);

    // イベント転送の設定
    this.setupEventForwarding();

    // 自動検出の実行
    if (this.options.autoDetectTimezone) {
      this.detectTimezone();
    }

    // 定期更新の開始
    if (this.options.updateInterval) {
      this.startPeriodicUpdate();
    }

    this.logger.info('TimezoneLocalizer初期化完了', {
      timezone: this.currentTimezone,
      locale: this.currentLocale,
      options: this.options,
    });
  }

  /**
   * イベント転送の設定
   */
  private setupEventForwarding(): void {
    // タイムゾーン検出器のイベント転送
    this.timezoneDetector.on('timezone-detected', data => {
      this.emit('timezone-detected', data);
    });

    this.timezoneDetector.on('dst-status-updated', data => {
      this.emit('dst-status-updated', data);
    });

    // 日付フォーマッターのイベント転送
    this.dateFormatter.on('format-added', data => {
      this.emit('format-added', data);
    });

    // 業務時間管理のイベント転送
    this.businessHoursManager.on('business-hours-updated', data => {
      this.emit('business-hours-updated', data);
    });

    this.businessHoursManager.on('holiday-added', data => {
      this.emit('holiday-added', data);
    });
  }

  /**
   * タイムゾーンの自動検出
   */
  private detectTimezone(): void {
    const detectedTimezone = this.timezoneDetector.detectTimezone();
    if (detectedTimezone) {
      this.currentTimezone = detectedTimezone;
      this.emit('timezone-changed', {
        from: this.options.defaultTimezone,
        to: detectedTimezone,
      });
    }
  }

  /**
   * 定期更新の開始
   */
  private startPeriodicUpdate(): void {
    this.updateInterval = setInterval(() => {
      this.updateTimezoneInfo();
    }, this.options.updateInterval);

    this.logger.info('定期更新開始', {
      interval: this.options.updateInterval,
    });
  }

  /**
   * タイムゾーン情報の更新
   */
  private updateTimezoneInfo(): void {
    try {
      // DST状態の更新
      if (this.options.enableDST) {
        this.timezoneDetector.updateDSTStatus();
      }

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

  // 公開API - タイムゾーン管理

  /**
   * タイムゾーンの設定
   */
  setTimezone(timezone: string): void {
    if (!this.timezoneDetector.hasTimezone(timezone)) {
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
    if (!this.dateFormatter.hasLocale(locale)) {
      // フォールバック処理
      this.logger.warn(
        `未対応のロケール: ${locale}、フォールバック: ${this.options.fallbackLocale}`
      );
      locale = this.options.fallbackLocale;
    }

    const oldLocale = this.currentLocale;
    this.currentLocale = locale;

    this.logger.info(`ロケール変更: ${oldLocale} → ${locale}`);
    this.emit('locale-changed', { from: oldLocale, to: locale });
  }

  // 公開API - フォーマット機能

  /**
   * 日付のフォーマット
   */
  formatDate(date: Date, options: DateFormatOptions = {}): string {
    return this.dateFormatter.formatDate(date, {
      timezone: options.timezone || this.currentTimezone,
      locale: options.locale || this.currentLocale,
      ...options,
    });
  }

  /**
   * 時刻のフォーマット
   */
  formatTime(time: Date, options: TimeFormatOptions = {}): string {
    return this.dateFormatter.formatTime(time, {
      timezone: options.timezone || this.currentTimezone,
      locale: options.locale || this.currentLocale,
      ...options,
    });
  }

  /**
   * 日時のフォーマット
   */
  formatDateTime(dateTime: Date, options: DateTimeFormatOptions = {}): string {
    return this.dateFormatter.formatDateTime(dateTime, {
      timezone: options.timezone || this.currentTimezone,
      locale: options.locale || this.currentLocale,
      ...options,
    });
  }

  /**
   * 相対時間の表示
   */
  formatRelativeTime(
    date: Date,
    options: RelativeTimeOptions = { style: 'long', numeric: 'auto' }
  ): string {
    return this.dateFormatter.formatRelativeTime(
      date,
      options,
      this.currentLocale
    );
  }

  // 公開API - 業務時間管理

  /**
   * 業務時間の判定
   */
  isBusinessHours(date: Date = new Date(), timezone?: string): boolean {
    if (!this.options.enableBusinessHours) {
      return true;
    }
    return this.businessHoursManager.isBusinessHours(
      date,
      timezone || this.currentTimezone
    );
  }

  /**
   * 営業日の判定
   */
  isBusinessDay(date: Date = new Date(), timezone?: string): boolean {
    if (!this.options.enableBusinessHours) {
      return true;
    }
    return this.businessHoursManager.isBusinessDay(
      date,
      timezone || this.currentTimezone
    );
  }

  /**
   * 祝日の判定
   */
  isHoliday(date: Date, timezone?: string): boolean {
    if (!this.options.enableHolidays) {
      return false;
    }
    const businessHours = this.businessHoursManager.getBusinessHours(
      timezone || this.currentTimezone
    );
    return businessHours
      ? this.businessHoursManager.isHoliday(date, businessHours)
      : false;
  }

  /**
   * 次の営業日の取得
   */
  getNextBusinessDay(date: Date = new Date(), timezone?: string): Date {
    return this.businessHoursManager.getNextBusinessDay(
      date,
      timezone || this.currentTimezone
    );
  }

  // 公開API - タイムゾーン変換

  /**
   * タイムゾーン変換
   */
  convertTimezone(date: Date, fromTimezone: string, toTimezone: string): Date {
    return this.timezoneDetector.convertTimezone(
      date,
      fromTimezone,
      toTimezone
    );
  }

  // 公開API - 情報取得

  /**
   * 現在のタイムゾーン取得
   */
  getCurrentTimezone(): string {
    return this.currentTimezone;
  }

  /**
   * 現在のロケール取得
   */
  getCurrentLocale(): string {
    return this.currentLocale;
  }

  /**
   * タイムゾーン情報取得
   */
  getTimezoneInfo(timezone?: string): TimezoneInfo | undefined {
    return this.timezoneDetector.getTimezoneInfo(
      timezone || this.currentTimezone
    );
  }

  /**
   * 全タイムゾーン取得
   */
  getAllTimezones(): TimezoneInfo[] {
    return this.timezoneDetector.getAllTimezones();
  }

  /**
   * 日時フォーマット情報取得
   */
  getDateTimeFormat(locale?: string): LocaleDateTimeFormat | undefined {
    return this.dateFormatter.getDateTimeFormat(locale || this.currentLocale);
  }

  /**
   * 業務時間情報取得
   */
  getBusinessHours(timezone?: string): BusinessHours | undefined {
    return this.businessHoursManager.getBusinessHours(
      timezone || this.currentTimezone
    );
  }

  /**
   * 地域別タイムゾーン取得
   */
  getTimezonesByRegion(region: string): TimezoneInfo[] {
    return this.timezoneDetector.getTimezonesByRegion(region);
  }

  /**
   * 国別タイムゾーン取得
   */
  getTimezonesByCountry(country: string): TimezoneInfo[] {
    return this.timezoneDetector.getTimezonesByCountry(country);
  }

  /**
   * サポート対象ロケール取得
   */
  getAllSupportedLocales(): string[] {
    return this.dateFormatter.getAllSupportedLocales();
  }

  /**
   * 営業時間の残り時間を計算
   */
  getTimeUntilClose(date: Date = new Date(), timezone?: string): number | null {
    return this.businessHoursManager.getTimeUntilClose(
      date,
      timezone || this.currentTimezone
    );
  }

  /**
   * 次の営業開始時刻を計算
   */
  getTimeUntilOpen(date: Date = new Date(), timezone?: string): number | null {
    return this.businessHoursManager.getTimeUntilOpen(
      date,
      timezone || this.currentTimezone
    );
  }

  /**
   * 営業日数を計算
   */
  getBusinessDaysBetween(
    startDate: Date,
    endDate: Date,
    timezone?: string
  ): number {
    return this.businessHoursManager.getBusinessDaysBetween(
      startDate,
      endDate,
      timezone || this.currentTimezone
    );
  }

  // 公開API - カスタマイズ機能

  /**
   * カスタム日付フォーマット追加
   */
  addCustomFormat(locale: string, format: LocaleDateTimeFormat): void {
    this.dateFormatter.addCustomFormat(locale, format);
  }

  /**
   * 業務時間設定
   */
  setBusinessHours(timezone: string, hours: BusinessHours): void {
    this.businessHoursManager.setBusinessHours(timezone, hours);
  }

  /**
   * 祝日追加
   */
  addHoliday(timezone: string, holiday: BusinessHours['holidays'][0]): boolean {
    return this.businessHoursManager.addHoliday(timezone, holiday);
  }

  /**
   * 週の開始日取得
   */
  getWeekStartDay(locale?: string): 0 | 1 {
    return this.dateFormatter.getWeekStartDay(locale || this.currentLocale);
  }

  /**
   * 月名取得
   */
  getMonthNames(locale?: string): string[] {
    return this.dateFormatter.getMonthNames(locale || this.currentLocale);
  }

  /**
   * 曜日名取得
   */
  getDayNames(locale?: string): string[] {
    return this.dateFormatter.getDayNames(locale || this.currentLocale);
  }

  /**
   * タイムゾーンオフセット取得
   */
  getTimezoneOffset(date: Date, timezone?: string): number {
    return this.timezoneDetector.getTimezoneOffset(
      date,
      timezone || this.currentTimezone
    );
  }

  /**
   * 正常終了処理
   */
  async shutdown(): Promise<void> {
    try {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
      }

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

// 後方互換性のためのエクスポート
export default TimezoneLocalizer;

// 型定義の再エクスポート
export type * from './timezone-types.js';
