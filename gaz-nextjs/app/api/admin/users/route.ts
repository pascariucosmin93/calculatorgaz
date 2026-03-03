import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

type Payload = {
  email?: string;
  password?: string;
  userId?: string;
};

const normalize = (value?: string | null) => (value ?? "").trim();

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").toLowerCase();

// Hash the admin password lazily on first use (async, non-blocking)
const ADMIN_PASSWORD_RAW = process.env.ADMIN_PASSWORD;
let adminPasswordHash: string | null = null;
let hashPromise: Promise<string> | null = null;

function getAdminHash(): Promise<string> | null {
  if (adminPasswordHash) return Promise.resolve(adminPasswordHash);
  if (hashPromise) return hashPromise;
  if (!ADMIN_PASSWORD_RAW || ADMIN_PASSWORD_RAW.length === 0) return null;

  hashPromise = bcrypt.hash(ADMIN_PASSWORD_RAW, 10).then((hash) => {
    adminPasswordHash = hash;
    return hash;
  });
  return hashPromise;
}

const isAuthorized = async (payload: Payload): Promise<boolean> => {
  const hash = await getAdminHash();
  if (!hash || !ADMIN_EMAIL) return false;
  const email = normalize(payload.email).toLowerCase();
  const password = normalize(payload.password);
  if (email !== ADMIN_EMAIL) return false;
  return bcrypt.compare(password, hash);
};

export async function POST(request: Request) {
  try {
    let payload: Payload;
    try {
      payload = (await request.json()) as Payload;
    } catch {
      return NextResponse.json({ error: "Body invalid." }, { status: 400 });
    }

    if (!(await isAuthorized(payload))) {
      return NextResponse.json({ error: "Acces interzis." }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        email: true,
        ownerName: true,
        address: true,
        createdAt: true
      }
    });

    return NextResponse.json(users, { status: 200 });
  } catch (err) {
    console.error("/api/admin/users error:", err);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    let payload: Payload;
    try {
      payload = (await request.json()) as Payload;
    } catch {
      return NextResponse.json({ error: "Body invalid." }, { status: 400 });
    }

    if (!(await isAuthorized(payload))) {
      return NextResponse.json({ error: "Acces interzis." }, { status: 403 });
    }

    const userId = normalize(payload.userId);
    if (!userId) {
      return NextResponse.json({ error: "Lipsește utilizatorul." }, { status: 422 });
    }

    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true }
    });

    if (!userToDelete) {
      return NextResponse.json({ error: "Utilizatorul nu există." }, { status: 404 });
    }

    const normalizedTargetEmail = normalize(userToDelete.email).toLowerCase();
    const normalizedTargetUsername = normalize(userToDelete.username).toLowerCase();
    if (
      normalizedTargetEmail === ADMIN_EMAIL ||
      normalizedTargetUsername === ADMIN_EMAIL
    ) {
      return NextResponse.json(
        { error: "Contul de admin nu poate fi șters." },
        { status: 403 }
      );
    }

    await prisma.user.delete({ where: { id: userId } });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("/api/admin/users delete error:", err);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}
