/**
 * 地域別コンプライアンスレポート・文書管理システム
 *
 * コンプライアンスレポート生成、文書管理、証明書管理機能
 */

import { EventEmitter } from 'events';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

import { Logger } from './logger.js';

import type {
  ComplianceFramework,
  ComplianceAssessment,
  ComplianceReport,
  ComplianceCertification,
  ComplianceGap,
  ComplianceRecommendation,
  ComplianceAuditLog,
} from './regional-compliance-types.js';

export class RegionalComplianceReporter extends EventEmitter {
  private logger: Logger;
  private reports: Map<string, ComplianceReport>;
  private certifications: Map<string, ComplianceCertification>;
  private auditLogs: ComplianceAuditLog[];
  private dataPath: string;

  constructor(logger?: Logger, dataPath: string = './compliance-reports') {
    super();
    this.logger = logger || new Logger({ logLevel: 'info' });
    this.reports = new Map();
    this.certifications = new Map();
    this.auditLogs = [];
    this.dataPath = dataPath;
    this.loadReportData();
  }

  /**
   * コンプライアンスレポート生成
   */
  async generateComplianceReport(
    framework: ComplianceFramework,
    assessment: ComplianceAssessment,
    reportType:
      | 'assessment'
      | 'gap-analysis'
      | 'remediation'
      | 'certification' = 'assessment',
    options: {
      includeExecutiveSummary?: boolean;
      includeDetailedFindings?: boolean;
      includeActionPlan?: boolean;
      includeCertification?: boolean;
      period?: { start: Date; end: Date };
    } = {}
  ): Promise<ComplianceReport> {
    const reportId = `report-${framework.id}-${reportType}-${Date.now()}`;

    this.logger.info('レポート生成開始', {
      reportId,
      framework: framework.name,
      type: reportType,
    });

    // 期間の設定
    const period = options.period || {
      start: new Date(Date.now() - 7776000000), // 90日前
      end: new Date(),
    };

    // コンプライアンスカテゴリ別スコア計算
    const complianceByCategory = this.calculateComplianceByCategory(
      framework,
      assessment
    );

    // ギャップ分析
    const criticalGaps = assessment.gaps.filter(
      g => g.severity === 'critical'
    ).length;
    const totalGaps = assessment.gaps.length;
    const resolvedGaps = assessment.gaps.filter(
      g => g.status === 'resolved'
    ).length;

    // 推奨事項の優先順位付け
    const prioritizedRecommendations = this.prioritizeRecommendations(
      assessment.recommendations
    );

    // レポート作成
    const report: ComplianceReport = {
      id: reportId,
      type: reportType,
      frameworkId: framework.id,
      generatedAt: new Date(),
      generatedBy: 'DNSweeper Compliance System',
      period,
      overallCompliance: assessment.overallScore,
      complianceByCategory,
      criticalGaps,
      totalGaps,
      resolvedGaps,
      overduActions: 0, // 実装では実際の期限切れアクション数を計算
      totalActions: assessment.gaps.length,
      riskLevel: assessment.riskLevel,
      summary: this.generateSummary(framework, assessment),
      recommendations: prioritizedRecommendations,
      executiveSummary: options.includeExecutiveSummary
        ? this.generateExecutiveSummary(framework, assessment)
        : '',
      detailedFindings: options.includeDetailedFindings
        ? this.generateDetailedFindings(framework, assessment)
        : '',
      actionPlan: options.includeActionPlan
        ? this.generateActionPlan(assessment)
        : '',
    };

    // 証明書情報の追加
    if (options.includeCertification && assessment.overallScore >= 80) {
      report.certification = await this.generateCertification(
        framework,
        assessment,
        reportId
      );
    }

    this.reports.set(reportId, report);
    this.saveReportData();

    this.emit('report-generated', {
      reportId,
      frameworkId: framework.id,
      type: reportType,
      score: assessment.overallScore,
    });

    this.logger.info('レポート生成完了', {
      reportId,
      score: assessment.overallScore,
      gaps: totalGaps,
      recommendations: prioritizedRecommendations.length,
    });

    return report;
  }

  /**
   * カテゴリ別コンプライアンススコア計算
   */
  private calculateComplianceByCategory(
    framework: ComplianceFramework,
    assessment: ComplianceAssessment
  ): Map<string, number> {
    const categoryScores = new Map<string, number>();
    const categoryCounts = new Map<string, number>();

    framework.requirements.forEach(requirement => {
      const score = assessment.requirementScores.get(requirement.id) || 0;
      const category = requirement.category;

      categoryScores.set(category, (categoryScores.get(category) || 0) + score);
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    });

    const averageCategoryScores = new Map<string, number>();
    for (const [category, totalScore] of categoryScores) {
      const count = categoryCounts.get(category) || 1;
      averageCategoryScores.set(category, totalScore / count);
    }

    return averageCategoryScores;
  }

