/**
 * Analysis Service
 * DNSweeper CLI ライブラリを使用した分析処理
 */

import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger.js';

// DNSweeper CLIライブラリのインポート
// 注意: 実際の実装では、CLIライブラリのパスを調整する必要があります
// import { CSVProcessor } from '@dnsweeper/csv-processor';
// import { DNSResolver } from '@dnsweeper/dns-resolver';
// import { RiskCalculator } from '@dnsweeper/risk-calculator';

export interface AnalysisOptions {
  fileId: string;
  format: 'cloudflare' | 'route53' | 'generic';
  options: {
    enableDnsValidation?: boolean;
    riskThresholds?: {
      ttl?: { low: number; high: number };
      naming?: { riskPatterns: string[] };
    };
    timeout?: number;
    retries?: number;
  };
  onProgress?: (progress: AnalysisProgress) => void;
}

export interface AnalysisProgress {
  stage: 'parsing' | 'validating' | 'analyzing' | 'complete' | 'error';
  percentage: number;
  message: string;
  details?: {
    totalRecords?: number;
    processedRecords?: number;
    errors?: number;
    warnings?: number;
  };
}

export interface AnalysisResult {
  id: string;
  fileId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  duration?: number;
  results?: {
    totalRecords: number;
    validRecords: number;
    riskySummary: {
      high: number;
      medium: number;
      low: number;
    };
    records: Array<{
      domain: string;
      type: string;
      value: string;
      ttl: number;
      riskScore: number;
      riskLevel: 'high' | 'medium' | 'low';
      issues: string[];
    }>;
  };
  error?: string;
}

export class AnalysisService {
  private analyses: Map<string, AnalysisResult> = new Map();

  async startAnalysis(options: AnalysisOptions): Promise<string> {
    const analysisId = uuidv4();
    
    const analysis: AnalysisResult = {
      id: analysisId,
      fileId: options.fileId,
      status: 'pending',
      startedAt: new Date().toISOString()
    };

    this.analyses.set(analysisId, analysis);

    // 非同期で分析を実行
    this.runAnalysis(analysisId, options).catch(error => {
      logger.error(`Analysis ${analysisId} failed:`, error);
      this.updateAnalysisStatus(analysisId, 'failed', error.message);
    });

    return analysisId;
  }

