import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import prisma from "@/lib/prisma";

type Payload = {
  identifier?: string;
  username?: string;
  password: string;
};

const sanitize = (value: string) => value.trim();

export async function POST(request: Request) {
  try {
    let payload: Payload;
    try {
      payload = (await request.json()) as Payload;
    } catch {
      return NextResponse.json({ error: "Body invalid." }, { status: 400 });
    }

    const identifier = sanitize(payload.identifier ?? payload.username ?? "");
    const password = payload.password ?? "";

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "Introdu emailul sau utilizatorul și parola." },
        { status: 422 }
      );
    }

    const normalizedIdentifier = identifier.toLowerCase();
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: normalizedIdentifier }, { email: normalizedIdentifier }]
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Date de autentificare invalide." }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Date de autentificare invalide." }, { status: 401 });
    }

    return NextResponse.json(
      { id: user.id, username: user.username, email: user.email, createdAt: user.createdAt },
      { status: 200 }
    );
  } catch (err) {
    console.error("/api/auth/login error:", err);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}
