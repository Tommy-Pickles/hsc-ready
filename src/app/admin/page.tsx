"use client";

import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface UserInfo {
  id: number;
  email: string;
  name: string;
  createdAt: string;
  quizCount: number;
  totalMarksEarned: number;
  totalMarksPossible: number;
  averagePercentage: number;
  lastQuizAt: string | null;
}

interface RecentQuiz {
  id: number;
  userName: string;
  userEmail: string;
  completedAt: string;
  totalMarks: number;
  marksAchieved: number;
  percentage: number;
  questionCount: number;
}

interface AdminStats {
  totalUsers: number;
  totalQuizzes: number;
  totalQuestions: number;
}

export default function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [recentQuizzes, setRecentQuizzes] = useState<RecentQuiz[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resetUserId, setResetUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const res = await fetch("/api/admin");
      if (res.status === 403) {
        setError("You don't have admin access.");
        setLoading(false);
        return;
      }
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setUsers(data.users || []);
      setRecentQuizzes(data.recentQuizzes || []);
      setStats(data.stats || null);
    } catch {
      setError("Failed to load admin data.");
    }
    setLoading(false);
  }

  async function handleResetPassword(userId: number) {
    if (!newPassword || newPassword.length < 8) {
      setActionMessage("Password must be at least 8 characters.");
      return;
    }
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset-password", userId, newPassword }),
    });
    const data = await res.json();
    setActionMessage(data.message || data.error);
    setResetUserId(null);
    setNewPassword("");
  }

  async function handleDeleteUser(userId: number, name: string) {
    if (!confirm(`Delete user "${name}" and all their quiz data? This cannot be undone.`)) return;
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-user", userId }),
    });
    const data = await res.json();
    setActionMessage(data.message || data.error);
    loadData();
  }

  function formatDate(d: string | null) {
    if (!d) return "Never";
    return new Date(d).toLocaleDateString("en-AU", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-20 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-500">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-20 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={() => router.push("/dashboard")} className="btn-secondary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Admin Panel</h1>

        {actionMessage && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
            {actionMessage}
            <button onClick={() => setActionMessage("")} className="ml-2 text-blue-500 underline text-xs">dismiss</button>
          </div>
        )}

        {/* Overview stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">{stats.totalUsers}</div>
              <div className="text-xs text-slate-500">Users</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">{stats.totalQuizzes}</div>
              <div className="text-xs text-slate-500">Quizzes Taken</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">{stats.totalQuestions}</div>
              <div className="text-xs text-slate-500">Questions Answered</div>
            </div>
          </div>
        )}

        {/* Users table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-8">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold">Users</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Joined</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Quizzes</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Avg Score</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Last Active</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(u.createdAt)}</td>
                    <td className="px-4 py-3 text-slate-600">{u.quizCount}</td>
                    <td className="px-4 py-3">
                      {u.quizCount > 0 ? (
                        <span className={`font-medium ${u.averagePercentage >= 80 ? "text-green-600" : u.averagePercentage >= 50 ? "text-blue-600" : "text-red-600"}`}>
                          {u.averagePercentage}%
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(u.lastQuizAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setResetUserId(resetUserId === u.id ? null : u.id); setNewPassword(""); }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Reset PW
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                      {resetUserId === u.id && (
                        <div className="flex gap-2 mt-2">
                          <input
                            type="text"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="New password (8+ chars)"
                            className="text-xs border border-slate-300 rounded px-2 py-1 w-40"
                          />
                          <button
                            onClick={() => handleResetPassword(u.id)}
                            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                          >
                            Set
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent quizzes */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold">Recent Quiz Activity</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">User</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Score</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Questions</th>
                  <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentQuizzes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{q.userName}</div>
                      <div className="text-xs text-slate-400">{q.userEmail}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${q.percentage >= 80 ? "text-green-600" : q.percentage >= 50 ? "text-blue-600" : "text-red-600"}`}>
                        {q.marksAchieved}/{q.totalMarks} ({q.percentage}%)
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{q.questionCount}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(q.completedAt)}</td>
                  </tr>
                ))}
                {recentQuizzes.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">No quiz activity yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
