import { NextRequest, NextResponse } from "next/server";

import { isErrorResponse, verifySession } from "@/lib/auth";
import {
  clearAdminSessionCookie,
  createAdminSessionResponse,
  verifyAdminPassword
} from "@/lib/admin-session";

type Payload = {
  password?: string;
};

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();

export async function POST(request: NextRequest) {
  const session = await verifySession(request);
  if (isErrorResponse(session)) return session;

  const email = (session.email ?? "").toLowerCase();
  if (!ADMIN_EMAIL || email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Acces interzis." }, { status: 403 });
  }

  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Body invalid." }, { status: 400 });
  }

  const password = (payload.password ?? "").trim();
  const isValid = await verifyAdminPassword(password);
  if (!isValid) {
    return NextResponse.json({ error: "Parola de admin este invalidă." }, { status: 403 });
  }

  const response = createAdminSessionResponse({ id: session.id, email });
  if (!response) {
    return NextResponse.json({ error: "Configurația admin este incompletă." }, { status: 500 });
  }

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true }, { status: 200 });
  clearAdminSessionCookie(response);
  return response;
}
