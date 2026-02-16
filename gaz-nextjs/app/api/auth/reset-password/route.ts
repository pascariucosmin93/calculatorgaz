import crypto from "crypto";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type ResetPayload = {
  email?: string;
};

export async function POST(request: Request) {
  const DEFAULT_RESET_BASE_URL = "https://reset.gaz.cosmin-lab.cloud/";

  try {
    let payload: ResetPayload | null = null;
    try {
      payload = (await request.json()) as ResetPayload;
    } catch {
      // Body invalid, fall through to validation response below.
    }

    const resetLinkBase = process.env.RESET_PASSWORD_BASE_URL ?? DEFAULT_RESET_BASE_URL;

    const email = (payload?.email ?? "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Introdu adresa de email." }, { status: 422 });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username: email }]
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Nu am găsit niciun cont cu acest email sau utilizator." },
        { status: 404 }
      );
    }

    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id
      }
    });

    const resetEmail = user.email ?? email;

    await prisma.passwordResetToken.create({
      data: {
        token,
        email: resetEmail,
        userId: user.id,
        expiresAt
      }
    });

    let resetUrl = resetLinkBase;
    try {
      const url = new URL(resetLinkBase);
      url.searchParams.set("token", token);
      url.searchParams.set("email", resetEmail);
      resetUrl = url.toString();
    } catch {
      const separator = resetLinkBase.includes("?") ? "&" : "?";
      resetUrl = `${resetLinkBase}${separator}token=${token}&email=${encodeURIComponent(resetEmail)}`;
    }

    if (process.env.DISCORD_RESET_WEBHOOK_URL) {
      try {
        await fetch(process.env.DISCORD_RESET_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `Resetare parolă pentru ${resetEmail}\nLink: ${resetUrl}\nExpiră la: ${expiresAt.toISOString()}`
          })
        });
      } catch (error) {
        console.error("Nu am putut trimite linkul pe Discord:", error);
      }
    }

    return NextResponse.json({
      message: "Ți-am trimis instrucțiunile pentru resetarea parolei.",
      resetUrl,
      resetPage: resetUrl,
      expiresAt: expiresAt.toISOString()
    });
  } catch (err) {
    console.error("/api/auth/reset-password error:", err);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  }
}
