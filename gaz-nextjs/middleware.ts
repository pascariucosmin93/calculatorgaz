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
// Rate limiting (in-memory, per IP + route + method)
// ---------------------------------------------------------------------------
type RateLimitRule = {
  maxRequests: number;
  windowMs: number;
};

const DEFAULT_RATE_LIMIT_RULES: Record<string, RateLimitRule> = {
  "POST /api/auth/login": { maxRequests: 5, windowMs: 15 * 60_000 },
  "POST /api/auth/signup": { maxRequests: 3, windowMs: 15 * 60_000 },
  "POST /api/auth/reset-password": { maxRequests: 3, windowMs: 60 * 60_000 },
  "POST /api/auth/reset-password/confirm": { maxRequests: 3, windowMs: 60 * 60_000 },
  "POST /api/admin/session": { maxRequests: 3, windowMs: 15 * 60_000 },
  "POST /api/ocr": { maxRequests: 10, windowMs: 15 * 60_000 }
};

type RateLimitState = {
  count: number;
  resetAt: number;
};

const rateLimitMap = new Map<string, RateLimitState>();

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

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveRule(method: string, pathname: string): RateLimitRule | null {
  const key = `${method} ${pathname}`;
  const baseRule = DEFAULT_RATE_LIMIT_RULES[key];
  if (!baseRule) {
    return null;
  }

  const envPrefix = key
    .replace(/[^A-Z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  const maxRequests = parsePositiveInt(
    process.env[`RATE_LIMIT_${envPrefix}_MAX_REQUESTS`],
    baseRule.maxRequests
  );
  const windowMs = parsePositiveInt(
    process.env[`RATE_LIMIT_${envPrefix}_WINDOW_MS`],
    baseRule.windowMs
  );

  return { maxRequests, windowMs };
}

function applyRateLimit(
  request: NextRequest,
  ruleKey: string,
  rule: RateLimitRule
): { blocked: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const ip = getClientIp(request);
  const bucketKey = `${ip}|${ruleKey}`;
  const entry = rateLimitMap.get(bucketKey);

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + rule.windowMs;
    rateLimitMap.set(bucketKey, { count: 1, resetAt });
    return { blocked: false, remaining: rule.maxRequests - 1, resetAt };
  }

  entry.count++;
  const blocked = entry.count > rule.maxRequests;
  const remaining = Math.max(0, rule.maxRequests - entry.count);
  return { blocked, remaining, resetAt: entry.resetAt };
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
  if (cookieToken.length < 32 || headerToken.length < 32) return false;
  try {
    const a = Buffer.from(cookieToken, "utf8");
    const b = Buffer.from(headerToken, "utf8");
    if (a.length !== b.length) return false;
    const crypto = require("crypto");
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const ruleKey = `${request.method} ${pathname}`;
  const rateLimitRule = resolveRule(request.method, pathname);
  const rateLimitResult =
    rateLimitRule ? applyRateLimit(request, ruleKey, rateLimitRule) : null;

  // Block direct access to /api/internal/* without valid shared secret
  if (pathname.startsWith("/api/internal")) {
    if (!isInternalApiAuthorized(request)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.next();
  }

  if (rateLimitRule && rateLimitResult?.blocked) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
    );
    const response = NextResponse.json(
      { error: "Prea multe încercări. Încearcă din nou mai târziu." },
      { status: 429 }
    );
    response.headers.set("Retry-After", String(retryAfterSeconds));
    response.headers.set("X-RateLimit-Limit", String(rateLimitRule.maxRequests));
    response.headers.set("X-RateLimit-Remaining", "0");
    response.headers.set("X-RateLimit-Reset", String(Math.floor(rateLimitResult.resetAt / 1000)));
    return response;
  }

  // CSRF validation for mutation requests on API routes
  if (!CSRF_SAFE_METHODS.has(request.method) && !isCsrfExempt(pathname)) {
    if (!validateCsrf(request)) {
      return NextResponse.json(
        { error: "Token CSRF invalid." },
        { status: 403 }
      );
    }
  }

  const response = NextResponse.next();
  if (rateLimitRule && rateLimitResult) {
    response.headers.set("X-RateLimit-Limit", String(rateLimitRule.maxRequests));
    response.headers.set("X-RateLimit-Remaining", String(rateLimitResult.remaining));
    response.headers.set("X-RateLimit-Reset", String(Math.floor(rateLimitResult.resetAt / 1000)));
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
    return response;
  }

  const url = request.nextUrl.clone();
  url.pathname = "/resetare";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/api/:path*", "/", "/resetare"]
};
