import { NextRequest, NextResponse } from "next/server";

const DEFAULT_RESET_BASE_URL = "https://reset.gaz.cosmin-lab.cloud/";

function getResetHost() {
  const rawBase = process.env.RESET_PASSWORD_BASE_URL ?? DEFAULT_RESET_BASE_URL;
  try {
    return new URL(rawBase).host.toLowerCase();
  } catch {
    return new URL(DEFAULT_RESET_BASE_URL).host.toLowerCase();
  }
}

const RESET_HOST = getResetHost();

function isInternalApiAuthorized(request: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY;
  if (!key) {
    // If key is not configured, deny all internal requests (fail-closed)
    return false;
  }
  const provided = request.headers.get("x-internal-api-key") ?? "";
  return provided.length > 0 && provided === key;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Block direct access to /api/internal/* without valid shared secret
  if (pathname.startsWith("/api/internal")) {
    if (!isInternalApiAuthorized(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  const requestHost = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const isResetDomain = requestHost === RESET_HOST;

  if (
    !isResetDomain ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/resetare")
  ) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/resetare";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/:path*"]
};
