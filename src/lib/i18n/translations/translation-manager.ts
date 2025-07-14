/**
 * 翻訳管理システム
 */

import { EventEmitter } from 'events';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { 
  TranslationEntry, 
  TranslationNamespace,
  TranslationReport 
} from '../core/types.js';

export class TranslationManager extends EventEmitter {
  private translations: Map<string, Map<string, TranslationEntry>> = new Map();
  private namespaces: Map<string, TranslationNamespace> = new Map();
  private translationCache: Map<string, string> = new Map();
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor() {
    super();
    this.initializeNamespaces();
  }

  /**
   * 名前空間の初期化
   */
  private initializeNamespaces(): void {
    const namespaces: TranslationNamespace[] = [
      {
        namespace: 'common',
        description: '共通UI要素',
        keys: ['button.ok', 'button.cancel', 'button.save', 'button.delete'],
        priority: 'high'
      },
      {
        namespace: 'dns',
        description: 'DNS関連用語',
        keys: ['record.type.a', 'record.type.aaaa', 'record.type.cname', 'record.type.mx'],
        priority: 'high'
      },
      {
        namespace: 'errors',
        description: 'エラーメッセージ',
        keys: ['network.timeout', 'auth.failed', 'validation.required'],
        priority: 'high'
      },
      {
        namespace: 'dashboard',
        description: 'ダッシュボード',
        keys: ['title', 'stats.total', 'stats.active'],
        priority: 'medium'
      },
      {
        namespace: 'settings',
        description: '設定画面',
        keys: ['language.label', 'region.label', 'theme.label'],
        priority: 'medium'
      }
    ];

    for (const ns of namespaces) {
      this.namespaces.set(ns.namespace, ns);
    }
  }

  /**
   * 翻訳の追加
   */
  addTranslation(
    language: string, 
    key: string, 
    namespace: string, 
    value: string,
    options?: {
      context?: string;
      plurals?: { [form: string]: string };
      interpolations?: string[];
      translator?: string;
      approved?: boolean;
    }
  ): void {
    if (!this.translations.has(language)) {
      this.translations.set(language, new Map());
    }

    const langTranslations = this.translations.get(language)!;
    const entry: TranslationEntry = {
      key,
      namespace,
      value,
      context: options?.context,
      plurals: options?.plurals,
      interpolations: options?.interpolations,
      lastUpdated: new Date(),
      translator: options?.translator,
      approved: options?.approved ?? false
    };

    const fullKey = `${namespace}.${key}`;
    langTranslations.set(fullKey, entry);

    // キャッシュをクリア
    this.clearCacheForKey(fullKey);

    this.emit('translation:added', {
      language,
      key: fullKey,
      entry
    });
  }

  /**
   * 翻訳の取得
   */
  getTranslation(
    language: string, 
    key: string, 
    fallbackLanguage?: string
  ): TranslationEntry | undefined {
    const langTranslations = this.translations.get(language);
    if (langTranslations) {
      const entry = langTranslations.get(key);
      if (entry) {
        this.cacheHits++;
        return entry;
      }
    }

    this.cacheMisses++;

    // フォールバック言語で試行
    if (fallbackLanguage && fallbackLanguage !== language) {
      const fallbackTranslations = this.translations.get(fallbackLanguage);
      if (fallbackTranslations) {
        return fallbackTranslations.get(key);
      }
    }

    return undefined;
  }

