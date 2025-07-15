/**
 * 地域別コンプライアンス評価システム
 *
 * コンプライアンス要件の評価、監査、ギャップ分析機能
 */

import { EventEmitter } from 'events';

import { Logger } from './logger.js';

import type {
  ComplianceFramework,
  ComplianceRequirement,
  ComplianceAssessment,
  ComplianceGap,
  ComplianceRecommendation,
  ComplianceAction,
  TechnicalControl,
  BusinessControl,
} from './regional-compliance-types.js';

export class RegionalComplianceAssessor extends EventEmitter {
  private logger: Logger;
  private assessments: Map<string, ComplianceAssessment>;
  private gaps: Map<string, ComplianceGap>;
  private actions: Map<string, ComplianceAction>;

  constructor(logger?: Logger) {
    super();
    this.logger = logger || new Logger({ logLevel: 'info' });
    this.assessments = new Map();
    this.gaps = new Map();
    this.actions = new Map();
  }

  /**
   * フレームワークのコンプライアンス評価実行
   */
  async runComplianceAssessment(
    framework: ComplianceFramework,
    assessmentId?: string
  ): Promise<ComplianceAssessment> {
    const id = assessmentId || `assessment-${framework.id}-${Date.now()}`;
    this.logger.info('コンプライアンス評価開始', {
      assessmentId: id,
      framework: framework.name,
    });

    const requirementScores = new Map<string, number>();
    const gaps: ComplianceGap[] = [];
    const recommendations: ComplianceRecommendation[] = [];
    let totalScore = 0;

    // 各要件の評価
    for (const requirement of framework.requirements) {
      const result = await this.assessRequirement(requirement);
      requirementScores.set(requirement.id, result.score);
      totalScore += result.score;

      // ギャップの追加
      if (result.gaps.length > 0) {
        gaps.push(...result.gaps);
      }

      // 推奨事項の追加
      if (result.recommendations.length > 0) {
        recommendations.push(...result.recommendations);
      }
    }

    const overallScore = totalScore / framework.requirements.length;
    const riskLevel = this.calculateRiskLevel(overallScore, gaps);

    const assessment: ComplianceAssessment = {
      id,
      frameworkId: framework.id,
      assessmentDate: new Date(),
      assessor: 'DNSweeper System',
      overallScore,
      requirementScores,
      gaps,
      recommendations,
      riskLevel,
      nextAssessmentDate: new Date(Date.now() + 7776000000), // 90日後
      status: 'completed',
    };

    this.assessments.set(id, assessment);

    // ギャップをアクションに変換
    await this.createActionsFromGaps(gaps, assessment.id);

    this.emit('assessment-completed', {
      assessmentId: id,
      score: overallScore,
      riskLevel,
      gapsCount: gaps.length,
    });

    this.logger.info('コンプライアンス評価完了', {
      assessmentId: id,
      score: overallScore,
      gaps: gaps.length,
      recommendations: recommendations.length,
    });

    return assessment;
  }

