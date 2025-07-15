/**
 * レポートテンプレート管理
 */

import { EventEmitter } from 'events';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

import type {
  ReportTemplate,
  ReportSection,
  ReportStyling,
} from '../core/types.js';

export class TemplateManager extends EventEmitter {
  private templates: Map<string, ReportTemplate> = new Map();
  private defaultTemplates: Map<string, ReportTemplate>;

  constructor() {
    super();
    this.defaultTemplates = this.initializeDefaultTemplates();
    this.loadTemplates();
  }

  /**
   * デフォルトテンプレートの初期化
   */
  private initializeDefaultTemplates(): Map<string, ReportTemplate> {
    const templates = new Map<string, ReportTemplate>();

    // セキュリティレポートテンプレート
    templates.set('security-basic', {
      id: 'security-basic',
      name: 'Basic Security Report',
      description: 'Standard security analysis report',
      language: 'en',
      category: 'security',
      sections: [
        {
          id: 'header',
          title: 'Security Analysis Report',
          type: 'header',
          content: {
            level: 1,
            showDate: true,
            showLogo: true,
          },
        },
        {
          id: 'summary',
          title: 'Executive Summary',
          type: 'summary',
          content: {
            fields: ['totalThreats', 'criticalIssues', 'recommendations'],
          },
        },
        {
          id: 'threats',
          title: 'Detected Threats',
          type: 'table',
          content: {
            columns: [
              'domain',
              'threatType',
              'severity',
              'confidence',
              'action',
            ],
          },
        },
        {
          id: 'recommendations',
          title: 'Recommendations',
          type: 'list',
          content: {
            ordered: true,
            prioritized: true,
          },
        },
      ],
      styling: this.getDefaultStyling('corporate'),
      metadata: {
        version: '1.0.0',
        author: 'DNSweeper',
        created: new Date(),
        lastModified: new Date(),
        supportedLanguages: ['en', 'ja', 'zh', 'es', 'fr', 'de'],
        supportedFormats: ['pdf', 'excel', 'html'],
      },
    });

    // パフォーマンスレポートテンプレート
    templates.set('performance-basic', {
      id: 'performance-basic',
      name: 'Basic Performance Report',
      description: 'DNS performance analysis report',
      language: 'en',
      category: 'performance',
      sections: [
        {
          id: 'header',
          title: 'Performance Analysis Report',
          type: 'header',
          content: {
            level: 1,
            showDate: true,
            showLogo: true,
          },
        },
        {
          id: 'metrics',
          title: 'Key Metrics',
          type: 'metrics',
          content: {
            metrics: [
              'avgResponseTime',
              'successRate',
              'errorRate',
              'throughput',
            ],
          },
        },
        {
          id: 'chart',
          title: 'Response Time Trends',
          type: 'chart',
          content: {
            chartType: 'line',
            dataSource: 'responseTimes',
            timeRange: '24h',
          },
        },
        {
          id: 'details',
          title: 'Detailed Analysis',
          type: 'table',
          content: {
            columns: ['domain', 'avgTime', 'minTime', 'maxTime', 'successRate'],
          },
        },
      ],
      styling: this.getDefaultStyling('minimal'),
      metadata: {
        version: '1.0.0',
        author: 'DNSweeper',
        created: new Date(),
        lastModified: new Date(),
        supportedLanguages: ['en', 'ja', 'zh', 'es', 'fr', 'de'],
        supportedFormats: ['pdf', 'excel', 'html', 'json'],
      },
    });

    // コンプライアンスレポートテンプレート
    templates.set('compliance-gdpr', {
      id: 'compliance-gdpr',
      name: 'GDPR Compliance Report',
      description: 'GDPR compliance audit report',
      language: 'en',
      category: 'compliance',
      sections: [
        {
          id: 'header',
          title: 'GDPR Compliance Audit Report',
          type: 'header',
          content: {
            level: 1,
            showDate: true,
            showLogo: true,
            disclaimer: true,
          },
        },
        {
          id: 'summary',
          title: 'Compliance Summary',
          type: 'summary',
          content: {
            fields: ['complianceScore', 'violations', 'recommendations'],
          },
        },
        {
          id: 'dataMapping',
          title: 'Data Processing Activities',
          type: 'table',
          content: {
            columns: [
              'domain',
              'dataType',
              'purpose',
              'legalBasis',
              'retention',
            ],
          },
        },
        {
          id: 'violations',
          title: 'Identified Violations',
          type: 'table',
          content: {
            columns: ['issue', 'severity', 'gdprArticle', 'recommendation'],
          },
          conditions: [
            {
              field: 'violations',
              operator: 'greater_than',
              value: 0,
              action: 'show',
            },
          ],
        },
      ],
      styling: this.getDefaultStyling('corporate'),
      metadata: {
        version: '1.0.0',
        author: 'DNSweeper',
        created: new Date(),
        lastModified: new Date(),
        supportedLanguages: ['en', 'de', 'fr', 'es', 'it'],
        supportedFormats: ['pdf', 'excel'],
      },
    });

    return templates;
  }

