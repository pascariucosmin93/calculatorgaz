import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-session";
import { isErrorResponse } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await requireAdminSession(request);
  if (isErrorResponse(session)) return session;
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" }, select: { username: true, email: true, ownerName: true, createdAt: true, _count: { select: { readings: true, invoiceUploads: true } } } });
  const csv = ["Utilizator;Email;Titular;Creat;Calcule;Uploaduri PDF", ...users.map((user) => [user.username, user.email ?? "", user.ownerName ?? "", user.createdAt.toISOString(), user._count.readings, user._count.invoiceUploads].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(";"))].join("\n");
  return new NextResponse("\uFEFF" + csv + "\n", { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=admin-statistici.csv" } });
}
