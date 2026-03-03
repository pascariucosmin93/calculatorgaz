import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/lib/admin-session";

export async function POST() {
  const res = NextResponse.json({ message: "Deconectat." });
  res.cookies.set("gaz-session", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
  clearAdminSessionCookie(res);
  return res;
}
