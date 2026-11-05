import { NextRequest, NextResponse } from "next/server";
import { isErrorResponse, verifySession } from "@/lib/auth";
import { locationNotFound, readingScope, resolveLocation } from "@/lib/locations";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await verifySession(request);
  if (isErrorResponse(session)) return session;
  const requestedUser = request.nextUrl.searchParams.get("userId")?.trim();
  if (requestedUser && requestedUser !== session.id) {
    return NextResponse.json({ error: "Acces interzis." }, { status: 403 });
  }
  const location = await resolveLocation(session.id, request.nextUrl.searchParams.get("locationId"));
  if (!location) return locationNotFound();
  const readings = await prisma.reading.findMany({
    where: readingScope(location),
    orderBy: [{ readingAt: "asc" }, { createdAt: "asc" }]
  });
  const header = "Data;Index anterior;Index actual;Consum m3;Consum kWh;PCS;Total lei\n";
  const rows = readings.map((entry) => [
    new Date(entry.readingAt).toLocaleString("ro-RO"),
    entry.previousReading.toFixed(2),
    entry.currentReading.toFixed(2),
    entry.consumptionM3.toFixed(3),
    entry.consumptionKwh.toFixed(2),
    entry.conversionFactor.toFixed(3),
    entry.total.toFixed(2)
  ].join(";")).join("\n");
  return new NextResponse("\uFEFF" + header + rows + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="istoric-consum-gaz.csv"'
    }
  });
}
