import { NextRequest, NextResponse } from "next/server";
import { getDb, QuizResult } from "@/lib/db";
import { getUser } from "@/lib/auth";

interface QuizResultRow extends QuizResult {
  question_count: number;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const db = getDb();

    const results = db
      .prepare(
        `
        SELECT
          qr.id,
          qr.user_id,
          qr.quiz_config,
          qr.started_at,
          qr.completed_at,
          qr.total_marks,
          qr.marks_achieved,
          qr.feedback_summary,
          COUNT(qres.id) AS question_count
        FROM quiz_results qr
        LEFT JOIN question_results qres ON qres.quiz_result_id = qr.id
        WHERE qr.user_id = ?
        GROUP BY qr.id
        ORDER BY qr.completed_at DESC
      `
      )
      .all(user.userId) as QuizResultRow[];

    const parsed = results.map((r) => ({
      id: r.id,
      completedAt: r.completed_at,
      startedAt: r.started_at,
      quizConfig: JSON.parse(r.quiz_config),
      totalMarks: r.total_marks,
      marksAchieved: r.marks_achieved,
      percentage:
        r.total_marks > 0
          ? Math.round((r.marks_achieved / r.total_marks) * 100)
          : 0,
      feedbackSummary: r.feedback_summary ? JSON.parse(r.feedback_summary) : null,
      questionCount: r.question_count,
    }));

    // Compute summary statistics
    const totalQuizzes = parsed.length;
    const averagePercentage =
      totalQuizzes > 0
        ? Math.round(
            parsed.reduce((sum, r) => sum + r.percentage, 0) / totalQuizzes
          )
        : 0;
    const bestPercentage =
      totalQuizzes > 0 ? Math.max(...parsed.map((r) => r.percentage)) : 0;
    const totalMarksEarned = parsed.reduce((sum, r) => sum + r.marksAchieved, 0);
    const totalMarksPossible = parsed.reduce((sum, r) => sum + r.totalMarks, 0);
    const questionsPracticed = parsed.reduce((sum, r) => sum + r.questionCount, 0);

    // Module performance breakdown
    const moduleMap: Record<string, { earned: number; possible: number; label: string }> = {};
    const MODULE_LABELS: Record<string, string> = {
      "5": "Module 5: Heredity",
      "6": "Module 6: Genetic Change",
      "7": "Module 7: Infectious Disease",
      "8": "Module 8: Non-infectious Disease",
    };
    for (const r of parsed) {
      const modules: string[] = r.quizConfig?.modules || [];
      for (const mod of modules) {
        const key = mod.startsWith("Module") ? mod : `Module ${mod}`;
        if (!moduleMap[key]) {
          const num = mod.replace(/\D/g, "");
          moduleMap[key] = { earned: 0, possible: 0, label: MODULE_LABELS[num] || key };
        }
        // Distribute marks evenly across modules for this quiz
        const share = 1 / modules.length;
        moduleMap[key].earned += r.marksAchieved * share;
        moduleMap[key].possible += r.totalMarks * share;
      }
    }
    const moduleScores = Object.entries(moduleMap)
      .map(([module, data]) => ({
        module,
        score: data.possible > 0 ? Math.round((data.earned / data.possible) * 100) : 0,
        label: data.label,
      }))
      .sort((a, b) => a.module.localeCompare(b.module));

    const bestModule = moduleScores.length > 0
      ? moduleScores.reduce((best, m) => (m.score > best.score ? m : best)).label
      : null;

    // Recent attempts in dashboard format
    const recentAttempts = parsed.slice(0, 10).map((r) => ({
      id: String(r.id),
      date: r.completedAt,
      score: r.marksAchieved,
      totalMarks: r.totalMarks,
      questionsCount: r.questionCount,
      modules: (r.quizConfig?.modules || []).map((m: string) =>
        m.startsWith("Module") ? m : `Module ${m}`
      ),
    }));

    return NextResponse.json({
      // History page format
      results: parsed,
      stats: {
        totalQuizzes,
        averagePercentage,
        bestPercentage,
        totalMarksEarned,
        totalMarksPossible,
      },
      // Dashboard format
      totalQuizzes,
      averageScore: averagePercentage,
      questionsPracticed,
      bestModule,
      recentAttempts,
      moduleScores,
    });
  } catch (error) {
    console.error("History error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
