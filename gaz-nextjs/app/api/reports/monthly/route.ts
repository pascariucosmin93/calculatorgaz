import { NextResponse } from "next/server";

const REPORTING_SERVICE_URL =
  process.env.REPORTING_SERVICE_URL?.trim() ??
  "http://reporting-service:8081";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId")?.trim() ?? "";

  if (!userId) {
    return NextResponse.json({ error: "Lipsește userId." }, { status: 400 });
  }

  try {
    const response = await fetch(
      `${REPORTING_SERVICE_URL.replace(/\/+$/, "")}/report/monthly?userId=${encodeURIComponent(userId)}`,
      { cache: "no-store" }
    );

    const text = await response.text();
    if (!response.ok) {
      return NextResponse.json(
        { error: "Serviciul de rapoarte este momentan indisponibil." },
        { status: 502 }
      );
    }

    return new NextResponse(text, {
      status: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" }
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Serviciul de rapoarte este momentan indisponibil." },
      { status: 502 }
    );
  }
}
