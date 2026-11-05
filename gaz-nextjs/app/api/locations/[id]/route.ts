import { NextRequest, NextResponse } from "next/server";
import { isErrorResponse, verifySession } from "@/lib/auth";
import { parseLocationFields } from "@/lib/locations";
import { deleteReadingPhoto } from "@/lib/reading-photo";
import prisma from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Context) {
  const session = await verifySession(request);
  if (isErrorResponse(session)) return session;
  const { id } = await params;

  const location = await prisma.location.findFirst({ where: { id, userId: session.id } });
  if (!location) return NextResponse.json({ error: "Locația nu există." }, { status: 404 });

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body invalid." }, { status: 400 });
  }
  const { name, address, meterSerial } = parseLocationFields(payload);
  if (name !== undefined && !name) {
    return NextResponse.json({ error: "Numele locației este obligatoriu." }, { status: 422 });
  }
  if (name !== undefined) {
    const duplicate = await prisma.location.findFirst({
      where: { userId: session.id, id: { not: location.id }, name: { equals: name, mode: "insensitive" } },
      select: { id: true }
    });
    if (duplicate) return NextResponse.json({ error: "Ai deja o locație cu acest nume." }, { status: 409 });
  }

  const data = {
    ...(name !== undefined ? { name } : {}),
    ...(address !== undefined ? { address: address || null } : {}),
    ...(meterSerial !== undefined ? { meterSerial: meterSerial || null } : {})
  };
  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.location.update({ where: { id: location.id }, data });
    // Versiunea stable citește adresa și seria din User: locația implicită le păstrează sincronizate.
    if (location.isDefault && (address !== undefined || meterSerial !== undefined)) {
      await tx.user.update({
        where: { id: session.id },
        data: {
          ...(address !== undefined ? { address: address || null } : {}),
          ...(meterSerial !== undefined ? { meterSerial: meterSerial || null } : {})
        }
      });
    }
    return saved;
  });
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const session = await verifySession(request);
  if (isErrorResponse(session)) return session;
  const { id } = await params;

  const location = await prisma.location.findFirst({ where: { id, userId: session.id } });
  if (!location) return NextResponse.json({ error: "Locația nu există." }, { status: 404 });
  if (location.isDefault) {
    return NextResponse.json({ error: "Locația principală nu poate fi ștearsă." }, { status: 422 });
  }

  const readings = await prisma.reading.findMany({
    where: { userId: session.id, locationId: location.id },
    select: { photoKey: true }
  });
  await prisma.$transaction([
    prisma.reading.deleteMany({ where: { userId: session.id, locationId: location.id } }),
    prisma.location.delete({ where: { id: location.id } })
  ]);
  for (const { photoKey } of readings) {
    if (photoKey) await deleteReadingPhoto(photoKey).catch((error) => console.error("Failed to delete reading photo", error));
  }
  return NextResponse.json({ ok: true });
}
