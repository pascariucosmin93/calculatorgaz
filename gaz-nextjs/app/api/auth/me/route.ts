import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

const SESSION_SERVICE_URL =
  process.env.SESSION_SERVICE_URL?.trim() ??
  "http://session-service:8088";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();

export async function GET(request: NextRequest) {
  const token = request.cookies.get("gaz-session")?.value;
  if (!token) {
    return NextResponse.json({ error: "Nu ești autentificat." }, { status: 401 });
  }

  try {
    const res = await fetch(`${SESSION_SERVICE_URL.replace(/\/+$/, "")}/session/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      signal: AbortSignal.timeout(5_000)
    });

    if (!res.ok) {
      const resp = NextResponse.json({ error: "Sesiune expirată." }, { status: 401 });
      resp.cookies.set("gaz-session", "", { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 0 });
      return resp;
    }

    const payload = await res.json();
    const email = payload.email ?? null;
    const isAdmin = ADMIN_EMAIL !== "" && email?.toLowerCase() === ADMIN_EMAIL;

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { ownerName: true, address: true, meterSerial: true, createdAt: true }
    });

    return NextResponse.json({
      id: payload.id,
      username: payload.username,
      email,
      ownerName: user?.ownerName ?? null,
      address: user?.address ?? null,
      meterSerial: user?.meterSerial ?? null,
      createdAt: user?.createdAt ?? null,
      isAdmin
    });
  } catch {
    return NextResponse.json({ error: "Session service indisponibil." }, { status: 502 });
  }
}
