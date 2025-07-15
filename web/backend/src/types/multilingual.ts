/**
 * DNSweeper 多言語サポート型定義
 * 50言語の完全サポート・RTL言語対応・文化別カスタマイゼーション
 */

/**
 * サポート言語コード
 */
export type SupportedLanguage = 
  // ヨーロッパ言語
  | 'en'         // English
  | 'es'         // Spanish
  | 'fr'         // French
  | 'de'         // German
  | 'it'         // Italian
  | 'pt'         // Portuguese
  | 'ru'         // Russian
  | 'pl'         // Polish
  | 'uk'         // Ukrainian
  | 'nl'         // Dutch
  | 'sv'         // Swedish
  | 'no'         // Norwegian
  | 'da'         // Danish
  | 'fi'         // Finnish
  | 'cs'         // Czech
  | 'hu'         // Hungarian
  | 'ro'         // Romanian
  | 'el'         // Greek
  | 'bg'         // Bulgarian
  | 'tr'         // Turkish
  // アジア言語
  | 'ja'         // Japanese
  | 'zh'         // Chinese (Simplified)
  | 'zh-TW'      // Chinese (Traditional)
  | 'ko'         // Korean
  | 'th'         // Thai
  | 'vi'         // Vietnamese
  | 'id'         // Indonesian
  | 'ms'         // Malay
  | 'hi'         // Hindi
  | 'bn'         // Bengali
  | 'ta'         // Tamil
  | 'te'         // Telugu
  | 'mr'         // Marathi
  | 'gu'         // Gujarati
  | 'ur'         // Urdu
  | 'pa'         // Punjabi
  | 'ne'         // Nepali
  | 'si'         // Sinhala
  | 'km'         // Khmer
  | 'lo'         // Lao
  | 'my'         // Burmese
  | 'ka'         // Georgian
  | 'mn'         // Mongolian
  // 中東言語
  | 'ar'         // Arabic
  | 'he'         // Hebrew
  | 'fa'         // Persian
  // アフリカ言語
  | 'sw'         // Swahili
  | 'am'         // Amharic
  | 'ha'         // Hausa
  | 'yo'         // Yoruba
  | 'zu';        // Zulu

/**
 * 言語の方向
 */
export type LanguageDirection = 'ltr' | 'rtl';

/**
 * 言語スクリプト
 */
export type LanguageScript = 
  | 'Latn'       // Latin
  | 'Cyrl'       // Cyrillic
  | 'Grek'       // Greek
  | 'Arab'       // Arabic
  | 'Hebr'       // Hebrew
  | 'Deva'       // Devanagari
  | 'Beng'       // Bengali
  | 'Taml'       // Tamil
  | 'Telu'       // Telugu
  | 'Gujr'       // Gujarati
  | 'Guru'       // Gurmukhi
  | 'Sinh'       // Sinhala
  | 'Thai'       // Thai
  | 'Khmr'       // Khmer
  | 'Laoo'       // Lao
  | 'Mymr'       // Myanmar
  | 'Geor'       // Georgian
  | 'Ethi'       // Ethiopic
  | 'Hans'       // Chinese Simplified
  | 'Hant'       // Chinese Traditional
  | 'Jpan'       // Japanese
  | 'Kore';      // Korean

/**
 * 翻訳リソース
 */
export interface TranslationResource {
  languageCode: string;
  namespace: Record<string, Record<string, any>>;
  metadata: TranslationMetadata;
}

/**
 * 翻訳メタデータ
 */
export interface TranslationMetadata {
  version: string;
  lastModified: Date;
  author: string;
  reviewers?: string[];
  approvedBy?: string;
  comments?: string;
}

/**
 * ローカリゼーション設定
 */
export interface LocalizationConfig {
  defaultLanguage: string;
  supportedLanguages: SupportedLanguage[];
  fallbackLanguages: string[];
  autoDetect: boolean;
  persistSelection: boolean;
  
