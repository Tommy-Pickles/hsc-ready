import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface MarkRequestPayload {
  questionId: string;
  questionText: string;
  studentAnswer: string;
  markingCriteria: string[];
  sampleAnswer?: string;
  marks: number;
  questionType: "multiple_choice" | "short_response" | "extended_response";
  correctAnswer?: string;
  tableConfig?: {
    columns: string[];
    rows: string[];
    prefilled?: Record<string, string>;
    forPart?: string;
  };
  graphConfig?: {
    xAxis: { label: string };
    yAxis: { label: string; inverted?: boolean };
    series: { name: string }[];
    showLineOfBestFit?: boolean;
    forPart?: string;
  };
  parts?: { label: string; marks: number }[];
}

function formatStudentAnswer(
  answer: string,
  tableConfig?: MarkRequestPayload["tableConfig"],
  parts?: MarkRequestPayload["parts"],
  graphConfig?: MarkRequestPayload["graphConfig"]
): string {
  // Try to detect if it's a multi-part JSON answer
  if (parts && parts.length > 1) {
    try {
      const partAnswers = JSON.parse(answer) as Record<string, string>;
      let formatted = "";
      for (const part of parts) {
        const partAns = partAnswers[part.label] || "(no answer)";
        formatted += `Part ${part.label} (${part.marks} marks):\n`;
        // Check if this part's answer is a graph
        if (graphConfig && graphConfig.forPart === part.label) {
          formatted += formatGraphAnswer(partAns, graphConfig) + "\n\n";
        } else if (tableConfig && tableConfig.forPart === part.label) {
          formatted += formatTableAnswer(partAns, tableConfig) + "\n\n";
        } else {
          formatted += partAns + "\n\n";
        }
      }
      return formatted.trim();
    } catch {
      return answer;
    }
  }

  // Standalone graph answer
  if (graphConfig && !graphConfig.forPart) {
    return formatGraphAnswer(answer, graphConfig);
  }

  // Standalone table answer
  if (tableConfig && !tableConfig.forPart) {
    return formatTableAnswer(answer, tableConfig);
  }

  return answer;
}

function formatTableAnswer(
  answer: string,
  tableConfig: NonNullable<MarkRequestPayload["tableConfig"]>
): string {
  try {
    const data = JSON.parse(answer) as Record<string, string>;
    const { columns, rows, prefilled } = tableConfig;
    let table = columns.join(" | ") + "\n" + columns.map(() => "---").join(" | ") + "\n";
    for (let ri = 0; ri < rows.length; ri++) {
      const cells: string[] = [];
      for (let ci = 0; ci < columns.length; ci++) {
        const key = `${ri},${ci}`;
        cells.push(prefilled?.[key] || data[key] || "");
      }
      table += cells.join(" | ") + "\n";
    }
    return table.trim();
  } catch {
    return answer;
  }
}

