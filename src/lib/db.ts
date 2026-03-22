import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

// Convenience alias
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export interface User {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
}

export interface QuizResult {
  id: number;
  user_id: number;
  quiz_config: string;
  started_at: string | null;
  completed_at: string;
  total_marks: number;
  marks_achieved: number;
  feedback_summary: string | null;
}

export interface QuestionResult {
  id: number;
  quiz_result_id: number;
  question_id: string;
  student_answer: string | null;
  marks_awarded: number;
  marks_possible: number;
  feedback: string | null;
  created_at: string;
}