  // 翻訳設定
  translation: {
    missingKeyHandler: 'ignore' | 'fallback' | 'key' | 'custom';
    loadPath: string;
    savePath?: string;
    cache: boolean;
    preload: string[];
    interpolation: {
      prefix: string;
      suffix: string;
      escapeValue: boolean;
    };
  };
  
  // 地域設定
  regional: {
    detectFromUrl: boolean;
    detectFromDomain: boolean;
    detectFromHeader: boolean;
    cookieName?: string;
  };
  
  // UI設定
  ui: {
    showLanguageSelector: boolean;
    selectorPosition: 'header' | 'footer' | 'sidebar';
    displayFormat: 'code' | 'native' | 'both';
    groupByRegion: boolean;
  };
}

/**
 * 文化設定
 */
export interface CulturalSettings {
  languageCode: string;
  
  // カレンダー
  calendar: 'gregorian' | 'islamic' | 'hebrew' | 'persian' | 'buddhist' | 'chinese';
  firstDayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  
  // 数値フォーマット
  currencySymbol: string;
  currencyPosition?: 'before' | 'after';
  decimalSeparator: string;
  thousandsSeparator: string;
  
  // 日付時刻フォーマット
  dateTimeFormat: {
    shortDate: string;
    longDate: string;
    shortTime: string;
    longTime: string;
    dateTimeSeparator: string;
  };
  
  // 名前フォーマット
  nameFormat: {
    order: 'first-last' | 'last-first';
    titlePosition: 'before' | 'after';
    respectfulForm: boolean;
  };
  
  // 住所フォーマット
  addressFormat: string;
  
  // 電話番号フォーマット
  phoneFormat: string;
  
  // 社会的慣習
  socialConventions: {
    formalityLevel: 'low' | 'medium' | 'high';
    personalSpace: 'close' | 'medium' | 'distant';
    colorMeanings: Record<string, string>;
    tabooTopics: string[];
  };
}

/**
 * 翻訳ステータス
 */
export interface TranslationStatus {
  languageCode: string;
  totalKeys: number;
  translatedKeys: number;
  missingKeys: number;
  extraKeys: number;
  completionPercentage: number;
  missingTranslations: string[];
  status: 'complete' | 'partial' | 'incomplete';
  lastChecked: Date;
}

/**
 * 言語メタデータ
 */
export interface LanguageMetadata {
  code: string;
  name: string;
  nativeName: string;
  direction: LanguageDirection;
  script?: LanguageScript;
  region?: string;
  pluralRules: string;
  dateFormat: string;
  numberFormat: string;
  completionPercentage: number;
  lastUpdated: Date;
  translators: Translator[];
  reviewers: Reviewer[];
}

/**
 * 翻訳者情報
 */
export interface Translator {
  id: string;
  name: string;
  email: string;
  languages: string[];
  nativeLanguages: string[];
  specializations: string[];
  rating: number;
  translatedWords: number;
  joinedAt: Date;
}

/**
 * レビュアー情報
 */
export interface Reviewer {
  id: string;
  name: string;
  email: string;
  languages: string[];
  nativeLanguages: string[];
  expertise: string[];
  reviewedWords: number;
  approvalRate: number;
  joinedAt: Date;
}

/**
 * 翻訳プロバイダー
 */
export interface TranslationProvider {
  name: string;
  type: 'file' | 'api' | 'database' | 'cms';
  endpoint?: string;
  apiKey?: string;
  
  // メソッド
  fetchTranslation(languageCode: string, namespace?: string): Promise<TranslationResource>;
  saveTranslation(resource: TranslationResource): Promise<void>;
  listAvailableLanguages(): Promise<string[]>;
  getTranslationStatus?(languageCode: string): Promise<TranslationStatus>;
}

/**
 * ローカリゼーションコンテキスト
 */
