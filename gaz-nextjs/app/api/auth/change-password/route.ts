import { NextRequest, NextResponse } from "next/server";

import { isErrorResponse, verifySession } from "@/lib/auth";

const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL?.trim() ??
  "http://auth-service:8083";

const SESSION_SERVICE_URL =
  process.env.SESSION_SERVICE_URL?.trim() ??
  "http://session-service:8088";

export async function POST(request: NextRequest) {
  const session = await verifySession(request);
  if (isErrorResponse(session)) return session;

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body invalid." }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${AUTH_SERVICE_URL.replace(/\/+$/, "")}/auth/change-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, userId: session.id }),
        signal: AbortSignal.timeout(10_000),
        cache: "no-store"
      }
    );
    const text = await response.text();

    if (!response.ok) {
      return new NextResponse(text, {
        status: response.status,
        headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" }
      });
    }

    // Parola s-a schimbat cu succes -> tokenVersion a crescut, ceea ce invalidează
    // orice altă sesiune deschisă a acestui cont. Re-semnăm imediat sesiunea
    // curentă cu noul tokenVersion, ca utilizatorul care tocmai și-a schimbat
    // parola să nu fie delogat pe neașteptate la următoarea cerere.
    let data: { message?: string; tokenVersion?: number };
    try {
      data = JSON.parse(text);
    } catch {
      return new NextResponse(text, { status: response.status });
    }

    try {
      const sessionRes = await fetch(`${SESSION_SERVICE_URL.replace(/\/+$/, "")}/session/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: session.id,
          username: session.username,
          email: session.email,
          tokenVersion: data.tokenVersion
        }),
        signal: AbortSignal.timeout(5_000)
      });

      if (sessionRes.ok) {
        const { token } = (await sessionRes.json()) as { token: string };
        const res = NextResponse.json({ message: data.message ?? "Parola a fost schimbată." });
        res.cookies.set("gaz-session", token, {
          httpOnly: true,
          secure: true,
          sameSite: "strict",
          path: "/",
          maxAge: 86400
        });
        return res;
      }
    } catch {
      // Re-semnarea a eșuat — parola tot s-a schimbat, dar sesiunea curentă
      // va fi tratată ca expirată la următoarea cerere (fail-safe, nu fail-open).
    }

    return NextResponse.json({ message: data.message ?? "Parola a fost schimbată." });
  } catch {
    return NextResponse.json(
      { error: "Serviciul de autentificare este momentan indisponibil." },
      { status: 502 }
    );
  }
}
