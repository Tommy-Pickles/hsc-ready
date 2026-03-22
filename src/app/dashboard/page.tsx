'use client'

import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface QuizAttempt {
  id: string
  date: string
  score: number
  totalMarks: number
  questionsCount: number
  modules: string[]
  timeTaken?: number
}

interface DashboardStats {
  totalQuizzes: number
  averageScore: number
  questionsPracticed: number
  bestModule: string
  recentAttempts: QuizAttempt[]
  moduleScores: { module: string; score: number; label: string }[]
}

interface User {
  name: string
  email: string
}

const MODULE_COLORS: Record<string, { bar: string; text: string; bg: string }> = {
  'Module 5': { bar: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-500/10' },
  'Module 6': { bar: 'bg-purple-500', text: 'text-purple-600', bg: 'bg-purple-500/10' },
  'Module 7': { bar: 'bg-orange-500', text: 'text-orange-600', bg: 'bg-orange-500/10' },
  'Module 8': { bar: 'bg-green-500', text: 'text-green-600', bg: 'bg-green-500/10' },
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(seconds?: number) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      try {
        const meRes = await fetch('/api/auth/me')
        if (!meRes.ok) {
          router.push('/login')
          return
        }
        const meData = await meRes.json()
        setUser(meData.user)

        const historyRes = await fetch('/api/quiz/history')
        if (historyRes.ok) {
          const historyData = await historyRes.json()
          setStats(historyData)
        }
      } catch {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-white rounded-xl w-64" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-white rounded-2xl" />
              ))}
            </div>
            <div className="h-64 bg-white rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  const firstName = user?.name?.split(' ')[0] ?? 'Student'

  const statCards = [
    {
      label: 'Total Quizzes',
      value: stats?.totalQuizzes ?? 0,
      icon: '📋',
      color: 'text-blue-600',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Average Score',
      value: stats?.averageScore != null ? `${Math.round(stats.averageScore)}%` : '—',
      icon: '🎯',
      color: 'text-purple-600',
      bg: 'bg-purple-500/10',
    },
    {
      label: 'Questions Practised',
      value: stats?.questionsPracticed ?? 0,
      icon: '✏️',
      color: 'text-orange-600',
      bg: 'bg-orange-500/10',
    },
    {
      label: 'Best Module',
      value: stats?.bestModule ?? '—',
      icon: '⭐',
      color: 'text-green-600',
      bg: 'bg-green-500/10',
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Welcome back, {firstName}! 👋
            </h1>
            <p className="text-slate-500 mt-1">Here&apos;s how your practice is going.</p>
          </div>
          <Link
            href="/quiz/configure"
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-lg shadow-blue-500/20 shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Start New Quiz
          </Link>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-300 transition-colors"
            >
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center text-xl mb-3`}>
                {card.icon}
              </div>
              <div className={`text-2xl font-bold ${card.color} mb-1`}>{card.value}</div>
              <div className="text-slate-500 text-sm">{card.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Recent history */}
          <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-slate-900">Recent Quizzes</h2>
              <Link
                href="/history"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
              >
                View all →
              </Link>
            </div>

            {!stats?.recentAttempts?.length ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">🎓</div>
                <p className="text-slate-500 font-medium">No quizzes yet</p>
                <p className="text-slate-400 text-sm mt-1">Complete your first quiz to see results here</p>
                <Link
                  href="/quiz/configure"
                  className="inline-block mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                >
                  Start practising →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recentAttempts.slice(0, 6).map((attempt) => {
                  const pct = Math.round((attempt.score / attempt.totalMarks) * 100)
                  return (
                    <div
                      key={attempt.id}
                      className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-50 transition-colors group"
                    >
                      {/* Score ring */}
                      <div
                        className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm border-2 ${
                          pct >= 80
                            ? 'border-green-500 text-green-600 bg-green-500/10'
                            : pct >= 60
                              ? 'border-blue-500 text-blue-600 bg-blue-500/10'
                              : 'border-orange-500 text-orange-600 bg-orange-500/10'
                        }`}
                      >
                        {pct}%
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-slate-800 font-medium text-sm">
                            {attempt.score}/{attempt.totalMarks} marks
                          </span>
                          <span className="text-slate-600 text-xs">·</span>
                          <span className="text-slate-500 text-xs">{attempt.questionsCount} questions</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {attempt.modules.map((mod) => {
                            const colors = MODULE_COLORS[mod]
                            return (
                              <span
                                key={mod}
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors?.text ?? 'text-slate-500'} ${colors?.bg ?? 'bg-slate-100'}`}
                              >
                                {mod}
                              </span>
                            )
                          })}
                        </div>
                      </div>
                      <div className="text-slate-400 text-xs text-right shrink-0">
                        <div>{formatDate(attempt.date)}</div>
                        {attempt.timeTaken && (
                          <div className="mt-0.5">{formatTime(attempt.timeTaken)}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Module performance chart */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-5">Performance by Module</h2>

            {!stats?.moduleScores?.length ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📊</div>
                <p className="text-slate-400 text-sm">Complete quizzes to see your module performance</p>
              </div>
            ) : (
              <div className="space-y-5">
                {stats.moduleScores.map((item) => {
                  const colors = MODULE_COLORS[item.module]
                  return (
                    <div key={item.module}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-slate-600 text-sm font-medium">{item.label}</span>
                        <span className={`text-sm font-bold ${colors?.text ?? 'text-slate-500'}`}>
                          {Math.round(item.score)}%
                        </span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${colors?.bar ?? 'bg-slate-500'}`}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Quick access */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              <p className="text-slate-500 text-sm font-medium mb-3">Quick practice</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(MODULE_COLORS).map(([mod, colors]) => (
                  <Link
                    key={mod}
                    href={`/quiz/configure?module=${encodeURIComponent(mod)}`}
                    className={`text-xs px-3 py-2 rounded-lg ${colors.bg} ${colors.text} font-medium hover:opacity-80 transition-opacity text-center`}
                  >
                    {mod}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
