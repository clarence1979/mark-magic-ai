import { supabase, supabaseAdmin, BatchJob, StudentAssessment, QuestionResult } from '../lib/supabase';
import { ImageOrientationService } from './imageOrientationService';
import { OpenAIService } from './openaiService';
import { AIDetectionService } from './aiDetectionService';
import { PlagiarismService } from './plagiarismService';
import { FileConversionService } from './fileConversionService';
import { PDFTextExtractService } from './pdfTextExtractService';

export interface BatchProcessingOptions {
  apiKey: string;
  markingSchemeContent: string;
  onProgress?: (current: number, total: number) => void;
  onStudentComplete?: (assessment: StudentAssessment) => void;
}

export class BatchProcessingService {
  async createBatchJob(name: string, markingSchemeId: string): Promise<string> {
    const { data, error } = await supabaseAdmin
      .from('batch_jobs')
      .insert({
        name,
        marking_scheme_id: markingSchemeId,
        status: 'pending',
        total_students: 0,
        processed_students: 0,
      })
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Failed to create batch job');
    return data.id;
  }

  async addStudentToBatch(batchJobId: string, studentName: string, file: File): Promise<string> {
    const { data, error } = await supabaseAdmin
      .from('student_assessments')
      .insert({
        batch_job_id: batchJobId,
        student_name: studentName,
        file_name: file.name,
        status: 'pending',
        orientation_corrected: false,
      })
      .select()
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Failed to add student to batch');
    return data.id;
  }

  async processBatch(batchJobId: string, files: File[], options: BatchProcessingOptions): Promise<void> {
    await supabaseAdmin
      .from('batch_jobs')
      .update({ status: 'processing', total_students: files.length })
      .eq('id', batchJobId);

    const orientationService = new ImageOrientationService(options.apiKey);
    const openaiService = new OpenAIService(options.apiKey);
    const aiDetectionService = new AIDetectionService();
    const plagiarismService = new PlagiarismService(options.apiKey);

    let processedCount = 0;

    for (const file of files) {
      let assessmentId: string | null = null;
      try {
        const studentName = this.extractStudentName(file.name);
        assessmentId = await this.addStudentToBatch(batchJobId, studentName, file);

        await supabaseAdmin
          .from('student_assessments')
          .update({ status: 'processing' })
          .eq('id', assessmentId);

        // Extract text from the file
        const { ocrText, orientationCorrected } = await this.extractTextFromFile(
          file,
          orientationService,
          openaiService
        );

        // Mark the student's work against the shared scheme
        const markingResponse = await openaiService.markStudentWork(ocrText, options.markingSchemeContent);

        if (!markingResponse.success || !markingResponse.results) {
          throw new Error(markingResponse.error || 'Marking failed');
        }

        const questionResults: QuestionResult[] = markingResponse.results.map((r: any) => ({
          question: r.question || '',
          studentAnswer: r.studentAnswer || '',
          correctAnswer: r.correctAnswer || '',
          maxMarks: r.maxMarks || 0,
          awardedMarks: r.awardedMarks || 0,
          feedback: r.feedback || '',
          markingScheme: r.markingScheme || '',
          strengths: r.strengths || [],
          improvements: r.improvements || [],
        }));

        // AI + plagiarism checks
        const aiResult = await aiDetectionService.detectAIText(ocrText);
        const plagiarismResult = await plagiarismService.checkPlagiarism(ocrText, false);

        const aiScore = aiResult.success && aiResult.result?.isAIGenerated
          ? aiResult.result.confidence
          : 0;
        const plagiarismScore = plagiarismResult.success && plagiarismResult.result
          ? plagiarismResult.result.overallSimilarity
          : 0;

        const updateData: Partial<StudentAssessment> = {
          status: 'completed',
          ocr_text: ocrText,
          total_score: markingResponse.totalMarks,
          max_score: markingResponse.maxTotalMarks,
          percentage: markingResponse.maxTotalMarks > 0
            ? (markingResponse.totalMarks / markingResponse.maxTotalMarks) * 100
            : 0,
          detailed_feedback: markingResponse.overallFeedback || '',
          question_results: questionResults as any,
          marking_scheme_snapshot: options.markingSchemeContent,
          ai_detection_score: aiScore,
          plagiarism_score: plagiarismScore,
          orientation_corrected: orientationCorrected,
          processed_at: new Date().toISOString(),
        };

        const { data: updatedAssessment, error: updateError } = await supabaseAdmin
          .from('student_assessments')
          .update(updateData)
          .eq('id', assessmentId)
          .select()
          .maybeSingle();

        if (updateError) throw updateError;

        processedCount++;

        await supabaseAdmin
          .from('batch_jobs')
          .update({ processed_students: processedCount })
          .eq('id', batchJobId);

        if (options.onProgress) options.onProgress(processedCount, files.length);

        if (options.onStudentComplete && updatedAssessment) {
          // Attach parsed question_results back for in-memory consumers
          const assembled: StudentAssessment = {
            ...updatedAssessment,
            question_results: questionResults,
          };
          options.onStudentComplete(assembled);
        }
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);

        if (assessmentId) {
          await supabaseAdmin
            .from('student_assessments')
            .update({
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Processing failed',
            })
            .eq('id', assessmentId);
        }

        processedCount++;
        if (options.onProgress) options.onProgress(processedCount, files.length);
      }
    }

