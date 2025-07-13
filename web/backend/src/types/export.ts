/**
 * エクスポート機能関連の型定義
 */

export interface ExportRequest {
  type: 'dns_records' | 'change_history' | 'analysis_results' | 'statistics';
  format: 'csv' | 'excel' | 'pdf';
  filter?: {
    // DNS レコードのフィルター
    domain?: string;
    recordType?: string;
    riskLevel?: 'high' | 'medium' | 'low';
    
    // 変更履歴のフィルター
    changeType?: 'create' | 'update' | 'delete';
    source?: 'manual' | 'import' | 'api' | 'monitoring';
    dateFrom?: Date;
    dateTo?: Date;
    
    // 分析結果のフィルター
    analysisId?: string;
    
    // 共通フィルター
    limit?: number;
  };
  options?: {
    // Excel特有のオプション
    includeCharts?: boolean;
    worksheetName?: string;
    
    // PDF特有のオプション
    includeHeader?: boolean;
    includeFooter?: boolean;
    orientation?: 'portrait' | 'landscape';
    pageSize?: 'A4' | 'Letter' | 'Legal';
    
    // CSV特有のオプション
    delimiter?: string;
    encoding?: 'utf8' | 'shift_jis';
    includeBOM?: boolean;
    
    // 共通オプション
    includeMetadata?: boolean;
    customFileName?: string;
  };
}

export interface ExportResult {
  success: boolean;
  downloadUrl?: string;
  fileName: string;
  fileSize: number;
  format: string;
  recordCount: number;
  generatedAt: Date;
  expiresAt: Date;
  error?: string;
}

export interface ExportTemplate {
  name: string;
  description: string;
  type: ExportRequest['type'];
  format: ExportRequest['format'];
  defaultFilter: ExportRequest['filter'];
  defaultOptions: ExportRequest['options'];
}

export interface ExportMetadata {
  title: string;
  description: string;
  generatedBy: string;
  generatedAt: Date;
  source: string;
  version: string;
  recordCount: number;
  filterApplied: any;
}

// Excel固有の型
export interface ExcelExportOptions {
  worksheetName: string;
  includeCharts: boolean;
  autoFilter: boolean;
  freezeHeader: boolean;
  columnWidths?: { [column: string]: number };
  cellStyles?: {
    header?: any;
    data?: any;
    footer?: any;
  };
}

// PDF固有の型
export interface PdfExportOptions {
  title: string;
  orientation: 'portrait' | 'landscape';
  pageSize: 'A4' | 'Letter' | 'Legal';
  includeHeader: boolean;
  includeFooter: boolean;
  includePageNumbers: boolean;
  includeTableOfContents: boolean;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  fonts: {
    title: string;
    header: string;
    body: string;
  };
  colors: {
    primary: string;
    secondary: string;
    text: string;
    background: string;
  };
}

// CSV固有の型
export interface CsvExportOptions {
  delimiter: string;
  encoding: 'utf8' | 'shift_jis' | 'iso-8859-1';
  includeBOM: boolean;
  quoteAll: boolean;
  escapeQuotes: boolean;
  lineTerminator: '\n' | '\r\n';
}

export interface ExportService {
  exportToCsv(data: any[], options?: CsvExportOptions): Promise<Buffer>;
  exportToExcel(data: any[], options?: ExcelExportOptions): Promise<Buffer>;
  exportToPdf(data: any[], metadata: ExportMetadata, options?: PdfExportOptions): Promise<Buffer>;
  createExportRequest(request: ExportRequest): Promise<ExportResult>;
  getExportTemplates(): ExportTemplate[];
  generateFileName(type: string, format: string, timestamp: Date): string;
}