import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function tokensMatch(provided: string, expected: string): boolean {
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length === 0 || left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const expected = process.env.DASHBOARD_TOKEN?.trim() ?? "";
  if (!expected) {
    return NextResponse.json({ ok: true, open: true });
  }
  let token = "";
  try {
    const body = (await request.json()) as { token?: unknown };
    token = typeof body.token === "string" ? body.token : "";
  } catch {
    token = "";
  }
  if (!tokensMatch(token, expected)) {
    return NextResponse.json({ error: "Dashboard token was not accepted." }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set("insights_token", expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
