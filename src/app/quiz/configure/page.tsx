'use client'

import Navbar from '@/components/Navbar'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuizConfig {
  modules: string[]
  questionType: string
  quizLength: string
  lengthValue: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MODULES = [
  { id: 'Module 5', label: 'Module 5', topic: 'Heredity', color: 'blue', border: 'border-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-600', dot: 'bg-blue-500' },
  { id: 'Module 6', label: 'Module 6', topic: 'Genetic Change', color: 'purple', border: 'border-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-600', dot: 'bg-purple-500' },
  { id: 'Module 7', label: 'Module 7', topic: 'Infectious Disease', color: 'orange', border: 'border-orange-500', bg: 'bg-orange-500/10', text: 'text-orange-600', dot: 'bg-orange-500' },
  { id: 'Module 8', label: 'Module 8', topic: 'Non-infectious Disease', color: 'green', border: 'border-green-500', bg: 'bg-green-500/10', text: 'text-green-600', dot: 'bg-green-500' },
]

const QUESTION_TYPES = [
  { id: 'mc', label: 'Multiple Choice Only', description: '1 mark per question', icon: '🔵' },
  { id: 'short', label: 'Short Answer', description: '2–5 marks', icon: '✏️' },
  { id: 'extended', label: 'Extended Response', description: '6+ marks', icon: '📝' },
  { id: 'mixed_hsc', label: 'Mixed (HSC Structure)', description: '20 MC + short answer + extended', icon: '📄' },
  { id: 'all', label: 'All Types', description: 'Mix of everything', icon: '🎲' },
]

const QUIZ_LENGTHS = [
  { id: 'quick', label: 'Quick', questions: 10, time: '~15 min', icon: '⚡', value: 10 },
  { id: 'short', label: 'Short', questions: 20, time: '~30 min', icon: '🏃', value: 20 },
  { id: 'medium', label: 'Medium', questions: 30, time: '~45 min', icon: '🎯', value: 30 },
  { id: 'long', label: 'Full HSC', questions: null, time: '~3 hours', icon: '🏆', value: 0 },
]

// ─── Component ────────────────────────────────────────────────────────────────

function ConfigurePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [config, setConfig] = useState<QuizConfig>({
    modules: [],
    questionType: 'all',
    quizLength: 'short',
    lengthValue: 20,
  })

  // Pre-select module from query param (from dashboard quick practice links)
  useEffect(() => {
    const preModule = searchParams.get('module')
    if (preModule) {
      setConfig((prev) => ({ ...prev, modules: [preModule] }))
    }
  }, [searchParams])

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function toggleModule(id: string) {
    setConfig((prev) => ({
      ...prev,
      modules: prev.modules.includes(id)
        ? prev.modules.filter((m) => m !== id)
        : [...prev.modules, id],
    }))
  }

  function selectAllModules() {
    setConfig((prev) => ({
      ...prev,
      modules: prev.modules.length === MODULES.length ? [] : MODULES.map((m) => m.id),
    }))
  }

  function selectLength(id: string, value: number) {
    setConfig((prev) => ({ ...prev, quizLength: id, lengthValue: value }))
  }

  function buildParams() {
    const params = new URLSearchParams()
    if (config.modules.length) params.set('modules', config.modules.join(','))
    params.set('type', config.questionType)
    params.set('length', config.quizLength)
    if (config.lengthValue) params.set('count', String(config.lengthValue))
    return params.toString()
  }

  function handleChooseQuestions() {
    if (!config.modules.length) return
    localStorage.setItem('quizConfig', JSON.stringify(config))
    router.push(`/quiz/select?${buildParams()}`)
  }

  async function handleAutoQuiz() {
    if (!config.modules.length) return
    localStorage.setItem('quizConfig', JSON.stringify(config))
    router.push(`/quiz/take?${buildParams()}&auto=1`)
  }

  const allSelected = config.modules.length === MODULES.length
  const canProceed = config.modules.length > 0

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Configure Your Quiz</h1>
          <p className="text-slate-500 mt-1">Choose what to practise, then pick your quiz style.</p>
        </div>

        {/* ── Section 1: Module Selection ─────────────────────────────────── */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Select Modules</h2>
              <p className="text-slate-500 text-sm mt-0.5">Choose at least one module to practise</p>
            </div>
            <button
              onClick={selectAllModules}
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                allSelected
                  ? 'bg-blue-500/20 text-blue-600 border border-blue-500/30'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-300'
              }`}
            >
              {allSelected ? '✓ All Selected' : 'Select All'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MODULES.map((mod) => {
              const selected = config.modules.includes(mod.id)
              return (
                <button
                  key={mod.id}
                  onClick={() => toggleModule(mod.id)}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                    selected
                      ? `${mod.border} ${mod.bg}`
                      : 'border-slate-200 hover:border-slate-400 bg-slate-50 hover:bg-slate-50'
                  }`}
                >
                  {/* Checkbox */}
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all ${
                      selected ? `${mod.dot} shadow-md` : 'border-2 border-slate-300'
                    }`}
                  >
                    {selected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  {/* Color dot */}
                  <div className={`w-3 h-3 rounded-full shrink-0 ${mod.dot}`} />

                  <div>
                    <div className={`font-semibold text-sm ${selected ? mod.text : 'text-slate-600'}`}>
                      {mod.label}
                    </div>
                    <div className="text-slate-500 text-xs mt-0.5">{mod.topic}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* ── Section 2: Question Types ────────────────────────────────────── */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Question Type</h2>
          <p className="text-slate-500 text-sm mb-5">Filter by mark value and format</p>

          <div className="space-y-2">
            {QUESTION_TYPES.map((type) => {
              const selected = config.questionType === type.id
              return (
                <label
                  key={type.id}
                  className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
                    selected
                      ? 'border-blue-500/50 bg-blue-500/10'
                      : 'border-slate-200 hover:border-slate-400 bg-slate-50 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="questionType"
                    value={type.id}
                    checked={selected}
                    onChange={() => setConfig((prev) => ({ ...prev, questionType: type.id }))}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      selected ? 'border-blue-400' : 'border-slate-300'
                    }`}
                  >
                    {selected && <div className="w-2 h-2 rounded-full bg-blue-400" />}
                  </div>
                  <span className="text-lg shrink-0">{type.icon}</span>
                  <div>
                    <div className={`font-medium text-sm ${selected ? 'text-blue-700' : 'text-slate-800'}`}>
                      {type.label}
                    </div>
                    <div className="text-slate-500 text-xs mt-0.5">{type.description}</div>
                  </div>
                </label>
              )
            })}
          </div>
        </section>

        {/* ── Section 3: Quiz Length ───────────────────────────────────────── */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Quiz Length</h2>
          <p className="text-slate-500 text-sm mb-5">How many questions do you want to attempt?</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {QUIZ_LENGTHS.map((length) => {
              const selected = config.quizLength === length.id
              return (
                <button
                  key={length.id}
                  onClick={() => selectLength(length.id, length.value)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:-translate-y-0.5 ${
                    selected
                      ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10'
                      : 'border-slate-200 hover:border-slate-400 bg-slate-50'
                  }`}
                >
                  <span className="text-3xl">{length.icon}</span>
                  <div>
                    <div className={`font-semibold text-sm ${selected ? 'text-purple-700' : 'text-slate-800'}`}>
                      {length.label}
                    </div>
                    <div className="text-slate-500 text-xs mt-0.5">
                      {length.questions ? `${length.questions} questions` : 'Full paper'}
                    </div>
                    <div className="text-slate-400 text-xs">{length.time}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* ── Section 4: Mode Selection ────────────────────────────────────── */}
        <section>
          {!canProceed && (
            <div className="text-center text-slate-500 text-sm mb-4 bg-white border border-slate-200 rounded-xl px-4 py-3">
              ← Select at least one module above to continue
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Choose Questions */}
            <button
              onClick={handleChooseQuestions}
              disabled={!canProceed}
              className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 text-center transition-all ${
                canProceed
                  ? 'border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/20 hover:-translate-y-1 shadow-lg shadow-blue-500/10 cursor-pointer'
                  : 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="text-4xl">🗂️</div>
              <div>
                <div className="font-bold text-lg text-slate-900">Choose Questions</div>
                <div className="text-slate-500 text-sm mt-1">
                  Browse and hand-pick questions from the pool
                </div>
              </div>
              <div className="text-blue-600 text-sm font-medium">Browse pool →</div>
            </button>

            {/* Auto Quiz */}
            <button
              onClick={handleAutoQuiz}
              disabled={!canProceed}
              className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 text-center transition-all ${
                canProceed
                  ? 'border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/20 hover:-translate-y-1 shadow-lg shadow-purple-500/10 cursor-pointer'
                  : 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="text-4xl">🎲</div>
              <div>
                <div className="font-bold text-lg text-slate-900">Auto Quiz</div>
                <div className="text-slate-500 text-sm mt-1">
                  Generate a random quiz from your selected options
                </div>
              </div>
              <div className="text-purple-600 text-sm font-medium">Start immediately →</div>
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

export default function ConfigurePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-white rounded-xl w-64" />
            <div className="h-48 bg-white rounded-2xl" />
            <div className="h-48 bg-white rounded-2xl" />
          </div>
        </div>
      </div>
    }>
      <ConfigurePageInner />
    </Suspense>
  )
}
