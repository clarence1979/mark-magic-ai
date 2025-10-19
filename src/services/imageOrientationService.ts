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
                  text: `You are an expert in image orientation detection for OCR preprocessing. Analyze this image CAREFULLY to determine its current orientation.

CRITICAL INSTRUCTIONS:
1. Look at how text appears in the image RIGHT NOW
2. Identify which way the text is currently oriented
3. Determine what rotation is needed to make text readable (horizontal, left-to-right)
4. Be extremely precise about rotation direction:
   - "rotated_90_left" means the image is tilted 90° counterclockwise (text runs vertically, needs clockwise rotation to fix)
   - "rotated_90_right" means the image is tilted 90° clockwise (text runs vertically, needs counterclockwise rotation to fix)
   - "rotated_180" or "upside_down" means image is flipped (text is upside down)
   - "mirrored" means horizontally flipped (text reads backwards)

ANALYSIS CHECKLIST:
- Which direction is the text currently facing?
- Is handwriting/text readable without rotating your head?
- Are any numbers, letters, or words clearly upside down or sideways?
- What specific rotation would make this readable?

Respond with ONLY a JSON object:
{
  "needsCorrection": true/false,
  "orientation": "correct" | "upside_down" | "rotated_90_left" | "rotated_90_right" | "mirrored" | "rotated_180",
  "confidence": 0.0-1.0,
  "reasoning": "Detailed explanation: describe what you see and why you chose this orientation. Include specific observations about text direction."
}

Be conservative: if confidence is below 0.7, mark as "correct" to avoid wrong corrections.`
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

      if (parsedResult.confidence < 0.7) {
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
