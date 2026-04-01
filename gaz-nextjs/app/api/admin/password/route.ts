import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { isErrorResponse } from "@/lib/auth";
import { clearAdminSessionCookie, requireAdminSession, verifyAdminPassword } from "@/lib/admin-session";
import prisma from "@/lib/prisma";

type Payload = {
  currentPassword?: string;
  newPassword?: string;
};

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const PASSWORD_MAX_LENGTH = 128;

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
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Parola nouă trebuie să aibă cel puțin 8 caractere." },
        { status: 422 }
      );
    }
    if (newPassword.length > PASSWORD_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Parola nouă poate avea maximum ${PASSWORD_MAX_LENGTH} caractere.` },
        { status: 422 }
      );
    }
    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return NextResponse.json(
        { error: "Parola nouă trebuie să conțină cel puțin o literă și o cifră." },
        { status: 422 }
      );
    }

    const currentValid = await verifyAdminPassword(currentPassword);
    if (!currentValid) {
      return NextResponse.json({ error: "Parola curentă de admin este invalidă." }, { status: 403 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email: ADMIN_EMAIL },
      data: { passwordHash }
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
