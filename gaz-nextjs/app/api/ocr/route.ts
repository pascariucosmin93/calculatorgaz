import { NextResponse } from "next/server";
import Tesseract from "tesseract.js";

const whitelist = "0123456789"; // doar cifre, fără puncte

async function fileToBuffer(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
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

  // extrage toate secvențele de cifre consecutive
  const matches = rawText.match(/\d{4,7}/g);

  if (!matches || matches.length === 0) {
    return null;
  }

  // întâi căutăm secvențele de 5–6 cifre (index contor)
  const likely = matches.find(seq => seq.length === 5 || seq.length === 6);

  if (likely) {
    return parseInt(likely, 10);
  }

  // fallback: prima secvență mare
  return parseInt(matches[0], 10);
}

async function readMeterValue(file: File) {
  const buffer = await fileToBuffer(file);

  const { data } = await Tesseract.recognize(buffer, "eng", {
    tessedit_char_whitelist: whitelist
  } as any);

  const value = extractNumber(data.text);

  if (value === null) {
    throw new Error("Nu am reușit să detectez cifre clare în imagine.");
  }

  return value;
}

export async function POST(request: Request) {
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
    const [previousReading, currentReading] = await Promise.all([
      readMeterValue(previousImage),
      readMeterValue(currentImage)
    ]);

    return NextResponse.json({ previousReading, currentReading });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Eroare OCR neprevăzută.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