  private async runAnalysis(analysisId: string, options: AnalysisOptions): Promise<void> {
    try {
      this.updateAnalysisStatus(analysisId, 'running');
      
      // ファイルパスを構築
      const filePath = path.join('uploads', `${options.fileId}.csv`);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${options.fileId}`);
      }

      // Stage 1: CSV解析
      options.onProgress?.({
        stage: 'parsing',
        percentage: 10,
        message: 'Parsing CSV file...'
      });

      const csvData = await this.parseCsvFile(filePath, options.format);
      
      // Stage 2: DNS検証（オプション）
      if (options.options.enableDnsValidation) {
        options.onProgress?.({
          stage: 'validating',
          percentage: 40,
          message: 'Validating DNS records...',
          details: {
            totalRecords: csvData.length,
            processedRecords: 0
          }
        });

        await this.validateDnsRecords(csvData, options);
      }

      // Stage 3: リスク分析
      options.onProgress?.({
        stage: 'analyzing',
        percentage: 70,
        message: 'Analyzing risks...'
      });

      const analysisResults = await this.analyzeRisks(csvData, options);

      // Stage 4: 完了
      options.onProgress?.({
        stage: 'complete',
        percentage: 100,
        message: 'Analysis completed successfully'
      });

      // 結果を保存
      const analysis = this.analyses.get(analysisId)!;
      analysis.status = 'completed';
      analysis.completedAt = new Date().toISOString();
      analysis.duration = Date.now() - new Date(analysis.startedAt).getTime();
      analysis.results = analysisResults;

      this.analyses.set(analysisId, analysis);

      logger.info(`Analysis ${analysisId} completed successfully`);

    } catch (error) {
      logger.error(`Analysis ${analysisId} failed:`, error);
      this.updateAnalysisStatus(analysisId, 'failed', error instanceof Error ? error.message : 'Unknown error');
      
      options.onProgress?.({
        stage: 'error',
        percentage: 0,
        message: 'Analysis failed',
      });
    }
  }

  private async parseCsvFile(filePath: string, format: string): Promise<any[]> {
    // 実際の実装では、DNSweeper CLIのCSVProcessorを使用
    // const processor = new CSVProcessor();
    // const result = await processor.parseCloudflare(filePath);
    // return result.records;

    // 仮実装: CSVファイルを読み取って簡単なパース
    const data = fs.readFileSync(filePath, 'utf-8');
    const lines = data.split('\n').filter(line => line.trim().length > 0);
    
    if (lines.length <= 1) {
      throw new Error('CSV file appears to be empty or invalid');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const records = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const record: any = {};
      headers.forEach((header, index) => {
        record[header] = values[index] || '';
      });
      return record;
    });

    return records;
  }

  private async validateDnsRecords(records: any[], options: AnalysisOptions): Promise<void> {
    // 実際の実装では、DNSResolverを使用
    // const resolver = new DNSResolver();
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      // 進捗更新
      options.onProgress?.({
        stage: 'validating',
        percentage: 40 + (i / records.length) * 30,
        message: `Validating ${record.domain || record.Name}...`,
        details: {
          totalRecords: records.length,
          processedRecords: i
        }
      });

      // DNS解決を実行（仮実装）
      await new Promise(resolve => setTimeout(resolve, 50)); // シミュレーション
    }
  }

  private async analyzeRisks(records: any[], options: AnalysisOptions): Promise<any> {
    // 実際の実装では、RiskCalculatorを使用
    // const calculator = new RiskCalculator();
    
    const analyzedRecords = records.map(record => {
      // 簡単なリスク分析のシミュレーション
      const ttl = parseInt(record.TTL || record.ttl || '300');
      const domain = record.domain || record.Name || '';
      
      let riskScore = 0;
      const issues: string[] = [];

      // TTLベースのリスク評価
      if (ttl < 300) {
        riskScore += 30;
        issues.push('Low TTL value');
      } else if (ttl > 86400) {
        riskScore += 10;
        issues.push('Very high TTL value');
      }

      // 命名パターンベースのリスク評価
      if (domain.includes('test') || domain.includes('dev') || domain.includes('staging')) {
        riskScore += 40;
        issues.push('Development/test naming pattern');
      }

      if (domain.includes('old') || domain.includes('deprecated')) {
        riskScore += 50;
        issues.push('Potentially obsolete naming');
      }

      // リスクレベルの決定
      let riskLevel: 'high' | 'medium' | 'low' = 'low';
      if (riskScore >= 50) riskLevel = 'high';
      else if (riskScore >= 25) riskLevel = 'medium';

      return {
        domain,
        type: record.Type || record.type || 'A',
        value: record.Content || record.value || record.Value || '',
        ttl,
        riskScore,
        riskLevel,
        issues
      };
    });

    // サマリーの計算
    const summary = {
      high: analyzedRecords.filter(r => r.riskLevel === 'high').length,
      medium: analyzedRecords.filter(r => r.riskLevel === 'medium').length,
      low: analyzedRecords.filter(r => r.riskLevel === 'low').length,
    };

    return {
      totalRecords: records.length,
      validRecords: records.length,
      riskySummary: summary,
      records: analyzedRecords
    };
  }

  private updateAnalysisStatus(analysisId: string, status: AnalysisResult['status'], error?: string): void {
    const analysis = this.analyses.get(analysisId);
    if (analysis) {
      analysis.status = status;
      if (error) {
        analysis.error = error;
      }
      this.analyses.set(analysisId, analysis);
    }
  }

  async getAnalysisResult(analysisId: string): Promise<AnalysisResult | null> {
    return this.analyses.get(analysisId) || null;
  }

  async getAnalysisStatus(analysisId: string): Promise<{ status: string; progress?: number } | null> {
    const analysis = this.analyses.get(analysisId);
    if (!analysis) return null;

    return {
      status: analysis.status,
      progress: analysis.status === 'completed' ? 100 : 
               analysis.status === 'running' ? 50 : 
               analysis.status === 'failed' ? 0 : 10
    };
  }

  async deleteAnalysis(analysisId: string): Promise<boolean> {
    return this.analyses.delete(analysisId);
  }

  async getAnalysisHistory(options: { page: number; limit: number }): Promise<any> {
    const analyses = Array.from(this.analyses.values());
    const start = (options.page - 1) * options.limit;
    const end = start + options.limit;
    
    return {
      items: analyses.slice(start, end),
      total: analyses.length,
      page: options.page,
      limit: options.limit,
      totalPages: Math.ceil(analyses.length / options.limit)
    };
  }
}