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

const CSRF_SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const CSRF_EXEMPT_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/logout",
  "/api/auth/csrf",
  "/api/auth/reset-password",
  "/api/auth/reset-password/confirm"
]);

function isCsrfExempt(pathname: string): boolean {
  if (!pathname.startsWith("/api/")) return true;
  if (pathname.startsWith("/api/internal")) return true;
  return CSRF_EXEMPT_PATHS.has(pathname);
}

function validateCsrf(request: NextRequest): boolean {
  const cookieToken = request.cookies.get("gaz-csrf")?.value ?? "";
  const headerToken = request.headers.get("x-csrf-token") ?? "";
  if (!cookieToken || !headerToken) return false;
  return cookieToken.length >= 32 && cookieToken === headerToken;
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

  // CSRF validation for mutation requests on API routes
  if (
    !CSRF_SAFE_METHODS.has(request.method) &&
    !isCsrfExempt(pathname)
  ) {
    if (!validateCsrf(request)) {
      return NextResponse.json({ error: "Token CSRF invalid." }, { status: 403 });
    }
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
