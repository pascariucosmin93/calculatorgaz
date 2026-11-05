import { NextRequest, NextResponse } from "next/server";
import { isErrorResponse, verifySession } from "@/lib/auth";
import { locationNotFound, resolveLocation, tariffHistoryScope } from "@/lib/locations";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await verifySession(request);
  if (isErrorResponse(session)) return session;

  const location = await resolveLocation(session.id, request.nextUrl.searchParams.get("locationId"));
  if (!location) return locationNotFound();

  const history = await prisma.tariffHistory.findMany({
    where: tariffHistoryScope(location),
    orderBy: [{ validFrom: "desc" }, { createdAt: "desc" }],
    take: 50
  });

  return NextResponse.json(history);
}
