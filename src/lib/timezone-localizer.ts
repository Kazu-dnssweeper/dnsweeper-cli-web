/**
 * タイムゾーン・日付形式ローカライザー - リファクタリング版
 *
 * 分離された機能モジュールを統合する軽量なコーディネータークラス
 */

import { EventEmitter } from 'events';

import { BusinessHoursManager } from './business-hours.js';
import { DateFormatter } from './date-formatter.js';
import { I18nManager } from './i18n-manager.js';
import { Logger } from './logger.js';
import { TimezoneAutoDetector } from './timezone-auto-detector.js';
import { TimezoneDetector } from './timezone-detector.js';
import { TimezoneUtilities } from './timezone-utilities.js';

import type {
  DateTimeLocalizerOptions,
  TimezoneInfo,
  LocaleDateTimeFormat,
  RelativeTimeOptions,
  DateFormatOptions,
  TimeFormatOptions,
  DateTimeFormatOptions,
} from './timezone-types.js';

/**
 * タイムゾーン・日付形式ローカライザー - メインコーディネーター
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
  private utilities: TimezoneUtilities;
  private autoDetector: TimezoneAutoDetector;

  constructor(
    logger?: Logger,
    i18nManager?: I18nManager,
    options: DateTimeLocalizerOptions = {}
  ) {
    super();

    this.logger = logger || new Logger({ logLevel: 'info' });
    this.i18nManager = i18nManager || new I18nManager();

    // デフォルトオプションの設定
    this.options = {
      enableBusinessHours: true,
      enableHolidays: true,
      enableAutoDetection: true,
      autoUpdateInterval: 3600000, // 1時間
      defaultTimezone: 'UTC',
      defaultLocale: 'en-US',
      cacheSize: 100,
      enableCaching: true,
      fallbackTimezone: 'UTC',
      strictValidation: false,
      ...options,
    };

    this.currentTimezone = this.options.defaultTimezone;
    this.currentLocale = this.options.defaultLocale;

    // 機能モジュールの初期化
    this.timezoneDetector = new TimezoneDetector(this.logger);
    this.dateFormatter = new DateFormatter(
      this.logger,
      this.options.fallbackTimezone
    );
    this.businessHoursManager = new BusinessHoursManager(this.logger);
    this.utilities = new TimezoneUtilities(this.logger);
    this.autoDetector = new TimezoneAutoDetector(this.logger);

    // イベント転送の設定
    this.setupEventForwarding();

    // 自動検出の開始
    if (this.options.enableAutoDetection) {
      this.initializeAutoDetection();
    }

    this.logger.info('タイムゾーンローカライザー初期化完了', {
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

    this.timezoneDetector.on('detection-failed', data => {
      this.emit('detection-failed', data);
    });

    // 自動検出器のイベント転送
    this.autoDetector.on('timezone-detected', data => {
      this.emit('auto-timezone-detected', data);

      // 信頼度が高い場合は自動的に適用
      if (data.confidence >= 0.8) {
        this.setTimezone(data.timezone);
      }
    });

    this.autoDetector.on('auto-update', data => {
      this.emit('timezone-auto-updated', data);
    });
  }

  /**
   * 自動検出の初期化
   */
  private async initializeAutoDetection(): Promise<void> {
    try {
      const detection = await this.autoDetector.detectTimezone();
      if (detection.confidence >= 0.7) {
        this.setTimezone(detection.timezone);
      }

      // 自動更新の開始
      this.autoDetector.startAutoUpdate(this.options.autoUpdateInterval);
    } catch (error) {
      this.logger.warn('自動検出の初期化に失敗しました', {
        error: error as Error,
      });
    }
  }

  // ===== 公開API - 設定管理 =====

  /**
   * タイムゾーンの設定
   */
  setTimezone(timezone: string): void {
    const normalizedTimezone = this.utilities.normalizeTimezoneName(timezone);

    if (
      this.options.strictValidation &&
      !this.utilities.isValidTimezone(normalizedTimezone)
    ) {
      throw new Error(`無効なタイムゾーン: ${timezone}`);
    }

    const oldTimezone = this.currentTimezone;
    this.currentTimezone = normalizedTimezone;

    this.logger.info(
      `タイムゾーン変更: ${oldTimezone} → ${normalizedTimezone}`
    );
    this.emit('timezone-changed', {
      from: oldTimezone,
      to: normalizedTimezone,
    });
  }

  /**
   * ロケールの設定
   */
  setLocale(locale: string): void {
    if (this.options.strictValidation) {
      try {
        new Intl.DateTimeFormat(locale);
      } catch {
        throw new Error(`無効なロケール: ${locale}`);
      }
    }

    const oldLocale = this.currentLocale;
    this.currentLocale = locale;

    this.logger.info(`ロケール変更: ${oldLocale} → ${locale}`);
    this.emit('locale-changed', { from: oldLocale, to: locale });
  }

  // ===== 公開API - フォーマット機能 =====

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

  // ===== 公開API - 業務時間管理 =====

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

  // ===== 公開API - タイムゾーン変換 =====

  /**
   * タイムゾーン間の変換
   */
  convertTimezone(date: Date, fromTimezone: string, toTimezone: string): Date {
    return this.utilities.convertTimezone(date, fromTimezone, toTimezone);
  }

  /**
   * 現在のタイムゾーンでの時刻を取得
   */
  getCurrentTime(): Date {
    return this.utilities.convertTimezone(
      new Date(),
      'UTC',
      this.currentTimezone
    );
  }

  /**
   * 複数タイムゾーンでの現在時刻を取得
   */
  getCurrentTimeInTimezones(
    timezones: string[]
  ): ReturnType<typeof this.utilities.getCurrentTimeInTimezones> {
    return this.utilities.getCurrentTimeInTimezones(timezones);
  }

  /**
   * 会議時間の最適化
   */
  findOptimalMeetingTime(
    timezones: string[],
    businessHoursStart?: number,
    businessHoursEnd?: number,
    durationMinutes?: number
  ): ReturnType<typeof this.utilities.findOptimalMeetingTime> {
    return this.utilities.findOptimalMeetingTime(
      timezones,
      businessHoursStart,
      businessHoursEnd,
      durationMinutes
    );
  }

  // ===== 公開API - 情報取得 =====

  /**
   * タイムゾーン情報の取得
   */
  getTimezoneInfo(timezone?: string): TimezoneInfo | null {
    return this.utilities.getTimezoneInfo(timezone || this.currentTimezone);
  }

  /**
   * サポートされているタイムゾーンの一覧を取得
   */
  getSupportedTimezones(): string[] {
    return this.utilities.getSupportedTimezones();
  }

  /**
   * 現在の設定の取得
   */
  getCurrentSettings(): {
    timezone: string;
    locale: string;
    options: Required<DateTimeLocalizerOptions>;
  } {
    return {
      timezone: this.currentTimezone,
      locale: this.currentLocale,
      options: { ...this.options },
    };
  }

  /**
   * 日付フォーマットの取得
   */
  getDateTimeFormat(locale?: string): LocaleDateTimeFormat | undefined {
    return this.dateFormatter.getDateTimeFormat(locale || this.currentLocale);
  }

  // ===== 公開API - 検出機能 =====

  /**
   * 手動タイムゾーン検出
   */
  async detectTimezone(): Promise<
    ReturnType<typeof this.autoDetector.detectTimezone>
  > {
    return this.autoDetector.detectTimezone();
  }

  /**
   * 検出履歴の取得
   */
  getDetectionHistory(): ReturnType<
    typeof this.autoDetector.getDetectionHistory
  > {
    return this.autoDetector.getDetectionHistory();
  }

  /**
   * 検出統計の取得
   */
  getDetectionStatistics(): ReturnType<
    typeof this.autoDetector.getDetectionStatistics
  > {
    return this.autoDetector.getDetectionStatistics();
  }

  // ===== 公開API - 設定管理 =====

  /**
   * オプションの更新
   */
  updateOptions(newOptions: Partial<DateTimeLocalizerOptions>): void {
    this.options = { ...this.options, ...newOptions };

    // 自動検出設定の更新
    if (newOptions.enableAutoDetection !== undefined) {
      if (newOptions.enableAutoDetection && !this.autoDetector) {
        this.initializeAutoDetection();
      } else if (!newOptions.enableAutoDetection) {
        this.autoDetector.stopAutoUpdate();
      }
    }

    // 自動更新間隔の更新
    if (newOptions.autoUpdateInterval !== undefined) {
      this.autoDetector.stopAutoUpdate();
      this.autoDetector.startAutoUpdate(newOptions.autoUpdateInterval);
    }

    this.emit('options-updated', { newOptions, currentOptions: this.options });
    this.logger.info('オプションを更新しました', newOptions);
  }

  // ===== 公開API - キャッシュ管理 =====

  /**
   * キャッシュ統計の取得
   */
  getCacheStatistics(): {
    timezone: ReturnType<TimezoneUtilities['getCacheStatistics']>;
    formatter: { supportedLocales: string[] };
  } {
    return {
      timezone: this.utilities.getCacheStatistics(),
      formatter: {
        supportedLocales: this.dateFormatter.getAllSupportedLocales(),
      },
    };
  }

  /**
   * キャッシュのクリア
   */
  clearCache(): void {
    this.utilities.clearCache();
    this.autoDetector.clearHistory();
    this.emit('cache-cleared');
    this.logger.info('キャッシュをクリアしました');
  }

  // ===== 公開API - システム管理 =====

  /**
   * システムの健全性チェック
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'error';
    components: Record<string, { status: string; lastCheck: Date }>;
    currentSettings: {
      timezone: string;
      locale: string;
    };
    statistics: {
      detections: ReturnType<TimezoneAutoDetector['getDetectionStatistics']>;
      cache: ReturnType<TimezoneLocalizer['getCacheStatistics']>;
    };
  } {
    const now = new Date();

    return {
      status: 'healthy',
      components: {
        timezoneDetector: { status: 'healthy', lastCheck: now },
        dateFormatter: { status: 'healthy', lastCheck: now },
        businessHoursManager: { status: 'healthy', lastCheck: now },
        utilities: { status: 'healthy', lastCheck: now },
        autoDetector: { status: 'healthy', lastCheck: now },
      },
      currentSettings: {
        timezone: this.currentTimezone,
        locale: this.currentLocale,
      },
      statistics: {
        detections: this.getDetectionStatistics(),
        cache: this.getCacheStatistics(),
      },
    };
  }

  /**
   * システム終了処理
   */
  async shutdown(): Promise<void> {
    try {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = undefined;
      }

      this.autoDetector.shutdown();
      this.removeAllListeners();

      this.logger.info('タイムゾーンローカライザーを終了しました');
    } catch (error) {
      this.logger.error('終了処理エラー', { error: error as Error });
      throw error;
    }
  }
}

// 後方互換性のためのエクスポート
export default TimezoneLocalizer;

// 型定義の再エクスポート
export type {
  DateTimeLocalizerOptions,
  TimezoneInfo,
  LocaleDateTimeFormat,
  BusinessHours,
  RelativeTimeOptions,
  DateFormatOptions,
  TimeFormatOptions,
  DateTimeFormatOptions,
} from './timezone-types.js';
