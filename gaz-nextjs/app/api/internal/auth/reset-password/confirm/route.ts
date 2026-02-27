import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

type ConfirmPayload = {
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

    const token = (payload?.token ?? "").trim();
    const email = (payload?.email ?? "").trim().toLowerCase();
    const password = payload?.password ?? "";

    if (!token || !email || !password) {
      return NextResponse.json(
        { error: "Tokenul, emailul și parola sunt obligatorii." },
        { status: 422 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Parola trebuie să aibă cel puțin 6 caractere." },
        { status: 422 }
      );
    }

    const storedToken = await prisma.passwordResetToken.findUnique({
      where: { token }
    });

    if (!storedToken) {
      return NextResponse.json({ error: "Token invalid sau expirat." }, { status: 400 });
    }

    if (new Date(storedToken.expiresAt).getTime() < Date.now()) {
      await prisma.passwordResetToken.deleteMany({ where: { token } });
      return NextResponse.json({ error: "Tokenul a expirat. Trimite o nouă cerere." }, { status: 400 });
    }

    if (storedToken.email.toLowerCase() !== email) {
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
