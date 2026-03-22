import { NextRequest, NextResponse } from "next/server";
import { getAllQuestions, getQuestionsByFilter } from "@/data/questions";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const modules = params.get("modules")?.split(",").filter(Boolean);
  const type = params.get("type") || undefined;
  const ids = params.get("ids")?.split(",").filter(Boolean);

  if (ids?.length) {
    const all = getAllQuestions();
    const selected = all.filter((q) => ids.includes(q.id));
    return NextResponse.json(selected);
  }

  const questions = getQuestionsByFilter({
    modules: modules?.map((m) => m.replace("Module ", "")),
    type,
  });

  return NextResponse.json(questions);
}
