/**
 * DNS アルゴリズム分析
 * Nグラム分析、語彙解析、統計的分析を担当
 */

import { Logger } from './logger.js';

import type { AlgorithmicAnalysis } from './security-types.js';

export class DNSAlgorithmicAnalyzer {
  private logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger || new Logger({ verbose: false });
  }

  /**
   * アルゴリズム分析の実行
   */
  async performAlgorithmicAnalysis(
    domain: string
  ): Promise<AlgorithmicAnalysis> {
    try {
      this.logger.debug('アルゴリズム分析開始', { domain });

      const analysis: AlgorithmicAnalysis = {
        domain,
        timestamp: new Date(),
        domainGenerationScore: this.calculateRandomnessScore(domain),
        entropyScore: this.calculateEntropy(domain),
        randomnessScore: this.calculateRandomnessScore(domain),
        typosquattingScore: this.calculateTyposquattingScore(domain),
        homographScore: this.calculateHomographScore(domain),
        ngramAnalysis: this.performNgramAnalysis(domain),
        lexicalAnalysis: this.performLexicalAnalysis(domain),
      };

      this.logger.debug('アルゴリズム分析完了', {
        domain,
        entropyScore: analysis.entropyScore,
        randomnessScore: analysis.randomnessScore,
      });

      return analysis;
    } catch (error) {
      this.logger.error('アルゴリズム分析エラー', error as Error);
      throw error;
    }
  }

  /**
   * エントロピー計算
   */
  private calculateEntropy(domain: string): number {
    const chars = domain.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    if (chars.length === 0) return 0;

    const charCounts = new Map<string, number>();
    const total = chars.length;

    // 文字頻度の計算
    for (const char of chars) {
      charCounts.set(char, (charCounts.get(char) || 0) + 1);
    }

    // エントロピー計算
    let entropy = 0;
    for (const count of charCounts.values()) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }

    return Math.round((entropy / Math.log2(36)) * 100); // 正規化して0-100に
  }

  /**
   * ランダム性スコア計算
   */
  private calculateRandomnessScore(domain: string): number {
    const chars = domain.replace(/[^a-zA-Z0-9]/g, '');
    let randomnessScore = 0;

    // 連続文字の検出
    let consecutiveCount = 1;
    for (let i = 1; i < chars.length; i++) {
      if (chars[i] === chars[i - 1]) {
        consecutiveCount++;
      } else {
        if (consecutiveCount > 2) {
          randomnessScore += 20; // 連続文字はランダム性を下げる
        }
        consecutiveCount = 1;
      }
    }

    // 数字と文字の混在
    const hasNumbers = /\d/.test(chars);
    const hasLetters = /[a-zA-Z]/.test(chars);
    if (hasNumbers && hasLetters) {
      randomnessScore += 30;
    }

    // 文字列長による調整
    if (chars.length > 15) {
      randomnessScore += 20;
    }
    if (chars.length > 25) {
      randomnessScore += 20;
    }

    return Math.min(100, randomnessScore);
  }

  /**
   * タイポスクワッティングスコア計算
   */
  private calculateTyposquattingScore(domain: string): number {
    // 人気ドメインのリスト（実際の実装ではより包括的なリストを使用）
    const popularDomains = [
      'google',
      'facebook',
      'amazon',
      'microsoft',
      'apple',
      'twitter',
      'instagram',
      'youtube',
      'linkedin',
      'github',
      'paypal',
      'ebay',
      'netflix',
      'adobe',
      'salesforce',
    ];

    let maxSimilarity = 0;

    for (const popular of popularDomains) {
      const similarity = this.calculateLevenshteinSimilarity(domain, popular);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }

    // 高い類似度をスコアとして返す
    return maxSimilarity;
  }

  /**
   * ホモグラフスコア計算
   */
  private calculateHomographScore(domain: string): number {
    // ホモグラフ攻撃の検出（同じ見た目の異なる文字）
    const homographPairs = new Map([
      ['а', 'a'], // キリル文字
      ['е', 'e'],
      ['о', 'o'],
      ['р', 'p'],
      ['с', 'c'],
      ['х', 'x'],
      ['і', 'i'],
      ['ѕ', 's'],
      ['у', 'y'],
    ]);

    let score = 0;
    for (const char of domain) {
      if (homographPairs.has(char)) {
        score += 25;
      }
    }

    return Math.min(100, score);
  }

  /**
   * Nグラム分析
   */
  private performNgramAnalysis(
    domain: string
  ): AlgorithmicAnalysis['ngramAnalysis'] {
    const chars = domain.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const bigrams = new Map<string, number>();
    const trigrams = new Map<string, number>();

    // バイグラム分析
    for (let i = 0; i < chars.length - 1; i++) {
      const bigram = chars.slice(i, i + 2);
      bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
    }

    // トライグラム分析
    for (let i = 0; i < chars.length - 2; i++) {
      const trigram = chars.slice(i, i + 3);
      trigrams.set(trigram, (trigrams.get(trigram) || 0) + 1);
    }

    // 疑わしいNグラムの検出
    const suspiciousNgrams: string[] = [];

    // 繰り返しパターンの検出
    for (const [ngram, count] of bigrams.entries()) {
      if (count > 2 && ngram[0] === ngram[1]) {
        suspiciousNgrams.push(ngram);
      }
    }

    return {
      bigramScore:
        (Array.from(bigrams.values()).reduce((a, b) => a + b, 0) /
          chars.length) *
        100,
      trigramScore:
        (Array.from(trigrams.values()).reduce((a, b) => a + b, 0) /
          chars.length) *
        100,
      characterFrequency: this.calculateCharacterFrequency(chars),
      suspiciousNgrams,
    };
  }

  /**
   * 語彙分析
   */
  private performLexicalAnalysis(
    domain: string
  ): AlgorithmicAnalysis['lexicalAnalysis'] {
    const chars = domain.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    return {
      dictionaryScore: this.calculateDictionaryScore(chars),
      randomnessScore: this.calculateRandomnessScore(chars),
      pronounceabilityScore: this.calculatePronounceabilityScore(chars),
      languageDetection: this.detectLanguage(chars),
      suspiciousTokens: this.findSuspiciousTokens(chars),
    };
  }

  /**
   * 文字頻度計算
   */
  private calculateCharacterFrequency(text: string): Record<string, number> {
    const frequency: Record<string, number> = {};
    const total = text.length;

    for (const char of text) {
      frequency[char] = (frequency[char] || 0) + 1;
    }

    // 頻度を正規化
    for (const char in frequency) {
      frequency[char] = Math.round((frequency[char] / total) * 100);
    }

    return frequency;
  }

  /**
   * 辞書スコア計算
   */
  private calculateDictionaryScore(text: string): number {
    // 英語の一般的な単語リスト（実際の実装ではより包括的な辞書を使用）
    const commonWords = [
      'the',
      'and',
      'for',
      'are',
      'but',
      'not',
      'you',
      'all',
      'can',
      'had',
      'her',
      'was',
      'one',
      'our',
      'out',
      'day',
      'get',
      'has',
      'him',
      'his',
      'how',
      'its',
      'may',
      'new',
      'now',
      'old',
      'see',
      'two',
      'way',
      'who',
      'boy',
      'did',
      'man',
      'end',
      'few',
      'got',
      'let',
      'put',
      'say',
      'she',
      'too',
      'use',
      'web',
      'app',
      'api',
      'dev',
      'tech',
      'data',
    ];

    let foundWords = 0;
    let totalLength = 0;

    for (const word of commonWords) {
      if (text.includes(word)) {
        foundWords++;
        totalLength += word.length;
      }
    }

    // 見つかった単語の割合と長さを考慮
    const wordRatio = foundWords / commonWords.length;
    const lengthRatio = totalLength / text.length;

    return Math.round((wordRatio + lengthRatio) * 50);
  }

  /**
   * 発音可能性スコア計算
   */
  private calculatePronounceabilityScore(text: string): number {
    // 母音と子音のパターンを分析
    const vowels = 'aeiou';
    const consonants = 'bcdfghjklmnpqrstvwxyz';

    let vowelCount = 0;
    let consonantCount = 0;
    let vowelConsonantTransitions = 0;
    let previousIsVowel = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i].toLowerCase();
      const isVowel = vowels.includes(char);
      const isConsonant = consonants.includes(char);

      if (isVowel) {
        vowelCount++;
        if (i > 0 && !previousIsVowel) {
          vowelConsonantTransitions++;
        }
        previousIsVowel = true;
      } else if (isConsonant) {
        consonantCount++;
        if (i > 0 && previousIsVowel) {
          vowelConsonantTransitions++;
        }
        previousIsVowel = false;
      }
    }

    // 理想的な母音子音比率 (約30-40%が母音)
    const vowelRatio = vowelCount / (vowelCount + consonantCount);
    const idealVowelRatio = 0.35;
    const vowelRatioScore = 100 - Math.abs(vowelRatio - idealVowelRatio) * 200;

    // 母音子音の遷移数（発音しやすさの指標）
    const transitionScore = Math.min(
      100,
      (vowelConsonantTransitions / text.length) * 200
    );

    return Math.round((vowelRatioScore + transitionScore) / 2);
  }

  /**
   * 言語検出
   */
  private detectLanguage(text: string): string {
    // 簡易的な言語検出（実際の実装ではより高度な手法を使用）
    const englishChars = /^[a-z0-9]+$/i;
    const cyrillicChars = /[а-я]/i;
    const arabicChars = /[\u0600-\u06FF]/;
    const chineseChars = /[\u4e00-\u9fff]/;

    if (cyrillicChars.test(text)) return 'ru';
    if (arabicChars.test(text)) return 'ar';
    if (chineseChars.test(text)) return 'zh';
    if (englishChars.test(text)) return 'en';

    return 'unknown';
  }

  /**
   * 疑わしいトークンの検出
   */
  private findSuspiciousTokens(text: string): string[] {
    const suspiciousTokens: string[] = [];

    // 疑わしいパターン
    const suspiciousPatterns = [
      /(.)\1{3,}/g, // 同じ文字が4回以上連続
      /[0-9]{6,}/g, // 6桁以上の数字
      /[a-z]{20,}/g, // 20文字以上の連続英字
      /(.)(?=.*\1.*\1.*\1)/g, // 同じ文字が4回以上出現
    ];

    for (const pattern of suspiciousPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        suspiciousTokens.push(...matches);
      }
    }

    return [...new Set(suspiciousTokens)]; // 重複排除
  }

  /**
   * レーベンシュタイン類似度計算
   */
  private calculateLevenshteinSimilarity(str1: string, str2: string): number {
    const matrix: number[][] = [];
    const len1 = str1.length;
    const len2 = str2.length;

    // 初期化
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // 動的計画法
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // 削除
          matrix[i][j - 1] + 1, // 挿入
          matrix[i - 1][j - 1] + cost // 置換
        );
      }
    }

    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);

    // 類似度を0-100のスコアに変換
    return Math.round(((maxLen - distance) / maxLen) * 100);
  }
}
