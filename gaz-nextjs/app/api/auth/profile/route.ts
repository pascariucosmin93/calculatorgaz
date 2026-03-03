import { NextRequest, NextResponse } from "next/server";
import { isErrorResponse, verifySession } from "@/lib/auth";

const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL?.trim() ??
  "http://auth-service:8083";

export async function PATCH(request: NextRequest) {
  const session = await verifySession(request);
  if (isErrorResponse(session)) return session;

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body invalid." }, { status: 400 });
  }

  try {
    const body = JSON.stringify({ ...payload, userId: session.id });
    const response = await fetch(`${AUTH_SERVICE_URL.replace(/\/+$/, "")}/auth/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(10_000),
      cache: "no-store"
    });

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" }
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Serviciul de autentificare este momentan indisponibil." },
      { status: 502 }
    );
  }
}
