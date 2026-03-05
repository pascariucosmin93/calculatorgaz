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

// ---------------------------------------------------------------------------
// Rate limiting (in-memory, per IP)
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10; // max requests per window

const RATE_LIMITED_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/reset-password",
  "/api/auth/reset-password/confirm"
]);

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((val, key) => {
    if (val.resetAt <= now) rateLimitMap.delete(key);
  });
}, 300_000);

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || entry.resetAt <= now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// ---------------------------------------------------------------------------
// Internal API auth
// ---------------------------------------------------------------------------
function isInternalApiAuthorized(request: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY;
  if (!key) {
    return false;
  }
  const provided = request.headers.get("x-internal-api-key") ?? "";
  return provided.length > 0 && provided === key;
}

// ---------------------------------------------------------------------------
// CSRF
// ---------------------------------------------------------------------------
const CSRF_SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const CSRF_EXEMPT_PATHS = new Set([
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/logout",
  "/api/auth/csrf",
  "/api/auth/reset-password",
  "/api/auth/reset-password/confirm",
  "/api/ocr"
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

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Block direct access to /api/internal/* without valid shared secret
  if (pathname.startsWith("/api/internal")) {
    if (!isInternalApiAuthorized(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  // Rate limiting on auth endpoints
  if (RATE_LIMITED_PATHS.has(pathname) && request.method === "POST") {
    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Prea multe încercări. Reîncearcă peste un minut." },
        { status: 429 }
      );
    }
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
  matcher: ["/api/:path*", "/", "/resetare"]
};