export interface LocalizationContext {
  language: string;
  region?: string;
  timezone?: string;
  currency?: string;
  domain: string;
  feature: string;
  user?: {
    id: string;
    preferences: UserLocalizationPreferences;
  };
}

/**
 * ユーザーローカリゼーション設定
 */
export interface UserLocalizationPreferences {
  language: string;
  region?: string;
  dateFormat?: string;
  timeFormat?: string;
  numberFormat?: string;
  currency?: string;
  timezone?: string;
  firstDayOfWeek?: number;
  measurementSystem?: 'metric' | 'imperial';
}

/**
 * 翻訳イベント
 */
export interface TranslationEvent {
  type: 'language_changed' | 'translation_loaded' | 'translation_missing' | 'translation_error';
  languageCode: string;
  namespace?: string;
  key?: string;
  timestamp: Date;
  details?: any;
}

/**
 * 翻訳統計
 */
export interface TranslationStatistics {
  totalTranslations: number;
  languageCoverage: Record<string, number>;
  missingTranslations: Record<string, string[]>;
  popularKeys: Array<{ key: string; count: number }>;
  recentActivity: TranslationActivity[];
  qualityScores: Record<string, number>;
}

/**
 * 翻訳アクティビティ
 */
export interface TranslationActivity {
  id: string;
  type: 'translation' | 'review' | 'approval' | 'rejection';
  languageCode: string;
  key: string;
  oldValue?: string;
  newValue: string;
  user: string;
  timestamp: Date;
  comment?: string;
}

/**
 * RTLサポート設定
 */
export interface RtlSupport {
  enabled: boolean;
  languages: string[];
  mirrorLayout: boolean;
  mirrorIcons: boolean;
  textAlignment: 'auto' | 'start' | 'end';
  numeralSystem: 'latin' | 'arabic' | 'persian';
}

/**
 * 地域別コンテンツ設定
 */
export interface RegionalContent {
  region: string;
  languages: string[];
  content: {
    images: Record<string, string>;
    videos: Record<string, string>;
    documents: Record<string, string>;
    customText: Record<string, string>;
  };
  restrictions: {
    blockedContent: string[];
    requiredContent: string[];
    ageRestrictions?: number;
    contentRating?: string;
  };
  compliance: {
    gdpr?: boolean;
    ccpa?: boolean;
    cookies?: boolean;
    dataRetention?: number;
  };
}

/**
 * 翻訳品質指標
 */
export interface TranslationQualityMetrics {
  languageCode: string;
  accuracy: number;          // 0-100
  fluency: number;          // 0-100
  consistency: number;      // 0-100
  terminology: number;      // 0-100
  culturalAdaptation: number; // 0-100
  overallScore: number;     // 0-100
  issues: QualityIssue[];
  lastEvaluated: Date;
}

/**
 * 品質問題
 */
export interface QualityIssue {
  severity: 'critical' | 'major' | 'minor' | 'suggestion';
  type: 'accuracy' | 'fluency' | 'consistency' | 'terminology' | 'cultural';
  key: string;
  description: string;
  suggestion?: string;
  assignedTo?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'rejected';
}

/**
 * 翻訳メモリ
 */
export interface TranslationMemory {
  id: string;
  sourceLanguage: string;
  targetLanguage: string;
  segments: TranslationSegment[];
  metadata: {
    domain: string;
    project: string;
    client?: string;
    createdAt: Date;
    updatedAt: Date;
  };
}

/**
 * 翻訳セグメント
 */
export interface TranslationSegment {
  id: string;
  source: string;
  target: string;
  confidence: number;
  context?: string;
  notes?: string;
  createdBy: string;
  createdAt: Date;
  usageCount: number;
  lastUsed?: Date;
}

/**
 * 用語集
 */
