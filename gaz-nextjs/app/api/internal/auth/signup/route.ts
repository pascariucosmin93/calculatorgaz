import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import prisma from "@/lib/prisma";
import { validateEmail, validatePasswordStrength, validateUsername } from "@/lib/validation";

type Payload = {
  username: string;
  email: string;
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

    const username = sanitize(payload.username ?? "");
    const email = sanitize((payload.email ?? "").toLowerCase());
    const password = payload.password ?? "";

    const usernameError = validateUsername(username);
    if (usernameError) {
      return NextResponse.json({ error: usernameError }, { status: 422 });
    }

    const emailError = validateEmail(email);
    if (emailError) {
      return NextResponse.json({ error: emailError }, { status: 422 });
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 422 });
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: username.toLowerCase() }, { email }]
      }
    });

    if (existing) {
      const conflictMessage =
        existing.username === username.toLowerCase()
          ? "Utilizatorul există deja."
          : "Adresa de email este deja folosită.";
      return NextResponse.json({ error: conflictMessage }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username: username.toLowerCase(),
        email,
        ownerName: username.toUpperCase(),
        passwordHash
      },
      select: {
        id: true,
        username: true,
        email: true,
        ownerName: true,
        address: true,
        meterSerial: true,
        createdAt: true,
        tokenVersion: true
      }
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    console.error("/api/auth/signup error:", err);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}
