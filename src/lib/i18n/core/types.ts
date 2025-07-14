/**
 * 国際化システム - 型定義
 */

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  region: string;
  direction: 'ltr' | 'rtl';
  flag: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: {
    decimal: string;
    thousand: string;
    currency: string;
  };
  pluralRules: PluralRule[];
  enabled: boolean;
  completeness: number; // 翻訳完成度 (0-100%)
}

export interface PluralRule {
  rule: string;
  forms: string[];
  examples: number[];
}

export interface TranslationNamespace {
  namespace: string;
  description: string;
  keys: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface TranslationEntry {
  key: string;
  namespace: string;
  value: string;
  context?: string;
  plurals?: { [form: string]: string };
  interpolations?: string[];
  lastUpdated: Date;
  translator?: string;
  approved: boolean;
}

export interface LocalizationContext {
  language: string;
  region: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: NumberFormatOptions;
  rtl: boolean;
  culturalPreferences: {
    [key: string]: string | number | boolean;
  };
}

export interface NumberFormatOptions {
  decimal: string;
  thousand: string;
  precision: number;
  currency: string;
  currencyDisplay: 'symbol' | 'code' | 'name';
}

export interface RegionalSettings {
  region: string;
  name: string;
  languages: string[];
  defaultLanguage: string;
  timezone: string;
  currency: string;
  dnsServers: string[];
  legalRequirements: {
    gdpr: boolean;
    ccpa: boolean;
    dataLocalization: boolean;
    auditLog: boolean;
  };
  businessHours: {
    start: string;
    end: string;
    timezone: string;
  };
  supportContacts: {
    email: string;
    phone: string;
    hours: string;
  };
}

export interface I18nManagerConfig {
  defaultLanguage: string;
  fallbackLanguage: string;
  autoDetectLanguage: boolean;
  enablePluralHandling: boolean;
  enableInterpolation: boolean;
  translationCacheSize: number;
  missingKeyHandling: 'error' | 'warning' | 'silent';
  enableRTL: boolean;
  enableRegionalSettings: boolean;
}

export interface TranslationReport {
  timestamp: Date;
  totalLanguages: number;
  enabledLanguages: number;
  overallCompleteness: number;
  namespaces: Array<{
    namespace: string;
    completeness: number;
    languages: Array<{
      code: string;
      completeness: number;
    }>;
  }>;
}