  /**
   * 翻訳文字列の取得（補間対応）
   */
  translate(
    language: string,
    key: string,
    params?: Record<string, string | number>,
    options?: {
      count?: number;
      context?: string;
      fallbackLanguage?: string;
    }
  ): string {
    // キャッシュチェック
    const cacheKey = `${language}.${key}.${JSON.stringify(params)}.${options?.count}`;
    const cached = this.translationCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const entry = this.getTranslation(language, key, options?.fallbackLanguage);
    if (!entry) {
      this.emit('translation:missing', { language, key });
      return key; // キーをそのまま返す
    }

    let result = entry.value;

    // 複数形処理
    if (options?.count !== undefined && entry.plurals) {
      const pluralForm = this.getPluralForm(language, options.count);
      if (entry.plurals[pluralForm]) {
        result = entry.plurals[pluralForm];
      }
    }

    // パラメータ補間
    if (params) {
      result = this.interpolate(result, params);
    }

    // キャッシュに保存
    if (this.translationCache.size < 10000) {
      this.translationCache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * 複数形の判定
   */
  private getPluralForm(language: string, count: number): string {
    // 簡易実装 - 実際は各言語のルールに従う
    switch (language) {
      case 'ja':
      case 'zh':
      case 'ko':
        return 'other'; // 不変
      case 'ru':
        if (count % 10 === 1 && count % 100 !== 11) return 'one';
        if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return 'few';
        return 'other';
      default:
        return count === 1 ? 'one' : 'other';
    }
  }

  /**
   * パラメータ補間
   */
  private interpolate(text: string, params: Record<string, string | number>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key]?.toString() || match;
    });
  }

  /**
   * 翻訳の一括インポート
   */
  async importTranslations(
    language: string,
    filePath: string,
    format: 'json' | 'csv' | 'po' = 'json'
  ): Promise<number> {
    if (!existsSync(filePath)) {
      throw new Error(`Translation file not found: ${filePath}`);
    }

    const content = readFileSync(filePath, 'utf-8');
    let imported = 0;

    switch (format) {
      case 'json':
        const translations = JSON.parse(content);
        for (const [namespace, entries] of Object.entries(translations)) {
          for (const [key, value] of Object.entries(entries as Record<string, string>)) {
            this.addTranslation(language, key, namespace, value);
            imported++;
          }
        }
        break;
      // CSV, PO形式は省略
    }

    this.emit('translations:imported', {
      language,
      count: imported,
      format
    });

    return imported;
  }

  /**
   * 翻訳のエクスポート
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
    const langTranslations = this.translations.get(language);
    if (!langTranslations) {
      throw new Error(`No translations found for language: ${language}`);
    }

    const exportData: Record<string, Record<string, string>> = {};

    for (const [key, entry] of langTranslations.entries()) {
      if (options?.namespace && !key.startsWith(options.namespace + '.')) {
        continue;
      }
      if (options?.approvedOnly && !entry.approved) {
        continue;
      }

      const [namespace, ...keyParts] = key.split('.');
      const actualKey = keyParts.join('.');

      if (!exportData[namespace]) {
        exportData[namespace] = {};
      }
      exportData[namespace][actualKey] = entry.value;
    }

    switch (format) {
      case 'json':
        writeFileSync(filePath, JSON.stringify(exportData, null, 2));
        break;
      // CSV, PO形式は省略
    }

    this.emit('translations:exported', {
      language,
      filePath,
      format
    });
  }

  /**
   * 翻訳完成度レポート生成
   */
  generateCompletionReport(enabledLanguages: string[]): TranslationReport {
    const report: TranslationReport = {
      timestamp: new Date(),
      totalLanguages: enabledLanguages.length,
      enabledLanguages: enabledLanguages.length,
      overallCompleteness: 0,
      namespaces: []
    };

    let totalCompleteness = 0;

    for (const [nsName, namespace] of this.namespaces.entries()) {
      const nsKeys = namespace.keys.map(k => `${nsName}.${k}`);
      const nsReport = {
        namespace: nsName,
        completeness: 0,
        languages: [] as Array<{ code: string; completeness: number }>
      };

      let nsCompleteness = 0;

      for (const language of enabledLanguages) {
        const langTranslations = this.translations.get(language);
        const translatedKeys = nsKeys.filter(key => 
          langTranslations && langTranslations.has(key)
        );

        const completeness = nsKeys.length > 0 
          ? (translatedKeys.length / nsKeys.length) * 100 
          : 0;

        nsReport.languages.push({
          code: language,
          completeness
        });

        nsCompleteness += completeness;
      }

      nsReport.completeness = enabledLanguages.length > 0 
        ? nsCompleteness / enabledLanguages.length 
        : 0;
      
      report.namespaces.push(nsReport);
      totalCompleteness += nsReport.completeness;
    }

    report.overallCompleteness = this.namespaces.size > 0 
      ? totalCompleteness / this.namespaces.size 
      : 0;

    return report;
  }

  /**
   * キャッシュのクリア
   */
  private clearCacheForKey(key: string): void {
    const keysToDelete: string[] = [];
    for (const cacheKey of this.translationCache.keys()) {
      if (cacheKey.includes(key)) {
        keysToDelete.push(cacheKey);
      }
    }
    for (const key of keysToDelete) {
      this.translationCache.delete(key);
    }
  }

  /**
   * 統計情報の取得
   */
  getStatistics(): {
    totalTranslations: number;
    cacheSize: number;
    cacheHitRate: number;
  } {
    let totalTranslations = 0;
    for (const langTranslations of this.translations.values()) {
      totalTranslations += langTranslations.size;
    }

    const totalRequests = this.cacheHits + this.cacheMisses;
    const cacheHitRate = totalRequests > 0 ? this.cacheHits / totalRequests : 0;

    return {
      totalTranslations,
      cacheSize: this.translationCache.size,
      cacheHitRate
    };
  }
}