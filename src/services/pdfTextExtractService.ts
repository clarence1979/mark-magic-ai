interface PDFTextResult {
  success: boolean;
  text?: string;
  pageCount?: number;
  error?: string;
}

export class PDFTextExtractService {
  static async extractText(file: File): Promise<PDFTextResult> {
    try {
      const arrayBuffer = await file.arrayBuffer();

      // Dynamic import to avoid SSR issues
      const pdfjsLib = await import('pdfjs-dist');

      // Point the worker at the bundled worker file
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.mjs',
        import.meta.url
      ).toString();

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pageCount = pdf.numPages;
      const textParts: string[] = [];

      for (let i = 1; i <= pageCount; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: any) => ('str' in item ? item.str : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (pageText) {
          textParts.push(`[Page ${i}]\n${pageText}`);
        }
      }

      const text = textParts.join('\n\n');

      if (!text.trim()) {
        return {
          success: false,
          pageCount,
          error: 'No extractable text found in this PDF. It may be a scanned image-only PDF.',
        };
      }

      return { success: true, text, pageCount };
    } catch (error) {
      return {
        success: false,
        error: `Failed to read PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
