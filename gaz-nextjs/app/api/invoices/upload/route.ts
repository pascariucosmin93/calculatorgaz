import { NextRequest, NextResponse } from "next/server";
import { isErrorResponse, verifySession } from "@/lib/auth";

const INVOICE_SERVICE_URL =
  process.env.INVOICE_SERVICE_URL?.trim() ??
  "http://invoice-service:8087";

export async function POST(request: NextRequest) {
  const session = await verifySession(request);
  if (isErrorResponse(session)) return session;

  try {
    const incomingFormData = await request.formData();
    const formData = new FormData();
    const city = incomingFormData.get("city");
    const file = incomingFormData.get("file");

    if (city) {
      formData.set("city", String(city));
    }
    if (file instanceof File) {
      formData.set("file", file);
    }
    formData.set("userId", session.id);

    const response = await fetch(`${INVOICE_SERVICE_URL.replace(/\/+$/, "")}/invoices/upload`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(20_000),
      cache: "no-store"
    });

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Serviciul de facturi este momentan indisponibil."
      },
      { status: 502 }
    );
  }
}