  /**
   * 推奨事項の優先順位付け
   */
  private prioritizeRecommendations(
    recommendations: ComplianceRecommendation[]
  ): ComplianceRecommendation[] {
    return [...recommendations].sort((a, b) => {
      // 優先度による並び替え
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff =
        priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // リスク削減効果による並び替え
      const riskDiff = b.riskReduction - a.riskReduction;
      if (riskDiff !== 0) return riskDiff;

      // コスト効率による並び替え（リスク削減/コスト）
      const aCostEfficiency = a.riskReduction / (a.estimatedCost || 1);
      const bCostEfficiency = b.riskReduction / (b.estimatedCost || 1);
      return bCostEfficiency - aCostEfficiency;
    });
  }

  /**
   * サマリー生成
   */
  private generateSummary(
    framework: ComplianceFramework,
    assessment: ComplianceAssessment
  ): string {
    const score = Math.round(assessment.overallScore);
    const gapsCount = assessment.gaps.length;
    const criticalGaps = assessment.gaps.filter(
      g => g.severity === 'critical'
    ).length;

    let summary = `${framework.name}のコンプライアンス評価結果: ${score}%\n\n`;

    if (score >= 90) {
      summary += `優秀なコンプライアンス状況です。`;
    } else if (score >= 80) {
      summary += `良好なコンプライアンス状況ですが、さらなる改善の余地があります。`;
    } else if (score >= 60) {
      summary += `コンプライアンス状況に改善が必要です。`;
    } else {
      summary += `重大なコンプライアンスリスクが存在します。早急な対応が必要です。`;
    }

    summary += `\n\n検出されたギャップ: ${gapsCount}件`;
    if (criticalGaps > 0) {
      summary += `（うち重要: ${criticalGaps}件）`;
    }

    summary += `\n推奨事項: ${assessment.recommendations.length}件`;
    summary += `\nリスクレベル: ${this.translateRiskLevel(assessment.riskLevel)}`;

    return summary;
  }

  /**
   * エグゼクティブサマリー生成
   */
  private generateExecutiveSummary(
    framework: ComplianceFramework,
    assessment: ComplianceAssessment
  ): string {
    const score = Math.round(assessment.overallScore);
    const criticalGaps = assessment.gaps.filter(
      g => g.severity === 'critical'
    ).length;
    const highGaps = assessment.gaps.filter(g => g.severity === 'high').length;

    let summary = `# エグゼクティブサマリー\n\n`;
    summary += `## 概要\n`;
    summary += `${framework.name}に対するコンプライアンス評価を実施しました。`;
    summary += `総合スコアは${score}%となり、`;

    if (score >= 80) {
      summary += `概ね良好な状況です。\n\n`;
    } else {
      summary += `改善が必要な状況です。\n\n`;
    }

    summary += `## 主要な発見事項\n`;
    if (criticalGaps > 0) {
      summary += `- **重要な課題**: ${criticalGaps}件の重要なギャップが発見されました\n`;
    }
    if (highGaps > 0) {
      summary += `- **高優先度課題**: ${highGaps}件の高優先度ギャップが発見されました\n`;
    }

    summary += `\n## 推奨アクション\n`;
    const topRecommendations = assessment.recommendations
      .filter(r => r.priority === 'critical' || r.priority === 'high')
      .slice(0, 3);

    topRecommendations.forEach((rec, index) => {
      summary += `${index + 1}. ${rec.title}: ${rec.description}\n`;
    });

    summary += `\n## リスクアセスメント\n`;
    summary += `現在のリスクレベル: **${this.translateRiskLevel(assessment.riskLevel)}**\n`;

    if (
      assessment.riskLevel === 'critical' ||
      assessment.riskLevel === 'high'
    ) {
      summary += `早急な対応が必要です。経営層の承認を得て、リソースを優先的に配分することを推奨します。`;
    } else {
      summary += `計画的な改善活動により、リスクを管理できる状況です。`;
    }

    return summary;
  }

