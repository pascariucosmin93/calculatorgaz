import crypto from "crypto";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

type Payload = {
  identifier?: string;
};

const sanitize = (value: string) => value.trim();
const RESET_TOKEN_TTL_MS = 60 * 60_000;

export async function POST(request: Request) {
  try {
    let payload: Payload;
    try {
      payload = (await request.json()) as Payload;
    } catch {
      return NextResponse.json({ error: "Body invalid." }, { status: 400 });
    }

    const identifier = sanitize(payload.identifier ?? "").toLowerCase();
    if (!identifier) {
      return NextResponse.json(
        { error: "Introdu numele de utilizator sau emailul." },
        { status: 422 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { OR: [{ username: identifier }, { email: identifier }] }
    });

    if (!user) {
      return NextResponse.json({ found: false }, { status: 200 });
    }

    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const token = crypto.randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        token,
        email: user.email ?? user.username,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        userId: user.id
      }
    });

    return NextResponse.json(
      {
        found: true,
        token,
        username: user.username,
        ownerName: user.ownerName,
        email: user.email
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("/api/internal/auth/forgot-password error:", err);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}
