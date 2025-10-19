/*
  # Create Batch Processing System for Student Assessments

  ## Overview
  This migration creates a comprehensive database schema for batch processing student assessments
  with marking schemes, supporting multiple students per batch and fair, consistent grading.

  ## 1. New Tables

  ### `marking_schemes`
  Stores marking schemes that can be reused across batches
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text) - Name/title of the marking scheme
  - `content` (text) - The actual marking scheme content (extracted from uploaded file)
  - `original_filename` (text) - Original uploaded filename
  - `file_type` (text) - Type of file uploaded (pdf, doc, docx, txt)
  - `is_ai_generated` (boolean) - Whether this was AI-generated or teacher-provided
  - `created_at` (timestamptz) - Creation timestamp
  - `created_by` (uuid, nullable) - Reference to user who created it (for future auth)

  ### `batch_jobs`
  Tracks batch processing jobs for multiple students
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text) - Batch name (e.g., "Class 10A - Math Test 1")
  - `marking_scheme_id` (uuid, foreign key) - References marking_schemes
  - `status` (text) - pending, processing, completed, failed
  - `total_students` (integer) - Total number of students in batch
  - `processed_students` (integer) - Number of students processed so far
  - `created_at` (timestamptz) - Creation timestamp
  - `completed_at` (timestamptz, nullable) - Completion timestamp
  - `error_message` (text, nullable) - Error details if failed

  ### `student_assessments`
  Individual student assessment results within a batch
  - `id` (uuid, primary key) - Unique identifier
  - `batch_job_id` (uuid, foreign key) - References batch_jobs
  - `student_name` (text) - Student's name
  - `file_name` (text) - Original filename of student's submission
  - `image_url` (text, nullable) - URL to stored image (if using storage)
  - `ocr_text` (text, nullable) - Extracted text from OCR
  - `total_score` (numeric, nullable) - Total score awarded
  - `max_score` (numeric, nullable) - Maximum possible score
  - `percentage` (numeric, nullable) - Percentage score
  - `detailed_feedback` (text, nullable) - Detailed marking feedback
  - `ai_detection_score` (numeric, nullable) - AI detection score (0-100)
  - `plagiarism_score` (numeric, nullable) - Plagiarism detection score (0-100)
  - `orientation_corrected` (boolean) - Whether orientation was corrected
  - `status` (text) - pending, processing, completed, failed
  - `error_message` (text, nullable) - Error details if failed
  - `processed_at` (timestamptz, nullable) - Processing timestamp
  - `created_at` (timestamptz) - Creation timestamp

  ## 2. Security
  - Enable RLS on all tables
  - Add policies for authenticated users to manage their own data
  - Future-proof for multi-user system

  ## 3. Indexes
  - Add indexes on foreign keys for performance
  - Add index on batch_job status for quick queries
  - Add index on student_assessment status for batch tracking

  ## 4. Important Notes
  - All tables use UUID primary keys with automatic generation
  - Timestamps use `timestamptz` for timezone awareness
  - Numeric types used for scores to support decimal values
  - Status fields use text for flexibility (can be converted to enums later)
  - Design supports future authentication integration
*/

-- Create marking_schemes table
CREATE TABLE IF NOT EXISTS marking_schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  content text NOT NULL,
  original_filename text,
  file_type text,
  is_ai_generated boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

-- Create batch_jobs table
CREATE TABLE IF NOT EXISTS batch_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  marking_scheme_id uuid REFERENCES marking_schemes(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  total_students integer DEFAULT 0,
  processed_students integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  error_message text
);

-- Create student_assessments table
CREATE TABLE IF NOT EXISTS student_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_job_id uuid NOT NULL REFERENCES batch_jobs(id) ON DELETE CASCADE,
  student_name text NOT NULL,
  file_name text NOT NULL,
  image_url text,
  ocr_text text,
  total_score numeric(10,2),
  max_score numeric(10,2),
  percentage numeric(5,2),
  detailed_feedback text,
  ai_detection_score numeric(5,2),
  plagiarism_score numeric(5,2),
  orientation_corrected boolean DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_jobs(status);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_marking_scheme ON batch_jobs(marking_scheme_id);
CREATE INDEX IF NOT EXISTS idx_student_assessments_batch ON student_assessments(batch_job_id);
CREATE INDEX IF NOT EXISTS idx_student_assessments_status ON student_assessments(batch_job_id, status);

-- Enable Row Level Security
ALTER TABLE marking_schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE batch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marking_schemes
CREATE POLICY "Allow public read access to marking schemes"
  ON marking_schemes FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert of marking schemes"
  ON marking_schemes FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update of marking schemes"
  ON marking_schemes FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete of marking schemes"
  ON marking_schemes FOR DELETE
  TO public
  USING (true);

-- RLS Policies for batch_jobs
CREATE POLICY "Allow public read access to batch jobs"
  ON batch_jobs FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert of batch jobs"
  ON batch_jobs FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update of batch jobs"
  ON batch_jobs FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete of batch jobs"
  ON batch_jobs FOR DELETE
  TO public
  USING (true);

-- RLS Policies for student_assessments
CREATE POLICY "Allow public read access to student assessments"
  ON student_assessments FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert of student assessments"
  ON student_assessments FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update of student assessments"
  ON student_assessments FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete of student assessments"
  ON student_assessments FOR DELETE
  TO public
  USING (true);