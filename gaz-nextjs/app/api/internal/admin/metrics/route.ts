import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const expected = (process.env.INTERNAL_API_KEY ?? "").trim();
  const actual = request.headers.get("x-internal-api-key") ?? "";
  if (!expected || expected.length !== actual.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) return NextResponse.json({ error: "Acces interzis." }, { status: 403 });
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [users, activeUsers, newUsers, calculationsToday, calculationsMonth, uploads, notifications, unreadNotifications, readingsMonth, loginSuccesses24h, loginFailures24h, avg, reminderDaySetting, reminderHourSetting, supportTicketGroups] = await Promise.all([
    prisma.user.count(), prisma.user.count({ where: { readings: { some: { createdAt: { gte: dayAgo } } } } }), prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.reading.count({ where: { createdAt: { gte: dayAgo } } }), prisma.reading.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.invoiceUpload.count({ where: { createdAt: { gte: monthStart } } }), prisma.appNotification.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.appNotification.count({ where: { readAt: null } }), prisma.reading.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.loginEvent.count({ where: { outcome: "SUCCESS", createdAt: { gte: dayAgo } } }),
    prisma.loginEvent.count({ where: { outcome: "FAILURE", createdAt: { gte: dayAgo } } }),
    prisma.reading.aggregate({ where: { createdAt: { gte: monthStart } }, _avg: { consumptionM3: true, total: true } }),
    prisma.systemSetting.findUnique({ where: { key: "reading_reminder_day" } }),
    prisma.systemSetting.findUnique({ where: { key: "reading_reminder_hour" } }),
    prisma.supportConversation.groupBy({ by: ["status"], _count: { _all: true } })
  ]);
  const supportTickets = { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0 };
  for (const group of supportTicketGroups) supportTickets[group.status] = group._count._all;
  const reminderDay = Number(reminderDaySetting?.value ?? 2);
  const reminderHour = Number(reminderHourSetting?.value ?? 9);
  return NextResponse.json({ users, activeUsers, newUsers, calculationsToday, calculationsMonth, calculations: calculationsMonth, uploadsMonth: uploads, uploads, notificationsMonth: notifications, unreadNotifications, readingsMonth, loginSuccesses24h, loginFailures24h, supportTickets, averageConsumptionM3: avg._avg.consumptionM3 ?? 0, averageCost: avg._avg.total ?? 0, reminderDay: Number.isInteger(reminderDay) && reminderDay >= 1 && reminderDay <= 28 ? reminderDay : 2, reminderHour: Number.isInteger(reminderHour) && reminderHour >= 0 && reminderHour <= 23 ? reminderHour : 9, notificationService: "configured", generatedAt: now.toISOString() });
}
