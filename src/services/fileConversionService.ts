import jsPDF from 'jspdf';

interface ConversionResult {
  success: boolean;
  file?: File;
  error?: string;
  converted?: boolean;
}

export class FileConversionService {
  private static readonly SUPPORTED_IMAGE_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
    'image/webp', 'image/heic', 'image/bmp'
  ];

  private static readonly SUPPORTED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain'
  ];

  static async convertToPDFIfNeeded(file: File): Promise<ConversionResult> {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    if (this.isDirectlySupported(file)) {
      return {
        success: true,
        file: file,
        converted: false
      };
    }

    if (this.isTextFile(file)) {
      return await this.convertTextToPDF(file);
    }

    if (this.isDocumentFile(file)) {
      return await this.convertDocumentToPDF(file);
    }

    return {
      success: false,
      error: `Unable to convert "${file.name}" (${fileType || 'unknown format'}). Supported formats: images (JPG, PNG, GIF, WEBP, HEIC, BMP), PDF, DOCX, and text files. Please convert this file to a supported format before uploading.`
    };
  }

  private static isDirectlySupported(file: File): boolean {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    const isImage = this.SUPPORTED_IMAGE_TYPES.includes(fileType) ||
                    /\.(jpg|jpeg|png|gif|webp|heic|bmp)$/i.test(fileName);

    const isPDF = fileType === 'application/pdf' || fileName.endsWith('.pdf');

    return isImage || isPDF;
  }

  private static isTextFile(file: File): boolean {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    return fileType === 'text/plain' ||
           fileName.endsWith('.txt') ||
           fileType.startsWith('text/');
  }

  private static isDocumentFile(file: File): boolean {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    return fileType.includes('word') ||
           fileType.includes('document') ||
           /\.(doc|docx|rtf|odt)$/i.test(fileName);
  }

  private static async convertTextToPDF(file: File): Promise<ConversionResult> {
    try {
      const text = await this.readFileAsText(file);
      const pdf = new jsPDF();

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const lineHeight = 7;
      const maxWidth = pageWidth - (margin * 2);

      pdf.setFontSize(11);
      const lines = pdf.splitTextToSize(text, maxWidth);

      let y = margin;

      for (let i = 0; i < lines.length; i++) {
        if (y + lineHeight > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }

        pdf.text(lines[i], margin, y);
        y += lineHeight;
      }

      const pdfBlob = pdf.output('blob');
      const pdfFile = new File(
        [pdfBlob],
        file.name.replace(/\.[^.]+$/, '.pdf'),
        { type: 'application/pdf' }
      );

      return {
        success: true,
        file: pdfFile,
        converted: true
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to convert "${file.name}" to PDF. The text file may be corrupted or in an unsupported encoding. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async convertDocumentToPDF(file: File): Promise<ConversionResult> {
    try {
      if (file.name.toLowerCase().endsWith('.docx') ||
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {

        const mammoth = await import('mammoth');
        const arrayBuffer = await this.readFileAsArrayBuffer(file);
        const result = await mammoth.extractRawText({ arrayBuffer });

        if (!result.value) {
          return {
            success: false,
            error: `Unable to extract content from "${file.name}". The document may be empty, password-protected, or corrupted. Please try saving it as a new file or use a different format.`
          };
        }

        const pdf = new jsPDF();
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 20;
        const lineHeight = 7;
        const maxWidth = pageWidth - (margin * 2);

        pdf.setFontSize(11);
        const lines = pdf.splitTextToSize(result.value, maxWidth);

        let y = margin;

        for (let i = 0; i < lines.length; i++) {
          if (y + lineHeight > pageHeight - margin) {
            pdf.addPage();
            y = margin;
          }

          pdf.text(lines[i], margin, y);
          y += lineHeight;
        }

        const pdfBlob = pdf.output('blob');
        const pdfFile = new File(
          [pdfBlob],
          file.name.replace(/\.[^.]+$/, '.pdf'),
          { type: 'application/pdf' }
        );

        return {
          success: true,
          file: pdfFile,
          converted: true
        };
      }

      return {
        success: false,
        error: `The document format of "${file.name}" is not supported for automatic conversion. Supported document formats: DOCX. Please convert to DOCX, PDF, or an image format.`
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to convert "${file.name}" to PDF. The document may be corrupted or in an incompatible format. Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try re-saving the file or converting it to a supported format.`
      };
    }
  }

  private static readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  private static readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
}
