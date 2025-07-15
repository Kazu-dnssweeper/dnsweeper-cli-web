/**
 * グローバル展開・多言語対応管理システム
 *
 * DNSweeper のグローバル展開に対応する包括的な国際化機能
 * - 40言語対応
 * - 地域別設定
 * - 動的言語切り替え
 * - 複数形対応
 * - 数値・日付・通貨フォーマット
 * - RTL (Right-to-Left) 言語対応
 */

import { EventEmitter } from 'events';

import { I18nFormatter } from '@lib/i18n/formatters/formatter.js';
import {
  SUPPORTED_LANGUAGES,
  getLanguageByCode,
} from '@lib/i18n/languages/language-definitions.js';
import {
  REGIONAL_SETTINGS,
  getRegionalSettingsByCode,
} from '@lib/i18n/regions/regional-settings.js';
import { TranslationManager } from '@lib/i18n/translations/translation-manager.js';
import { Logger } from '@lib/logger.js';

import type {
  SupportedLanguage,
  PluralRule,
  TranslationNamespace,
  TranslationEntry,
  LocalizationContext,
  NumberFormatOptions,
  RegionalSettings,
  I18nManagerConfig,
  TranslationReport,
} from '@lib/i18n/core/types.js';

// Re-export types for backward compatibility
export type {
  SupportedLanguage,
  PluralRule,
  TranslationNamespace,
  TranslationEntry,
  LocalizationContext,
  NumberFormatOptions,
  RegionalSettings,
  I18nManagerConfig,
  TranslationReport,
};

export class I18nManager extends EventEmitter {
  private supportedLanguages: Map<string, SupportedLanguage> = new Map();
  private regionalSettings: Map<string, RegionalSettings> = new Map();
  private currentLanguage: string;
  private currentRegion: string;
  private logger: Logger;
  private config: I18nManagerConfig;
  private localizationContext: LocalizationContext;
  private translationManager: TranslationManager;
  private formatter: I18nFormatter;

  constructor(logger?: Logger, config?: Partial<I18nManagerConfig>) {
    super();

    this.logger = logger || new Logger();
    this.config = {
      defaultLanguage: 'en',
      fallbackLanguage: 'en',
      autoDetectLanguage: true,
      enablePluralHandling: true,
      enableInterpolation: true,
      translationCacheSize: 10000,
      missingKeyHandling: 'warning',
      enableRTL: true,
      enableRegionalSettings: true,
      ...config,
    };

    this.currentLanguage = this.config.defaultLanguage;
    this.currentRegion = 'US';

    this.initializeSupportedLanguages();
    this.initializeRegionalSettings();
    this.initializeLocalizationContext();

    // 翻訳マネージャーとフォーマッターを初期化
    this.translationManager = new TranslationManager();
    this.formatter = new I18nFormatter(this.localizationContext);

    // イベントハンドラーを設定
    this.setupEventHandlers();
  }

  /**
   * サポート言語の初期化
   */
  private initializeSupportedLanguages(): void {
    // 言語定義をインポート
    for (const language of SUPPORTED_LANGUAGES) {
      this.supportedLanguages.set(language.code, language);
    }

    this.logger.info('サポート言語を初期化しました', {
      total: this.supportedLanguages.size,
      enabled: Array.from(this.supportedLanguages.values()).filter(
        l => l.enabled
      ).length,
    });
  }

  /**
   * イベントハンドラーのセットアップ
   */
  private setupEventHandlers(): void {
    // 翻訳マネージャーのイベントを転送
    this.translationManager.on('translation:added', event => {
      this.emit('translation:added', event);
    });

    this.translationManager.on('translation:missing', event => {
      this.emit('translation:missing', event);
    });

    this.translationManager.on('translations:imported', event => {
      this.emit('translations:imported', event);
    });

    this.translationManager.on('translations:exported', event => {
      this.emit('translations:exported', event);
    });
  }

  /**
   * 地域設定の初期化
   */
  private initializeRegionalSettings(): void {
    // 地域設定をインポート
    for (const settings of REGIONAL_SETTINGS) {
      this.regionalSettings.set(settings.region, settings);
    }

    this.logger.info('地域設定を初期化しました', {
      total: this.regionalSettings.size,
    });
  }

