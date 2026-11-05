import { NextRequest, NextResponse } from "next/server";
import { isErrorResponse, verifySession } from "@/lib/auth";
import { ensureDefaultLocation, MAX_LOCATIONS_PER_USER, parseLocationFields } from "@/lib/locations";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await verifySession(request);
  if (isErrorResponse(session)) return session;
  await ensureDefaultLocation(session.id);
  const locations = await prisma.location.findMany({
    where: { userId: session.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
  });
  return NextResponse.json(locations);
}

export async function POST(request: NextRequest) {
  const session = await verifySession(request);
  if (isErrorResponse(session)) return session;

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body invalid." }, { status: 400 });
  }
  const { name, address, meterSerial } = parseLocationFields(payload);
  if (!name) {
    return NextResponse.json({ error: "Numele locației este obligatoriu." }, { status: 422 });
  }

  await ensureDefaultLocation(session.id);
  const count = await prisma.location.count({ where: { userId: session.id } });
  if (count >= MAX_LOCATIONS_PER_USER) {
    return NextResponse.json(
      { error: `Poți avea cel mult ${MAX_LOCATIONS_PER_USER} locații.` },
      { status: 422 }
    );
  }
  const duplicate = await prisma.location.findFirst({
    where: { userId: session.id, name: { equals: name, mode: "insensitive" } },
    select: { id: true }
  });
  if (duplicate) {
    return NextResponse.json({ error: "Ai deja o locație cu acest nume." }, { status: 409 });
  }

  const location = await prisma.location.create({
    data: { userId: session.id, name, address: address || null, meterSerial: meterSerial || null }
  });
  return NextResponse.json(location, { status: 201 });
}
