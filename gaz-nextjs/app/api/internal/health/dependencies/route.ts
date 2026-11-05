import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

type DependencyResult = { up: boolean; latencyMs: number };
type DependencyHealth = { database: DependencyResult };

const CACHE_MS = 25_000;
const TIMEOUT_MS = 8_000;
let cached: { expiresAt: number; value: DependencyHealth } | undefined;

function authorized(request: NextRequest) {
  const expected = process.env.INTERNAL_API_KEY ?? "";
  const received = request.headers.get("x-internal-api-key") ?? "";
  return expected.length > 0
    && expected.length === received.length
    && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

async function check(name: "database", operation: () => Promise<void>): Promise<DependencyResult> {
  const startedAt = performance.now();
  try {
    await Promise.race([
      operation(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`${name} check timed out`)), TIMEOUT_MS))
    ]);
    return { up: true, latencyMs: Math.round(performance.now() - startedAt) };
  } catch {
    return { up: false, latencyMs: Math.round(performance.now() - startedAt) };
  }
}

async function dependencies(): Promise<DependencyHealth> {
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const database = await check("database", async () => { await prisma.$queryRawUnsafe("SELECT 1"); });

  const value = { database };
  cached = { value, expiresAt: Date.now() + CACHE_MS };
  return value;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await dependencies(), { headers: { "Cache-Control": "no-store" } });
}
