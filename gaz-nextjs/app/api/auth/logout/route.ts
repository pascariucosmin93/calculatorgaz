import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ message: "Deconectat." });
  res.cookies.set("gaz-session", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
  return res;
}
