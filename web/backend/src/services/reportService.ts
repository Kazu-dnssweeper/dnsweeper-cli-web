/**
 * DNSweeper レポート生成サービス
 * 
 * PDF・Excel・CSV・JSON形式でのレポート生成機能
 */

import { EventEmitter } from 'events';
import * as PDFDocument from 'pdfkit';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { Account } from '../types/auth';

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'risk_analysis' | 'performance' | 'compliance' | 'security' | 'custom';
  category: 'dns' | 'security' | 'performance' | 'compliance';
  config: {
    sections: ReportSection[];
    filters: ReportFilter[];
    charts: ChartConfig[];
    exportFormats: ('pdf' | 'excel' | 'csv' | 'json')[];
  };
  isBuiltIn: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'summary' | 'table' | 'chart' | 'list' | 'metrics';
  dataSource: string;
  config: Record<string, any>;
  order: number;
}

export interface ReportFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in';
  value: any;
  label: string;
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'scatter';
  dataSource: string;
  xAxis: string;
  yAxis: string;
  groupBy?: string;
  aggregation: 'count' | 'sum' | 'avg' | 'min' | 'max';
}

export interface GeneratedReport {
  id: string;
  accountId: string;
  templateId: string;
  templateName: string;
  title: string;
  description?: string;
  status: 'generating' | 'completed' | 'failed' | 'scheduled';
  progress: number;
  generatedAt?: Date;
  generatedBy: string;
  config: {
    dateRange: {
      from: Date;
      to: Date;
    };
    filters: Record<string, any>;
    format: 'pdf' | 'excel' | 'csv' | 'json';
  };
  results?: {
    totalPages: number;
    totalRecords: number;
    fileSize: number;
    downloadUrl: string;
    filePath: string;
  };
  error?: string;
  scheduledFor?: Date;
  isRecurring?: boolean;
  recurringPattern?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    interval: number;
    endDate?: Date;
  };
}

export interface ReportData {
  summary: {
    totalRecords: number;
    riskSummary: {
      high: number;
      medium: number;
      low: number;
      none: number;
    };
    performanceMetrics: {
      avgResponseTime: number;
      successRate: number;
      errorRate: number;
    };
  };
  records: DNSRecordAnalysis[];
  charts: ChartData[];
  metadata: {
    generatedAt: Date;
    dateRange: {
      from: Date;
      to: Date;
    };
    filters: Record<string, any>;
  };
}

export interface DNSRecordAnalysis {
  id: string;
  name: string;
  type: string;
  content: string;
  ttl: number;
  riskScore: number;
  riskLevel: 'high' | 'medium' | 'low' | 'none';
  issues: string[];
  recommendations: string[];
  lastModified: Date;
  performanceMetrics?: {
    responseTime: number;
    successRate: number;
    errorCount: number;
  };
}

export interface ChartData {
  id: string;
  title: string;
  type: 'bar' | 'line' | 'pie' | 'doughnut';
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor?: string[];
      borderColor?: string[];
    }[];
  };
}

export class ReportService extends EventEmitter {
  private templates: Map<string, ReportTemplate> = new Map();
  private reports: Map<string, GeneratedReport> = new Map();
  private reportsDir: string;

  constructor() {
    super();
    this.reportsDir = path.join(process.cwd(), 'storage', 'reports');
    this.initializeDefaultTemplates();
    this.ensureReportsDirectory();
  }

