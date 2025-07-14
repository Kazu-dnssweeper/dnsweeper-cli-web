/**
 * 多言語レポート生成システム
 * 
 * グローバル対応のためのレポート生成機能
 * - 40言語対応のレポート生成
 * - 地域別設定対応
 * - 複数形式出力 (PDF, Excel, CSV, JSON)
 * - 文化的配慮 (RTL対応, 数値形式, 日付形式)
 * - テンプレート管理
 */

import { EventEmitter } from 'events';
import { Logger } from './logger.js';
import { I18nManager } from './i18n-manager.js';
import { TimezoneLocalizer } from './timezone-localizer.js';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { TemplateManager } from './reports/templates/template-manager.js';
import { ReportGenerator } from './reports/generators/report-generator.js';
import { PDFExporter, type PDFExporterOptions } from './reports/exporters/pdf-exporter.js';
import { ExcelExporter, type ExcelExporterOptions } from './reports/exporters/excel-exporter.js';
import type {
  ReportTemplate,
  ReportData,
  ReportOptions,
  GeneratedReport
} from './reports/core/types.js';

// Re-export types for backward compatibility
export type {
  ReportTemplate,
  ReportSection,
  ReportStyling,
  SectionStyling,
  ReportCondition,
  ReportData,
  ReportOptions,
  ExportFormat,
  GeneratedReport
} from './reports/core/types.js';

export interface MultilingualReportGeneratorConfig {
  defaultLanguage: string;
  supportedFormats: string[];
  maxConcurrentGenerations: number;
  cacheEnabled: boolean;
  cacheSize: number;
  tempDirectory: string;
}

export class MultilingualReportGenerator extends EventEmitter {
  private logger: Logger;
  private i18nManager: I18nManager;
  private timezoneLocalizer: TimezoneLocalizer;
  private templateManager: TemplateManager;
  private reportGenerator: ReportGenerator;
  private pdfExporter: PDFExporter;
  private excelExporter: ExcelExporter;
  private config: MultilingualReportGeneratorConfig;
  private reportCache: Map<string, GeneratedReport> = new Map();

  constructor(
    logger: Logger,
    i18nManager: I18nManager,
    timezoneLocalizer: TimezoneLocalizer,
    config?: Partial<MultilingualReportGeneratorConfig>
  ) {
    super();
    
    this.logger = logger;
    this.i18nManager = i18nManager;
    this.timezoneLocalizer = timezoneLocalizer;
    
    this.config = {
      defaultLanguage: 'en',
      supportedFormats: ['pdf', 'excel', 'csv', 'json'],
      maxConcurrentGenerations: 5,
      cacheEnabled: true,
      cacheSize: 100,
      tempDirectory: '/tmp/reports',
      ...config
    };

    // コンポーネントの初期化
    this.templateManager = new TemplateManager();
    this.reportGenerator = new ReportGenerator(logger, i18nManager);
    this.pdfExporter = new PDFExporter();
    this.excelExporter = new ExcelExporter();

    this.setupEventHandlers();
    this.logger.info('多言語レポート生成システムを初期化しました');
  }

  /**
   * イベントハンドラーのセットアップ
   */
  private setupEventHandlers(): void {
    // テンプレートマネージャーのイベント
    this.templateManager.on('template:added', (event) => {
      this.emit('template:added', event);
    });

    // レポートジェネレーターのイベント
    this.reportGenerator.on('report:generated', (report) => {
      this.emit('report:generated', report);
    });

    this.reportGenerator.on('report:queued', (event) => {
      this.emit('report:queued', event);
    });

    this.reportGenerator.on('report:error', (event) => {
      this.emit('report:error', event);
    });
  }

  /**
   * レポートの生成
   */
  async generateReport(
    templateId: string,
    data: ReportData,
    options?: Partial<ReportOptions>
  ): Promise<GeneratedReport> {
    const template = this.templateManager.getTemplate(templateId);
    if (!template) {
      throw new Error(`テンプレートが見つかりません: ${templateId}`);
    }

    const reportOptions: ReportOptions = {
      language: this.i18nManager.getCurrentLanguage(),
      format: 'pdf',
      ...options
    };

    // キャッシュチェック
    if (this.config.cacheEnabled) {
      const cacheKey = this.generateCacheKey(templateId, data, reportOptions);
      const cached = this.reportCache.get(cacheKey);
      if (cached) {
        this.logger.info('キャッシュからレポートを取得', { cacheKey });
        return cached;
      }
    }

    // レポート生成
    const report = await this.reportGenerator.generate(
      template,
      data,
      reportOptions
    );

    // フォーマット別のエクスポート
    if (reportOptions.format !== 'json') {
      const exportedContent = await this.exportToFormat(
        report,
        template,
        reportOptions
      );
      report.content = exportedContent;
    }

    // キャッシュに保存
    if (this.config.cacheEnabled) {
      this.addToCache(report);
    }

    return report;
  }

  /**
   * フォーマット別のエクスポート
   */
  private async exportToFormat(
    report: GeneratedReport,
    template: ReportTemplate,
    options: ReportOptions
  ): Promise<Buffer> {
    const content = typeof report.content === 'string' 
      ? JSON.parse(report.content) 
      : report.content;

    switch (options.format) {
      case 'pdf':
        return this.pdfExporter.export(
          template,
          content.sections,
          content,
          {
            watermark: options.watermark,
            encryption: options.encryptionKey ? {
              userPassword: options.encryptionKey
            } : undefined
          } as PDFExporterOptions
        );

      case 'excel':
        return this.excelExporter.export(
          template,
          content.sections,
          content,
          {
            includeRawData: options.includeRawData,
            chartSheets: options.includeCharts
          } as ExcelExporterOptions
        );

      case 'csv':
        return this.exportToCSV(content);

      default:
        throw new Error(`サポートされていないフォーマット: ${options.format}`);
    }
  }

