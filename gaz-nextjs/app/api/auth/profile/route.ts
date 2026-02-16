import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

type Payload = {
  userId?: string;
  ownerName?: string | null;
  address?: string | null;
};

const normalize = (value?: string | null) => (value ?? "").trim();

export async function PATCH(request: Request) {
  try {
    let payload: Payload;
    try {
      payload = (await request.json()) as Payload;
    } catch {
      return NextResponse.json({ error: "Body invalid." }, { status: 400 });
    }

    const userId = normalize(payload.userId);
    if (!userId) {
      return NextResponse.json({ error: "Lipsește utilizatorul." }, { status: 422 });
    }

    const updateData: { ownerName?: string | null; address?: string | null } = {};
    if (payload.ownerName !== undefined) {
      const ownerName = normalize(payload.ownerName);
      updateData.ownerName = ownerName ? ownerName : null;
    }
    if (payload.address !== undefined) {
      const address = normalize(payload.address);
      updateData.address = address ? address : null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Nu ai trimis date de actualizat." }, { status: 422 });
    }

    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return NextResponse.json({ error: "Utilizator inexistent." }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        ownerName: true,
        address: true,
        createdAt: true
      }
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("/api/auth/profile error:", err);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}
