import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.env.DB_DIR || process.cwd(), "hsc-ready.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initTables(db);
  }
  return db;
}

function initTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quiz_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      quiz_config TEXT NOT NULL,
      started_at TEXT,
      completed_at TEXT NOT NULL DEFAULT (datetime('now')),
      total_marks INTEGER NOT NULL,
      marks_achieved INTEGER NOT NULL,
      feedback_summary TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS question_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_result_id INTEGER NOT NULL,
      question_id TEXT NOT NULL,
      student_answer TEXT,
      marks_awarded INTEGER NOT NULL,
      marks_possible INTEGER NOT NULL,
      feedback TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (quiz_result_id) REFERENCES quiz_results(id) ON DELETE CASCADE
    );
  `);
}

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
