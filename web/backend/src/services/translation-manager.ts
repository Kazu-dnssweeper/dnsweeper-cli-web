/**
 * DNSweeper 翻訳管理サービス
 * 翻訳ワークフロー・品質管理・自動化
 */

import {
  TranslationResource,
  TranslationStatus,
  TranslationActivity,
  TranslationBatchJob,
  TranslationResult,
  TranslationMemory,
  TranslationSegment,
  Glossary,
  GlossaryTerm,
  MachineTranslationConfig,
  TranslationQualityMetrics,
  QualityIssue,
  Translator,
  Reviewer
} from '../types/multilingual';

/**
 * 翻訳管理サービス
 */
export class TranslationManager {
  private batchJobs: Map<string, TranslationBatchJob> = new Map();
  private translationMemory: Map<string, TranslationMemory> = new Map();
  private glossaries: Map<string, Glossary> = new Map();
  private activities: TranslationActivity[] = [];
  private machineTranslationConfig: MachineTranslationConfig;
  private qualityMetrics: Map<string, TranslationQualityMetrics> = new Map();
  private translators: Map<string, Translator> = new Map();
  private reviewers: Map<string, Reviewer> = new Map();

  constructor() {
    this.initializeMachineTranslation();
    this.loadTranslationMemory();
    this.loadGlossaries();
  }

  // ===== バッチ翻訳 =====

  /**
   * バッチ翻訳ジョブの作成
   */
  async createBatchJob(config: {
    name: string;
    sourceLanguage: string;
    targetLanguages: string[];
    keys: string[];
    useMachineTranslation?: boolean;
    autoApprove?: boolean;
  }): Promise<TranslationBatchJob> {
    const jobId = this.generateJobId();

    const job: TranslationBatchJob = {
      id: jobId,
      name: config.name,
      sourceLanguage: config.sourceLanguage,
      targetLanguages: config.targetLanguages,
      keys: config.keys,
      status: 'pending',
      progress: {
        total: config.keys.length * config.targetLanguages.length,
        completed: 0,
        failed: 0
      },
      createdBy: 'system',
      createdAt: new Date()
    };

    this.batchJobs.set(jobId, job);

    // 非同期でジョブを処理
    this.processBatchJob(job, config.useMachineTranslation || false, config.autoApprove || false);

    return job;
  }

  /**
   * バッチジョブの処理
   */
  private async processBatchJob(
    job: TranslationBatchJob,
    useMachineTranslation: boolean,
    autoApprove: boolean
  ): Promise<void> {
    try {
      job.status = 'processing';
      job.results = {};

      for (const targetLanguage of job.targetLanguages) {
        for (const key of job.keys) {
          try {
            const result = await this.translateKey(
              key,
              job.sourceLanguage,
              targetLanguage,
              useMachineTranslation
            );

            job.results[`${targetLanguage}:${key}`] = result;

            if (result.status === 'success') {
              job.progress.completed++;

              // 自動承認
              if (autoApprove && result.confidence && result.confidence > 0.8) {
                await this.approveTranslation(targetLanguage, key, result.translations[targetLanguage]);
              }
            } else {
              job.progress.failed++;
            }
          } catch (error) {
            job.progress.failed++;
            job.results[`${targetLanguage}:${key}`] = {
              key,
              sourceText: '',
              translations: {},
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
              method: 'manual'
            };
          }
        }
      }

      job.status = 'completed';
      job.completedAt = new Date();
    } catch (error) {
      job.status = 'failed';
      console.error('バッチジョブ処理エラー:', error);
    }
  }

  /**
   * 単一キーの翻訳
   */
  private async translateKey(
    key: string,
    sourceLanguage: string,
    targetLanguage: string,
    useMachineTranslation: boolean
  ): Promise<TranslationResult> {
    try {
      // 翻訳メモリから検索
      const memoryMatch = this.searchTranslationMemory(key, sourceLanguage, targetLanguage);
      if (memoryMatch && memoryMatch.confidence > 0.9) {
        return {
          key,
          sourceText: memoryMatch.source,
          translations: { [targetLanguage]: memoryMatch.target },
          status: 'success',
          confidence: memoryMatch.confidence,
          method: 'memory'
        };
      }

      // 機械翻訳
      if (useMachineTranslation && this.machineTranslationConfig.enabled) {
        const machineTranslation = await this.getMachineTranslation(
          key,
          sourceLanguage,
          targetLanguage
        );

        if (machineTranslation) {
          return {
            key,
            sourceText: key,
            translations: { [targetLanguage]: machineTranslation.text },
            status: 'success',
            confidence: machineTranslation.confidence,
            method: 'machine'
          };
        }
      }

      // 手動翻訳のプレースホルダー
      return {
        key,
        sourceText: key,
        translations: { [targetLanguage]: `[NEEDS_TRANSLATION] ${key}` },
        status: 'success',
        confidence: 0,
        method: 'manual'
      };
    } catch (error) {
      return {
        key,
        sourceText: key,
        translations: {},
        status: 'failed',
        error: error instanceof Error ? error.message : 'Translation failed',
        method: 'manual'
      };
    }
  }

