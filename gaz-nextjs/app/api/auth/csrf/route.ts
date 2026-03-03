import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const existing = request.cookies.get("gaz-csrf")?.value;
  if (existing && existing.length >= 32) {
    return NextResponse.json({ csrfToken: existing });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const res = NextResponse.json({ csrfToken: token });
  res.cookies.set("gaz-csrf", token, {
    httpOnly: false,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 86400
  });
  return res;
}
