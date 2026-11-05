import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL?.trim() ??
  "http://auth-service:8083";

const SESSION_SERVICE_URL =
  process.env.SESSION_SERVICE_URL?.trim() ??
  "http://session-service:8088";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();

// Deliberately no identity or request metadata: the dashboard needs only the
// aggregate outcome, not personal or security-sensitive data.
const recordLoginOutcome = (outcome: "SUCCESS" | "FAILURE") =>
  prisma.loginEvent.create({ data: { outcome } }).catch((error) => {
    console.error("Could not record login outcome:", error);
  });

export async function POST(request: Request) {
  try {
    const body = await request.text();

    const response = await fetch(`${AUTH_SERVICE_URL.replace(/\/+$/, "")}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(10_000),
      cache: "no-store"
    });

    const text = await response.text();

    if (!response.ok) {
      await recordLoginOutcome("FAILURE");
      return new NextResponse(text, {
        status: response.status,
        headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" }
      });
    }

    let userData: Record<string, unknown>;
    try {
      userData = JSON.parse(text);
    } catch {
      await recordLoginOutcome("FAILURE");
      return new NextResponse(text, {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    userData.isAdmin =
      ADMIN_EMAIL !== "" && String(userData.email ?? "").toLowerCase() === ADMIN_EMAIL;

    try {
      const sessionRes = await fetch(`${SESSION_SERVICE_URL.replace(/\/+$/, "")}/session/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userData.id,
          username: userData.username,
          email: userData.email,
          tokenVersion: userData.tokenVersion
        }),
        signal: AbortSignal.timeout(5_000)
      });

      if (sessionRes.ok) {
        const { token } = (await sessionRes.json()) as { token: string };
        await recordLoginOutcome("SUCCESS");
        const res = NextResponse.json(userData, { status: 200 });
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
      // Session service unavailable — do NOT return partial success
    }

    await recordLoginOutcome("FAILURE");
    return NextResponse.json(
      { error: "Serviciul de sesiuni este momentan indisponibil. Încearcă din nou." },
      { status: 503 }
    );
  } catch (error) {
    await recordLoginOutcome("FAILURE");
    return NextResponse.json(
      { error: "Serviciul de autentificare este momentan indisponibil." },
      { status: 502 }
    );
  }
}
