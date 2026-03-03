import { NextRequest, NextResponse } from "next/server";
import { verifySession, isErrorResponse } from "@/lib/auth";
import { recognizeDigits } from "@/lib/ocr-worker";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

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

  return value;
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
    const previousReading = await readMeterValue(previousImage);
    const currentReading = await readMeterValue(currentImage);

    return NextResponse.json({ previousReading, currentReading });
  } catch (error) {
    console.error("OCR error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Eroare la procesarea imaginii." }, { status: 500 });
  }
}
