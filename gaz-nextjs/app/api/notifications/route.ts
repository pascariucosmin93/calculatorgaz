import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { isErrorResponse, verifySession } from "@/lib/auth";

const internalKey = (request: NextRequest) => request.headers.get("x-internal-api-key") ?? "";
const isInternal = (request: NextRequest) => {
  const expected = (process.env.INTERNAL_API_KEY ?? "").trim();
  const actual = internalKey(request);
  return expected && actual && expected.length === actual.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
};

export async function GET(request: NextRequest) {
  const session = isInternal(request) ? null : await verifySession(request);
  if (session && isErrorResponse(session)) return session;
  const userId = isInternal(request) ? new URL(request.url).searchParams.get("userId")?.trim() : session?.id;
  if (!userId) return NextResponse.json({ error: "Lipsește utilizatorul." }, { status: 401 });
  return NextResponse.json(await prisma.appNotification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }));
}

export async function PATCH(request: NextRequest) {
  const session = await verifySession(request);
  if (isErrorResponse(session)) return session;
  const body = (await request.json().catch(() => ({}))) as { id?: string };
  if (!body.id) return NextResponse.json({ error: "Lipsește notificarea." }, { status: 400 });
  await prisma.appNotification.updateMany({ where: { id: body.id, userId: session.id }, data: { readAt: new Date() } });
  return NextResponse.json({ ok: true });
}