  /**
   * CSV形式へのエクスポート
   */
  private async exportToCSV(content: any): Promise<Buffer> {
    const csv: string[] = [];
    
    // メタデータ
    csv.push(`"Title","${content.title}"`);
    csv.push(`"Generated","${content.metadata.generated}"`);
    csv.push(`"Language","${content.metadata.language}"`);
    csv.push('');

    // セクションごとのデータ
    for (const section of content.sections) {
      if (section.type === 'table' && section.content.rows) {
        // セクションタイトル
        csv.push(`"${section.title}"`);
        
        // ヘッダー
        const headers = section.content.columns.map((col: any) => 
          `"${col.label}"`
        ).join(',');
        csv.push(headers);
        
        // データ行
        for (const row of section.content.rows) {
          const values = section.content.columns.map((col: any) => {
            const value = row[col.key] || '';
            // CSVエスケープ
            const escaped = String(value).replace(/"/g, '""');
            return `"${escaped}"`;
          }).join(',');
          csv.push(values);
        }
        
        csv.push('');
      }
    }

    return Buffer.from(csv.join('\n'), 'utf-8');
  }

  /**
   * ファイルへの保存
   */
  async saveToFile(
    report: GeneratedReport,
    filePath: string
  ): Promise<void> {
    const directory = join(this.config.tempDirectory, 'generated');
    const fullPath = join(directory, filePath);

    if (Buffer.isBuffer(report.content)) {
      writeFileSync(fullPath, report.content);
    } else {
      writeFileSync(fullPath, report.content, 'utf-8');
    }

    this.logger.info('レポートをファイルに保存しました', {
      reportId: report.id,
      filePath: fullPath,
      size: report.size
    });

    this.emit('report:saved', {
      reportId: report.id,
      filePath: fullPath
    });
  }

  /**
   * レポートのスケジュール生成
   */
  async scheduleReport(
    templateId: string,
    data: ReportData,
    options: ReportOptions & {
      schedule: {
        frequency: 'daily' | 'weekly' | 'monthly';
        time: string;
        timezone: string;
      };
      recipients?: string[];
    }
  ): Promise<string> {
    // スケジュール実装は別途必要
    const scheduleId = `schedule-${Date.now()}`;
    
    this.logger.info('レポート生成をスケジュールしました', {
      scheduleId,
      templateId,
      frequency: options.schedule.frequency
    });

    this.emit('report:scheduled', {
      scheduleId,
      templateId,
      options
    });

    return scheduleId;
  }

  /**
   * テンプレートの管理
   */
  getTemplateManager(): TemplateManager {
    return this.templateManager;
  }

  /**
   * テンプレートの取得
   */
  getTemplate(id: string): ReportTemplate | undefined {
    return this.templateManager.getTemplate(id);
  }

  /**
   * テンプレートの追加
   */
  addTemplate(template: ReportTemplate): void {
    this.templateManager.addTemplate(template);
  }

  /**
   * 利用可能なテンプレートの取得
   */
  getAvailableTemplates(
    language?: string,
    category?: string
  ): ReportTemplate[] {
    let templates = this.templateManager.getAllTemplates();

    if (language) {
      templates = templates.filter(t => 
        t.metadata.supportedLanguages.includes(language)
      );
    }

    if (category) {
      templates = templates.filter(t => t.category === category);
    }

    return templates;
  }

  /**
   * キャッシュキーの生成
   */
  private generateCacheKey(
    templateId: string,
    data: ReportData,
    options: ReportOptions
  ): string {
    const key = {
      templateId,
      dataHash: this.hashObject(data),
      language: options.language,
      format: options.format
    };
    return JSON.stringify(key);
  }

  /**
   * オブジェクトのハッシュ化
   */
  private hashObject(obj: any): string {
    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * キャッシュへの追加
   */
  private addToCache(report: GeneratedReport): void {
    if (this.reportCache.size >= this.config.cacheSize) {
      // 最も古いエントリを削除
      const firstKey = this.reportCache.keys().next().value;
      this.reportCache.delete(firstKey);
    }

    const cacheKey = this.generateCacheKey(
      report.metadata.templateId,
      { title: report.title } as ReportData,
      report.metadata.options
    );
    
    this.reportCache.set(cacheKey, report);
  }

  /**
   * キャッシュのクリア
   */
  clearCache(): void {
    this.reportCache.clear();
    this.logger.info('レポートキャッシュをクリアしました');
  }

  /**
   * 統計情報の取得
   */
  getStatistics(): {
    templatesCount: number;
    cacheSize: number;
    supportedLanguages: string[];
    supportedFormats: string[];
  } {
    return {
      templatesCount: this.templateManager.getAllTemplates().length,
      cacheSize: this.reportCache.size,
      supportedLanguages: this.i18nManager.getSupportedLanguages()
        .filter(l => l.enabled)
        .map(l => l.code),
      supportedFormats: this.config.supportedFormats
    };
  }
}