"use client";

import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface QuizResult {
  id: number;
  completedAt: string;
  quizConfig: { modules?: string[]; questionTypes?: string[]; mode?: string };
  totalMarks: number;
  marksAchieved: number;
  percentage: number;
  questionCount: number;
}

interface Stats {
  totalQuizzes: number;
  averagePercentage: number;
  bestPercentage: number;
  totalMarksEarned: number;
  totalMarksPossible: number;
}

const MODULE_NAMES: Record<string, string> = {
  "5": "Heredity",
  "6": "Genetic Change",
  "7": "Infectious Disease",
  "8": "Non-infectious Disease",
};

function getBand(pct: number): { label: string; color: string } {
  if (pct >= 90) return { label: "Band 6", color: "text-green-600" };
  if (pct >= 80) return { label: "Band 5", color: "text-blue-600" };
  if (pct >= 70) return { label: "Band 4", color: "text-purple-600" };
  if (pct >= 60) return { label: "Band 3", color: "text-yellow-500" };
  if (pct >= 50) return { label: "Band 2", color: "text-orange-600" };
  return { label: "Band 1", color: "text-red-600" };
}

export default function HistoryPage() {
  const router = useRouter();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/quiz/history");
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        setResults(data.results || []);
        setStats(data.stats || null);
      } catch {
        // ignore
      }
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-500">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Quiz History</h1>

        {/* Stats overview */}
        {stats && stats.totalQuizzes > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">{stats.totalQuizzes}</div>
              <div className="text-xs text-slate-500">Quizzes Taken</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">{stats.averagePercentage}%</div>
              <div className="text-xs text-slate-500">Average Score</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">{stats.bestPercentage}%</div>
              <div className="text-xs text-slate-500">Best Score</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">{stats.totalMarksEarned}/{stats.totalMarksPossible}</div>
              <div className="text-xs text-slate-500">Total Marks</div>
            </div>
          </div>
        )}

        {/* Results list */}
        {results.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
            <p className="text-slate-500 mb-4">No quiz history yet. Take a quiz to see your results here.</p>
            <button onClick={() => router.push("/quiz/configure")} className="btn-primary">
              Start a Quiz
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((r) => {
              const band = getBand(r.percentage);
              const modules = r.quizConfig?.modules || [];
              const date = new Date(r.completedAt).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div key={r.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-slate-50 flex flex-col items-center justify-center shrink-0">
                    <span className="text-lg font-bold text-slate-800">{r.percentage}%</span>
                    <span className={`text-[10px] font-semibold ${band.color}`}>{band.label}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-800">
                        {r.marksAchieved}/{r.totalMarks} marks
                      </span>
                      <span className="text-xs text-slate-400">
                        {r.questionCount} question{r.questionCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {modules.map((m) => (
                        <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                          {m.startsWith("Module") ? m : `M${m}`}{MODULE_NAMES[m] ? `: ${MODULE_NAMES[m]}` : ""}
                        </span>
                      ))}
                      <span className="text-xs text-slate-400">{date}</span>
                    </div>
                  </div>
                  <div className="w-20 shrink-0">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${r.percentage >= 80 ? "bg-green-500" : r.percentage >= 50 ? "bg-blue-500" : "bg-red-500"}`}
                        style={{ width: `${r.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex gap-4 mt-8">
          <button onClick={() => router.push("/quiz/configure")} className="btn-primary flex-1">
            Start New Quiz
          </button>
          <button onClick={() => router.push("/dashboard")} className="btn-secondary flex-1">
            Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}
