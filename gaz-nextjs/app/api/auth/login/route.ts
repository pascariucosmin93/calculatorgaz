import { NextResponse } from "next/server";

const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL?.trim() ??
  "http://auth-service:8083";

const SESSION_SERVICE_URL =
  process.env.SESSION_SERVICE_URL?.trim() ??
  "http://session-service:8088";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const cookieConsent = request.headers.get("x-cookie-consent") === "accepted";

    const response = await fetch(`${AUTH_SERVICE_URL.replace(/\/+$/, "")}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(10_000),
      cache: "no-store"
    });

    const text = await response.text();

    if (!response.ok || !cookieConsent) {
      return new NextResponse(text, {
        status: response.status,
        headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" }
      });
    }

    let userData: Record<string, unknown>;
    try {
      userData = JSON.parse(text);
    } catch {
      return new NextResponse(text, {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    try {
      const sessionRes = await fetch(`${SESSION_SERVICE_URL.replace(/\/+$/, "")}/session/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userData.id,
          username: userData.username,
          email: userData.email
        }),
        signal: AbortSignal.timeout(5_000)
      });

      if (sessionRes.ok) {
        const { token } = (await sessionRes.json()) as { token: string };
        const res = NextResponse.json(userData, { status: 200 });
        res.cookies.set("gaz-session", token, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
          maxAge: 86400
        });
        return res;
      }
    } catch {
      // Session service unavailable, return without cookie
    }

    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Serviciul de autentificare este momentan indisponibil." },
      { status: 502 }
    );
  }
}
