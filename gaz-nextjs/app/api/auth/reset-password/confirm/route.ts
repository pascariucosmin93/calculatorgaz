import { NextResponse } from "next/server";

const PASSWORD_RESET_SERVICE_URL =
  process.env.PASSWORD_RESET_SERVICE_URL?.trim() ??
  "http://password-reset-service:8086";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const response = await fetch(
      `${PASSWORD_RESET_SERVICE_URL.replace(/\/+$/, "")}/password-reset/confirm`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: AbortSignal.timeout(10_000),
        cache: "no-store"
      }
    );

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: `Password reset service indisponibil: ${
          error instanceof Error ? error.message : "unknown"
        }`
      },
      { status: 502 }
    );
  }
}
