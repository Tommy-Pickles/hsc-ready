"use client";

import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

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

interface Highlight {
  text: string;
  criterionMet: string;
  marksForThis: number;
}

interface Missed {
  criterion: string;
  suggestion: string;
}

interface MarkingResult {
  questionId: string;
  marksAwarded: number;
  marksPossible: number;
  feedback: {
    highlights: Highlight[];
    missed: Missed[];
    overallComment: string;
  };
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const MODULE_NAMES: Record<string, string> = {
  "5": "Heredity",
  "6": "Genetic Change",
  "7": "Infectious Disease",
  "8": "Non-infectious Disease",
};

const MODULE_COLORS: Record<string, string> = {
  "5": "bg-blue-500",
  "6": "bg-purple-500",
  "7": "bg-orange-500",
  "8": "bg-green-500",
};

export default function ResultsPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [results, setResults] = useState<Record<string, MarkingResult>>({});
  const [markingProgress, setMarkingProgress] = useState(0);
  const [markingDone, setMarkingDone] = useState(false);
  const [activeTab, setActiveTab] = useState<"review" | "chat">("review");
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const quizData = localStorage.getItem("quizData");
    if (!quizData) {
      router.push("/quiz/configure");
      return;
    }

    const data = JSON.parse(quizData);
    setQuestions(data.questions);
    setAnswers(data.answers);

    // Start marking
    markAllQuestions(data.questions, data.answers);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function markAllQuestions(qs: Question[], ans: Record<string, Answer>) {
    const totalToMark = qs.length;
    let marked = 0;
    const allResults: Record<string, MarkingResult> = {};

    for (const q of qs) {
      const answer = ans[q.id];
      if (!answer || !answer.answer) {
        const mr: MarkingResult = {
          questionId: q.id,
          marksAwarded: 0,
          marksPossible: q.marks,
          feedback: {
            highlights: [],
            missed: [{ criterion: "No answer provided", suggestion: "Make sure to attempt every question, even a partial answer can earn marks." }],
            overallComment: "No answer was provided for this question.",
          },
        };
        allResults[q.id] = mr;
        setResults((prev) => ({ ...prev, [q.id]: mr }));
        marked++;
        setMarkingProgress(Math.round((marked / totalToMark) * 100));
        continue;
      }

      try {
        const criteriaArray = q.markingCriteria.split("\n").filter(Boolean);
        const res = await fetch("/api/quiz/mark", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId: q.id,
            questionText: q.questionText,
            studentAnswer: answer.answer,
            markingCriteria: criteriaArray,
            sampleAnswer: q.sampleAnswer,
            marks: q.marks,
            questionType: q.type === "mc" ? "multiple_choice" : q.type === "extended_response" ? "extended_response" : "short_response",
            correctAnswer: q.correctAnswer,
            tableConfig: q.tableConfig,
            graphConfig: q.graphConfig,
            parts: q.parts,
          }),
        });

