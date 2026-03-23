'use client'

import Navbar from '@/components/Navbar'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Question {
  id: string
  year: number
  questionNumber: string
  module: string
  marks: number
  type: string
  text: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MODULE_STYLES: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  'Module 5': {
    border: 'border-l-blue-500',
    bg: 'bg-blue-500/10',
    text: 'text-blue-600',
    badge: 'bg-blue-500/10 text-blue-600',
  },
  'Module 6': {
    border: 'border-l-purple-500',
    bg: 'bg-purple-500/10',
    text: 'text-purple-600',
    badge: 'bg-purple-500/10 text-purple-600',
  },
  'Module 7': {
    border: 'border-l-orange-500',
    bg: 'bg-orange-500/10',
    text: 'text-orange-600',
    badge: 'bg-orange-500/10 text-orange-600',
  },
  'Module 8': {
    border: 'border-l-green-500',
    bg: 'bg-green-500/10',
    text: 'text-green-600',
    badge: 'bg-green-500/10 text-green-600',
  },
}

const TYPE_LABELS: Record<string, string> = {
  mc: 'Multiple Choice',
  short: 'Short Answer',
  extended: 'Extended Response',
}

// ─── Component ────────────────────────────────────────────────────────────────

function SelectPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [questions, setQuestions] = useState<Question[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'year' | 'marks' | 'module'>('year')

  const modulesParam = searchParams.get('modules') ?? ''
  const typeParam = searchParams.get('type') ?? 'all'
  const countParam = parseInt(searchParams.get('count') ?? '20', 10)

  // ─── Load questions ──────────────────────────────────────────────────────

  useEffect(() => {
    async function loadQuestions() {
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams()
        if (modulesParam) params.set('modules', modulesParam)
        if (typeParam !== 'all') params.set('type', typeParam)

        const res = await fetch(`/api/questions?${params.toString()}`)
        if (!res.ok) throw new Error('Failed to load questions')
        const data = await res.json()
        const raw = Array.isArray(data) ? data : data.questions ?? []
        setQuestions(raw.map((q: Record<string, unknown>) => ({
          id: q.id as string,
          year: q.year as number,
          questionNumber: (q.questionNumber ?? q.question_number) as string,
          module: (q.module ?? '') as string,
          marks: (q.marks ?? 1) as number,
          type: (q.type ?? 'mc') as string,
          text: (q.questionText ?? q.text ?? '') as string,
        })))
      } catch {
        setError('Could not load questions. Please go back and try again.')
      } finally {
        setLoading(false)
      }
    }
    loadQuestions()
  }, [modulesParam, typeParam])

  // ─── Filtering & sorting ─────────────────────────────────────────────────

  const filteredQuestions = questions
    .filter((q) => {
      if (!searchTerm) return true
      const term = searchTerm.toLowerCase()
      return (
        q.text.toLowerCase().includes(term) ||
        q.module.toLowerCase().includes(term) ||
        String(q.year).includes(term)
      )
    })
    .sort((a, b) => {
      if (sortBy === 'year') return b.year - a.year
      if (sortBy === 'marks') return b.marks - a.marks
      if (sortBy === 'module') return a.module.localeCompare(b.module)
      return 0
    })

  // ─── Selection handlers ──────────────────────────────────────────────────

  const toggleQuestion = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  function selectAll() {
    setSelected(new Set(filteredQuestions.map((q) => q.id)))
  }

  function deselectAll() {
    setSelected(new Set())
  }

  // ─── Computed ────────────────────────────────────────────────────────────

  const selectedQuestions = questions.filter((q) => selected.has(q.id))
  const totalMarks = selectedQuestions.reduce((sum, q) => sum + q.marks, 0)
  const minNeeded = Math.min(countParam, 1)
  const canStart = selected.size >= minNeeded

  // ─── Start quiz ──────────────────────────────────────────────────────────

  function handleStartQuiz() {
    if (!canStart) return
    const ids = Array.from(selected)
    localStorage.setItem('selectedQuestionIds', JSON.stringify(ids))
    router.push('/quiz/take')
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-white rounded-xl w-72 border border-slate-200" />
            <div className="h-12 bg-white rounded-xl border border-slate-200" />
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-white rounded-xl border border-slate-200" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to configure
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Choose Your Questions</h1>
          <p className="text-slate-500 mt-1">
            {questions.length} questions available · select the ones you want to practise
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 rounded-xl px-4 py-3 mb-6 text-sm">
            {error}
          </div>
        )}

        {/* Filters bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search questions…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'year' | 'marks' | 'module')}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 text-sm focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
          >
            <option value="year">Sort: Year (newest)</option>
            <option value="marks">Sort: Marks (highest)</option>
            <option value="module">Sort: Module</option>
          </select>

          {/* Select/Deselect all */}
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 text-sm hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              Select all
            </button>
            {selected.size > 0 && (
              <button
                onClick={deselectAll}
                className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 text-sm hover:bg-slate-50 transition-colors whitespace-nowrap"
              >
                Deselect all
              </button>
            )}
          </div>
        </div>

        {/* Question list */}
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-slate-600 font-medium">No questions found</p>
            <p className="text-slate-400 text-sm mt-1">Try adjusting your filters or search term</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredQuestions.map((question) => {
              const isSelected = selected.has(question.id)
              const styles = MODULE_STYLES[question.module] ?? {
                border: 'border-l-slate-400',
                bg: 'bg-slate-100',
                text: 'text-slate-600',
                badge: 'bg-slate-100 text-slate-600',
              }

              return (
                <div
                  key={question.id}
                  onClick={() => toggleQuestion(question.id)}
                  className={`flex items-start gap-4 p-4 rounded-xl border-l-4 border cursor-pointer transition-all hover:-translate-y-0.5 ${
                    isSelected
                      ? `${styles.border} ${styles.bg} border-slate-200`
                      : 'border-l-slate-300 bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  {/* Checkbox */}
                  <div
                    className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-slate-300 bg-transparent'
                    }`}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-slate-500 text-xs font-medium">{question.year}</span>
                      <span className="text-slate-300 text-xs">·</span>
                      <span className="text-slate-500 text-xs">Q{question.questionNumber}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles.badge}`}
                      >
                        {question.module}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                        {TYPE_LABELS[question.type] ?? question.type}
                      </span>
                    </div>

                    {/* Question text preview */}
                    <p className="text-slate-800 text-sm leading-relaxed line-clamp-2">
                      {question.text}
                    </p>
                  </div>

                  {/* Marks badge */}
                  <div className="shrink-0 text-right">
                    <div
                      className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-sm font-bold ${
                        isSelected ? `${styles.bg} ${styles.text}` : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {question.marks}
                    </div>
                    <div className="text-slate-400 text-xs mt-0.5">
                      {question.marks === 1 ? 'mark' : 'marks'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Sticky footer CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Selection count */}
          <div className="flex items-center gap-3">
            {selected.size > 0 ? (
              <>
                <div className="bg-blue-500/10 border border-blue-500/20 text-blue-600 rounded-xl px-4 py-2 text-sm font-medium">
                  {selected.size} question{selected.size !== 1 ? 's' : ''} selected
                </div>
                <div className="bg-purple-500/10 border border-purple-500/20 text-purple-600 rounded-xl px-4 py-2 text-sm font-medium">
                  {totalMarks} marks · ~{Math.round(totalMarks * 1.5)} min
                </div>
              </>
            ) : (
              <span className="text-slate-500 text-sm">Select questions to begin your quiz</span>
            )}
          </div>

          {/* Start button */}
          <button
            onClick={handleStartQuiz}
            disabled={!canStart}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-semibold text-sm transition-all ${
              canStart
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90 hover:-translate-y-0.5 shadow-lg shadow-blue-500/20'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            Start Quiz
            {canStart && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SelectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-10 animate-pulse space-y-4">
          <div className="h-8 bg-white rounded-xl w-64 border border-slate-200" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-xl border border-slate-200" />
          ))}
        </div>
      </div>
    }>
      <SelectPageInner />
    </Suspense>
  )
}
