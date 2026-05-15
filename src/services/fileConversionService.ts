import jsPDF from 'jspdf';

interface ConversionResult {
  success: boolean;
  file?: File;
  error?: string;
  converted?: boolean;
  unsupported?: boolean;
}

// File types that are natively supported without conversion
const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
  'image/webp', 'image/heic', 'image/bmp', 'image/tiff',
  'image/svg+xml',
];

const SUPPORTED_IMAGE_EXTS = /\.(jpg|jpeg|png|gif|webp|heic|bmp|tiff|tif|svg)$/i;

// File types we can convert to PDF client-side
const CONVERTIBLE_TEXT_TYPES = ['text/plain', 'text/csv', 'text/html', 'text/markdown', 'text/xml'];
const CONVERTIBLE_TEXT_EXTS = /\.(txt|csv|html|htm|md|markdown|xml|log|json|yaml|yml|rtf)$/i;

const CONVERTIBLE_DOCX_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const CONVERTIBLE_DOC_TYPE = 'application/msword';
const CONVERTIBLE_DOC_EXTS = /\.(docx|doc)$/i;

// File types that cannot be converted client-side — user should use anythingtopdf.com
const KNOWN_UNSUPPORTED_EXTS = /\.(ppt|pptx|xls|xlsx|odt|odp|ods|pages|numbers|keynote|epub|mobi|indd|ai|psd|sketch|fig|mp4|mp3|avi|mov|wmv|flv|mkv|zip|rar|7z|tar|gz|exe|dmg|pkg|deb|apk|iso|bin|dll|so|jar|class|pyc)$/i;

export class FileConversionService {
  static async convertToPDFIfNeeded(file: File): Promise<ConversionResult> {
    const fileName = file.name.toLowerCase();

    if (this.isDirectlySupported(file)) {
      return { success: true, file, converted: false };
    }

    if (this.isTextConvertible(file)) {
      return this.convertTextToPDF(file);
    }

    if (this.isDocConvertible(file)) {
      return this.convertDocumentToPDF(file);
    }

    // Known unsupported binary formats
    if (KNOWN_UNSUPPORTED_EXTS.test(fileName)) {
      return {
        success: false,
        unsupported: true,
        error: `"${file.name}" cannot be processed directly.`,
      };
    }

    // Unknown/unrecognised type — also treat as unsupported
    return {
      success: false,
      unsupported: true,
      error: `"${file.name}" is in an unrecognised format and cannot be processed.`,
    };
  }

  static isDirectlySupported(file: File): boolean {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    const isImage = SUPPORTED_IMAGE_TYPES.includes(fileType) || SUPPORTED_IMAGE_EXTS.test(fileName);
    const isPDF = fileType === 'application/pdf' || fileName.endsWith('.pdf');
    return isImage || isPDF;
  }

  private static isTextConvertible(file: File): boolean {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    return CONVERTIBLE_TEXT_TYPES.includes(fileType) ||
           fileType.startsWith('text/') ||
           CONVERTIBLE_TEXT_EXTS.test(fileName);
  }

  private static isDocConvertible(file: File): boolean {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    return fileType === CONVERTIBLE_DOCX_TYPE ||
           fileType === CONVERTIBLE_DOC_TYPE ||
           CONVERTIBLE_DOC_EXTS.test(fileName);
  }

  private static async convertTextToPDF(file: File): Promise<ConversionResult> {
    try {
      const text = await this.readFileAsText(file);
      const pdf = new jsPDF();

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const lineHeight = 7;
      const maxWidth = pageWidth - margin * 2;

      pdf.setFontSize(11);
      const lines = pdf.splitTextToSize(text, maxWidth);
      let y = margin;

      for (const line of lines) {
        if (y + lineHeight > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(line, margin, y);
        y += lineHeight;
      }

      const pdfBlob = pdf.output('blob');
      const pdfFile = new File(
        [pdfBlob],
        file.name.replace(/\.[^.]+$/, '.pdf'),
        { type: 'application/pdf' }
      );

      return { success: true, file: pdfFile, converted: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to convert "${file.name}" to PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private static async convertDocumentToPDF(file: File): Promise<ConversionResult> {
    try {
      const isDocx = file.name.toLowerCase().endsWith('.docx') ||
                     file.type === CONVERTIBLE_DOCX_TYPE;

      if (!isDocx) {
        return {
          success: false,
          unsupported: true,
          error: `"${file.name}" is an older .doc format that cannot be converted automatically.`,
        };
      }

      const mammoth = await import('mammoth');
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      const result = await mammoth.extractRawText({ arrayBuffer });

      if (!result.value) {
        return {
          success: false,
          error: `Unable to extract content from "${file.name}". The document may be empty, password-protected, or corrupted.`,
        };
      }

      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const lineHeight = 7;
      const maxWidth = pageWidth - margin * 2;

      pdf.setFontSize(11);
      const lines = pdf.splitTextToSize(result.value, maxWidth);
      let y = margin;

      for (const line of lines) {
        if (y + lineHeight > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(line, margin, y);
        y += lineHeight;
      }

      const pdfBlob = pdf.output('blob');
      const pdfFile = new File(
        [pdfBlob],
        file.name.replace(/\.[^.]+$/, '.pdf'),
        { type: 'application/pdf' }
      );

      return { success: true, file: pdfFile, converted: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to convert "${file.name}" to PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
