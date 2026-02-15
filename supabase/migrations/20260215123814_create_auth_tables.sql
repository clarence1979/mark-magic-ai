/*
  # Create Authentication Tables
  
  1. New Tables
    - `users_login`
      - `id` (uuid, primary key) - Unique identifier
      - `username` (text, unique) - User's login username
      - `password` (text) - User's password (should be hashed in production)
      - `is_admin` (boolean) - Admin flag
      - `created_at` (timestamptz) - Account creation timestamp
      - `last_login` (timestamptz) - Last login timestamp
    
    - `secrets`
      - `id` (uuid, primary key) - Unique identifier
      - `key_name` (text, unique) - Name of the secret key
      - `key_value` (text) - Secret value
      - `description` (text) - Description of the secret
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
    
    - `auth_tokens`
      - `id` (uuid, primary key) - Unique identifier
      - `token` (text, unique) - Authentication token
      - `username` (text) - Associated username
      - `is_admin` (boolean) - Admin flag
      - `expires_at` (timestamptz) - Token expiration time
      - `created_at` (timestamptz) - Token creation timestamp
  
  2. Security
    - Enable RLS on all tables
    - Add public access policies for authentication tables (required for login flow)
    - Indexes on frequently queried columns
  
  3. Notes
    - In production, passwords should be hashed using bcrypt or similar
    - Tokens expire after 24 hours by default
    - Secrets table stores API keys and sensitive configuration
*/

-- Create users_login table
CREATE TABLE IF NOT EXISTS users_login (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz
);

ALTER TABLE users_login ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to users_login"
  ON users_login FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public update of users_login"
  ON users_login FOR UPDATE
  TO public
  USING (true);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_login_username ON users_login(username);

-- Create secrets table
CREATE TABLE IF NOT EXISTS secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name text UNIQUE NOT NULL,
  key_value text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to secrets"
  ON secrets FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert of secrets"
  ON secrets FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update of secrets"
  ON secrets FOR UPDATE
  TO public
  USING (true);

-- Create index on key_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_secrets_key_name ON secrets(key_name);

-- Create auth_tokens table
CREATE TABLE IF NOT EXISTS auth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  username text NOT NULL,
  is_admin boolean DEFAULT false,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE auth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to auth_tokens"
  ON auth_tokens FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert of auth_tokens"
  ON auth_tokens FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update of auth_tokens"
  ON auth_tokens FOR UPDATE
  TO public
  USING (true);

CREATE POLICY "Allow public delete of auth_tokens"
  ON auth_tokens FOR DELETE
  TO public
  USING (true);

-- Create indexes for faster token validation
CREATE INDEX IF NOT EXISTS idx_auth_tokens_token ON auth_tokens(token);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires ON auth_tokens(expires_at);

-- Insert default admin user (password: admin123 - CHANGE IN PRODUCTION!)
INSERT INTO users_login (username, password, is_admin)
VALUES ('admin', 'admin123', true)
ON CONFLICT (username) DO NOTHING;

-- Insert default OPENAI_API_KEY placeholder
INSERT INTO secrets (key_name, key_value, description)
VALUES ('OPENAI_API_KEY', '', 'OpenAI API Key for marking system')
ON CONFLICT (key_name) DO NOTHING;