        const result = await res.json();
        const mr: MarkingResult = {
          questionId: q.id,
          marksAwarded: result.marksAwarded ?? 0,
          marksPossible: q.marks,
          feedback: result.feedback ?? {
            highlights: [],
            missed: [],
            overallComment: result.error || "Error marking this question.",
          },
        };
        allResults[q.id] = mr;
        setResults((prev) => ({ ...prev, [q.id]: mr }));
      } catch {
        const mr: MarkingResult = {
          questionId: q.id,
          marksAwarded: 0,
          marksPossible: q.marks,
          feedback: {
            highlights: [],
            missed: [],
            overallComment: "Error occurred while marking. Please check your API key configuration.",
          },
        };
        allResults[q.id] = mr;
        setResults((prev) => ({ ...prev, [q.id]: mr }));
      }

      marked++;
      setMarkingProgress(Math.round((marked / totalToMark) * 100));
    }

    setMarkingDone(true);

    // Save result to server
    try {
      const totalMarks = qs.reduce((s, q) => s + q.marks, 0);
      const totalAwarded = Object.values(allResults).reduce((s, r) => s + r.marksAwarded, 0);
      let quizConfig;
      try {
        quizConfig = JSON.parse(localStorage.getItem("quizConfig") || "{}");
      } catch {
        quizConfig = {};
      }
      await fetch("/api/quiz/save-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizConfig,
          totalMarks,
          marksAchieved: totalAwarded,
          questions: Object.values(allResults).map((r) => ({
            questionId: r.questionId,
            studentAnswer: ans[r.questionId]?.answer || "",
            marksAwarded: r.marksAwarded,
            marksPossible: r.marksPossible,
            feedback: r.feedback,
          })),
        }),
      });
    } catch {
      // Silent fail on save - results are still shown
    }
  }

  // Compute stats
  const totalMarks = questions.reduce((s, q) => s + q.marks, 0);
  const totalAwarded = Object.values(results).reduce((s, r) => s + r.marksAwarded, 0);
  const percentage = totalMarks > 0 ? Math.round((totalAwarded / totalMarks) * 100) : 0;

  // Module breakdown
  const moduleStats: Record<string, { awarded: number; possible: number; count: number }> = {};
  questions.forEach((q) => {
    if (!moduleStats[q.module]) moduleStats[q.module] = { awarded: 0, possible: 0, count: 0 };
    moduleStats[q.module].possible += q.marks;
    moduleStats[q.module].count++;
    if (results[q.id]) moduleStats[q.module].awarded += results[q.id].marksAwarded;
  });

  // Type breakdown
  const typeStats: Record<string, { awarded: number; possible: number }> = {};
  questions.forEach((q) => {
    const typeName = q.type === "mc" ? "Multiple Choice" : q.type === "short_answer" ? "Short Answer" : "Extended Response";
    if (!typeStats[typeName]) typeStats[typeName] = { awarded: 0, possible: 0 };
    typeStats[typeName].possible += q.marks;
    if (results[q.id]) typeStats[typeName].awarded += results[q.id].marksAwarded;
  });

  // Format answer for display (handles JSON table/multi-part answers)
  function formatAnswerForDisplay(answer: string, question: Question): React.ReactNode {
    // Multi-part answer
    if (question.parts && question.parts.length > 1) {
      try {
        const partAnswers = JSON.parse(answer) as Record<string, string>;
        return (
          <div className="space-y-3">
            {question.parts.map((part) => {
              const partAns = partAnswers[part.label] || "(no answer)";
              const tc = question.tableConfig;
              const isTablePart = tc && tc.forPart === part.label;
              const gc = question.graphConfig;
              const isGraphPart = gc && gc.forPart === part.label;
              return (
                <div key={part.label}>
                  <div className="text-xs font-semibold text-slate-500 mb-1">
                    Part {part.label} ({part.marks} mark{part.marks !== 1 ? "s" : ""})
                  </div>
                  {isGraphPart ? renderGraphSummary(partAns, gc) : isTablePart ? renderTableAnswer(partAns, tc) : <span>{partAns}</span>}
                </div>
              );
            })}
          </div>
        );
      } catch {
        return <span>{answer}</span>;
      }
    }

    // Standalone graph answer
    if (question.graphConfig && !question.graphConfig.forPart) {
      return renderGraphSummary(answer, question.graphConfig);
    }

    // Standalone table answer
    if (question.tableConfig && !question.tableConfig.forPart) {
      return renderTableAnswer(answer, question.tableConfig);
    }

    return null; // Fall through to default highlight rendering
  }

  function renderTableAnswer(answer: string, tc: NonNullable<Question["tableConfig"]>): React.ReactNode {
    try {
      const data = JSON.parse(answer) as Record<string, string>;
      return (
        <table className="w-full border-collapse text-sm mt-1">
          <thead>
            <tr>
              {tc.columns.map((col, ci) => (
                <th key={ci} className="border border-slate-300 bg-slate-100 px-3 py-1.5 text-left font-medium text-slate-700 text-xs">
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
                  const val = tc.prefilled?.[key] || data[key] || "";
                  return (
                    <td key={ci} className={`border border-slate-300 px-3 py-1.5 text-xs ${tc.prefilled?.[key] ? "bg-slate-50 font-medium" : ""}`}>
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      );
    } catch {
      return <span>{answer}</span>;
    }
  }

  function renderGraphSummary(answer: string, gc: NonNullable<Question["graphConfig"]>): React.ReactNode {
    try {
      const data = JSON.parse(answer) as {
        points: { series: number; x: number; y: number }[];
        lineOfBestFit?: { x1: number; y1: number; x2: number; y2: number };
      };

      // Group by series
      const grouped: Record<number, { x: number; y: number }[]> = {};
      for (const pt of data.points) {
        if (!grouped[pt.series]) grouped[pt.series] = [];
        grouped[pt.series].push(pt);
      }

      return (
        <div className="text-xs space-y-1 mt-1">
          {Object.entries(grouped).map(([si, pts]) => {
            const seriesName = gc.series[Number(si)]?.name || `Series ${Number(si) + 1}`;
            const sorted = pts.sort((a, b) => a.x - b.x);
            return (
              <div key={si}>
                <span className="font-medium">{seriesName}:</span>{" "}
                {sorted.map((p, i) => (
                  <span key={i}>
                    ({p.x}, {p.y}){i < sorted.length - 1 ? ", " : ""}
                  </span>
                ))}
              </div>
            );
          })}
          {data.lineOfBestFit && (
            <div>
              <span className="font-medium">Line of best fit:</span>{" "}
              ({data.lineOfBestFit.x1}, {data.lineOfBestFit.y1}) to ({data.lineOfBestFit.x2}, {data.lineOfBestFit.y2})
            </div>
          )}
          {data.points.length === 0 && <span className="text-slate-400">(no points plotted)</span>}
        </div>
      );
    } catch {
      return <span>{answer}</span>;
    }
  }

  // Highlight student answer text
  function highlightAnswer(answer: string, highlights: Highlight[]): React.ReactNode {
    if (!highlights.length) return <span>{answer}</span>;

    let result = answer;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Sort highlights by position in text
    const sortedHighlights = highlights
      .map((h) => ({ ...h, index: answer.toLowerCase().indexOf(h.text.toLowerCase()) }))
      .filter((h) => h.index >= 0)
      .sort((a, b) => a.index - b.index);

    sortedHighlights.forEach((h, i) => {
      if (h.index > lastIndex) {
        parts.push(<span key={`t-${i}`}>{result.slice(lastIndex, h.index)}</span>);
      }
      parts.push(
        <span key={`h-${i}`} className="highlight-mark" title={`${h.criterionMet} (+${h.marksForThis} mark${h.marksForThis !== 1 ? "s" : ""})`}>
          {result.slice(h.index, h.index + h.text.length)}
        </span>
      );
      lastIndex = h.index + h.text.length;
    });

    if (lastIndex < result.length) {
      parts.push(<span key="end">{result.slice(lastIndex)}</span>);
    }

    return parts.length > 0 ? <>{parts}</> : <span>{answer}</span>;
  }

  // Chat handler
  async function sendChatMessage() {
    if (!chatInput.trim() || chatLoading) return;

    const userMsg: ChatMessage = { role: "user", content: chatInput };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/quiz/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: chatInput,
          quizContext: {
            questions: questions.map((q) => ({
              id: q.id,
              questionText: q.questionText,
              marks: q.marks,
              module: q.module,
              moduleContent: q.moduleContent,
            })),
            results: Object.values(results).map((r) => ({
              questionId: r.questionId,
              marksAwarded: r.marksAwarded,
              marksPossible: r.marksPossible,
              overallComment: r.feedback.overallComment,
            })),
            answers: Object.fromEntries(
              Object.entries(answers).map(([k, v]) => [k, v.answer])
            ),
            totalScore: `${totalAwarded}/${totalMarks} (${percentage}%)`,
          },
          chatHistory: chatMessages,
        }),
      });

      const data = await res.json();
      setChatMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process your message. Please check your API key is configured." },
      ]);
    }

    setChatLoading(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  // Grade label
  function getGrade(pct: number): { label: string; color: string } {
    if (pct >= 90) return { label: "Band 6", color: "text-green-600" };
    if (pct >= 80) return { label: "Band 5", color: "text-blue-600" };
    if (pct >= 70) return { label: "Band 4", color: "text-purple-600" };
    if (pct >= 60) return { label: "Band 3", color: "text-yellow-400" };
    if (pct >= 50) return { label: "Band 2", color: "text-orange-600" };
    return { label: "Band 1", color: "text-red-600" };
  }

  const grade = getGrade(percentage);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      {/* Marking progress overlay */}
      {!markingDone && (
        <div className="fixed inset-0 bg-white/90 z-50 flex items-center justify-center">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full mx-4 text-center">
            <div className="animate-spin w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Marking Your Answers</h2>
            <p className="text-slate-500 text-sm mb-4">
              AI is reviewing your responses against the official marking criteria...
            </p>
            <div className="progress-bar mb-2">
              <div
                className="progress-fill bg-gradient-to-r from-blue-500 to-purple-500"
                style={{ width: `${markingProgress}%` }}
              />
            </div>
            <p className="text-sm text-slate-400">{markingProgress}% complete</p>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Score header */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Score circle */}
            <div className="relative w-28 h-28 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke={percentage >= 80 ? "#22c55e" : percentage >= 50 ? "#3b82f6" : "#f97316"}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 52}`}
                  strokeDashoffset={`${2 * Math.PI * 52 * (1 - percentage / 100)}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-800">{percentage}%</span>
                <span className={`text-xs font-semibold ${grade.color}`}>{grade.label}</span>
              </div>
            </div>

            <div className="text-center sm:text-left flex-1">
              <h1 className="text-xl font-bold text-slate-800 mb-1">Quiz Complete</h1>
              <p className="text-slate-500 text-sm mb-3">
                You scored <span className="text-slate-800 font-semibold">{totalAwarded}</span> out of{" "}
                <span className="text-slate-800 font-semibold">{totalMarks}</span> marks
              </p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(moduleStats).map(([mod, stats]) => (
                  <div key={mod} className="flex items-center gap-2 text-sm">
                    <div className={`w-2.5 h-2.5 rounded-full ${MODULE_COLORS[mod]}`} />
                    <span className="text-slate-500">
                      M{mod}: {stats.awarded}/{stats.possible}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => router.push("/quiz/configure")}
                className="btn-primary text-sm"
              >
                New Quiz
              </button>
              <button
                onClick={() => router.push("/dashboard")}
                className="btn-secondary text-sm"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 mb-6">
          {(["review", "chat"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-slate-100 text-white"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab === "review" ? "Review" : "Ask Questions"}
            </button>
          ))}
        </div>

        {/* Review tab — question review first, then summary */}
        {activeTab === "review" && (
          <div className="space-y-6 animate-fade-in">
            {/* Question review */}
            <div className="space-y-4">
              {questions.map((q, i) => {
                const result = results[q.id];
                const answer = answers[q.id];
                const isExpanded = expandedQuestion === q.id;
                const scorePct = result ? Math.round((result.marksAwarded / result.marksPossible) * 100) : 0;

                return (
                  <div key={q.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    {/* Question header (clickable) */}
                    <button
                      onClick={() => setExpandedQuestion(isExpanded ? null : q.id)}
                      className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-750 transition-colors"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-semibold text-sm ${
                          scorePct === 100
                            ? "bg-green-500/20 text-green-600"
                            : scorePct > 0
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-600"
                        }`}
                      >
                        {result ? `${result.marksAwarded}/${result.marksPossible}` : "..."}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-slate-800">
                            Q{i + 1}. {q.year} Q{q.questionNumber}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${
                            q.module === "5" ? "bg-blue-500/10 text-blue-600 border-blue-500/30" :
                            q.module === "6" ? "bg-purple-500/10 text-purple-600 border-purple-500/30" :
                            q.module === "7" ? "bg-orange-500/10 text-orange-600 border-orange-500/30" :
                            "bg-green-500/10 text-green-600 border-green-500/30"
                          }`}>
                            M{q.module}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{q.questionText.slice(0, 80)}...</p>
                      </div>
                      <svg
                        className={`w-5 h-5 text-slate-500 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Expanded content */}
                    {isExpanded && result && (
                      <div className="border-t border-slate-200 p-6 space-y-4">
                        {/* Question */}
                        <div>
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Question</h4>
                          {q.examPage ? (
                            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                              <img
                                src={`/exams/${q.year}/questions/${q.type === "mc" ? `${q.year}-mc${q.questionNumber}` : `${q.year}-q${q.questionNumber.match(/^\d+/)?.[0]}`}.jpg`}
                                alt={`${q.year} HSC Biology Q${q.questionNumber}`}
                                className="w-full block"
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <p className="text-sm text-slate-600 whitespace-pre-wrap">{q.questionText}</p>
                          )}
                        </div>

                        {/* Student answer with highlights */}
                        <div>
                          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Your Answer</h4>
                          {answer?.answer ? (
                            <div className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 rounded-xl p-4">
                              {q.type === "mc" ? (
                                <span>
                                  {answer.answer}
                                  {answer.answer === q.correctAnswer ? (
                                    <span className="text-green-600 ml-2">✓ Correct</span>
                                  ) : (
                                    <span className="text-red-600 ml-2">✗ Correct answer: {q.correctAnswer}</span>
                                  )}
                                </span>
                              ) : (
                                formatAnswerForDisplay(answer.answer, q) || highlightAnswer(answer.answer, result.feedback.highlights)
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400 italic">No answer provided</p>
                          )}
                        </div>

                        {/* Marks earned */}
                        {result.feedback.highlights.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2">
                              Marks Earned
                            </h4>
                            <div className="space-y-2">
                              {result.feedback.highlights.map((h, j) => (
                                <div key={j} className="flex items-start gap-3 text-sm bg-green-500/5 border border-green-500/20 rounded-xl p-3">
                                  <span className="text-green-600 font-bold shrink-0">+{h.marksForThis}</span>
                                  <div>
                                    <div className="text-green-700 text-xs mb-0.5">{h.criterionMet}</div>
                                    <div className="text-slate-500 text-xs italic">&quot;{h.text}&quot;</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Missed criteria */}
                        {result.feedback.missed.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">
                              How to Improve
                            </h4>
                            <div className="space-y-2">
                              {result.feedback.missed.map((m, j) => (
                                <div key={j} className="text-sm bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                                  <div className="text-red-700 text-xs font-medium mb-1">{m.criterion}</div>
                                  <div className="text-slate-500 text-xs">{m.suggestion}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Overall comment */}
                        <div className="bg-slate-50 rounded-xl p-4">
                          <p className="text-sm text-slate-600">{result.feedback.overallComment}</p>
                        </div>

                        {/* Sample answer */}
                        <details className="text-sm">
                          <summary className="text-slate-500 cursor-pointer hover:text-slate-600 transition-colors">
                            View sample answer
                          </summary>
                          <div className="mt-2 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl text-slate-600 whitespace-pre-wrap">
                            {q.sampleAnswer}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary sections */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">Performance by Module</h2>
              <div className="space-y-4">
                {Object.entries(moduleStats).map(([mod, stats]) => {
                  const pct = stats.possible > 0 ? Math.round((stats.awarded / stats.possible) * 100) : 0;
                  return (
                    <div key={mod}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="text-slate-600">
                          Module {mod}: {MODULE_NAMES[mod]}
                        </span>
                        <span className="text-slate-500">
                          {stats.awarded}/{stats.possible} ({pct}%)
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div className={`progress-fill ${MODULE_COLORS[mod]}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">Performance by Question Type</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Object.entries(typeStats).map(([type, stats]) => {
                  const pct = stats.possible > 0 ? Math.round((stats.awarded / stats.possible) * 100) : 0;
                  return (
                    <div key={type} className="bg-slate-50 rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold mb-1">{pct}%</div>
                      <div className="text-sm text-slate-500">{type}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {stats.awarded}/{stats.possible} marks
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">Areas to Focus On</h2>
              <div className="space-y-3">
                {Object.entries(moduleStats)
                  .sort((a, b) => {
                    const pctA = a[1].possible > 0 ? a[1].awarded / a[1].possible : 1;
                    const pctB = b[1].possible > 0 ? b[1].awarded / b[1].possible : 1;
                    return pctA - pctB;
                  })
                  .map(([mod, stats]) => {
                    const pct = stats.possible > 0 ? Math.round((stats.awarded / stats.possible) * 100) : 100;
                    if (pct >= 80) return null;
                    return (
                      <div key={mod} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                        <div className={`w-2 h-2 rounded-full mt-2 ${MODULE_COLORS[mod]}`} />
                        <div>
                          <div className="text-sm font-medium">
                            Module {mod}: {MODULE_NAMES[mod]} ({pct}%)
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Review the marking criteria for questions you missed in this module
                          </div>
                        </div>
                      </div>
                    );
                  })}
                {Object.entries(moduleStats).every(
                  ([, stats]) => stats.possible === 0 || (stats.awarded / stats.possible) >= 0.8
                ) && (
                  <p className="text-green-600 text-sm">
                    Great work! You performed well across all modules.
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => router.push("/quiz/configure")} className="btn-primary flex-1">
                Start New Quiz
              </button>
              <button onClick={() => router.push("/dashboard")} className="btn-secondary flex-1">
                Back to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Chat tab */}
        {activeTab === "chat" && (
          <div className="animate-fade-in">
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              {/* Chat messages */}
              <div className="h-[500px] overflow-y-auto p-6 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="text-center py-16">
                    <div className="text-4xl mb-4">💬</div>
                    <h3 className="text-lg font-semibold mb-2">Ask About Your Results</h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">
                      Ask me anything about your quiz results, the questions, or how to improve your answers.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center mt-4">
                      {[
                        "What should I study most?",
                        "Explain the answer to question 1",
                        "How can I improve my extended responses?",
                        "What topics did I do well on?",
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => { setChatInput(suggestion); }}
                          className="text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-300 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                        msg.role === "user"
                          ? "bg-blue-500 text-white"
                          : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                        <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat input */}
              <div className="border-t border-slate-200 p-4">
                <form
                  onSubmit={(e) => { e.preventDefault(); sendChatMessage(); }}
                  className="flex gap-3"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about your results..."
                    className="input-field flex-1"
                    disabled={chatLoading}
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || chatLoading}
                    className="btn-primary disabled:opacity-50 shrink-0"
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