    await supabaseAdmin
      .from('batch_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        processed_students: processedCount,
      })
      .eq('id', batchJobId);
  }

  private async extractTextFromFile(
    file: File,
    orientationService: ImageOrientationService,
    openaiService: OpenAIService
  ): Promise<{ ocrText: string; orientationCorrected: boolean }> {
    const isImage = FileConversionService.isDirectlySupported(file) &&
      (file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic|bmp|tiff|tif|svg)$/i.test(file.name));

    if (isImage) {
      let imageBase64 = await this.fileToBase64(file);
      let orientationCorrected = false;

      try {
        const orientResult = await orientationService.checkAndCorrectOrientation(imageBase64);
        if (orientResult.success && orientResult.needsCorrection && orientResult.correctedImage) {
          imageBase64 = orientResult.correctedImage;
          orientationCorrected = true;
        }
      } catch { /* ignore orientation errors */ }

      const ocrResult = await openaiService.extractTextFromImage(imageBase64);
      if (!ocrResult.success || !ocrResult.text) {
        throw new Error(ocrResult.error || 'OCR failed');
      }
      return { ocrText: ocrResult.text, orientationCorrected };
    }

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const pdfResult = await PDFTextExtractService.extractText(file);
      if (pdfResult.success && pdfResult.text) {
        return { ocrText: pdfResult.text, orientationCorrected: false };
      }
      // Scanned PDF — render page to image and OCR
      const imageBase64 = await this.renderPDFPageToImage(file);
      if (!imageBase64) throw new Error('Could not read this PDF. Try uploading as an image.');
      const ocrResult = await openaiService.extractTextFromImage(imageBase64);
      if (!ocrResult.success || !ocrResult.text) throw new Error(ocrResult.error || 'OCR failed');
      return { ocrText: ocrResult.text, orientationCorrected: false };
    }

    // Plain text fallback
    const text = await file.text();
    if (!text.trim()) throw new Error('No text content found in this file.');
    return { ocrText: text, orientationCorrected: false };
  }

  private async renderPDFPageToImage(file: File): Promise<string | null> {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.mjs',
        import.meta.url
      ).toString();
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      return canvas.toDataURL('image/jpeg', 0.92);
    } catch {
      return null;
    }
  }

  async getBatchJob(batchJobId: string): Promise<BatchJob | null> {
    const { data, error } = await supabase
      .from('batch_jobs')
      .select('*, marking_schemes(*)')
      .eq('id', batchJobId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async getStudentAssessments(batchJobId: string): Promise<StudentAssessment[]> {
    const { data, error } = await supabase
      .from('student_assessments')
      .select('*')
      .eq('batch_job_id', batchJobId)
      .order('student_name');

    if (error) throw error;

    // Parse stored jsonb question_results back into typed objects
    return (data || []).map(a => ({
      ...a,
      question_results: a.question_results
        ? (typeof a.question_results === 'string'
            ? JSON.parse(a.question_results)
            : a.question_results) as QuestionResult[]
        : undefined,
    }));
  }

  extractStudentName(filename: string): string {
    const nameWithoutExtension = filename.replace(/\.[^/.]+$/, '');
    return nameWithoutExtension.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim() || filename;
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }
}
