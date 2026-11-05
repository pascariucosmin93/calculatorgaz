import { NextRequest, NextResponse } from "next/server";
import { isErrorResponse, verifySession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  deleteReadingPhoto,
  detectPhotoContentType,
  getReadingPhoto,
  MAX_READING_PHOTO_BYTES,
  PhotoStorageUnavailableError,
  putReadingPhoto,
  readingPhotoKey
} from "@/lib/reading-photo";

type Context = { params: Promise<{ id: string }> };

async function findOwnReading(id: string, userId: string) {
  return prisma.reading.findFirst({ where: { id, userId }, select: { id: true, photoKey: true } });
}

function storageError(error: unknown) {
  if (error instanceof PhotoStorageUnavailableError) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ error: "Serviciul de stocare a pozelor este momentan indisponibil." }, { status: 502 });
}

export async function POST(request: NextRequest, { params }: Context) {
  const session = await verifySession(request);
  if (isErrorResponse(session)) return session;
  const { id } = await params;

  const reading = await findOwnReading(id, session.id);
  if (!reading) return NextResponse.json({ error: "Citirea nu există sau nu îți aparține." }, { status: 404 });

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("photo");
  } catch {
    return NextResponse.json({ error: "Cerere invalidă." }, { status: 400 });
  }
  if (!(file instanceof File)) return NextResponse.json({ error: "Lipsește poza." }, { status: 422 });
  if (file.size > MAX_READING_PHOTO_BYTES) return NextResponse.json({ error: "Poza nu poate depăși 8 MB." }, { status: 413 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = detectPhotoContentType(bytes);
  if (!contentType) {
    return NextResponse.json({ error: "Format neacceptat. Folosește o poză JPEG, PNG sau WebP." }, { status: 415 });
  }

  const key = readingPhotoKey(session.id, id);
  try {
    await putReadingPhoto(key, bytes, contentType);
    await prisma.reading.update({ where: { id }, data: { photoKey: key } });
    return NextResponse.json({ ok: true, photoKey: key }, { status: 201 });
  } catch (error) {
    return storageError(error);
  }
}

export async function GET(request: NextRequest, { params }: Context) {
  const session = await verifySession(request);
  if (isErrorResponse(session)) return session;
  const { id } = await params;

  const reading = await findOwnReading(id, session.id);
  if (!reading?.photoKey) return NextResponse.json({ error: "Citirea nu are poză." }, { status: 404 });

  try {
    const photo = await getReadingPhoto(reading.photoKey);
    if (!photo) return NextResponse.json({ error: "Poza nu a fost găsită." }, { status: 404 });
    return new NextResponse(Buffer.from(photo.body), {
      headers: { "Content-Type": photo.contentType, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" }
    });
  } catch (error) {
    return storageError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const session = await verifySession(request);
  if (isErrorResponse(session)) return session;
  const { id } = await params;

  const reading = await findOwnReading(id, session.id);
  if (!reading) return NextResponse.json({ error: "Citirea nu există sau nu îți aparține." }, { status: 404 });
  if (!reading.photoKey) return NextResponse.json({ ok: true });

  try {
    await deleteReadingPhoto(reading.photoKey);
    await prisma.reading.update({ where: { id }, data: { photoKey: null } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return storageError(error);
  }
}
