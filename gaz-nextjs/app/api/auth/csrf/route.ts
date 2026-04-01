import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

function isSecureRequest(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return forwardedProto === "https" || request.nextUrl.protocol === "https:";
}

export async function GET(request: NextRequest) {
  const existing = request.cookies.get("gaz-csrf")?.value;
  if (existing && existing.length >= 32) {
    const response = NextResponse.json({ csrfToken: existing });
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const res = NextResponse.json({ csrfToken: token });
  res.headers.set("Cache-Control", "no-store");
  res.cookies.set("gaz-csrf", token, {
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: "lax",
    path: "/",
    maxAge: 86400
  });
  return res;
}
