import { createClient } from '@supabase/supabase-js';
import { getPass } from './eduai';

// Marking schemes, batches and results are kept in the teachingtools.dev database. Each row
// belongs to the teachingtools.dev account that made it: requests carry the person's
// short-lived pass, and the database rules show people only their own rows (teachers see
// all). The anon key below is public; it opens nothing without a pass.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yihztkqrfxgvvsovpmfu.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpaHp0a3FyZnhndnZzb3ZwbWZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5ODMwMjAsImV4cCI6MjA3MTU1OTAyMH0.QmqeyNIULbMxwC2jniJXgG2-uPfvBp6Z_MiT7MQLN3Y';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      const pass = await getPass();
      if (pass) headers.set('x-session-token', pass);
      return fetch(input, { ...init, headers });
    },
  },
});

// Kept for older callers: the same client (writes are checked by the database rules).
export const supabaseAdmin = supabase;

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
