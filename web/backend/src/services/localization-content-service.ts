/**
 * DNSweeper ローカリゼーションコンテンツサービス
 * コンテンツ管理・SEO最適化・地域別配信
 */

import {
  ContentLocalization,
  LocalizedContent,
  LocalizationWorkflow,
  WorkflowStep,
  WorkflowApproval,
  SeoLocalization,
  LocalizedMetaTags,
  RegionalContent,
  LocalizationContext,
  LanguageDetectionResult
} from '../types/multilingual';

/**
 * ローカリゼーションコンテンツサービス
 */
export class LocalizationContentService {
  private localizedContent: Map<string, ContentLocalization> = new Map();
  private regionalContent: Map<string, RegionalContent> = new Map();
  private workflows: Map<string, LocalizationWorkflow> = new Map();
  private seoTemplates: Map<string, SeoLocalization> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
    this.setupRegionalContent();
  }

  // ===== コンテンツ管理 =====

  /**
   * ローカライズコンテンツの作成
   */
  createLocalizedContent(config: {
    contentId: string;
    contentType: ContentLocalization['contentType'];
    baseLanguage: string;
    title: string;
    content: string;
    excerpt?: string;
    metadata?: Record<string, any>;
  }): ContentLocalization {
    const contentKey = `${config.contentType}:${config.contentId}`;
    
    const localization: ContentLocalization = {
      contentId: config.contentId,
      contentType: config.contentType,
      baseLanguage: config.baseLanguage,
      localizations: {
        [config.baseLanguage]: {
          language: config.baseLanguage,
          title: config.title,
          content: config.content,
          excerpt: config.excerpt,
          metadata: config.metadata,
          status: 'draft',
          lastModified: new Date()
        }
      },
      workflow: this.createWorkflow(config.contentType),
      seo: this.createSeoTemplate(config.contentId, config.baseLanguage)
    };

    this.localizedContent.set(contentKey, localization);
    return localization;
  }

  /**
   * コンテンツの翻訳追加
   */
  addTranslation(
    contentId: string,
    contentType: ContentLocalization['contentType'],
    language: string,
    translation: {
      title: string;
      content: string;
      excerpt?: string;
      metadata?: Record<string, any>;
      translator?: string;
    }
  ): LocalizedContent {
    const contentKey = `${contentType}:${contentId}`;
    const localization = this.localizedContent.get(contentKey);
    
    if (!localization) {
      throw new Error(`コンテンツが見つかりません: ${contentKey}`);
    }

    const localizedContent: LocalizedContent = {
      language,
      title: translation.title,
      content: translation.content,
      excerpt: translation.excerpt,
      metadata: translation.metadata,
      status: 'draft',
      translator: translation.translator,
      lastModified: new Date()
    };

    localization.localizations[language] = localizedContent;
    
    // SEO情報も更新
    this.updateSeoLocalization(localization, language);
    
    return localizedContent;
  }

  /**
   * コンテンツの更新
   */
  updateContent(
    contentId: string,
    contentType: ContentLocalization['contentType'],
    language: string,
    updates: Partial<LocalizedContent>
  ): LocalizedContent {
    const contentKey = `${contentType}:${contentId}`;
    const localization = this.localizedContent.get(contentKey);
    
    if (!localization || !localization.localizations[language]) {
      throw new Error(`ローカライズコンテンツが見つかりません: ${contentKey} (${language})`);
    }

    const content = localization.localizations[language];
    Object.assign(content, updates, { lastModified: new Date() });
    
    return content;
  }

  // ===== ワークフロー管理 =====

  /**
   * ワークフローの作成
   */
  private createWorkflow(contentType: string): LocalizationWorkflow {
    const steps: WorkflowStep[] = [
      {
        id: 'translation',
        name: '翻訳',
        type: 'translation',
        completed: false
      },
      {
        id: 'review',
        name: 'レビュー',
        type: 'review',
        completed: false
      },
      {
        id: 'approval',
        name: '承認',
        type: 'approval',
        completed: false
      },
      {
        id: 'publish',
        name: '公開',
        type: 'publish',
        completed: false
      }
    ];

    const workflow: LocalizationWorkflow = {
      steps,
      currentStep: 0,
      assignees: {},
      deadlines: {},
      approvals: [],
      status: 'pending'
    };

    const workflowId = this.generateWorkflowId();
    this.workflows.set(workflowId, workflow);
    
    return workflow;
  }

  /**
   * ワークフローステップの完了
   */
  completeWorkflowStep(
    contentId: string,
    contentType: ContentLocalization['contentType'],
    language: string,
    stepId: string,
    comment?: string
  ): void {
    const contentKey = `${contentType}:${contentId}`;
    const localization = this.localizedContent.get(contentKey);
    
    if (!localization) {
      throw new Error(`コンテンツが見つかりません: ${contentKey}`);
    }

    const workflow = localization.workflow;
    const stepIndex = workflow.steps.findIndex(s => s.id === stepId);
    
    if (stepIndex === -1) {
      throw new Error(`ワークフローステップが見つかりません: ${stepId}`);
    }

    const step = workflow.steps[stepIndex];
    step.completed = true;
    step.completedAt = new Date();
    
    if (comment) {
      step.comments = step.comments || [];
      step.comments.push(comment);
    }

    // 次のステップに進む
    if (stepIndex < workflow.steps.length - 1) {
      workflow.currentStep = stepIndex + 1;
    } else {
      workflow.status = 'completed';
      
      // コンテンツのステータスを更新
      const content = localization.localizations[language];
      if (content) {
        content.status = 'published';
        content.publishedAt = new Date();
      }
    }
  }

  /**
   * ワークフローの承認
   */
  approveWorkflow(
    contentId: string,
    contentType: ContentLocalization['contentType'],
    language: string,
    stepId: string,
    approver: string,
    comments?: string
  ): void {
    const contentKey = `${contentType}:${contentId}`;
    const localization = this.localizedContent.get(contentKey);
    
    if (!localization) {
      throw new Error(`コンテンツが見つかりません: ${contentKey}`);
    }

    const approval: WorkflowApproval = {
      step: stepId,
      approver,
      approved: true,
      approvedAt: new Date(),
      comments
    };

    localization.workflow.approvals.push(approval);
    
    // ステップも完了にする
    this.completeWorkflowStep(contentId, contentType, language, stepId, comments);
  }

  // ===== SEO最適化 =====

  /**
   * SEOテンプレートの作成
   */
  private createSeoTemplate(contentId: string, baseLanguage: string): SeoLocalization {
    return {
      hreflangTags: true,
      localizedUrls: {
        [baseLanguage]: `/${baseLanguage}/${contentId}`
      },
      metaTags: {
        [baseLanguage]: {
          title: '',
          description: '',
          keywords: []
        }
      },
      sitemaps: {
        [baseLanguage]: `/sitemap-${baseLanguage}.xml`
      }
    };
  }

  /**
   * SEOローカリゼーションの更新
   */
  private updateSeoLocalization(localization: ContentLocalization, language: string): void {
    const content = localization.localizations[language];
    if (!content) return;

    // URLの生成
    localization.seo.localizedUrls[language] = this.generateLocalizedUrl(
      localization.contentId,
      language,
      localization.contentType
    );

    // メタタグの生成
    localization.seo.metaTags[language] = {
      title: content.title,
      description: content.excerpt || this.generateDescription(content.content),
      keywords: this.extractKeywords(content.content, language),
      ogTitle: content.title,
      ogDescription: content.excerpt || this.generateDescription(content.content),
      ogImage: content.metadata?.featuredImage,
      twitterTitle: content.title,
      twitterDescription: content.excerpt || this.generateDescription(content.content)
    };

    // サイトマップの更新
    localization.seo.sitemaps[language] = `/sitemap-${language}.xml`;
  }

  /**
   * hreflangタグの生成
   */
  generateHreflangTags(
    contentId: string,
    contentType: ContentLocalization['contentType']
  ): string[] {
    const contentKey = `${contentType}:${contentId}`;
    const localization = this.localizedContent.get(contentKey);
    
    if (!localization || !localization.seo.hreflangTags) {
      return [];
    }

    const tags: string[] = [];
    const baseUrl = this.getBaseUrl();
    
    Object.entries(localization.seo.localizedUrls).forEach(([lang, url]) => {
      tags.push(`<link rel="alternate" hreflang="${lang}" href="${baseUrl}${url}" />`);
    });

    // x-defaultタグ
    const defaultLang = localization.baseLanguage;
    const defaultUrl = localization.seo.localizedUrls[defaultLang];
    if (defaultUrl) {
      tags.push(`<link rel="alternate" hreflang="x-default" href="${baseUrl}${defaultUrl}" />`);
    }

    return tags;
  }

  /**
   * 構造化データの生成
   */
  generateStructuredData(
    contentId: string,
    contentType: ContentLocalization['contentType'],
    language: string
  ): object {
    const contentKey = `${contentType}:${contentId}`;
    const localization = this.localizedContent.get(contentKey);
    
    if (!localization || !localization.localizations[language]) {
      return {};
    }

    const content = localization.localizations[language];
    const meta = localization.seo.metaTags[language];
    
    const structuredData: any = {
      '@context': 'https://schema.org',
      '@type': this.getSchemaType(contentType),
      'inLanguage': language,
      'headline': content.title,
      'description': meta?.description,
      'datePublished': content.publishedAt?.toISOString(),
      'dateModified': content.lastModified.toISOString()
    };

    // コンテンツタイプ別の追加フィールド
    switch (contentType) {
      case 'article':
        structuredData.articleBody = content.content;
        structuredData.author = content.metadata?.author;
        structuredData.publisher = {
          '@type': 'Organization',
          'name': 'DNSweeper',
          'logo': {
            '@type': 'ImageObject',
            'url': `${this.getBaseUrl()}/logo.png`
          }
        };
        break;
      
      case 'product':
        structuredData.name = content.title;
        structuredData.offers = content.metadata?.offers;
        structuredData.aggregateRating = content.metadata?.rating;
        break;
    }

    return structuredData;
  }

  // ===== 地域別コンテンツ =====

  /**
   * 地域別コンテンツの設定
   */
  setRegionalContent(region: string, config: Partial<RegionalContent>): RegionalContent {
    const existing = this.regionalContent.get(region);
    
    const regional: RegionalContent = {
      region,
      languages: config.languages || existing?.languages || [],
      content: {
        images: {},
        videos: {},
        documents: {},
        customText: {},
        ...existing?.content,
        ...config.content
      },
      restrictions: {
        blockedContent: [],
        requiredContent: [],
        ...existing?.restrictions,
        ...config.restrictions
      },
      compliance: {
        ...existing?.compliance,
        ...config.compliance
      }
    };

    this.regionalContent.set(region, regional);
    return regional;
  }

  /**
   * 地域に基づくコンテンツフィルタリング
   */
  filterContentByRegion(
    content: string,
    region: string
  ): { content: string; blocked: string[]; warnings: string[] } {
    const regional = this.regionalContent.get(region);
    
    if (!regional) {
      return { content, blocked: [], warnings: [] };
    }

    let filteredContent = content;
    const blocked: string[] = [];
    const warnings: string[] = [];

    // ブロックされたコンテンツの除去
    regional.restrictions.blockedContent.forEach(blockedItem => {
      if (content.includes(blockedItem)) {
        filteredContent = filteredContent.replace(
          new RegExp(blockedItem, 'gi'),
          '[BLOCKED]'
        );
        blocked.push(blockedItem);
      }
    });

    // 必須コンテンツのチェック
    regional.restrictions.requiredContent.forEach(requiredItem => {
      if (!content.includes(requiredItem)) {
        warnings.push(`必須コンテンツが不足: ${requiredItem}`);
      }
    });

    // 年齢制限チェック
    if (regional.restrictions.ageRestrictions) {
      warnings.push(`年齢制限: ${regional.restrictions.ageRestrictions}歳以上`);
    }

    return { content: filteredContent, blocked, warnings };
  }

  // ===== 言語検出 =====

  /**
   * 言語の自動検出
   */
  detectLanguage(context: {
    acceptLanguageHeader?: string;
    userAgent?: string;
    ipAddress?: string;
    domain?: string;
    path?: string;
    cookie?: string;
  }): LanguageDetectionResult {
    const detections: Array<{ language: string; confidence: number; source: LanguageDetectionResult['source'] }> = [];

    // Accept-Languageヘッダーから検出
    if (context.acceptLanguageHeader) {
      const languages = this.parseAcceptLanguageHeader(context.acceptLanguageHeader);
      languages.forEach((lang, index) => {
        detections.push({
          language: lang.code,
          confidence: lang.quality * (1 - index * 0.1),
          source: 'header'
        });
      });
    }

    // URLパスから検出
    if (context.path) {
      const pathMatch = context.path.match(/^\/([a-z]{2}(-[A-Z]{2})?)\//);
      if (pathMatch) {
        detections.push({
          language: pathMatch[1],
          confidence: 0.9,
          source: 'url'
        });
      }
    }

    // ドメインから検出
    if (context.domain) {
      const domainLanguage = this.getLanguageFromDomain(context.domain);
      if (domainLanguage) {
        detections.push({
          language: domainLanguage,
          confidence: 0.8,
          source: 'url'
        });
      }
    }

    // Cookieから検出
    if (context.cookie) {
      const cookieLanguage = this.getLanguageFromCookie(context.cookie);
      if (cookieLanguage) {
        detections.push({
          language: cookieLanguage,
          confidence: 0.95,
          source: 'cookie'
        });
      }
    }

    // 最も信頼度の高い言語を選択
    if (detections.length === 0) {
      return {
        detectedLanguage: 'en',
        confidence: 0.5,
        alternativeLanguages: [],
        source: 'default'
      };
    }

    detections.sort((a, b) => b.confidence - a.confidence);
    const primary = detections[0];
    const alternatives = detections
      .slice(1, 4)
      .map(d => ({ language: d.language, confidence: d.confidence }));

    return {
      detectedLanguage: primary.language,
      confidence: primary.confidence,
      alternativeLanguages: alternatives,
      source: primary.source
    };
  }

  // ===== ヘルパーメソッド =====

  private initializeDefaultTemplates(): void {
    // デフォルトのSEOテンプレート設定
  }

  private setupRegionalContent(): void {
    // 主要地域の初期設定
    const regions = [
      { code: 'US', languages: ['en'], currency: 'USD' },
      { code: 'JP', languages: ['ja'], currency: 'JPY' },
      { code: 'CN', languages: ['zh'], currency: 'CNY' },
      { code: 'EU', languages: ['en', 'de', 'fr', 'es', 'it'], currency: 'EUR' },
      { code: 'GB', languages: ['en'], currency: 'GBP' },
      { code: 'IN', languages: ['en', 'hi'], currency: 'INR' },
      { code: 'BR', languages: ['pt'], currency: 'BRL' },
      { code: 'RU', languages: ['ru'], currency: 'RUB' },
      { code: 'KR', languages: ['ko'], currency: 'KRW' },
      { code: 'AE', languages: ['ar', 'en'], currency: 'AED' }
    ];

    regions.forEach(region => {
      this.setRegionalContent(region.code, {
        languages: region.languages,
        compliance: {
          gdpr: ['EU', 'GB'].includes(region.code),
          ccpa: region.code === 'US',
          cookies: true,
          dataRetention: ['EU', 'GB'].includes(region.code) ? 90 : 365
        }
      });
    });
  }

  private generateWorkflowId(): string {
    return `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateLocalizedUrl(contentId: string, language: string, contentType: string): string {
    // URL生成ロジック
    const slugify = (text: string) => {
      return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    };

    return `/${language}/${contentType}/${slugify(contentId)}`;
  }

  private generateDescription(content: string, maxLength: number = 160): string {
    // HTMLタグを除去
    const textOnly = content.replace(/<[^>]*>/g, '');
    
    // 改行を空白に
    const singleLine = textOnly.replace(/\s+/g, ' ').trim();
    
    // 最大長に切り詰め
    if (singleLine.length <= maxLength) {
      return singleLine;
    }
    
    return singleLine.substring(0, maxLength - 3) + '...';
  }

  private extractKeywords(content: string, language: string): string[] {
    // 簡易的なキーワード抽出
    const textOnly = content.replace(/<[^>]*>/g, '');
    const words = textOnly.split(/\s+/);
    
    // ストップワード除去（言語別）
    const stopWords = this.getStopWords(language);
    
    const keywords = words
      .filter(word => word.length > 3)
      .filter(word => !stopWords.includes(word.toLowerCase()))
      .map(word => word.toLowerCase());

    // 頻度計算
    const frequency: Record<string, number> = {};
    keywords.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    // 頻度順にソート
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  private getStopWords(language: string): string[] {
    const stopWords: Record<string, string[]> = {
      'en': ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'have', 'had', 'were', 'said', 'each', 'which', 'their', 'will', 'this', 'that', 'from', 'with'],
      'ja': ['の', 'に', 'は', 'を', 'た', 'が', 'で', 'て', 'と', 'し', 'れ', 'さ', 'ある', 'いる', 'も', 'する', 'から', 'な', 'こと', 'として'],
      'zh': ['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去'],
      'default': []
    };

    return stopWords[language] || stopWords.default;
  }

  private getBaseUrl(): string {
    // 環境変数から取得
    return process.env.BASE_URL || 'https://dnsweeper.com';
  }

  private getSchemaType(contentType: ContentLocalization['contentType']): string {
    const typeMap: Record<ContentLocalization['contentType'], string> = {
      'page': 'WebPage',
      'article': 'Article',
      'product': 'Product',
      'email': 'EmailMessage',
      'notification': 'Message'
    };
    return typeMap[contentType] || 'WebPage';
  }

  private parseAcceptLanguageHeader(header: string): Array<{ code: string; quality: number }> {
    return header
      .split(',')
      .map(lang => {
        const parts = lang.trim().split(';');
        const code = parts[0];
        const quality = parts[1] ? parseFloat(parts[1].split('=')[1]) : 1.0;
        return { code, quality };
      })
      .sort((a, b) => b.quality - a.quality);
  }

  private getLanguageFromDomain(domain: string): string | null {
    const domainMap: Record<string, string> = {
      '.jp': 'ja',
      '.cn': 'zh',
      '.kr': 'ko',
      '.de': 'de',
      '.fr': 'fr',
      '.es': 'es',
      '.it': 'it',
      '.ru': 'ru',
      '.br': 'pt',
      '.in': 'hi'
    };

    for (const [tld, lang] of Object.entries(domainMap)) {
      if (domain.endsWith(tld)) {
        return lang;
      }
    }

    return null;
  }

  private getLanguageFromCookie(cookieString: string): string | null {
    const cookies = cookieString.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    return cookies['dnsweeper-language'] || null;
  }

  // ===== パブリックAPI =====

  /**
   * コンテンツの取得
   */
  getContent(
    contentId: string,
    contentType: ContentLocalization['contentType'],
    language: string
  ): LocalizedContent | undefined {
    const contentKey = `${contentType}:${contentId}`;
    const localization = this.localizedContent.get(contentKey);
    
    if (!localization) return undefined;
    
    return localization.localizations[language];
  }

  /**
   * 全言語のコンテンツ取得
   */
  getAllLocalizations(
    contentId: string,
    contentType: ContentLocalization['contentType']
  ): ContentLocalization | undefined {
    const contentKey = `${contentType}:${contentId}`;
    return this.localizedContent.get(contentKey);
  }

  /**
   * 公開済みコンテンツの取得
   */
  getPublishedContent(language: string): Array<{
    contentId: string;
    contentType: ContentLocalization['contentType'];
    content: LocalizedContent;
  }> {
    const published: Array<{
      contentId: string;
      contentType: ContentLocalization['contentType'];
      content: LocalizedContent;
    }> = [];

    this.localizedContent.forEach((localization) => {
      const content = localization.localizations[language];
      if (content && content.status === 'published') {
        published.push({
          contentId: localization.contentId,
          contentType: localization.contentType,
          content
        });
      }
    });

    return published;
  }

  /**
   * ワークフローステータスの取得
   */
  getWorkflowStatus(
    contentId: string,
    contentType: ContentLocalization['contentType']
  ): LocalizationWorkflow | undefined {
    const contentKey = `${contentType}:${contentId}`;
    const localization = this.localizedContent.get(contentKey);
    
    return localization?.workflow;
  }

  /**
   * 地域設定の取得
   */
  getRegionalContent(region: string): RegionalContent | undefined {
    return this.regionalContent.get(region);
  }

  /**
   * SEO情報の取得
   */
  getSeoInfo(
    contentId: string,
    contentType: ContentLocalization['contentType'],
    language: string
  ): {
    metaTags: LocalizedMetaTags;
    url: string;
    hreflangTags: string[];
    structuredData: object;
  } | undefined {
    const contentKey = `${contentType}:${contentId}`;
    const localization = this.localizedContent.get(contentKey);
    
    if (!localization || !localization.seo.metaTags[language]) {
      return undefined;
    }

    return {
      metaTags: localization.seo.metaTags[language],
      url: localization.seo.localizedUrls[language],
      hreflangTags: this.generateHreflangTags(contentId, contentType),
      structuredData: this.generateStructuredData(contentId, contentType, language)
    };
  }

  /**
   * サイトマップエントリの生成
   */
  generateSitemapEntries(language: string): Array<{
    url: string;
    lastmod: string;
    changefreq: string;
    priority: number;
  }> {
    const entries: Array<{
      url: string;
      lastmod: string;
      changefreq: string;
      priority: number;
    }> = [];

    const baseUrl = this.getBaseUrl();

    this.localizedContent.forEach((localization) => {
      const content = localization.localizations[language];
      if (content && content.status === 'published') {
        const url = localization.seo.localizedUrls[language];
        if (url) {
          entries.push({
            url: `${baseUrl}${url}`,
            lastmod: content.lastModified.toISOString(),
            changefreq: this.getChangeFrequency(content.lastModified),
            priority: this.getPagePriority(localization.contentType)
          });
        }
      }
    });

    return entries;
  }

  private getChangeFrequency(lastModified: Date): string {
    const daysSinceModified = Math.floor(
      (Date.now() - lastModified.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceModified < 7) return 'daily';
    if (daysSinceModified < 30) return 'weekly';
    if (daysSinceModified < 365) return 'monthly';
    return 'yearly';
  }

  private getPagePriority(contentType: ContentLocalization['contentType']): number {
    const priorities: Record<ContentLocalization['contentType'], number> = {
      'page': 0.8,
      'article': 0.6,
      'product': 0.7,
      'email': 0.1,
      'notification': 0.1
    };
    return priorities[contentType] || 0.5;
  }
}

/**
 * グローバルサービスインスタンス
 */
export const localizationContentService = new LocalizationContentService();