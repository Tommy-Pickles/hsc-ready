import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { message, quizContext, chatHistory = [] } = body;

    if (!message || !quizContext) {
      return NextResponse.json(
        { error: "message and quizContext are required" },
        { status: 400 }
      );
    }

    const questionsSummary = (quizContext.results || [])
      .map((r: { questionId: string; marksAwarded: number; marksPossible: number; overallComment?: string }, i: number) => {
        const q = quizContext.questions?.find((q: { id: string }) => q.id === r.questionId);
        const answer = quizContext.answers?.[r.questionId];
        return `Q${i + 1} (${r.questionId}): ${r.marksAwarded}/${r.marksPossible}${q ? `\n  Topic: ${q.moduleContent}` : ""}${answer ? `\n  Answer: ${answer}` : ""}${r.overallComment ? `\n  Feedback: ${r.overallComment}` : ""}`;
      })
      .join("\n\n");

    const systemPrompt = `You are a helpful HSC Biology tutor reviewing a student's quiz. You MUST ONLY discuss:
1. The student's answers and performance in THIS quiz
2. HSC Biology content relevant to the questions
3. Study strategies for the topics covered

Do NOT discuss unrelated topics. Be encouraging, specific, and constructive.

QUIZ RESULTS:
Score: ${quizContext.totalScore || "N/A"}

QUESTIONS:
${questionsSummary}`;

    const messages: Anthropic.MessageParam[] = [
      ...(chatHistory as ChatMessage[]).map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user" as const, content: message },
    ];

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const replyText = response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ response: replyText });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
