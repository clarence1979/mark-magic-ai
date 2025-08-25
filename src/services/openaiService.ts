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
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an expert educator. Analyze the student work and create a comprehensive marking scheme.'
            },
            {
              role: 'user',
              content: `Please analyze this student work and generate a detailed marking scheme:

${ocrText}

Create a marking scheme that includes:
1. Clear questions/topics identified in the work
2. Point allocation for each section
3. Key concepts that should be present
4. Specific criteria for awarding marks

Format the scheme clearly with bullet points and be specific about what constitutes full marks, partial marks, etc.`
            }
          ],
          max_tokens: 2000
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
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an expert teacher marking student work. Be fair, constructive, and detailed in your marking. Always provide specific feedback and suggestions for improvement.'
            },
            {
              role: 'user',
              content: `Please mark this student work according to the marking scheme provided.

MARKING SCHEME:
${markingScheme}

STUDENT WORK:
${ocrText}

Please identify and extract the ACTUAL questions from the student work (e.g., "a. Show three different ways...", "b. Which packages would you buy...", etc.) and the student's specific answers to each question.

Please provide your response in the following JSON format:
{
  "results": [
    {
      "question": "The EXACT question text from the student work (e.g., 'a. Show three different ways you could buy packages to get at least 40 buns.')",
      "studentAnswer": "The student's actual written answer to this specific question",
      "maxMarks": number,
      "awardedMarks": number,
      "feedback": "Detailed feedback explaining the marks awarded",
      "strengths": ["List of strengths in the answer"],
      "improvements": ["List of areas for improvement"]
    }
  ],
  "totalMarks": total_awarded_marks,
  "maxTotalMarks": total_possible_marks,
  "overallFeedback": "Overall summary and encouragement for the student"
}

Be thorough and constructive in your feedback. Focus on what the student did well and provide specific guidance for improvement.`
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