import { NextRequest, NextResponse } from "next/server";

import { isErrorResponse, verifySession } from "@/lib/auth";
import { requireAdminSession } from "@/lib/admin-session";
import prisma from "@/lib/prisma";

const categories = ["GENERAL", "BUG", "BILLING", "READING"] as const;
const isAdmin = (email: string | null) => Boolean(process.env.ADMIN_EMAIL?.trim()) && email?.toLowerCase() === process.env.ADMIN_EMAIL?.trim().toLowerCase();

async function access(request: NextRequest) {
  const session = await verifySession(request);
  if (isErrorResponse(session)) return session;
  const admin = isAdmin(session.email);
  if (admin) {
    const adminSession = await requireAdminSession(request);
    if (isErrorResponse(adminSession)) return adminSession;
  }
  return { session, admin };
}

export async function GET(request: NextRequest) {
  const result = await access(request);
  if (result instanceof NextResponse) return result;
  const conversations = await prisma.supportConversation.findMany({
    // Tichetul rezolvat rămâne în baza de date ca istoric, dar nu mai apare
    // în inboxul curent al clientului sau al administratorului.
    where: { status: { not: "RESOLVED" }, ...(result.admin ? {} : { userId: result.session.id }) },
    orderBy: { updatedAt: "desc" },
    include: {
      user: { select: { username: true, ownerName: true, email: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 }
    }
  });
  return NextResponse.json(conversations);
}

export async function POST(request: NextRequest) {
  const result = await access(request);
  if (result instanceof NextResponse) return result;
  if (result.admin) return NextResponse.json({ error: "Administratorii răspund din conversațiile existente." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { subject?: string; category?: string; message?: string };
  const subject = body.subject?.trim() ?? "";
  const message = body.message?.trim() ?? "";
  const category = categories.includes(body.category as typeof categories[number]) ? body.category as typeof categories[number] : "GENERAL";
  if (subject.length < 3 || subject.length > 120) return NextResponse.json({ error: "Subiectul trebuie să aibă între 3 și 120 de caractere." }, { status: 422 });
  if (message.length < 3 || message.length > 4000) return NextResponse.json({ error: "Mesajul trebuie să aibă între 3 și 4000 de caractere." }, { status: 422 });
  const conversation = await prisma.supportConversation.create({
    data: { userId: result.session.id, subject, category, messages: { create: { body: message, senderType: "CUSTOMER" } } },
    include: { messages: { orderBy: { createdAt: "asc" } } }
  });
  return NextResponse.json(conversation, { status: 201 });
}
