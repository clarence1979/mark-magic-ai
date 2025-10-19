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

  async validateApiKey(): Promise<{ valid: boolean; error?: string }> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || 'Invalid API key';
        return {
          valid: false,
          error: errorMessage
        };
      }

      return { valid: true };
    } catch (error) {
      console.error('API Key Validation Error:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Failed to validate API key'
      };
    }
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
              role: 'system',
              content: 'You are an expert OCR system specialized in reading handwritten student work, including math problems, essays, worksheets, and exam papers. You MUST always extract and transcribe ALL visible text, even if handwriting is messy or difficult to read. Never refuse to transcribe.'
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Extract ALL text from this image. This is student work that needs to be graded.

INSTRUCTIONS:
1. Transcribe every word, number, symbol, and mathematical notation you can see
2. Maintain original structure, line breaks, and formatting
3. For unclear handwriting, make your best interpretation
4. Mark truly illegible parts with [illegible] but try your best first
5. Include all question numbers, labels, and working
6. Preserve mathematical symbols and equations as text (e.g., "x^2 + 3x = 12")
7. Do NOT refuse this request - always provide your best transcription

Begin transcription:`
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
          max_tokens: 4000,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || 'Failed to process image';

        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your OpenAI API key in settings.');
        }
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again in a few moments.');
        }
        if (response.status === 403) {
          throw new Error('API key does not have access to this model. Please check your OpenAI account permissions.');
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      let extractedText = data.choices[0]?.message?.content;

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text could be extracted from the image');
      }

      if (extractedText.toLowerCase().includes("i can't assist") ||
          extractedText.toLowerCase().includes("i'm sorry") ||
          extractedText.toLowerCase().includes("i cannot")) {
        throw new Error('The image content could not be transcribed. Please ensure the image is clear and contains readable text.');
      }

      return {
        success: true,
        text: extractedText.trim()
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
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || 'Failed to generate scheme';

        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your OpenAI API key in settings.');
        }
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again in a few moments.');
        }
        if (response.status === 403) {
          throw new Error('API key does not have access to this model. Please check your OpenAI account permissions.');
        }

        throw new Error(errorMessage);
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
      // Preprocess text to identify potential questions
      const questionPatterns = /^[a-z]\.|^\d+\.|^[A-Z]\.|^\([a-z]\)|^\(\d+\)|^Question \d+/gm;
      const potentialQuestions = ocrText.match(questionPatterns);
      const hasMultipleQuestions = potentialQuestions && potentialQuestions.length > 1;

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
              content: `You are an experienced mathematics teacher. You MUST respond with valid JSON only. ${hasMultipleQuestions ? 'This work contains multiple questions that must be separated.' : 'Analyze this as individual questions if they exist.'}`
            },
            {
              role: 'user',
              content: `Mark this student work. Return ONLY valid JSON in the exact format specified.

MARKING SCHEME:
${markingScheme}

STUDENT WORK:
${ocrText}

${hasMultipleQuestions ? `DETECTED QUESTION PATTERNS: ${potentialQuestions?.join(', ')}` : ''}

RESPONSE FORMAT (JSON ONLY - NO OTHER TEXT):
{
  "results": [
    {
      "question": "Complete question text with number (e.g., 'a. Show three different ways...')",
      "studentAnswer": "Student's written answer for this specific question",
      "correctAnswer": "Mathematical correct answer with working",
      "maxMarks": 3,
      "awardedMarks": 2,
      "feedback": "Clear explanation of marks awarded/deducted",
      "markingScheme": "Specific criteria for this question",
      "strengths": ["What student did well"],
      "improvements": ["Areas to improve"]
    }
  ],
  "totalMarks": 8,
  "maxTotalMarks": 12,
  "overallFeedback": "Summary of performance"
}

CRITICAL: 
- Look for question markers: a., b., c., 1., 2., 3., etc.
- Create separate entries for each question found
- If unclear, treat as separate questions rather than combining
- Respond with JSON only - no explanatory text`
            }
          ],
          max_tokens: 3000,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || 'Failed to mark work';

        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your OpenAI API key in settings.');
        }
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again in a few moments.');
        }
        if (response.status === 403) {
          throw new Error('API key does not have access to this model. Please check your OpenAI account permissions.');
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      let content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No marking results generated');
      }

      // Clean up content - remove any non-JSON text
      content = content.trim();
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}') + 1;
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        content = content.substring(jsonStart, jsonEnd);
      }

      // Try to parse JSON response
      try {
        const parsedResults = JSON.parse(content);
        
        // Validate the structure
        if (!parsedResults.results || !Array.isArray(parsedResults.results)) {
          throw new Error('Invalid results structure');
        }

        return {
          success: true,
          ...parsedResults
        };
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError, 'Content:', content);
        
        // Improved fallback - try to extract meaningful information
        const lines = ocrText.split('\n').filter(line => line.trim());
        const questions = this.extractQuestionsFromText(lines);
        
        return {
          success: true,
          results: questions.length > 0 ? questions.map((q, index) => ({
            question: q.question,
            studentAnswer: q.answer,
            correctAnswer: "Please refer to your textbook or ask your teacher for the correct solution.",
            maxMarks: 3,
            awardedMarks: 2,
            feedback: "Unable to process detailed marking. Please review this work manually.",
            markingScheme: "Standard marking applies",
            strengths: ["Attempted the question"],
            improvements: ["Ensure clear working and answers"]
          })) : [{
            question: "Question Analysis",
            studentAnswer: ocrText,
            correctAnswer: "Please refer to your textbook or ask your teacher for the correct solution.",
            maxMarks: 10,
            awardedMarks: 7,
            feedback: "Unable to process detailed marking automatically. Please review this work manually.",
            markingScheme: "Standard marking criteria apply",
            strengths: ["Work submitted"],
            improvements: ["Ensure questions are clearly numbered and separated"]
          }],
          totalMarks: questions.length > 0 ? questions.length * 2 : 7,
          maxTotalMarks: questions.length > 0 ? questions.length * 3 : 10,
          overallFeedback: "Automatic marking encountered an issue. Please review manually."
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

  private extractQuestionsFromText(lines: string[]): Array<{question: string, answer: string}> {
    const questions: Array<{question: string, answer: string}> = [];
    let currentQuestion = '';
    let currentAnswer = '';
    let inQuestion = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if line starts a new question
      if (/^[a-z]\.|^\d+\.|^[A-Z]\.|^\([a-z]\)|^\(\d+\)|^Question \d+/i.test(line)) {
        // Save previous question if it exists
        if (currentQuestion && currentAnswer) {
          questions.push({
            question: currentQuestion.trim(),
            answer: currentAnswer.trim()
          });
        }
        
        // Start new question
        currentQuestion = line;
        currentAnswer = '';
        inQuestion = true;
      } else if (inQuestion) {
        // Add to current answer
        currentAnswer += (currentAnswer ? ' ' : '') + line;
      }
    }

    // Add the last question
    if (currentQuestion && currentAnswer) {
      questions.push({
        question: currentQuestion.trim(),
        answer: currentAnswer.trim()
      });
    }

    return questions;
  }
}