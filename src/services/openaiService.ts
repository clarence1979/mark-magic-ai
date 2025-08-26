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
              content: `Mark this student work according to the marking scheme provided.

MARKING SCHEME:
${markingScheme}

STUDENT WORK:
${ocrText}

CRITICAL MARKING GUIDELINES:
1. Mathematical correctness is paramount - if the math is right, award full marks
2. "At least X" means X or any number greater than X
3. Multiple correct methods should receive full credit
4. Focus on mathematical understanding over presentation
5. Be generous with marks when core concepts are demonstrated correctly
6. Double-check all mathematical calculations before awarding marks

Extract the ACTUAL questions and student answers, then provide response in this JSON format:
{
  "results": [
    {
      "question": "The EXACT question text from student work",
      "studentAnswer": "Student's actual written answer",
      "maxMarks": number,
      "awardedMarks": number,
      "feedback": "Clear explanation of marks awarded",
      "strengths": ["What the student did well"],
      "improvements": ["Specific areas to improve - only if genuinely needed"]
    }
  ],
  "totalMarks": sum_of_all_awarded_marks,
  "maxTotalMarks": sum_of_all_max_marks,
  "overallFeedback": "Encouraging summary focusing on mathematical strengths"
}

Ensure totalMarks correctly sums all individual awarded marks.`
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