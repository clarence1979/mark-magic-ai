interface PlagiarismMatch {
  source: string;
  matchedText: string;
  similarity: number;
  url?: string;
}

interface PlagiarismResult {
  overallSimilarity: number;
  matches: PlagiarismMatch[];
  isHighRisk: boolean;
  summary: string;
  aiDetection?: {
    isAIGenerated: boolean;
    confidence: number;
  };
}

interface PlagiarismCheckResponse {
  success: boolean;
  result?: PlagiarismResult;
  error?: string;
}

import { AIDetectionService, AIDetectionResult } from './aiDetectionService';
import { resolveModel } from './modelResolver';

export class PlagiarismService {
  private apiKey: string;
  private aiDetectionService: AIDetectionService;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.aiDetectionService = new AIDetectionService();
  }

  async checkPlagiarism(text: string, includeAIDetection: boolean = true): Promise<PlagiarismCheckResponse> {
    try {
      let aiDetectionResult: AIDetectionResult | undefined;

      if (includeAIDetection && text.length >= 100) {
        const aiResponse = await this.aiDetectionService.detectAIText(text);
        if (aiResponse.success && aiResponse.result) {
          aiDetectionResult = aiResponse.result;
        }
      }
      const model = await resolveModel(this.apiKey);
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are a plagiarism detection expert. Analyze text for potential plagiarism by identifying patterns, common phrases, and content that appears to be copied from educational resources, websites, or other sources. Return ONLY valid JSON.'
            },
            {
              role: 'user',
              content: `Analyze this student work for potential plagiarism. Look for:
1. Copied phrases or paragraphs from common educational websites
2. Standard definitions or formulas that might be directly copied
3. Unusual vocabulary or writing style inconsistencies
4. Content that appears to be copied without understanding

TEXT TO ANALYZE:
${text}

RESPONSE FORMAT (JSON ONLY - NO OTHER TEXT):
{
  "overallSimilarity": 15,
  "matches": [
    {
      "source": "Common educational website/textbook pattern",
      "matchedText": "The specific text segment that appears copied",
      "similarity": 25,
      "url": "Suspected source if identifiable (optional)"
    }
  ],
  "isHighRisk": false,
  "summary": "Brief summary of plagiarism analysis"
}

IMPORTANT:
- overallSimilarity should be 0-100 percentage
- isHighRisk is true if overallSimilarity > 30%
- If no plagiarism detected, return empty matches array and 0 similarity
- Be fair - common mathematical notation and basic answers aren't plagiarism
- Respond with JSON only - no explanatory text`
            }
          ],
          max_tokens: 2000,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to check plagiarism');
      }

      const data = await response.json();
      let content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No plagiarism results generated');
      }

      content = content.trim();
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}') + 1;
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        content = content.substring(jsonStart, jsonEnd);
      }

      try {
        const parsedResult = JSON.parse(content);

        if (typeof parsedResult.overallSimilarity !== 'number') {
          throw new Error('Invalid plagiarism result structure');
        }

        return {
          success: true,
          result: {
            overallSimilarity: parsedResult.overallSimilarity,
            matches: Array.isArray(parsedResult.matches) ? parsedResult.matches : [],
            isHighRisk: parsedResult.isHighRisk === true,
            summary: parsedResult.summary || 'Plagiarism check completed',
            aiDetection: aiDetectionResult ? {
              isAIGenerated: aiDetectionResult.isAIGenerated,
              confidence: aiDetectionResult.confidence
            } : undefined
          }
        };
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError, 'Content:', content);

        return {
          success: true,
          result: {
            overallSimilarity: 0,
            matches: [],
            isHighRisk: false,
            summary: 'Unable to perform detailed plagiarism analysis. Manual review recommended.',
            aiDetection: aiDetectionResult ? {
              isAIGenerated: aiDetectionResult.isAIGenerated,
              confidence: aiDetectionResult.confidence
            } : undefined
          }
        };
      }
    } catch (error) {
      console.error('Plagiarism Check Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check plagiarism'
      };
    }
  }
}

export type { PlagiarismMatch, PlagiarismResult, PlagiarismCheckResponse };
