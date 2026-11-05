import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { isErrorResponse, verifySession } from "@/lib/auth";
import prisma from "@/lib/prisma";

const INVOICE_SERVICE_URL =
  process.env.INVOICE_SERVICE_URL?.trim() ??
  "http://invoice-service:8087";
const MAX_INVOICE_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const R2_ENDPOINT = process.env.R2_ENDPOINT?.trim().replace(/\/+$/, "") || "";
const R2_REGION = process.env.R2_REGION?.trim() || "auto";
const R2_BUCKET = process.env.R2_BUCKET?.trim() || "";
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY?.trim() || "";
const R2_SECRET_KEY = process.env.R2_SECRET_KEY?.trim() || "";

export async function POST(request: NextRequest) {
  const session = await verifySession(request);
  if (isErrorResponse(session)) return session;

  try {
    const incomingFormData = await request.formData();
    const formData = new FormData();
    const city = incomingFormData.get("city");
    const file = incomingFormData.get("file");

    if (file instanceof File && file.size > MAX_INVOICE_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Fișierul PDF nu poate depăși 20 MB." },
        { status: 413 }
      );
    }

    const locationId = incomingFormData.get("locationId");

    if (city) {
      formData.set("city", String(city));
    }
    if (typeof locationId === "string" && locationId.trim()) {
      formData.set("locationId", locationId.trim());
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
    if (!text.trim()) {
      return NextResponse.json(
        { error: `Serviciul de facturi a răspuns fără conținut (HTTP ${response.status}).` },
        { status: response.status || 502 }
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return NextResponse.json(
        { error: `Serviciul de facturi a răspuns cu un format neașteptat (HTTP ${response.status}).` },
        { status: response.status || 502 }
      );
    }

    return new NextResponse(text, {
      status: response.status,
      headers: { "Content-Type": contentType }
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

export async function DELETE(request: NextRequest) {
  const session = await verifySession(request);
  if (isErrorResponse(session)) return session;
  if (!R2_ENDPOINT || !R2_BUCKET || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
    return NextResponse.json({ error: "Configurația serviciului de stocare nu este disponibilă." }, { status: 500 });
  }

  try {
    const payload = (await request.json()) as { uploadId?: unknown };
    const uploadId = typeof payload.uploadId === "string" ? payload.uploadId.trim() : "";
    if (!uploadId) return NextResponse.json({ error: "Lipsește identificatorul facturii." }, { status: 422 });

    const upload = await prisma.invoiceUpload.findFirst({
      where: { id: uploadId, userId: session.id },
      select: { id: true, objectKey: true }
    });
    if (!upload) return NextResponse.json({ error: "Factura nu a fost găsită." }, { status: 404 });

    const client = new S3Client({
      endpoint: R2_ENDPOINT,
      region: R2_REGION,
      forcePathStyle: true,
      credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY }
    });
    await client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: upload.objectKey }));
    await prisma.invoiceUpload.delete({ where: { id: upload.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Nu am putut șterge factura încărcată." }, { status: 502 });
  }
}
