import { NextRequest, NextResponse } from "next/server";
import { verifySession, isErrorResponse } from "@/lib/auth";

const OCR_SERVICE_URL = (process.env.OCR_SERVICE_URL || "http://ocr-service:8089").replace(/\/+$/, "");

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
    // Forward to OCR microservice with username for S3 folder naming
    const proxyForm = new FormData();
    proxyForm.append("previous", previousImage);
    proxyForm.append("current", currentImage);
    proxyForm.append("username", session.username);

    const response = await fetch(`${OCR_SERVICE_URL}/ocr`, {
      method: "POST",
      body: proxyForm
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || "Eroare la procesarea imaginii." },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("OCR proxy error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Eroare la procesarea imaginii." }, { status: 500 });
  }
}
