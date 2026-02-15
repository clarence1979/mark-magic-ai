import { supabase, supabaseAdmin, BatchJob, StudentAssessment } from '../lib/supabase';
import { ImageOrientationService } from './imageOrientationService';
import { OpenAIService } from './openaiService';
import { AIDetectionService } from './aiDetectionService';
import { PlagiarismService } from './plagiarismService';

export interface BatchProcessingOptions {
  apiKey: string;
  markingSchemeContent: string;
  onProgress?: (current: number, total: number) => void;
  onStudentComplete?: (assessment: StudentAssessment) => void;
}

export class BatchProcessingService {
  async createBatchJob(name: string, markingSchemeId: string, totalStudents: number): Promise<string> {
    const { data, error } = await supabaseAdmin
      .from('batch_jobs')
      .insert({
        name,
        marking_scheme_id: markingSchemeId,
        status: 'pending',
        total_students: totalStudents,
        processed_students: 0
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
        status: 'pending'
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
      .update({ status: 'processing' })
      .eq('id', batchJobId);

    const orientationService = new ImageOrientationService(options.apiKey);
    const openaiService = new OpenAIService(options.apiKey);
    const aiDetectionService = new AIDetectionService(options.apiKey);
    const plagiarismService = new PlagiarismService(options.apiKey);

    let processedCount = 0;

    for (const file of files) {
      try {
        const studentName = this.extractStudentName(file.name);

        const assessmentId = await this.addStudentToBatch(batchJobId, studentName, file);

        await supabaseAdmin
          .from('student_assessments')
          .update({ status: 'processing' })
          .eq('id', assessmentId);

        const imageBase64 = await this.fileToBase64(file);
        let processedImage = imageBase64;

        const orientationResponse = await orientationService.checkAndCorrectOrientation(imageBase64);
        const orientationCorrected = orientationResponse.needsCorrection || false;

        if (orientationResponse.correctedImage) {
          processedImage = orientationResponse.correctedImage;
        }

        const ocrResult = await openaiService.extractText(processedImage);
        if (!ocrResult.success || !ocrResult.text) {
          throw new Error(ocrResult.error || 'OCR failed');
        }

        const markingResult = await openaiService.markAssessment(
          ocrResult.text,
          options.markingSchemeContent
        );

        const aiDetectionResult = await aiDetectionService.detectAIContent(ocrResult.text);
        const plagiarismResult = await plagiarismService.checkPlagiarism(ocrResult.text);

        const updateData: Partial<StudentAssessment> = {
          status: 'completed',
          ocr_text: ocrResult.text,
          total_score: markingResult.totalScore,
          max_score: markingResult.maxScore,
          percentage: markingResult.percentage,
          detailed_feedback: markingResult.feedback,
          ai_detection_score: aiDetectionResult.isAiGenerated ? aiDetectionResult.confidence : 0,
          plagiarism_score: plagiarismResult.overallScore,
          orientation_corrected: orientationCorrected,
          processed_at: new Date().toISOString()
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

        if (options.onProgress) {
          options.onProgress(processedCount, files.length);
        }

        if (options.onStudentComplete && updatedAssessment) {
          options.onStudentComplete(updatedAssessment);
        }

      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);

        const studentName = this.extractStudentName(file.name);
        const assessmentId = await this.addStudentToBatch(batchJobId, studentName, file);

        await supabaseAdmin
          .from('student_assessments')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Processing failed'
          })
          .eq('id', assessmentId);

        processedCount++;
      }
    }

    await supabaseAdmin
      .from('batch_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        processed_students: processedCount
      })
      .eq('id', batchJobId);
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
    return data || [];
  }

  private extractStudentName(filename: string): string {
    const nameWithoutExtension = filename.replace(/\.[^/.]+$/, '');

    const cleaned = nameWithoutExtension
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return cleaned || filename;
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
