import { NextRequest, NextResponse } from "next/server";

import { isErrorResponse, verifySession } from "@/lib/auth";
import { requireAdminSession } from "@/lib/admin-session";
import prisma from "@/lib/prisma";

const statuses = ["OPEN", "IN_PROGRESS", "RESOLVED"] as const;
const isAdmin = (email: string | null) => Boolean(process.env.ADMIN_EMAIL?.trim()) && email?.toLowerCase() === process.env.ADMIN_EMAIL?.trim().toLowerCase();

async function conversationAccess(request: NextRequest, id: string) {
  const session = await verifySession(request);
  if (isErrorResponse(session)) return session;
  const admin = isAdmin(session.email);
  if (admin) {
    const adminSession = await requireAdminSession(request);
    if (isErrorResponse(adminSession)) return adminSession;
  }
  const conversation = await prisma.supportConversation.findUnique({ where: { id }, include: { user: { select: { username: true, ownerName: true, email: true } }, messages: { orderBy: { createdAt: "asc" } } } });
  if (!conversation) return NextResponse.json({ error: "Conversația nu există." }, { status: 404 });
  if (!admin && conversation.userId !== session.id) return NextResponse.json({ error: "Acces interzis." }, { status: 403 });
  return { conversation, admin };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await conversationAccess(request, (await params).id);
  return result instanceof NextResponse ? result : NextResponse.json(result.conversation);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await conversationAccess(request, (await params).id);
  if (result instanceof NextResponse) return result;
  const body = await request.json().catch(() => ({})) as { message?: string };
  const message = body.message?.trim() ?? "";
  if (message.length < 1 || message.length > 4000) return NextResponse.json({ error: "Mesajul trebuie să aibă cel mult 4000 de caractere." }, { status: 422 });
  if (!result.admin && result.conversation.status === "RESOLVED") return NextResponse.json({ error: "Această solicitare este rezolvată. Deschide una nouă dacă problema persistă." }, { status: 409 });
  await prisma.$transaction([
    prisma.supportMessage.create({ data: { conversationId: result.conversation.id, body: message, senderType: result.admin ? "DEVELOPER" : "CUSTOMER" } }),
    prisma.supportConversation.update({ where: { id: result.conversation.id }, data: { status: result.admin ? "IN_PROGRESS" : "OPEN" } })
  ]);
  return NextResponse.json(await prisma.supportConversation.findUnique({ where: { id: result.conversation.id }, include: { user: { select: { username: true, ownerName: true, email: true } }, messages: { orderBy: { createdAt: "asc" } } } }));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await conversationAccess(request, (await params).id);
  if (result instanceof NextResponse) return result;
  if (!result.admin) return NextResponse.json({ error: "Doar dezvoltatorii pot actualiza starea." }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { status?: string };
  if (!statuses.includes(body.status as typeof statuses[number])) return NextResponse.json({ error: "Stare invalidă." }, { status: 422 });
  return NextResponse.json(await prisma.supportConversation.update({ where: { id: result.conversation.id }, data: { status: body.status as typeof statuses[number] } }));
}
