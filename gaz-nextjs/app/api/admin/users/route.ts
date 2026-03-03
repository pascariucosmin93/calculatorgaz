import { NextRequest, NextResponse } from "next/server";

import { isErrorResponse } from "@/lib/auth";
import { requireAdminSession } from "@/lib/admin-session";
import prisma from "@/lib/prisma";

type Payload = {
  userId?: string;
};

const normalize = (value?: string | null) => (value ?? "").trim();

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").toLowerCase();
export async function POST(request: NextRequest) {
  try {
    const adminSession = await requireAdminSession(request);
    if (isErrorResponse(adminSession)) return adminSession;

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        email: true,
        ownerName: true,
        address: true,
        createdAt: true
      }
    });

    return NextResponse.json(users, { status: 200 });
  } catch (err) {
    console.error("/api/admin/users error:", err);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminSession = await requireAdminSession(request);
    if (isErrorResponse(adminSession)) return adminSession;

    let payload: Payload;
    try {
      payload = (await request.json()) as Payload;
    } catch {
      return NextResponse.json({ error: "Body invalid." }, { status: 400 });
    }

    const userId = normalize(payload.userId);
    if (!userId) {
      return NextResponse.json({ error: "Lipsește utilizatorul." }, { status: 422 });
    }

    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true }
    });

    if (!userToDelete) {
      return NextResponse.json({ error: "Utilizatorul nu există." }, { status: 404 });
    }

    const normalizedTargetEmail = normalize(userToDelete.email).toLowerCase();
    const normalizedTargetUsername = normalize(userToDelete.username).toLowerCase();
    if (
      normalizedTargetEmail === ADMIN_EMAIL ||
      normalizedTargetUsername === ADMIN_EMAIL
    ) {
      return NextResponse.json(
        { error: "Contul de admin nu poate fi șters." },
        { status: 403 }
      );
    }

    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("/api/admin/users delete error:", err);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}
