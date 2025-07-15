/**
 * DNSweeper 多言語サポートサービス
 * 50言語の完全サポート・RTL言語対応・文化別カスタマイゼーション
 */

import {
  SupportedLanguage,
  TranslationResource,
  LanguageDirection,
  LocalizationConfig,
  CulturalSettings,
  TranslationStatus,
  LanguageMetadata,
  TranslationProvider,
  LocalizationContext
} from '../types/multilingual';

/**
 * 多言語サービス
 */
export class MultilingualService {
  private translations: Map<string, TranslationResource> = new Map();
  private languageMetadata: Map<string, LanguageMetadata> = new Map();
  private culturalSettings: Map<string, CulturalSettings> = new Map();
  private translationProviders: Map<string, TranslationProvider> = new Map();
  private defaultLanguage: string = 'en';
  private currentLanguage: string = 'en';
  private fallbackLanguages: string[] = ['en'];
  
  // 翻訳キャッシュ
  private translationCache: Map<string, Map<string, string>> = new Map();
  private cacheMaxSize: number = 10000;
  private cacheHitRate: number = 0;
  private cacheRequests: number = 0;

  constructor() {
    this.initializeLanguages();
    this.loadTranslations();
    this.setupTranslationProviders();
    this.detectUserLanguage();
  }

  // ===== 言語初期化 =====

