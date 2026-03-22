import { NextRequest, NextResponse } from "next/server";
import { selectAutoQuiz } from "@/data/questions";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const modules = params.get("modules")?.split(",").filter(Boolean);
  const type = params.get("type") || "all";
  const count = parseInt(params.get("count") || "20", 10);

  const questions = selectAutoQuiz({
    modules: modules?.map((m) => m.replace("Module ", "")),
    type,
    count,
  });

  return NextResponse.json(questions);
}