  /**
   * 要件の詳細評価
   */
  private async assessRequirement(requirement: ComplianceRequirement): Promise<{
    score: number;
    gaps: ComplianceGap[];
    recommendations: ComplianceRecommendation[];
    evidence: string[];
  }> {
    const gaps: ComplianceGap[] = [];
    const recommendations: ComplianceRecommendation[] = [];
    const evidence: string[] = [];
    let totalScore = 0;
    let totalControls = 0;

    // 技術的コントロールの評価
    for (const control of requirement.technicalControls) {
      const controlResult = this.assessTechnicalControl(control, requirement);
      totalScore += controlResult.score;
      totalControls++;

      if (controlResult.gap) {
        gaps.push(controlResult.gap);
      }
      if (controlResult.recommendation) {
        recommendations.push(controlResult.recommendation);
      }
      if (controlResult.evidence) {
        evidence.push(controlResult.evidence);
      }
    }

    // ビジネスコントロールの評価
    for (const control of requirement.businessControls) {
      const controlResult = this.assessBusinessControl(control, requirement);
      totalScore += controlResult.score;
      totalControls++;

      if (controlResult.gap) {
        gaps.push(controlResult.gap);
      }
      if (controlResult.recommendation) {
        recommendations.push(controlResult.recommendation);
      }
      if (controlResult.evidence) {
        evidence.push(controlResult.evidence);
      }
    }

    const averageScore = totalControls > 0 ? totalScore / totalControls : 0;

    // 要件レベルのギャップ分析
    if (averageScore < 80) {
      const requirementGap: ComplianceGap = {
        id: `gap-${requirement.id}-${Date.now()}`,
        requirementId: requirement.id,
        severity: this.mapScoreToSeverity(averageScore),
        description: `要件「${requirement.title}」のコンプライアンス不足`,
        currentState: `${Math.round(averageScore)}%の実装率`,
        requiredState: '100%の実装が必要',
        recommendations: [
          `${requirement.title}の完全実装`,
          ...requirement.implementationSteps,
        ],
        estimatedEffort: this.estimateEffort(requirement),
        estimatedCost: this.estimateCost(requirement),
        deadline: requirement.implementationDeadline,
        status: 'identified',
      };
      gaps.push(requirementGap);
    }

    return {
      score: averageScore,
      gaps,
      recommendations,
      evidence,
    };
  }

  /**
   * 技術的コントロールの評価
   */
  private assessTechnicalControl(
    control: TechnicalControl,
    requirement: ComplianceRequirement
  ): {
    score: number;
    gap?: ComplianceGap;
    recommendation?: ComplianceRecommendation;
    evidence?: string;
  } {
    if (control.isImplemented) {
      return {
        score: control.effectiveness,
        evidence: `${control.name}: 実装済み（効果: ${control.effectiveness}%）`,
      };
    }

    const gap: ComplianceGap = {
      id: `gap-tech-${control.id}-${Date.now()}`,
      requirementId: requirement.id,
      severity: requirement.severity,
      description: `技術的コントロール「${control.name}」が未実装`,
      currentState: '未実装',
      requiredState: control.implementation,
      recommendations: [control.implementation],
      estimatedEffort: this.estimateTechnicalEffort(control),
      estimatedCost: this.estimateTechnicalCost(control),
      status: 'identified',
    };

    const recommendation: ComplianceRecommendation = {
      id: `rec-tech-${control.id}-${Date.now()}`,
      priority: requirement.severity,
      category: 'technical',
      title: `${control.name}の実装`,
      description: control.description,
      implementation: control.implementation,
      estimatedEffort: this.estimateTechnicalEffort(control),
      estimatedCost: this.estimateTechnicalCost(control),
      expectedBenefit: `${requirement.title}の要件達成`,
      riskReduction: this.calculateRiskReduction(control.type),
    };

    return {
      score: 0,
      gap,
      recommendation,
    };
  }

  /**
   * ビジネスコントロールの評価
   */
  private assessBusinessControl(
    control: BusinessControl,
    requirement: ComplianceRequirement
  ): {
    score: number;
    gap?: ComplianceGap;
    recommendation?: ComplianceRecommendation;
    evidence?: string;
  } {
    if (control.isImplemented) {
      return {
        score: control.effectiveness,
        evidence: `${control.name}: 実装済み（効果: ${control.effectiveness}%）`,
      };
    }

    const gap: ComplianceGap = {
      id: `gap-bus-${control.id}-${Date.now()}`,
      requirementId: requirement.id,
      severity: requirement.severity,
      description: `ビジネスコントロール「${control.name}」が未実装`,
      currentState: '未実装',
      requiredState: control.implementation,
      recommendations: [control.implementation],
      estimatedEffort: this.estimateBusinessEffort(control),
      estimatedCost: this.estimateBusinessCost(control),
      status: 'identified',
    };

    const recommendation: ComplianceRecommendation = {
      id: `rec-bus-${control.id}-${Date.now()}`,
      priority: requirement.severity,
      category: 'process',
      title: `${control.name}の実装`,
      description: control.description,
      implementation: control.implementation,
      estimatedEffort: this.estimateBusinessEffort(control),
      estimatedCost: this.estimateBusinessCost(control),
      expectedBenefit: `${requirement.title}の要件達成`,
      riskReduction: this.calculateBusinessRiskReduction(control.type),
    };

    return {
      score: 0,
      gap,
      recommendation,
    };
  }

