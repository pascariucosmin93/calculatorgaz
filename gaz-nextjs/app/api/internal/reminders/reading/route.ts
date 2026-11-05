import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const expected = (process.env.INTERNAL_API_KEY ?? "").trim();
  const actual = request.headers.get("x-internal-api-key") ?? "";
  if (!expected || expected.length !== actual.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) return NextResponse.json({ error: "Acces interzis." }, { status: 403 });
  const now = new Date();
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const users = await prisma.user.findMany({
    select: { id: true, email: true },
    where: {
      email: { not: process.env.ADMIN_EMAIL?.trim().toLowerCase() || "__none__" },
      readings: { none: { createdAt: { gte: monthStart, lt: nextMonthStart } } }
    }
  });
  let created = 0;
  for (const user of users) {
    try {
      await prisma.appNotification.create({ data: { userId: user.id, type: "reading-reminder", monthKey, title: "Este timpul pentru autocitire", message: "Astăzi este ziua pentru transmiterea indexului. Introdu indexul pentru a simula costul consumului tău." } });
      created += 1;
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("Unique constraint")) throw error;
    }
  }
  return NextResponse.json({ created, monthKey });
}

export async function GET(request: NextRequest) {
  const expected = (process.env.INTERNAL_API_KEY ?? "").trim();
  const actual = request.headers.get("x-internal-api-key") ?? "";
  if (!expected || expected.length !== actual.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) return NextResponse.json({ error: "Acces interzis." }, { status: 403 });
  const [daySetting, hourSetting] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "reading_reminder_day" } }),
    prisma.systemSetting.findUnique({ where: { key: "reading_reminder_hour" } })
  ]);
  const day = Number(daySetting?.value ?? 2);
  const hour = Number(hourSetting?.value ?? 9);
  return NextResponse.json({ day: Number.isInteger(day) && day >= 1 && day <= 28 ? day : 2, hour: Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 9 });
}
