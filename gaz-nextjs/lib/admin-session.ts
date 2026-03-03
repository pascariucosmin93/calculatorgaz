import bcrypt from "bcryptjs";
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { isErrorResponse, verifySession } from "@/lib/auth";

export const ADMIN_SESSION_COOKIE = "gaz-admin-session";
const ADMIN_SESSION_MAX_AGE_SECONDS = 15 * 60;
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const ADMIN_PASSWORD_RAW = process.env.ADMIN_PASSWORD ?? "";

let adminPasswordHash: string | null = null;
let hashPromise: Promise<string> | null = null;

type AdminSessionPayload = {
  sub: string;
  email: string;
  exp: number;
};

type SessionIdentity = {
  id: string;
  email: string;
};

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

function getSigningSecret(): Buffer | null {
  const raw = (process.env.ADMIN_SESSION_SECRET ?? ADMIN_PASSWORD_RAW).trim();
  if (!raw) {
    return null;
  }
  return crypto.createHash("sha256").update(raw).digest();
}

function signPayload(encodedPayload: string): string {
  const secret = getSigningSecret();
  if (!secret) return "";
  return crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
}

function buildToken(payload: AdminSessionPayload): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function parseCookie(header: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = header.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`));
  return match?.[1] ?? "";
}

function readCookie(request: NextRequest | Request, name: string): string {
  if (request instanceof NextRequest) {
    return request.cookies.get(name)?.value ?? "";
  }
  return parseCookie(request.headers.get("cookie") ?? "", name);
}

function verifyToken(token: string, expectedIdentity: SessionIdentity): boolean {
  if (!token) return false;
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return false;

  const expectedSignature = signPayload(encodedPayload);
  if (!expectedSignature) return false;

  const provided = Buffer.from(signature, "base64url");
  const expected = Buffer.from(expectedSignature, "base64url");
  if (provided.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(provided, expected)) return false;

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8")
    ) as AdminSessionPayload;
    if (!payload || payload.sub !== expectedIdentity.id) return false;
    if ((payload.email ?? "").toLowerCase() !== expectedIdentity.email) return false;
    if (typeof payload.exp !== "number") return false;
    if (Date.now() >= payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}

export function createAdminSessionResponse(identity: SessionIdentity): NextResponse | null {
  const secret = getSigningSecret();
  if (!secret || !ADMIN_EMAIL) return null;

  const token = buildToken({
    sub: identity.id,
    email: identity.email,
    exp: Date.now() + ADMIN_SESSION_MAX_AGE_SECONDS * 1000
  });

  if (!token) return null;

  const response = NextResponse.json({ ok: true }, { status: 200 });
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS
  });
  return response;
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 0
  });
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const hash = await getAdminHash();
  if (!hash || !ADMIN_EMAIL) return false;
  const normalized = password.trim();
  if (!normalized) return false;
  return bcrypt.compare(normalized, hash);
}

export async function requireAdminSession(request: NextRequest | Request) {
  const session = await verifySession(request);
  if (isErrorResponse(session)) {
    return session;
  }

  const email = (session.email ?? "").toLowerCase();
  if (!ADMIN_EMAIL || email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Acces interzis." }, { status: 403 });
  }

  const token = readCookie(request, ADMIN_SESSION_COOKIE);
  if (!verifyToken(token, { id: session.id, email })) {
    return NextResponse.json({ error: "Sesiunea admin a expirat." }, { status: 403 });
  }

  return session;
}
