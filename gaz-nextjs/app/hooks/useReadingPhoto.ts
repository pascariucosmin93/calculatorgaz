import { csrfHeaders } from "./useAuth";

const PHOTO_MAX_DIMENSION = 1600;

// Poza de pe telefon are 10+ MB: o micșorăm și o convertim în JPEG înainte de încărcare.
// Dacă browserul nu o poate decoda, o trimitem neschimbată.
export async function prepareReadingPhoto(file: File): Promise<Blob> {
  if (typeof createImageBitmap === "undefined") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, PHOTO_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ?? file;
  } catch {
    return file;
  }
}

export async function uploadReadingPhoto(readingId: string, file: File): Promise<void> {
  const formData = new FormData();
  formData.set("photo", await prepareReadingPhoto(file), "contor.jpg");
  const response = await fetch(`/api/readings/${encodeURIComponent(readingId)}/photo`, {
    method: "POST",
    headers: csrfHeaders(),
    body: formData
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Nu am putut încărca poza.");
  }
}
