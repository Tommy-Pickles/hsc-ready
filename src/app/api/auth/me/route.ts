import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.userId,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Me error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
