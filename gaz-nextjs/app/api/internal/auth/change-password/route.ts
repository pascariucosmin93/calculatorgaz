import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { validatePasswordStrength } from "@/lib/validation";

type Payload = {
  userId?: string;
  currentPassword?: string;
  newPassword?: string;
};

export async function POST(request: Request) {
  try {
    let payload: Payload;
    try {
      payload = (await request.json()) as Payload;
    } catch {
      return NextResponse.json({ error: "Body invalid." }, { status: 400 });
    }

    const userId = (payload.userId ?? "").trim();
    const currentPassword = payload.currentPassword ?? "";
    const newPassword = payload.newPassword ?? "";

    if (!userId || !currentPassword) {
      return NextResponse.json({ error: "Parola curentă este obligatorie." }, { status: 422 });
    }
    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) {
      return NextResponse.json({ error: passwordError.replace("Parola", "Parola nouă") }, { status: 422 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return NextResponse.json({ error: "Parola curentă este incorectă." }, { status: 403 });
    }
    if (await bcrypt.compare(newPassword, user.passwordHash)) {
      return NextResponse.json(
        { error: "Parola nouă trebuie să fie diferită de parola curentă." },
        { status: 422 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 10),
        tokenVersion: { increment: 1 }
      },
      select: { tokenVersion: true }
    });

    return NextResponse.json({
      message: "Parola a fost schimbată.",
      tokenVersion: updated.tokenVersion
    });
  } catch (error) {
    console.error("/api/internal/auth/change-password error:", error);
    return NextResponse.json({ error: "Eroare server." }, { status: 500 });
  }
}