  /**
   * 詳細な発見事項生成
   */
  private generateDetailedFindings(
    framework: ComplianceFramework,
    assessment: ComplianceAssessment
  ): string {
    let findings = `# 詳細な発見事項\n\n`;

    // カテゴリ別の分析
    const complianceByCategory = this.calculateComplianceByCategory(
      framework,
      assessment
    );

    findings += `## カテゴリ別コンプライアンス状況\n\n`;
    for (const [category, score] of complianceByCategory) {
      const translatedCategory = this.translateCategory(category);
      const roundedScore = Math.round(score);
      findings += `- **${translatedCategory}**: ${roundedScore}%\n`;
    }

    // ギャップ詳細
    findings += `\n## ギャップ詳細\n\n`;
    const gapsBySeverity = this.groupGapsBySeverity(assessment.gaps);

    for (const severity of ['critical', 'high', 'medium', 'low'] as const) {
      const gaps = gapsBySeverity[severity] || [];
      if (gaps.length > 0) {
        findings += `### ${this.translateSeverity(severity)}ギャップ (${gaps.length}件)\n\n`;
        gaps.forEach((gap, index) => {
          findings += `${index + 1}. **${gap.description}**\n`;
          findings += `   - 現状: ${gap.currentState}\n`;
          findings += `   - 必要な状態: ${gap.requiredState}\n`;
          findings += `   - 推定工数: ${gap.estimatedEffort}時間\n`;
          findings += `   - 推定コスト: $${gap.estimatedCost.toLocaleString()}\n\n`;
        });
      }
    }

    return findings;
  }

  /**
   * アクションプラン生成
   */
  private generateActionPlan(assessment: ComplianceAssessment): string {
    let plan = `# アクションプラン\n\n`;

    // 優先度別のアクション
    const gapsBySeverity = this.groupGapsBySeverity(assessment.gaps);
    let actionCounter = 1;

    for (const severity of ['critical', 'high', 'medium', 'low'] as const) {
      const gaps = gapsBySeverity[severity] || [];
      if (gaps.length > 0) {
        plan += `## ${this.translateSeverity(severity)}優先度アクション\n\n`;

        gaps.forEach(gap => {
          plan += `### アクション ${actionCounter}: ${gap.description}\n\n`;
          plan += `**目標**: ${gap.requiredState}\n\n`;
          plan += `**推奨手順**:\n`;
          gap.recommendations.forEach((rec, index) => {
            plan += `${index + 1}. ${rec}\n`;
          });
          plan += `\n**リソース要件**:\n`;
          plan += `- 工数: ${gap.estimatedEffort}時間\n`;
          plan += `- 予算: $${gap.estimatedCost.toLocaleString()}\n`;
          if (gap.deadline) {
            plan += `- 期限: ${gap.deadline.toLocaleDateString('ja-JP')}\n`;
          }
          plan += `\n**成功指標**:\n`;
          plan += `- ギャップの解消\n`;
          plan += `- 要件への完全準拠\n\n`;

          actionCounter++;
        });
      }
    }

    // タイムライン
    plan += `## 実装タイムライン\n\n`;
    plan += `推奨実装順序:\n\n`;

    let timelineCounter = 1;
    for (const severity of ['critical', 'high', 'medium', 'low'] as const) {
      const gaps = gapsBySeverity[severity] || [];
      if (gaps.length > 0) {
        plan += `**フェーズ ${timelineCounter}** (${this.translateSeverity(severity)}優先度): `;
        plan += `${gaps.length}件のアクション, `;
        const totalEffort = gaps.reduce(
          (sum, gap) => sum + gap.estimatedEffort,
          0
        );
        const totalCost = gaps.reduce((sum, gap) => sum + gap.estimatedCost, 0);
        plan += `${totalEffort}時間, $${totalCost.toLocaleString()}\n\n`;
        timelineCounter++;
      }
    }

    return plan;
  }

  /**
   * 証明書生成
   */
  private async generateCertification(
    framework: ComplianceFramework,
    assessment: ComplianceAssessment,
    reportId: string
  ): Promise<ComplianceCertification> {
    const certification: ComplianceCertification = {
      id: `cert-${framework.id}-${Date.now()}`,
      frameworkId: framework.id,
      certificateNumber: `DNS-${framework.id.toUpperCase()}-${Date.now()}`,
      issuedBy: 'DNSweeper Compliance System',
      issuedAt: new Date(),
      validUntil: new Date(Date.now() + 31536000000), // 1年後
      scope: `${framework.name} compliance assessment`,
      conditions: [
        `Overall compliance score: ${Math.round(assessment.overallScore)}%`,
        `Assessment completed on: ${assessment.assessmentDate.toLocaleDateString('ja-JP')}`,
        'No critical compliance gaps identified',
      ],
      status: 'active',
      assessmentReportId: reportId,
    };

    this.certifications.set(certification.id, certification);

    this.logger.info('証明書生成', {
      certificationId: certification.id,
      frameworkId: framework.id,
      score: assessment.overallScore,
    });

    return certification;
  }