  /**
   * ローカライゼーションコンテキストの初期化
   */
  private initializeLocalizationContext(): void {
    const currentLang = this.supportedLanguages.get(this.currentLanguage);
    const currentRegionSettings = this.regionalSettings.get(this.currentRegion);

    this.localizationContext = {
      language: this.currentLanguage,
      region: this.currentRegion,
      timezone: currentRegionSettings?.timezone || 'UTC',
      currency: currentRegionSettings?.currency || 'USD',
      dateFormat: currentLang?.dateFormat || 'YYYY-MM-DD',
      timeFormat: currentLang?.timeFormat || 'HH:mm',
      numberFormat: {
        decimal: currentLang?.numberFormat.decimal || '.',
        thousand: currentLang?.numberFormat.thousand || ',',
        precision: 2,
        currency: currentLang?.numberFormat.currency || '$',
        currencyDisplay: 'symbol',
      },
      rtl: currentLang?.direction === 'rtl',
      culturalPreferences: {
        firstDayOfWeek: this.currentRegion === 'US' ? 0 : 1, // 0=Sunday, 1=Monday
        weekendStart: 0, // Sunday
        weekendEnd: 6, // Saturday
        hourFormat: currentLang?.timeFormat.includes('A') ? 12 : 24,
      },
    };
  }

  /**
   * 言語の変更
   */
  async changeLanguage(languageCode: string): Promise<void> {
    const language = this.supportedLanguages.get(languageCode);
    if (!language) {
      throw new Error(`サポートされていない言語です: ${languageCode}`);
    }

    if (!language.enabled) {
      throw new Error(`言語が無効です: ${languageCode}`);
    }

    const previousLanguage = this.currentLanguage;
    this.currentLanguage = languageCode;

    // 地域設定の更新
    this.currentRegion = language.region;
    this.initializeLocalizationContext();

    // フォーマッターのコンテキストを更新
    this.formatter.updateContext(this.localizationContext);

    this.logger.info('言語を変更しました', {
      from: previousLanguage,
      to: languageCode,
      region: this.currentRegion,
    });

    this.emit('language-changed', {
      from: previousLanguage,
      to: languageCode,
      region: this.currentRegion,
      context: this.localizationContext,
    });
  }

  /**
   * 地域の変更
   */
  async changeRegion(regionCode: string): Promise<void> {
    const regionSettings = this.regionalSettings.get(regionCode);
    if (!regionSettings) {
      throw new Error(`サポートされていない地域です: ${regionCode}`);
    }

    const previousRegion = this.currentRegion;
    this.currentRegion = regionCode;

    // デフォルト言語の更新
    if (
      regionSettings.defaultLanguage &&
      this.supportedLanguages.has(regionSettings.defaultLanguage)
    ) {
      this.currentLanguage = regionSettings.defaultLanguage;
    }

    this.initializeLocalizationContext();
    this.formatter.updateContext(this.localizationContext);

    this.logger.info('地域を変更しました', {
      from: previousRegion,
      to: regionCode,
      language: this.currentLanguage,
    });

    this.emit('region-changed', {
      from: previousRegion,
      to: regionCode,
      language: this.currentLanguage,
      context: this.localizationContext,
    });
  }

  /**
   * 翻訳の取得
   */
  translate(
    key: string,
    namespace: string = 'common',
    options?: {
      params?: Record<string, string | number>;
      count?: number;
      context?: string;
    }
  ): string {
    return this.translationManager.translate(
      this.currentLanguage,
      `${namespace}.${key}`,
      options?.params,
      {
        count: options?.count,
        context: options?.context,
        fallbackLanguage: this.config.fallbackLanguage,
      }
    );
  }

  /**
   * 翻訳の追加
   */
  async addTranslation(
    languageCode: string,
    namespace: string,
    key: string,
    value: string,
    options?: {
      context?: string;
      plurals?: { [form: string]: string };
      interpolations?: string[];
      translator?: string;
      approved?: boolean;
    }
  ): Promise<void> {
    this.translationManager.addTranslation(
      languageCode,
      key,
      namespace,
      value,
      options
    );
  }

  /**
   * 翻訳ファイルのインポート
   */
  async importTranslations(
    language: string,
    filePath: string,
    format: 'json' | 'csv' | 'po' = 'json'
  ): Promise<number> {
    return this.translationManager.importTranslations(
      language,
      filePath,
      format
    );
  }

  /**
   * 翻訳ファイルのエクスポート
   */
  async exportTranslations(
    language: string,
    filePath: string,
    format: 'json' | 'csv' | 'po' = 'json',
    options?: {
      namespace?: string;
      approvedOnly?: boolean;
    }
  ): Promise<void> {
    return this.translationManager.exportTranslations(
      language,
      filePath,
      format,
      options
    );
  }

