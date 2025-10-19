interface AIDetectionMetrics {
  perplexity: number;
  burstiness: number;
  typeTokenRatio: number;
  crossEntropy: number;
  sentenceVariance: number;
  fanoFactor: number;
  suspiciousWordCount: number;
  rareWordFrequency: number;
  repetitiveNGrams: number;
}

interface AIDetectionResult {
  isAIGenerated: boolean;
  confidence: number;
  metrics: AIDetectionMetrics;
  suspiciousWords: Array<{ word: string; count: number }>;
  explanation: string;
  recommendations: string[];
}

interface AIDetectionResponse {
  success: boolean;
  result?: AIDetectionResult;
  error?: string;
}

const AI_SUSPICIOUS_WORDS = [
  'delve', 'delving', 'underscoring', 'underscore', 'comprehensive', 'robust',
  'leverage', 'leveraging', 'facilitate', 'facilitating', 'demonstrate', 'demonstrates',
  'showcase', 'showcasing', 'crucial', 'vital', 'essential', 'furthermore',
  'moreover', 'additionally', 'notably', 'consequently', 'analyze', 'analyzes',
  'describe', 'describes', 'discuss', 'discusses', 'explore', 'explores',
  'examine', 'examines', 'illustrate', 'illustrates', 'significant', 'notable'
];

