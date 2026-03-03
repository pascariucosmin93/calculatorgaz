import { NextResponse } from "next/server";

const READING_SERVICE_URL =
  process.env.READING_SERVICE_URL?.trim() ??
  "http://reading-service:8084";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId") ?? "";
    const response = await fetch(
      `${READING_SERVICE_URL.replace(/\/+$/, "")}/readings?userId=${encodeURIComponent(userId)}`,
      { cache: "no-store" }
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

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const response = await fetch(`${READING_SERVICE_URL.replace(/\/+$/, "")}/readings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store"
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
