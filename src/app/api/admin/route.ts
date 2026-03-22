import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/db";
import { getUser, hashPassword } from "@/lib/auth";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim()).filter(Boolean);

async function isAdmin(request: NextRequest): Promise<boolean> {
  const user = await getUser(request);
  if (!user) return false;
  if (ADMIN_EMAILS.length > 0) return ADMIN_EMAILS.includes(user.email);
  return user.userId === 1;
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Get all users with their quiz stats
  const { data: usersRaw, error: usersError } = await supabase
    .from("users")
    .select("id, email, name, created_at, quiz_results(id, marks_achieved, total_marks, completed_at)")
    .order("created_at", { ascending: false });

  if (usersError) {
    console.error("Admin users error:", usersError);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }

  const users = (usersRaw || []).map((u) => {
    const quizzes = Array.isArray(u.quiz_results) ? u.quiz_results : [];
    const totalMarksEarned = quizzes.reduce((s: number, q: { marks_achieved: number }) => s + q.marks_achieved, 0);
    const totalMarksPossible = quizzes.reduce((s: number, q: { total_marks: number }) => s + q.total_marks, 0);
    const lastQuiz = quizzes.length > 0
      ? quizzes.reduce((latest: string | null, q: { completed_at: string }) =>
          !latest || q.completed_at > latest ? q.completed_at : latest, null)
      : null;
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.created_at,
      quizCount: quizzes.length,
      totalMarksEarned,
      totalMarksPossible,
      averagePercentage: totalMarksPossible > 0 ? Math.round((totalMarksEarned / totalMarksPossible) * 100) : 0,
      lastQuizAt: lastQuiz,
    };
  });

  // Get recent quizzes
  const { data: recentRaw } = await supabase
    .from("quiz_results")
    .select("id, user_id, quiz_config, completed_at, total_marks, marks_achieved, users(name, email), question_results(id)")
    .order("completed_at", { ascending: false })
    .limit(50);

  const recentQuizzes = (recentRaw || []).map((q) => {
    const user = q.users as unknown as { name: string; email: string } | null;
    return {
      id: q.id,
      userName: user?.name || "Unknown",
      userEmail: user?.email || "",
      completedAt: q.completed_at,
      totalMarks: q.total_marks,
      marksAchieved: q.marks_achieved,
      percentage: q.total_marks > 0 ? Math.round((q.marks_achieved / q.total_marks) * 100) : 0,
      questionCount: Array.isArray(q.question_results) ? q.question_results.length : 0,
    };
  });

  // Overall stats
  const { count: totalQuestions } = await supabase
    .from("question_results")
    .select("id", { count: "exact", head: true });

  return NextResponse.json({
    users,
    recentQuizzes,
    stats: {
      totalUsers: users.length,
      totalQuizzes: users.reduce((s, u) => s + u.quizCount, 0),
      totalQuestions: totalQuestions || 0,
    },
  });
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { action, userId, newPassword } = body;

  if (action === "reset-password") {
    if (!userId || !newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: "userId and newPassword (8+ chars) required" }, { status: 400 });
    }

    const hash = await hashPassword(newPassword);
    const { error } = await supabase
      .from("users")
      .update({ password_hash: hash })
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
    }

    return NextResponse.json({ message: "Password reset successfully" });
  }

  if (action === "delete-user") {
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }

    return NextResponse.json({ message: "User deleted" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
