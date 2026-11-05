import { NextRequest, NextResponse } from "next/server";
import { isErrorResponse, verifySession } from "@/lib/auth";
import { clearAdminSessionCookie } from "@/lib/admin-session";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await verifySession(request);
  if (!isErrorResponse(session)) {
    // Crește tokenVersion ca sesiunea să fie invalidată server-side imediat,
    // nu doar prin ștergerea cookie-ului din browser (tokenul JWT rămâne
    // altfel valid până la 24h dacă a fost copiat/furat înainte de logout).
    await prisma.user
      .update({ where: { id: session.id }, data: { tokenVersion: { increment: 1 } } })
      .catch((err: unknown) => console.warn("Logout tokenVersion bump failed:", err));
  }

  const res = NextResponse.json({ message: "Deconectat." });
  res.cookies.set("gaz-session", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
  clearAdminSessionCookie(res);
  return res;
}
