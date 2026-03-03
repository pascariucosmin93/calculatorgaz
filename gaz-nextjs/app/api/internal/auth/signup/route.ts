import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import prisma from "@/lib/prisma";

type Payload = {
  username: string;
  email: string;
  password: string;
};

const sanitize = (value: string) => value.trim();
const USERNAME_MAX_LENGTH = 32;
const EMAIL_MAX_LENGTH = 254;
const PASSWORD_MAX_LENGTH = 128;

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

    if (!username || username.length < 3) {
      return NextResponse.json(
        { error: "Numele de utilizator trebuie să aibă cel puțin 3 caractere." },
        { status: 422 }
      );
    }
    if (username.length > USERNAME_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Numele de utilizator poate avea maximum ${USERNAME_MAX_LENGTH} caractere.` },
        { status: 422 }
      );
    }

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "Introdu o adresă de email validă." }, { status: 422 });
    }
    if (email.length > EMAIL_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Emailul poate avea maximum ${EMAIL_MAX_LENGTH} caractere.` },
        { status: 422 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Parola trebuie să aibă cel puțin 8 caractere." },
        { status: 422 }
      );
    }
    if (password.length > PASSWORD_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Parola poate avea maximum ${PASSWORD_MAX_LENGTH} caractere.` },
        { status: 422 }
      );
    }

    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: "Parola trebuie să conțină cel puțin o literă și o cifră." },
        { status: 422 }
      );
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
        createdAt: true
      }
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    console.error("/api/auth/signup error:", err);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}