  /**
   * サポート言語の初期化
   */
  private initializeLanguages(): void {
    // 主要50言語のメタデータ設定
    const languages: Array<{
      code: string;
      name: string;
      nativeName: string;
      direction: LanguageDirection;
      region?: string;
      script?: string;
    }> = [
      // ヨーロッパ言語
      { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr' },
      { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr' },
      { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr' },
      { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr' },
      { code: 'it', name: 'Italian', nativeName: 'Italiano', direction: 'ltr' },
      { code: 'pt', name: 'Portuguese', nativeName: 'Português', direction: 'ltr' },
      { code: 'ru', name: 'Russian', nativeName: 'Русский', direction: 'ltr', script: 'Cyrl' },
      { code: 'pl', name: 'Polish', nativeName: 'Polski', direction: 'ltr' },
      { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', direction: 'ltr', script: 'Cyrl' },
      { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', direction: 'ltr' },
      { code: 'sv', name: 'Swedish', nativeName: 'Svenska', direction: 'ltr' },
      { code: 'no', name: 'Norwegian', nativeName: 'Norsk', direction: 'ltr' },
      { code: 'da', name: 'Danish', nativeName: 'Dansk', direction: 'ltr' },
      { code: 'fi', name: 'Finnish', nativeName: 'Suomi', direction: 'ltr' },
      { code: 'cs', name: 'Czech', nativeName: 'Čeština', direction: 'ltr' },
      { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', direction: 'ltr' },
      { code: 'ro', name: 'Romanian', nativeName: 'Română', direction: 'ltr' },
      { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', direction: 'ltr', script: 'Grek' },
      { code: 'bg', name: 'Bulgarian', nativeName: 'Български', direction: 'ltr', script: 'Cyrl' },
      { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', direction: 'ltr' },

      // アジア言語
      { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr', script: 'Jpan' },
      { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文', direction: 'ltr', script: 'Hans', region: 'CN' },
      { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', direction: 'ltr', script: 'Hant', region: 'TW' },
      { code: 'ko', name: 'Korean', nativeName: '한국어', direction: 'ltr', script: 'Kore' },
      { code: 'th', name: 'Thai', nativeName: 'ไทย', direction: 'ltr', script: 'Thai' },
      { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', direction: 'ltr' },
      { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', direction: 'ltr' },
      { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', direction: 'ltr' },
      { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr', script: 'Deva' },
      { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', direction: 'ltr', script: 'Beng' },
      { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', direction: 'ltr', script: 'Taml' },
      { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', direction: 'ltr', script: 'Telu' },
      { code: 'mr', name: 'Marathi', nativeName: 'मराठी', direction: 'ltr', script: 'Deva' },
      { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', direction: 'ltr', script: 'Gujr' },
      { code: 'ur', name: 'Urdu', nativeName: 'اردو', direction: 'rtl', script: 'Arab' },
      { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', direction: 'ltr', script: 'Guru' },
      { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', direction: 'ltr', script: 'Deva' },
      { code: 'si', name: 'Sinhala', nativeName: 'සිංහල', direction: 'ltr', script: 'Sinh' },
      { code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ', direction: 'ltr', script: 'Khmr' },
      { code: 'lo', name: 'Lao', nativeName: 'ລາວ', direction: 'ltr', script: 'Laoo' },
      { code: 'my', name: 'Burmese', nativeName: 'မြန်မာ', direction: 'ltr', script: 'Mymr' },
      { code: 'ka', name: 'Georgian', nativeName: 'ქართული', direction: 'ltr', script: 'Geor' },
      { code: 'mn', name: 'Mongolian', nativeName: 'Монгол', direction: 'ltr', script: 'Cyrl' },

      // 中東言語（RTL）
      { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl', script: 'Arab' },
      { code: 'he', name: 'Hebrew', nativeName: 'עברית', direction: 'rtl', script: 'Hebr' },
      { code: 'fa', name: 'Persian', nativeName: 'فارسی', direction: 'rtl', script: 'Arab' },

      // アフリカ言語
      { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', direction: 'ltr' },
      { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', direction: 'ltr', script: 'Ethi' },
      { code: 'ha', name: 'Hausa', nativeName: 'Hausa', direction: 'ltr' },
      { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá', direction: 'ltr' },
      { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', direction: 'ltr' }
    ];

    languages.forEach(lang => {
      const metadata: LanguageMetadata = {
        code: lang.code,
        name: lang.name,
        nativeName: lang.nativeName,
        direction: lang.direction,
        script: lang.script,
        region: lang.region,
        pluralRules: this.getPluralRules(lang.code),
        dateFormat: this.getDateFormat(lang.code),
        numberFormat: this.getNumberFormat(lang.code),
        completionPercentage: 0,
        lastUpdated: new Date(),
        translators: [],
        reviewers: []
      };

      this.languageMetadata.set(lang.code, metadata);
      this.initializeCulturalSettings(lang.code);
    });
  }

  /**
   * 文化設定の初期化
   */
  private initializeCulturalSettings(languageCode: string): void {
    const settings: CulturalSettings = {
      languageCode,
      calendar: this.getCalendarSystem(languageCode),
      firstDayOfWeek: this.getFirstDayOfWeek(languageCode),
      currencySymbol: this.getCurrencySymbol(languageCode),
      decimalSeparator: this.getDecimalSeparator(languageCode),
      thousandsSeparator: this.getThousandsSeparator(languageCode),
      dateTimeFormat: {
        shortDate: this.getShortDateFormat(languageCode),
        longDate: this.getLongDateFormat(languageCode),
        shortTime: this.getShortTimeFormat(languageCode),
        longTime: this.getLongTimeFormat(languageCode),
        dateTimeSeparator: ' '
      },
      nameFormat: {
        order: this.getNameOrder(languageCode),
        titlePosition: this.getTitlePosition(languageCode),
        respectfulForm: this.hasRespectfulForm(languageCode)
      },
      addressFormat: this.getAddressFormat(languageCode),
      phoneFormat: this.getPhoneFormat(languageCode),
      socialConventions: {
        formalityLevel: this.getFormalityLevel(languageCode),
        personalSpace: this.getPersonalSpace(languageCode),
        colorMeanings: this.getColorMeanings(languageCode),
        tabooTopics: this.getTabooTopics(languageCode)
      }
    };

    this.culturalSettings.set(languageCode, settings);
  }

  // ===== 翻訳管理 =====

  /**
   * 翻訳の取得
   */
  translate(key: string, params?: Record<string, any>, language?: string): string {
    const lang = language || this.currentLanguage;
    const cacheKey = `${lang}:${key}:${JSON.stringify(params || {})}`;

    // キャッシュチェック
    this.cacheRequests++;
    const cached = this.getCachedTranslation(lang, cacheKey);
    if (cached) {
      this.cacheHitRate = ((this.cacheHitRate * (this.cacheRequests - 1)) + 1) / this.cacheRequests;
      return cached;
    }

    // 翻訳取得
    let translation = this.getTranslationFromResource(lang, key);
    
    // フォールバック処理
    if (!translation) {
      for (const fallbackLang of this.fallbackLanguages) {
        translation = this.getTranslationFromResource(fallbackLang, key);
        if (translation) break;
      }
    }

    // デフォルト値
    if (!translation) {
      translation = key;
    }

    // パラメータ置換
    if (params) {
      translation = this.interpolateParams(translation, params, lang);
    }

    // キャッシュ保存
    this.setCachedTranslation(lang, cacheKey, translation);
    this.cacheHitRate = ((this.cacheHitRate * (this.cacheRequests - 1)) + 0) / this.cacheRequests;

    return translation;
  }

  /**
   * 複数形の処理
   */
  translatePlural(
    key: string,
    count: number,
    params?: Record<string, any>,
    language?: string
  ): string {
    const lang = language || this.currentLanguage;
    const pluralForm = this.getPluralForm(lang, count);
    const pluralKey = `${key}.${pluralForm}`;
    
    return this.translate(pluralKey, { ...params, count }, lang);
  }

  /**
   * コンテキスト付き翻訳
   */
  translateWithContext(
    key: string,
    context: LocalizationContext,
    params?: Record<string, any>
  ): string {
    const contextKey = `${context.domain}.${context.feature}.${key}`;
    return this.translate(contextKey, params, context.language);
  }

  /**
   * 動的翻訳の読み込み
   */
  async loadTranslation(languageCode: string, namespace?: string): Promise<void> {
    try {
      const provider = this.getActiveProvider();
      const resource = await provider.fetchTranslation(languageCode, namespace);
      
      if (namespace) {
        const existing = this.translations.get(languageCode) || {
          languageCode,
          namespace: {},
          metadata: { version: '1.0.0', lastModified: new Date(), author: 'system' }
        };
        existing.namespace[namespace] = resource.namespace[namespace] || {};
        this.translations.set(languageCode, existing);
      } else {
        this.translations.set(languageCode, resource);
      }

      // メタデータ更新
      const metadata = this.languageMetadata.get(languageCode);
      if (metadata) {
        metadata.lastUpdated = new Date();
        metadata.completionPercentage = this.calculateCompletionPercentage(languageCode);
      }

    } catch (error) {
      console.error(`翻訳読み込みエラー: ${languageCode}`, error);
      throw error;
    }
  }

  // ===== 言語切り替え =====

  /**
   * 現在の言語を設定
   */
  async setLanguage(languageCode: string): Promise<void> {
    if (!this.languageMetadata.has(languageCode)) {
      throw new Error(`サポートされていない言語: ${languageCode}`);
    }

    // 翻訳リソースの確認
    if (!this.translations.has(languageCode)) {
      await this.loadTranslation(languageCode);
    }

    this.currentLanguage = languageCode;
    
    // RTL言語の場合はドキュメント方向を変更
    const metadata = this.languageMetadata.get(languageCode);
    if (metadata && typeof document !== 'undefined') {
      document.documentElement.dir = metadata.direction;
      document.documentElement.lang = languageCode;
    }

    // イベント発火
    this.emitLanguageChangeEvent(languageCode);
  }

  /**
   * ユーザー言語の自動検出
   */
  private detectUserLanguage(): void {
    let detectedLanguage = this.defaultLanguage;

    // ブラウザ言語設定から検出
    if (typeof navigator !== 'undefined') {
      const browserLang = navigator.language || (navigator as any).userLanguage;
      if (browserLang) {
        const langCode = browserLang.split('-')[0];
        if (this.languageMetadata.has(langCode)) {
          detectedLanguage = langCode;
        } else if (this.languageMetadata.has(browserLang)) {
          detectedLanguage = browserLang;
        }
      }
    }

    // 保存された設定を確認
    if (typeof localStorage !== 'undefined') {
      const savedLang = localStorage.getItem('dnsweeper-language');
      if (savedLang && this.languageMetadata.has(savedLang)) {
        detectedLanguage = savedLang;
      }
    }

    this.currentLanguage = detectedLanguage;
  }

  // ===== フォーマッティング =====

  /**
   * 日付のフォーマット
   */
  formatDate(date: Date, format: 'short' | 'long' = 'short', language?: string): string {
    const lang = language || this.currentLanguage;
    const cultural = this.culturalSettings.get(lang);
    
    if (!cultural) {
      return date.toLocaleDateString();
    }

    const formatPattern = format === 'short' 
      ? cultural.dateTimeFormat.shortDate 
      : cultural.dateTimeFormat.longDate;

    return this.applyDateFormat(date, formatPattern, lang);
  }

  /**
   * 数値のフォーマット
   */
  formatNumber(
    value: number,
    options?: {
      decimals?: number;
      style?: 'decimal' | 'currency' | 'percent';
      currency?: string;
    },
    language?: string
  ): string {
    const lang = language || this.currentLanguage;
    const cultural = this.culturalSettings.get(lang);
    
    if (!cultural) {
      return value.toString();
    }

    let formatted = value.toFixed(options?.decimals || 0);
    
    // 千位区切り
    formatted = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, cultural.thousandsSeparator);
    
    // 小数点
    formatted = formatted.replace('.', cultural.decimalSeparator);
    
    // スタイル別処理
    if (options?.style === 'currency') {
      const currency = options.currency || cultural.currencySymbol;
      formatted = this.applyCurrencyFormat(formatted, currency, lang);
    } else if (options?.style === 'percent') {
      formatted = `${formatted}%`;
    }

    return formatted;
  }

  /**
   * 相対時間のフォーマット
   */
  formatRelativeTime(date: Date, language?: string): string {
    const lang = language || this.currentLanguage;
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return this.translatePlural('time.days_ago', days, { count: days }, lang);
    } else if (hours > 0) {
      return this.translatePlural('time.hours_ago', hours, { count: hours }, lang);
    } else if (minutes > 0) {
      return this.translatePlural('time.minutes_ago', minutes, { count: minutes }, lang);
    } else {
      return this.translate('time.just_now', {}, lang);
    }
  }

  // ===== RTL言語サポート =====

  /**
   * テキストの方向を取得
   */
  getTextDirection(language?: string): LanguageDirection {
    const lang = language || this.currentLanguage;
    const metadata = this.languageMetadata.get(lang);
    return metadata?.direction || 'ltr';
  }

  /**
   * RTL対応CSSクラスを取得
   */
  getRtlClass(language?: string): string {
    const direction = this.getTextDirection(language);
    return direction === 'rtl' ? 'rtl' : 'ltr';
  }

  /**
   * 双方向テキストの処理
   */
  processBidirectionalText(text: string, language?: string): string {
    const lang = language || this.currentLanguage;
    const direction = this.getTextDirection(lang);
    
    if (direction === 'rtl') {
      // RTLマーカーを追加
      return `\u202B${text}\u202C`;
    }
    
    return text;
  }

  // ===== 地域別カスタマイゼーション =====

  /**
   * 地域別設定の適用
   */
  applyRegionalSettings(region: string): void {
    const regionalMappings: Record<string, string> = {
      'US': 'en-US',
      'GB': 'en-GB',
      'CN': 'zh-CN',
      'TW': 'zh-TW',
      'HK': 'zh-HK',
      'JP': 'ja',
      'KR': 'ko',
      'IN': 'hi',
      'SA': 'ar',
      'AE': 'ar',
      'IL': 'he',
      'IR': 'fa',
      'RU': 'ru',
      'BR': 'pt-BR',
      'MX': 'es-MX',
      'ES': 'es-ES',
      'FR': 'fr',
      'DE': 'de',
      'IT': 'it'
    };

    const languageCode = regionalMappings[region];
    if (languageCode && this.languageMetadata.has(languageCode)) {
      this.setLanguage(languageCode);
    }
  }

  /**
   * 文化的に適切なコンテンツの取得
   */
  getCulturallyAppropriateContent(
    contentKey: string,
    context: {
      formality?: 'formal' | 'informal';
      audience?: 'business' | 'consumer' | 'technical';
      tone?: 'professional' | 'friendly' | 'casual';
    },
    language?: string
  ): string {
    const lang = language || this.currentLanguage;
    const cultural = this.culturalSettings.get(lang);
    
    if (!cultural) {
      return this.translate(contentKey, {}, lang);
    }

    // フォーマリティレベルに基づくコンテンツ選択
    const formalityLevel = context.formality || cultural.socialConventions.formalityLevel;
    const adjustedKey = `${contentKey}.${formalityLevel}`;
    
    return this.translate(adjustedKey, {}, lang);
  }

  // ===== 翻訳品質管理 =====

  /**
   * 翻訳の完全性チェック
   */
  checkTranslationCompleteness(languageCode: string): TranslationStatus {
    const baseKeys = this.getAllTranslationKeys(this.defaultLanguage);
    const targetKeys = this.getAllTranslationKeys(languageCode);
    
    const missingKeys = baseKeys.filter(key => !targetKeys.includes(key));
    const extraKeys = targetKeys.filter(key => !baseKeys.includes(key));
    const completionPercentage = ((baseKeys.length - missingKeys.length) / baseKeys.length) * 100;

    return {
      languageCode,
      totalKeys: baseKeys.length,
      translatedKeys: targetKeys.length,
      missingKeys: missingKeys.length,
      extraKeys: extraKeys.length,
      completionPercentage,
      missingTranslations: missingKeys,
      status: completionPercentage === 100 ? 'complete' : 
              completionPercentage >= 80 ? 'partial' : 'incomplete',
      lastChecked: new Date()
    };
  }

  /**
   * 翻訳の品質スコア計算
   */
  calculateQualityScore(languageCode: string): number {
    const status = this.checkTranslationCompleteness(languageCode);
    const metadata = this.languageMetadata.get(languageCode);
    
    if (!metadata) return 0;

    let score = 0;
    
    // 完全性スコア（40%）
    score += (status.completionPercentage / 100) * 40;
    
    // レビュー済みスコア（30%）
    const reviewedPercentage = metadata.reviewers.length > 0 ? 100 : 0;
    score += (reviewedPercentage / 100) * 30;
    
    // 更新頻度スコア（20%）
    const daysSinceUpdate = Math.floor((Date.now() - metadata.lastUpdated.getTime()) / (1000 * 60 * 60 * 24));
    const freshnessScore = Math.max(0, 100 - daysSinceUpdate * 2);
    score += (freshnessScore / 100) * 20;
    
    // 文化的適応スコア（10%）
    const culturalScore = this.culturalSettings.has(languageCode) ? 100 : 0;
    score += (culturalScore / 100) * 10;

    return Math.round(score);
  }

  // ===== ヘルパーメソッド =====

  private loadTranslations(): void {
    // 基本的な翻訳リソースをロード（実際の実装では外部ファイルから）
    // ここではサンプルとして英語と日本語の基本翻訳を設定
    this.translations.set('en', {
      languageCode: 'en',
      namespace: {
        common: {
          'app.name': 'DNSweeper',
          'app.description': 'Enterprise DNS Management Platform',
          'button.submit': 'Submit',
          'button.cancel': 'Cancel',
          'time.just_now': 'Just now',
          'time.minutes_ago.one': '1 minute ago',
          'time.minutes_ago.other': '{{count}} minutes ago',
          'time.hours_ago.one': '1 hour ago',
          'time.hours_ago.other': '{{count}} hours ago',
          'time.days_ago.one': '1 day ago',
          'time.days_ago.other': '{{count}} days ago'
        }
      },
      metadata: {
        version: '1.0.0',
        lastModified: new Date(),
        author: 'DNSweeper Team'
      }
    });

    this.translations.set('ja', {
      languageCode: 'ja',
      namespace: {
        common: {
          'app.name': 'DNSweeper',
          'app.description': 'エンタープライズDNS管理プラットフォーム',
          'button.submit': '送信',
          'button.cancel': 'キャンセル',
          'time.just_now': 'たった今',
          'time.minutes_ago.other': '{{count}}分前',
          'time.hours_ago.other': '{{count}}時間前',
          'time.days_ago.other': '{{count}}日前'
        }
      },
      metadata: {
        version: '1.0.0',
        lastModified: new Date(),
        author: 'DNSweeper Team'
      }
    });
  }

  private setupTranslationProviders(): void {
    // 翻訳プロバイダーの設定（実際の実装では外部サービスと連携）
    const defaultProvider: TranslationProvider = {
      name: 'local',
      type: 'file',
      async fetchTranslation(languageCode: string, namespace?: string): Promise<TranslationResource> {
        // ローカルファイルから翻訳を読み込む
        return {
          languageCode,
          namespace: {},
          metadata: {
            version: '1.0.0',
            lastModified: new Date(),
            author: 'system'
          }
        };
      },
      async saveTranslation(resource: TranslationResource): Promise<void> {
        // 翻訳を保存
      },
      async listAvailableLanguages(): Promise<string[]> {
        return Array.from(this.languageMetadata.keys());
      }
    };

    this.translationProviders.set('local', defaultProvider);
  }

  private getTranslationFromResource(languageCode: string, key: string): string | undefined {
    const resource = this.translations.get(languageCode);
    if (!resource) return undefined;

    const parts = key.split('.');
    let current: any = resource.namespace;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return typeof current === 'string' ? current : undefined;
  }

  private interpolateParams(template: string, params: Record<string, any>, languageCode: string): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (key in params) {
        const value = params[key];
        
        // 数値の場合はフォーマット
        if (typeof value === 'number') {
          return this.formatNumber(value, {}, languageCode);
        }
        
        // 日付の場合はフォーマット
        if (value instanceof Date) {
          return this.formatDate(value, 'short', languageCode);
        }
        
        return String(value);
      }
      return match;
    });
  }

  private getCachedTranslation(languageCode: string, cacheKey: string): string | undefined {
    const langCache = this.translationCache.get(languageCode);
    return langCache?.get(cacheKey);
  }

  private setCachedTranslation(languageCode: string, cacheKey: string, translation: string): void {
    let langCache = this.translationCache.get(languageCode);
    if (!langCache) {
      langCache = new Map();
      this.translationCache.set(languageCode, langCache);
    }

    // キャッシュサイズ制限
    if (langCache.size >= this.cacheMaxSize) {
      const firstKey = langCache.keys().next().value;
      langCache.delete(firstKey);
    }

    langCache.set(cacheKey, translation);
  }

  private getAllTranslationKeys(languageCode: string): string[] {
    const resource = this.translations.get(languageCode);
    if (!resource) return [];

    const keys: string[] = [];
    const extractKeys = (obj: any, prefix: string = '') => {
      for (const key in obj) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          extractKeys(obj[key], fullKey);
        } else {
          keys.push(fullKey);
        }
      }
    };

    extractKeys(resource.namespace);
    return keys;
  }

  private calculateCompletionPercentage(languageCode: string): number {
    const status = this.checkTranslationCompleteness(languageCode);
    return status.completionPercentage;
  }

  private getActiveProvider(): TranslationProvider {
    return this.translationProviders.get('local')!;
  }

  private emitLanguageChangeEvent(languageCode: string): void {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('languagechange', {
        detail: { language: languageCode }
      });
      window.dispatchEvent(event);
    }
  }

  // 文化固有の設定メソッド
  private getPluralRules(languageCode: string): string {
    // 言語ごとの複数形ルール（簡略版）
    const rules: Record<string, string> = {
      'ja': 'other', // 日本語は複数形なし
      'zh': 'other', // 中国語は複数形なし
      'ko': 'other', // 韓国語は複数形なし
      'ru': 'few-many', // ロシア語は複雑な複数形
      'pl': 'few-many', // ポーランド語も複雑
      'ar': 'few-many', // アラビア語も複雑
      'default': 'one-other' // 英語など多くの言語
    };
    return rules[languageCode] || rules.default;
  }

  private getPluralForm(languageCode: string, count: number): string {
    const rules = this.getPluralRules(languageCode);
    
    if (rules === 'other') {
      return 'other';
    } else if (rules === 'one-other') {
      return count === 1 ? 'one' : 'other';
    } else if (rules === 'few-many') {
      // 簡略化した複数形ルール
      if (count === 1) return 'one';
      if (count % 10 >= 2 && count % 10 <= 4 && count % 100 < 12) return 'few';
      return 'other';
    }
    
    return 'other';
  }

  private getDateFormat(languageCode: string): string {
    const formats: Record<string, string> = {
      'en': 'MM/DD/YYYY',
      'ja': 'YYYY年MM月DD日',
      'zh': 'YYYY年MM月DD日',
      'ko': 'YYYY년 MM월 DD일',
      'de': 'DD.MM.YYYY',
      'fr': 'DD/MM/YYYY',
      'default': 'YYYY-MM-DD'
    };
    return formats[languageCode] || formats.default;
  }

  private getNumberFormat(languageCode: string): string {
    const formats: Record<string, string> = {
      'en': '1,234.56',
      'de': '1.234,56',
      'fr': '1 234,56',
      'ja': '1,234.56',
      'ar': '١٬٢٣٤٫٥٦',
      'default': '1,234.56'
    };
    return formats[languageCode] || formats.default;
  }

  private getCalendarSystem(languageCode: string): string {
    const calendars: Record<string, string> = {
      'ar': 'islamic',
      'fa': 'persian',
      'he': 'hebrew',
      'th': 'buddhist',
      'default': 'gregorian'
    };
    return calendars[languageCode] || calendars.default;
  }

  private getFirstDayOfWeek(languageCode: string): number {
    // 0 = Sunday, 1 = Monday, etc.
    const firstDays: Record<string, number> = {
      'en-US': 0, // Sunday
      'ar': 6, // Saturday
      'he': 0, // Sunday
      'default': 1 // Monday
    };
    return firstDays[languageCode] || firstDays.default;
  }

  private getCurrencySymbol(languageCode: string): string {
    const currencies: Record<string, string> = {
      'en-US': '$',
      'en-GB': '£',
      'eu': '€',
      'ja': '¥',
      'zh': '¥',
      'ko': '₩',
      'in': '₹',
      'ar': 'ر.س',
      'default': '$'
    };
    return currencies[languageCode] || currencies.default;
  }

  private getDecimalSeparator(languageCode: string): string {
    return languageCode.includes('de') || languageCode.includes('fr') ? ',' : '.';
  }

  private getThousandsSeparator(languageCode: string): string {
    if (languageCode.includes('de')) return '.';
    if (languageCode.includes('fr')) return ' ';
    return ',';
  }

  private getShortDateFormat(languageCode: string): string {
    const formats: Record<string, string> = {
      'en-US': 'MM/DD/YY',
      'en-GB': 'DD/MM/YY',
      'ja': 'YY/MM/DD',
      'default': 'DD/MM/YY'
    };
    return formats[languageCode] || formats.default;
  }

  private getLongDateFormat(languageCode: string): string {
    const formats: Record<string, string> = {
      'en': 'MMMM DD, YYYY',
      'ja': 'YYYY年MM月DD日',
      'default': 'DD MMMM YYYY'
    };
    return formats[languageCode] || formats.default;
  }

  private getShortTimeFormat(languageCode: string): string {
    return languageCode === 'en-US' ? 'h:mm A' : 'HH:mm';
  }

  private getLongTimeFormat(languageCode: string): string {
    return languageCode === 'en-US' ? 'h:mm:ss A' : 'HH:mm:ss';
  }

  private getNameOrder(languageCode: string): 'first-last' | 'last-first' {
    const lastFirst = ['ja', 'zh', 'ko', 'hu'];
    return lastFirst.includes(languageCode) ? 'last-first' : 'first-last';
  }

  private getTitlePosition(languageCode: string): 'before' | 'after' {
    return 'before'; // ほとんどの言語で前
  }

  private hasRespectfulForm(languageCode: string): boolean {
    const respectful = ['ja', 'ko', 'de', 'fr', 'es', 'it', 'ru'];
    return respectful.includes(languageCode);
  }

  private getAddressFormat(languageCode: string): string {
    // 簡略化したアドレス形式
    if (['ja', 'zh', 'ko'].includes(languageCode)) {
      return 'country-province-city-district-street-number';
    }
    return 'number-street-district-city-province-country';
  }

  private getPhoneFormat(languageCode: string): string {
    const formats: Record<string, string> = {
      'en-US': '+1 (XXX) XXX-XXXX',
      'ja': '+81 XX-XXXX-XXXX',
      'default': '+XX XXX XXX XXXX'
    };
    return formats[languageCode] || formats.default;
  }

  private getFormalityLevel(languageCode: string): 'low' | 'medium' | 'high' {
    const high = ['ja', 'ko', 'de'];
    const medium = ['fr', 'es', 'it', 'ru'];
    return high.includes(languageCode) ? 'high' :
           medium.includes(languageCode) ? 'medium' : 'low';
  }

  private getPersonalSpace(languageCode: string): 'close' | 'medium' | 'distant' {
    // 文化的な個人空間の概念
    return 'medium';
  }

  private getColorMeanings(languageCode: string): Record<string, string> {
    // 色の文化的意味（簡略版）
    return {
      'red': languageCode === 'zh' ? 'lucky' : 'danger',
      'white': languageCode === 'ja' ? 'death' : 'purity',
      'green': 'growth',
      'blue': 'trust'
    };
  }

  private getTabooTopics(languageCode: string): string[] {
    // 文化的にタブーとされるトピック（簡略版）
    return [];
  }

  private applyDateFormat(date: Date, pattern: string, languageCode: string): string {
    // 簡易的な日付フォーマット実装
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return pattern
      .replace('YYYY', String(year))
      .replace('YY', String(year).slice(-2))
      .replace('MM', month)
      .replace('DD', day);
  }

  private applyCurrencyFormat(value: string, currency: string, languageCode: string): string {
    // 通貨記号の位置
    if (['en', 'he'].includes(languageCode)) {
      return `${currency}${value}`;
    } else if (['fr', 'de'].includes(languageCode)) {
      return `${value} ${currency}`;
    }
    return `${currency}${value}`;
  }

  // ===== パブリックAPI =====

  /**
   * サポートされている全言語のリスト取得
   */
  getSupportedLanguages(): LanguageMetadata[] {
    return Array.from(this.languageMetadata.values());
  }

  /**
   * 現在の言語を取得
   */
  getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * 言語のメタデータを取得
   */
  getLanguageMetadata(languageCode: string): LanguageMetadata | undefined {
    return this.languageMetadata.get(languageCode);
  }

  /**
   * 文化設定を取得
   */
  getCulturalSettings(languageCode: string): CulturalSettings | undefined {
    return this.culturalSettings.get(languageCode);
  }

  /**
   * 翻訳状態を取得
   */
  getTranslationStatus(languageCode: string): TranslationStatus {
    return this.checkTranslationCompleteness(languageCode);
  }

  /**
   * 全言語の品質スコアを取得
   */
  getAllQualityScores(): Record<string, number> {
    const scores: Record<string, number> = {};
    for (const lang of this.languageMetadata.keys()) {
      scores[lang] = this.calculateQualityScore(lang);
    }
    return scores;
  }

  /**
   * キャッシュ統計を取得
   */
  getCacheStatistics(): {
    size: number;
    maxSize: number;
    hitRate: number;
    requests: number;
  } {
    let totalSize = 0;
    for (const langCache of this.translationCache.values()) {
      totalSize += langCache.size;
    }
    
    return {
      size: totalSize,
      maxSize: this.cacheMaxSize,
      hitRate: this.cacheHitRate,
      requests: this.cacheRequests
    };
  }

  /**
   * 言語設定を保存
   */
  saveLanguagePreference(languageCode: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('dnsweeper-language', languageCode);
    }
  }

  /**
   * 翻訳リソースをエクスポート
   */
  exportTranslations(languageCode: string): TranslationResource | undefined {
    return this.translations.get(languageCode);
  }

  /**
   * 翻訳リソースをインポート
   */
  importTranslations(resource: TranslationResource): void {
    this.translations.set(resource.languageCode, resource);
    
    // メタデータ更新
    const metadata = this.languageMetadata.get(resource.languageCode);
    if (metadata) {
      metadata.lastUpdated = new Date();
      metadata.completionPercentage = this.calculateCompletionPercentage(resource.languageCode);
    }
  }
}

/**
 * グローバルサービスインスタンス
 */
export const multilingualService = new MultilingualService();