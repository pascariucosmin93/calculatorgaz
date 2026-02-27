import { NextResponse } from "next/server";

const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL?.trim() ??
  "http://auth-service:8083";

export async function PATCH(request: Request) {
  try {
    const body = await request.text();
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
      { error: `Auth service indisponibil: ${error instanceof Error ? error.message : "unknown"}` },
      { status: 502 }
    );
  }
}
