import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { isErrorResponse } from "@/lib/auth";
import { clearAdminSessionCookie, requireAdminSession, verifyAdminPassword } from "@/lib/admin-session";
import prisma from "@/lib/prisma";
import { validatePasswordStrength } from "@/lib/validation";

type Payload = {
  currentPassword?: string;
  newPassword?: string;
};

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();

export async function PATCH(request: NextRequest) {
  try {
    const adminSession = await requireAdminSession(request);
    if (isErrorResponse(adminSession)) return adminSession;

    let payload: Payload;
    try {
      payload = (await request.json()) as Payload;
    } catch {
      return NextResponse.json({ error: "Body invalid." }, { status: 400 });
    }

    const currentPassword = (payload.currentPassword ?? "").trim();
    const newPassword = payload.newPassword ?? "";

    if (!currentPassword) {
      return NextResponse.json({ error: "Parola curentă este obligatorie." }, { status: 422 });
    }
    if (!newPassword) {
      return NextResponse.json({ error: "Parola nouă este obligatorie." }, { status: 422 });
    }
    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) {
      return NextResponse.json({ error: passwordError.replace("Parola", "Parola nouă") }, { status: 422 });
    }

    const currentValid = await verifyAdminPassword(currentPassword);
    if (!currentValid) {
      return NextResponse.json({ error: "Parola curentă de admin este invalidă." }, { status: 403 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { passwordHash, tokenVersion: { increment: 1 } }
    });

    const response = NextResponse.json(
      { ok: true, message: "Parola de admin a fost actualizată. Reautentifică-te în panoul de admin." },
      { status: 200 }
    );
    clearAdminSessionCookie(response);
    return response;
  } catch (err) {
    console.error("/api/admin/password error:", err);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}
