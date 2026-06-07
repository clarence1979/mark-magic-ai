/*
  # Add anon write policies for operational tables

  The service_role key must not be bundled in the client.
  These policies allow the anon key (already public) to perform the same
  INSERT/UPDATE operations that previously required the service_role key.

  Read policies already exist on all three tables — only write policies added here.
  The secrets, users_login, and auth_tokens tables remain service_role-write-only.
*/

-- batch_jobs
CREATE POLICY "Anon can insert batch jobs"
  ON batch_jobs FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update batch jobs"
  ON batch_jobs FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- marking_schemes
CREATE POLICY "Anon can insert marking schemes"
  ON marking_schemes FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update marking schemes"
  ON marking_schemes FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- student_assessments
CREATE POLICY "Anon can insert student assessments"
  ON student_assessments FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update student assessments"
  ON student_assessments FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
