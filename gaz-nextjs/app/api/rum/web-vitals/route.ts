import { NextResponse } from "next/server";
import { recordWebVital, type WebVitalName } from "@/lib/rum-metrics";

const metricNames = new Set<WebVitalName>(["fcp", "lcp", "inp", "ttfb", "cls"]);
const allowedRoutes = new Set(["/", "/consum", "/autocitire", "/facturi", "/cont"]);

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null) as { name?: unknown; value?: unknown; route?: unknown } | null;
  const name = typeof payload?.name === "string" ? payload.name : "";
  const value = typeof payload?.value === "number" ? payload.value : NaN;
  const route = typeof payload?.route === "string" && allowedRoutes.has(payload.route) ? payload.route : "/";

  // Only aggregate performance numbers are accepted. No cookie, account ID,
  // IP, query string, user agent, page title or free-form route is retained.
  if (!metricNames.has(name as WebVitalName) || !Number.isFinite(value) || value < 0 || value > 120_000) {
    return new NextResponse(null, { status: 204 });
  }

  recordWebVital(name as WebVitalName, value, route);
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