function formatGraphAnswer(
  answer: string,
  graphConfig: NonNullable<MarkRequestPayload["graphConfig"]>
): string {
  try {
    const data = JSON.parse(answer) as {
      points: { series: number; x: number; y: number }[];
      lineOfBestFit?: { x1: number; y1: number; x2: number; y2: number };
    };

    let formatted = `Graph plotted with ${graphConfig.xAxis.label} on x-axis and ${graphConfig.yAxis.label} on y-axis.\n\n`;

    // Group points by series
    const seriesMap: Record<number, { x: number; y: number }[]> = {};
    for (const pt of data.points) {
      if (!seriesMap[pt.series]) seriesMap[pt.series] = [];
      seriesMap[pt.series].push({ x: pt.x, y: pt.y });
    }

    for (const [si, pts] of Object.entries(seriesMap)) {
      const seriesName = graphConfig.series[Number(si)]?.name || `Series ${Number(si) + 1}`;
      const sorted = pts.sort((a, b) => a.x - b.x);
      formatted += `${seriesName} points plotted:\n`;
      for (const pt of sorted) {
        formatted += `  ${graphConfig.xAxis.label}=${pt.x}, ${graphConfig.yAxis.label}=${pt.y}\n`;
      }
      formatted += "\n";
    }

    if (data.lineOfBestFit) {
      const lob = data.lineOfBestFit;
      formatted += `Line of best fit drawn from (${lob.x1}, ${lob.y1}) to (${lob.x2}, ${lob.y2}).\n`;
      // Calculate slope and intercept
      if (lob.x2 !== lob.x1) {
        const slope = (lob.y2 - lob.y1) / (lob.x2 - lob.x1);
        const intercept = lob.y1 - slope * lob.x1;
        formatted += `Line equation: y = ${slope.toFixed(4)}x + ${intercept.toFixed(2)}\n`;
      }
    }

    return formatted.trim();
  } catch {
    return answer;
  }
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

interface MarkingFeedback {
  highlights: Highlight[];
  missed: Missed[];
  overallComment: string;
}

interface MarkingResponse {
  marksAwarded: number;
  feedback: MarkingFeedback;
}

function markMultipleChoice(
  studentAnswer: string,
  correctAnswer: string,
  marks: number
): MarkingResponse {
  const isCorrect =
    studentAnswer.trim().toUpperCase() === correctAnswer.trim().toUpperCase();

  return {
    marksAwarded: isCorrect ? marks : 0,
    feedback: {
      highlights: isCorrect
        ? [
            {
              text: studentAnswer,
              criterionMet: "Correct answer selected",
              marksForThis: marks,
            },
          ]
        : [],
      missed: isCorrect
        ? []
        : [
            {
              criterion: `The correct answer is ${correctAnswer}`,
              suggestion: `You selected ${studentAnswer}. Review this concept and try to understand why ${correctAnswer} is correct.`,
            },
          ],
      overallComment: isCorrect
        ? "Correct! Well done."
        : `Incorrect. The correct answer is ${correctAnswer}.`,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: MarkRequestPayload = await request.json();
    const {
      questionText,
      studentAnswer,
      markingCriteria,
      sampleAnswer,
      marks,
      questionType,
      correctAnswer,
      tableConfig,
      graphConfig,
      parts,
    } = body;

    if (!questionText || studentAnswer === undefined || !markingCriteria || marks === undefined || !questionType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Handle multiple choice without API call
    if (questionType === "multiple_choice") {
      if (!correctAnswer) {
        return NextResponse.json(
          { error: "correctAnswer required for multiple choice questions" },
          { status: 400 }
        );
      }
      const result = markMultipleChoice(studentAnswer, correctAnswer, marks);
      return NextResponse.json(result);
    }

    // For short and extended response, use Claude
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const criteriaList = markingCriteria
      .map((c, i) => `${i + 1}. ${c}`)
      .join("\n");

    const sampleAnswerSection = sampleAnswer
      ? `\n\nSAMPLE ANSWER (for reference only — do not use as the sole basis for marking):\n${sampleAnswer}`
      : "";

    const formattedAnswer = formatStudentAnswer(studentAnswer, tableConfig, parts, graphConfig);

    const prompt = `You are marking an HSC Biology exam answer. You MUST ONLY use the marking criteria provided. Do NOT use your own knowledge or search for information. Mark strictly against the criteria given.

QUESTION (${marks} mark${marks !== 1 ? "s" : ""}):
${questionText}

MARKING CRITERIA:
${criteriaList}
${sampleAnswerSection}

STUDENT ANSWER:
${formattedAnswer}

Evaluate the student's answer ONLY against the marking criteria above. Award marks only for criteria that are clearly met.

Respond with a JSON object in exactly this format (no markdown, no extra text):
{
  "marksAwarded": <number between 0 and ${marks}>,
  "feedback": {
    "highlights": [
      {
        "text": "<exact quote from student answer that earned marks>",
        "criterionMet": "<which criterion this satisfied>",
        "marksForThis": <marks awarded for this>
      }
    ],
    "missed": [
      {
        "criterion": "<criterion that was not met>",
        "suggestion": "<specific advice on how to address this criterion>"
      }
    ],
    "overallComment": "<brief overall comment on the answer quality>"
  }
}`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parse the JSON response from Claude
    let parsedResponse: MarkingResponse;
    try {
      // Strip any potential markdown code fences
      const cleaned = responseText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      parsedResponse = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse Claude response:", responseText);
      return NextResponse.json(
        { error: "Failed to parse marking response from AI" },
        { status: 500 }
      );
    }

    // Clamp marksAwarded to valid range
    parsedResponse.marksAwarded = Math.max(
      0,
      Math.min(marks, parsedResponse.marksAwarded)
    );

    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error("Mark error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during marking" },
      { status: 500 }
    );
  }
}
