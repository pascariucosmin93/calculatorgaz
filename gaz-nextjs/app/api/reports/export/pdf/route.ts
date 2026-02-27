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
      `${REPORTING_SERVICE_URL.replace(/\/+$/, "")}/report/export.pdf?userId=${encodeURIComponent(userId)}`,
      { cache: "no-store" }
    );

    const body = await response.arrayBuffer();
    if (!response.ok) {
      const text = Buffer.from(body).toString("utf8");
      return NextResponse.json(
        { error: `Reporting service error (${response.status}): ${text}` },
        { status: 502 }
      );
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/pdf",
        "Content-Disposition":
          response.headers.get("content-disposition") ??
          `attachment; filename="report-${userId}.pdf"`
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Nu pot contacta reporting-service: ${error instanceof Error ? error.message : "unknown"}` },
      { status: 502 }
    );
  }
}
