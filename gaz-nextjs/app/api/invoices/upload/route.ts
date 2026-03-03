import { NextResponse } from "next/server";

const INVOICE_SERVICE_URL =
  process.env.INVOICE_SERVICE_URL?.trim() ??
  "http://invoice-service:8087";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
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
