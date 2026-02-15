/*
  # Fix Security Issues - Remove Unused Indexes and Overly Permissive Policies
  
  1. Remove Unused Indexes
    - Drop idx_batch_jobs_status (not used)
    - Drop idx_batch_jobs_marking_scheme (not used)
    - Drop idx_student_assessments_batch (not used)
    - Drop idx_student_assessments_status (not used)
    - Drop idx_auth_tokens_token (redundant with unique constraint)
    - Drop idx_auth_tokens_expires (not used)
  
  2. Fix RLS Policies
    - Remove all overly permissive write policies (INSERT/UPDATE/DELETE with USING true)
    - Keep read-only access via SELECT policies
    - Secure writes will be handled via Edge Functions with proper authentication
  
  3. Security Model
    - All tables remain read-only via RLS
    - Write operations must go through Edge Functions
    - Edge Functions validate authentication tokens server-side
    - This prevents unauthorized data manipulation via the anon key
  
  IMPORTANT: After this migration, write operations from the frontend will fail.
  You must use Edge Functions for all INSERT/UPDATE/DELETE operations.
*/

-- ============================================================================
-- REMOVE UNUSED INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_batch_jobs_status;
DROP INDEX IF EXISTS idx_batch_jobs_marking_scheme;
DROP INDEX IF EXISTS idx_student_assessments_batch;
DROP INDEX IF EXISTS idx_student_assessments_status;
DROP INDEX IF EXISTS idx_auth_tokens_token;
DROP INDEX IF EXISTS idx_auth_tokens_expires;

-- ============================================================================
-- FIX AUTH_TOKENS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Allow public insert of auth_tokens" ON auth_tokens;
DROP POLICY IF EXISTS "Allow public update of auth_tokens" ON auth_tokens;
DROP POLICY IF EXISTS "Allow public delete of auth_tokens" ON auth_tokens;

-- Keep read-only access for token validation
-- Token creation/deletion will be handled by Edge Functions

-- ============================================================================
-- FIX SECRETS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Allow public insert of secrets" ON secrets;
DROP POLICY IF EXISTS "Allow public update of secrets" ON secrets;

-- Keep read-only access
-- Secret updates must be done via Edge Functions or admin panel

-- ============================================================================
-- FIX USERS_LOGIN TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Allow public update of users_login" ON users_login;
DROP POLICY IF EXISTS "Allow update last_login only" ON users_login;

-- Keep read-only access for authentication
-- User updates will be handled by Edge Functions

-- ============================================================================
-- FIX BATCH_JOBS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Allow public insert of batch jobs" ON batch_jobs;
DROP POLICY IF EXISTS "Allow public update of batch jobs" ON batch_jobs;
DROP POLICY IF EXISTS "Allow public delete of batch jobs" ON batch_jobs;
DROP POLICY IF EXISTS "Allow batch job creation" ON batch_jobs;
DROP POLICY IF EXISTS "Allow batch job updates" ON batch_jobs;
DROP POLICY IF EXISTS "Allow batch job deletion" ON batch_jobs;

-- Keep read-only access
-- Batch job management will be handled by Edge Functions

-- ============================================================================
-- FIX MARKING_SCHEMES TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Allow public insert of marking schemes" ON marking_schemes;
DROP POLICY IF EXISTS "Allow public update of marking schemes" ON marking_schemes;
DROP POLICY IF EXISTS "Allow public delete of marking schemes" ON marking_schemes;
DROP POLICY IF EXISTS "Allow marking scheme creation" ON marking_schemes;
DROP POLICY IF EXISTS "Allow marking scheme updates" ON marking_schemes;
DROP POLICY IF EXISTS "Allow marking scheme deletion" ON marking_schemes;

-- Keep read-only access
-- Marking scheme management will be handled by Edge Functions

-- ============================================================================
-- FIX STUDENT_ASSESSMENTS TABLE POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Allow public insert of student assessments" ON student_assessments;
DROP POLICY IF EXISTS "Allow public update of student assessments" ON student_assessments;
DROP POLICY IF EXISTS "Allow public delete of student assessments" ON student_assessments;
DROP POLICY IF EXISTS "Allow student assessment creation" ON student_assessments;
DROP POLICY IF EXISTS "Allow student assessment updates" ON student_assessments;
DROP POLICY IF EXISTS "Allow student assessment deletion" ON student_assessments;

-- Keep read-only access
-- Assessment management will be handled by Edge Functions

-- ============================================================================
-- ADD SECURITY COMMENTS
-- ============================================================================

COMMENT ON TABLE auth_tokens IS 'Read-only via RLS. Token management requires Edge Functions with authentication.';
COMMENT ON TABLE secrets IS 'Read-only via RLS. Secret updates require Edge Functions or service role access.';
COMMENT ON TABLE users_login IS 'Read-only via RLS. User management requires Edge Functions with authentication.';
COMMENT ON TABLE batch_jobs IS 'Read-only via RLS. Batch job operations require Edge Functions with authentication.';
COMMENT ON TABLE marking_schemes IS 'Read-only via RLS. Marking scheme operations require Edge Functions with authentication.';
COMMENT ON TABLE student_assessments IS 'Read-only via RLS. Assessment operations require Edge Functions with authentication.';
