import { NextResponse } from "next/server";

const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL?.trim() ??
  "http://auth-service:8083";

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body invalid." }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${AUTH_SERVICE_URL.replace(/\/+$/, "")}/auth/reset-password`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
        cache: "no-store"
      }
    );

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" }
    });
  } catch {
    return NextResponse.json(
      { error: "Serviciul de autentificare este momentan indisponibil." },
      { status: 502 }
    );
  }
}
