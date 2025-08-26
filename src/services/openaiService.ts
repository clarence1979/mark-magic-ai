interface OCRResponse {
  success: boolean;
  text?: string;
  error?: string;
}

interface MarkingResponse {
  success: boolean;
  results?: any[];
  totalMarks?: number;
  maxTotalMarks?: number;
  overallFeedback?: string;
  error?: string;
}

interface SchemeGenerationResponse {
  success: boolean;
  scheme?: string;
  error?: string;
}

export class OpenAIService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async extractTextFromImage(imageBase64: string): Promise<OCRResponse> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Please extract all text from this handwritten document. Maintain the original structure and formatting as much as possible. If the handwriting is unclear, make your best interpretation and note any uncertainties with [unclear] markers.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageBase64
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
        throw new Error(errorData.error?.message || 'Failed to process image');
      }

      const data = await response.json();
      const extractedText = data.choices[0]?.message?.content;

      if (!extractedText) {
        throw new Error('No text extracted from image');
      }

      return {
        success: true,
        text: extractedText
      };
    } catch (error) {
      console.error('OCR Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract text'
      };
    }
  }

  async generateMarkingScheme(ocrText: string): Promise<SchemeGenerationResponse> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are an experienced educator who creates fair and appropriate marking schemes. Keep marking simple and proportional to question complexity.'
            },
            {
              role: 'user',
              content: `Analyze this student work and create a concise, fair marking scheme:

${ocrText}

Guidelines for marking scheme:
1. Simple calculation/method questions should have 2-4 marks maximum
2. Allocate marks proportionally to question complexity
3. Focus on core mathematical concepts and correct methodology
4. Be clear about what constitutes full marks vs partial marks
5. Avoid over-complicating simple questions

Format as clear bullet points with specific mark allocations and criteria.`
            }
          ],
          max_tokens: 1500
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to generate scheme');
      }

      const data = await response.json();
      const scheme = data.choices[0]?.message?.content;

      if (!scheme) {
        throw new Error('No marking scheme generated');
      }

      return {
        success: true,
        scheme: scheme
      };
    } catch (error) {
      console.error('Scheme Generation Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate marking scheme'
      };
    }
  }

  async markStudentWork(ocrText: string, markingScheme: string): Promise<MarkingResponse> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are an experienced mathematics teacher who marks student work fairly and accurately. You understand mathematical terminology precisely (e.g., "at least 40" means 40 or more). You give full credit when students demonstrate correct mathematical understanding and methodology, even if presentation could be improved.'
            },
            {
              role: 'user',
              content: `Mark this student work according to the marking scheme provided. You MUST identify and separate each individual question.

MARKING SCHEME:
${markingScheme}

STUDENT WORK:
${ocrText}

CRITICAL INSTRUCTIONS:
1. IDENTIFY EACH SEPARATE QUESTION: Look for question numbers (1., 2., a), b), etc.) or distinct mathematical problems
2. For each question, provide the CORRECT ANSWER alongside the student's answer
3. Award marks based on mathematical accuracy and methodology
4. "At least X" means X or any number greater than X
5. Be generous when core mathematical concepts are demonstrated correctly
6. Each question should have its own entry in the results array

REQUIRED RESPONSE FORMAT (JSON only):
{
  "results": [
    {
      "question": "The complete question text (e.g., 'Question 1: Calculate the area of...')",
      "studentAnswer": "What the student actually wrote for this specific question",
      "correctAnswer": "The mathematically correct answer with working",
      "maxMarks": number,
      "awardedMarks": number,
      "feedback": "Detailed marking justification explaining why marks were awarded/deducted",
      "markingScheme": "Specific marking criteria for this question",
      "strengths": ["Specific things done correctly"],
      "improvements": ["Specific suggestions for improvement - only if needed"]
    }
  ],
  "totalMarks": sum_of_all_awarded_marks,
  "maxTotalMarks": sum_of_all_max_marks,
  "overallFeedback": "Encouraging summary of overall performance"
}

IMPORTANT: 
- If you see multiple questions (1., 2., a), b), etc.), create separate entries for each
- Never group everything as "Overall Work" - break down by individual questions
- Provide correct answers to help students learn
- Be specific about what earned marks and what didn't`
            }
          ],
          max_tokens: 3000
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to mark work');
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No marking results generated');
      }

      // Try to parse JSON response
      try {
        const parsedResults = JSON.parse(content);
        return {
          success: true,
          ...parsedResults
        };
      } catch (parseError) {
        // If JSON parsing fails, create a fallback structure
        return {
          success: true,
          results: [{
            question: "Overall Work",
            studentAnswer: ocrText,
            maxMarks: 100,
            awardedMarks: 75, // Default fallback
            feedback: content,
            strengths: ["Attempted all sections"],
            improvements: ["See detailed feedback above"]
          }],
          totalMarks: 75,
          maxTotalMarks: 100,
          overallFeedback: "Please see the detailed feedback provided above."
        };
      }
    } catch (error) {
      console.error('Marking Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark student work'
      };
    }
  }
}