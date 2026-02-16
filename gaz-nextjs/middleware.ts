import { NextRequest, NextResponse } from "next/server";

const DEFAULT_RESET_BASE_URL = "https://reset.gaz.cosmin-lab.cloud/";

function getResetHost() {
  const rawBase = process.env.RESET_PASSWORD_BASE_URL ?? DEFAULT_RESET_BASE_URL;
  try {
    return new URL(rawBase).host.toLowerCase();
  } catch {
    return new URL(DEFAULT_RESET_BASE_URL).host.toLowerCase();
  }
}

const RESET_HOST = getResetHost();

export function middleware(request: NextRequest) {
  const requestHost = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();

  const isResetDomain = requestHost === RESET_HOST;
  const pathname = request.nextUrl.pathname;

  if (
    !isResetDomain ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/resetare")
  ) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/resetare";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/:path*"]
};
