import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

export const AUTH_COOKIE_NAME = "hsc-ready-token";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "hsc-ready-default-secret-change-in-production"
);

const JWT_EXPIRY = "7d";

export interface JWTPayload {
  userId: number;
  email: string;
  name: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as number,
      email: payload.email as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

export async function getUser(request: NextRequest): Promise<JWTPayload | null> {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
