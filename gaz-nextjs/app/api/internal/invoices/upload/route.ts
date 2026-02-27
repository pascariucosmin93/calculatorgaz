import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

const S3_ENDPOINT = process.env.SEAWEED_S3_ENDPOINT?.trim() || "https://s3.galeata.devjobs.ro";
const S3_REGION = process.env.SEAWEED_S3_REGION?.trim() || "us-east-1";
const S3_BUCKET = process.env.SEAWEED_S3_BUCKET?.trim() || "facturi";
const S3_ACCESS_KEY = process.env.SEAWEED_S3_ACCESS_KEY?.trim() || "";
const S3_SECRET_KEY = process.env.SEAWEED_S3_SECRET_KEY?.trim() || "";

type TariffProfile = {
  city: string;
  pcs: number;
  gasPriceMwh: number;
  transportPriceMwh: number;
  distributionPriceMwh: number;
  cap26PriceMwh: number;
  cap6PriceMwh: number;
  fixedFee: number;
  vatRate: number;
};

const DEFAULT_PROFILE: TariffProfile = {
  city: "generic",
  pcs: 10.548,
  gasPriceMwh: 171.44,
  transportPriceMwh: 13.8,
  distributionPriceMwh: 70.96,
  cap26PriceMwh: -20.54,
  cap6PriceMwh: -0.063,
  fixedFee: 0,
  vatRate: 0.21
};

const CITY_PROFILES: Record<string, Partial<TariffProfile>> = {
  bucuresti: { city: "bucuresti", distributionPriceMwh: 79.8, transportPriceMwh: 14.2 },
  iasi: { city: "iasi", distributionPriceMwh: 66.4, transportPriceMwh: 13.3 }
};

const toNumber = (value: string) => {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const detectCity = (text: string) => {
  const lowered = text.toLowerCase();
  if (/\bbucure[șs]ti\b/.test(lowered)) {
    return "bucuresti";
  }
  if (/\bia[șs]i\b/.test(lowered)) {
    return "iasi";
  }
  return "generic";
};

const matchValue = (text: string, patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const parsed = toNumber(match[1]);
      if (parsed !== null) {
        return parsed;
      }
    }
  }
  return null;
};

const extractProfile = (text: string, cityHint: string): TariffProfile => {
  const detected = cityHint === "auto" ? detectCity(text) : cityHint;
  const base: TariffProfile = { ...DEFAULT_PROFILE, ...(CITY_PROFILES[detected] ?? {}), city: detected };

  const pcs = matchValue(text, [/(?:pcs|putere calorific[aă])[^0-9]{0,20}([0-9]+(?:[.,][0-9]+)?)/i]);
  const gasPriceMwh = matchValue(text, [
    /(?:pre[țt]\s*gaze|gaz(?:e)?\s*naturale)[^0-9]{0,40}([0-9]+(?:[.,][0-9]+)?)/i
  ]);
  const transportPriceMwh = matchValue(text, [/(?:transport)[^0-9]{0,30}([0-9]+(?:[.,][0-9]+)?)/i]);
  const distributionPriceMwh = matchValue(text, [/(?:distribu[țt]ie)[^0-9]{0,30}([0-9]+(?:[.,][0-9]+)?)/i]);
  const fixedFee = matchValue(text, [/(?:abonament|tax[aă]\s*fix[aă])[^0-9]{0,30}([0-9]+(?:[.,][0-9]+)?)/i]);
  const vatPercent = matchValue(text, [/(?:tva)[^0-9]{0,20}([0-9]+(?:[.,][0-9]+)?)/i]);

  return {
    ...base,
    ...(pcs !== null ? { pcs } : {}),
    ...(gasPriceMwh !== null ? { gasPriceMwh } : {}),
    ...(transportPriceMwh !== null ? { transportPriceMwh } : {}),
    ...(distributionPriceMwh !== null ? { distributionPriceMwh } : {}),
    ...(fixedFee !== null ? { fixedFee } : {}),
    ...(vatPercent !== null ? { vatRate: vatPercent > 1 ? vatPercent / 100 : vatPercent } : {})
  };
};

const sanitizeFileName = (name: string) =>
  name
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 120);

const ensureBucket = async (client: S3Client) => {
  try {
    await client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
  }
};

export async function POST(request: Request) {
  if (!S3_ACCESS_KEY || !S3_SECRET_KEY) {
    return NextResponse.json(
      { error: "Seaweed S3 credentials lipsesc (SEAWEED_S3_ACCESS_KEY/SEAWEED_S3_SECRET_KEY)." },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const userId = String(formData.get("userId") ?? "").trim();
  const city = String(formData.get("city") ?? "auto").trim().toLowerCase();
  const file = formData.get("file");

  if (!userId) {
    return NextResponse.json({ error: "Lipsește userId." }, { status: 422 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Lipsește fișierul PDF." }, { status: 422 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Fișierul trebuie să fie PDF." }, { status: 422 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const body = Buffer.from(arrayBuffer);
  const objectKey = `${userId}/${Date.now()}-${sanitizeFileName(file.name || "factura.pdf")}`;

  const client = new S3Client({
    endpoint: S3_ENDPOINT,
    region: S3_REGION,
    forcePathStyle: true,
    credentials: {
      accessKeyId: S3_ACCESS_KEY,
      secretAccessKey: S3_SECRET_KEY
    }
  });

  await ensureBucket(client);

  await client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: objectKey,
      Body: body,
      ContentType: "application/pdf"
    })
  );

  const rawText = body.toString("latin1").replace(/\u0000/g, " ");
  const profile = extractProfile(rawText, city || "auto");
  const fileUrl = `${S3_ENDPOINT.replace(/\/+$/, "")}/${S3_BUCKET}/${objectKey}`;

  return NextResponse.json({
    message: "Factura a fost încărcată. Profilul de tarif a fost ajustat.",
    city: profile.city,
    fileUrl,
    objectKey,
    profile
  });
}
