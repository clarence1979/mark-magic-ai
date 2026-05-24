/*
  # Add per-question results to student assessments

  ## Changes
  - `student_assessments`: adds `question_results` (jsonb) column to store the full
    per-question breakdown returned by the OpenAI marking call, including student answer,
    correct answer, marks awarded, marks available, feedback, strengths, and improvements
    for each question.
  - `student_assessments`: adds `marking_scheme_snapshot` (text) column so each
    assessment record knows exactly which marking scheme was used when it was graded.
  - `batch_jobs`: adds `class_name` (text) column for a human-readable class identifier.

  ## Security
  - No RLS changes needed; existing policies already cover the new columns.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_assessments' AND column_name = 'question_results'
  ) THEN
    ALTER TABLE student_assessments ADD COLUMN question_results jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'student_assessments' AND column_name = 'marking_scheme_snapshot'
  ) THEN
    ALTER TABLE student_assessments ADD COLUMN marking_scheme_snapshot text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batch_jobs' AND column_name = 'class_name'
  ) THEN
    ALTER TABLE batch_jobs ADD COLUMN class_name text DEFAULT '';
  END IF;
END $$;
