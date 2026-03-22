import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
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

    // Insert quiz result
    const { data: quizResult, error: quizError } = await supabase
      .from("quiz_results")
      .insert({
        user_id: user.userId,
        quiz_config: JSON.stringify(quizConfig),
        started_at: startedAt ?? null,
        total_marks: totalMarks,
        marks_achieved: marksAchieved,
        feedback_summary: feedbackSummary ? JSON.stringify(feedbackSummary) : null,
      })
      .select("id")
      .single();

    if (quizError || !quizResult) {
      console.error("Quiz insert error:", quizError);
      return NextResponse.json(
        { error: "Failed to save quiz result" },
        { status: 500 }
      );
    }

    // Insert question results
    const questionRows = questions.map((q) => ({
      quiz_result_id: quizResult.id,
      question_id: q.questionId,
      student_answer: q.studentAnswer ?? null,
      marks_awarded: q.marksAwarded,
      marks_possible: q.marksPossible,
      feedback: q.feedback ? JSON.stringify(q.feedback) : null,
    }));

    const { error: questionsError } = await supabase
      .from("question_results")
      .insert(questionRows);

    if (questionsError) {
      console.error("Questions insert error:", questionsError);
      // Still return success since quiz was saved
    }

    return NextResponse.json(
      { quizResultId: quizResult.id, message: "Quiz result saved successfully" },
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
