import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = process.env.DASHBOARD_TOKEN?.trim();
  if (!token) return NextResponse.next();

  const { pathname } = request.nextUrl;
  const protectedPath = pathname === "/" || pathname.startsWith("/api/export");
  if (!protectedPath) return NextResponse.next();

  const provided =
    request.cookies.get("insights_token")?.value ||
    request.headers.get("x-dashboard-token") ||
    "";
  if (provided === token) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Dashboard token required." }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/unlock";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/", "/api/export"],
};
