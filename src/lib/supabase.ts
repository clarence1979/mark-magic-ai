import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : supabase;

export interface MarkingScheme {
  id: string;
  name: string;
  content: string;
  original_filename?: string;
  file_type?: string;
  is_ai_generated: boolean;
  created_at: string;
  created_by?: string;
}


export interface QuestionResult {
  question: string;
  studentAnswer: string;
  correctAnswer?: string;
  maxMarks: number;
  awardedMarks: number;
  feedback: string;
  markingScheme?: string;
  strengths: string[];
  improvements: string[];
}

export interface StudentAssessment {
  id: string;
  batch_job_id: string;
  student_name: string;
  file_name: string;
  image_url?: string;
  ocr_text?: string;
  total_score?: number;
  max_score?: number;
  percentage?: number;
  detailed_feedback?: string;
  question_results?: QuestionResult[];
  marking_scheme_snapshot?: string;
  ai_detection_score?: number;
  plagiarism_score?: number;
  orientation_corrected: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  processed_at?: string;
  created_at: string;
}

export interface BatchJob {
  id: string;
  name: string;
  class_name?: string;
  marking_scheme_id?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_students: number;
  processed_students: number;
  created_at: string;
  completed_at?: string;
  error_message?: string;
  marking_schemes?: MarkingScheme;
}
