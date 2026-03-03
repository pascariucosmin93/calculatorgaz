import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

type ConfirmPayload = {
  resetId?: string;
  token?: string;
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  try {
    let payload: ConfirmPayload | null = null;
    try {
      payload = (await request.json()) as ConfirmPayload;
    } catch {
      // Continue to validation
    }

    const resetId = (payload?.resetId ?? "").trim();
    const token = (payload?.token ?? "").trim();
    const email = (payload?.email ?? "").trim().toLowerCase();
    const password = payload?.password ?? "";

    if (!password) {
      return NextResponse.json(
        { error: "Parola este obligatorie." },
        { status: 422 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Parola trebuie să aibă cel puțin 8 caractere." },
        { status: 422 }
      );
    }

    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: "Parola trebuie să conțină cel puțin o literă și o cifră." },
        { status: 422 }
      );
    }

    const storedToken = resetId
      ? await prisma.passwordResetToken.findUnique({ where: { id: resetId } })
      : token
        ? await prisma.passwordResetToken.findUnique({ where: { token } })
        : null;

    if (!storedToken) {
      return NextResponse.json({ error: "Token invalid sau expirat." }, { status: 400 });
    }

    if (new Date(storedToken.expiresAt).getTime() < Date.now()) {
      await prisma.passwordResetToken.deleteMany({ where: { token } });
      return NextResponse.json({ error: "Tokenul a expirat. Trimite o nouă cerere." }, { status: 400 });
    }

    if (!resetId && storedToken.email.toLowerCase() !== email) {
      return NextResponse.json({ error: "Emailul nu corespunde tokenului primit." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: storedToken.userId }
    });

    if (!user) {
      await prisma.passwordResetToken.deleteMany({ where: { token } });
      return NextResponse.json({ error: "Contul nu a fost găsit." }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id }
    });

    return NextResponse.json({
      message: "Parola a fost resetată cu succes. Te poți autentifica acum."
    });
  } catch (err) {
    console.error("/api/auth/reset-password/confirm error:", err);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  }
}
