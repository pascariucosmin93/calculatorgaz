import { NextRequest, NextResponse } from "next/server";

const SESSION_SERVICE_URL =
  process.env.SESSION_SERVICE_URL?.trim() ??
  "http://session-service:8088";

type SessionUser = {
  id: string;
  username: string;
  email: string | null;
};

/**
 * Verifică sesiunea din cookie-ul gaz-session.
 * Returnează user-ul autentificat sau un NextResponse 401.
 */
export async function verifySession(
  request: NextRequest | Request
): Promise<SessionUser | NextResponse> {
  const cookie =
    request instanceof NextRequest
      ? request.cookies.get("gaz-session")?.value
      : parseCookie(request.headers.get("cookie") ?? "", "gaz-session");

  if (!cookie) {
    return NextResponse.json(
      { error: "Nu ești autentificat." },
      { status: 401 }
    );
  }

  try {
    const res = await fetch(
      `${SESSION_SERVICE_URL.replace(/\/+$/, "")}/session/verify`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: cookie }),
        signal: AbortSignal.timeout(5_000),
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Sesiune expirată." },
        { status: 401 }
      );
    }

    const payload = await res.json();
    return {
      id: payload.id,
      username: payload.username,
      email: payload.email ?? null,
    };
  } catch {
    return NextResponse.json(
      { error: "Session service indisponibil." },
      { status: 502 }
    );
  }
}

/** Helpers */
function parseCookie(header: string, name: string): string | undefined {
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match?.[1];
}

export function isErrorResponse(
  result: SessionUser | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
