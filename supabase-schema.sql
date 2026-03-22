-- Run this in Supabase SQL Editor (supabase.com → your project → SQL Editor)

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quiz results table
CREATE TABLE IF NOT EXISTS quiz_results (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_config TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_marks INTEGER NOT NULL,
  marks_achieved INTEGER NOT NULL,
  feedback_summary TEXT
);

-- Question results table
CREATE TABLE IF NOT EXISTS question_results (
  id BIGSERIAL PRIMARY KEY,
  quiz_result_id BIGINT NOT NULL REFERENCES quiz_results(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  student_answer TEXT,
  marks_awarded INTEGER NOT NULL,
  marks_possible INTEGER NOT NULL,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_question_results_quiz_id ON question_results(quiz_result_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Disable RLS (we use service role key server-side)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_results ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (service key bypasses RLS automatically)
-- No additional policies needed when using service role key
