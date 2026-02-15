/*
  # Add Service Role Write Policies
  
  1. Security Model
    - Public role: READ-ONLY access (SELECT only)
    - Service role: Full write access (INSERT/UPDATE/DELETE)
    - This ensures writes require service_role key, not just anon key
  
  2. New Policies
    - Add service_role specific policies for all write operations
    - These don't trigger "always true" warnings because they're role-specific
  
  3. Application Changes Required
    - Write operations must use service role key
    - Read operations can use anon key
    - This provides proper separation of privileges
*/

-- ============================================================================
-- AUTH_TOKENS: Service Role Write Access
-- ============================================================================

CREATE POLICY "Service role can insert auth tokens"
  ON auth_tokens FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update auth tokens"
  ON auth_tokens FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete auth tokens"
  ON auth_tokens FOR DELETE
  TO service_role
  USING (true);

-- ============================================================================
-- SECRETS: Service Role Write Access
-- ============================================================================

CREATE POLICY "Service role can insert secrets"
  ON secrets FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update secrets"
  ON secrets FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete secrets"
  ON secrets FOR DELETE
  TO service_role
  USING (true);

-- ============================================================================
-- USERS_LOGIN: Service Role Write Access
-- ============================================================================

CREATE POLICY "Service role can insert users"
  ON users_login FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update users"
  ON users_login FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete users"
  ON users_login FOR DELETE
  TO service_role
  USING (true);

-- ============================================================================
-- BATCH_JOBS: Service Role Write Access
-- ============================================================================

CREATE POLICY "Service role can insert batch jobs"
  ON batch_jobs FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update batch jobs"
  ON batch_jobs FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete batch jobs"
  ON batch_jobs FOR DELETE
  TO service_role
  USING (true);

-- ============================================================================
-- MARKING_SCHEMES: Service Role Write Access
-- ============================================================================

CREATE POLICY "Service role can insert marking schemes"
  ON marking_schemes FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update marking schemes"
  ON marking_schemes FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete marking schemes"
  ON marking_schemes FOR DELETE
  TO service_role
  USING (true);

-- ============================================================================
-- STUDENT_ASSESSMENTS: Service Role Write Access
-- ============================================================================

CREATE POLICY "Service role can insert student assessments"
  ON student_assessments FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update student assessments"
  ON student_assessments FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete student assessments"
  ON student_assessments FOR DELETE
  TO service_role
  USING (true);

-- ============================================================================
-- UPDATE COMMENTS
-- ============================================================================

COMMENT ON TABLE auth_tokens IS 'Public: READ-ONLY. Writes require service_role key.';
COMMENT ON TABLE secrets IS 'Public: READ-ONLY. Writes require service_role key or admin access.';
COMMENT ON TABLE users_login IS 'Public: READ-ONLY. Writes require service_role key.';
COMMENT ON TABLE batch_jobs IS 'Public: READ-ONLY. Writes require service_role key.';
COMMENT ON TABLE marking_schemes IS 'Public: READ-ONLY. Writes require service_role key.';
COMMENT ON TABLE student_assessments IS 'Public: READ-ONLY. Writes require service_role key.';
