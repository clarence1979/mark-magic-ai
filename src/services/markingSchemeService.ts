import { OpenAIService } from './openaiService';
import { resolveModel } from './modelResolver';

export interface MarkingSchemeParseResult {
  success: boolean;
  content?: string;
  error?: string;
}

export class MarkingSchemeService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async parseMarkingScheme(file: File): Promise<MarkingSchemeParseResult> {
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (fileExtension === 'txt') {
        const text = await file.text();
        return {
          success: true,
          content: text
        };
      }

      if (['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'].includes(fileExtension || '')) {
        const base64 = await this.fileToBase64(file);

        if (['jpg', 'jpeg', 'png'].includes(fileExtension || '')) {
          return await this.extractTextFromImage(base64);
        } else {
          return await this.extractTextFromDocument(base64, fileExtension || '');
        }
      }

      return {
        success: false,
        error: `Unsupported file type: ${fileExtension}`
      };
    } catch (error) {
      console.error('Marking scheme parse error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse marking scheme'
      };
    }
  }

  async generateMarkingScheme(prompt: string): Promise<MarkingSchemeParseResult> {
    try {
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
              content: 'You are an expert educator creating detailed marking schemes for student assessments.'
            },
            {
              role: 'user',
              content: `Create a detailed marking scheme based on this description:\n\n${prompt}\n\nThe marking scheme should include:\n1. Total marks available\n2. Clear criteria for each mark allocation\n3. How to award partial credit\n4. What constitutes excellent, good, satisfactory, and poor responses\n5. Any specific keywords or concepts that should be present`
            }
          ],
          max_tokens: 2000,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate marking scheme');
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No marking scheme generated');
      }

      return {
        success: true,
        content: content.trim()
      };
    } catch (error) {
      console.error('Marking scheme generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate marking scheme'
      };
    }
  }

  private async extractTextFromImage(base64Image: string): Promise<MarkingSchemeParseResult> {
    try {
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
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Extract ALL text from this marking scheme image. Preserve the structure, formatting, and all details. Include point allocations, criteria, and any notes.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: base64Image
                  }
                }
              ]
            }
          ],
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to extract text from image');
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No text extracted from image');
      }

      return {
        success: true,
        content: content.trim()
      };
    } catch (error) {
      console.error('Image text extraction error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract text from image'
      };
    }
  }

  private async extractTextFromDocument(base64: string, fileType: string): Promise<MarkingSchemeParseResult> {
    return {
      success: false,
      error: `PDF and DOC extraction not yet implemented. Please use TXT or image files, or enter the marking scheme manually.`
    };
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result);
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
}
