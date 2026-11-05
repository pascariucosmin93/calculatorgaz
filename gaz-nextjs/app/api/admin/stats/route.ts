import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { isErrorResponse } from "@/lib/auth";
import prisma from "@/lib/prisma";

const numberSetting = (value: string | undefined, fallback: number) => {
  const result = Number(value);
  return Number.isInteger(result) && result >= 0 && result <= 23 ? result : fallback;
};
const daySetting = (value: string | undefined, fallback = 2) => {
  const result = Number(value);
  return Number.isInteger(result) && result >= 1 && result <= 28 ? result : fallback;
};

export async function GET(request: NextRequest) {
  const session = await requireAdminSession(request);
  if (isErrorResponse(session)) return session;
  const metricsUrl = (process.env.METRICS_SERVICE_URL ?? "").trim();
  if (metricsUrl) {
    try {
      const response = await fetch(`${metricsUrl.replace(/\/+$/, "")}/metrics?format=json`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
      const body = await response.text();
      return new NextResponse(body, { status: response.status, headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" } });
    } catch { return NextResponse.json({ error: "Serviciul de metrici este momentan indisponibil." }, { status: 502 }); }
  }
  const [users, calculations, uploads, unreadNotifications, reminderDay, reminderHour] = await Promise.all([
    prisma.user.count(), prisma.reading.count(), prisma.invoiceUpload.count(),
    prisma.appNotification.count({ where: { readAt: null } }),
    prisma.systemSetting.findUnique({ where: { key: "reading_reminder_day" } }),
    prisma.systemSetting.findUnique({ where: { key: "reading_reminder_hour" } })
  ]);
  return NextResponse.json({ users, calculations, uploads, unreadNotifications, reminderDay: daySetting(reminderDay?.value), reminderHour: numberSetting(reminderHour?.value, 9), notificationService: "configured" });
}

export async function PATCH(request: NextRequest) {
  const session = await requireAdminSession(request);
  if (isErrorResponse(session)) return session;
  const body = (await request.json().catch(() => ({}))) as { day?: number; hour?: number };
  if (!Number.isInteger(body.day) || (body.day as number) < 1 || (body.day as number) > 28) return NextResponse.json({ error: "Ziua trebuie să fie între 1 și 28." }, { status: 422 });
  if (!Number.isInteger(body.hour) || (body.hour as number) < 0 || (body.hour as number) > 23) return NextResponse.json({ error: "Ora trebuie să fie între 0 și 23." }, { status: 422 });
  await prisma.$transaction([
    prisma.systemSetting.upsert({ where: { key: "reading_reminder_day" }, create: { key: "reading_reminder_day", value: String(body.day) }, update: { value: String(body.day) } }),
    prisma.systemSetting.upsert({ where: { key: "reading_reminder_hour" }, create: { key: "reading_reminder_hour", value: String(body.hour) }, update: { value: String(body.hour) } })
  ]);
  return NextResponse.json({ reminderDay: body.day, reminderHour: body.hour });
}
