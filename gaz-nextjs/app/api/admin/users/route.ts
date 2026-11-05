import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { isErrorResponse } from "@/lib/auth";
import { requireAdminSession } from "@/lib/admin-session";
import prisma from "@/lib/prisma";
import { validateEmail, validatePasswordStrength, validateUsername } from "@/lib/validation";

type Payload = {
  userId?: string;
  username?: string;
  email?: string;
  password?: string;
  ownerName?: string;
  address?: string;
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

export async function PUT(request: NextRequest) {
  try {
    const adminSession = await requireAdminSession(request);
    if (isErrorResponse(adminSession)) return adminSession;

    let payload: Payload;
    try {
      payload = (await request.json()) as Payload;
    } catch {
      return NextResponse.json({ error: "Body invalid." }, { status: 400 });
    }

    const username = normalize(payload.username).toLowerCase();
    const email = normalize(payload.email).toLowerCase();
    const password = payload.password ?? "";
    const ownerName = normalize(payload.ownerName) || username.toUpperCase();
    const address = normalize(payload.address) || null;

    const usernameError = validateUsername(username);
    if (usernameError) {
      return NextResponse.json({ error: usernameError }, { status: 422 });
    }

    const emailError = validateEmail(email);
    if (emailError) {
      return NextResponse.json({ error: emailError }, { status: 422 });
    }

    if (email === ADMIN_EMAIL || username === ADMIN_EMAIL) {
      return NextResponse.json(
        { error: "Contul de admin este gestionat automat și nu poate fi creat manual aici." },
        { status: 403 }
      );
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 422 });
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }]
      },
      select: { id: true, username: true, email: true }
    });

    if (existing) {
      const conflictMessage =
        existing.username === username
          ? "Utilizatorul există deja."
          : "Adresa de email este deja folosită.";
      return NextResponse.json({ error: conflictMessage }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        ownerName,
        address,
        passwordHash
      },
      select: {
        id: true,
        username: true,
        email: true,
        ownerName: true,
        address: true,
        createdAt: true
      }
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    console.error("/api/admin/users create error:", err);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
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
    const password = payload.password ?? "";

    if (!userId) {
      return NextResponse.json({ error: "Lipsește utilizatorul." }, { status: 422 });
    }
    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 422 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Utilizatorul nu există." }, { status: 404 });
    }

    const normalizedTargetEmail = normalize(targetUser.email).toLowerCase();
    const normalizedTargetUsername = normalize(targetUser.username).toLowerCase();
    if (
      normalizedTargetEmail === ADMIN_EMAIL ||
      normalizedTargetUsername === ADMIN_EMAIL
    ) {
      return NextResponse.json(
        { error: "Parola contului de admin se schimbă din secțiunea dedicată." },
        { status: 403 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, tokenVersion: { increment: 1 } }
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("/api/admin/users password error:", err);
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
