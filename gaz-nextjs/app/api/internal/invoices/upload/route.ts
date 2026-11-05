import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { NextResponse } from "next/server";
import { extractInvoiceDetails, extractInvoiceTariffProfile, findUnusualTariffChanges } from "@/lib/invoices/parser";
import { locationNotFound, resolveLocation } from "@/lib/locations";
import prisma from "@/lib/prisma";

const R2_ENDPOINT = process.env.R2_ENDPOINT?.trim().replace(/\/+$/, "") || "";
const R2_REGION = process.env.R2_REGION?.trim() || "auto";
const R2_BUCKET = process.env.R2_BUCKET?.trim() || "";
const R2_ACCESS_KEY = process.env.R2_ACCESS_KEY?.trim() || "";
const R2_SECRET_KEY = process.env.R2_SECRET_KEY?.trim() || "";
const MAX_INVOICE_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const R2_RETENTION_DAYS = 365;

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 120);

const storageClient = () => new S3Client({
  endpoint: R2_ENDPOINT,
  region: R2_REGION,
  forcePathStyle: true,
  credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY }
});

async function removeExpiredUploads(client: S3Client, userId: string) {
  const retentionDate = new Date(Date.now() - R2_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const expired = await prisma.invoiceUpload.findMany({
    where: { userId, createdAt: { lt: retentionDate } }, select: { id: true, objectKey: true }
  });
  const deletedIds: string[] = [];
  for (const upload of expired) {
    try {
      await client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: upload.objectKey }));
      deletedIds.push(upload.id);
    } catch (error) {
      console.error("R2 old invoice cleanup failed:", error);
    }
  }
  if (deletedIds.length) await prisma.invoiceUpload.deleteMany({ where: { id: { in: deletedIds } } });
}

export async function POST(request: Request) {
  if (!R2_ENDPOINT || !R2_BUCKET || !R2_ACCESS_KEY || !R2_SECRET_KEY) {
    return NextResponse.json({ error: "Configurația serviciului de stocare nu este disponibilă." }, { status: 500 });
  }

  const formData = await request.formData();
  const userId = String(formData.get("userId") ?? "").trim();
  const cityHint = String(formData.get("city") ?? "auto").trim().toLowerCase();
  const file = formData.get("file");
  if (!userId) return NextResponse.json({ error: "Lipsește userId." }, { status: 422 });
  const location = await resolveLocation(userId, formData.get("locationId"));
  if (!location) return locationNotFound();
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Lipsește fișierul PDF." }, { status: 422 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Fișierul trebuie să fie PDF." }, { status: 422 });
  }
  if (file.size > MAX_INVOICE_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: "Fișierul PDF nu poate depăși 20 MB." }, { status: 413 });
  }

  const body = Buffer.from(await file.arrayBuffer());
  const fileHash = createHash("sha256").update(body).digest("hex");
  const existing = await prisma.invoiceUpload.findUnique({
    where: { userId_fileHash: { userId, fileHash } }, select: { createdAt: true }
  });
  if (existing) {
    return NextResponse.json({ error: "Această factură a fost deja încărcată.", duplicate: true, uploadedAt: existing.createdAt }, { status: 409 });
  }

  const objectKey = `${userId}/${Date.now()}-${sanitizeFileName(file.name || "factura.pdf")}`;
  let upload;
  try {
    upload = await prisma.invoiceUpload.create({ data: { userId, fileHash, fileName: file.name || "factura.pdf", objectKey } });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Această factură a fost deja încărcată.", duplicate: true }, { status: 409 });
    }
    throw error;
  }

  const client = storageClient();
  try {
    await client.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: objectKey, Body: body, ContentType: "application/pdf" }));
  } catch (error) {
    await prisma.invoiceUpload.delete({ where: { id: upload.id } }).catch(() => undefined);
    throw error;
  }
  await removeExpiredUploads(client, userId);

  let rawText = body.toString("latin1").replace(/\u0000/g, " ");
  try {
    const parsed = await pdfParse(body);
    if (parsed.text.trim()) rawText = parsed.text;
  } catch (error) {
    console.error("Invoice PDF text extraction failed:", error);
  }

  const profile = extractInvoiceTariffProfile(rawText, cityHint || "auto");
  const details = extractInvoiceDetails(rawText);
  const tariffFields = { pcs: true, gasPriceMwh: true, transportPriceMwh: true, distributionPriceMwh: true, cap26PriceMwh: true, cap6PriceMwh: true, fixedFee: true, vatRate: true } as const;
  const previousProfile =
    (await prisma.locationTariff.findUnique({ where: { locationId: location.id }, select: tariffFields })) ??
    (location.isDefault ? await prisma.tariffProfile.findUnique({ where: { userId }, select: tariffFields }) : null);

  return NextResponse.json({
    message: "Am detectat tarifele din factură. Verifică valorile și confirmă aplicarea lor.",
    uploadId: upload.id,
    city: profile.city,
    profile,
    warnings: findUnusualTariffChanges(previousProfile, profile),
    ...details
  });
}
