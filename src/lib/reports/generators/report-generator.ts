/**
 * レポート生成エンジン
 */

import { createHash } from 'crypto';
import { EventEmitter } from 'events';

import type { I18nManager } from '../../i18n-manager.js';
import type { Logger } from '../../logger.js';
import type {
  ReportTemplate,
  ReportData,
  ReportOptions,
  GeneratedReport,
  ReportSection,
} from '../core/types.js';

export class ReportGenerator extends EventEmitter {
  private logger: Logger;
  private i18nManager: I18nManager;
  private generationQueue: Array<{
    id: string;
    template: ReportTemplate;
    data: ReportData;
    options: ReportOptions;
  }> = [];
  private isGenerating = false;

  constructor(logger: Logger, i18nManager: I18nManager) {
    super();
    this.logger = logger;
    this.i18nManager = i18nManager;
  }

  /**
   * レポートの生成
   */
  async generate(
    template: ReportTemplate,
    data: ReportData,
    options: ReportOptions
  ): Promise<GeneratedReport> {
    const startTime = Date.now();
    const reportId = this.generateReportId();

    this.logger.info('レポート生成を開始', {
      reportId,
      templateId: template.id,
      language: options.language,
      format: options.format,
    });

    try {
      // 言語の検証
      if (!template.metadata.supportedLanguages.includes(options.language)) {
        throw new Error(`Unsupported language: ${options.language}`);
      }

      // フォーマットの検証
      if (!template.metadata.supportedFormats.includes(options.format)) {
        throw new Error(`Unsupported format: ${options.format}`);
      }

      // データのローカライズ
      const localizedData = await this.localizeData(data, options.language);

      // セクションの処理
      const processedSections = await this.processSections(
        template.sections,
        localizedData,
        options
      );

      // コンテンツの生成
      const content = await this.generateContent(
        template,
        processedSections,
        localizedData,
        options
      );

      // レポートオブジェクトの作成
      const report: GeneratedReport = {
        id: reportId,
        title: localizedData.title,
        format: options.format,
        language: options.language,
        size: this.calculateSize(content),
        content,
        metadata: {
          generated: new Date(),
          generatedBy: data.metadata.generatedBy,
          duration: Date.now() - startTime,
          templateId: template.id,
          options,
        },
        checksum: this.generateChecksum(content),
      };

      this.logger.info('レポート生成完了', {
        reportId,
        duration: report.metadata.duration,
        size: report.size,
      });

      this.emit('report:generated', report);
      return report;
    } catch (error) {
      this.logger.error(
        'レポート生成エラー',
        error instanceof Error ? error : new Error(String(error)),
        {
          reportId,
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
        }
      );
      throw error;
    }
  }

  /**
   * データのローカライズ
   */
  private async localizeData(
    data: ReportData,
    language: string
  ): Promise<ReportData> {
    // 言語を切り替え
    const previousLanguage = this.i18nManager.getCurrentLanguage();
    if (language !== previousLanguage) {
      await this.i18nManager.changeLanguage(language);
    }

    // タイトルとサブタイトルの翻訳
    const localizedData: ReportData = {
      ...data,
      title: this.i18nManager.translate(data.title, 'reports'),
      subtitle: data.subtitle
        ? this.i18nManager.translate(data.subtitle, 'reports')
        : undefined,
    };

    // セクションデータのローカライズ
    localizedData.sections = data.sections.map(section => ({
      ...section,
      data: this.localizeObject(section.data, language),
    }));

    // サマリーのローカライズ
    if (data.summary) {
      localizedData.summary = {
        ...data.summary,
        highlights: data.summary.highlights.map(h =>
          this.i18nManager.translate(h, 'reports')
        ),
        recommendations: data.summary.recommendations.map(r =>
          this.i18nManager.translate(r, 'reports')
        ),
      };
    }

    // 言語を元に戻す
    if (language !== previousLanguage) {
      await this.i18nManager.changeLanguage(previousLanguage);
    }

    return localizedData;
  }

