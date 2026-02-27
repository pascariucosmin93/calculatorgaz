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
      `${REPORTING_SERVICE_URL.replace(/\/+$/, "")}/report/export.csv?userId=${encodeURIComponent(userId)}`,
      { cache: "no-store" }
    );

    const text = await response.text();
    if (!response.ok) {
      return NextResponse.json(
        { error: `Reporting service error (${response.status}): ${text}` },
        { status: 502 }
      );
    }

    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "text/csv; charset=utf-8",
        "Content-Disposition":
          response.headers.get("content-disposition") ??
          `attachment; filename="report-${userId}.csv"`
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Nu pot contacta reporting-service: ${error instanceof Error ? error.message : "unknown"}` },
      { status: 502 }
    );
  }
}
