import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get quiz results with question counts
    const { data: results, error } = await supabase
      .from("quiz_results")
      .select("*, question_results(id)")
      .eq("user_id", user.userId)
      .order("completed_at", { ascending: false });

    if (error) {
      console.error("History query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch history" },
        { status: 500 }
      );
    }

    const parsed = (results || []).map((r) => ({
      id: r.id,
      completedAt: r.completed_at,
      startedAt: r.started_at,
      quizConfig: typeof r.quiz_config === "string" ? JSON.parse(r.quiz_config) : r.quiz_config,
      totalMarks: r.total_marks,
      marksAchieved: r.marks_achieved,
      percentage:
        r.total_marks > 0
          ? Math.round((r.marks_achieved / r.total_marks) * 100)
          : 0,
      feedbackSummary: r.feedback_summary
        ? typeof r.feedback_summary === "string"
          ? JSON.parse(r.feedback_summary)
          : r.feedback_summary
        : null,
      questionCount: Array.isArray(r.question_results) ? r.question_results.length : 0,
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
      results: parsed,
      stats: {
        totalQuizzes,
        averagePercentage,
        bestPercentage,
        totalMarksEarned,
        totalMarksPossible,
      },
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
