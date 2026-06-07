import { resolveModel } from './modelResolver';

interface OrientationCheckResponse {
  success: boolean;
  needsCorrection: boolean;
  originalOrientation?: string;
  correctedImage?: string;
  confidence?: number;
  reasoning?: string;
  verificationPassed?: boolean;
  error?: string;
}

export class ImageOrientationService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async checkAndCorrectOrientation(imageBase64: string): Promise<OrientationCheckResponse> {
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
                  text: `You are an expert in image orientation detection for OCR preprocessing. Analyze this image CAREFULLY to determine its current orientation.

CRITICAL INSTRUCTIONS:
1. First, look at the OVERALL text flow - does it run horizontally across the page (left-to-right)?
2. If text appears horizontal and flows naturally left-to-right, mark as "correct" even if handwriting is messy
3. ONLY mark as needing correction if text is clearly:
   - Running vertically (sideways) - then it's rotated 90°
   - Completely upside down - then it's rotated 180°
   - Reading backwards - then it's mirrored

4. Rotation definitions:
   - "correct" = Text runs horizontally, reads left-to-right (MOST COMMON)
   - "rotated_90_left" = Image tilted 90° counterclockwise, text runs vertically from bottom-to-top
   - "rotated_90_right" = Image tilted 90° clockwise, text runs vertically from top-to-bottom
   - "rotated_180" or "upside_down" = Text is upside down, reads right-to-left
   - "mirrored" = Text reads backwards (horizontally flipped)

CRITICAL WARNING:
- DO NOT confuse handwriting style with incorrect orientation
- Cursive, messy, or informal handwriting does NOT mean wrong orientation
- If you can read the text by looking normally at the screen, it's "correct"
- If lines of text run horizontally across the page, it's "correct"

ANALYSIS CHECKLIST:
✓ Are the lines of text horizontal (running across the page)?
✓ Does the text read naturally from left to right?
✓ Can you make out words without tilting your head?
✓ If YES to all above → orientation is "correct"

Respond with ONLY a JSON object:
{
  "needsCorrection": true/false,
  "orientation": "correct" | "upside_down" | "rotated_90_left" | "rotated_90_right" | "mirrored" | "rotated_180",
  "confidence": 0.0-1.0,
  "reasoning": "Detailed explanation: First state if lines run horizontally or vertically. Then explain your decision."
}

DEFAULT TO "correct" unless you are absolutely certain (confidence > 0.85) the image needs rotation.`
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
          max_tokens: 500,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to check orientation');
      }

      const data = await response.json();
      let content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No orientation analysis returned');
      }

      content = content.trim();
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}') + 1;
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        content = content.substring(jsonStart, jsonEnd);
      }

      const parsedResult = JSON.parse(content);

      if (!parsedResult.needsCorrection || parsedResult.orientation === 'correct') {
        return {
          success: true,
          needsCorrection: false,
          originalOrientation: 'correct',
          confidence: parsedResult.confidence || 1.0,
          reasoning: parsedResult.reasoning
        };
      }

      if (parsedResult.confidence < 0.85) {
        console.warn('Low confidence orientation detection, skipping correction:', parsedResult);
        return {
          success: true,
          needsCorrection: false,
          originalOrientation: 'correct',
          confidence: parsedResult.confidence,
          reasoning: `Low confidence (${parsedResult.confidence}): ${parsedResult.reasoning}`
        };
      }

      const correctedImage = await this.correctImageOrientation(
        imageBase64,
        parsedResult.orientation
      );

      const verificationResult = await this.verifyCorrection(
        correctedImage,
        parsedResult.orientation
      );

      return {
        success: true,
        needsCorrection: true,
        originalOrientation: parsedResult.orientation,
        correctedImage: correctedImage,
        confidence: parsedResult.confidence,
        reasoning: parsedResult.reasoning,
        verificationPassed: verificationResult
      };
    } catch (error) {
      console.error('Orientation Check Error:', error);
      return {
        success: false,
        needsCorrection: false,
        error: error instanceof Error ? error.message : 'Failed to check orientation'
      };
    }
  }

  private async correctImageOrientation(
    imageBase64: string,
    orientation: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        let width = img.width;
        let height = img.height;

        if (orientation === 'rotated_90_left' || orientation === 'rotated_90_right') {
          canvas.width = height;
          canvas.height = width;
        } else {
          canvas.width = width;
          canvas.height = height;
        }

        ctx.save();

        switch (orientation) {
          case 'upside_down':
          case 'rotated_180':
            ctx.translate(width, height);
            ctx.rotate(Math.PI);
            break;
          case 'rotated_90_left':
            ctx.translate(0, height);
            ctx.rotate(-Math.PI / 2);
            break;
          case 'rotated_90_right':
            ctx.translate(width, 0);
            ctx.rotate(Math.PI / 2);
            break;
          case 'mirrored':
            ctx.translate(width, 0);
            ctx.scale(-1, 1);
            break;
        }

        ctx.drawImage(img, 0, 0);
        ctx.restore();

        const correctedBase64 = canvas.toDataURL('image/jpeg', 0.95);
        resolve(correctedBase64);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image for correction'));
      };

      img.src = imageBase64;
    });
  }

  private async verifyCorrection(
    correctedImageBase64: string,
    appliedCorrection: string
  ): Promise<boolean> {
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
                  text: `Verify if this image is now in correct orientation for OCR. The image was corrected from "${appliedCorrection}".

Is the text now:
- Horizontal and readable?
- Oriented left-to-right?
- Properly upright?

Respond with ONLY a JSON object:
{
  "isCorrect": true/false,
  "reasoning": "Brief explanation"
}`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: correctedImageBase64
                  }
                }
              ]
            }
          ],
          max_tokens: 300,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        console.error('Verification request failed');
        return true;
      }

      const data = await response.json();
      let content = data.choices[0]?.message?.content || '{}';

      content = content.trim();
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}') + 1;
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        content = content.substring(jsonStart, jsonEnd);
      }

      const verificationResult = JSON.parse(content);
      console.log('Orientation verification result:', verificationResult);

      return verificationResult.isCorrect !== false;
    } catch (error) {
      console.error('Verification error:', error);
      return true;
    }
  }
}

export type { OrientationCheckResponse };
