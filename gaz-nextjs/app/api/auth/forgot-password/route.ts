import { NextResponse } from "next/server";

import { isMailConfigured, isValidEmail, sendPasswordResetEmail } from "@/lib/mailer";
import { sendNotification } from "@/lib/notification-client";

const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL?.trim() ??
  "http://auth-service:8083";

const GENERIC_MESSAGE =
  "Dacă există un cont cu acest utilizator, o cerere de resetare a fost trimisă administratorului.";

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body invalid." }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${AUTH_SERVICE_URL.replace(/\/+$/, "")}/auth/forgot-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
        cache: "no-store"
      }
    );

    if (!response.ok) {
      return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
    }

    const data = (await response.json()) as {
      found?: boolean;
      token?: string;
      username?: string;
      ownerName?: string | null;
      email?: string | null;
    };

    if (data.found && data.token) {
      const origin = new URL(request.url).origin;
      const baseUrl = process.env.APP_PUBLIC_URL?.trim().replace(/\/+$/, "") || origin;
      const resetLink = `${baseUrl}/reset?token=${data.token}`;

      // Utilizatorul primește linkul pe email; conturile fără email valid
      // (sau dacă SMTP nu e configurat) rămân doar pe fluxul Discord.
      if (isMailConfigured() && isValidEmail(data.email)) {
        sendPasswordResetEmail(data.email, resetLink).catch((error) => {
          console.error("Failed to send password-reset email", error);
        });
      }

      // Nu blocăm răspunsul către client pe trimiterea notificării.
      sendNotification({
        message: "Cerere de resetare parolă",
        details: {
          username: data.username ?? "-",
          ownerName: data.ownerName ?? "-",
          link: resetLink
        }
      }).catch((error) => {
        console.error("Failed to send Discord password-reset notification", error);
      });
    }

    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
  } catch {
    // Nici la o eroare de infrastructură nu confirmăm/infirmăm existența contului.
    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
  }
}
