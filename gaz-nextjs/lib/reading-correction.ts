import { ReadingType } from "@/lib/types";

export const READING_CORRECTION_WINDOW_MS = 4 * 24 * 60 * 60 * 1000;

export const readingTypeLabels: Record<ReadingType, string> = {
  SELF_READING: "Autocitire",
  SUPPLIER_ESTIMATE: "Estimare furnizor",
  REGULARIZATION: "Regularizare"
};

export function canCorrectReading(createdAt: Date | string, now = new Date()): boolean {
  const created = new Date(createdAt).getTime();
  return Number.isFinite(created) && now.getTime() <= created + READING_CORRECTION_WINDOW_MS;
}

export function correctionDeadline(createdAt: Date | string): Date {
  return new Date(new Date(createdAt).getTime() + READING_CORRECTION_WINDOW_MS);
}
