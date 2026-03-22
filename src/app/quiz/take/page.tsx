"use client";

import Navbar from "@/components/Navbar";
import DrawingCanvas from "@/components/DrawingCanvas";
import GraphCanvas from "@/components/GraphCanvas";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";

interface Question {
  id: string;
  examPage?: number;
  examFile?: string;
  year: number;
  questionNumber: string;
  type: "mc" | "short_answer" | "extended_response";
  marks: number;
  module: string;
  moduleContent: string;
  questionText: string;
  options?: Record<string, string>;
  correctAnswer?: string;
  markingCriteria: string;
  sampleAnswer: string;
  hasImage: boolean;
  imageDescription?: string;
  parts?: { label: string; marks: number }[];
  tableConfig?: {
    columns: string[];
    rows: string[];
    prefilled?: Record<string, string>;
    forPart?: string;
  };
  graphConfig?: {
    xAxis: { label: string; min: number; max: number; step: number; ticks?: number[] };
    yAxis: { label: string; min: number; max: number; step: number; inverted?: boolean };
    series: { name: string; color: string; symbol: "circle" | "cross" }[];
    showLineOfBestFit?: boolean;
    forPart?: string;
  };
}

interface Answer {
  questionId: string;
  answer: string;
  drawingData?: string;
}

const MODULE_COLORS: Record<string, string> = {
  "5": "bg-blue-500/20 text-blue-600 border-blue-500/30",
  "6": "bg-purple-500/20 text-purple-600 border-purple-500/30",
  "7": "bg-orange-500/20 text-orange-600 border-orange-500/30",
  "8": "bg-green-500/20 text-green-600 border-green-500/30",
};

function QuizTakeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDrawing, setShowDrawing] = useState(false);
  const [showDrawingPart, setShowDrawingPart] = useState<string | null>(null);
  const [startTime] = useState(Date.now());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function loadQuestions() {
      const isAuto = searchParams.get("auto") === "1";

      if (isAuto) {
        const modules = searchParams.get("modules") || "";
        const type = searchParams.get("type") || "all";
        const count = searchParams.get("count") || "20";
        const res = await fetch(
          `/api/quiz/auto?modules=${modules}&type=${type}&count=${count}`
        );
        const data = await res.json();
        setQuestions(data);
      } else {
        // Load selected question IDs from localStorage
        const selectedIds = JSON.parse(
          localStorage.getItem("selectedQuestionIds") || "[]"
        );
        if (selectedIds.length === 0) {
          router.push("/quiz/configure");
          return;
        }
        const res = await fetch(`/api/questions?ids=${selectedIds.join(",")}`);
        const data = await res.json();
        setQuestions(data);
      }
      setLoading(false);
    }
    loadQuestions();
  }, [searchParams, router]);

  const currentQuestion = questions[currentIndex];
  const totalMarks = questions.reduce((s, q) => s + q.marks, 0);
  const answeredCount = Object.keys(answers).length;
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const setAnswer = useCallback(
    (questionId: string, answer: string, drawingData?: string) => {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: { questionId, answer, drawingData: drawingData || prev[questionId]?.drawingData },
      }));
    },
    []
  );

  const handleSubmit = async () => {
    setSubmitting(true);
    // Save quiz data to localStorage for the results page
    const quizData = {
      questions,
      answers,
      startTime,
      endTime: Date.now(),
    };
    localStorage.setItem("quizData", JSON.stringify(quizData));
    router.push("/quiz/results");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-500">Loading your quiz...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <p className="text-slate-500 mb-4">No questions found matching your criteria.</p>
          <button onClick={() => router.push("/quiz/configure")} className="btn-primary">
            Try Different Options
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Progress bar */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-slate-500">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="text-slate-500">
              {answeredCount}/{questions.length} answered · {totalMarks} total marks
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill bg-gradient-to-r from-blue-500 to-purple-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Question navigation dots */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                i === currentIndex
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                  : answers[q.id]
                  ? "bg-green-500/20 text-green-600 border border-green-500/30"
                  : "bg-white text-slate-500 border border-slate-200 hover:border-slate-400"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Current question */}
        <div className="animate-fade-in" key={currentQuestion.id}>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
            {/* Question header */}
            <div className="flex items-center gap-3 mb-4">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${MODULE_COLORS[currentQuestion.module] || ""}`}>
                Module {currentQuestion.module}
              </span>
              <span className="text-xs text-slate-400">
                {currentQuestion.year} Q{currentQuestion.questionNumber}
              </span>
              <span className="text-xs font-medium text-slate-500 ml-auto">
                {currentQuestion.marks} mark{currentQuestion.marks !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Individual question image cropped from exam PDF */}
            {currentQuestion.examPage ? (
              <div>
                <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                  <img
                    src={`/exams/${currentQuestion.year}/questions/${currentQuestion.type === "mc" ? `${currentQuestion.year}-mc${currentQuestion.questionNumber}` : `${currentQuestion.year}-q${currentQuestion.questionNumber.match(/^\d+/)?.[0]}`}.jpg`}
                    alt={`${currentQuestion.year} HSC Biology Q${currentQuestion.questionNumber}`}
                    className="w-full block"
                    loading="lazy"
                  />
                </div>
                <p className="text-xs text-slate-400 text-center mt-1">
                  {currentQuestion.year} HSC Biology — Q{currentQuestion.questionNumber}
                </p>
              </div>
            ) : (
              <div className="text-slate-800 leading-relaxed whitespace-pre-wrap">
                {currentQuestion.questionText}
              </div>
            )}
          </div>

          {/* Answer area */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-slate-600 mb-4">Your Answer</h3>

            {currentQuestion.type === "mc" ? (
              /* Multiple Choice - simple A/B/C/D buttons */
              <div className="flex gap-3">
                {["A", "B", "C", "D"].map((key) => {
                  const selected = answers[currentQuestion.id]?.answer === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setAnswer(currentQuestion.id, key)}
                      className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center font-bold text-lg transition-all ${
                        selected
                          ? "border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                          : "border-slate-200 hover:border-blue-400 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {key}
                    </button>
                  );
                })}
              </div>
            ) : currentQuestion.graphConfig && !currentQuestion.graphConfig.forPart ? (
              /* Standalone graph answer (no parts) */
              <GraphCanvas
                config={currentQuestion.graphConfig}
                value={answers[currentQuestion.id]?.answer || ""}
                onChange={(json) => setAnswer(currentQuestion.id, json)}
              />
            ) : currentQuestion.tableConfig && !currentQuestion.tableConfig.forPart ? (
              /* Standalone table answer (no parts) */
              (() => {
                const tc = currentQuestion.tableConfig;
                let tableData: Record<string, string> = {};
                try {
                  const raw = answers[currentQuestion.id]?.answer;
                  if (raw) tableData = JSON.parse(raw);
                } catch { /* not JSON yet */ }
                return (
                  <div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr>
                            {tc.columns.map((col, ci) => (
                              <th key={ci} className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-medium text-slate-700">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tc.rows.map((row, ri) => (
                            <tr key={ri}>
                              {tc.columns.map((_, ci) => {
                                const key = `${ri},${ci}`;
                                const prefilled = tc.prefilled?.[key];
                                if (prefilled) {
                                  return (
                                    <td key={ci} className="border border-slate-300 bg-slate-50 px-3 py-2 text-slate-600 font-medium">
                                      {prefilled}
                                    </td>
                                  );
                                }
                                return (
                                  <td key={ci} className="border border-slate-300 p-0">
                                    <input
                                      type="text"
                                      value={tableData[key] || ""}
                                      onChange={(e) => {
                                        const updated = { ...tableData, [key]: e.target.value };
                                        setAnswer(currentQuestion.id, JSON.stringify(updated));
                                      }}
                                      className="w-full px-3 py-2 text-sm bg-white focus:bg-blue-50 focus:outline-none"
                                      placeholder="..."
                                    />
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()
            ) : currentQuestion.parts && currentQuestion.parts.length > 1 ? (
              /* Multi-part written response */
              <div className="space-y-4">
                {currentQuestion.parts.map((part, idx) => {
                  let partAnswers: Record<string, string> = {};
                  try {
                    const raw = answers[currentQuestion.id]?.answer;
                    if (raw) partAnswers = JSON.parse(raw);
                  } catch { /* not JSON yet */ }

                  const tc = currentQuestion.tableConfig;
                  const isTablePart = tc && tc.forPart === part.label;
                  const gc = currentQuestion.graphConfig;
                  const isGraphPart = gc && gc.forPart === part.label;

                  return (
                    <div key={part.label}>
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Part {part.label}
                        {part.marks > 0 && (
                          <span className="text-slate-400 font-normal ml-2">{part.marks} mark{part.marks !== 1 ? "s" : ""}</span>
                        )}
                      </label>
                      {isGraphPart ? (
                        <GraphCanvas
                          config={gc}
                          value={partAnswers[part.label] || ""}
                          onChange={(json) => {
                            const updated = { ...partAnswers, [part.label]: json };
                            setAnswer(currentQuestion.id, JSON.stringify(updated));
                          }}
                        />
                      ) : isTablePart ? (
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-sm">
                            <thead>
                              <tr>
                                {tc.columns.map((col, ci) => (
                                  <th key={ci} className="border border-slate-300 bg-slate-50 px-3 py-2 text-left font-medium text-slate-700">
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {tc.rows.map((_, ri) => (
                                <tr key={ri}>
                                  {tc.columns.map((__, ci) => {
                                    const key = `${ri},${ci}`;
                                    const prefilled = tc.prefilled?.[key];
                                    if (prefilled) {
                                      return (
                                        <td key={ci} className="border border-slate-300 bg-slate-50 px-3 py-2 text-slate-600 font-medium">
                                          {prefilled}
                                        </td>
                                      );
                                    }
                                    // Store table data under the part label in partAnswers
                                    let tableData: Record<string, string> = {};
                                    try {
                                      if (partAnswers[part.label]) tableData = JSON.parse(partAnswers[part.label]);
                                    } catch { /* */ }
                                    return (
                                      <td key={ci} className="border border-slate-300 p-0">
                                        <input
                                          type="text"
                                          value={tableData[key] || ""}
                                          onChange={(e) => {
                                            const updatedTable = { ...tableData, [key]: e.target.value };
                                            const updated = { ...partAnswers, [part.label]: JSON.stringify(updatedTable) };
                                            setAnswer(currentQuestion.id, JSON.stringify(updated));
                                          }}
                                          className="w-full px-3 py-2 text-sm bg-white focus:bg-blue-50 focus:outline-none"
                                          placeholder="..."
                                        />
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <textarea
                            ref={idx === 0 ? textareaRef : undefined}
                            value={partAnswers[part.label] || ""}
                            onChange={(e) => {
                              const updated = { ...partAnswers, [part.label]: e.target.value };
                              setAnswer(currentQuestion.id, JSON.stringify(updated));
                            }}
                            placeholder={`Write your answer for part ${part.label}...`}
                            rows={part.marks <= 2 ? 3 : part.marks <= 4 ? 5 : 8}
                            className="input-field resize-y text-sm leading-relaxed"
                          />
                          <button
                            onClick={() => setShowDrawingPart(showDrawingPart === part.label ? null : part.label)}
                            className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            {showDrawingPart === part.label ? "Hide Drawing" : "Add Drawing"}
                          </button>
                          {showDrawingPart === part.label && (
                            <DrawingCanvas
                              onChange={(data) => {
                                setAnswers((prev) => ({
                                  ...prev,
                                  [currentQuestion.id]: {
                                    ...prev[currentQuestion.id],
                                    questionId: currentQuestion.id,
                                    answer: prev[currentQuestion.id]?.answer || "",
                                    drawingData: data,
                                  },
                                }));
                              }}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Single written response */
              <div className="space-y-4">
                <textarea
                  ref={textareaRef}
                  value={answers[currentQuestion.id]?.answer || ""}
                  onChange={(e) => setAnswer(currentQuestion.id, e.target.value)}
                  placeholder={
                    currentQuestion.marks <= 3
                      ? "Write your short answer here..."
                      : "Write your extended response here. Take your time to plan and structure your answer."
                  }
                  rows={currentQuestion.marks <= 3 ? 6 : 12}
                  className="input-field resize-y text-sm leading-relaxed"
                />

                {/* Drawing toggle */}
                <div>
                  <button
                    onClick={() => setShowDrawing(!showDrawing)}
                    className="btn-secondary text-sm flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    {showDrawing ? "Hide Drawing Canvas" : "Add a Drawing / Diagram"}
                  </button>

                  {showDrawing && (
                    <div className="mt-3">
                      <DrawingCanvas
                        onChange={(data) => {
                          setAnswers((prev) => ({
                            ...prev,
                            [currentQuestion.id]: {
                              ...prev[currentQuestion.id],
                              questionId: currentQuestion.id,
                              answer: prev[currentQuestion.id]?.answer || "",
                              drawingData: data,
                            },
                          }));
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Writing guide */}
                <div className="text-xs text-slate-400 flex items-center gap-4">
                  <span>
                    {(answers[currentQuestion.id]?.answer || "").split(/\s+/).filter(Boolean).length} words
                  </span>
                  <span>·</span>
                  <span>
                    Suggested length: {currentQuestion.marks <= 2 ? "2-4 sentences" : currentQuestion.marks <= 5 ? "1-2 paragraphs" : "3+ paragraphs"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="btn-secondary disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>

          <div className="flex gap-3">
            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex(currentIndex + 1)}
                className="btn-primary"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary bg-gradient-to-r from-green-500 to-emerald-500 disabled:opacity-50"
              >
                {submitting ? "Submitting..." : `Submit Quiz (${answeredCount}/${questions.length} answered)`}
              </button>
            )}
          </div>
        </div>

        {/* Quick submit button when not on last question */}
        {currentIndex < questions.length - 1 && answeredCount === questions.length && (
          <div className="mt-4 text-center">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn-primary bg-gradient-to-r from-green-500 to-emerald-500 text-sm"
            >
              All questions answered — Submit Quiz
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function QuizTakePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50">
          <Navbar />
          <div className="max-w-4xl mx-auto px-4 py-20 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
          </div>
        </div>
      }
    >
      <QuizTakeInner />
    </Suspense>
  );
}
