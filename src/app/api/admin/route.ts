import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getUser, hashPassword } from "@/lib/auth";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim()).filter(Boolean);

async function isAdmin(request: NextRequest): Promise<boolean> {
  const user = await getUser(request);
  if (!user) return false;
  // First registered user is always admin, or check ADMIN_EMAILS env
  if (ADMIN_EMAILS.length > 0) return ADMIN_EMAILS.includes(user.email);
  return user.userId === 1;
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const db = getDb();

  // Get all users with their quiz stats
  const users = db.prepare(`
    SELECT
      u.id,
      u.email,
      u.name,
      u.created_at,
      COUNT(DISTINCT qr.id) AS quiz_count,
      COALESCE(SUM(qr.marks_achieved), 0) AS total_marks_earned,
      COALESCE(SUM(qr.total_marks), 0) AS total_marks_possible,
      MAX(qr.completed_at) AS last_quiz_at
    FROM users u
    LEFT JOIN quiz_results qr ON qr.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all() as Array<{
    id: number;
    email: string;
    name: string;
    created_at: string;
    quiz_count: number;
    total_marks_earned: number;
    total_marks_possible: number;
    last_quiz_at: string | null;
  }>;

  // Get recent quizzes across all users
  const recentQuizzes = db.prepare(`
    SELECT
      qr.id,
      qr.user_id,
      u.name AS user_name,
      u.email AS user_email,
      qr.quiz_config,
      qr.completed_at,
      qr.total_marks,
      qr.marks_achieved,
      COUNT(qres.id) AS question_count
    FROM quiz_results qr
    JOIN users u ON u.id = qr.user_id
    LEFT JOIN question_results qres ON qres.quiz_result_id = qr.id
    GROUP BY qr.id
    ORDER BY qr.completed_at DESC
    LIMIT 50
  `).all() as Array<{
    id: number;
    user_id: number;
    user_name: string;
    user_email: string;
    quiz_config: string;
    completed_at: string;
    total_marks: number;
    marks_achieved: number;
    question_count: number;
  }>;

  // Overall stats
  const totalUsers = users.length;
  const totalQuizzes = users.reduce((s, u) => s + u.quiz_count, 0);
  const totalQuestions = db.prepare("SELECT COUNT(*) AS count FROM question_results").get() as { count: number };

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      createdAt: u.created_at,
      quizCount: u.quiz_count,
      totalMarksEarned: u.total_marks_earned,
      totalMarksPossible: u.total_marks_possible,
      averagePercentage: u.total_marks_possible > 0 ? Math.round((u.total_marks_earned / u.total_marks_possible) * 100) : 0,
      lastQuizAt: u.last_quiz_at,
    })),
    recentQuizzes: recentQuizzes.map((q) => ({
      id: q.id,
      userName: q.user_name,
      userEmail: q.user_email,
      completedAt: q.completed_at,
      totalMarks: q.total_marks,
      marksAchieved: q.marks_achieved,
      percentage: q.total_marks > 0 ? Math.round((q.marks_achieved / q.total_marks) * 100) : 0,
      questionCount: q.question_count,
    })),
    stats: {
      totalUsers,
      totalQuizzes,
      totalQuestions: totalQuestions.count,
    },
  });
}

// Reset a user's password
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

    const db = getDb();
    const hash = await hashPassword(newPassword);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, userId);

    return NextResponse.json({ message: "Password reset successfully" });
  }

  if (action === "delete-user") {
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const db = getDb();
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);

    return NextResponse.json({ message: "User deleted" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
