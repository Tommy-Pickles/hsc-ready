import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { signToken, hashPassword, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, password } = body;

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: "Email, name, and password are required" },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || typeof name !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Invalid input types" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const db = getDb();

    const existingUser = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email.toLowerCase().trim());

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const result = db
      .prepare(
        "INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)"
      )
      .run(email.toLowerCase().trim(), name.trim(), passwordHash);

    const userId = result.lastInsertRowid as number;

    const token = await signToken({
      userId,
      email: email.toLowerCase().trim(),
      name: name.trim(),
    });

    const response = NextResponse.json(
      {
        user: {
          id: userId,
          email: email.toLowerCase().trim(),
          name: name.trim(),
        },
      },
      { status: 201 }
    );

    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
