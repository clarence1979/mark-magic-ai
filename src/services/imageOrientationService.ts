interface OrientationCheckResponse {
  success: boolean;
  needsCorrection: boolean;
  originalOrientation?: string;
  correctedImage?: string;
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
                  text: `Analyze this image and determine if it needs orientation correction. Check if the image is:
1. Upside down (rotated 180 degrees)
2. Rotated 90 degrees left or right
3. Mirrored/flipped horizontally
4. In correct orientation

Respond with ONLY a JSON object in this exact format:
{
  "needsCorrection": true/false,
  "orientation": "correct" | "upside_down" | "rotated_90_left" | "rotated_90_right" | "mirrored" | "rotated_180",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of why this orientation was detected"
}

Look for text direction, natural positioning of writing, and content layout to determine orientation.`
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
          originalOrientation: 'correct'
        };
      }

      const correctedImage = await this.correctImageOrientation(
        imageBase64,
        parsedResult.orientation
      );

      return {
        success: true,
        needsCorrection: true,
        originalOrientation: parsedResult.orientation,
        correctedImage: correctedImage
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
}

export type { OrientationCheckResponse };