  /**
   * 数値のフォーマット
   */
  formatNumber(value: number, options?: Partial<NumberFormatOptions>): string {
    return this.formatter.formatNumber(value, options);
  }

  /**
   * 通貨のフォーマット
   */
  formatCurrency(
    value: number,
    currency?: string,
    display?: 'symbol' | 'code' | 'name'
  ): string {
    return this.formatter.formatCurrency(value, currency, display);
  }

  /**
   * 日付のフォーマット
   */
  formatDate(date: Date | string | number, format?: string): string {
    return this.formatter.formatDate(date, format);
  }

  /**
   * 時刻のフォーマット
   */
  formatTime(date: Date | string | number, format?: string): string {
    return this.formatter.formatTime(date, format);
  }

  /**
   * 日付時刻のフォーマット
   */
  formatDateTime(
    date: Date | string | number,
    dateFormat?: string,
    timeFormat?: string
  ): string {
    return this.formatter.formatDateTime(date, dateFormat, timeFormat);
  }

  /**
   * 相対時間のフォーマット
   */
  formatRelativeTime(date: Date | string | number): string {
    return this.formatter.formatRelativeTime(date);
  }

  /**
   * パーセンテージのフォーマット
   */
  formatPercentage(value: number, decimals: number = 0): string {
    return this.formatter.formatPercentage(value, decimals);
  }

  /**
   * ファイルサイズのフォーマット
   */
  formatFileSize(bytes: number): string {
    return this.formatter.formatFileSize(bytes);
  }

  /**
   * 言語の自動検出
   */
  async detectLanguage(acceptLanguageHeader?: string): Promise<string> {
    if (!this.config.autoDetectLanguage) {
      return this.config.defaultLanguage;
    }

    if (acceptLanguageHeader) {
      const preferredLanguages = acceptLanguageHeader
        .split(',')
        .map(lang => {
          const [code, q = '1'] = lang.trim().split(';q=');
          return { code: code.split('-')[0], quality: parseFloat(q) };
        })
        .sort((a, b) => b.quality - a.quality);

      for (const { code } of preferredLanguages) {
        if (this.supportedLanguages.has(code)) {
          const language = this.supportedLanguages.get(code);
          if (language?.enabled) {
            return code;
          }
        }
      }
    }

    return this.config.defaultLanguage;
  }

  /**
   * 翻訳完成度レポートの生成
   */
  generateCompletionReport(): TranslationReport {
    const enabledLanguages = this.getEnabledLanguages().map(l => l.code);
    return this.translationManager.generateCompletionReport(enabledLanguages);
  }

  /**
   * 地域設定の取得
   */
  getRegionalSettings(region?: string): RegionalSettings | undefined {
    return this.regionalSettings.get(region || this.currentRegion);
  }

  /**
   * サポート言語の取得
   */
  getSupportedLanguages(): SupportedLanguage[] {
    return Array.from(this.supportedLanguages.values());
  }

  /**
   * 有効言語の取得
   */
  getEnabledLanguages(): SupportedLanguage[] {
    return Array.from(this.supportedLanguages.values()).filter(
      lang => lang.enabled
    );
  }

  /**
   * 現在の言語取得
   */
  getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * 現在の地域取得
   */
  getCurrentRegion(): string {
    return this.currentRegion;
  }

  /**
   * ローカライゼーションコンテキストの取得
   */
  getLocalizationContext(): LocalizationContext {
    return { ...this.localizationContext };
  }

  /**
   * 翻訳統計の取得
   */
  getTranslationStatistics(): {
    totalLanguages: number;
    enabledLanguages: number;
    totalNamespaces: number;
    totalKeys: number;
    totalTranslations: number;
    cacheHitRate: number;
  } {
    const stats = this.translationManager.getStatistics();
    const namespaces = new Set<string>();

    // Get namespace count from translation manager
    // This is a simplified version - in a real implementation,
    // the TranslationManager would track namespaces

    return {
      totalLanguages: this.supportedLanguages.size,
      enabledLanguages: this.getEnabledLanguages().length,
      totalNamespaces: 8, // Fixed for now based on the namespace definitions
      totalKeys: 0, // Would need to be tracked by TranslationManager
      totalTranslations: stats.totalTranslations,
      cacheHitRate: stats.cacheHitRate,
    };
  }
}