export class AIDetectionService {
  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  private splitSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  private calculatePerplexity(words: string[]): number {
    if (words.length < 2) return 100;

    const bigramCounts = new Map<string, number>();
    const unigramCounts = new Map<string, number>();

    words.forEach(word => {
      unigramCounts.set(word, (unigramCounts.get(word) || 0) + 1);
    });

    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]}_${words[i + 1]}`;
      bigramCounts.set(bigram, (bigramCounts.get(bigram) || 0) + 1);
    }

    let logProb = 0;
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]}_${words[i + 1]}`;
      const bigramCount = bigramCounts.get(bigram) || 0;
      const unigramCount = unigramCounts.get(words[i]) || 1;

      const probability = (bigramCount + 1) / (unigramCount + unigramCounts.size);
      logProb += Math.log(probability);
    }

    const perplexity = Math.exp(-logProb / (words.length - 1));
    return Math.min(perplexity, 200);
  }

  private calculateBurstiness(text: string): number {
    const sentences = this.splitSentences(text);
    if (sentences.length < 2) return 0;

    const lengths = sentences.map(s => this.tokenize(s).length);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;

    if (mean === 0) return 0;

    const variance = lengths.reduce((sum, len) =>
      sum + Math.pow(len - mean, 2), 0) / lengths.length;

    const stdDev = Math.sqrt(variance);
    return stdDev / mean;
  }

  private calculateTypeTokenRatio(words: string[]): number {
    if (words.length === 0) return 0;
    const uniqueWords = new Set(words);
    return uniqueWords.size / words.length;
  }

  private calculateCrossEntropy(words: string[]): number {
    if (words.length < 2) return 5;

    const wordCounts = new Map<string, number>();
    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    });

    let entropy = 0;
    const totalWords = words.length;

    wordCounts.forEach(count => {
      const probability = count / totalWords;
      entropy -= probability * Math.log2(probability);
    });

    return entropy;
  }

  private calculateSentenceVariance(text: string): number {
    const sentences = this.splitSentences(text);
    if (sentences.length < 2) return 0;

    const lengths = sentences.map(s => this.tokenize(s).length);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;

    const variance = lengths.reduce((sum, len) =>
      sum + Math.pow(len - mean, 2), 0) / lengths.length;

    return Math.sqrt(variance);
  }

  private calculateFanoFactor(text: string): number {
    const sentences = this.splitSentences(text);
    if (sentences.length < 2) return 0;

    const lengths = sentences.map(s => this.tokenize(s).length);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;

    if (mean === 0) return 0;

    const variance = lengths.reduce((sum, len) =>
      sum + Math.pow(len - mean, 2), 0) / lengths.length;

    return variance / mean;
  }

  private detectSuspiciousWords(words: string[]): Array<{ word: string; count: number }> {
    const suspicious: Array<{ word: string; count: number }> = [];

    AI_SUSPICIOUS_WORDS.forEach(suspiciousWord => {
      const count = words.filter(w => w === suspiciousWord).length;
      if (count > 0) {
        suspicious.push({ word: suspiciousWord, count });
      }
    });

    return suspicious;
  }

  private calculateRareWordFrequency(words: string[]): number {
    const commonWords = new Set([
      'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
      'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
      'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
      'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what'
    ]);

    const rareWords = words.filter(word => !commonWords.has(word) && word.length > 3);
    return words.length > 0 ? rareWords.length / words.length : 0;
  }

  private detectRepetitiveNGrams(words: string[]): number {
    const bigrams = new Map<string, number>();
    const trigrams = new Map<string, number>();

    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]}_${words[i + 1]}`;
      bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
    }

    for (let i = 0; i < words.length - 2; i++) {
      const trigram = `${words[i]}_${words[i + 1]}_${words[i + 2]}`;
      trigrams.set(trigram, (trigrams.get(trigram) || 0) + 1);
    }

    let repetitiveCount = 0;
    bigrams.forEach(count => {
      if (count > 2) repetitiveCount += count - 2;
    });
    trigrams.forEach(count => {
      if (count > 1) repetitiveCount += count - 1;
    });

    return repetitiveCount;
  }

  private calculateAIProbability(metrics: AIDetectionMetrics): number {
    const WEIGHTS = {
      perplexity: 0.25,
      burstiness: 0.20,
      typeTokenRatio: 0.15,
      suspiciousWords: 0.15,
      sentenceVariance: 0.10,
      crossEntropy: 0.10,
      fanoFactor: 0.05
    };

    let score = 0;

    const normalize = (value: number, min: number, max: number) => {
      return Math.max(0, Math.min(1, (value - min) / (max - min)));
    };

    score += WEIGHTS.perplexity * (1 - normalize(metrics.perplexity, 0, 150));
    score += WEIGHTS.burstiness * (1 - normalize(metrics.burstiness, 0, 1));
    score += WEIGHTS.typeTokenRatio * (1 - normalize(metrics.typeTokenRatio, 0, 1));
    score += WEIGHTS.suspiciousWords * normalize(metrics.suspiciousWordCount, 0, 20);
    score += WEIGHTS.sentenceVariance * (1 - normalize(metrics.sentenceVariance, 0, 15));
    score += WEIGHTS.crossEntropy * (1 - normalize(metrics.crossEntropy, 0, 6));
    score += WEIGHTS.fanoFactor * (1 - normalize(metrics.fanoFactor, 0, 3));

    return score * 100;
  }

  private generateExplanation(metrics: AIDetectionMetrics, confidence: number): string {
    const reasons: string[] = [];

    if (metrics.perplexity < 50) {
      reasons.push('very low perplexity indicating predictable word choices');
    }
    if (metrics.burstiness < 0.3) {
      reasons.push('low sentence variation suggesting formulaic construction');
    }
    if (metrics.typeTokenRatio < 0.5) {
      reasons.push('limited vocabulary diversity');
    }
    if (metrics.suspiciousWordCount > 5) {
      reasons.push('frequent use of AI-typical words and phrases');
    }
    if (metrics.sentenceVariance < 6) {
      reasons.push('consistent sentence lengths typical of AI generation');
    }

    if (reasons.length === 0) {
      return 'The text shows natural variation in vocabulary, sentence structure, and word choice patterns consistent with human writing.';
    }

    return `The text shows ${reasons.join(', ')}, which are characteristic patterns of AI-generated content.`;
  }

  private generateRecommendations(metrics: AIDetectionMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.burstiness < 0.3) {
      recommendations.push('Vary sentence lengths more - mix short, medium, and long sentences');
    }
    if (metrics.typeTokenRatio < 0.5) {
      recommendations.push('Use a wider variety of vocabulary and synonyms');
    }
    if (metrics.suspiciousWordCount > 5) {
      recommendations.push('Avoid overused AI words like "comprehensive", "robust", "leverage", "delve"');
    }
    if (metrics.sentenceVariance < 6) {
      recommendations.push('Add more variation in sentence structure and complexity');
    }
    if (metrics.rareWordFrequency < 0.3) {
      recommendations.push('Include more specific, uncommon, or technical terms where appropriate');
    }

    return recommendations;
  }

  async detectAIText(text: string): Promise<AIDetectionResponse> {
    try {
      if (text.length < 100) {
        return {
          success: false,
          error: 'Text too short for reliable AI detection (minimum 100 characters)'
        };
      }

      const words = this.tokenize(text);

      const perplexity = this.calculatePerplexity(words);
      const burstiness = this.calculateBurstiness(text);
      const typeTokenRatio = this.calculateTypeTokenRatio(words);
      const crossEntropy = this.calculateCrossEntropy(words);
      const sentenceVariance = this.calculateSentenceVariance(text);
      const fanoFactor = this.calculateFanoFactor(text);
      const suspiciousWords = this.detectSuspiciousWords(words);
      const rareWordFrequency = this.calculateRareWordFrequency(words);
      const repetitiveNGrams = this.detectRepetitiveNGrams(words);

      const metrics: AIDetectionMetrics = {
        perplexity,
        burstiness,
        typeTokenRatio,
        crossEntropy,
        sentenceVariance,
        fanoFactor,
        suspiciousWordCount: suspiciousWords.length,
        rareWordFrequency,
        repetitiveNGrams
      };

      const confidence = this.calculateAIProbability(metrics);
      const isAIGenerated = confidence > 50;

      const explanation = this.generateExplanation(metrics, confidence);
      const recommendations = this.generateRecommendations(metrics);

      return {
        success: true,
        result: {
          isAIGenerated,
          confidence,
          metrics,
          suspiciousWords,
          explanation,
          recommendations
        }
      };
    } catch (error) {
      console.error('AI Detection Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to detect AI text'
      };
    }
  }
}

export type { AIDetectionMetrics, AIDetectionResult, AIDetectionResponse };
