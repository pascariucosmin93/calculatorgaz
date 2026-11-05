import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { validatePasswordStrength } from "@/lib/validation";

type Payload = {
  token?: string;
  newPassword?: string;
};

export async function POST(request: Request) {
  try {
    let payload: Payload;
    try {
      payload = (await request.json()) as Payload;
    } catch {
      return NextResponse.json({ error: "Body invalid." }, { status: 400 });
    }

    const token = (payload.token ?? "").trim();
    const newPassword = payload.newPassword ?? "";

    if (!token) {
      return NextResponse.json({ error: "Link de resetare invalid." }, { status: 422 });
    }
    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 422 });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!resetToken || resetToken.expiresAt < new Date()) {
      if (resetToken) {
        await prisma.passwordResetToken.delete({ where: { id: resetToken.id } }).catch(() => {});
      }
      return NextResponse.json(
        { error: "Linkul de resetare este invalid sau a expirat." },
        { status: 410 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash, tokenVersion: { increment: 1 } }
      }),
      prisma.passwordResetToken.deleteMany({ where: { userId: resetToken.userId } })
    ]);

    return NextResponse.json({
      message: "Parola a fost resetată. Te poți autentifica cu noua parolă."
    });
  } catch (err) {
    console.error("/api/internal/auth/reset-password error:", err);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}