  /**
   * レポート保存ディレクトリの確保
   */
  private async ensureReportsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create reports directory:', error);
    }
  }

  /**
   * デフォルトテンプレートの初期化
   */
  private initializeDefaultTemplates(): void {
    const defaultTemplates: ReportTemplate[] = [
      {
        id: 'risk_analysis_standard',
        name: 'DNSリスク分析レポート',
        description: 'DNS設定のリスク要因を包括的に分析し、改善提案を含むレポート',
        type: 'risk_analysis',
        category: 'security',
        config: {
          sections: [
            {
              id: 'summary',
              title: 'エグゼクティブサマリー',
              type: 'summary',
              dataSource: 'risk_summary',
              config: { includeRecommendations: true },
              order: 1
            },
            {
              id: 'risk_table',
              title: 'リスク詳細一覧',
              type: 'table',
              dataSource: 'dns_records',
              config: { 
                columns: ['name', 'type', 'riskScore', 'issues'],
                sortBy: 'riskScore',
                sortOrder: 'desc'
              },
              order: 2
            },
            {
              id: 'risk_chart',
              title: 'リスクスコア分布',
              type: 'chart',
              dataSource: 'risk_distribution',
              config: { chartType: 'bar' },
              order: 3
            }
          ],
          filters: [
            {
              field: 'riskScore',
              operator: 'greater_than',
              value: 0,
              label: 'リスクスコア'
            }
          ],
          charts: [
            {
              type: 'bar',
              dataSource: 'risk_distribution',
              xAxis: 'riskLevel',
              yAxis: 'count',
              aggregation: 'count'
            }
          ],
          exportFormats: ['pdf', 'excel', 'csv']
        },
        isBuiltIn: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'performance_analysis',
        name: 'DNS パフォーマンス分析',
        description: 'DNS解決時間、応答率、地域別パフォーマンスの詳細分析',
        type: 'performance',
        category: 'performance',
        config: {
          sections: [
            {
              id: 'perf_summary',
              title: 'パフォーマンス概要',
              type: 'metrics',
              dataSource: 'performance_metrics',
              config: {},
              order: 1
            },
            {
              id: 'response_time_chart',
              title: '応答時間トレンド',
              type: 'chart',
              dataSource: 'response_times',
              config: { chartType: 'line' },
              order: 2
            }
          ],
          filters: [],
          charts: [
            {
              type: 'line',
              dataSource: 'response_times',
              xAxis: 'timestamp',
              yAxis: 'responseTime',
              aggregation: 'avg'
            }
          ],
          exportFormats: ['pdf', 'excel']
        },
        isBuiltIn: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * レポート生成
   */
  async generateReport(
    account: Account,
    templateId: string,
    config: {
      title: string;
      description?: string;
      dateRange: { from: Date; to: Date };
      filters: Record<string, any>;
      format: 'pdf' | 'excel' | 'csv' | 'json';
    }
  ): Promise<string> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const report: GeneratedReport = {
      id: reportId,
      accountId: account.id,
      templateId,
      templateName: template.name,
      title: config.title,
      description: config.description,
      status: 'generating',
      progress: 0,
      generatedBy: account.email,
      config
    };

    this.reports.set(reportId, report);
    this.emit('reportStarted', report);

    // 非同期でレポート生成を実行
    this.executeReportGeneration(reportId).catch(error => {
      console.error(`Report generation failed for ${reportId}:`, error);
      report.status = 'failed';
      report.error = error.message;
      this.emit('reportFailed', report);
    });

    return reportId;
  }

  /**
   * レポート生成の実行
   */
  private async executeReportGeneration(reportId: string): Promise<void> {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    const template = this.templates.get(report.templateId);
    if (!template) {
      throw new Error(`Template ${report.templateId} not found`);
    }

    try {
      // データ収集
      report.progress = 10;
      this.emit('reportProgress', report);
      
      const data = await this.collectReportData(template, report.config);
      
      // レポート生成
      report.progress = 50;
      this.emit('reportProgress', report);
      
      const result = await this.generateReportFile(template, data, report.config.format);
      
      // ファイル保存
      report.progress = 90;
      this.emit('reportProgress', report);
      
      const filePath = path.join(this.reportsDir, `${reportId}.${report.config.format}`);
      await fs.writeFile(filePath, result.buffer);
      
      const stats = await fs.stat(filePath);
      
      report.status = 'completed';
      report.progress = 100;
      report.generatedAt = new Date();
      report.results = {
        totalPages: result.totalPages,
        totalRecords: data.summary.totalRecords,
        fileSize: stats.size,
        downloadUrl: `/api/reports/${reportId}/download`,
        filePath
      };

      this.emit('reportCompleted', report);

    } catch (error: any) {
      report.status = 'failed';
      report.error = error.message;
      throw error;
    }
  }

  /**
   * レポートデータの収集
   */
  private async collectReportData(
    template: ReportTemplate,
    config: GeneratedReport['config']
  ): Promise<ReportData> {
    // TODO: 実際のデータベースからデータを取得
    // 現在はモックデータを返す

    const mockRecords: DNSRecordAnalysis[] = [
      {
        id: 'rec_1',
        name: 'example.com',
        type: 'A',
        content: '192.0.2.1',
        ttl: 3600,
        riskScore: 7.5,
        riskLevel: 'high',
        issues: ['低いTTL値', 'セキュリティヘッダー不足'],
        recommendations: ['TTL値を14400に増加', 'CAA レコードの追加'],
        lastModified: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        performanceMetrics: {
          responseTime: 45.2,
          successRate: 99.1,
          errorCount: 3
        }
      },
      {
        id: 'rec_2',
        name: 'www.example.com',
        type: 'CNAME',
        content: 'example.com',
        ttl: 1800,
        riskScore: 4.2,
        riskLevel: 'medium',
        issues: ['短いTTL値'],
        recommendations: ['TTL値の最適化'],
        lastModified: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        performanceMetrics: {
          responseTime: 38.7,
          successRate: 99.8,
          errorCount: 1
        }
      }
    ];

    const data: ReportData = {
      summary: {
        totalRecords: mockRecords.length,
        riskSummary: {
          high: mockRecords.filter(r => r.riskLevel === 'high').length,
          medium: mockRecords.filter(r => r.riskLevel === 'medium').length,
          low: mockRecords.filter(r => r.riskLevel === 'low').length,
          none: mockRecords.filter(r => r.riskLevel === 'none').length
        },
        performanceMetrics: {
          avgResponseTime: mockRecords.reduce((sum, r) => sum + (r.performanceMetrics?.responseTime || 0), 0) / mockRecords.length,
          successRate: mockRecords.reduce((sum, r) => sum + (r.performanceMetrics?.successRate || 0), 0) / mockRecords.length,
          errorRate: mockRecords.reduce((sum, r) => sum + (r.performanceMetrics?.errorCount || 0), 0) / mockRecords.length
        }
      },
      records: mockRecords,
      charts: [
        {
          id: 'risk_distribution',
          title: 'リスクレベル分布',
          type: 'pie',
          data: {
            labels: ['高リスク', '中リスク', '低リスク', 'リスクなし'],
            datasets: [{
              label: 'レコード数',
              data: [
                mockRecords.filter(r => r.riskLevel === 'high').length,
                mockRecords.filter(r => r.riskLevel === 'medium').length,
                mockRecords.filter(r => r.riskLevel === 'low').length,
                mockRecords.filter(r => r.riskLevel === 'none').length
              ],
              backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#6b7280']
            }]
          }
        }
      ],
      metadata: {
        generatedAt: new Date(),
        dateRange: config.dateRange,
        filters: config.filters
      }
    };

    return data;
  }

  /**
   * レポートファイル生成
   */
  private async generateReportFile(
    template: ReportTemplate,
    data: ReportData,
    format: 'pdf' | 'excel' | 'csv' | 'json'
  ): Promise<{ buffer: Buffer; totalPages: number }> {
    switch (format) {
      case 'pdf':
        return this.generatePDFReport(template, data);
      case 'excel':
        return this.generateExcelReport(template, data);
      case 'csv':
        return this.generateCSVReport(template, data);
      case 'json':
        return this.generateJSONReport(template, data);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * PDF レポート生成
   */
  private async generatePDFReport(
    template: ReportTemplate,
    data: ReportData
  ): Promise<{ buffer: Buffer; totalPages: number }> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const buffer = Buffer.concat(buffers);
          resolve({ buffer, totalPages: doc.bufferedPageRange().count });
        });

        // ヘッダー
        doc.fontSize(20).text(template.name, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`生成日時: ${data.metadata.generatedAt.toLocaleString('ja-JP')}`, { align: 'center' });
        doc.moveDown(2);

        // サマリーセクション
        doc.fontSize(16).text('概要', { underline: true });
        doc.moveDown();
        doc.fontSize(12);
        doc.text(`総レコード数: ${data.summary.totalRecords}`);
        doc.text(`高リスク: ${data.summary.riskSummary.high}件`);
        doc.text(`中リスク: ${data.summary.riskSummary.medium}件`);
        doc.text(`低リスク: ${data.summary.riskSummary.low}件`);
        doc.text(`平均応答時間: ${data.summary.performanceMetrics.avgResponseTime.toFixed(2)}ms`);
        doc.moveDown(2);

        // テーブルセクション
        doc.fontSize(16).text('詳細データ', { underline: true });
        doc.moveDown();

        // シンプルなテーブル表示
        const tableTop = doc.y;
        const itemHeight = 20;
        
        // ヘッダー
        doc.fontSize(10);
        doc.text('名前', 50, tableTop, { width: 120 });
        doc.text('タイプ', 170, tableTop, { width: 50 });
        doc.text('リスクスコア', 220, tableTop, { width: 80 });
        doc.text('問題点', 300, tableTop, { width: 200 });

        // データ行
        data.records.forEach((record, index) => {
          const y = tableTop + (index + 1) * itemHeight;
          doc.text(record.name, 50, y, { width: 120 });
          doc.text(record.type, 170, y, { width: 50 });
          doc.text(record.riskScore.toString(), 220, y, { width: 80 });
          doc.text(record.issues.join(', '), 300, y, { width: 200 });
        });

        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Excel レポート生成
   */
  private async generateExcelReport(
    template: ReportTemplate,
    data: ReportData
  ): Promise<{ buffer: Buffer; totalPages: number }> {
    const workbook = new ExcelJS.Workbook();
    
    // サマリーシート
    const summarySheet = workbook.addWorksheet('概要');
    summarySheet.addRow(['項目', '値']);
    summarySheet.addRow(['総レコード数', data.summary.totalRecords]);
    summarySheet.addRow(['高リスク', data.summary.riskSummary.high]);
    summarySheet.addRow(['中リスク', data.summary.riskSummary.medium]);
    summarySheet.addRow(['低リスク', data.summary.riskSummary.low]);
    summarySheet.addRow(['平均応答時間 (ms)', data.summary.performanceMetrics.avgResponseTime]);

    // 詳細データシート
    const detailSheet = workbook.addWorksheet('詳細データ');
    detailSheet.addRow(['名前', 'タイプ', 'コンテンツ', 'TTL', 'リスクスコア', 'リスクレベル', '問題点', '推奨事項']);
    
    data.records.forEach(record => {
      detailSheet.addRow([
        record.name,
        record.type,
        record.content,
        record.ttl,
        record.riskScore,
        record.riskLevel,
        record.issues.join(', '),
        record.recommendations.join(', ')
      ]);
    });

    // スタイル設定
    summarySheet.getRow(1).font = { bold: true };
    detailSheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer() as Buffer;
    return { buffer, totalPages: 1 };
  }

  /**
   * CSV レポート生成
   */
  private async generateCSVReport(
    template: ReportTemplate,
    data: ReportData
  ): Promise<{ buffer: Buffer; totalPages: number }> {
    const lines = [
      'Name,Type,Content,TTL,RiskScore,RiskLevel,Issues,Recommendations'
    ];

    data.records.forEach(record => {
      lines.push([
        record.name,
        record.type,
        record.content,
        record.ttl.toString(),
        record.riskScore.toString(),
        record.riskLevel,
        `"${record.issues.join(', ')}"`,
        `"${record.recommendations.join(', ')}"`
      ].join(','));
    });

    const buffer = Buffer.from(lines.join('\n'), 'utf-8');
    return { buffer, totalPages: 1 };
  }

  /**
   * JSON レポート生成
   */
  private async generateJSONReport(
    template: ReportTemplate,
    data: ReportData
  ): Promise<{ buffer: Buffer; totalPages: number }> {
    const reportData = {
      template: {
        id: template.id,
        name: template.name,
        type: template.type
      },
      metadata: data.metadata,
      summary: data.summary,
      records: data.records,
      charts: data.charts
    };

    const buffer = Buffer.from(JSON.stringify(reportData, null, 2), 'utf-8');
    return { buffer, totalPages: 1 };
  }

  /**
   * レポート取得
   */
  getReport(reportId: string): GeneratedReport | undefined {
    return this.reports.get(reportId);
  }

  /**
   * アカウント別レポート一覧取得
   */
  getReportsByAccount(accountId: string): GeneratedReport[] {
    return Array.from(this.reports.values())
      .filter(report => report.accountId === accountId)
      .sort((a, b) => (b.generatedAt?.getTime() || 0) - (a.generatedAt?.getTime() || 0));
  }

  /**
   * テンプレート一覧取得
   */
  getTemplates(): ReportTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * レポートファイルの取得
   */
  async getReportFile(reportId: string): Promise<Buffer> {
    const report = this.reports.get(reportId);
    if (!report || !report.results?.filePath) {
      throw new Error(`Report file not found: ${reportId}`);
    }

    return fs.readFile(report.results.filePath);
  }

  /**
   * レポート削除
   */
  async deleteReport(reportId: string, accountId: string): Promise<void> {
    const report = this.reports.get(reportId);
    if (!report) {
      throw new Error(`Report not found: ${reportId}`);
    }

    if (report.accountId !== accountId) {
      throw new Error('Unauthorized to delete this report');
    }

    // ファイル削除
    if (report.results?.filePath) {
      try {
        await fs.unlink(report.results.filePath);
      } catch (error) {
        console.error(`Failed to delete report file: ${report.results.filePath}`, error);
      }
    }

    // メモリから削除
    this.reports.delete(reportId);
    this.emit('reportDeleted', report);
  }
}

// グローバルインスタンス
export const reportService = new ReportService();