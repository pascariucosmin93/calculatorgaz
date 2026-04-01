import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { ensureAdminUser } from "@/lib/admin-bootstrap";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw(Prisma.sql`SELECT 1`);
    await ensureAdminUser();
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Health check failed", error);
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