  /**
   * デフォルトスタイリングの取得
   */
  private getDefaultStyling(
    theme: 'light' | 'dark' | 'corporate' | 'minimal'
  ): ReportStyling {
    const styles: Record<string, ReportStyling> = {
      corporate: {
        theme: 'corporate',
        colors: {
          primary: '#1e3a8a',
          secondary: '#3730a3',
          accent: '#10b981',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          text: '#1f2937',
          background: '#ffffff',
        },
        fonts: {
          primary: 'Arial, sans-serif',
          secondary: 'Georgia, serif',
          monospace: 'Courier New, monospace',
          sizes: {
            small: 10,
            medium: 12,
            large: 16,
            xlarge: 20,
          },
        },
        layout: {
          pageSize: 'A4',
          orientation: 'portrait',
          margins: {
            top: 25,
            right: 25,
            bottom: 25,
            left: 25,
          },
        },
      },
      minimal: {
        theme: 'minimal',
        colors: {
          primary: '#000000',
          secondary: '#6b7280',
          accent: '#3b82f6',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          text: '#111827',
          background: '#ffffff',
        },
        fonts: {
          primary: 'Helvetica, Arial, sans-serif',
          secondary: 'Helvetica, Arial, sans-serif',
          monospace: 'Monaco, Consolas, monospace',
          sizes: {
            small: 9,
            medium: 11,
            large: 14,
            xlarge: 18,
          },
        },
        layout: {
          pageSize: 'A4',
          orientation: 'portrait',
          margins: {
            top: 20,
            right: 20,
            bottom: 20,
            left: 20,
          },
        },
      },
    };

    return styles[theme] || styles.corporate;
  }

  /**
   * テンプレートの読み込み
   */
  private loadTemplates(): void {
    // デフォルトテンプレートをロード
    for (const [id, template] of this.defaultTemplates) {
      this.templates.set(id, template);
    }

    // TODO: カスタムテンプレートをファイルから読み込む
  }

  /**
   * テンプレートの取得
   */
  getTemplate(id: string): ReportTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * カテゴリ別テンプレートの取得
   */
  getTemplatesByCategory(category: string): ReportTemplate[] {
    return Array.from(this.templates.values()).filter(
      t => t.category === category
    );
  }

  /**
   * 言語別テンプレートの取得
   */
  getTemplatesByLanguage(language: string): ReportTemplate[] {
    return Array.from(this.templates.values()).filter(t =>
      t.metadata.supportedLanguages.includes(language)
    );
  }

  /**
   * テンプレートの追加
   */
  addTemplate(template: ReportTemplate): void {
    this.templates.set(template.id, template);
    this.emit('template:added', { id: template.id, template });
  }

  /**
   * テンプレートの更新
   */
  updateTemplate(id: string, updates: Partial<ReportTemplate>): void {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }

    const updated = {
      ...template,
      ...updates,
      metadata: {
        ...template.metadata,
        lastModified: new Date(),
      },
    };

    this.templates.set(id, updated);
    this.emit('template:updated', { id, template: updated });
  }

  /**
   * テンプレートの削除
   */
  deleteTemplate(id: string): void {
    if (this.defaultTemplates.has(id)) {
      throw new Error(`Cannot delete default template: ${id}`);
    }

    const deleted = this.templates.delete(id);
    if (deleted) {
      this.emit('template:deleted', { id });
    }
  }

  /**
   * テンプレートのエクスポート
   */
  exportTemplate(id: string, filePath: string): void {
    const template = this.templates.get(id);
    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }

    writeFileSync(filePath, JSON.stringify(template, null, 2));
    this.emit('template:exported', { id, filePath });
  }

  /**
   * テンプレートのインポート
   */
  importTemplate(filePath: string): void {
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = readFileSync(filePath, 'utf-8');
    const template = JSON.parse(content) as ReportTemplate;

    // 日付を復元
    template.metadata.created = new Date(template.metadata.created);
    template.metadata.lastModified = new Date(template.metadata.lastModified);

    this.addTemplate(template);
    this.emit('template:imported', { id: template.id, filePath });
  }

  /**
   * すべてのテンプレートを取得
   */
  getAllTemplates(): ReportTemplate[] {
    return Array.from(this.templates.values());
  }
}