  /**
   * ギャップからアクションの作成
   */
  private async createActionsFromGaps(
    gaps: ComplianceGap[],
    assessmentId: string
  ): Promise<void> {
    for (const gap of gaps) {
      const action: ComplianceAction = {
        id: `action-${gap.id}-${Date.now()}`,
        gapId: gap.id,
        title: `ギャップ解消: ${gap.description}`,
        description: `現状：${gap.currentState} → 目標：${gap.requiredState}`,
        assignedTo: 'システム管理者',
        dueDate:
          gap.deadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30日後
        status: 'pending',
        priority: gap.severity,
        progress: 0,
        estimatedHours: gap.estimatedEffort,
        blockers: [],
        dependencies: [],
        createdAt: new Date(),
        lastUpdated: new Date(),
      };

      this.actions.set(action.id, action);
      this.gaps.set(gap.id, gap);
    }

    this.logger.info('ギャップからアクション作成', {
      assessmentId,
      actionsCount: gaps.length,
    });
  }

  /**
   * リスクレベル計算
   */
  private calculateRiskLevel(
    score: number,
    gaps: ComplianceGap[]
  ): 'critical' | 'high' | 'medium' | 'low' {
    const criticalGaps = gaps.filter(g => g.severity === 'critical').length;
    const highGaps = gaps.filter(g => g.severity === 'high').length;

    if (score < 60 || criticalGaps > 0) {
      return 'critical';
    } else if (score < 80 || highGaps > 2) {
      return 'high';
    } else if (score < 90 || gaps.length > 5) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * スコアを重要度にマッピング
   */
  private mapScoreToSeverity(
    score: number
  ): 'critical' | 'high' | 'medium' | 'low' {
    if (score < 40) return 'critical';
    if (score < 60) return 'high';
    if (score < 80) return 'medium';
    return 'low';
  }

  /**
   * 工数見積もり（要件）
   */
  private estimateEffort(requirement: ComplianceRequirement): number {
    const baseHours = 40; // 基本工数
    const severityMultiplier = {
      critical: 2.0,
      high: 1.5,
      medium: 1.0,
      low: 0.5,
    };
    const controlsMultiplier =
      requirement.technicalControls.length +
      requirement.businessControls.length;

    return Math.round(
      baseHours * severityMultiplier[requirement.severity] * controlsMultiplier
    );
  }

  /**
   * コスト見積もり（要件）
   */
  private estimateCost(requirement: ComplianceRequirement): number {
    const hourlyRate = 100; // $100/時間
    const effort = this.estimateEffort(requirement);
    return effort * hourlyRate;
  }

  /**
   * 技術的コントロール工数見積もり
   */
  private estimateTechnicalEffort(control: TechnicalControl): number {
    const baseHours = {
      encryption: 20,
      'access-control': 30,
      logging: 15,
      monitoring: 25,
      backup: 20,
      'network-security': 35,
    };
    return baseHours[control.type] || 20;
  }

  /**
   * 技術的コントロールコスト見積もり
   */
  private estimateTechnicalCost(control: TechnicalControl): number {
    const effort = this.estimateTechnicalEffort(control);
    const toolCosts = {
      encryption: 5000,
      'access-control': 10000,
      logging: 3000,
      monitoring: 8000,
      backup: 5000,
      'network-security': 15000,
    };
    const hourlyRate = 120; // 技術者時給
    return effort * hourlyRate + (toolCosts[control.type] || 0);
  }

  /**
   * ビジネスコントロール工数見積もり
   */
  private estimateBusinessEffort(control: BusinessControl): number {
    const baseHours = {
      policy: 16,
      training: 24,
      process: 32,
      contract: 40,
      assessment: 20,
      'incident-response': 30,
    };
    return baseHours[control.type] || 20;
  }

  /**
   * ビジネスコントロールコスト見積もり
   */
  private estimateBusinessCost(control: BusinessControl): number {
    const effort = this.estimateBusinessEffort(control);
    const hourlyRate = 80; // ビジネス担当者時給
    return effort * hourlyRate;
  }

  /**
   * 技術的リスク削減効果計算
   */
  private calculateRiskReduction(controlType: string): number {
    const reductionMap: Record<string, number> = {
      encryption: 80,
      'access-control': 70,
      logging: 50,
      monitoring: 60,
      backup: 40,
      'network-security': 85,
    };
    return reductionMap[controlType] || 50;
  }

  /**
   * ビジネスリスク削減効果計算
   */
  private calculateBusinessRiskReduction(controlType: string): number {
    const reductionMap: Record<string, number> = {
      policy: 60,
      training: 70,
      process: 75,
      contract: 55,
      assessment: 65,
      'incident-response': 80,
    };
    return reductionMap[controlType] || 60;
  }

  /**
   * 評価結果取得
   */
  getAssessment(id: string): ComplianceAssessment | undefined {
    return this.assessments.get(id);
  }

  /**
   * 全評価結果取得
   */
  getAllAssessments(): ComplianceAssessment[] {
    return Array.from(this.assessments.values());
  }

  /**
   * フレームワーク別評価結果取得
   */
  getAssessmentsByFramework(frameworkId: string): ComplianceAssessment[] {
    return Array.from(this.assessments.values()).filter(
      assessment => assessment.frameworkId === frameworkId
    );
  }

  /**
   * ギャップ取得
   */
  getGap(id: string): ComplianceGap | undefined {
    return this.gaps.get(id);
  }

  /**
   * 全ギャップ取得
   */
  getAllGaps(): ComplianceGap[] {
    return Array.from(this.gaps.values());
  }

  /**
   * 重要度別ギャップ取得
   */
  getGapsBySeverity(
    severity: 'critical' | 'high' | 'medium' | 'low'
  ): ComplianceGap[] {
    return Array.from(this.gaps.values()).filter(
      gap => gap.severity === severity
    );
  }

  /**
   * アクション取得
   */
  getAction(id: string): ComplianceAction | undefined {
    return this.actions.get(id);
  }

  /**
   * 全アクション取得
   */
  getAllActions(): ComplianceAction[] {
    return Array.from(this.actions.values());
  }

  /**
   * ステータス別アクション取得
   */
  getActionsByStatus(status: ComplianceAction['status']): ComplianceAction[] {
    return Array.from(this.actions.values()).filter(
      action => action.status === status
    );
  }

  /**
   * アクション更新
   */
  updateAction(id: string, updates: Partial<ComplianceAction>): boolean {
    const action = this.actions.get(id);
    if (!action) {
      return false;
    }

    const updatedAction = {
      ...action,
      ...updates,
      lastUpdated: new Date(),
    };

    this.actions.set(id, updatedAction);

    this.emit('action-updated', {
      actionId: id,
      updates: Object.keys(updates),
    });

    return true;
  }

  /**
   * 評価統計
   */
  getAssessmentStatistics(): {
    total: number;
    byRiskLevel: Record<string, number>;
    averageScore: number;
    totalGaps: number;
    resolvedGaps: number;
    pendingActions: number;
    completedActions: number;
  } {
    const assessments = Array.from(this.assessments.values());
    const gaps = Array.from(this.gaps.values());
    const actions = Array.from(this.actions.values());

    const byRiskLevel: Record<string, number> = {};
    let totalScore = 0;

    assessments.forEach(assessment => {
      byRiskLevel[assessment.riskLevel] =
        (byRiskLevel[assessment.riskLevel] || 0) + 1;
      totalScore += assessment.overallScore;
    });

    return {
      total: assessments.length,
      byRiskLevel,
      averageScore:
        assessments.length > 0 ? totalScore / assessments.length : 0,
      totalGaps: gaps.length,
      resolvedGaps: gaps.filter(g => g.status === 'resolved').length,
      pendingActions: actions.filter(a => a.status === 'pending').length,
      completedActions: actions.filter(a => a.status === 'completed').length,
    };
  }
}
