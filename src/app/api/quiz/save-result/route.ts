import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUser } from "@/lib/auth";

interface QuestionPayload {
  questionId: string;
  studentAnswer: string;
  marksAwarded: number;
  marksPossible: number;
  feedback: object | null;
}

interface SaveResultPayload {
  quizConfig: {
    modules: string[];
    questionTypes: string[];
    totalLength: number;
    mode: string;
  };
  questions: QuestionPayload[];
  totalMarks: number;
  marksAchieved: number;
  feedbackSummary: object | null;
  startedAt?: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const body: SaveResultPayload = await request.json();
    const { quizConfig, questions, totalMarks, marksAchieved, feedbackSummary, startedAt } = body;

    if (!quizConfig || !questions || totalMarks === undefined || marksAchieved === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!Array.isArray(questions)) {
      return NextResponse.json(
        { error: "questions must be an array" },
        { status: 400 }
      );
    }

    const db = getDb();

    const insertQuizResult = db.prepare(`
      INSERT INTO quiz_results (user_id, quiz_config, started_at, total_marks, marks_achieved, feedback_summary)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertQuestionResult = db.prepare(`
      INSERT INTO question_results (quiz_result_id, question_id, student_answer, marks_awarded, marks_possible, feedback)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const saveAll = db.transaction(() => {
      const result = insertQuizResult.run(
        user.userId,
        JSON.stringify(quizConfig),
        startedAt ?? null,
        totalMarks,
        marksAchieved,
        feedbackSummary ? JSON.stringify(feedbackSummary) : null
      );

      const quizResultId = result.lastInsertRowid as number;

      for (const q of questions) {
        insertQuestionResult.run(
          quizResultId,
          q.questionId,
          q.studentAnswer ?? null,
          q.marksAwarded,
          q.marksPossible,
          q.feedback ? JSON.stringify(q.feedback) : null
        );
      }

      return quizResultId;
    });

    const quizResultId = saveAll();

    return NextResponse.json(
      { quizResultId, message: "Quiz result saved successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Save result error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
