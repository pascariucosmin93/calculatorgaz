import { NextRequest, NextResponse } from "next/server";
import { verifySession, isErrorResponse } from "@/lib/auth";
import { recognizeDigits } from "@/lib/ocr-worker";
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const PHOTOS_BUCKET = "contor-photos";

const S3_ENDPOINT = process.env.SEAWEED_S3_ENDPOINT?.trim() || "https://s3.galeata.devjobs.ro";
const S3_REGION = process.env.SEAWEED_S3_REGION?.trim() || "us-east-1";
const S3_ACCESS_KEY = process.env.SEAWEED_S3_ACCESS_KEY?.trim() || "";
const S3_SECRET_KEY = process.env.SEAWEED_S3_SECRET_KEY?.trim() || "";

let bucketReady = false;

async function ensurePhotoBucket(client: S3Client) {
  if (bucketReady) return;
  try {
    await client.send(new HeadBucketCommand({ Bucket: PHOTOS_BUCKET }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: PHOTOS_BUCKET }));
  }
  bucketReady = true;
}

function fileExtension(file: File): string {
  const name = file.name || "";
  const dot = name.lastIndexOf(".");
  if (dot !== -1) return name.slice(dot);
  if (file.type === "image/jpeg") return ".jpg";
  if (file.type === "image/png") return ".png";
  if (file.type === "image/webp") return ".webp";
  return ".bin";
}

/**
 * Extrage numai indexul contorului
 * — caută secvențe de 4–7 cifre consecutive
 * — selectează secvența cea mai logică (5–6 cifre)
 * — ignoră cifrele roșii (zecimale)
 * — ignoră numerele din etichetă (2006, 00838754)
 */
function extractNumber(rawText: string) {
  if (!rawText) return null;

  const matches = rawText.match(/\d{4,7}/g);
  if (!matches || matches.length === 0) return null;

  const likely = matches.find(seq => seq.length === 5 || seq.length === 6);
  return likely ? parseInt(likely, 10) : parseInt(matches[0], 10);
}

async function readMeterValue(file: File) {
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(`Imaginea depășește limita de ${MAX_IMAGE_SIZE / 1024 / 1024} MB.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const text = await recognizeDigits(buffer);
  const value = extractNumber(text);

  if (value === null) {
    throw new Error("Nu am reușit să detectez cifre clare în imagine.");
  }

  return { value, buffer };
}

export async function POST(request: NextRequest) {
  const session = await verifySession(request);
  if (isErrorResponse(session)) return session;

  const formData = await request.formData();
  const previousImage = formData.get("previous");
  const currentImage = formData.get("current");

  if (!(previousImage instanceof File) || !(currentImage instanceof File)) {
    return NextResponse.json(
      { error: "Trimite două imagini: una pentru luna trecută și una pentru luna curentă." },
      { status: 400 }
    );
  }

  try {
    // Sequential OCR through the shared worker (no parallel WASM spawning)
    const previous = await readMeterValue(previousImage);
    const current = await readMeterValue(currentImage);

    // Upload photos to S3 in background (don't block response on failure)
    const photos: { previous?: string; current?: string } = {};
    if (S3_ACCESS_KEY && S3_SECRET_KEY) {
      try {
        const client = new S3Client({
          endpoint: S3_ENDPOINT,
          region: S3_REGION,
          forcePathStyle: true,
          credentials: {
            accessKeyId: S3_ACCESS_KEY,
            secretAccessKey: S3_SECRET_KEY
          }
        });

        await ensurePhotoBucket(client);

        const username = session.username;
        const ts = Date.now();
        const prevKey = `${username}/${ts}-previous${fileExtension(previousImage)}`;
        const currKey = `${username}/${ts}-current${fileExtension(currentImage)}`;

        await Promise.all([
          client.send(new PutObjectCommand({
            Bucket: PHOTOS_BUCKET,
            Key: prevKey,
            Body: previous.buffer,
            ContentType: previousImage.type || "image/jpeg"
          })),
          client.send(new PutObjectCommand({
            Bucket: PHOTOS_BUCKET,
            Key: currKey,
            Body: current.buffer,
            ContentType: currentImage.type || "image/jpeg"
          }))
        ]);

        const base = S3_ENDPOINT.replace(/\/+$/, "");
        photos.previous = `${base}/${PHOTOS_BUCKET}/${prevKey}`;
        photos.current = `${base}/${PHOTOS_BUCKET}/${currKey}`;
      } catch (s3Error) {
        console.error("S3 upload error (non-blocking):", s3Error instanceof Error ? s3Error.message : s3Error);
      }
    }

    return NextResponse.json({
      previousReading: previous.value,
      currentReading: current.value,
      photos
    });
  } catch (error) {
    console.error("OCR error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Eroare la procesarea imaginii." }, { status: 500 });
  }
}
