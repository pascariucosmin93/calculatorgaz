import { NextRequest, NextResponse } from "next/server";
import { verifySession, isErrorResponse } from "@/lib/auth";

const READING_SERVICE_URL =
  process.env.READING_SERVICE_URL?.trim() ??
  "http://reading-service:8084";

export async function GET(request: NextRequest) {
  const session = await verifySession(request);
  if (isErrorResponse(session)) return session;

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId") ?? "";

  if (userId && userId !== session.id) {
    return NextResponse.json({ error: "Acces interzis." }, { status: 403 });
  }

  const targetUserId = userId || session.id;

  try {
    const response = await fetch(
      `${READING_SERVICE_URL.replace(/\/+$/, "")}/readings?userId=${encodeURIComponent(targetUserId)}`,
      { cache: "no-store", signal: AbortSignal.timeout(10_000) }
    );
    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" }
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Serviciul de citiri este momentan indisponibil." },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await verifySession(request);
  if (isErrorResponse(session)) return session;

  try {
    const body = await request.json();
    body.userId = session.id;

    const response = await fetch(`${READING_SERVICE_URL.replace(/\/+$/, "")}/readings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000)
    });
    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" }
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Serviciul de citiri este momentan indisponibil." },
      { status: 502 }
    );
  }
}
