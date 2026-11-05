import { NextRequest, NextResponse } from "next/server";

const DEFAULT_BLOCKLIST_CACHE_MS = 15_000;

type BlocklistApiResponse = {
  items?: string[];
};

// Neconfigurat implicit (nu există un agent DDoS pe rețea). Setează
// DDOS_BLOCKLIST_URL explicit când feature-ul devine disponibil — până atunci
// middleware-ul nu încearcă niciun fetch inutil.
const BLOCKLIST_URL = process.env.DDOS_BLOCKLIST_URL?.trim() || "";
const BLOCKLIST_CACHE_MS = parsePositiveInt(
  process.env.DDOS_BLOCKLIST_CACHE_MS,
  DEFAULT_BLOCKLIST_CACHE_MS
);

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
  "POST /api/auth/change-password": { maxRequests: 5, windowMs: 15 * 60_000 },
  "POST /api/auth/forgot-password": { maxRequests: 3, windowMs: 15 * 60_000 },
  "POST /api/auth/reset-password": { maxRequests: 5, windowMs: 15 * 60_000 },
  "POST /api/admin/session": { maxRequests: 3, windowMs: 15 * 60_000 },
  "POST /api/invoices/upload": { maxRequests: 10, windowMs: 60 * 60_000 },
  "POST /api/readings": { maxRequests: 60, windowMs: 60 * 60_000 },
  "PATCH /api/readings": { maxRequests: 30, windowMs: 60 * 60_000 },
  "PUT /api/tariffs": { maxRequests: 30, windowMs: 60 * 60_000 },
  "POST /api/locations": { maxRequests: 20, windowMs: 60 * 60_000 }
};

type RateLimitState = {
  count: number;
  resetAt: number;
};

const rateLimitMap = new Map<string, RateLimitState>();
const blockedIpCache = new Set<string>();
let blockedIpCacheExpiresAt = 0;

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((val, key) => {
    if (val.resetAt <= now) rateLimitMap.delete(key);
  });
}, 300_000);

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// RUM accepts only aggregate performance values. Keep this endpoint out of
// request logging too, so neither the visitor IP nor user agent is retained
// alongside an otherwise anonymous metric.
const SKIP_LOG_PATHS = ["/_next/", "/favicon.ico", "/health", "/api/rum/"];

function logRequest(request: NextRequest): void {
  const pathname = request.nextUrl.pathname;
  if (SKIP_LOG_PATHS.some(p => pathname.startsWith(p))) return;

  const ua = request.headers.get("user-agent") ?? "";
  if (ua.includes("kube-probe") || ua.includes("Go-http-client")) return;

  console.log(JSON.stringify({
    time: new Date().toISOString(),
    ip: getClientIp(request),
    country: request.headers.get("cf-ipcountry") ?? "",
    ray: request.headers.get("cf-ray") ?? "",
    method: request.method,
    path: pathname,
    ua,
  }));
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function refreshBlockedIpCacheIfNeeded(force = false): Promise<void> {
  if (!BLOCKLIST_URL) {
    return;
  }

  const now = Date.now();
  if (!force && now < blockedIpCacheExpiresAt) {
    return;
  }

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 1_500);

  try {
    const response = await fetch(BLOCKLIST_URL, {
      cache: "no-store",
      signal: abortController.signal
    });

    if (!response.ok) {
      blockedIpCacheExpiresAt = now + Math.min(BLOCKLIST_CACHE_MS, 5_000);
      return;
    }

    const payload: BlocklistApiResponse = await response.json();
    blockedIpCache.clear();
    for (const ip of payload.items ?? []) {
      if (typeof ip === "string" && ip.trim()) {
        blockedIpCache.add(ip.trim());
      }
    }
    blockedIpCacheExpiresAt = now + BLOCKLIST_CACHE_MS;
  } catch {
    blockedIpCacheExpiresAt = now + Math.min(BLOCKLIST_CACHE_MS, 5_000);
  } finally {
    clearTimeout(timeout);
  }
}

async function isBlockedIp(ip: string): Promise<boolean> {
  if (!ip || ip === "unknown") {
    return false;
  }
  await refreshBlockedIpCacheIfNeeded();
  return blockedIpCache.has(ip);
}

// Rate limiting-ul e in-memory, per proces. Cu mai multe replici (vezi
// `replicas` din Deployment-ul calculatorgaz), traficul unui atacator se împarte
// aleator între ele, iar limita reală devine maxRequests * REPLICA_COUNT.
// Împărțim aici la numărul de replici ca să compensăm, până când limitarea
// va folosi un store partajat (ex. Redis) la o scală care justifică infra nouă.
const RATE_LIMIT_REPLICA_COUNT = parsePositiveInt(process.env.RATE_LIMIT_REPLICA_COUNT, 2);

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
  const configuredMaxRequests = parsePositiveInt(
    process.env[`RATE_LIMIT_${envPrefix}_MAX_REQUESTS`],
    baseRule.maxRequests
  );
  const maxRequests = Math.max(
    1,
    Math.floor(configuredMaxRequests / RATE_LIMIT_REPLICA_COUNT)
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
  // Neautentificate prin design — nu există sesiune/cookie CSRF disponibil
  // când userul deschide linkul de resetare într-un tab nou. Protejate prin
  // rate limiting și, la reset-password, prin secretul tokenului însuși.
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  // This endpoint has no user-specific effect and accepts only bounded,
  // allow-listed aggregate Web Vitals. Browser beacons do not carry a CSRF
  // token, so it is intentionally exempt.
  "/api/rum/web-vitals"
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
  return cookieToken === headerToken;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
export async function middleware(request: NextRequest) {
  logRequest(request);

  const pathname = request.nextUrl.pathname;
  const clientIp = getClientIp(request);

  if (await isBlockedIp(clientIp)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return new NextResponse("Forbidden", { status: 403 });
  }

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

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ]
};
