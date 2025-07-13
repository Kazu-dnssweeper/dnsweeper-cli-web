import * as fs from 'fs';
import * as path from 'path';
import { 
  ExportRequest, 
  ExportResult, 
  ExportService, 
  ExportTemplate,
  ExportMetadata,
  CsvExportOptions,
  ExcelExportOptions,
  PdfExportOptions
} from '../types/export';

/**
 * エクスポート機能サービス
 * CSV、Excel、PDF形式でのデータエクスポートを提供
 */
class DataExportService implements ExportService {
  private exportDir: string;
  private baseUrl: string;

  constructor() {
    this.exportDir = process.env.EXPORT_DIR || path.join(process.cwd(), 'exports');
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    
    // エクスポートディレクトリを確保
    this.ensureExportDirectory();
  }

  private ensureExportDirectory(): void {
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  async exportToCsv(data: any[], options: CsvExportOptions = {} as CsvExportOptions): Promise<Buffer> {
    const defaultOptions: CsvExportOptions = {
      delimiter: ',',
      encoding: 'utf8',
      includeBOM: true,
      quoteAll: false,
      escapeQuotes: true,
      lineTerminator: '\n'
    };

    const opts = { ...defaultOptions, ...options };

    if (data.length === 0) {
      return Buffer.from('', opts.encoding);
    }

    // ヘッダー行の生成
    const headers = Object.keys(data[0]);
    let csvContent = this.formatCsvRow(headers, opts);

    // データ行の生成
    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        if (value instanceof Date) {
          return value.toISOString();
        }
        return value?.toString() || '';
      });
      csvContent += opts.lineTerminator + this.formatCsvRow(values, opts);
    }

    // BOM付きの場合
    if (opts.includeBOM && opts.encoding === 'utf8') {
      const bom = Buffer.from('\uFEFF', 'utf8');
      const content = Buffer.from(csvContent, opts.encoding);
      return Buffer.concat([bom, content]);
    }

    return Buffer.from(csvContent, opts.encoding);
  }

  private formatCsvRow(values: string[], options: CsvExportOptions): string {
    return values.map(value => {
      const stringValue = value.toString();
      
      // クォートが必要かチェック
      const needsQuoting = options.quoteAll || 
                          stringValue.includes(options.delimiter) ||
                          stringValue.includes('"') ||
                          stringValue.includes('\n') ||
                          stringValue.includes('\r');

      if (needsQuoting) {
        // 内部のクォートをエスケープ
        const escapedValue = options.escapeQuotes 
          ? stringValue.replace(/"/g, '""')
          : stringValue;
        return `"${escapedValue}"`;
      }

      return stringValue;
    }).join(options.delimiter);
  }

  async exportToExcel(data: any[], options: ExcelExportOptions = {} as ExcelExportOptions): Promise<Buffer> {
    // ExcelJS実装の代替（プレースホルダー）
    // 実際の実装では ExcelJS を使用
    const excelData = this.createExcelLikeStructure(data, options);
    return Buffer.from(JSON.stringify(excelData, null, 2), 'utf8');
  }

  private createExcelLikeStructure(data: any[], options: ExcelExportOptions) {
    const workbook = {
      worksheets: [
        {
          name: options.worksheetName || 'Data',
          headers: data.length > 0 ? Object.keys(data[0]) : [],
          rows: data.map(row => Object.values(row)),
          options: {
            autoFilter: options.autoFilter || true,
            freezeHeader: options.freezeHeader || true,
            columnWidths: options.columnWidths || {}
          }
        }
      ],
      metadata: {
        creator: 'DNSweeper Export Service',
        created: new Date().toISOString(),
        modified: new Date().toISOString()
      }
    };

    return workbook;
  }

  async exportToPdf(data: any[], metadata: ExportMetadata, options: PdfExportOptions = {} as PdfExportOptions): Promise<Buffer> {
    // PDFKit実装の代替（プレースホルダー）
    // 実際の実装では PDFKit を使用
    const pdfData = this.createPdfLikeStructure(data, metadata, options);
    return Buffer.from(JSON.stringify(pdfData, null, 2), 'utf8');
  }

  private createPdfLikeStructure(data: any[], metadata: ExportMetadata, options: PdfExportOptions) {
    const pdfStructure = {
      document: {
        title: options.title || metadata.title,
        author: metadata.generatedBy,
        subject: metadata.description,
        creator: 'DNSweeper Export Service',
        producer: 'DNSweeper PDF Generator'
      },
      pages: [
        {
          orientation: options.orientation || 'portrait',
          size: options.pageSize || 'A4',
          margins: options.margins || { top: 72, bottom: 72, left: 72, right: 72 },
          content: {
            header: options.includeHeader ? this.generatePdfHeader(metadata) : null,
            body: this.generatePdfBody(data),
            footer: options.includeFooter ? this.generatePdfFooter(metadata) : null
          }
        }
      ],
      styles: {
        fonts: options.fonts || { title: 'Helvetica-Bold', header: 'Helvetica', body: 'Helvetica' },
        colors: options.colors || { primary: '#333333', secondary: '#666666', text: '#000000', background: '#ffffff' }
      }
    };

    return pdfStructure;
  }

  private generatePdfHeader(metadata: ExportMetadata) {
    return {
      title: metadata.title,
      subtitle: metadata.description,
      timestamp: metadata.generatedAt.toISOString(),
      recordCount: metadata.recordCount
    };
  }

  private generatePdfBody(data: any[]) {
    if (data.length === 0) {
      return { message: 'データがありません' };
    }

    const headers = Object.keys(data[0]);
    return {
      table: {
        headers,
        rows: data.map(row => headers.map(header => row[header]?.toString() || ''))
      }
    };
  }

  private generatePdfFooter(metadata: ExportMetadata) {
    return {
      generatedBy: `Generated by ${metadata.generatedBy}`,
      timestamp: metadata.generatedAt.toISOString(),
      version: metadata.version,
      pageNumbers: true
    };
  }

  async createExportRequest(request: ExportRequest): Promise<ExportResult> {
    try {
      // データを取得（実装に応じて適切なサービスから取得）
      const data = await this.fetchDataForExport(request);
      
      // メタデータを生成
      const metadata: ExportMetadata = {
        title: this.generateTitle(request),
        description: this.generateDescription(request),
        generatedBy: 'DNSweeper Export Service',
        generatedAt: new Date(),
        source: 'DNSweeper Web Application',
        version: '1.0.0',
        recordCount: data.length,
        filterApplied: request.filter || {}
      };

      // ファイル名を生成
      const fileName = request.options?.customFileName || 
                     this.generateFileName(request.type, request.format, new Date());

      // 形式に応じてデータを変換
      let buffer: Buffer;
      switch (request.format) {
        case 'csv':
          buffer = await this.exportToCsv(data, request.options as CsvExportOptions);
          break;
        case 'excel':
          buffer = await this.exportToExcel(data, request.options as ExcelExportOptions);
          break;
        case 'pdf':
          buffer = await this.exportToPdf(data, metadata, request.options as PdfExportOptions);
          break;
        default:
          throw new Error(`Unsupported export format: ${request.format}`);
      }

      // ファイルを保存
      const filePath = path.join(this.exportDir, fileName);
      fs.writeFileSync(filePath, buffer);

      // ダウンロードURLを生成
      const downloadUrl = `${this.baseUrl}/api/export/download/${fileName}`;

      // 1時間後に期限切れ
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      return {
        success: true,
        downloadUrl,
        fileName,
        fileSize: buffer.length,
        format: request.format,
        recordCount: data.length,
        generatedAt: metadata.generatedAt,
        expiresAt
      };

    } catch (error) {
      console.error('Export request failed:', error);
      return {
        success: false,
        fileName: '',
        fileSize: 0,
        format: request.format,
        recordCount: 0,
        generatedAt: new Date(),
        expiresAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async fetchDataForExport(request: ExportRequest): Promise<any[]> {
    // 実際の実装では、request.typeに応じて適切なサービスからデータを取得
    // ここではサンプルデータを返す
    switch (request.type) {
      case 'dns_records':
        return this.getSampleDnsRecords();
      case 'change_history':
        return this.getSampleChangeHistory();
      case 'analysis_results':
        return this.getSampleAnalysisResults();
      case 'statistics':
        return this.getSampleStatistics();
      default:
        return [];
    }
  }

  private getSampleDnsRecords() {
    return [
      { domain: 'example.com', type: 'A', value: '192.168.1.1', ttl: 3600, lastUpdated: new Date() },
      { domain: 'www.example.com', type: 'CNAME', value: 'example.com', ttl: 3600, lastUpdated: new Date() },
      { domain: 'mail.example.com', type: 'MX', value: '10 mail.example.com', ttl: 7200, lastUpdated: new Date() }
    ];
  }

  private getSampleChangeHistory() {
    return [
      { 
        domain: 'example.com', 
        changeType: 'update', 
        previousValue: '192.168.1.1', 
        newValue: '192.168.1.2',
        timestamp: new Date(), 
        source: 'manual' 
      }
    ];
  }

  private getSampleAnalysisResults() {
    return [
      { domain: 'example.com', riskScore: 7.5, issues: ['High TTL', 'No DNSSEC'], recommendations: ['Lower TTL', 'Enable DNSSEC'] }
    ];
  }

  private getSampleStatistics() {
    return [
      { metric: 'Total Records', value: 1250 },
      { metric: 'High Risk Records', value: 45 },
      { metric: 'Medium Risk Records', value: 127 }
    ];
  }

  private generateTitle(request: ExportRequest): string {
    const typeNames = {
      dns_records: 'DNS レコード',
      change_history: '変更履歴', 
      analysis_results: '分析結果',
      statistics: '統計情報'
    };
    return typeNames[request.type] || 'データエクスポート';
  }

  private generateDescription(request: ExportRequest): string {
    const title = this.generateTitle(request);
    const date = new Date().toLocaleDateString('ja-JP');
    return `${title} - ${date}にエクスポート`;
  }

  generateFileName(type: string, format: string, timestamp: Date): string {
    const dateStr = timestamp.toISOString().split('T')[0];
    const timeStr = timestamp.toTimeString().split(' ')[0].replace(/:/g, '');
    return `dnsweeper_${type}_${dateStr}_${timeStr}.${format}`;
  }

  getExportTemplates(): ExportTemplate[] {
    return [
      {
        name: 'DNS レコード一覧',
        description: 'すべてのDNSレコードをエクスポート',
        type: 'dns_records',
        format: 'csv',
        defaultFilter: {},
        defaultOptions: { includeMetadata: true }
      },
      {
        name: '変更履歴レポート',
        description: '過去30日間の変更履歴',
        type: 'change_history',
        format: 'excel',
        defaultFilter: { 
          dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          dateTo: new Date()
        },
        defaultOptions: { includeCharts: true }
      },
      {
        name: 'リスク分析レポート',
        description: '高リスクレコードの詳細分析',
        type: 'analysis_results',
        format: 'pdf',
        defaultFilter: { riskLevel: 'high' },
        defaultOptions: { 
          includeHeader: true, 
          includeFooter: true,
          orientation: 'landscape'
        }
      }
    ];
  }
}

// シングルトンインスタンス
export const exportService = new DataExportService();