  /**
   * オブジェクトのローカライズ
   */
  private localizeObject(obj: unknown, language: string): unknown {
    if (typeof obj === 'string') {
      // 翻訳キーの場合は翻訳
      if (obj.startsWith('i18n:')) {
        const key = obj.substring(5);
        return this.i18nManager.translate(key, 'reports');
      }
      return obj;
    }

    if (typeof obj === 'number') {
      // 数値のフォーマット
      return this.i18nManager.formatNumber(obj);
    }

    if (obj instanceof Date) {
      // 日付のフォーマット
      return this.i18nManager.formatDateTime(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.localizeObject(item, language));
    }

    if (typeof obj === 'object' && obj !== null) {
      const localized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        localized[key] = this.localizeObject(value, language);
      }
      return localized;
    }

    return obj;
  }

  /**
   * セクションの処理
   */
  private async processSections(
    sections: ReportSection[],
    data: ReportData,
    options: ReportOptions
  ): Promise<ReportSection[]> {
    const processedSections: ReportSection[] = [];

    for (const section of sections) {
      // 条件の評価
      if (section.conditions) {
        const shouldInclude = this.evaluateConditions(section.conditions, data);
        if (!shouldInclude) {
          continue;
        }
      }

      // セクションデータの取得
      const sectionData = this.getSectionData(section, data);

      // ローカライズ設定の適用
      const processedSection: ReportSection = {
        ...section,
        title: this.i18nManager.translate(section.title, 'reports'),
        content: this.processContent(section, sectionData, options),
      };

      processedSections.push(processedSection);
    }

    return processedSections;
  }

  /**
   * 条件の評価
   */
  private evaluateConditions(
    conditions: Array<{
      field: string;
      operator: string;
      value: unknown;
      action: string;
    }>,
    data: ReportData
  ): boolean {
    for (const condition of conditions) {
      const fieldValue = this.getFieldValue(data, condition.field);
      const result = this.compareValues(
        fieldValue,
        condition.operator,
        condition.value
      );

      if (!result && condition.action === 'show') {
        return false;
      }
      if (result && condition.action === 'hide') {
        return false;
      }
    }

    return true;
  }

  /**
   * フィールド値の取得
   */
  private getFieldValue(data: unknown, fieldPath: string): unknown {
    const parts = fieldPath.split('.');
    let value = data;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * 値の比較
   */
  private compareValues(
    value: unknown,
    operator: string,
    compareValue: unknown
  ): boolean {
    switch (operator) {
      case 'equals':
        return value === compareValue;
      case 'not_equals':
        return value !== compareValue;
      case 'contains':
        return String(value).includes(String(compareValue));
      case 'not_contains':
        return !String(value).includes(String(compareValue));
      case 'greater_than':
        return Number(value) > Number(compareValue);
      case 'less_than':
        return Number(value) < Number(compareValue);
      default:
        return false;
    }
  }

  /**
   * セクションデータの取得
   */
  private getSectionData(section: ReportSection, data: ReportData): unknown {
    const sectionData = data.sections.find(s => s.id === section.id);
    return sectionData?.data || {};
  }

  /**
   * コンテンツの処理
   */
  private processContent(
    section: ReportSection,
    data: unknown,
    options: ReportOptions
  ): unknown {
    switch (section.type) {
      case 'table':
        return this.processTableContent(section, data);
      case 'chart':
        return options.includeCharts
          ? this.processChartContent(section, data)
          : null;
      case 'metrics':
        return this.processMetricsContent(section, data);
      case 'list':
        return this.processListContent(section, data);
      default:
        return section.content;
    }
  }

  /**
   * テーブルコンテンツの処理
   */
  private processTableContent(section: ReportSection, data: unknown): unknown {
    const columns = section.content.columns || [];
    const rows = Array.isArray(data) ? data : (data as any)?.rows || [];

    return {
      columns: columns.map((col: string) => ({
        key: col,
        label: this.i18nManager.translate(`column.${col}`, 'reports'),
      })),
      rows: rows.map((row: any) => {
        const processedRow: Record<string, string> = {};
        for (const col of columns) {
          processedRow[col] = this.formatCellValue(row[col], col);
        }
        return processedRow;
      }),
    };
  }

  /**
   * チャートコンテンツの処理
   */
  private processChartContent(section: ReportSection, data: unknown): unknown {
    return {
      type: section.content.chartType,
      data: data,
      options: {
        title: section.title,
        ...section.content.options,
      },
    };
  }

  /**
   * メトリクスコンテンツの処理
   */
  private processMetricsContent(section: ReportSection, data: unknown): unknown {
    const metrics = section.content.metrics || [];
    const processedMetrics: Array<{key: string; label: string; value: string}> = [];

    for (const metric of metrics) {
      const value = (data as any)?.[metric];
      if (value !== undefined) {
        processedMetrics.push({
          key: metric,
          label: this.i18nManager.translate(`metric.${metric}`, 'reports'),
          value: this.formatMetricValue(value, metric),
        });
      }
    }

    return processedMetrics;
  }

  /**
   * リストコンテンツの処理
   */
  private processListContent(section: ReportSection, data: unknown): unknown {
    const items = Array.isArray(data) ? data : (data as any)?.items || [];

    return {
      ordered: section.content.ordered || false,
      items: items.map((item: any) =>
        typeof item === 'string' ? item : item.text || String(item)
      ),
    };
  }

  /**
   * セル値のフォーマット
   */
  private formatCellValue(value: unknown, column: string): string {
    if (value === null || value === undefined) {
      return '-';
    }

    // 特定の列に対する特別なフォーマット
    if (column.includes('time') || column.includes('date')) {
      return this.i18nManager.formatDateTime(value as Date | string | number);
    }
    if (column.includes('size') || column.includes('bytes')) {
      return this.i18nManager.formatFileSize(value as number);
    }
    if (column.includes('percent') || column.includes('rate')) {
      return this.i18nManager.formatPercentage((value as number) / 100);
    }
    if (typeof value === 'number') {
      return this.i18nManager.formatNumber(value);
    }

    return String(value);
  }

  /**
   * メトリクス値のフォーマット
   */
  private formatMetricValue(value: unknown, metric: string): string {
    if (metric.includes('time')) {
      return `${this.i18nManager.formatNumber(value as number)} ms`;
    }
    if (metric.includes('rate') || metric.includes('percent')) {
      return this.i18nManager.formatPercentage((value as number) / 100);
    }
    if (metric.includes('size') || metric.includes('bytes')) {
      return this.i18nManager.formatFileSize(value as number);
    }
    if (typeof value === 'number') {
      return this.i18nManager.formatNumber(value);
    }
    return String(value);
  }

  /**
   * コンテンツの生成（フォーマット別）
   */
  private async generateContent(
    template: ReportTemplate,
    sections: ReportSection[],
    data: ReportData,
    options: ReportOptions
  ): Promise<Buffer | string> {
    // この例では簡単なJSON形式を返す
    // 実際の実装では、フォーマット別のエクスポーターを使用
    const content = {
      template: template.id,
      metadata: data.metadata,
      title: data.title,
      subtitle: data.subtitle,
      sections: sections,
      summary: data.summary,
      generated: new Date(),
    };

    return JSON.stringify(content, null, 2);
  }

  /**
   * レポートIDの生成
   */
  private generateReportId(): string {
    return `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * サイズの計算
   */
  private calculateSize(content: Buffer | string): number {
    return Buffer.isBuffer(content)
      ? content.length
      : Buffer.byteLength(content, 'utf-8');
  }

  /**
   * チェックサムの生成
   */
  private generateChecksum(content: Buffer | string): string {
    const hash = createHash('sha256');
    hash.update(content);
    return hash.digest('hex');
  }

  /**
   * レポート生成のキューイング
   */
  async queueGeneration(
    template: ReportTemplate,
    data: ReportData,
    options: ReportOptions
  ): Promise<string> {
    const id = this.generateReportId();

    this.generationQueue.push({
      id,
      template,
      data,
      options,
    });

    this.emit('report:queued', { id, position: this.generationQueue.length });

    // キューの処理を開始
    if (!this.isGenerating) {
      this.processQueue();
    }

    return id;
  }

  /**
   * キューの処理
   */
  private async processQueue(): Promise<void> {
    if (this.isGenerating || this.generationQueue.length === 0) {
      return;
    }

    this.isGenerating = true;

    while (this.generationQueue.length > 0) {
      const job = this.generationQueue.shift()!;

      try {
        await this.generate(job.template, job.data, job.options);
      } catch (error) {
        this.emit('report:error', {
          id: job.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    this.isGenerating = false;
  }
}