export interface Glossary {
  id: string;
  name: string;
  languages: string[];
  terms: GlossaryTerm[];
  domain: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 用語集エントリ
 */
export interface GlossaryTerm {
  id: string;
  term: string;
  translations: Record<string, string>;
  definition?: string;
  context?: string;
  partOfSpeech?: string;
  usage?: string;
  doNotTranslate?: boolean;
  caseSensitive?: boolean;
  approved: boolean;
  notes?: string;
}

/**
 * 機械翻訳設定
 */
export interface MachineTranslationConfig {
  enabled: boolean;
  provider: 'google' | 'microsoft' | 'deepl' | 'amazon' | 'custom';
  apiKey?: string;
  endpoint?: string;
  
  // 設定
  settings: {
    autoTranslate: boolean;
    reviewRequired: boolean;
    confidenceThreshold: number;
    maxCharactersPerMonth?: number;
    preserveFormatting: boolean;
    customModel?: string;
  };
  
  // 言語ペア
  supportedPairs: Array<{
    source: string;
    target: string;
    quality: 'high' | 'medium' | 'low';
  }>;
  
  // 使用統計
  usage: {
    charactersTranslated: number;
    requestsCount: number;
    averageConfidence: number;
    lastReset: Date;
  };
}

/**
 * コンテンツローカリゼーション
 */
export interface ContentLocalization {
  contentId: string;
  contentType: 'page' | 'article' | 'product' | 'email' | 'notification';
  baseLanguage: string;
  localizations: Record<string, LocalizedContent>;
  workflow: LocalizationWorkflow;
  seo: SeoLocalization;
}

/**
 * ローカライズコンテンツ
 */
export interface LocalizedContent {
  language: string;
  title: string;
  content: string;
  excerpt?: string;
  metadata?: Record<string, any>;
  status: 'draft' | 'review' | 'approved' | 'published';
  translator?: string;
  reviewer?: string;
  publishedAt?: Date;
  lastModified: Date;
}

/**
 * ローカリゼーションワークフロー
 */
export interface LocalizationWorkflow {
  steps: WorkflowStep[];
  currentStep: number;
  assignees: Record<string, string>;
  deadlines: Record<string, Date>;
  approvals: WorkflowApproval[];
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

/**
 * ワークフローステップ
 */
export interface WorkflowStep {
  id: string;
  name: string;
  type: 'translation' | 'review' | 'approval' | 'publish';
  assignee?: string;
  completed: boolean;
  completedAt?: Date;
  comments?: string[];
}

/**
 * ワークフロー承認
 */
export interface WorkflowApproval {
  step: string;
  approver: string;
  approved: boolean;
  approvedAt: Date;
  comments?: string;
}

/**
 * SEOローカリゼーション
 */
export interface SeoLocalization {
  hreflangTags: boolean;
  localizedUrls: Record<string, string>;
  metaTags: Record<string, LocalizedMetaTags>;
  sitemaps: Record<string, string>;
  canonicalUrl?: string;
}

/**
 * ローカライズメタタグ
 */
export interface LocalizedMetaTags {
  title: string;
  description: string;
  keywords?: string[];
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
}

/**
 * ローカリゼーションAPI応答
 */
export interface LocalizationApiResponse {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    language: string;
    region?: string;
    timestamp: Date;
    version: string;
  };
}

/**
 * 言語検出結果
 */
export interface LanguageDetectionResult {
  detectedLanguage: string;
  confidence: number;
  alternativeLanguages: Array<{
    language: string;
    confidence: number;
  }>;
  source: 'browser' | 'header' | 'url' | 'cookie' | 'user' | 'default';
}

/**
 * 翻訳バッチジョブ
 */
export interface TranslationBatchJob {
  id: string;
  name: string;
  sourceLanguage: string;
  targetLanguages: string[];
  keys: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
  results?: Record<string, TranslationResult>;
  createdBy: string;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * 翻訳結果
 */
export interface TranslationResult {
  key: string;
  sourceText: string;
  translations: Record<string, string>;
  status: 'success' | 'failed';
  error?: string;
  confidence?: number;
  method: 'manual' | 'machine' | 'memory';
}