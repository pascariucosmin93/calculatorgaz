import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

export const MAX_READING_PHOTO_BYTES = 8 * 1024 * 1024;

export type PhotoContentType = "image/jpeg" | "image/png" | "image/webp";

// Tipul se deduce din primii octeți, nu din Content-Type-ul trimis de client.
export function detectPhotoContentType(bytes: Uint8Array): PhotoContentType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte)) {
    return "image/png";
  }
  const ascii = (start: number, end: number) => String.fromCharCode(...Array.from(bytes.slice(start, end)));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

export function readingPhotoKey(userId: string, readingId: string): string {
  return `readings/${userId}/${readingId}`;
}

function storageConfig() {
  const endpoint = process.env.R2_ENDPOINT?.trim().replace(/\/+$/, "") || "";
  const bucket = process.env.R2_BUCKET?.trim() || "";
  const accessKeyId = process.env.R2_ACCESS_KEY?.trim() || "";
  const secretAccessKey = process.env.R2_SECRET_KEY?.trim() || "";
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null;
  return { bucket, client: new S3Client({ endpoint, region: process.env.R2_REGION?.trim() || "auto", forcePathStyle: true, credentials: { accessKeyId, secretAccessKey } }) };
}

export class PhotoStorageUnavailableError extends Error {}

function requireStorage() {
  const storage = storageConfig();
  if (!storage) throw new PhotoStorageUnavailableError("Configurația serviciului de stocare nu este disponibilă.");
  return storage;
}

export async function putReadingPhoto(key: string, body: Uint8Array, contentType: PhotoContentType): Promise<void> {
  const { bucket, client } = requireStorage();
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
}

export async function getReadingPhoto(key: string) {
  const { bucket, client } = requireStorage();
  const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!object.Body) return null;
  return { body: await object.Body.transformToByteArray(), contentType: object.ContentType ?? "image/jpeg" };
}

export async function deleteReadingPhoto(key: string): Promise<void> {
  const { bucket, client } = requireStorage();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