  /**
   * ギャップを重要度別にグループ化
   */
  private groupGapsBySeverity(
    gaps: ComplianceGap[]
  ): Record<string, ComplianceGap[]> {
    return gaps.reduce(
      (grouped, gap) => {
        const severity = gap.severity;
        if (!grouped[severity]) {
          grouped[severity] = [];
        }
        grouped[severity].push(gap);
        return grouped;
      },
      {} as Record<string, ComplianceGap[]>
    );
  }

  /**
   * 監査ログ記録
   */
  logAuditEvent(event: Omit<ComplianceAuditLog, 'id' | 'timestamp'>): void {
    const auditLog: ComplianceAuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...event,
    };

    this.auditLogs.push(auditLog);

    // 古いログのクリーンアップ（1年以上前のログを削除）
    const oneYearAgo = new Date(Date.now() - 31536000000);
    this.auditLogs = this.auditLogs.filter(log => log.timestamp > oneYearAgo);

    this.saveReportData();
  }

  /**
   * レポートデータの保存
   */
  private saveReportData(): void {
    try {
      const data = {
        reports: Array.from(this.reports.entries()),
        certifications: Array.from(this.certifications.entries()),
        auditLogs: this.auditLogs,
      };

      const dataFile = join(this.dataPath, 'compliance-reports.json');
      writeFileSync(dataFile, JSON.stringify(data, null, 2));
    } catch (error) {
      this.logger.error('レポートデータ保存エラー', error as Error);
    }
  }

  /**
   * レポートデータの読み込み
   */
  private loadReportData(): void {
    try {
      const dataFile = join(this.dataPath, 'compliance-reports.json');
      if (existsSync(dataFile)) {
        const data = JSON.parse(readFileSync(dataFile, 'utf-8'));

        this.reports = new Map(data.reports || []);
        this.certifications = new Map(data.certifications || []);
        this.auditLogs = data.auditLogs || [];

        this.logger.info('レポートデータ読み込み完了', {
          reports: this.reports.size,
          certifications: this.certifications.size,
          auditLogs: this.auditLogs.length,
        });
      }
    } catch (error) {
      this.logger.warn('レポートデータ読み込みエラー', {
        error: (error as Error).message,
      });
    }
  }

  /**
   * 翻訳ヘルパーメソッド
   */
  private translateRiskLevel(level: string): string {
    const translations = {
      critical: '重要',
      high: '高',
      medium: '中',
      low: '低',
    };
    return translations[level as keyof typeof translations] || level;
  }

  private translateCategory(category: string): string {
    const translations = {
      'data-protection': 'データ保護',
      'data-localization': 'データローカライゼーション',
      'audit-logging': '監査ログ',
      encryption: '暗号化',
      consent: '同意管理',
      notification: '通知',
      'access-rights': 'アクセス権',
    };
    return translations[category as keyof typeof translations] || category;
  }

  private translateSeverity(severity: string): string {
    const translations = {
      critical: '重要',
      high: '高',
      medium: '中',
      low: '低',
    };
    return translations[severity as keyof typeof translations] || severity;
  }

  /**
   * APIメソッド
   */
  getReport(id: string): ComplianceReport | undefined {
    return this.reports.get(id);
  }

  getAllReports(): ComplianceReport[] {
    return Array.from(this.reports.values());
  }

  getReportsByFramework(frameworkId: string): ComplianceReport[] {
    return Array.from(this.reports.values()).filter(
      report => report.frameworkId === frameworkId
    );
  }

  getCertification(id: string): ComplianceCertification | undefined {
    return this.certifications.get(id);
  }

  getAllCertifications(): ComplianceCertification[] {
    return Array.from(this.certifications.values());
  }

  getActiveCertifications(): ComplianceCertification[] {
    const now = new Date();
    return Array.from(this.certifications.values()).filter(
      cert => cert.status === 'active' && cert.validUntil > now
    );
  }

  getAuditLogs(filters?: {
    startDate?: Date;
    endDate?: Date;
    action?: string;
    userId?: string;
    entity?: string;
    result?: 'success' | 'failure' | 'error';
  }): ComplianceAuditLog[] {
    let logs = [...this.auditLogs];

    if (filters) {
      if (filters.startDate) {
        logs = logs.filter(log => log.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        logs = logs.filter(log => log.timestamp <= filters.endDate!);
      }
      if (filters.action) {
        logs = logs.filter(log => log.action.includes(filters.action!));
      }
      if (filters.userId) {
        logs = logs.filter(log => log.userId === filters.userId);
      }
      if (filters.entity) {
        logs = logs.filter(log => log.entity === filters.entity);
      }
      if (filters.result) {
        logs = logs.filter(log => log.result === filters.result);
      }
    }

    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
}
