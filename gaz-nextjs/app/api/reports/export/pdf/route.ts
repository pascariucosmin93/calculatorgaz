import { NextRequest, NextResponse } from "next/server";
import { verifySession, isErrorResponse } from "@/lib/auth";

const REPORTING_SERVICE_URL =
  process.env.REPORTING_SERVICE_URL?.trim() ??
  "http://reporting-service:8081";

export async function GET(request: NextRequest) {
  const session = await verifySession(request);
  if (isErrorResponse(session)) return session;

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId")?.trim() ?? "";

  if (userId && userId !== session.id) {
    return NextResponse.json({ error: "Acces interzis." }, { status: 403 });
  }

  const targetUserId = userId || session.id;

  try {
    const response = await fetch(
      `${REPORTING_SERVICE_URL.replace(/\/+$/, "")}/report/export.pdf?userId=${encodeURIComponent(targetUserId)}`,
      { cache: "no-store", signal: AbortSignal.timeout(10_000) }
    );

    const body = await response.arrayBuffer();
    if (!response.ok) {
      return NextResponse.json(
        { error: "Serviciul de rapoarte este momentan indisponibil." },
        { status: 502 }
      );
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/pdf",
        "Content-Disposition":
          response.headers.get("content-disposition") ??
          `attachment; filename="report-${targetUserId}.pdf"`
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Serviciul de rapoarte este momentan indisponibil." },
      { status: 502 }
    );
  }
}
