/**
 * レポートシステム - 型定義
 */

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  language: string;
  category: 'security' | 'performance' | 'compliance' | 'summary' | 'custom';
  sections: ReportSection[];
  styling: ReportStyling;
  metadata: {
    version: string;
    author: string;
    created: Date;
    lastModified: Date;
    supportedLanguages: string[];
    supportedFormats: string[];
  };
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'header' | 'text' | 'table' | 'chart' | 'list' | 'metrics' | 'summary';
  content: any;
  data?: any;
  styling?: SectionStyling;
  conditions?: ReportCondition[];
  localization?: {
    rtlSupport: boolean;
    numberFormat: string;
    dateFormat: string;
    currencyFormat?: string;
  };
}

export interface ReportStyling {
  theme: 'light' | 'dark' | 'corporate' | 'minimal';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    text: string;
    background: string;
  };
  fonts: {
    primary: string;
    secondary: string;
    monospace: string;
    sizes: {
      small: number;
      medium: number;
      large: number;
      xlarge: number;
    };
  };
  layout: {
    pageSize: 'A4' | 'A3' | 'Letter' | 'Legal';
    orientation: 'portrait' | 'landscape';
    margins: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };
}

export interface SectionStyling {
  alignment: 'left' | 'center' | 'right';
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  textColor: string;
  backgroundColor?: string;
  border?: {
    width: number;
    style: 'solid' | 'dashed' | 'dotted';
    color: string;
  };
  spacing: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export interface ReportCondition {
  field: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'not_contains'
    | 'greater_than'
    | 'less_than';
  value: unknown;
  action: 'show' | 'hide' | 'highlight';
}

export interface ReportData {
  title: string;
  subtitle?: string;
  metadata: {
    generated: Date;
    generatedBy: string;
    language: string;
    region: string;
    timezone: string;
  };
  sections: Array<ReportSection>;
  summary?: {
    totalItems: number;
    highlights: string[];
    recommendations: string[];
  };
}

export interface ReportOptions {
  language: string;
  format: 'pdf' | 'excel' | 'csv' | 'json' | 'html';
  template?: string;
  includeCharts?: boolean;
  includeRawData?: boolean;
  compressionLevel?: 'none' | 'low' | 'medium' | 'high';
  encryptionKey?: string;
  watermark?: {
    text: string;
    opacity: number;
    position: 'center' | 'diagonal';
  };
  customHeaders?: { [key: string]: string };
  customFooters?: { [key: string]: string };
}

export interface ExportFormat {
  format: 'pdf' | 'excel' | 'csv' | 'json' | 'html';
  mimeType: string;
  extension: string;
  binary: boolean;
  supportedFeatures: {
    charts: boolean;
    styling: boolean;
    multipleSheets: boolean;
    encryption: boolean;
    compression: boolean;
  };
}

export interface GeneratedReport {
  id: string;
  title: string;
  format: string;
  language: string;
  size: number;
  path?: string;
  content?: Buffer | string;
  metadata: {
    generated: Date;
    generatedBy: string;
    duration: number;
    templateId: string;
    options: ReportOptions;
  };
  checksum: string;
}