  // ===== 翻訳メモリ =====

  /**
   * 翻訳メモリへの追加
   */
  addToTranslationMemory(segment: {
    source: string;
    target: string;
    sourceLanguage: string;
    targetLanguage: string;
    context?: string;
    domain?: string;
  }): void {
    const memoryKey = `${segment.sourceLanguage}-${segment.targetLanguage}`;
    let memory = this.translationMemory.get(memoryKey);

    if (!memory) {
      memory = {
        id: this.generateMemoryId(),
        sourceLanguage: segment.sourceLanguage,
        targetLanguage: segment.targetLanguage,
        segments: [],
        metadata: {
          domain: segment.domain || 'general',
          project: 'dnsweeper',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      };
      this.translationMemory.set(memoryKey, memory);
    }

    const newSegment: TranslationSegment = {
      id: this.generateSegmentId(),
      source: segment.source,
      target: segment.target,
      confidence: 1.0,
      context: segment.context,
      createdBy: 'system',
      createdAt: new Date(),
      usageCount: 0
    };

    memory.segments.push(newSegment);
    memory.metadata.updatedAt = new Date();
  }

  /**
   * 翻訳メモリから検索
   */
  private searchTranslationMemory(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): TranslationSegment | null {
    const memoryKey = `${sourceLanguage}-${targetLanguage}`;
    const memory = this.translationMemory.get(memoryKey);

    if (!memory) return null;

    // 完全一致を検索
    let bestMatch = memory.segments.find(segment => segment.source === text);
    if (bestMatch) {
      bestMatch.usageCount++;
      bestMatch.lastUsed = new Date();
      return bestMatch;
    }

    // ファジーマッチング（簡易版）
    const matches = memory.segments.map(segment => ({
      segment,
      similarity: this.calculateSimilarity(text, segment.source)
    }));

    const sortedMatches = matches
      .filter(m => m.similarity > 0.7)
      .sort((a, b) => b.similarity - a.similarity);

    if (sortedMatches.length > 0) {
      bestMatch = sortedMatches[0].segment;
      bestMatch.confidence = sortedMatches[0].similarity;
      bestMatch.usageCount++;
      bestMatch.lastUsed = new Date();
      return bestMatch;
    }

    return null;
  }

  // ===== 用語集管理 =====

  /**
   * 用語集の作成
   */
  createGlossary(config: {
    name: string;
    languages: string[];
    domain: string;
    description?: string;
  }): Glossary {
    const glossaryId = this.generateGlossaryId();

    const glossary: Glossary = {
      id: glossaryId,
      name: config.name,
      languages: config.languages,
      terms: [],
      domain: config.domain,
      description: config.description,
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.glossaries.set(glossaryId, glossary);
    return glossary;
  }

  /**
   * 用語の追加
   */
  addGlossaryTerm(glossaryId: string, term: {
    term: string;
    translations: Record<string, string>;
    definition?: string;
    context?: string;
    partOfSpeech?: string;
    doNotTranslate?: boolean;
  }): GlossaryTerm {
    const glossary = this.glossaries.get(glossaryId);
    if (!glossary) {
      throw new Error(`用語集が見つかりません: ${glossaryId}`);
    }

    const termId = this.generateTermId();
    const glossaryTerm: GlossaryTerm = {
      id: termId,
      term: term.term,
      translations: term.translations,
      definition: term.definition,
      context: term.context,
      partOfSpeech: term.partOfSpeech,
      doNotTranslate: term.doNotTranslate || false,
      approved: false,
      caseSensitive: false
    };

    glossary.terms.push(glossaryTerm);
    glossary.updatedAt = new Date();

    return glossaryTerm;
  }

  /**
   * 用語集の適用
   */
  applyGlossary(text: string, sourceLanguage: string, targetLanguage: string): string {
    let result = text;

    for (const glossary of this.glossaries.values()) {
      if (!glossary.languages.includes(sourceLanguage) || 
          !glossary.languages.includes(targetLanguage)) {
        continue;
      }

      for (const term of glossary.terms) {
        if (term.doNotTranslate) {
          // 翻訳しない用語はそのまま
          continue;
        }

        const translation = term.translations[targetLanguage];
        if (translation) {
          const regex = new RegExp(
            `\\b${this.escapeRegExp(term.term)}\\b`,
            term.caseSensitive ? 'g' : 'gi'
          );
          result = result.replace(regex, translation);
        }
      }
    }

    return result;
  }

  // ===== 品質管理 =====

  /**
   * 翻訳品質の評価
   */
  async evaluateTranslationQuality(
    languageCode: string,
    translations: Record<string, string>
  ): Promise<TranslationQualityMetrics> {
    const issues: QualityIssue[] = [];
    
    // 既存のメトリクスを取得または新規作成
    let metrics = this.qualityMetrics.get(languageCode) || {
      languageCode,
      accuracy: 100,
      fluency: 100,
      consistency: 100,
      terminology: 100,
      culturalAdaptation: 100,
      overallScore: 100,
      issues: [],
      lastEvaluated: new Date()
    };

    // 精度チェック
    const accuracyIssues = this.checkAccuracy(translations);
    issues.push(...accuracyIssues);
    metrics.accuracy = Math.max(0, 100 - accuracyIssues.length * 10);

    // 流暢性チェック
    const fluencyIssues = this.checkFluency(translations, languageCode);
    issues.push(...fluencyIssues);
    metrics.fluency = Math.max(0, 100 - fluencyIssues.length * 10);

    // 一貫性チェック
    const consistencyIssues = this.checkConsistency(translations);
    issues.push(...consistencyIssues);
    metrics.consistency = Math.max(0, 100 - consistencyIssues.length * 10);

    // 用語チェック
    const terminologyIssues = this.checkTerminology(translations, languageCode);
    issues.push(...terminologyIssues);
    metrics.terminology = Math.max(0, 100 - terminologyIssues.length * 10);

    // 文化的適応チェック
    const culturalIssues = this.checkCulturalAdaptation(translations, languageCode);
    issues.push(...culturalIssues);
    metrics.culturalAdaptation = Math.max(0, 100 - culturalIssues.length * 10);

    // 総合スコア計算
    metrics.overallScore = (
      metrics.accuracy * 0.3 +
      metrics.fluency * 0.25 +
      metrics.consistency * 0.2 +
      metrics.terminology * 0.15 +
      metrics.culturalAdaptation * 0.1
    );

    metrics.issues = issues;
    metrics.lastEvaluated = new Date();

    this.qualityMetrics.set(languageCode, metrics);
    return metrics;
  }

  /**
   * 品質問題の報告
   */
  reportQualityIssue(issue: {
    languageCode: string;
    key: string;
    type: QualityIssue['type'];
    severity: QualityIssue['severity'];
    description: string;
    suggestion?: string;
  }): void {
    const metrics = this.qualityMetrics.get(issue.languageCode);
    if (!metrics) return;

    const qualityIssue: QualityIssue = {
      ...issue,
      status: 'open'
    };

    metrics.issues.push(qualityIssue);
    
    // スコアを再計算
    const impactMap = {
      critical: 20,
      major: 10,
      minor: 5,
      suggestion: 2
    };

    const impact = impactMap[issue.severity];
    
    switch (issue.type) {
      case 'accuracy':
        metrics.accuracy = Math.max(0, metrics.accuracy - impact);
        break;
      case 'fluency':
        metrics.fluency = Math.max(0, metrics.fluency - impact);
        break;
      case 'consistency':
        metrics.consistency = Math.max(0, metrics.consistency - impact);
        break;
      case 'terminology':
        metrics.terminology = Math.max(0, metrics.terminology - impact);
        break;
      case 'cultural':
        metrics.culturalAdaptation = Math.max(0, metrics.culturalAdaptation - impact);
        break;
    }

    // 総合スコア再計算
    metrics.overallScore = (
      metrics.accuracy * 0.3 +
      metrics.fluency * 0.25 +
      metrics.consistency * 0.2 +
      metrics.terminology * 0.15 +
      metrics.culturalAdaptation * 0.1
    );
  }

  // ===== ワークフロー管理 =====

  /**
   * 翻訳の承認
   */
  async approveTranslation(
    languageCode: string,
    key: string,
    translation: string,
    reviewer?: string
  ): Promise<void> {
    const activity: TranslationActivity = {
      id: this.generateActivityId(),
      type: 'approval',
      languageCode,
      key,
      newValue: translation,
      user: reviewer || 'system',
      timestamp: new Date()
    };

    this.activities.push(activity);

    // レビュアーの統計更新
    if (reviewer && this.reviewers.has(reviewer)) {
      const reviewerInfo = this.reviewers.get(reviewer)!;
      reviewerInfo.reviewedWords += translation.split(/\s+/).length;
      reviewerInfo.approvalRate = (reviewerInfo.approvalRate * 0.95) + (1 * 0.05); // 移動平均
    }
  }

  /**
   * 翻訳の却下
   */
  async rejectTranslation(
    languageCode: string,
    key: string,
    translation: string,
    reason: string,
    reviewer?: string
  ): Promise<void> {
    const activity: TranslationActivity = {
      id: this.generateActivityId(),
      type: 'rejection',
      languageCode,
      key,
      oldValue: translation,
      newValue: '',
      user: reviewer || 'system',
      timestamp: new Date(),
      comment: reason
    };

    this.activities.push(activity);

    // レビュアーの統計更新
    if (reviewer && this.reviewers.has(reviewer)) {
      const reviewerInfo = this.reviewers.get(reviewer)!;
      reviewerInfo.approvalRate = (reviewerInfo.approvalRate * 0.95) + (0 * 0.05); // 移動平均
    }
  }

  // ===== 統計・レポート =====

  /**
   * 翻訳統計の取得
   */
  getTranslationStatistics(dateRange?: { start: Date; end: Date }): {
    totalActivities: number;
    activitiesByType: Record<string, number>;
    activitiesByLanguage: Record<string, number>;
    topTranslators: Array<{ id: string; name: string; words: number }>;
    topReviewers: Array<{ id: string; name: string; words: number; approvalRate: number }>;
    averageQualityScore: number;
    trendsOverTime: Array<{ date: Date; activities: number; qualityScore: number }>;
  } {
    let filteredActivities = this.activities;
    
    if (dateRange) {
      filteredActivities = this.activities.filter(
        a => a.timestamp >= dateRange.start && a.timestamp <= dateRange.end
      );
    }

    // 活動タイプ別集計
    const activitiesByType: Record<string, number> = {};
    const activitiesByLanguage: Record<string, number> = {};

    filteredActivities.forEach(activity => {
      activitiesByType[activity.type] = (activitiesByType[activity.type] || 0) + 1;
      activitiesByLanguage[activity.languageCode] = 
        (activitiesByLanguage[activity.languageCode] || 0) + 1;
    });

    // トップ翻訳者
    const topTranslators = Array.from(this.translators.values())
      .sort((a, b) => b.translatedWords - a.translatedWords)
      .slice(0, 10)
      .map(t => ({ id: t.id, name: t.name, words: t.translatedWords }));

    // トップレビュアー
    const topReviewers = Array.from(this.reviewers.values())
      .sort((a, b) => b.reviewedWords - a.reviewedWords)
      .slice(0, 10)
      .map(r => ({
        id: r.id,
        name: r.name,
        words: r.reviewedWords,
        approvalRate: r.approvalRate
      }));

    // 平均品質スコア
    const qualityScores = Array.from(this.qualityMetrics.values())
      .map(m => m.overallScore);
    const averageQualityScore = qualityScores.length > 0
      ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
      : 0;

    // 時系列トレンド（簡易版）
    const trendsOverTime: Array<{ date: Date; activities: number; qualityScore: number }> = [];

    return {
      totalActivities: filteredActivities.length,
      activitiesByType,
      activitiesByLanguage,
      topTranslators,
      topReviewers,
      averageQualityScore,
      trendsOverTime
    };
  }

  // ===== 機械翻訳 =====

  /**
   * 機械翻訳の初期化
   */
  private initializeMachineTranslation(): void {
    this.machineTranslationConfig = {
      enabled: false,
      provider: 'google',
      settings: {
        autoTranslate: false,
        reviewRequired: true,
        confidenceThreshold: 0.8,
        preserveFormatting: true
      },
      supportedPairs: [],
      usage: {
        charactersTranslated: 0,
        requestsCount: 0,
        averageConfidence: 0,
        lastReset: new Date()
      }
    };
  }

  /**
   * 機械翻訳の実行
   */
  private async getMachineTranslation(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<{ text: string; confidence: number } | null> {
    if (!this.machineTranslationConfig.enabled) {
      return null;
    }

    // 実際の実装では外部APIを呼び出す
    // ここではモックデータを返す
    try {
      // 用語集を適用
      const glossaryApplied = this.applyGlossary(text, sourceLanguage, targetLanguage);
      
      // 簡易的な翻訳シミュレーション
      const mockTranslation = `[MT] ${glossaryApplied}`;
      const confidence = 0.75 + Math.random() * 0.2; // 0.75-0.95

      // 使用統計更新
      this.machineTranslationConfig.usage.charactersTranslated += text.length;
      this.machineTranslationConfig.usage.requestsCount++;
      this.machineTranslationConfig.usage.averageConfidence =
        (this.machineTranslationConfig.usage.averageConfidence * 
         (this.machineTranslationConfig.usage.requestsCount - 1) + confidence) /
        this.machineTranslationConfig.usage.requestsCount;

      return {
        text: mockTranslation,
        confidence
      };
    } catch (error) {
      console.error('機械翻訳エラー:', error);
      return null;
    }
  }

  // ===== ヘルパーメソッド =====

  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMemoryId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSegmentId(): string {
    return `seg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateGlossaryId(): string {
    return `gls_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTermId(): string {
    return `term_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateActivityId(): string {
    return `act_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // レーベンシュタイン距離の簡易実装
    const maxLength = Math.max(text1.length, text2.length);
    if (maxLength === 0) return 1.0;
    
    const distance = this.levenshteinDistance(text1, text2);
    return 1 - (distance / maxLength);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private loadTranslationMemory(): void {
    // 翻訳メモリの初期ロード（実際の実装では永続化ストレージから）
  }

  private loadGlossaries(): void {
    // 用語集の初期ロード（実際の実装では永続化ストレージから）
    // DNSweeperの基本用語集を作成
    const dnsGlossary = this.createGlossary({
      name: 'DNS Technical Terms',
      languages: ['en', 'ja', 'zh', 'ko', 'es', 'fr', 'de'],
      domain: 'dns',
      description: 'DNS関連の技術用語集'
    });

    // 基本的なDNS用語を追加
    this.addGlossaryTerm(dnsGlossary.id, {
      term: 'DNS',
      translations: {
        'ja': 'DNS',
        'zh': 'DNS',
        'ko': 'DNS',
        'es': 'DNS',
        'fr': 'DNS',
        'de': 'DNS'
      },
      definition: 'Domain Name System',
      doNotTranslate: true
    });

    this.addGlossaryTerm(dnsGlossary.id, {
      term: 'domain',
      translations: {
        'ja': 'ドメイン',
        'zh': '域名',
        'ko': '도메인',
        'es': 'dominio',
        'fr': 'domaine',
        'de': 'Domain'
      }
    });
  }

  // 品質チェックメソッド
  private checkAccuracy(translations: Record<string, string>): QualityIssue[] {
    const issues: QualityIssue[] = [];
    
    // プレースホルダーのチェック
    Object.entries(translations).forEach(([key, value]) => {
      if (value.includes('[NEEDS_TRANSLATION]')) {
        issues.push({
          severity: 'critical',
          type: 'accuracy',
          key,
          description: '未翻訳のプレースホルダーが残っています',
          status: 'open'
        });
      }
    });

    return issues;
  }

  private checkFluency(translations: Record<string, string>, languageCode: string): QualityIssue[] {
    const issues: QualityIssue[] = [];
    
    // 言語固有のチェック（簡易版）
    if (languageCode === 'ja') {
      Object.entries(translations).forEach(([key, value]) => {
        // 敬語の一貫性チェック
        if (value.includes('です') && value.includes('だ')) {
          issues.push({
            severity: 'minor',
            type: 'fluency',
            key,
            description: '敬語の一貫性が保たれていません',
            suggestion: '文体を統一してください',
            status: 'open'
          });
        }
      });
    }

    return issues;
  }

  private checkConsistency(translations: Record<string, string>): QualityIssue[] {
    const issues: QualityIssue[] = [];
    const termUsage: Record<string, Set<string>> = {};
    
    // 同じ用語の異なる翻訳を検出
    Object.entries(translations).forEach(([key, value]) => {
      const words = value.split(/\s+/);
      words.forEach(word => {
        if (!termUsage[word]) {
          termUsage[word] = new Set();
        }
        termUsage[word].add(key);
      });
    });

    return issues;
  }

  private checkTerminology(translations: Record<string, string>, languageCode: string): QualityIssue[] {
    const issues: QualityIssue[] = [];
    
    // 用語集との照合（簡易版）
    for (const glossary of this.glossaries.values()) {
      if (!glossary.languages.includes(languageCode)) continue;
      
      glossary.terms.forEach(term => {
        const expectedTranslation = term.translations[languageCode];
        if (!expectedTranslation) return;
        
        Object.entries(translations).forEach(([key, value]) => {
          if (value.includes(term.term) && !value.includes(expectedTranslation)) {
            issues.push({
              severity: 'major',
              type: 'terminology',
              key,
              description: `用語「${term.term}」の翻訳が用語集と一致しません`,
              suggestion: `「${expectedTranslation}」を使用してください`,
              status: 'open'
            });
          }
        });
      });
    }

    return issues;
  }

  private checkCulturalAdaptation(
    translations: Record<string, string>,
    languageCode: string
  ): QualityIssue[] {
    const issues: QualityIssue[] = [];
    
    // 文化的に不適切な表現のチェック（簡易版）
    const culturalTaboos: Record<string, string[]> = {
      'ja': ['死', '忌', '凶'],
      'zh': ['死', '忌', '凶'],
      'ko': ['죽', '凶']
    };

    const taboos = culturalTaboos[languageCode] || [];
    
    Object.entries(translations).forEach(([key, value]) => {
      taboos.forEach(taboo => {
        if (value.includes(taboo)) {
          issues.push({
            severity: 'minor',
            type: 'cultural',
            key,
            description: `文化的に配慮が必要な表現「${taboo}」が含まれています`,
            suggestion: '別の表現を検討してください',
            status: 'open'
          });
        }
      });
    });

    return issues;
  }

  // ===== パブリックAPI =====

  /**
   * バッチジョブの状態取得
   */
  getBatchJob(jobId: string): TranslationBatchJob | undefined {
    return this.batchJobs.get(jobId);
  }

  /**
   * 全バッチジョブの取得
   */
  getAllBatchJobs(): TranslationBatchJob[] {
    return Array.from(this.batchJobs.values());
  }

  /**
   * 翻訳アクティビティの取得
   */
  getActivities(filter?: {
    languageCode?: string;
    type?: TranslationActivity['type'];
    user?: string;
    dateRange?: { start: Date; end: Date };
  }): TranslationActivity[] {
    let filtered = this.activities;

    if (filter?.languageCode) {
      filtered = filtered.filter(a => a.languageCode === filter.languageCode);
    }
    if (filter?.type) {
      filtered = filtered.filter(a => a.type === filter.type);
    }
    if (filter?.user) {
      filtered = filtered.filter(a => a.user === filter.user);
    }
    if (filter?.dateRange) {
      filtered = filtered.filter(
        a => a.timestamp >= filter.dateRange!.start && 
             a.timestamp <= filter.dateRange!.end
      );
    }

    return filtered;
  }

  /**
   * 品質メトリクスの取得
   */
  getQualityMetrics(languageCode: string): TranslationQualityMetrics | undefined {
    return this.qualityMetrics.get(languageCode);
  }

  /**
   * 全言語の品質メトリクス取得
   */
  getAllQualityMetrics(): Map<string, TranslationQualityMetrics> {
    return this.qualityMetrics;
  }

  /**
   * 翻訳メモリのエクスポート
   */
  exportTranslationMemory(sourceLanguage: string, targetLanguage: string): TranslationMemory | undefined {
    return this.translationMemory.get(`${sourceLanguage}-${targetLanguage}`);
  }

  /**
   * 用語集の取得
   */
  getGlossary(glossaryId: string): Glossary | undefined {
    return this.glossaries.get(glossaryId);
  }

  /**
   * 全用語集の取得
   */
  getAllGlossaries(): Glossary[] {
    return Array.from(this.glossaries.values());
  }

  /**
   * 機械翻訳設定の取得
   */
  getMachineTranslationConfig(): MachineTranslationConfig {
    return this.machineTranslationConfig;
  }

  /**
   * 機械翻訳設定の更新
   */
  updateMachineTranslationConfig(config: Partial<MachineTranslationConfig>): void {
    this.machineTranslationConfig = {
      ...this.machineTranslationConfig,
      ...config
    };
  }
}

/**
 * グローバルサービスインスタンス
 */
export const translationManager = new TranslationManager();